import {Response} from 'express';
import {z} from 'zod';

/**
 * Erro de regra de negócio com status HTTP próprio.
 * Os services novos devolvem `ErroDeNegocio` em `error` e o controller repassa o
 * status correto (404 para "não encontrado", 409 para conflito etc.) em vez de
 * responder 400 para tudo.
 */
export class ErroDeNegocio extends Error {
    readonly statusCode: number;

    constructor(mensagem: string, statusCode = 400) {
        super(mensagem);
        this.name = 'ErroDeNegocio';
        this.statusCode = statusCode;
    }

    static naoEncontrado(mensagem: string): ErroDeNegocio {
        return new ErroDeNegocio(mensagem, 404);
    }

    static conflito(mensagem: string): ErroDeNegocio {
        return new ErroDeNegocio(mensagem, 409);
    }

    static proibido(mensagem: string): ErroDeNegocio {
        return new ErroDeNegocio(mensagem, 403);
    }
}

export function statusDoErro(error: unknown, padrao = 400): number {
    if (error instanceof ErroDeNegocio) return error.statusCode;
    return padrao;
}

/** Resposta 400 de validação de DTO (mantém `errors` para o frontend antigo). */
export function responderErroValidacao(res: Response, erro: z.ZodError): void {
    res.status(400).json({
        error: 'Dados inválidos',
        errors: erro.issues.map((problema) => `${problema.path.join('.') || 'corpo'}: ${problema.message}`).join('; '),
        detalhes: erro.issues.map((problema) => ({
            campo: problema.path.join('.'),
            mensagem: problema.message,
        })),
    });
}

/** Resposta de erro genérica usando o status do ErroDeNegocio, quando houver. */
export function responderErro(res: Response, error: unknown, padrao = 400): void {
    if (error instanceof z.ZodError) {
        responderErroValidacao(res, error);
        return;
    }

    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';
    res.status(statusDoErro(error, padrao)).json({error: mensagem});
}

/**
 * Resposta de erro a partir do `{data, error}` devolvido pelos services.
 * Retorna `true` quando respondeu (ou seja, quando algo deu errado).
 */
export function responderErroDoService(
    res: Response,
    error: Error | null | undefined,
    mensagemPadrao: string,
    statusPadrao = 400
): boolean {
    if (!error) return false;
    responderErro(res, error, error instanceof ErroDeNegocio ? error.statusCode : statusPadrao);
    return true;
}
