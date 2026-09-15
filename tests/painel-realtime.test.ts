import {describe, expect, it, jest} from '@jest/globals';
import {painelRealtime} from '../src/modulo/chamada/service/PainelRealtime';
import {montarRespostaPaginada, resolverPaginacao} from '../src/modulo/core/utils/paginacao';

describe('PainelRealtime', () => {
    it('entrega a mensagem publicada para todos os inscritos', () => {
        const recebidasA: any[] = [];
        const recebidasB: any[] = [];

        const desinscreverA = painelRealtime.inscrever((mensagem) => recebidasA.push(mensagem));
        const desinscreverB = painelRealtime.inscrever((mensagem) => recebidasB.push(mensagem));

        const mensagem = painelRealtime.publicar('chamada:criada', {
            senha: 'A014',
            sala: 'Consultório 01 (Clínica Geral)',
            pacienteNome: 'Maria Silva',
        });

        expect(recebidasA).toHaveLength(1);
        expect(recebidasB).toHaveLength(1);
        expect(recebidasA[0]).toEqual(mensagem);
        expect(recebidasA[0].evento).toBe('chamada:criada');
        expect(recebidasA[0].dados.senha).toBe('A014');
        expect(typeof recebidasA[0].emitidoEm).toBe('string');

        desinscreverA();
        desinscreverB();
    });

    it('para de notificar depois do unsubscribe (TV desconectada)', () => {
        const recebidas: any[] = [];
        const desinscrever = painelRealtime.inscrever((mensagem) => recebidas.push(mensagem));

        painelRealtime.publicar('leito:atualizado', {leito: 'Leito 01'});
        desinscrever();
        painelRealtime.publicar('leito:atualizado', {leito: 'Leito 02'});

        expect(recebidas).toHaveLength(1);
        expect(recebidas[0].dados.leito).toBe('Leito 01');
    });

    it('conta as conexões ativas por canal (sem ficar negativo)', () => {
        const inicial = painelRealtime.conexoesAtivas.total;

        painelRealtime.registrarConexao('sse');
        painelRealtime.registrarConexao('ws');
        expect(painelRealtime.conexoesAtivas.total).toBe(inicial + 2);
        expect(painelRealtime.conexoesAtivas.sse).toBeGreaterThanOrEqual(1);
        expect(painelRealtime.conexoesAtivas.ws).toBeGreaterThanOrEqual(1);

        painelRealtime.removerConexao('sse');
        painelRealtime.removerConexao('ws');
        painelRealtime.removerConexao('ws'); // a mais: não pode ficar negativo
        expect(painelRealtime.conexoesAtivas.total).toBe(inicial);
    });

    it('não quebra quando um ouvinte lança erro durante a publicação', () => {
        const desinscrever = painelRealtime.inscrever(() => {
            throw new Error('ouvinte com defeito');
        });

        // O EventEmitter propaga o erro; o importante é que a falha de um
        // ouvinte não corrompa o estado do hub.
        expect(() => painelRealtime.publicar('sala:atualizada', {})).toThrow();

        desinscrever();
        expect(() => painelRealtime.publicar('sala:atualizada', {})).not.toThrow();
        jest.restoreAllMocks();
    });
});

describe('Paginação', () => {
    it('calcula offsets inclusivos para o range do Supabase', () => {
        expect(resolverPaginacao({pagina: 1, limite: 20})).toMatchObject({de: 0, ate: 19});
        expect(resolverPaginacao({pagina: 3, limite: 10})).toMatchObject({de: 20, ate: 29});
    });

    it('aceita os aliases page/limit e aplica limites de segurança', () => {
        expect(resolverPaginacao({page: 2, limit: 5})).toMatchObject({pagina: 2, limite: 5, de: 5, ate: 9});
        expect(resolverPaginacao({pagina: 0, limite: 0})).toMatchObject({pagina: 1, limite: 20});
        expect(resolverPaginacao({pagina: -3}).pagina).toBe(1);
        expect(resolverPaginacao({limite: 9999}).limite).toBe(200);
    });

    it('monta o envelope com o total de páginas', () => {
        const resposta = montarRespostaPaginada([{id: 1}, {id: 2}], 42, 2, 20);

        expect(resposta.data).toHaveLength(2);
        expect(resposta.paginacao).toEqual({pagina: 2, limite: 20, total: 42, totalPaginas: 3});
    });
});
