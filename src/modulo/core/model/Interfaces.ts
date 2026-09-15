import {EscalaAvpu} from './Enums';

interface SinaisVitais {
    pressaoArterialSistolica: number; // mmHg
    pressaoArterialDiastolica: number; // mmHg
    temperatura: number; // °C
    frequenciaCardiaca: number; // bpm
    saturacaoOxigenio: number; // %
    frequenciaRespiratoria: number; // rpm
    nivelDor: number; // 0-10 (escala de dor)
    estadoConsciente: boolean; // true = consciente, false = alterado
    /**
     * Escala AVPU (Alerta / Voz / Dor / Irresponsivo) usada pelo escore MEWS.
     * Opcional: quando ausente, o MewsService deriva de `estadoConsciente`
     * (consciente → ALERTA, alterado → DOR) para não perder o histórico.
     */
    escalaAvpu?: EscalaAvpu;
}

interface Endereco {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
}

/** Envelope padrão de respostas paginadas da API. */
interface RespostaPaginada<T> {
    data: T[];
    paginacao: {
        pagina: number;
        limite: number;
        total: number;
        totalPaginas: number;
    };
}

/** Faixa de classificação usada pelo Protocolo de Manchester. */
interface FaixaClassificacaoManchester {
    classificacao: string;
    cor: string;
    tempoAlvoMinutos: number | null;
    descricao: string;
}

/** Item da fila de espera por classificação (triagem → chamada). */
interface ItemFilaAtendimento {
    triagemId: string;
    pacienteId: string;
    pacienteNome: string;
    senha: string | null;
    classificacaoRisco: string;
    prioridade: string;
    mewsScore: number | null;
    queixaPrincipal: string;
    unidadeSaudeId: string;
    aguardandoDesde: string;
    minutosAguardando: number;
    tempoAlvoMinutos: number | null;
    excedeTempoAlvo: boolean;
}

export {
    SinaisVitais,
    Endereco,
    RespostaPaginada,
    FaixaClassificacaoManchester,
    ItemFilaAtendimento
};
