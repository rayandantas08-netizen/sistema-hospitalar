import {Request, Response} from 'express';
import {LeitoService} from '../service/LeitoService';
import {
    CreateLeitoDTO,
    ListLeitosQueryDTO,
    UpdateLeitoDTO,
    UpdateLeitoStatusDTO,
} from '../../core/dtos';
import {Papeis, SetorLeito} from '../../core/model/Enums';
import {resolverPaginacao} from '../../core/utils/paginacao';
import {responderErro, responderErroDoService} from '../../core/utils/respostaHttp';

interface AuthenticatedRequest extends Request {
    user?: { id: string; papel: Papeis };
}

export class LeitoController {
    private leitoService: LeitoService;

    constructor() {
        this.leitoService = new LeitoService();
    }

    /** POST /api/leitos */
    async create(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const validado = CreateLeitoDTO.parse(req.body);
            const {data, error} = await this.leitoService.createLeito(validado);

            if (responderErroDoService(res, error, 'Erro ao criar leito')) return;
            res.status(201).json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    /**
     * GET /api/leitos?setor=SALA_VERMELHA
     * Sem parâmetros de paginação devolve a lista simples (usada pelo mapa de
     * leitos); com `pagina`/`limite` devolve o envelope paginado.
     */
    async list(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const query = ListLeitosQueryDTO.parse(req.query);
            const temPaginacao = [query.pagina, query.page, query.limite, query.limit].some(
                (valor) => valor !== undefined
            );

            const {data, error} = await this.leitoService.listLeitos(
                {
                    setor: query.setor,
                    status: query.status,
                    unidadeSaudeId: query.unidadeSaudeId,
                    incluirInativos: query.incluirInativos,
                },
                temPaginacao ? resolverPaginacao(query) : undefined
            );

            if (responderErroDoService(res, error, 'Erro ao listar leitos')) return;
            res.json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    /**
     * GET /api/sala-vermelha/leitos
     * Mesmo contrato do GET /api/leitos, já fixando o setor SALA_VERMELHA.
     */
    async listSalaVermelha(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const query = ListLeitosQueryDTO.parse(req.query);
            const temPaginacao = [query.pagina, query.page, query.limite, query.limit].some(
                (valor) => valor !== undefined
            );

            const {data, error} = await this.leitoService.listLeitos(
                {
                    setor: SetorLeito.SALA_VERMELHA,
                    status: query.status,
                    unidadeSaudeId: query.unidadeSaudeId,
                    incluirInativos: query.incluirInativos,
                },
                temPaginacao ? resolverPaginacao(query) : undefined
            );

            if (responderErroDoService(res, error, 'Erro ao listar leitos da Sala Vermelha')) return;
            res.json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    /** GET /api/leitos/resumo — ocupação por status (mapa da Sala Vermelha). */
    async resumo(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const unidadeSaudeId = typeof req.query.unidadeSaudeId === 'string' ? req.query.unidadeSaudeId : undefined;
            const setor = typeof req.query.setor === 'string' ? (req.query.setor as any) : undefined;

            const {data, error} = await this.leitoService.resumoOcupacao(unidadeSaudeId, setor);

            if (responderErroDoService(res, error, 'Erro ao calcular ocupação dos leitos')) return;
            res.json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    /** GET /api/leitos/:id */
    async get(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const {data, error} = await this.leitoService.getLeito(req.params.id);

            if (responderErroDoService(res, error, 'Erro ao buscar leito', 404)) return;
            res.json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    /** PUT /api/leitos/:id — atualização completa (internação, equipamentos). */
    async update(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const validado = UpdateLeitoDTO.parse(req.body);
            const {data, error} = await this.leitoService.updateLeito(req.params.id, validado);

            if (responderErroDoService(res, error, 'Erro ao atualizar leito')) return;
            res.json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    /** PATCH /api/leitos/:id/status */
    async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const validado = UpdateLeitoStatusDTO.parse(req.body);
            const {data, error} = await this.leitoService.atualizarStatus(req.params.id, validado);

            if (responderErroDoService(res, error, 'Erro ao atualizar status do leito')) return;
            res.json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }
}
