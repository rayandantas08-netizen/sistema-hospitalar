import {describe, expect, it} from '@jest/globals';
import {
    CLASSIFICACOES_ORDENADAS,
    nivelGravidadeParaPrioridade,
    normalizarPrioridade,
    ordenarFilaPorGravidade,
    pesoClassificacao,
    prioridadeParaNivelGravidade,
    tempoAlvoMinutos,
} from '../src/modulo/core/model/Prioridade';
import {NivelGravidade, PrioridadeChamada} from '../src/modulo/core/model/Enums';

describe('Prioridade (ponte triagem ↔ painel)', () => {
    it('normaliza as duas grafias aceitas para a forma do painel', () => {
        expect(normalizarPrioridade('VERMELHO')).toBe(PrioridadeChamada.Vermelho);
        expect(normalizarPrioridade('Vermelho')).toBe(PrioridadeChamada.Vermelho);
        expect(normalizarPrioridade(' laranja ')).toBe(PrioridadeChamada.Laranja);
        expect(normalizarPrioridade('AZUL')).toBe(PrioridadeChamada.Azul);
        expect(normalizarPrioridade('roxo')).toBeNull();
        expect(normalizarPrioridade(null)).toBeNull();
    });

    it('converte para a grafia da coluna triagem.nivel_gravidade', () => {
        expect(prioridadeParaNivelGravidade('Vermelho')).toBe(NivelGravidade.Vermelho);
        expect(prioridadeParaNivelGravidade('VERDE')).toBe(NivelGravidade.Verde);
        expect(prioridadeParaNivelGravidade('inexistente')).toBeNull();
    });

    it('converte a classificação da triagem para a prioridade da chamada', () => {
        expect(nivelGravidadeParaPrioridade('VERMELHO')).toBe(PrioridadeChamada.Vermelho);
        expect(nivelGravidadeParaPrioridade('AMARELO')).toBe(PrioridadeChamada.Amarelo);
    });

    it('respeita o tempo-alvo do Protocolo de Manchester', () => {
        expect(tempoAlvoMinutos('VERMELHO')).toBe(0);
        expect(tempoAlvoMinutos('LARANJA')).toBe(10);
        expect(tempoAlvoMinutos('AMARELO')).toBe(60);
        expect(tempoAlvoMinutos('VERDE')).toBe(120);
        expect(tempoAlvoMinutos('AZUL')).toBe(240);
        expect(tempoAlvoMinutos('desconhecido')).toBeNull();
    });

    it('ordena a fila por gravidade e depois por tempo de espera', () => {
        const fila = ordenarFilaPorGravidade([
            {classificacaoRisco: 'AZUL', aguardandoDesde: '2026-01-01T10:00:00Z', nome: 'azul-antigo'},
            {classificacaoRisco: 'VERMELHO', aguardandoDesde: '2026-01-01T12:00:00Z', nome: 'vermelho-novo'},
            {classificacaoRisco: 'AMARELO', aguardandoDesde: '2026-01-01T09:00:00Z', nome: 'amarelo'},
            {classificacaoRisco: 'VERMELHO', aguardandoDesde: '2026-01-01T08:00:00Z', nome: 'vermelho-antigo'},
        ]);

        expect(fila.map((item) => item.nome)).toEqual([
            'vermelho-antigo',
            'vermelho-novo',
            'amarelo',
            'azul-antigo',
        ]);
    });

    it('mantém os pesos na ordem de gravidade', () => {
        expect(pesoClassificacao('VERMELHO')).toBeLessThan(pesoClassificacao('LARANJA'));
        expect(pesoClassificacao('LARANJA')).toBeLessThan(pesoClassificacao('AMARELO'));
        expect(pesoClassificacao('AMARELO')).toBeLessThan(pesoClassificacao('VERDE'));
        expect(pesoClassificacao('VERDE')).toBeLessThan(pesoClassificacao('AZUL'));
        expect(CLASSIFICACOES_ORDENADAS).toHaveLength(5);
    });
});
