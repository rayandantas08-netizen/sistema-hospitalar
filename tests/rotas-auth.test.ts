import {afterAll, describe, expect, it} from '@jest/globals';
import request from 'supertest';
import app, {server} from '../src/app';

// `app.ts` abre o listener ao ser importado (é o entrypoint da aplicação);
// fechamos no fim para o Jest não ficar pendurado.
afterAll((done) => {
    server.close(() => done());
});

/**
 * Verifica que TODAS as rotas novas estão protegidas por JWT.
 * Sem header `Authorization`, `requireAuth` responde 401 antes de consultar o
 * banco — por isso este teste roda sem Supabase real.
 */
describe('Proteção JWT das rotas', () => {
    const rotasProtegidas: Array<[string, string]> = [
        ['get', '/api/salas'],
        ['post', '/api/salas'],
        ['get', '/api/unidades/3f2504e0-4f89-41d3-9a0c-0305e82c3301/salas'],
        ['post', '/api/chamadas/chamar'],
        ['get', '/api/chamadas/ultimas'],
        ['get', '/api/chamadas/fila'],
        ['patch', '/api/chamadas/3f2504e0-4f89-41d3-9a0c-0305e82c3301/finalizar'],
        ['get', '/api/leitos'],
        ['post', '/api/leitos'],
        ['patch', '/api/leitos/3f2504e0-4f89-41d3-9a0c-0305e82c3301/status'],
        ['get', '/api/triagens'],
        ['get', '/api/sala-vermelha/fila'],
        ['get', '/api/prontuarios'],
        ['post', '/api/prontuarios'],
        ['get', '/api/prescricoes'],
        ['post', '/api/prescricoes'],
    ];

    it.each(rotasProtegidas)('%s %s responde 401 sem token', async (metodo, caminho) => {
        const resposta = await (request(app) as any)[metodo](caminho);
        expect(resposta.status).toBe(401);
        expect(resposta.body).toHaveProperty('error');
    });

    it('rejeita token inválido no lugar de "Bearer <jwt>"', async () => {
        const resposta = await request(app)
            .get('/api/salas')
            .set('Authorization', 'Token sem-bearer');

        expect(resposta.status).toBe(401);
    });

    it('não libera o painel com token de TV quando PAINEL_TV_TOKEN não está configurado', async () => {
        // setup-env.ts remove a variável: o painel deve cair no JWT obrigatório.
        const resposta = await request(app).get('/api/chamadas/ultimas?token=qualquer-coisa');
        expect(resposta.status).toBe(401);
    });

    it('mantém o healthcheck público', async () => {
        const resposta = await request(app).get('/healthz');
        expect(resposta.status).toBe(200);
        expect(resposta.body.status).toBe('ok');
    });
});
