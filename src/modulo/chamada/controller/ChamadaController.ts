import {Request, Response} from 'express';
import {ChamadaService} from '../service/ChamadaService';
import {painelRealtime, streamPainelSse} from '../service/PainelRealtime';
import {
    ChamarPacienteDTO,
    FilaChamadasQueryDTO,
    FinalizarChamadaDTO,
    ListChamadasQueryDTO,
    UltimasChamadasQueryDTO,
} from '../../core/dtos';
import {Papeis} from '../../core/model/Enums';
import {resolverPaginacao} from '../../core/utils/paginacao';
import {responderErro, responderErroDoService} from '../../core/utils/respostaHttp';

interface AuthenticatedRequest extends Request {
    user?: { id: string; papel: Papeis };
    acessoPainelTv?: boolean;
}

export class ChamadaController {
    private chamadaService: ChamadaService;

    constructor() {
        this.chamadaService = new ChamadaService();
    }

    /**
     * POST /api/chamadas/chamar
     * Registra a chamada e publica o evento no painel (SSE + WebSocket).
     */
    async chamar(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const validado = ChamarPacienteDTO.parse(req.body);
            const profissionalId = req.user?.id;
            if (!profissionalId) {
                responderErro(res, new Error('Usuário autenticado não identificado'), 401);
                return;
            }

            const {data, error} = await this.chamadaService.chamarPaciente(validado, profissionalId);
            if (responderErroDoService(res, error, 'Erro ao registrar chamada')) return;

            res.status(201).json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    /**
     * GET /api/chamadas/ultimas
     * Últimas chamadas para o painel de TV (padrão: 10).
     * Aceita JWT do Supabase OU o token do painel (`PAINEL_TV_TOKEN`).
     */
    async ultimas(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const query = UltimasChamadasQueryDTO.parse(req.query);
            const limite = query.limite ?? query.limit ?? 10;

            const {data, error} = await this.chamadaService.ultimasChamadas(limite, query.unidadeSaudeId);
            if (responderErroDoService(res, error, 'Erro ao listar últimas chamadas')) return;

            res.json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    /** GET /api/chamadas/fila — fila de triados aguardando chamada. */
    async fila(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const query = FilaChamadasQueryDTO.parse(req.query);
            const paginacao = resolverPaginacao(query);

            const {data, error} = await this.chamadaService.listarFila(
                {
                    unidadeSaudeId: query.unidadeSaudeId,
                    classificacaoRisco: query.classificacaoRisco,
                    mewsMinimo: query.mewsMinimo,
                },
                paginacao
            );

            if (responderErroDoService(res, error, 'Erro ao listar fila de atendimento')) return;
            res.json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    /** GET /api/chamadas — histórico paginado de chamadas. */
    async list(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const query = ListChamadasQueryDTO.parse(req.query);
            const paginacao = resolverPaginacao(query);

            const {data, error} = await this.chamadaService.listarChamadas(
                {
                    unidadeSaudeId: query.unidadeSaudeId,
                    status: query.status,
                    classificacaoRisco: query.classificacaoRisco,
                },
                paginacao
            );

            if (responderErroDoService(res, error, 'Erro ao listar chamadas')) return;
            res.json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    /** PATCH /api/chamadas/:id/finalizar */
    async finalizar(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const validado = FinalizarChamadaDTO.parse(req.body ?? {});
            const {data, error} = await this.chamadaService.finalizarChamada(req.params.id, validado);

            if (responderErroDoService(res, error, 'Erro ao finalizar chamada')) return;
            res.json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    /** PATCH /api/chamadas/:id/iniciar — paciente entrou no consultório. */
    async iniciar(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const {data, error} = await this.chamadaService.iniciarAtendimento(req.params.id);

            if (responderErroDoService(res, error, 'Erro ao iniciar atendimento')) return;
            res.json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    /** GET /api/chamadas/:id */
    async get(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const {data, error} = await this.chamadaService.getChamada(req.params.id);

            if (responderErroDoService(res, error, 'Erro ao buscar chamada', 404)) return;
            res.json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    /**
     * GET /api/chamadas/eventos — stream SSE do painel de TV.
     * O EventSource do navegador não envia headers, por isso o token pode vir
     * em `?token=`. Aceita JWT do Supabase ou o token do painel.
     */
    async eventos(req: AuthenticatedRequest, res: Response): Promise<void> {
        await streamPainelSse(req, res);
    }

    /** GET /api/chamadas/realtime — diagnóstico do canal de tempo real. */
    async realtime(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            res.json({
                conexoes: painelRealtime.conexoesAtivas,
                canais: {
                    sse: '/api/chamadas/eventos',
                    websocket: '/api/chamadas/ws',
                    polling: '/api/chamadas/ultimas',
                },
            });
        } catch (error: any) {
            responderErro(res, error);
        }
    }
}
