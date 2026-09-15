import {BaseEntity} from '../../core/model/BaseEntity';
import {PrioridadeChamada, StatusChamada} from '../../core/model/Enums';

export class Chamada extends BaseEntity {
    pacienteId: string;
    salaId?: string | null;
    /** Nome da sala denormalizado — o painel de TV exibe sem precisar de join. */
    sala?: string | null;
    senha: string;
    prioridade: PrioridadeChamada;
    status: StatusChamada;
    chamadoEm: Date;
    atendidoEm?: Date | null;
    finalizadoEm?: Date | null;
    profissionalId?: string | null;
    triagemId?: string | null;
    unidadeSaudeId?: string | null;
    ativo: boolean;

    constructor(
        id: string,
        pacienteId: string,
        senha: string,
        prioridade: PrioridadeChamada,
        salaId: string | null = null,
        sala: string | null = null
    ) {
        super(id);
        this.pacienteId = pacienteId;
        this.senha = senha;
        this.prioridade = prioridade;
        this.salaId = salaId;
        this.sala = sala;
        this.status = StatusChamada.CHAMANDO;
        this.chamadoEm = new Date();
        this.ativo = true;
    }
}

/** Payload exibido no painel de TV e enviado por SSE/WebSocket. */
export interface ChamadaResposta {
    id: string;
    pacienteId: string;
    pacienteNome: string | null;
    senha: string;
    prioridade: PrioridadeChamada;
    status: StatusChamada;
    salaId: string | null;
    sala: string | null;
    unidadeSaudeId: string | null;
    chamadoEm: string | null;
    atendidoEm: string | null;
    finalizadoEm: string | null;
    profissionalId: string | null;
    profissionalNome: string | null;
    triagemId: string | null;
}
