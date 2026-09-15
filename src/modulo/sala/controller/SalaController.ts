import {Request, Response} from 'express';
import {SalaService} from '../service/SalaService';
import {CreateSalaDTO, ListSalasQueryDTO, UpdateSalaDTO} from '../../core/dtos';
import {Papeis} from '../../core/model/Enums';
import {resolverPaginacao} from '../../core/utils/paginacao';
import {responderErro, responderErroDoService} from '../../core/utils/respostaHttp';

interface AuthenticatedRequest extends Request {
    user?: { id: string; papel: Papeis };
}

export class SalaController {
    private salaService: SalaService;

    constructor() {
        this.salaService = new SalaService();
    }

    /** POST /api/salas */
    async create(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const validado = CreateSalaDTO.parse(req.body);
            const {data, error} = await this.salaService.createSala(validado);

            if (responderErroDoService(res, error, 'Erro ao criar sala')) return;
            res.status(201).json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    /** GET /api/salas */
    async list(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const filtros = ListSalasQueryDTO.parse(req.query);
            const paginacao = resolverPaginacao(filtros);

            const {data, error} = await this.salaService.listSalas(
                {
                    unidadeSaudeId: filtros.unidadeSaudeId,
                    status: filtros.status,
                    tipo: filtros.tipo,
                    incluirInativas: filtros.incluirInativas,
                },
                paginacao
            );

            if (responderErroDoService(res, error, 'Erro ao listar salas')) return;
            res.json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    /** GET /api/salas/:id */
    async get(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const {data, error} = await this.salaService.getSala(req.params.id);

            if (responderErroDoService(res, error, 'Erro ao buscar sala', 404)) return;
            res.json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    /** GET /api/unidades/:unidadeSaudeId/salas */
    async listByUnidade(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const unidadeSaudeId = req.params.unidadeSaudeId ?? req.params.id;
            const incluirInativas = String(req.query.incluirInativas ?? '') === 'true';

            const {data, error} = await this.salaService.listSalasByUnidade(unidadeSaudeId, incluirInativas);

            if (responderErroDoService(res, error, 'Erro ao listar salas da unidade', 404)) return;
            res.json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    /** PUT /api/salas/:id */
    async update(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const validado = UpdateSalaDTO.parse(req.body);
            const {data, error} = await this.salaService.updateSala(req.params.id, validado);

            if (responderErroDoService(res, error, 'Erro ao atualizar sala')) return;
            res.json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    /** DELETE /api/salas/:id (soft delete) */
    async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const {data, error} = await this.salaService.deleteSala(req.params.id);

            if (responderErroDoService(res, error, 'Erro ao desativar sala')) return;
            if (!data) {
                responderErro(res, new Error('Sala não encontrada'), 404);
                return;
            }
            res.status(204).send();
        } catch (error: any) {
            responderErro(res, error);
        }
    }
}
