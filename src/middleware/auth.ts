import {NextFunction, Request, Response} from 'express';
import {timingSafeEqual} from 'crypto';
import {supabaseClient, supabaseServiceClient} from '@/shared/database/supabase';
import {Papeis} from '@/modulo/core/model/Enums';

interface AuthenticatedRequest extends Request {
    user?: { id: string; papel: Papeis };
    /** true quando o acesso veio do token de painel de TV (somente leitura). */
    acessoPainelTv?: boolean;
}

export const HEADER_PAINEL_TV = 'x-painel-token';

/**
 * Compara o token do painel de TV em tempo constante (evita timing attack)
 * e nunca loga o valor recebido.
 */
export const tokenPainelTvValido = (tokenInformado?: string): boolean => {
    const tokenEsperado = process.env.PAINEL_TV_TOKEN;
    if (!tokenEsperado || !tokenInformado) return false;

    const a = Buffer.from(String(tokenInformado));
    const b = Buffer.from(tokenEsperado);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
};

/**
 * Protege endpoints de leitura do painel de TV (que roda numa TV da recepção,
 * sem ninguém para digitar login).
 *
 * Aceita:
 *   1. JWT do Supabase (fluxo normal, quando o painel está logado)
 *   2. `PAINEL_TV_TOKEN` via header `x-painel-token` ou `?token=`
 *      (o EventSource do navegador não consegue enviar headers, por isso a
 *      query string é aceita aqui)
 *
 * Se `PAINEL_TV_TOKEN` não estiver configurado no ambiente, o token de painel
 * fica DESATIVADO e somente JWT é aceito — ou seja, o padrão é seguro.
 */
export const requireAuthOuTokenPainel = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const tokenInformado =
        (req.headers[HEADER_PAINEL_TV] as string | undefined) ||
        (typeof req.query?.token === 'string' ? req.query.token : undefined);

    if (tokenPainelTvValido(tokenInformado)) {
        const token = tokenInformado as string;
        const esperado = process.env.PAINEL_TV_TOKEN as string;
        req.acessoPainelTv = timingSafeEqual(Buffer.from(token), Buffer.from(esperado));
        next();
        return;
    }

    return requireAuth(req, res, next);
};

export const requireAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({error: 'Token não fornecido'});
        return;
    }

    const token = authHeader.split(' ')[1];
    try {
        const {data: authData, error: authError} = await supabaseClient.auth.getUser(token);
        const userId = authData.user?.id;
        if (authError || !userId) {
            res.status(401).json({error: 'Token inválido'});
            return;
        }

        const {data: usuario, error} = await supabaseServiceClient
            .from('funcionario')
            .select('papel')
            .eq('id', userId)
            .eq('ativo', true)
            .single();

        if (error || !usuario) {
            res.status(401).json({error: 'Usuário não encontrado'});
            return;
        }

        req.user = {id: userId, papel: usuario.papel as Papeis};
        next();
    } catch (err) {
        res.status(401).json({error: 'Token inválido'});
    }
};

export const restrictTo = (...roles: Papeis[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({error: 'Usuário não autenticado'});
            return;
        }

        if (!roles.includes(req.user.papel)) {
            res.status(403).json({error: 'Acesso não autorizado'});
            return;
        }

        next();
    };
};