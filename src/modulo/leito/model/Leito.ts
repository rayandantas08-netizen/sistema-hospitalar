import {BaseEntity} from '../../core/model/BaseEntity';
import {SetorLeito, StatusLeito} from '../../core/model/Enums';

export class Leito extends BaseEntity {
    unidadeSaudeId: string;
    nomeOuNumero: string;
    setor: SetorLeito;
    status: StatusLeito;
    pacienteId?: string | null;
    ventiladorMecanico: boolean;
    monitorCardiaco: boolean;
    diagnostico?: string | null;
    ativo: boolean;

    constructor(
        id: string,
        unidadeSaudeId: string,
        nomeOuNumero: string,
        setor: SetorLeito = SetorLeito.SALA_VERMELHA,
        status: StatusLeito = StatusLeito.LIVRE
    ) {
        super(id);
        this.unidadeSaudeId = unidadeSaudeId;
        this.nomeOuNumero = nomeOuNumero;
        this.setor = setor;
        this.status = status;
        this.ventiladorMecanico = false;
        this.monitorCardiaco = true;
        this.ativo = true;
    }
}

export interface LeitoResposta {
    id: string;
    unidadeSaudeId: string;
    unidadeNome: string | null;
    nomeOuNumero: string;
    setor: SetorLeito;
    status: StatusLeito;
    pacienteId: string | null;
    pacienteNome: string | null;
    ventiladorMecanico: boolean;
    monitorCardiaco: boolean;
    diagnostico: string | null;
    ativo: boolean;
    createdAt: string | null;
    updatedAt: string | null;
}

export interface ResumoOcupacaoLeitos {
    setor: SetorLeito | null;
    total: number;
    porStatus: Record<string, number>;
    taxaOcupacao: number;
    ventiladoresDisponiveis: number;
}
