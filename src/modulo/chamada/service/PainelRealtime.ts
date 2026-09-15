import {EventEmitter} from 'events';
import {createHash} from 'crypto';
import {IncomingMessage, Server as HttpServer} from 'http';
import {Socket} from 'net';
import {Request, Response} from 'express';
import {supabaseClient} from '@/shared/database/supabase';
import {tokenPainelTvValido} from '@/middleware/auth';

/**
 * ============================================================================
 * Broadcast em tempo real do painel de TV / consultórios
 * ============================================================================
 * Quando uma chamada é registrada (POST /api/chamadas/chamar), o painel de TV
 * precisa atualizar na hora — sem F5 e sem polling agressivo.
 *
 * Este módulo implementa o broadcast SEM NENHUMA DEPENDÊNCIA NOVA, expondo os
 * eventos por dois canais equivalentes, para o frontend usar o que já tiver:
 *
 *   1. Server-Sent Events   → GET /api/chamadas/eventos   (EventSource)
 *   2. WebSocket nativo     → ws://<host>/api/chamadas/ws  (new WebSocket)
 *   3. Fallback por polling → GET /api/chamadas/ultimas
 *
 * Ambos são somente-leitura (o servidor só publica) e aceitam tanto o JWT do
 * Supabase quanto o `PAINEL_TV_TOKEN` via `?token=`/`x-painel-token` — o
 * EventSource do navegador não consegue enviar headers customizados.
 *
 * A implementação do WebSocket segue a RFC 6455 na parte que importa para
 * broadcast: handshake + frames de texto do servidor para o cliente. Frames
 * recebidos do cliente são lidos apenas para tratar CLOSE/PING (o servidor
 * nunca recebe dados da TV).
 */

export const CAMINHO_WS_PAINEL = '/api/chamadas/ws';
export const CAMINHO_SSE_PAINEL = '/api/chamadas/eventos';

export type TipoEventoPainel =
    | 'chamada:criada'
    | 'chamada:atualizada'
    | 'chamada:finalizada'
    | 'sala:atualizada'
    | 'leito:atualizado'
    | 'triagem:criada';

export interface MensagemPainel {
    evento: TipoEventoPainel;
    dados: unknown;
    emitidoEm: string;
}

const GUID_WEBSOCKET = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const INTERVALO_HEARTBEAT_MS = 25_000;

class PainelRealtime {
    private readonly emissor = new EventEmitter();
    private clientesSse = 0;
    private clientesWs = 0;

    constructor() {
        // O painel pode ter várias TVs/canais abertos ao mesmo tempo.
        this.emissor.setMaxListeners(0);
    }

    /** Publica um evento para todos os clientes conectados (SSE + WebSocket). */
    publicar(evento: TipoEventoPainel, dados: unknown): MensagemPainel {
        const mensagem: MensagemPainel = {
            evento,
            dados,
            emitidoEm: new Date().toISOString(),
        };

        this.emissor.emit('evento', mensagem);
        return mensagem;
    }

    inscrever(ouvinte: (mensagem: MensagemPainel) => void): () => void {
        this.emissor.on('evento', ouvinte);
        return () => this.emissor.off('evento', ouvinte);
    }

    registrarConexao(canal: 'sse' | 'ws'): void {
        if (canal === 'sse') this.clientesSse += 1;
        else this.clientesWs += 1;
    }

    removerConexao(canal: 'sse' | 'ws'): void {
        if (canal === 'sse') this.clientesSse = Math.max(0, this.clientesSse - 1);
        else this.clientesWs = Math.max(0, this.clientesWs - 1);
    }

    get conexoesAtivas(): { sse: number; ws: number; total: number } {
        return {
            sse: this.clientesSse,
            ws: this.clientesWs,
            total: this.clientesSse + this.clientesWs,
        };
    }
}

export const painelRealtime = new PainelRealtime();

// ---------------------------------------------------------------------------
// Autorização (JWT do Supabase OU token de painel)
// ---------------------------------------------------------------------------
async function autorizarConexao(token?: string): Promise<boolean> {
    if (!token) return false;
    if (tokenPainelTvValido(token)) return true;

    try {
        const {data, error} = await supabaseClient.auth.getUser(token);
        return !error && Boolean(data?.user?.id);
    } catch {
        return false;
    }
}

function extrairToken(req: IncomingMessage | Request): string | undefined {
    const header = req.headers['x-painel-token'];
    if (typeof header === 'string' && header.length > 0) return header;

    const url = req.url || '';
    const queryString = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
    const parametros = new URLSearchParams(queryString);
    return parametros.get('token') ?? undefined;
}

// ---------------------------------------------------------------------------
// Canal 1 — Server-Sent Events
// ---------------------------------------------------------------------------
export const streamPainelSse = async (req: Request, res: Response): Promise<void> => {
    // `Vary` evita cache intermediário servindo o stream para outro usuário.
    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Vary': 'Origin, Authorization, X-Painel-Token',
    });

    res.write(`retry: 5000\n\n`);
    res.write(
        `event: conectado\ndata: ${JSON.stringify({
            evento: 'conectado',
            dados: {mensagem: 'Stream do painel conectado', conexoes: painelRealtime.conexoesAtivas},
            emitidoEm: new Date().toISOString(),
        })}\n\n`
    );

    painelRealtime.registrarConexao('sse');
    const desinscrever = painelRealtime.inscrever((mensagem) => {
        res.write(`event: ${mensagem.evento}\nid: ${Date.now()}\ndata: ${JSON.stringify(mensagem)}\n\n`);
    });

    // Comentários periódicos mantêm a conexão viva em proxies (Render/nginx) que
    // derrubam conexões ociosas.
    const heartbeat = setInterval(() => res.write(': ping\n\n'), INTERVALO_HEARTBEAT_MS);

    const encerrar = () => {
        clearInterval(heartbeat);
        desinscrever();
        painelRealtime.removerConexao('sse');
        res.end();
    };

    req.on('close', encerrar);
    req.on('error', encerrar);
};

// ---------------------------------------------------------------------------
// Canal 2 — WebSocket nativo (RFC 6455)
// ---------------------------------------------------------------------------
function montarFrame(payload: Buffer, opcode = 0x1): Buffer {
    const tamanho = payload.length;
    let cabecalho: Buffer;

    if (tamanho < 126) {
        cabecalho = Buffer.alloc(2);
        cabecalho[1] = tamanho;
    } else if (tamanho < 65_536) {
        cabecalho = Buffer.alloc(4);
        cabecalho[1] = 126;
        cabecalho.writeUInt16BE(tamanho, 2);
    } else {
        cabecalho = Buffer.alloc(10);
        cabecalho[1] = 127;
        cabecalho.writeBigUInt64BE(BigInt(tamanho), 2);
    }

    // 0x80 = FIN (frame único). Frames do servidor NÃO são mascarados.
    cabecalho[0] = 0x80 | opcode;
    return Buffer.concat([cabecalho, payload]);
}

function enviarJson(socket: Socket, dados: unknown): void {
    if (socket.destroyed || !socket.writable) return;
    socket.write(montarFrame(Buffer.from(JSON.stringify(dados), 'utf8')));
}

async function tratarUpgrade(req: IncomingMessage, socket: Socket): Promise<void> {
    const caminho = (req.url || '').split('?')[0];
    if (caminho !== CAMINHO_WS_PAINEL) {
        socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
        return;
    }

    const autorizado = await autorizarConexao(extrairToken(req));
    if (!autorizado) {
        socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n');
        return;
    }

    const chave = req.headers['sec-websocket-key'];
    if (typeof chave !== 'string') {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        return;
    }

    const aceite = createHash('sha1').update(chave + GUID_WEBSOCKET).digest('base64');
    socket.write(
        [
            'HTTP/1.1 101 Switching Protocols',
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Accept: ${aceite}`,
            '\r\n',
        ].join('\r\n')
    );

    socket.setNoDelay(true);
    socket.setTimeout(0);

    painelRealtime.registrarConexao('ws');
    enviarJson(socket, {
        evento: 'conectado',
        dados: {mensagem: 'WebSocket do painel conectado', conexoes: painelRealtime.conexoesAtivas},
        emitidoEm: new Date().toISOString(),
    });

    const desinscrever = painelRealtime.inscrever((mensagem) => enviarJson(socket, mensagem));
    const heartbeat = setInterval(() => {
        if (socket.destroyed || !socket.writable) return;
        socket.write(montarFrame(Buffer.alloc(0), 0x9)); // PING
    }, INTERVALO_HEARTBEAT_MS);

    const encerrar = () => {
        clearInterval(heartbeat);
        desinscrever();
        painelRealtime.removerConexao('ws');
    };

    socket.on('data', (buffer: Buffer) => {
        const opcode = buffer[0] & 0x0f;
        if (opcode === 0x8) {
            // CLOSE: responde o fechamento e encerra.
            socket.write(montarFrame(Buffer.alloc(0), 0x8));
            socket.destroy();
            return;
        }
        if (opcode === 0x9) {
            socket.write(montarFrame(Buffer.alloc(0), 0xa)); // PONG
        }
    });

    socket.on('close', encerrar);
    socket.on('error', encerrar);
}

/**
 * Liga o canal WebSocket do painel ao servidor HTTP.
 * Chamado uma única vez em `src/app.ts`, depois do `app.listen()`.
 */
export function anexarWebSocketPainel(server: HttpServer): void {
    server.on('upgrade', (req: IncomingMessage, socket, _head) => {
        void tratarUpgrade(req, socket as Socket).catch(() => {
            try {
                socket.destroy();
            } catch {
                /* socket já encerrado */
            }
        });
    });
}
