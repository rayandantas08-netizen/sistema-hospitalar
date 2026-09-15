import {NivelGravidade, PrioridadeChamada} from './Enums';

/**
 * O sistema convive com DUAS grafias para a mesma escala de risco:
 *
 *  - Triagem / Protocolo de Manchester → NivelGravidade em CAIXA ALTA
 *    ('VERMELHO', 'LARANJA', 'AMARELO', 'VERDE', 'AZUL')
 *  - Painel de TV / chamadas           → PrioridadeChamada capitalizada
 *    ('Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul')
 *
 * Este módulo é a única fonte de conversão entre as duas, para que nenhum
 * service/controller invente a sua própria regra.
 */

const MAPA_NORMALIZADO: Record<string, PrioridadeChamada> = {
    VERMELHO: PrioridadeChamada.Vermelho,
    LARANJA: PrioridadeChamada.Laranja,
    AMARELO: PrioridadeChamada.Amarelo,
    VERDE: PrioridadeChamada.Verde,
    AZUL: PrioridadeChamada.Azul,
};

/** Normaliza qualquer grafia aceita para a forma capitalizada do painel. */
export function normalizarPrioridade(valor?: string | null): PrioridadeChamada | null {
    if (!valor) return null;
    const chave = String(valor).trim().toUpperCase();
    return MAPA_NORMALIZADO[chave] ?? null;
}

/** Converte para a grafia usada por `triagem.nivel_gravidade`. */
export function prioridadeParaNivelGravidade(
    valor?: string | null
): NivelGravidade | null {
    const normalizada = normalizarPrioridade(valor);
    return normalizada ? (normalizada.toUpperCase() as NivelGravidade) : null;
}

/** Converte a classificação da triagem para a prioridade do painel. */
export function nivelGravidadeParaPrioridade(
    valor?: string | null
): PrioridadeChamada | null {
    return normalizarPrioridade(valor);
}

/** Lista das cinco classificações na grafia da triagem (ordem de gravidade). */
export const CLASSIFICACOES_ORDENADAS: NivelGravidade[] = [
    NivelGravidade.Vermelho,
    NivelGravidade.Laranja,
    NivelGravidade.Amarelo,
    NivelGravidade.Verde,
    NivelGravidade.Azul,
];

/**
 * Tempo-alvo de atendimento (em minutos) do Protocolo de Manchester.
 * `null` = sem tempo definido.
 */
export const TEMPO_ALVO_MINUTOS: Record<string, number | null> = {
    [NivelGravidade.Vermelho]: 0,
    [NivelGravidade.Laranja]: 10,
    [NivelGravidade.Amarelo]: 60,
    [NivelGravidade.Verde]: 120,
    [NivelGravidade.Azul]: 240,
};

export function tempoAlvoMinutos(classificacao?: string | null): number | null {
    const nivel = prioridadeParaNivelGravidade(classificacao);
    if (!nivel) return null;
    return TEMPO_ALVO_MINUTOS[nivel] ?? null;
}

/**
 * Peso de ordenação da fila: menor número = mais grave.
 * Usado para ordenar a fila de espera exatamente como o painel exibe.
 */
export const PESO_CLASSIFICACAO: Record<string, number> = {
    [NivelGravidade.Vermelho]: 1,
    [NivelGravidade.Laranja]: 2,
    [NivelGravidade.Amarelo]: 3,
    [NivelGravidade.Verde]: 4,
    [NivelGravidade.Azul]: 5,
};

export function pesoClassificacao(classificacao?: string | null): number {
    const nivel = prioridadeParaNivelGravidade(classificacao);
    return nivel ? PESO_CLASSIFICACAO[nivel] ?? 9 : 9;
}

/**
 * Ordena itens da fila por gravidade e, dentro da mesma gravidade, por tempo de
 * espera (quem chegou primeiro aparece antes).
 */
export function ordenarFilaPorGravidade<T extends { classificacaoRisco?: string | null; aguardandoDesde?: string | Date | null }>(
    itens: T[]
): T[] {
    return [...itens].sort((a, b) => {
        const diferencaPeso = pesoClassificacao(a.classificacaoRisco) - pesoClassificacao(b.classificacaoRisco);
        if (diferencaPeso !== 0) return diferencaPeso;

        const tempoA = a.aguardandoDesde ? new Date(a.aguardandoDesde).getTime() : 0;
        const tempoB = b.aguardandoDesde ? new Date(b.aguardandoDesde).getTime() : 0;
        return tempoA - tempoB;
    });
}
