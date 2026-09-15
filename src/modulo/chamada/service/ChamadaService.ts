import {supabaseServiceClient} from '@/shared/database/supabase';
import {
    NivelGravidade,
    PrioridadeChamada,
    StatusChamada,
    StatusSala
} from '../../core/model/Enums';
import {
    nivelGravidadeParaPrioridade,
    normalizarPrioridade,
    ordenarFilaPorGravidade,
    pesoClassificacao,
    tempoAlvoMinutos
} from '../../core/model/Prioridade';
import {ItemFilaAtendimento, RespostaPaginada} from '../../core/model/Interfaces';
import {ParametrosPaginacao, montarRespostaPaginada} from '../../core/utils/paginacao';
import {ErroDeNegocio} from '../../core/utils/respostaHttp';
import {SalaService} from '../../sala/service/SalaService';
import {ChamadaResposta} from '../model/Chamada';
import {painelRealtime} from './PainelRealtime';

const supabase = supabaseServiceClient;

const SELECT_CHAMADA = `
    id,
    paciente_id,
    sala_id,
    sala,
    senha,
    prioridade,
    status,
    chamado_em,
    atendido_em,
    finalizado_em,
    profissional_id,
    triagem_id,
    unidade_saude_id,
    ativo,
    paciente:paciente!paciente_id (nome),
    profissional:funcionario!profissional_id (nome)
`;

/** Prefixo da senha: emergência (Vermelho/Laranja) = V, demais = A. */
const PRIORIDADES_COM_PREFIXO_V: PrioridadeChamada[] = [
    PrioridadeChamada.Vermelho,
    PrioridadeChamada.Laranja,
];

export interface DadosChamada {
    pacienteId?: string;
    triagemId?: string;
    salaId?: string;
    sala?: string;
    senha?: string;
    prioridade?: PrioridadeChamada;
    profissionalId?: string;
    unidadeSaudeId?: string;
}

export interface FiltrosFila {
    unidadeSaudeId?: string;
    classificacaoRisco?: NivelGravidade;
    mewsMinimo?: number;
}

export class ChamadaService {
    private salaService: SalaService;

    constructor() {
        this.salaService = new SalaService();
    }

    // -----------------------------------------------------------------------
    // Mapeamento
    // -----------------------------------------------------------------------
    private mapear(registro: any): ChamadaResposta {
        return {
            id: registro.id,
            pacienteId: registro.paciente_id,
            pacienteNome: registro.paciente?.nome ?? null,
            senha: registro.senha,
            prioridade: normalizarPrioridade(registro.prioridade) ?? PrioridadeChamada.Azul,
            status: registro.status as StatusChamada,
            salaId: registro.sala_id ?? null,
            // `sala` guarda o nome denormalizado; se a chamada tiver só o id,
            // o nome vem da sala carregada no registro.
            sala: registro.sala ?? registro.sala_ref?.nome ?? null,
            unidadeSaudeId: registro.unidade_saude_id ?? null,
            chamadoEm: registro.chamado_em ?? null,
            atendidoEm: registro.atendido_em ?? null,
            finalizadoEm: registro.finalizado_em ?? null,
            profissionalId: registro.profissional_id ?? null,
            profissionalNome: registro.profissional?.nome ?? null,
            triagemId: registro.triagem_id ?? null,
        };
    }

    // -----------------------------------------------------------------------
    // Senha do painel (ex.: A014, V001)
    // -----------------------------------------------------------------------
    private async gerarSenha(prioridade: PrioridadeChamada): Promise<string> {
        const prefixo = PRIORIDADES_COM_PREFIXO_V.includes(prioridade) ? 'V' : 'A';

        const inicioDoDia = new Date();
        inicioDoDia.setHours(0, 0, 0, 0);

        const {data} = await supabase
            .from('chamada')
            .select('senha')
            .gte('chamado_em', inicioDoDia.toISOString())
            .like('senha', `${prefixo}%`);

        const maiorNumero = (data ?? []).reduce((maior: number, linha: any) => {
            const numero = Number(String(linha.senha ?? '').replace(/\D/g, ''));
            return Number.isFinite(numero) && numero > maior ? numero : maior;
        }, 0);

        return `${prefixo}${String(maiorNumero + 1).padStart(3, '0')}`;
    }

    // -----------------------------------------------------------------------
    // POST /api/chamadas/chamar
    // -----------------------------------------------------------------------
    async chamarPaciente(
        dados: DadosChamada,
        profissionalAutenticadoId: string
    ): Promise<{ data: ChamadaResposta | null; error: Error | null }> {
        try {
            // 1. Triagem de origem (quando a chamada vem da fila da triagem)
            let triagem: any = null;
            if (dados.triagemId) {
                const {data} = await supabase
                    .from('triagem')
                    .select('id, paciente_id, unidade_saude_id, nivel_gravidade, mews_score, queixa_principal')
                    .eq('id', dados.triagemId)
                    .eq('ativo', true)
                    .maybeSingle();

                if (!data) {
                    throw ErroDeNegocio.naoEncontrado('Triagem não encontrada');
                }
                triagem = data;
            }

            // 2. Paciente (vem da triagem ou direto do corpo da requisição)
            const pacienteId = triagem?.paciente_id ?? dados.pacienteId;
            if (!pacienteId) {
                throw new ErroDeNegocio('Informe pacienteId ou triagemId');
            }

            const {data: paciente} = await supabase
                .from('paciente')
                .select('id, nome, ativo')
                .eq('id', pacienteId)
                .eq('ativo', true)
                .maybeSingle();

            if (!paciente) {
                throw ErroDeNegocio.naoEncontrado('Paciente não encontrado');
            }

            // 3. Profissional que está chamando (padrão: usuário autenticado)
            const profissionalId = dados.profissionalId ?? profissionalAutenticadoId;
            const {data: profissional} = await supabase
                .from('funcionario')
                .select('id, papel, ativo')
                .eq('id', profissionalId)
                .eq('ativo', true)
                .maybeSingle();

            if (!profissional) {
                throw ErroDeNegocio.naoEncontrado('Profissional não encontrado');
            }

            // 4. Sala de destino (id ou nome). Sala inativa não recebe chamada.
            const {data: sala, error: salaError} = await this.salaService.resolverSala({
                salaId: dados.salaId,
                nomeSala: dados.sala,
                unidadeSaudeId: dados.unidadeSaudeId ?? triagem?.unidade_saude_id ?? undefined,
            });

            if (salaError || !sala) {
                throw salaError ?? ErroDeNegocio.naoEncontrado('Sala não encontrada');
            }
            if (sala.status === StatusSala.INATIVA) {
                throw new ErroDeNegocio(`A sala "${sala.nome}" está inativa e não pode receber chamadas`);
            }

            // 5. Prioridade: triagem manda; senão usa a informada.
            const prioridadeDaTriagem = nivelGravidadeParaPrioridade(triagem?.nivel_gravidade);
            const prioridade = prioridadeDaTriagem ?? dados.prioridade;
            if (!prioridade) {
                throw new ErroDeNegocio(
                    'Informe a prioridade da chamada (Vermelho, Laranja, Amarelo, Verde, Azul)'
                );
            }

            // 6. Não permitir duas chamadas abertas para o mesmo paciente.
            const {data: chamadaAberta} = await supabase
                .from('chamada')
                .select('id, senha, sala, status')
                .eq('paciente_id', pacienteId)
                .eq('ativo', true)
                .in('status', [StatusChamada.CHAMANDO, StatusChamada.EM_ATENDIMENTO])
                .limit(1)
                .maybeSingle();

            if (chamadaAberta) {
                throw ErroDeNegocio.conflito(
                    `Paciente já possui a chamada ${chamadaAberta.senha} em aberto (${chamadaAberta.status})`
                );
            }

            const senha = dados.senha?.trim().toUpperCase() || (await this.gerarSenha(prioridade));

            const {data, error} = await supabase
                .from('chamada')
                .insert({
                    paciente_id: pacienteId,
                    sala_id: sala.id,
                    // Guarda o nome também: o painel mostra "Sala" sem join.
                    sala: sala.nome,
                    senha,
                    prioridade,
                    status: StatusChamada.CHAMANDO,
                    chamado_em: new Date().toISOString(),
                    profissional_id: profissionalId,
                    triagem_id: triagem?.id ?? null,
                    unidade_saude_id: dados.unidadeSaudeId ?? sala.unidadeSaudeId ?? triagem?.unidade_saude_id ?? null,
                    ativo: true,
                })
                .select(SELECT_CHAMADA)
                .single();

            if (error || !data) {
                throw new Error(`Erro ao registrar chamada: ${error?.message || 'erro desconhecido'}`);
            }

            // 7. Sala passa a estar em atendimento.
            if (sala.status === StatusSala.LIVRE) {
                await this.salaService.atualizarStatus(sala.id, StatusSala.EM_ATENDIMENTO);
            }

            const chamada = this.mapear(data);

            // 8. Broadcast para o painel de TV (SSE + WebSocket).
            painelRealtime.publicar('chamada:criada', chamada);

            return {data: chamada, error: null};
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    // -----------------------------------------------------------------------
    // GET /api/chamadas/ultimas
    // -----------------------------------------------------------------------
    async ultimasChamadas(
        limite = 10,
        unidadeSaudeId?: string
    ): Promise<{ data: ChamadaResposta[]; error: Error | null }> {
        try {
            let consulta = supabase
                .from('chamada')
                .select(SELECT_CHAMADA)
                .eq('ativo', true)
                .order('chamado_em', {ascending: false})
                .limit(limite);

            if (unidadeSaudeId) {
                consulta = consulta.eq('unidade_saude_id', unidadeSaudeId);
            }

            const {data, error} = await consulta;
            if (error) {
                throw new Error(`Erro ao listar chamadas: ${error.message}`);
            }

            return {data: (data ?? []).map((registro) => this.mapear(registro)), error: null};
        } catch (error) {
            return {data: [], error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    // -----------------------------------------------------------------------
    // GET /api/chamadas — histórico paginado
    // -----------------------------------------------------------------------
    async listarChamadas(
        filtros: { unidadeSaudeId?: string; status?: StatusChamada; classificacaoRisco?: NivelGravidade } = {},
        paginacao: ParametrosPaginacao
    ): Promise<{ data: RespostaPaginada<ChamadaResposta> | null; error: Error | null }> {
        try {
            let consulta = supabase
                .from('chamada')
                .select(SELECT_CHAMADA, {count: 'exact'})
                .eq('ativo', true)
                .order('chamado_em', {ascending: false})
                .range(paginacao.de, paginacao.ate);

            if (filtros.unidadeSaudeId) {
                consulta = consulta.eq('unidade_saude_id', filtros.unidadeSaudeId);
            }
            if (filtros.status) {
                consulta = consulta.eq('status', filtros.status);
            }
            if (filtros.classificacaoRisco) {
                // `ilike` sem curingas = comparação sem diferenciar maiúsculas,
                // aceitando 'Vermelho' e 'VERMELHO' gravados no banco.
                const prioridade = nivelGravidadeParaPrioridade(filtros.classificacaoRisco);
                if (prioridade) {
                    consulta = consulta.ilike('prioridade', prioridade);
                }
            }

            const {data, error, count} = await consulta;
            if (error) {
                throw new Error(`Erro ao listar chamadas: ${error.message}`);
            }

            const chamadas = (data ?? []).map((registro) => this.mapear(registro));
            return {
                data: montarRespostaPaginada(
                    chamadas,
                    count ?? chamadas.length,
                    paginacao.pagina,
                    paginacao.limite
                ),
                error: null,
            };
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    // -----------------------------------------------------------------------
    // GET /api/chamadas/fila
    // Fila = triagens ativas que ainda NÃO geraram chamada em aberto.
    // -----------------------------------------------------------------------
    async listarFila(
        filtros: FiltrosFila = {},
        paginacao?: ParametrosPaginacao
    ): Promise<{ data: ItemFilaAtendimento[] | RespostaPaginada<ItemFilaAtendimento> | null; error: Error | null }> {
        try {
            let consulta = supabase
                .from('triagem')
                .select(
                    `
                        id,
                        paciente_id,
                        unidade_saude_id,
                        nivel_gravidade,
                        mews_score,
                        queixa_principal,
                        created_at,
                        paciente:paciente!paciente_id (nome)
                    `
                )
                .eq('ativo', true)
                .order('created_at', {ascending: true})
                .limit(200);

            if (filtros.unidadeSaudeId) {
                consulta = consulta.eq('unidade_saude_id', filtros.unidadeSaudeId);
            }
            if (filtros.classificacaoRisco) {
                consulta = consulta.eq('nivel_gravidade', filtros.classificacaoRisco);
            }
            if (typeof filtros.mewsMinimo === 'number') {
                consulta = consulta.gte('mews_score', filtros.mewsMinimo);
            }

            // `ativo=true` em triagem traz o histórico completo do paciente, então
            // só a triagem MAIS RECENTE de cada paciente entra na fila.
            const {data: triagens, error} = await consulta;
            if (error) {
                throw new Error(`Erro ao listar fila de triagens: ${error.message}`);
            }

            const {data: chamadasAbertas} = await supabase
                .from('chamada')
                .select('paciente_id, triagem_id, senha, status, sala')
                .eq('ativo', true)
                .in('status', [StatusChamada.CHAMANDO, StatusChamada.EM_ATENDIMENTO]);

            const pacientesComChamada = new Map(
                (chamadasAbertas ?? []).map((chamada: any) => [chamada.paciente_id, chamada])
            );
            const triagensChamadas = new Set(
                (chamadasAbertas ?? []).map((chamada: any) => chamada.triagem_id).filter(Boolean)
            );

            const triagemMaisRecentePorPaciente = new Map<string, any>();
            for (const triagem of triagens ?? []) {
                if (!triagemMaisRecentePorPaciente.has(triagem.paciente_id)) {
                    triagemMaisRecentePorPaciente.set(triagem.paciente_id, triagem);
                }
            }

            const agora = Date.now();
            const fila: ItemFilaAtendimento[] = [];

            for (const triagem of triagemMaisRecentePorPaciente.values()) {
                if (triagensChamadas.has(triagem.id)) continue;

                const chamadaEmAberto = pacientesComChamada.get(triagem.paciente_id);
                // Paciente com atendimento em andamento não volta para a fila.
                if (chamadaEmAberto?.status === StatusChamada.EM_ATENDIMENTO) continue;

                const aguardandoDesde = triagem.created_at ?? new Date().toISOString();
                const minutosAguardando = Math.max(
                    0,
                    Math.floor((agora - new Date(aguardandoDesde).getTime()) / 60_000)
                );
                const alvo = tempoAlvoMinutos(triagem.nivel_gravidade);

                fila.push({
                    triagemId: triagem.id,
                    pacienteId: triagem.paciente_id,
                    pacienteNome: triagem.paciente?.nome ?? 'Paciente não identificado',
                    senha: chamadaEmAberto?.senha ?? null,
                    classificacaoRisco: triagem.nivel_gravidade,
                    prioridade: nivelGravidadeParaPrioridade(triagem.nivel_gravidade) ?? PrioridadeChamada.Azul,
                    mewsScore: triagem.mews_score ?? null,
                    queixaPrincipal: triagem.queixa_principal,
                    unidadeSaudeId: triagem.unidade_saude_id,
                    aguardandoDesde,
                    minutosAguardando,
                    tempoAlvoMinutos: alvo,
                    excedeTempoAlvo: alvo !== null && minutosAguardando > alvo,
                });
            }

            const filaOrdenada = ordenarFilaPorGravidade(fila);

            if (!paginacao) {
                return {data: filaOrdenada, error: null};
            }

            const inicio = paginacao.de;
            const pagina = filaOrdenada.slice(inicio, inicio + paginacao.limite);
            return {
                data: montarRespostaPaginada(pagina, filaOrdenada.length, paginacao.pagina, paginacao.limite),
                error: null,
            };
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    // -----------------------------------------------------------------------
    // GET /api/chamadas/:id
    // -----------------------------------------------------------------------
    async getChamada(id: string): Promise<{ data: ChamadaResposta | null; error: Error | null }> {
        try {
            const {data, error} = await supabase
                .from('chamada')
                .select(SELECT_CHAMADA)
                .eq('id', id)
                .maybeSingle();

            if (error) throw new Error(`Erro ao buscar chamada: ${error.message}`);
            if (!data) throw ErroDeNegocio.naoEncontrado('Chamada não encontrada');

            return {data: this.mapear(data), error: null};
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    // -----------------------------------------------------------------------
    // PATCH /api/chamadas/:id/finalizar
    // -----------------------------------------------------------------------
    async finalizarChamada(
        id: string,
        opcoes: { status?: StatusChamada; atendidoEm?: string } = {}
    ): Promise<{ data: ChamadaResposta | null; error: Error | null }> {
        try {
            const {data: chamadaAtual} = await supabase
                .from('chamada')
                .select('id, status, sala_id, atendido_em')
                .eq('id', id)
                .eq('ativo', true)
                .maybeSingle();

            if (!chamadaAtual) {
                throw ErroDeNegocio.naoEncontrado('Chamada não encontrada');
            }
            if (chamadaAtual.status === StatusChamada.FINALIZADO || chamadaAtual.status === StatusChamada.CANCELADO) {
                throw new ErroDeNegocio(`Chamada já está ${chamadaAtual.status.toLowerCase()}`);
            }

            const statusFinal = opcoes.status ?? StatusChamada.FINALIZADO;
            const agora = new Date().toISOString();

            const {data, error} = await supabase
                .from('chamada')
                .update({
                    status: statusFinal,
                    atendido_em: chamadaAtual.atendido_em ?? opcoes.atendidoEm ?? agora,
                    finalizado_em: agora,
                })
                .eq('id', id)
                .select(SELECT_CHAMADA)
                .single();

            if (error || !data) {
                throw new Error(`Erro ao finalizar chamada: ${error?.message || 'erro desconhecido'}`);
            }

            const chamada = this.mapear(data);

            // Libera a sala se não houver outro atendimento em andamento nela.
            if (chamadaAtual.sala_id) {
                const {data: outrasChamadas} = await supabase
                    .from('chamada')
                    .select('id')
                    .eq('sala_id', chamadaAtual.sala_id)
                    .eq('ativo', true)
                    .in('status', [StatusChamada.CHAMANDO, StatusChamada.EM_ATENDIMENTO])
                    .limit(1);

                if (!outrasChamadas || outrasChamadas.length === 0) {
                    const {data: salaAtual} = await supabase
                        .from('sala')
                        .select('status')
                        .eq('id', chamadaAtual.sala_id)
                        .maybeSingle();

                    if (salaAtual && salaAtual.status === StatusSala.EM_ATENDIMENTO) {
                        await this.salaService.atualizarStatus(chamadaAtual.sala_id, StatusSala.LIVRE);
                        painelRealtime.publicar('sala:atualizada', {
                            salaId: chamadaAtual.sala_id,
                            status: StatusSala.LIVRE,
                        });
                    }
                }
            }

            painelRealtime.publicar('chamada:finalizada', chamada);

            return {data: chamada, error: null};
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    /** Marca a chamada como EM_ATENDIMENTO (paciente entrou no consultório). */
    async iniciarAtendimento(id: string): Promise<{ data: ChamadaResposta | null; error: Error | null }> {
        try {
            const {data, error} = await supabase
                .from('chamada')
                .update({status: StatusChamada.EM_ATENDIMENTO, atendido_em: new Date().toISOString()})
                .eq('id', id)
                .eq('ativo', true)
                .in('status', [StatusChamada.CHAMANDO])
                .select(SELECT_CHAMADA)
                .maybeSingle();

            if (error) throw new Error(`Erro ao iniciar atendimento: ${error.message}`);
            if (!data) {
                throw new ErroDeNegocio('Chamada não encontrada ou já não está aguardando (status CHAMANDO)');
            }

            const chamada = this.mapear(data);
            painelRealtime.publicar('chamada:atualizada', chamada);
            return {data: chamada, error: null};
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    /** Peso de ordenação exposto para quem precisar montar listas próprias. */
    static pesoDaClassificacao(classificacao?: string | null): number {
        return pesoClassificacao(classificacao);
    }
}
