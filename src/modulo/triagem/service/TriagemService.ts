import {supabaseClient, supabaseServiceClient} from '../../../shared/database/supabase';
import {Triagem} from '../model/Triagem';
import {Paciente} from '../../paciente/model/Paciente';
import {EscalaAvpu, NivelGravidade, Papeis} from '../../core/model/Enums';
import {ItemFilaAtendimento, RespostaPaginada, SinaisVitais} from '../../core/model/Interfaces';
import {nivelGravidadeParaPrioridade, ordenarFilaPorGravidade, tempoAlvoMinutos} from '../../core/model/Prioridade';
import {ParametrosPaginacao, montarRespostaPaginada} from '../../core/utils/paginacao';
import {PrioridadeService} from './PrioridadeService';
import {MewsService} from './MewsService';

// Leitura/escrita com service-role: o middleware já autorizou o usuário.
const supabase = supabaseClient;
const supabaseAdmin = supabaseServiceClient;

export class TriagemService {
    async createTriagem(
        pacienteId: string,
        enfermeiroId: string,
        unidadeSaudeId: string,
        sinaisVitais: SinaisVitais,
        queixaPrincipal: string,
        salaId?: string
    ): Promise<{ data: Triagem | null, error: Error | null }> {
        try {
            if (!pacienteId || !enfermeiroId || !unidadeSaudeId || !sinaisVitais || !queixaPrincipal) {
                throw new Error('Campos obrigatórios não preenchidos');
            }
            if (queixaPrincipal.length < 3) {
                throw new Error('Queixa principal deve ter pelo menos 3 caracteres');
            }
            if (sinaisVitais.saturacaoOxigenio && (sinaisVitais.saturacaoOxigenio < 0 || sinaisVitais.saturacaoOxigenio > 100)) {
                throw new Error('Saturação de oxigênio inválida (0-100%)');
            }
            if (sinaisVitais.frequenciaRespiratoria && (sinaisVitais.frequenciaRespiratoria < 0 || sinaisVitais.frequenciaRespiratoria > 60)) {
                throw new Error('Frequência respiratória inválida (0-60/min)');
            }
            if (sinaisVitais.pressaoArterialSistolica && (sinaisVitais.pressaoArterialSistolica < 0 || sinaisVitais.pressaoArterialSistolica > 300)) {
                throw new Error('Pressão arterial sistólica inválida (0-300 mmHg)');
            }
            if (sinaisVitais.pressaoArterialDiastolica && (sinaisVitais.pressaoArterialDiastolica < 0 || sinaisVitais.pressaoArterialDiastolica > 200)) {
                throw new Error('Pressão arterial diastólica inválida (0-200 mmHg)');
            }
            if (sinaisVitais.frequenciaCardiaca && (sinaisVitais.frequenciaCardiaca < 0 || sinaisVitais.frequenciaCardiaca > 200)) {
                throw new Error('Frequência cardíaca inválida (0-200 bpm)');
            }
            if (sinaisVitais.temperatura && (sinaisVitais.temperatura < 32 || sinaisVitais.temperatura > 43)) {
                throw new Error('Temperatura inválida (32-43°C)');
            }
            if (sinaisVitais.nivelDor && (sinaisVitais.nivelDor < 0 || sinaisVitais.nivelDor > 10)) {
                throw new Error('Nível de dor inválido (0-10)');
            }

            const {data: paciente} = await supabase
                .from('paciente')
                .select('*')
                .eq('id', pacienteId)
                .eq('ativo', true)
                .single();
            if (!paciente) {
                throw new Error('Paciente não encontrado');
            }
            const {data: unidade} = await supabase
                .from('unidade_saude')
                .select('id')
                .eq('id', unidadeSaudeId)
                .single();
            if (!unidade) {
                throw new Error('Unidade de saúde não encontrada');
            }

            // Sala da triagem (opcional): precisa estar ativa e ser da mesma
            // unidade, senão o médico chamaria o paciente para a sala errada.
            if (salaId) {
                const {data: sala} = await supabase
                    .from('sala')
                    .select('id, unidade_saude_id, ativo')
                    .eq('id', salaId)
                    .maybeSingle();
                if (!sala || !sala.ativo) {
                    throw new Error('Sala não encontrada (ou inativa)');
                }
                if (sala.unidade_saude_id !== unidadeSaudeId) {
                    throw new Error('A sala informada não pertence a esta unidade de saúde');
                }
            }

            const pacienteObj = new Paciente(
                paciente.id,
                paciente.nome,
                paciente.cpf,
                paciente.cns,
                new Date(paciente.data_nascimento),
                paciente.sexo,
                paciente.raca_cor,
                paciente.escolaridade,
                {
                    logradouro: paciente.endereco_logradouro,
                    numero: paciente.endereco_numero,
                    bairro: paciente.endereco_bairro,
                    cidade: paciente.endereco_cidade,
                    estado: paciente.endereco_estado,
                    cep: paciente.endereco_cep,
                },
                paciente.telefone,
                paciente.grupos_risco,
                paciente.consentimento_lgpd,
                paciente.email
            );
            const {
                data: nivelGravidade,
                error: gravidadeError
            } = PrioridadeService.calcularNivelGravidade(pacienteObj, sinaisVitais, queixaPrincipal);
            if (gravidadeError || !nivelGravidade) {
                throw new Error(`Erro ao calcular nível de gravidade: ${gravidadeError?.message || 'Erro desconhecido'}`);
            }

            // Escore MEWS: apoio à decisão, calculado e gravado junto da triagem.
            const {data: resultadoMews} = MewsService.calcular(sinaisVitais);
            const escalaAvpu = resultadoMews?.escalaAvpu ?? MewsService.derivarAvpu(sinaisVitais.estadoConsciente);
            const sinaisVitaisNormalizados: SinaisVitais = {...sinaisVitais, escalaAvpu};

            // sala_id só entra no payload quando informada: instalações que
            // ainda não rodaram a migration da coluna continuam criando
            // triagem normalmente (degradação graceful com autoDeploy).
            const registro: Record<string, any> = {
                paciente_id: pacienteId,
                enfermeiro_id: enfermeiroId,
                unidade_saude_id: unidadeSaudeId,
                nivel_gravidade: nivelGravidade,
                sinais_vitais: sinaisVitaisNormalizados,
                queixa_principal: queixaPrincipal,
                mews_score: resultadoMews?.escore ?? null,
                ativo: true,
            };
            if (salaId) {
                registro.sala_id = salaId;
            }

            const {data, error} = await supabase
                .from('triagem')
                .insert(registro)
                .select()
                .single();

            if (error) throw new Error(`Erro ao criar triagem: ${error.message}`);

            const triagem = new Triagem(
                data.id,
                data.paciente_id,
                data.enfermeiro_id,
                data.unidade_saude_id,
                data.nivel_gravidade,
                data.sinais_vitais,
                data.queixa_principal,
                data.mews_score ?? resultadoMews?.escore ?? null
            );
            return {data: triagem, error: null};
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }


    // =======================================================================
    // Listagem paginada (GET /api/triagens?pagina=1&limite=20&unidadeSaudeId=...)
    // =======================================================================
    async listTriagensPaginadas(
        filtros: {
            unidadeSaudeId?: string;
            classificacaoRisco?: NivelGravidade;
            pacienteId?: string;
            mewsMinimo?: number;
        },
        paginacao: ParametrosPaginacao
    ): Promise<{ data: RespostaPaginada<any> | null, error: Error | null }> {
        try {
            const SELECT_BASE = `
                        *,
                        paciente:paciente!paciente_id (nome),
                        enfermeiro:funcionario!enfermeiro_id (nome),
                        unidade:unidade_saude!unidade_saude_id (nome)
                    `;
            const SELECT_COM_SALA = `${SELECT_BASE}, sala:sala!sala_id (nome)`;

            const montarConsulta = (select: string) => {
                let consulta = supabaseAdmin
                    .from('triagem')
                    .select(select, {count: 'exact'})
                    .eq('ativo', true)
                    .order('created_at', {ascending: false})
                    .range(paginacao.de, paginacao.ate);

                if (filtros.unidadeSaudeId) consulta = consulta.eq('unidade_saude_id', filtros.unidadeSaudeId);
                if (filtros.classificacaoRisco) consulta = consulta.eq('nivel_gravidade', filtros.classificacaoRisco);
                if (filtros.pacienteId) consulta = consulta.eq('paciente_id', filtros.pacienteId);
                if (typeof filtros.mewsMinimo === 'number') consulta = consulta.gte('mews_score', filtros.mewsMinimo);
                return consulta;
            };

            let {data, error, count} = await montarConsulta(SELECT_COM_SALA);
            if (error && /sala/i.test(error.message)) {
                // Instalação ainda sem a migration da coluna sala_id: devolve a
                // lista sem o nome da sala em vez de quebrar a tela de triagem.
                const retry = await montarConsulta(SELECT_BASE);
                data = retry.data as typeof data;
                error = retry.error;
                count = retry.count;
            }
            if (error) throw new Error(`Erro ao listar triagens: ${error.message}`);

            const triagens = (data ?? []).map((d: any) => this.mapearTriagemCompleta(d));
            return {
                data: montarRespostaPaginada(triagens, count ?? triagens.length, paginacao.pagina, paginacao.limite),
                error: null,
            };
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    /**
     * Mapeia a triagem preservando as chaves antigas (snake_case, usadas pelo
     * contrato atual) e adicionando os campos novos em camelCase: mewsScore,
     * classificacaoRisco, sinaisVitais/escalaAvpu, pacienteNome e unidadeNome.
     */
    private mapearTriagemCompleta(d: any): Record<string, any> {
        const sinaisVitais = d.sinais_vitais ?? {};
        return {
            id: d.id,
            createdAt: d.created_at,
            pacienteId: d.paciente_id,
            enfermeiroId: d.enfermeiro_id,
            unidadeSaudeId: d.unidade_saude_id,
            nivelGravidade: d.nivel_gravidade,
            classificacaoRisco: d.nivel_gravidade,
            mewsScore: d.mews_score ?? null,
            sinaisVitais,
            escalaAvpu: sinaisVitais.escalaAvpu ?? null,
            queixaPrincipal: d.queixa_principal,
            dataTriagem: d.data_triagem ?? d.created_at,
            pacienteNome: d.paciente?.nome ?? 'Paciente não identificado',
            enfermeiroNome: d.enfermeiro?.nome ?? null,
            unidadeNome: d.unidade?.nome ?? null,
            salaId: d.sala_id ?? null,
            salaNome: d.sala?.nome ?? null,
            // Compatibilidade com o contrato antigo do GET /api/triagens
            paciente_nome: d.paciente?.nome ?? '',
            enfermeiro_nome: d.enfermeiro?.nome ?? '',
            data_triagem: d.data_triagem ?? d.created_at,
            nivel_gravidade: d.nivel_gravidade,
            queixa_principal: d.queixa_principal,
        };
    }

    // =======================================================================
    // GET /api/sala-vermelha/fila — somente classificação VERMELHO aguardando
    // =======================================================================
    async getFilaSalaVermelha(
        filtros: {unidadeSaudeId?: string} = {},
        paginacao?: ParametrosPaginacao
    ): Promise<{ data: ItemFilaAtendimento[] | RespostaPaginada<ItemFilaAtendimento> | null, error: Error | null }> {
        try {
            let consulta = supabaseAdmin
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
                .eq('nivel_gravidade', NivelGravidade.Vermelho)
                .order('created_at', {ascending: true})
                .limit(200);

            if (filtros.unidadeSaudeId) consulta = consulta.eq('unidade_saude_id', filtros.unidadeSaudeId);

            const {data: triagens, error} = await consulta;
            if (error) throw new Error(`Erro ao listar fila da Sala Vermelha: ${error.message}`);

            // Pacientes já chamados/em atendimento saem da fila de espera.
            const {data: chamadasAbertas} = await supabaseAdmin
                .from('chamada')
                .select('paciente_id, triagem_id, senha, status')
                .eq('ativo', true)
                .in('status', ['CHAMANDO', 'EM_ATENDIMENTO']);

            const pacientesEmAtendimento = new Set(
                (chamadasAbertas ?? [])
                    .filter((c: any) => c.status === 'EM_ATENDIMENTO')
                    .map((c: any) => c.paciente_id)
            );
            const senhasAbertas = new Map((chamadasAbertas ?? []).map((c: any) => [c.triagem_id, c.senha]));
            const triagensChamadas = new Set((chamadasAbertas ?? []).map((c: any) => c.triagem_id).filter(Boolean));

            const maisRecentePorPaciente = new Map<string, any>();
            for (const triagem of triagens ?? []) {
                if (!maisRecentePorPaciente.has(triagem.paciente_id)) {
                    maisRecentePorPaciente.set(triagem.paciente_id, triagem);
                }
            }

            const agora = Date.now();
            const fila: ItemFilaAtendimento[] = [];

            for (const triagem of maisRecentePorPaciente.values()) {
                if (triagensChamadas.has(triagem.id)) continue;
                if (pacientesEmAtendimento.has(triagem.paciente_id)) continue;

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
                    senha: senhasAbertas.get(triagem.id) ?? null,
                    classificacaoRisco: triagem.nivel_gravidade,
                    prioridade: nivelGravidadeParaPrioridade(triagem.nivel_gravidade) ?? 'Vermelho',
                    mewsScore: triagem.mews_score ?? null,
                    queixaPrincipal: triagem.queixa_principal,
                    unidadeSaudeId: triagem.unidade_saude_id,
                    aguardandoDesde,
                    minutosAguardando,
                    // Sala Vermelha: tempo alvo é imediato (0 min)
                    tempoAlvoMinutos: alvo,
                    excedeTempoAlvo: alvo !== null && minutosAguardando > alvo,
                });
            }

            const ordenada = ordenarFilaPorGravidade(fila);

            if (!paginacao) {
                return {data: ordenada, error: null};
            }

            return {
                data: montarRespostaPaginada(
                    ordenada.slice(paginacao.de, paginacao.de + paginacao.limite),
                    ordenada.length,
                    paginacao.pagina,
                    paginacao.limite
                ),
                error: null,
            };
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    /** Escore MEWS de uma triagem já gravada (recalculado sobre os sinais salvos). */
    async getMewsDaTriagem(id: string): Promise<{ data: any | null, error: Error | null }> {
        try {
            const {data, error} = await supabaseAdmin
                .from('triagem')
                .select('id, paciente_id, sinais_vitais, mews_score, nivel_gravidade, created_at')
                .eq('id', id)
                .eq('ativo', true)
                .maybeSingle();

            if (error) throw new Error(`Erro ao buscar triagem: ${error.message}`);
            if (!data) throw new Error('Triagem não encontrada');

            const {data: calculo} = MewsService.calcular(data.sinais_vitais as SinaisVitais);

            return {
                data: {
                    triagemId: data.id,
                    pacienteId: data.paciente_id,
                    classificacaoRisco: data.nivel_gravidade,
                    // valor gravado no banco; se a triagem for antiga, usa o recálculo
                    mewsScore: data.mews_score ?? calculo?.escore ?? null,
                    mewsRecalculado: calculo?.escore ?? null,
                    faixa: calculo?.faixa ?? null,
                    recomendacao: calculo?.recomendacao ?? null,
                    componentes: calculo?.componentes ?? null,
                    escalaAvpu: calculo?.escalaAvpu ?? null,
                },
                error: null,
            };
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    async getAllTriagens(usuarioId: string): Promise<{ data: any[], error: Error | null }> {
        try {
            const { data, error } = await supabase
                .from('triagem')
                .select(`
                    *,
                    paciente:paciente_id (nome),
                    enfermeiro:enfermeiro_id (nome)
                `)
                .eq('ativo', true)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw new Error(`Erro ao listar triagens: ${error.message}`);

            const triagens = data.map(d => ({
                id: d.id,
                paciente_nome: d.paciente?.nome || '',
                enfermeiro_nome: d.enfermeiro?.nome || '',
                data_triagem: d.created_at,
                nivel_gravidade: d.nivel_gravidade,
                queixa_principal: d.queixa_principal,
            }));

            return { data: triagens, error: null };
        } catch (error) {
            return { data: [], error: error instanceof Error ? error : new Error('Erro desconhecido') };
        }
    }

    async getTriagem(id: string): Promise<{ data: Triagem | null, error: Error | null }> {
        try {
            const { data, error } = await supabase
                .from('triagem')
                .select(`
                    *,
                    paciente:paciente_id (nome),
                    enfermeiro:enfermeiro_id (nome)
                `)
                .eq('id', id)
                .eq('ativo', true)
                .single();

            if (error || !data) {
                return { data: null, error: new Error('Triagem não encontrada') };
            }

            const triagem = {
                id: data.id,
                createdAt: new Date(data.created_at),
                pacienteId: data.paciente_id,
                enfermeiroId: data.enfermeiro_id,
                unidadeSaudeId: data.unidade_saude_id,
                nivel_gravidade: data.nivel_gravidade,
                sinais_vitais: data.sinais_vitais,
                data_triagem: data.data_triagem,
                queixa_principal: data.queixa_principal,
                paciente_nome: data.paciente?.nome || 'Paciente não encontrado',
                enfermeiro_nome: data.enfermeiro?.nome || 'Enfermeiro não encontrado',
                // Campos novos (o frontend do painel usa camelCase)
                dataTriagem: data.data_triagem ?? data.created_at,
                nivelGravidade: data.nivel_gravidade,
                classificacaoRisco: data.nivel_gravidade,
                mewsScore: data.mews_score ?? null,
                sinaisVitais: data.sinais_vitais,
                queixaPrincipal: data.queixa_principal,
                escalaAvpu: data.sinais_vitais?.escalaAvpu ?? null,
                pacienteNome: data.paciente?.nome || 'Paciente não encontrado',
                enfermeiroNome: data.enfermeiro?.nome || 'Enfermeiro não encontrado',
            };

            return { data: triagem as any, error: null };
        } catch (error) {
            return { data: null, error: error instanceof Error ? error : new Error('Erro desconhecido') };
        }
    }

    async listTriagensByPaciente(pacienteId: string): Promise<{
        data: Triagem[],
        error: Error | null
    }> {
        try {
            const {data: paciente} = await supabase
                .from('paciente')
                .select('id')
                .eq('id', pacienteId)
                .eq('ativo', true)
                .single();
            if (!paciente) throw new Error('Paciente não encontrado');

            const {data, error} = await supabase
                .from('triagem')
                .select('*')
                .eq('paciente_id', pacienteId)
                .eq('ativo', true)
                .limit(100);

            if (error) throw new Error(`Erro ao listar triagens: ${error.message}`);

            const triagens = data.map((d: any) => new Triagem(
                d.id,
                d.paciente_id,
                d.enfermeiro_id,
                d.unidade_saude_id,
                d.nivel_gravidade,
                d.sinais_vitais,
                d.queixa_principal
            ));
            return {data: triagens, error: null};
        } catch (error) {
            return {data: [], error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    async listPacientesByGravidade(
        nivelGravidade: NivelGravidade,
        unidadeSaudeId: string,
    ): Promise<{ data: Paciente[], error: Error | null }> {
        try {
            if (!Object.values(NivelGravidade).includes(nivelGravidade)) {
                throw new Error('Nível de gravidade inválido');
            }
            const {data: unidade} = await supabase
                .from('unidade_saude')
                .select('id')
                .eq('id', unidadeSaudeId)
                .single();
            if (!unidade) throw new Error('Unidade de saúde não encontrada');

            const {data: triagens, error: triagemError} = await supabase
                .from('triagem')
                .select('paciente_id')
                .eq('unidade_saude_id', unidadeSaudeId)
                .eq('nivel_gravidade', nivelGravidade)
                .eq('ativo', true)
                .limit(100);

            if (triagemError) throw new Error(`Erro ao listar triagens: ${triagemError.message}`);
            const pacienteIds = triagens.map((t: any) => t.paciente_id);

            const {data, error} = await supabase
                .from('paciente')
                .select('*')
                .in('id', pacienteIds)
                .eq('ativo', true)
                .limit(100);

            if (error) throw new Error(`Erro ao listar pacientes: ${error.message}`);

            const pacientes = data.map((d: any) => new Paciente(
                d.id,
                d.nome,
                d.cpf,
                d.cns,
                new Date(d.data_nascimento),
                d.sexo,
                d.raca_cor,
                d.escolaridade,
                {
                    logradouro: d.endereco_logradouro,
                    numero: d.endereco_numero,
                    bairro: d.endereco_bairro,
                    cidade: d.endereco_cidade,
                    estado: d.endereco_estado,
                    cep: d.endereco_cep,
                },
                d.telefone,
                d.grupos_risco,
                d.consentimento_lgpd,
                d.email
            ));
            return {data: pacientes, error: null};
        } catch (error) {
            return {data: [], error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    async updateTriagem(
        id: string,
        nivelGravidade?: NivelGravidade,
        sinaisVitais?: SinaisVitais,
        queixaPrincipal?: string,
        enfermeiroId?: string
    ): Promise<{ data: Triagem | null, error: Error | null }> {
        try {
            if (!enfermeiroId) throw new Error('ID do enfermeiro é obrigatório');
            const {data: triagem} = await supabase
                .from('triagem')
                .select('*')
                .eq('id', id)
                .eq('ativo', true)
                .single();
            if (!triagem) throw new Error('Triagem não encontrada');

            const updates: any = {};

            if (!nivelGravidade && (sinaisVitais || queixaPrincipal)) {
                const {data: paciente} = await supabase
                    .from('paciente')
                    .select('*')
                    .eq('id', triagem.paciente_id)
                    .eq('ativo', true)
                    .single();
                if (!paciente) throw new Error('Paciente não encontrado');
                const pacienteObj = new Paciente(
                    paciente.id,
                    paciente.nome,
                    paciente.cpf,
                    paciente.cns,
                    new Date(paciente.data_nascimento),
                    paciente.sexo,
                    paciente.raca_cor,
                    paciente.escolaridade,
                    {
                        logradouro: paciente.endereco_logradouro,
                        numero: paciente.endereco_numero,
                        bairro: paciente.endereco_bairro,
                        cidade: paciente.endereco_cidade,
                        estado: paciente.endereco_estado,
                        cep: paciente.endereco_cep,
                    },
                    paciente.telefone,
                    paciente.grupos_risco,
                    paciente.consentimento_lgpd,
                    paciente.email
                );
                const {data: gravidade, error: gravidadeError} = PrioridadeService.calcularNivelGravidade(
                    pacienteObj,
                    sinaisVitais || triagem.sinais_vitais,
                    queixaPrincipal || triagem.queixa_principal
                );
                if (gravidadeError || !gravidade) {
                    throw new Error(`Erro ao calcular nível de gravidade: ${gravidadeError?.message || 'Erro desconhecido'}`);
                }
                updates.nivel_gravidade = gravidade;
            } else if (nivelGravidade) {
                updates.nivel_gravidade = nivelGravidade;
            }

            if (sinaisVitais) updates.sinais_vitais = sinaisVitais;
            if (queixaPrincipal) updates.queixa_principal = queixaPrincipal;

            const {data, error} = await supabase
                .from('triagem')
                .update(updates)
                .eq('id', id)
                .eq('ativo', true)
                .select()
                .single();

            if (error || !data) return {data: null, error: new Error('Triagem não encontrada')};

            const triagemAtualizada = new Triagem(
                data.id,
                data.paciente_id,
                data.enfermeiro_id,
                data.unidade_saude_id,
                data.nivel_gravidade,
                data.sinais_vitais,
                data.queixa_principal
            );
            return {data: triagemAtualizada, error: null};
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    async deleteTriagem(id: string): Promise<{ data: boolean, error: Error | null }> {
        try {
            const {data: triagem} = await supabase
                .from('triagem')
                .select('id')
                .eq('id', id)
                .eq('ativo', true)
                .single();
            if (!triagem) throw new Error('Triagem não encontrada');

            const {error} = await supabase
                .from('triagem')
                .update({ativo: false, data_desativacao: new Date().toISOString()})
                .eq('id', id);

            if (error) throw new Error(`Erro ao desativar triagem: ${error.message}`);
            return {data: true, error: null};
        } catch (error) {
            return {data: false, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }
}