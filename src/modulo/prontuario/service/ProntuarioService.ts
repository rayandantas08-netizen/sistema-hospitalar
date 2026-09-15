import {createHash} from 'crypto';
import {supabaseClient} from '../../../shared/database/supabase';
import {Prontuario} from '../model/Prontuario';
import {Papeis} from '../../core/model/Enums';
import {RespostaPaginada} from '../../core/model/Interfaces';
import {ParametrosPaginacao, montarRespostaPaginada} from '../../core/utils/paginacao';
import {ErroDeNegocio} from '../../core/utils/respostaHttp';
import {UnidadeResolver} from '../../core/utils/unidadeResolver';

const supabase = supabaseClient;

const SELECT_PRONTUARIO = `
    *,
    paciente:paciente!paciente_id (nome),
    profissional:funcionario!profissional_id (nome),
    unidade:unidade_saude!unidade_saude_id (nome)
`;

/** Campos do PEP estruturado (SOAP) + assinatura. */
export interface DadosProntuario {
    pacienteId: string;
    profissionalId: string;
    unidadeSaudeId?: string;
    dataHora?: string;
    subjetivo?: string;
    objetivo?: string;
    avaliacao?: string;
    plano?: string;
    /** Texto livre legado — usado também pelo lançamento automático de prescrições. */
    descricao?: string;
    cid10?: string;
    cid10Secundarios?: string[];
    assinadoDigitalmente?: boolean;
}

export class ProntuarioService {
    /**
     * Selo de integridade do conteúdo do prontuário.
     *
     * IMPORTANTE: este hash garante que o conteúdo não foi alterado depois de
     * assinado (integridade). Ele NÃO é uma assinatura digital ICP-Brasil —
     * para isso seria necessário um certificado A1/A3 do profissional. O campo
     * fica gravado em `certificado_hash` e é recalculado para conferência.
     */
    private calcularCertificadoHash(dados: {
        pacienteId: string;
        profissionalId: string;
        unidadeSaudeId: string | null;
        dataHora: string;
        subjetivo?: string | null;
        objetivo?: string | null;
        avaliacao?: string | null;
        plano?: string | null;
        descricao?: string | null;
        cid10?: string | null;
    }): string {
        const conteudo = [
            dados.pacienteId,
            dados.profissionalId,
            dados.unidadeSaudeId ?? '',
            dados.dataHora,
            dados.subjetivo ?? '',
            dados.objetivo ?? '',
            dados.avaliacao ?? '',
            dados.plano ?? '',
            dados.descricao ?? '',
            dados.cid10 ?? '',
        ]
            .map((parte) => String(parte).trim())
            .join('|');

        return `SHA256:${createHash('sha256').update(conteudo, 'utf8').digest('hex')}`;
    }

    /**
     * Converte o registro do banco para o formato da API.
     * Mantém as chaves antigas (paciente_nome, profissional_nome, descricao) e
     * adiciona os campos do PEP SOAP em camelCase.
     */
    private mapearProntuario(d: any): Record<string, any> {
        const dataHora = d.data_hora ?? d.created_at;
        const descricaoComposta =
            d.descricao ??
            [
                d.subjetivo ? `S: ${d.subjetivo}` : null,
                d.objetivo ? `O: ${d.objetivo}` : null,
                d.avaliacao ? `A: ${d.avaliacao}` : null,
                d.plano ? `P: ${d.plano}` : null,
            ]
                .filter(Boolean)
                .join('\n') ??
            null;

        return {
            id: d.id,
            pacienteId: d.paciente_id,
            medicoId: d.profissional_id,
            profissionalId: d.profissional_id,
            unidadeSaudeId: d.unidade_saude_id,
            dataHora,
            subjetivo: d.subjetivo ?? null,
            objetivo: d.objetivo ?? null,
            avaliacao: d.avaliacao ?? null,
            plano: d.plano ?? null,
            descricao: descricaoComposta || null,
            cid10: d.cid10 ?? null,
            cid10Secundarios: d.cid10_secundarios ?? [],
            assinadoDigitalmente: Boolean(d.assinado_digitalmente),
            certificadoHash: d.certificado_hash ?? null,
            ativo: Boolean(d.ativo),
            pacienteNome: d.paciente?.nome ?? 'Paciente não identificado',
            medicoNome: d.profissional?.nome ?? null,
            profissionalNome: d.profissional?.nome ?? null,
            unidadeNome: d.unidade?.nome ?? null,
            // ---- compatibilidade com o contrato antigo ----
            createdAt: d.created_at,
            data: dataHora,
            paciente_nome: d.paciente?.nome ?? 'Paciente não encontrado',
            profissional_nome: d.profissional?.nome ?? 'Profissional não encontrado',
        };
    }

    /**
     * Cria uma entrada no PEP (SOAP estruturado).
     * Regras:
     *   - o profissional precisa ser MEDICO ou ENFERMEIRO ativo
     *   - é necessário ao menos um campo de conteúdo (S, O, A, P ou descricao)
     *   - a unidade é resolvida pelo vínculo do profissional quando não enviada
     */
    async criarProntuario(dados: DadosProntuario): Promise<{ data: any | null; error: Error | null }> {
        try {
            const {pacienteId, profissionalId} = dados;

            if (!pacienteId || !profissionalId) {
                throw new ErroDeNegocio('Paciente e profissional são obrigatórios');
            }

            const temConteudo = Boolean(
                dados.subjetivo || dados.objetivo || dados.avaliacao || dados.plano || dados.descricao
            );
            if (!temConteudo) {
                throw new ErroDeNegocio(
                    'Informe ao menos um campo do prontuário (subjetivo, objetivo, avaliacao, plano ou descricao)'
                );
            }
            if (dados.descricao && dados.descricao.length < 10 && !dados.subjetivo && !dados.avaliacao) {
                throw new ErroDeNegocio('Descrição deve ter pelo menos 10 caracteres');
            }

            const {data: paciente} = await supabase
                .from('paciente')
                .select('id')
                .eq('id', pacienteId)
                .eq('ativo', true)
                .maybeSingle();
            if (!paciente) {
                throw ErroDeNegocio.naoEncontrado('Paciente não encontrado');
            }

            const {data: profissional} = await supabase
                .from('funcionario')
                .select('papel, ativo')
                .eq('id', profissionalId)
                .eq('ativo', true)
                .maybeSingle();
            if (!profissional || (profissional.papel !== Papeis.MEDICO && profissional.papel !== Papeis.ENFERMEIRO)) {
                throw ErroDeNegocio.proibido('Apenas MEDICO ou ENFERMEIRO podem criar prontuários');
            }

            // `prontuario.unidade_saude_id` é obrigatório no banco: quando o
            // formulário não envia a unidade, ela é resolvida pelo vínculo do
            // profissional (funcionario_unidade) ou do paciente.
            const {data: unidadeResolvida, error: unidadeError} = await UnidadeResolver.resolver({
                unidadeSaudeId: dados.unidadeSaudeId,
                profissionalId,
                pacienteId,
            });
            if (unidadeError) throw unidadeError;
            if (!unidadeResolvida) {
                throw new ErroDeNegocio(
                    'Não foi possível identificar a unidade de saúde. Informe unidadeSaudeId.'
                );
            }

            const dataHora = dados.dataHora ? new Date(dados.dataHora).toISOString() : new Date().toISOString();
            const assinado = Boolean(dados.assinadoDigitalmente);

            const certificadoHash = assinado
                ? this.calcularCertificadoHash({
                      pacienteId,
                      profissionalId,
                      unidadeSaudeId: unidadeResolvida,
                      dataHora,
                      subjetivo: dados.subjetivo,
                      objetivo: dados.objetivo,
                      avaliacao: dados.avaliacao,
                      plano: dados.plano,
                      descricao: dados.descricao,
                      cid10: dados.cid10,
                  })
                : null;

            const payload: Record<string, any> = {
                paciente_id: pacienteId,
                profissional_id: profissionalId,
                unidade_saude_id: unidadeResolvida,
                data_hora: dataHora,
                subjetivo: dados.subjetivo ?? null,
                objetivo: dados.objetivo ?? null,
                avaliacao: dados.avaliacao ?? null,
                plano: dados.plano ?? null,
                descricao: dados.descricao ?? null,
                cid10: dados.cid10 ?? null,
                cid10_secundarios: dados.cid10Secundarios ?? [],
                assinado_digitalmente: assinado,
                certificado_hash: certificadoHash,
                ativo: true,
            };

            const {data, error} = await supabase
                .from('prontuario')
                .insert(payload)
                .select(SELECT_PRONTUARIO)
                .single();

            if (error) {
                throw new Error(`Erro ao criar prontuário: ${error.message}`);
            }

            return {data: this.mapearProntuario(data), error: null};
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    /**
     * Assinatura em wrapper: assinatura posicional usada pelos módulos de
     * consulta e prescrição (lançamento automático no prontuário).
     */
    async createProntuario(
        pacienteId: string,
        profissionalId: string,
        unidadeSaudeId: string,
        descricao: string,
        cid10?: string
    ): Promise<{ data: any | null; error: Error | null }> {
        return this.criarProntuario({
            pacienteId,
            profissionalId,
            unidadeSaudeId,
            descricao,
            cid10,
        });
    }

    /** Listagem paginada do PEP (GET /api/prontuarios). */
    async listProntuariosPaginados(
        filtros: {
            pacienteId?: string;
            unidadeSaudeId?: string;
            profissionalId?: string;
            cid10?: string;
            apenasAssinados?: boolean;
        },
        paginacao: ParametrosPaginacao
    ): Promise<{ data: RespostaPaginada<any> | null; error: Error | null }> {
        try {
            let consulta = supabase
                .from('prontuario')
                .select(SELECT_PRONTUARIO, {count: 'exact'})
                .eq('ativo', true)
                // `data_hora` é a coluna real do PEP (o contrato antigo ordenava
                // por `data_criacao`, coluna que não existe e derrubava a rota).
                .order('data_hora', {ascending: false})
                .range(paginacao.de, paginacao.ate);

            if (filtros.pacienteId) consulta = consulta.eq('paciente_id', filtros.pacienteId);
            if (filtros.unidadeSaudeId) consulta = consulta.eq('unidade_saude_id', filtros.unidadeSaudeId);
            if (filtros.profissionalId) consulta = consulta.eq('profissional_id', filtros.profissionalId);
            if (filtros.cid10) consulta = consulta.eq('cid10', filtros.cid10);
            if (filtros.apenasAssinados) consulta = consulta.eq('assinado_digitalmente', true);

            const {data, error, count} = await consulta;
            if (error) throw new Error(`Erro ao listar prontuários: ${error.message}`);

            const prontuarios = (data ?? []).map((registro) => this.mapearProntuario(registro));
            return {
                data: montarRespostaPaginada(
                    prontuarios,
                    count ?? prontuarios.length,
                    paginacao.pagina,
                    paginacao.limite
                ),
                error: null,
            };
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    /**
     * Assina um prontuário já existente: grava o selo de integridade calculado
     * sobre o conteúdo atual. Só o profissional que criou o registro (ou o
     * administrador principal) pode assinar.
     */
    async assinarProntuario(
        id: string,
        profissionalId: string
    ): Promise<{ data: any | null; error: Error | null }> {
        try {
            const {data: prontuario} = await supabase
                .from('prontuario')
                .select('*')
                .eq('id', id)
                .eq('ativo', true)
                .maybeSingle();

            if (!prontuario) throw ErroDeNegocio.naoEncontrado('Prontuário não encontrado');

            const {data: profissional} = await supabase
                .from('funcionario')
                .select('papel')
                .eq('id', profissionalId)
                .eq('ativo', true)
                .maybeSingle();

            if (!profissional) throw ErroDeNegocio.naoEncontrado('Profissional não encontrado');
            if (
                prontuario.profissional_id !== profissionalId &&
                profissional.papel !== Papeis.ADMINISTRADOR_PRINCIPAL
            ) {
                throw ErroDeNegocio.proibido('Apenas o autor do prontuário pode assiná-lo');
            }
            if (prontuario.assinado_digitalmente) {
                throw ErroDeNegocio.conflito('Prontuário já está assinado');
            }

            const certificadoHash = this.calcularCertificadoHash({
                pacienteId: prontuario.paciente_id,
                profissionalId: prontuario.profissional_id,
                unidadeSaudeId: prontuario.unidade_saude_id,
                dataHora: prontuario.data_hora ?? prontuario.created_at,
                subjetivo: prontuario.subjetivo,
                objetivo: prontuario.objetivo,
                avaliacao: prontuario.avaliacao,
                plano: prontuario.plano,
                descricao: prontuario.descricao,
                cid10: prontuario.cid10,
            });

            const {data, error} = await supabase
                .from('prontuario')
                .update({assinado_digitalmente: true, certificado_hash: certificadoHash})
                .eq('id', id)
                .select(SELECT_PRONTUARIO)
                .single();

            if (error || !data) {
                throw new Error(`Erro ao assinar prontuário: ${error?.message || 'erro desconhecido'}`);
            }

            return {data: this.mapearProntuario(data), error: null};
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    async getAllProntuarios(usuarioId: string): Promise<{ data: any[], error: Error | null }> {
        try {
            const { data: usuario } = await supabase
                .from('funcionario')
                .select('papel')
                .eq('id', usuarioId)
                .eq('ativo', true)
                .single();

            if (!usuario || (usuario.papel !== Papeis.MEDICO && usuario.papel !== Papeis.ENFERMEIRO && usuario.papel !== Papeis.ADMINISTRADOR_PRINCIPAL)) {
                throw new Error('Apenas MEDICO, ENFERMEIRO ou ADMINISTRADOR_PRINCIPAL podem visualizar prontuários');
            }

            const { data, error } = await supabase
                .from('prontuario')
                .select(SELECT_PRONTUARIO)
                .eq('ativo', true)
                // `data_hora` é a coluna real (o código antigo ordenava por
                // `data_criacao`, que não existe — a rota respondia erro).
                .order('data_hora', { ascending: false })
                .limit(100);

            if (error) throw new Error(`Erro ao listar prontuários: ${error.message}`);

            const prontuarios = (data ?? []).map((d) => this.mapearProntuario(d));

            return { data: prontuarios, error: null };
        } catch (error) {
            return { data: [], error: error instanceof Error ? error : new Error('Erro desconhecido') };
        }
    }

    async getProntuario(id: string, usuarioId: string): Promise<{ data: any | null, error: Error | null }> {
        try {
            const { data: usuario } = await supabase
                .from('funcionario')
                .select('papel')
                .eq('id', usuarioId)
                .eq('ativo', true)
                .single();

            if (!usuario || (usuario.papel !== Papeis.MEDICO && usuario.papel !== Papeis.ENFERMEIRO && usuario.papel !== Papeis.ADMINISTRADOR_PRINCIPAL)) {
                throw new Error('Apenas MEDICO, ENFERMEIRO ou ADMINISTRADOR_PRINCIPAL podem visualizar prontuários');
            }

            const { data, error } = await supabase
                .from('prontuario')
                .select(SELECT_PRONTUARIO)
                .eq('id', id)
                .eq('ativo', true)
                .single();

            if (error || !data) {
                return { data: null, error: new Error('Prontuário não encontrado') };
            }

            return { data: this.mapearProntuario(data), error: null };
        } catch (error) {
            return { data: null, error: error instanceof Error ? error : new Error('Erro desconhecido') };
        }
    }

    async listProntuariosByPaciente(pacienteId: string, usuarioId: string): Promise<{
        data: Prontuario[],
        error: Error | null
    }> {
        try {
            const {data: usuario} = await supabase
                .from('funcionario')
                .select('papel')
                .eq('id', usuarioId)
                .eq('ativo', true)
                .single();
            if (!usuario || (usuario.papel !== Papeis.MEDICO && usuario.papel !== Papeis.ENFERMEIRO && usuario.papel !== Papeis.ADMINISTRADOR_PRINCIPAL)) {
                throw new Error('Apenas MEDICO, ENFERMEIRO ou ADMINISTRADOR_PRINCIPAL podem visualizar prontuários');
            }

            const {data: paciente} = await supabase
                .from('paciente')
                .select('id')
                .eq('id', pacienteId)
                .eq('ativo', true)
                .single();
            if (!paciente) throw new Error('Paciente não encontrado');

            const {data, error} = await supabase
                .from('prontuario')
                .select('*')
                .eq('paciente_id', pacienteId)
                .eq('ativo', true)
                .limit(100);

            if (error) throw new Error(`Erro ao listar prontuários: ${error.message}`);

            const prontuarios = data.map((d: any) => new Prontuario(
                d.id,
                d.paciente_id,
                d.profissional_id,
                d.unidade_saude_id,
                d.descricao,
                d.cid10
            ));
            return {data: prontuarios, error: null};
        } catch (error) {
            return {data: [], error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    async updateProntuario(
        id: string,
        descricao?: string,
        cid10?: string,
        profissionalId?: string,
        extras?: {
            subjetivo?: string;
            objetivo?: string;
            avaliacao?: string;
            plano?: string;
            cid10Secundarios?: string[];
            assinadoDigitalmente?: boolean;
        }
    ): Promise<{ data: any | null, error: Error | null }> {
        try {
            if (!profissionalId) throw new Error('ID do profissional é obrigatório');
            if (descricao && descricao.length < 10) {
                throw new Error('Descrição deve ter pelo menos 10 caracteres');
            }

            const {data: profissional} = await supabase
                .from('funcionario')
                .select('papel')
                .eq('id', profissionalId)
                .eq('ativo', true)
                .single();
            if (!profissional || (profissional.papel !== Papeis.MEDICO && profissional.papel !== Papeis.ENFERMEIRO)) {
                throw new Error('Apenas MEDICO ou ENFERMEIRO podem atualizar prontuários');
            }

            const {data: prontuario} = await supabase
                .from('prontuario')
                .select('*')
                .eq('id', id)
                .eq('ativo', true)
                .single();
            if (!prontuario) throw new Error('Prontuário não encontrado');

            const updates: any = {};
            if (descricao) updates.descricao = descricao;
            if (cid10) updates.cid10 = cid10;
            if (extras?.subjetivo !== undefined) updates.subjetivo = extras.subjetivo;
            if (extras?.objetivo !== undefined) updates.objetivo = extras.objetivo;
            if (extras?.avaliacao !== undefined) updates.avaliacao = extras.avaliacao;
            if (extras?.plano !== undefined) updates.plano = extras.plano;
            if (extras?.cid10Secundarios !== undefined) updates.cid10_secundarios = extras.cid10Secundarios;

            // Assinar durante a edição exige recalcular o selo de integridade.
            if (extras?.assinadoDigitalmente === true && !prontuario.assinado_digitalmente) {
                const conteudoFinal = {
                    subjetivo: extras.subjetivo ?? prontuario.subjetivo,
                    objetivo: extras.objetivo ?? prontuario.objetivo,
                    avaliacao: extras.avaliacao ?? prontuario.avaliacao,
                    plano: extras.plano ?? prontuario.plano,
                    descricao: descricao ?? prontuario.descricao,
                    cid10: cid10 ?? prontuario.cid10,
                };
                updates.assinado_digitalmente = true;
                updates.certificado_hash = this.calcularCertificadoHash({
                    pacienteId: prontuario.paciente_id,
                    profissionalId: prontuario.profissional_id,
                    unidadeSaudeId: prontuario.unidade_saude_id,
                    dataHora: prontuario.data_hora ?? prontuario.created_at,
                    ...conteudoFinal,
                });
            }

            if (Object.keys(updates).length === 0) {
                return {data: this.mapearProntuario(prontuario), error: null};
            }

            const {data, error} = await supabase
                .from('prontuario')
                .update(updates)
                .eq('id', id)
                .eq('ativo', true)
                .select(SELECT_PRONTUARIO)
                .single();

            if (error || !data) return {data: null, error: new Error('Prontuário não encontrado')};

            return {data: this.mapearProntuario(data), error: null};
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    async deleteProntuario(id: string, profissionalId: string): Promise<{ data: boolean, error: Error | null }> {
        try {
            const {data: profissional} = await supabase
                .from('funcionario')
                .select('papel')
                .eq('id', profissionalId)
                .eq('ativo', true)
                .single();
            if (!profissional || (profissional.papel !== Papeis.MEDICO && profissional.papel !== Papeis.ENFERMEIRO)) {
                throw new Error('Apenas MEDICO ou ENFERMEIRO podem desativar prontuários');
            }

            const {data: prontuario} = await supabase
                .from('prontuario')
                .select('id')
                .eq('id', id)
                .eq('ativo', true)
                .single();
            if (!prontuario) throw new Error('Prontuário não encontrado');

            const {error} = await supabase
                .from('prontuario')
                .update({ativo: false, data_desativacao: new Date().toISOString()})
                .eq('id', id);

            if (error) throw new Error(`Erro ao desativar prontuário: ${error.message}`);
            return {data: true, error: null};
        } catch (error) {
            return {data: false, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }
}