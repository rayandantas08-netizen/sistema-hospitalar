import {RespostaPaginada} from '../model/Interfaces';

export interface ParametrosPaginacao {
    pagina: number;
    limite: number;
    /** Offset inicial (inclusivo) para o `.range(de, ate)` do Supabase. */
    de: number;
    /** Offset final (inclusivo) para o `.range(de, ate)` do Supabase. */
    ate: number;
}

export const LIMITE_PADRAO = 20;
export const LIMITE_MAXIMO = 200;

interface QueryPaginacao {
    pagina?: number;
    page?: number;
    limite?: number;
    limit?: number;
}

/**
 * Normaliza `pagina/limite` (e os aliases `page/limit`) para os offsets que o
 * Supabase usa no `.range()`, que é inclusivo nas duas pontas.
 */
export function resolverPaginacao(
    query: QueryPaginacao = {},
    limitePadrao: number = LIMITE_PADRAO
): ParametrosPaginacao {
    const paginaBruta = Number(query.pagina ?? query.page ?? 1);
    const limiteBruto = Number(query.limite ?? query.limit ?? limitePadrao);

    const pagina = Number.isFinite(paginaBruta) && paginaBruta > 0 ? Math.trunc(paginaBruta) : 1;
    const limiteInformado = Number.isFinite(limiteBruto) && limiteBruto > 0 ? Math.trunc(limiteBruto) : limitePadrao;
    const limite = Math.min(Math.max(1, limiteInformado), LIMITE_MAXIMO);

    const de = (pagina - 1) * limite;
    return {pagina, limite, de, ate: de + limite - 1};
}

/** Envelope padrão de listagem paginada: `{ data: [...], paginacao: {...} }`. */
export function montarRespostaPaginada<T>(
    data: T[],
    total: number,
    pagina: number,
    limite: number
): RespostaPaginada<T> {
    return {
        data,
        paginacao: {
            pagina,
            limite,
            total,
            totalPaginas: limite > 0 ? Math.ceil(total / limite) : 0,
        },
    };
}
