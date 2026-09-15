import {supabaseClient} from '../../../shared/database/supabase';
import {Prescricao} from '../model/Prescricao';
import {ProntuarioService} from '../../prontuario/service/ProntuarioService';
import {Papeis, StatusPrescricao, TipoUnidadeSaude} from '../../core/model/Enums';
import {RespostaPaginada} from '../../core/model/Interfaces';
import {ParametrosPaginacao, montarRespostaPaginada} from '../../core/utils/paginacao';
import {ErroDeNegocio} from '../../core/utils/respostaHttp';
import {UnidadeResolver} from '../../core/utils/unidadeResolver';

const supabase = supabaseClient;

const SELECT_PRESCRICAO = `
    *,
    paciente:paciente!paciente_id (nome),
    profissional:funcionario!profissional_id (nome),
    unidade:unidade_saude!unidade_saude_id (nome)
`;

/** Prescrição estruturada + campos legados aceitos pela API. */
export interface DadosPrescricao {
    pacienteId: string;
    profissionalId: string;
    unidadeSaudeId?: string;
    medicamento?: string;
    via?: string;
    posologia?: string;
    duracao?: string;
    status?: StatusPrescricao;
    prontuarioId?: string;
    detalhesPrescricao?: string;
    cid10?: string;
    dataCriacao?: string;
}

export class PrescricaoService {
    private prontuarioService: ProntuarioService;

    constructor() {
        this.prontuarioService = new ProntuarioService();
    }

    /** Mapeia a prescrição para o formato da API (camelCase + legado). */
    private mapearPrescricao(d: any): Record<string, any> {
        const detalhes =
            d.detalhes_prescricao ??
            [
                d.medicamento,
                d.via ? `via ${d.via}` : null,
                d.posologia,
                d.duracao ? `por ${d.duracao}` : null,
            ]
                .filter(Boolean)
                .join(' — ');

        return {
            id: d.id,
            pacienteId: d.paciente_id,
            medicoId: d.profissional_id,
            profissionalId: d.profissional_id,
            unidadeSaudeId: d.unidade_saude_id ?? null,
            medicamento: d.medicamento ?? null,
            via: d.via ?? null,
            posologia: d.posologia ?? null,
            duracao: d.duracao ?? null,
            status: d.status ?? StatusPrescricao.ATIVA,
            cid10: d.cid10 ?? null,
            dataCriacao: d.data_criacao,
            pacienteNome: d.paciente?.nome ?? 'Paciente não identificado',
            medicoNome: d.profissional?.nome ?? null,
            profissionalNome: d.profissional?.nome ?? null,
            unidadeNome: d.unidade?.nome ?? null,
            // ---- compatibilidade com o contrato antigo ----
            detalhesPrescricao: detalhes || null,
            paciente_nome: d.paciente?.nome ?? '',
            medico_nome: d.profissional?.nome ?? '',
            data_criacao: d.data_criacao,
        };
    }

    /** Texto único usado no lançamento automático do prontuário. */
    private montarResumo(dados: DadosPrescricao): string {
        if (dados.detalhesPrescricao) return dados.detalhesPrescricao;

        return [
            dados.medicamento,
            dados.via ? `via ${dados.via}` : null,
            dados.posologia,
            dados.duracao ? `por ${dados.duracao}` : null,
        ]
            .filter(Boolean)
            .join(' — ');
    }

    /**
     * Cria a prescrição.
     * Regras de negócio mantidas:
     *   - apenas MEDICO, ENFERMEIRO ou ADMINISTRADOR_PRINCIPAL prescrevem
     *   - ENFERMEIRO só prescreve em UPA
     *   - cada prescrição gera uma entrada no prontuário (campo `plano` do SOAP)
     */
    async criarPrescricao(dados: DadosPrescricao): Promise<{ data: any | null; error: Error | null }> {
        try {
            const {pacienteId, profissionalId} = dados;

            if (!pacienteId || !profissionalId) {
                throw new ErroDeNegocio('Paciente e profissional são obrigatórios');
            }
            if (!dados.detalhesPrescricao && !(dados.medicamento && dados.posologia)) {
                throw new ErroDeNegocio('Informe medicamento e posologia (ou o campo detalhesPrescricao)');
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
            if (
                !profissional ||
                (profissional.papel !== Papeis.MEDICO &&
                    profissional.papel !== Papeis.ENFERMEIRO &&
                    profissional.papel !== Papeis.ADMINISTRADOR_PRINCIPAL)
            ) {
                throw ErroDeNegocio.proibido(
                    'Apenas MEDICO, ENFERMEIRO ou ADMINISTRADOR_PRINCIPAL podem criar prescrições'
                );
            }

            // A unidade é resolvida pelo vínculo quando o formulário não envia.
            const {data: unidadeId, error: unidadeError} = await UnidadeResolver.resolver({
                unidadeSaudeId: dados.unidadeSaudeId,
                profissionalId,
                pacienteId,
            });
            if (unidadeError) throw unidadeError;

            if (profissional.papel === Papeis.ENFERMEIRO) {
                if (!unidadeId) {
                    throw new ErroDeNegocio(
                        'Não foi possível identificar a unidade do enfermeiro. Informe unidadeSaudeId.'
                    );
                }
                const {data: unidade} = await supabase
                    .from('unidade_saude')
                    .select('tipo')
                    .eq('id', unidadeId)
                    .maybeSingle();

                if (!unidade || unidade.tipo !== TipoUnidadeSaude.UPA) {
                    throw ErroDeNegocio.proibido('ENFERMEIRO só pode criar prescrições em UPAs');
                }
            }

            const {data, error} = await supabase
                .from('prescricao')
                .insert({
                    paciente_id: pacienteId,
                    profissional_id: profissionalId,
                    unidade_saude_id: unidadeId ?? null,
                    medicamento: dados.medicamento ?? null,
                    via: dados.via ?? null,
                    posologia: dados.posologia ?? null,
                    duracao: dados.duracao ?? null,
                    status: dados.status ?? StatusPrescricao.ATIVA,
                    detalhes_prescricao: this.montarResumo(dados),
                    cid10: dados.cid10 ?? null,
                    data_criacao: dados.dataCriacao ?? new Date().toISOString(),
                    ativo: true,
                })
                .select(SELECT_PRESCRICAO)
                .single();

            if (error || !data) {
                throw new Error(`Erro ao criar prescrição: ${error?.message || 'erro desconhecido'}`);
            }

            // Lançamento automático no prontuário — agora no campo `plano` (SOAP).
            if (unidadeId) {
                const resumo = `Prescrição criada em ${new Date().toLocaleDateString('pt-BR')}. ${this.montarResumo(
                    dados
                )}.${dados.cid10 ? ` CID-10: ${dados.cid10}` : ''}`;

                const {error: prontuarioError} = await this.prontuarioService.criarProntuario({
                    pacienteId,
                    profissionalId,
                    unidadeSaudeId: unidadeId,
                    plano: resumo,
                    cid10: dados.cid10,
                });

                if (prontuarioError) {
                    // A prescrição já existe: o erro do prontuário é reportado,
                    // mas não desfazemos o registro clínico da prescrição.
                    console.error('Erro ao lançar prescrição no prontuário:', prontuarioError.message);
                }
            }

            return {data: this.mapearPrescricao(data), error: null};
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    /** Wrapper com a assinatura posicional antiga. */
    async createPrescricao(
        pacienteId: string,
        profissionalId: string,
        unidadeSaudeId: string,
        detalhesPrescricao: string,
        cid10?: string
    ): Promise<{ data: any | null; error: Error | null }> {
        return this.criarPrescricao({
            pacienteId,
            profissionalId,
            unidadeSaudeId,
            detalhesPrescricao,
            cid10,
        });
    }

    /** Listagem paginada com filtros (GET /api/prescricoes). */
    async listPrescricoesPaginadas(
        filtros: {
            pacienteId?: string;
            unidadeSaudeId?: string;
            profissionalId?: string;
            status?: StatusPrescricao;
        },
        paginacao: ParametrosPaginacao
    ): Promise<{ data: RespostaPaginada<any> | null; error: Error | null }> {
        try {
            let consulta = supabase
                .from('prescricao')
                .select(SELECT_PRESCRICAO, {count: 'exact'})
                .eq('ativo', true)
                .order('data_criacao', {ascending: false})
                .range(paginacao.de, paginacao.ate);

            if (filtros.pacienteId) consulta = consulta.eq('paciente_id', filtros.pacienteId);
            if (filtros.unidadeSaudeId) consulta = consulta.eq('unidade_saude_id', filtros.unidadeSaudeId);
            if (filtros.profissionalId) consulta = consulta.eq('profissional_id', filtros.profissionalId);
            if (filtros.status) consulta = consulta.eq('status', filtros.status);

            const {data, error, count} = await consulta;
            if (error) throw new Error(`Erro ao listar prescrições: ${error.message}`);

            const prescricoes = (data ?? []).map((registro) => this.mapearPrescricao(registro));
            return {
                data: montarRespostaPaginada(
                    prescricoes,
                    count ?? prescricoes.length,
                    paginacao.pagina,
                    paginacao.limite
                ),
                error: null,
            };
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    /** Suspende/cancela/conclui uma prescrição (mudança isolada de status). */
    async atualizarStatusPrescricao(
        id: string,
        status: StatusPrescricao,
        profissionalId: string
    ): Promise<{ data: any | null; error: Error | null }> {
        try {
            const {data: profissional} = await supabase
                .from('funcionario')
                .select('papel')
                .eq('id', profissionalId)
                .eq('ativo', true)
                .maybeSingle();

            if (!profissional || (profissional.papel !== Papeis.MEDICO && profissional.papel !== Papeis.ENFERMEIRO)) {
                throw ErroDeNegocio.proibido('Apenas MEDICO ou ENFERMEIRO podem alterar prescrições');
            }

            const {data, error} = await supabase
                .from('prescricao')
                .update({status})
                .eq('id', id)
                .eq('ativo', true)
                .select(SELECT_PRESCRICAO)
                .maybeSingle();

            if (error) throw new Error(`Erro ao atualizar status da prescrição: ${error.message}`);
            if (!data) throw ErroDeNegocio.naoEncontrado('Prescrição não encontrada');

            return {data: this.mapearPrescricao(data), error: null};
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    async getAllPrescricoes(usuarioId: string): Promise<{ data: any[], error: Error | null }> {
        try {
            const { data: usuario } = await supabase
                .from('funcionario')
                .select('papel')
                .eq('id', usuarioId)
                .eq('ativo', true)
                .single();

            if (!usuario || (usuario.papel !== Papeis.MEDICO && usuario.papel !== Papeis.ENFERMEIRO && usuario.papel !== Papeis.ADMINISTRADOR_PRINCIPAL)) {
                throw new Error('Apenas MEDICO, ENFERMEIRO ou ADMINISTRADOR_PRINCIPAL podem visualizar prescrições');
            }

            const { data, error } = await supabase
                .from('prescricao')
                .select(SELECT_PRESCRICAO)
                .eq('ativo', true)
                .order('data_criacao', { ascending: false })
                .limit(100);

            if (error) throw new Error(`Erro ao listar prescrições: ${error.message}`);

            const prescricoes = (data ?? []).map((d) => this.mapearPrescricao(d));

            return { data: prescricoes, error: null };
        } catch (error) {
            return { data: [], error: error instanceof Error ? error : new Error('Erro desconhecido') };
        }
    }

    async getPrescricao(id: string, usuarioId: string): Promise<{ data: any | null, error: Error | null }> {
        try {
            const { data: usuario } = await supabase
                .from('funcionario')
                .select('papel')
                .eq('id', usuarioId)
                .eq('ativo', true)
                .single();

            if (!usuario || (usuario.papel !== Papeis.MEDICO && usuario.papel !== Papeis.ENFERMEIRO && usuario.papel !== Papeis.ADMINISTRADOR_PRINCIPAL)) {
                throw new Error('Apenas MEDICO, ENFERMEIRO e ADMINISTRADOR_PRINCIPAL podem visualizar prescrições');
            }

            const { data, error } = await supabase
                .from('prescricao')
                .select(`
                    *,
                    paciente:paciente_id (nome),
                    profissional:profissional_id (nome)
                `)
                .eq('id', id)
                .eq('ativo', true)
                .single();

            if (error || !data) {
                return { data: null, error: new Error('Prescrição não encontrada') };
            }

            return { data: this.mapearPrescricao(data), error: null };
        } catch (error) {
            return { data: null, error: error instanceof Error ? error : new Error('Erro desconhecido') };
        }
    }

    async listPrescricoesByPaciente(pacienteId: string, usuarioId: string): Promise<{ data: any[], error: Error | null }> {
        try {
            const { data: usuario } = await supabase
                .from('funcionario')
                .select('papel')
                .eq('id', usuarioId)
                .eq('ativo', true)
                .single();

            if (!usuario || (usuario.papel !== Papeis.MEDICO && usuario.papel !== Papeis.ENFERMEIRO)) {
                throw new Error('Apenas MEDICO ou ENFERMEIRO podem visualizar prescrições');
            }

            const { data: paciente } = await supabase
                .from('paciente')
                .select('id')
                .eq('id', pacienteId)
                .eq('ativo', true)
                .single();

            if (!paciente) throw new Error('Paciente não encontrado');

            const { data, error } = await supabase
                .from('prescricao')
                .select(SELECT_PRESCRICAO)
                .eq('paciente_id', pacienteId)
                .eq('ativo', true)
                .order('data_criacao', { ascending: false })
                .limit(100);

            if (error) throw new Error(`Erro ao listar prescrições: ${error.message}`);

            const prescricoes = (data ?? []).map((d) => ({
                ...this.mapearPrescricao(d),
                createdAt: d.data_criacao,
            }));

            return { data: prescricoes, error: null };
        } catch (error) {
            return { data: [], error: error instanceof Error ? error : new Error('Erro desconhecido') };
        }
    }


    async updatePrescricao(
        id: string,
        detalhesPrescricao?: string,
        cid10?: string,
        profissionalId?: string,
        extras?: {
            medicamento?: string;
            via?: string;
            posologia?: string;
            duracao?: string;
            status?: StatusPrescricao;
        }
    ): Promise<{ data: any | null, error: Error | null }> {
        try {
            if (!profissionalId) throw new Error('ID do profissional é obrigatório');
            if (detalhesPrescricao && detalhesPrescricao.length < 10) {
                throw new Error('Detalhes da prescrição devem ter pelo menos 10 caracteres');
            }
            if (cid10 && !/^[A-Z]\d{2}(\.\d{1,2})?$/.test(cid10)) {
                throw new Error('CID-10 inválido (ex.: J45 ou J45.0)');
            }

            const {data: profissional} = await supabase
                .from('funcionario')
                .select('papel')
                .eq('id', profissionalId)
                .eq('ativo', true)
                .single();
            if (!profissional || (profissional.papel !== Papeis.MEDICO && profissional.papel !== Papeis.ENFERMEIRO)) {
                throw new Error('Apenas MEDICO ou ENFERMEIRO podem atualizar prescrições');
            }

            const {data: prescricao} = await supabase
                .from('prescricao')
                .select('*')
                .eq('id', id)
                .eq('ativo', true)
                .single();
            if (!prescricao) throw new Error('Prescrição não encontrada');

            if (profissional.papel === Papeis.ENFERMEIRO) {
                const {data: unidade} = await supabase
                    .from('unidade_saude')
                    .select('tipo')
                    .eq('id', prescricao.unidade_saude_id)
                    .single();
                if (!unidade || unidade.tipo !== TipoUnidadeSaude.UPA) {
                    throw new Error('ENFERMEIRO só pode atualizar prescrições em UPAs');
                }
            }

            const updates: any = {};
            if (detalhesPrescricao) updates.detalhes_prescricao = detalhesPrescricao;
            if (cid10) updates.cid10 = cid10;
            if (extras?.medicamento !== undefined) updates.medicamento = extras.medicamento;
            if (extras?.via !== undefined) updates.via = extras.via;
            if (extras?.posologia !== undefined) updates.posologia = extras.posologia;
            if (extras?.duracao !== undefined) updates.duracao = extras.duracao;
            if (extras?.status !== undefined) updates.status = extras.status;

            const {data, error} = await supabase
                .from('prescricao')
                .update(updates)
                .eq('id', id)
                .eq('ativo', true)
                .select()
                .single();

            if (error || !data) return {data: null, error: new Error('Prescrição não encontrada')};

            if (detalhesPrescricao || cid10) {
                const resumoAtualizado = [
                    extras?.medicamento ?? prescricao.medicamento,
                    extras?.via ?? prescricao.via,
                    extras?.posologia ?? prescricao.posologia,
                    extras?.duracao ?? prescricao.duracao,
                ]
                    .filter(Boolean)
                    .join(' — ');

                const prontuarioDescricao = `Prescrição atualizada em ${new Date().toLocaleDateString('pt-BR')}. ${
                    detalhesPrescricao || resumoAtualizado || prescricao.detalhes_prescricao
                }.${cid10 || prescricao.cid10 ? ` CID-10: ${cid10 || prescricao.cid10}` : ''}`;

                // A entrada automática usa o campo `plano` do PEP estruturado.
                const {error: prontuarioError} = await this.prontuarioService.criarProntuario({
                    pacienteId: prescricao.paciente_id,
                    profissionalId,
                    unidadeSaudeId: prescricao.unidade_saude_id ?? undefined,
                    plano: prontuarioDescricao,
                    cid10: prescricao.cid10 ?? undefined,
                });
                if (prontuarioError) {
                    throw new Error(`Erro ao criar entrada no prontuário: ${prontuarioError.message}`);
                }
            }

            return {data: this.mapearPrescricao(data), error: null};
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    async deletePrescricao(id: string, profissionalId: string): Promise<{ data: boolean, error: Error | null }> {
        try {
            const {data: profissional} = await supabase
                .from('funcionario')
                .select('papel')
                .eq('id', profissionalId)
                .eq('ativo', true)
                .single();
            if (!profissional || profissional.papel !== Papeis.MEDICO) {
                throw new Error('Apenas MEDICO pode desativar prescrições');
            }

            const {data: prescricao} = await supabase
                .from('prescricao')
                .select('id')
                .eq('id', id)
                .eq('ativo', true)
                .single();
            if (!prescricao) throw new Error('Prescrição não encontrada');

            const {error} = await supabase
                .from('prescricao')
                .update({ativo: false, data_desativacao: new Date().toISOString()})
                .eq('id', id);

            if (error) throw new Error(`Erro ao desativar prescrição: ${error.message}`);
            return {data: true, error: null};
        } catch (error) {
            return {data: false, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }
}