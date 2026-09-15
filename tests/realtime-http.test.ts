import {afterAll, beforeAll, describe, expect, it} from '@jest/globals';
import express from 'express';
import {Server} from 'http';
import {requireAuthOuTokenPainel} from '../src/middleware/auth';
import {
    CAMINHO_SSE_PAINEL,
    CAMINHO_WS_PAINEL,
    anexarWebSocketPainel,
    painelRealtime,
    streamPainelSse,
} from '../src/modulo/chamada/service/PainelRealtime';

/**
 * Teste de integração dos canais de tempo real do painel: sobe um servidor HTTP
 * de verdade, conecta um cliente SSE (fetch) e um cliente WebSocket (WebSocket
 * nativo do Node 22) e confirma que uma chamada publicada chega nos dois.
 */
const TOKEN_PAINEL = 'token-de-painel-para-teste';

let servidor: Server;
let porta: number;
const conexoes = new Set<any>();

function url(caminho: string, token?: string): string {
    const base = `http://127.0.0.1:${porta}${caminho}`;
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

/** Lê o próximo chunk do stream SSE com timeout. */
async function lerProximoEvento(
    leitor: ReadableStreamDefaultReader<Uint8Array>,
    timeoutMs = 3000
): Promise<string> {
    const leitura = leitor.read();
    let temporizador: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, rejeitar) => {
        temporizador = setTimeout(() => rejeitar(new Error('timeout esperando evento SSE')), timeoutMs);
    });

    try {
        const {value} = (await Promise.race([leitura, timeout])) as ReadableStreamReadResult<Uint8Array>;
        return new TextDecoder().decode(value);
    } finally {
        // Sem o clearTimeout o timer pendente mantém o event loop vivo e o Jest
        // reclama de handles abertos no fim da suíte.
        clearTimeout(temporizador!);
    }
}

beforeAll(async () => {
    process.env.PAINEL_TV_TOKEN = TOKEN_PAINEL;

    const app = express();
    // Mesma pilha de middlewares da rota real (chamadaRoutes.ts):
    // requireAuthOuTokenPainel protege o stream.
    app.get(CAMINHO_SSE_PAINEL, requireAuthOuTokenPainel, (req, res) => {
        void streamPainelSse(req, res);
    });

    servidor = app.listen(0, '127.0.0.1');
    servidor.on('connection', (socket) => conexoes.add(socket));
    await new Promise<void>((resolve) => servidor.once('listening', () => resolve()));
    porta = (servidor.address() as any).port;

    anexarWebSocketPainel(servidor);
});

afterAll(async () => {
    // Encerra conexões keep-alive do SSE/WebSocket para o Jest não ficar preso.
    (servidor as any).closeAllConnections?.();
    for (const socket of conexoes) {
        socket.destroy();
    }
    conexoes.clear();
    await new Promise<void>((resolve) => servidor.close(() => resolve()));
}, 15000);

describe('SSE do painel (/api/chamadas/eventos)', () => {
    it('recusa quem não apresenta token válido', async () => {
        const semToken = await fetch(url(CAMINHO_SSE_PAINEL));
        expect(semToken.status).toBe(401);

        const tokenErrado = await fetch(url(CAMINHO_SSE_PAINEL, 'token-errado'));
        expect(tokenErrado.status).toBe(401);
    });

    it('abre o stream e entrega o evento de boas-vindas + os eventos publicados', async () => {
        const controlador = new AbortController();
        const resposta = await fetch(url(CAMINHO_SSE_PAINEL, TOKEN_PAINEL), {signal: controlador.signal});

        expect(resposta.status).toBe(200);
        expect(resposta.headers.get('content-type')).toContain('text/event-stream');

        const leitor = resposta.body!.getReader();

        const conectado = await lerProximoEvento(leitor);
        expect(conectado).toContain('event: conectado');

        // Agora publica uma chamada como o ChamadaService faria.
        painelRealtime.publicar('chamada:criada', {
            senha: 'A014',
            sala: 'Consultório 03 (Clínica Médica)',
            pacienteNome: 'Maria Silva',
            prioridade: 'Amarelo',
        });

        const eventoChamada = await lerProximoEvento(leitor);
        expect(eventoChamada).toContain('event: chamada:criada');
        expect(eventoChamada).toContain('A014');
        expect(eventoChamada).toContain('Maria Silva');

        controlador.abort();
        await leitor.cancel().catch(() => undefined);
    });
});

describe('WebSocket do painel (/api/chamadas/ws)', () => {
    it('faz o handshake, recebe as mensagens e recusa token inválido', async () => {
        const recebidas: any[] = [];

        const socket = new WebSocket(`ws://127.0.0.1:${porta}${CAMINHO_WS_PAINEL}?token=${TOKEN_PAINEL}`);

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                socket.close();
                reject(new Error('timeout no handshake do WebSocket'));
            }, 4000);

            socket.addEventListener('message', (evento: any) => {
                recebidas.push(JSON.parse(String(evento.data)));
                if (recebidas.length === 1) {
                    clearTimeout(timeout);
                    resolve();
                }
            });
            socket.addEventListener('error', () => {
                clearTimeout(timeout);
                reject(new Error('erro no handshake do WebSocket'));
            });
        });

        expect(recebidas[0].evento).toBe('conectado');

        // Broadcast: publica e espera chegar pelo socket.
        const proxima = new Promise<any>((resolve) => {
            socket.addEventListener('message', (evento: any) => resolve(JSON.parse(String(evento.data))));
        });

        painelRealtime.publicar('chamada:criada', {
            senha: 'V001',
            sala: 'Sala Vermelha (Emergência)',
            pacienteNome: 'João Souza',
            prioridade: 'Vermelho',
        });

        const evento = await proxima;
        expect(evento.evento).toBe('chamada:criada');
        expect(evento.dados.senha).toBe('V001');
        expect(evento.dados.prioridade).toBe('Vermelho');

        await new Promise<void>((resolve) => {
            const temporizador = setTimeout(resolve, 1000);
            socket.addEventListener('close', () => {
                clearTimeout(temporizador);
                resolve();
            });
            socket.close();
        });

        // Token inválido não completa o handshake.
        const recusado = await new Promise<string>((resolve) => {
            const invalido = new WebSocket(`ws://127.0.0.1:${porta}${CAMINHO_WS_PAINEL}?token=errado`);
            const timeout = setTimeout(() => {
                invalido.close();
                resolve('timeout');
            }, 3000);
            invalido.addEventListener('error', () => {
                clearTimeout(timeout);
                resolve('erro');
            });
            invalido.addEventListener('open', () => {
                clearTimeout(timeout);
                invalido.close();
                resolve('aberto');
            });
        });

        expect(recusado).toBe('erro');
    });
});
