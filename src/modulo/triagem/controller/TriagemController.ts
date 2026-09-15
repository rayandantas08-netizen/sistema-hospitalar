import {Request, Response} from 'express';
import {TriagemService} from '../service/TriagemService';
import {CreateTriagemDTO, ListTriagensQueryDTO, UpdateTriagemDTO} from '../../core/dtos';
import {z} from 'zod';
import {NivelGravidade, Papeis} from '../../core/model/Enums';
import {resolverPaginacao} from '../../core/utils/paginacao';
import {responderErro} from '../../core/utils/respostaHttp';

interface AuthenticatedRequest extends Request {
    user?: { id: string; papel: Papeis };
}

export class TriagemController {
    private triagemService: TriagemService;

    constructor() {
        this.triagemService = new TriagemService();
    }

    async create(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const validated = CreateTriagemDTO.parse(req.body);
            const enfermeiroId = req.user?.id;
            if (!enfermeiroId) throw new Error('ID do enfermeiro não encontrado');

            const {data, error} = await this.triagemService.createTriagem(
                validated.pacienteId,
                enfermeiroId,
                validated.unidadeSaudeId,
                validated.sinaisVitais,
                validated.queixaPrincipal
            );

            if (error || !data) {
                res.status(400).json({error: error?.message || 'Erro ao criar triagem'});
                return;
            }
            res.status(201).json(data);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({errors: error.message});
            } else {
                res.status(400).json({error: error.message});
            }
        }
    }

    /**
     * GET /api/triagens
     * Filtros: unidadeSaudeId, classificacaoRisco, pacienteId, mewsMinimo.
     *
     * Compatibilidade: sem parâmetros de paginação devolve um ARRAY (contrato
     * antigo); com `pagina`/`limite` (ou `page`/`limit`) devolve o envelope
     * `{data, paginacao}` pedido pelo novo frontend.
     */
    async list(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const query = ListTriagensQueryDTO.parse(req.query);
            const usuarioId = req.user?.id;
            if (!usuarioId) throw new Error('ID do usuário não encontrado');

            const temPaginacao = [query.pagina, query.page, query.limite, query.limit].some(
                (valor) => valor !== undefined
            );

            const {data, error} = await this.triagemService.listTriagensPaginadas(
                {
                    unidadeSaudeId: query.unidadeSaudeId,
                    classificacaoRisco: query.classificacaoRisco,
                    pacienteId: query.pacienteId,
                    mewsMinimo: query.mewsMinimo,
                },
                resolverPaginacao(query)
            );

            if (error || !data) {
                res.status(400).json({error: error?.message || 'Nenhuma triagem encontrada'});
                return;
            }

            res.json(temPaginacao ? data : data.data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    /** GET /api/sala-vermelha/fila — triagens VERMELHO aguardando atendimento. */
    async listFilaSalaVermelha(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const query = ListTriagensQueryDTO.parse(req.query);
            const temPaginacao = [query.pagina, query.page, query.limite, query.limit].some(
                (valor) => valor !== undefined
            );

            const {data, error} = await this.triagemService.getFilaSalaVermelha(
                {unidadeSaudeId: query.unidadeSaudeId},
                temPaginacao ? resolverPaginacao(query) : undefined
            );

            if (error || !data) {
                res.status(400).json({error: error?.message || 'Nenhuma triagem de risco na fila'});
                return;
            }

            res.json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    /** GET /api/triagens/:id/mews — escore MEWS da triagem. */
    async getMews(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const {data, error} = await this.triagemService.getMewsDaTriagem(req.params.id);

            if (error || !data) {
                res.status(404).json({error: error?.message || 'Triagem não encontrada'});
                return;
            }

            res.json(data);
        } catch (error: any) {
            responderErro(res, error);
        }
    }

    async get(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const id = req.params.id;
            const usuarioId = req.user?.id;
            if (!usuarioId) throw new Error('ID do usuário não encontrado');

            const {data, error} = await this.triagemService.getTriagem(id);
            if (error || !data) {
                res.status(404).json({error: error?.message || 'Triagem não encontrada'});
                return;
            }
            res.json(data);
        } catch (error: any) {
            res.status(400).json({error: error.message});
        }
    }

    async listByPaciente(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const pacienteId = req.params.pacienteId;
            const usuarioId = req.user?.id;
            if (!usuarioId) throw new Error('ID do usuário não encontrado');

            const {data, error} = await this.triagemService.listTriagensByPaciente(pacienteId);
            if (error) {
                res.status(400).json({error: error.message});
                return;
            }
            res.json(data);
        } catch (error: any) {
            res.status(400).json({error: error.message});
        }
    }

    async listByGravidade(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const nivelGravidade = req.params.nivelGravidade as NivelGravidade;
            const unidadeSaudeId = req.params.unidadeSaudeId;
            const usuarioId = req.user?.id;
            if (!usuarioId) throw new Error('ID do usuário não encontrado');
            if (!Object.values(NivelGravidade).includes(nivelGravidade)) {
                throw new Error('Nível de gravidade inválido');
            }

            const {
                data,
                error
            } = await this.triagemService.listPacientesByGravidade(nivelGravidade, unidadeSaudeId);
            if (error) {
                res.status(400).json({error: error.message});
                return;
            }
            res.json(data);
        } catch (error: any) {
            res.status(400).json({error: error.message});
        }
    }

    async update(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const id = req.params.id;
            const validated = UpdateTriagemDTO.parse(req.body);
            const enfermeiroId = req.user?.id;
            if (!enfermeiroId) throw new Error('ID do enfermeiro não encontrado');

            const {
                data,
                error
            } = await this.triagemService.updateTriagem(id, validated.nivelGravidade, validated.sinaisVitais, validated.queixaPrincipal, enfermeiroId);
            if (error || !data) {
                res.status(400).json({error: error?.message || 'Triagem não encontrada'});
                return;
            }
            res.json(data);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({errors: error.message});
            } else {
                res.status(400).json({error: error.message});
            }
        }
    }

    async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const id = req.params.id;
            const enfermeiroId = req.user?.id;
            if (!enfermeiroId) throw new Error('ID do enfermeiro não encontrado');

            const {data, error} = await this.triagemService.deleteTriagem(id);
            if (error || !data) {
                res.status(400).json({error: error?.message || 'Erro ao desativar triagem'});
                return;
            }
            res.status(204).send();
        } catch (error: any) {
            res.status(400).json({error: error.message});
        }
    }
}