import {describe, expect, it} from '@jest/globals';
import {MewsService} from '../src/modulo/triagem/service/MewsService';
import {EscalaAvpu} from '../src/modulo/core/model/Enums';
import {SinaisVitais} from '../src/modulo/core/model/Interfaces';

function sinais(parcial: Partial<SinaisVitais> = {}): SinaisVitais {
    return {
        pressaoArterialSistolica: 120,
        pressaoArterialDiastolica: 80,
        frequenciaCardiaca: 80,
        frequenciaRespiratoria: 14,
        temperatura: 36.8,
        saturacaoOxigenio: 98,
        nivelDor: 0,
        estadoConsciente: true,
        ...parcial,
    };
}

describe('MewsService', () => {
    it('pontua 0 quando todos os parâmetros estão na faixa normal', () => {
        const {data, error} = MewsService.calcular(
            sinais({frequenciaRespiratoria: 12, pressaoArterialSistolica: 120})
        );

        expect(error).toBeNull();
        expect(data?.escore).toBe(0);
        expect(data?.faixa).toBe('BAIXO');
    });

    it('soma 1 ponto na frequência respiratória entre 15 e 20 rpm', () => {
        const {data} = MewsService.calcular(sinais({frequenciaRespiratoria: 18}));

        expect(data?.escore).toBe(1);
        expect(data?.componentes.frequenciaRespiratoria).toBe(1);
    });

    it('atinge o máximo (14) em paciente criticamente grave', () => {
        const {data} = MewsService.calcular(
            sinais({
                pressaoArterialSistolica: 65, // 3
                frequenciaCardiaca: 135, // 3
                frequenciaRespiratoria: 35, // 3
                temperatura: 34.5, // 2
                estadoConsciente: false, // AVPU DOR = 2
                escalaAvpu: EscalaAvpu.IRRESPONSIVO, // 3
            })
        );

        expect(data?.escore).toBe(14);
        expect(data?.faixa).toBe('CRITICO');
        expect(data?.recomendacao).toMatch(/imediato/i);
    });

    it('classifica as faixas de risco conforme o escore', () => {
        expect(MewsService.interpretar(0).faixa).toBe('BAIXO');
        expect(MewsService.interpretar(3).faixa).toBe('MODERADO');
        expect(MewsService.interpretar(5).faixa).toBe('ALTO');
        expect(MewsService.interpretar(7).faixa).toBe('CRITICO');
    });

    it('deriva AVPU do campo booleano quando a escala não é enviada', () => {
        expect(MewsService.derivarAvpu(true, undefined)).toBe(EscalaAvpu.ALERTA);
        expect(MewsService.derivarAvpu(false, undefined)).toBe(EscalaAvpu.DOR);
        // aceita a escala em minúsculas / qualquer caixa
        expect(MewsService.derivarAvpu(true, 'voz')).toBe(EscalaAvpu.VOZ);
        // valor inválido cai no fallback em vez de quebrar
        expect(MewsService.derivarAvpu(true, 'INVALIDO' as any)).toBe(EscalaAvpu.ALERTA);
    });

    it('devolve erro (e não lança) quando os sinais vitais não são informados', () => {
        const {data, error} = MewsService.calcular(undefined as any);

        expect(data).toBeNull();
        expect(error).toBeInstanceOf(Error);
    });
});
