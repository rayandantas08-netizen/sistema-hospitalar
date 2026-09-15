import {EscalaAvpu} from '../../core/model/Enums';
import {SinaisVitais} from '../../core/model/Interfaces';

/**
 * ============================================================================
 * MEWS — Modified Early Warning Score
 * ============================================================================
 * Escore fisiológico que soma pontos de 0 a 3 em cinco parâmetros e devolve um
 * total de 0 a 14. Quanto maior, maior o risco de deterioração clínica:
 *
 *   Parâmetro           3        2        1        0        1        2        3
 *   PAS (mmHg)        <=70    71-80   81-100  101-199     -      >=200      -
 *   FC (bpm)            -     <=40    41-50   51-100   101-110  111-129   >=130
 *   FR (rpm)            -      <9        -     9-14     15-20    21-29    >=30
 *   Temperatura (°C)    -      <35       -    35-38.4      -     >=38.5     -
 *   AVPU                -        -       -       A         V       P        U
 *
 * Faixas de risco usadas para orientar a conduta:
 *   0-2   baixo      → seguimento de rotina
 *   3-4   moderado   → revisão médica
 *   5-6   alto       → revisão médica urgente
 *   >= 7  crítico    → atendimento imediato
 *
 * O MEWS é armazenado junto da triagem (`mews_score`) como informação de apoio.
 * Ele NÃO substitui o Protocolo de Manchester: a classificação de risco
 * continua vindo do PrioridadeService e não é sobrescrita silenciosamente.
 */
export interface ResultadoMews {
    escore: number;
    faixa: 'BAIXO' | 'MODERADO' | 'ALTO' | 'CRITICO';
    recomendacao: string;
    componentes: Record<string, number>;
    escalaAvpu: EscalaAvpu;
}

function pontuarPressaoArterialSistolica(valor: number): number {
    if (valor <= 70) return 3;
    if (valor <= 80) return 2;
    if (valor <= 100) return 1;
    if (valor <= 199) return 0;
    return 2;
}

function pontuarFrequenciaCardiaca(valor: number): number {
    if (valor <= 40) return 2;
    if (valor <= 50) return 1;
    if (valor <= 100) return 0;
    if (valor <= 110) return 1;
    if (valor <= 129) return 2;
    return 3;
}

function pontuarFrequenciaRespiratoria(valor: number): number {
    if (valor < 9) return 2;
    if (valor <= 14) return 0;
    if (valor <= 20) return 1;
    if (valor <= 29) return 2;
    return 3;
}

function pontuarTemperatura(valor: number): number {
    if (valor < 35) return 2;
    if (valor <= 38.4) return 0;
    return 2;
}

function pontuarAvpu(escala: EscalaAvpu): number {
    switch (escala) {
        case EscalaAvpu.ALERTA:
            return 0;
        case EscalaAvpu.VOZ:
            return 1;
        case EscalaAvpu.DOR:
            return 2;
        case EscalaAvpu.IRRESPONSIVO:
            return 3;
        default:
            return 0;
    }
}

export class MewsService {
    /**
     * A escala AVPU é opcional no payload (o frontend antigo não enviava).
     * Quando não vem, derivamos do campo booleano `estadoConsciente` para não
     * perder o parâmetro neurológico do escore.
     */
    static derivarAvpu(estadoConsciente?: boolean, escalaAvpu?: EscalaAvpu | string | null): EscalaAvpu {
        if (escalaAvpu) {
            const normalizada = String(escalaAvpu).trim().toUpperCase();
            if ((Object.values(EscalaAvpu) as string[]).includes(normalizada)) {
                return normalizada as EscalaAvpu;
            }
        }
        return estadoConsciente === false ? EscalaAvpu.DOR : EscalaAvpu.ALERTA;
    }

    static calcular(sinaisVitais: SinaisVitais): { data: ResultadoMews | null; error: Error | null } {
        try {
            if (!sinaisVitais) {
                throw new Error('Sinais vitais não informados');
            }

            const escalaAvpu = this.derivarAvpu(sinaisVitais.estadoConsciente, sinaisVitais.escalaAvpu);

            const componentes = {
                pressaoArterialSistolica: pontuarPressaoArterialSistolica(sinaisVitais.pressaoArterialSistolica),
                frequenciaCardiaca: pontuarFrequenciaCardiaca(sinaisVitais.frequenciaCardiaca),
                frequenciaRespiratoria: pontuarFrequenciaRespiratoria(sinaisVitais.frequenciaRespiratoria),
                temperatura: pontuarTemperatura(sinaisVitais.temperatura),
                escalaAvpu: pontuarAvpu(escalaAvpu),
            };

            const escore = Object.values(componentes).reduce((total, pontos) => total + pontos, 0);

            const {faixa, recomendacao} = this.interpretar(escore);

            return {
                data: {escore, faixa, recomendacao, componentes, escalaAvpu},
                error: null,
            };
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro ao calcular MEWS')};
        }
    }

    static interpretar(escore: number): { faixa: ResultadoMews['faixa']; recomendacao: string } {
        if (escore >= 7) {
            return {faixa: 'CRITICO', recomendacao: 'Atendimento médico imediato — considere Sala Vermelha'};
        }
        if (escore >= 5) {
            return {faixa: 'ALTO', recomendacao: 'Revisão médica urgente e reavaliação a cada 30 minutos'};
        }
        if (escore >= 3) {
            return {faixa: 'MODERADO', recomendacao: 'Revisão médica e reavaliação a cada 1 hora'};
        }
        return {faixa: 'BAIXO', recomendacao: 'Seguimento de rotina conforme classificação de risco'};
    }
}
