import {BaseEntity} from '../../core/model/BaseEntity';
import {StatusSala} from '../../core/model/Enums';

export class Sala extends BaseEntity {
    unidadeSaudeId: string;
    nome: string;
    tipo: string;
    responsavelId?: string | null;
    status: StatusSala;
    ativo: boolean;

    constructor(
        id: string,
        unidadeSaudeId: string,
        nome: string,
        tipo: string,
        status: StatusSala = StatusSala.LIVRE,
        responsavelId: string | null = null,
        ativo = true
    ) {
        super(id);
        this.unidadeSaudeId = unidadeSaudeId;
        this.nome = nome;
        this.tipo = tipo;
        this.status = status;
        this.responsavelId = responsavelId;
        this.ativo = ativo;
    }
}

/** Formatos aceitos pela API (camelCase, como o frontend consome). */
export interface SalaResposta {
    id: string;
    unidadeSaudeId: string;
    unidadeNome: string | null;
    nome: string;
    tipo: string;
    responsavelId: string | null;
    responsavelNome: string | null;
    responsavelPapel: string | null;
    status: StatusSala;
    ativo: boolean;
    createdAt: string | null;
    updatedAt: string | null;
}
