import {BaseEntity} from '../../core/model/BaseEntity';
import {NivelGravidade} from '../../core/model/Enums';
import {SinaisVitais} from '../../core/model/Interfaces';

export class Triagem extends BaseEntity {
    pacienteId: string;
    enfermeiroId: string;
    unidadeSaudeId: string;
    nivelGravidade: NivelGravidade;
    sinaisVitais: SinaisVitais;
    data: Date;
    queixaPrincipal: string;
    /** Escore MEWS (0-14) calculado pelo MewsService no momento da triagem. */
    mewsScore: number | null;

    constructor(
        id: string,
        pacienteId: string,
        enfermeiroId: string,
        unidadeSaudeId: string,
        nivelGravidade: NivelGravidade,
        sinaisVitais: SinaisVitais,
        queixaPrincipal: string,
        mewsScore: number | null = null
    ) {
        super(id);
        this.pacienteId = pacienteId;
        this.enfermeiroId = enfermeiroId;
        this.unidadeSaudeId = unidadeSaudeId;
        this.nivelGravidade = nivelGravidade;
        this.sinaisVitais = sinaisVitais;
        this.data = new Date();
        this.queixaPrincipal = queixaPrincipal;
        this.mewsScore = mewsScore;
    }

    /** Alias de `nivelGravidade` na grafia usada pelo Protocolo de Manchester. */
    get classificacaoRisco(): NivelGravidade {
        return this.nivelGravidade;
    }
}