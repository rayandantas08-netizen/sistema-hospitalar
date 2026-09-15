import {supabaseServiceClient} from '@/shared/database/supabase';
import {SetorLeito, StatusLeito} from '../../core/model/Enums';
import {RespostaPaginada} from '../../core/model/Interfaces';
import {ParametrosPaginacao, montarRespostaPaginada} from '../../core/utils/paginacao';
import {ErroDeNegocio} from '../../core/utils/respostaHttp';
import {painelRealtime} from '../../chamada/service/PainelRealtime';
import {LeitoResposta, ResumoOcupacaoLeitos} from '../model/Leito';

const supabase = supabaseServiceClient;

const SELECT_LEITO = `
    id,
    unidade_saude_id,
    nome_ou_numero,
    setor,
    status,
    paciente_id,
    ventilador_mecanico,
    monitor_cardiaco,
    diagnostico,
    ativo,
    created_at,
    updated_at,
    paciente:paciente!paciente_id (nome),
    unidade:unidade_saude!unidade_saude_id (nome)
`;

export interface DadosLeito {
    unidadeSaudeId: string;
    nomeOuNumero: string;
    setor?: SetorLeito;
    status?: StatusLeito;
    pacienteId?: string | null;
    ventiladorMecanico?: boolean;
    monitorCardiaco?: boolean;
    diagnostico?: string | null;
}

export interface DadosAtualizacaoLeito extends Partial<Omit<DadosLeito, 'unidadeSaudeId'>> {
    unidadeSaudeId?: string;
}

export interface DadosStatusLeito {
    status: StatusLeito;
    pacienteId?: string | null;
    diagnostico?: string | null;
}

export interface FiltrosLeito {
    setor?: SetorLeito;
    status?: StatusLeito;
    unidadeSaudeId?: string;
    incluirInativos?: boolean;
}

/**
 * Status que significam "leito sem paciente": ao entrar neles o backend limpa
 * `paciente_id` e `diagnostico` (alta hospitalar / saída para higienização).
 */
const STATUS_SEM_PACIENTE: StatusLeito[] = [StatusLeito.LIVRE, StatusLeito.HIGIENIZACAO];

export class LeitoService {
    private mapear(registro: any): LeitoResposta {
        return {
            id: registro.id,
            unidadeSaudeId: registro.unidade_saude_id,
            unidadeNome: registro.unidade?.nome ?? null,
            nomeOuNumero: registro.nome_ou_numero,
            setor: registro.setor as SetorLeito,
            status: registro.status as StatusLeito,
            pacienteId: registro.paciente_id ?? null,
            pacienteNome: registro.paciente?.nome ?? null,
            ventiladorMecanico: Boolean(registro.ventilador_mecanico),
            monitorCardiaco: Boolean(registro.monitor_cardiaco),
            diagnostico: registro.diagnostico ?? null,
            ativo: Boolean(registro.ativo),
            createdAt: registro.created_at ?? null,
            updatedAt: registro.updated_at ?? null,
        };
    }

    private async validarUnidade(unidadeSaudeId: string): Promise<void> {
        const {data} = await supabase
            .from('unidade_saude')
            .select('id, ativo')
            .eq('id', unidadeSaudeId)
            .maybeSingle();

        if (!data) throw ErroDeNegocio.naoEncontrado('Unidade de saúde não encontrada');
        if (!data.ativo) throw new ErroDeNegocio('Unidade de saúde está inativa');
    }

    private async validarPaciente(pacienteId?: string | null): Promise<void> {
        if (!pacienteId) return;

        const {data} = await supabase
            .from('paciente')
            .select('id, ativo')
            .eq('id', pacienteId)
            .maybeSingle();

        if (!data) throw ErroDeNegocio.naoEncontrado('Paciente não encontrado');
        if (!data.ativo) throw new ErroDeNegocio('Paciente está inativo');
    }

    /** Um paciente não pode ocupar dois leitos ao mesmo tempo. */
    private async validarPacienteSemLeito(pacienteId?: string | null, ignorarLeitoId?: string): Promise<void> {
        if (!pacienteId) return;

        const {data} = await supabase
            .from('leito')
            .select('id, nome_ou_numero')
            .eq('paciente_id', pacienteId)
            .eq('ativo', true)
            .eq('status', StatusLeito.OCUPADO);

        const conflito = (data ?? []).find((leito: any) => leito.id !== ignorarLeitoId);
        if (conflito) {
            throw ErroDeNegocio.conflito(
                `Paciente já está internado no ${conflito.nome_ou_numero}. Libere o leito anterior antes de internar novamente.`
            );
        }
    }

    private validarCoerenciaStatus(status: StatusLeito, pacienteId?: string | null): void {
        if (status === StatusLeito.OCUPADO && !pacienteId) {
            throw new ErroDeNegocio('Leito OCUPADO exige um paciente vinculado');
        }
    }

    async createLeito(dados: DadosLeito): Promise<{ data: LeitoResposta | null; error: Error | null }> {
        try {
            await this.validarUnidade(dados.unidadeSaudeId);
            await this.validarPaciente(dados.pacienteId);
            await this.validarPacienteSemLeito(dados.pacienteId);

            const status = dados.status ?? (dados.pacienteId ? StatusLeito.OCUPADO : StatusLeito.LIVRE);
            this.validarCoerenciaStatus(status, dados.pacienteId);

            const {data, error} = await supabase
                .from('leito')
                .insert({
                    unidade_saude_id: dados.unidadeSaudeId,
                    nome_ou_numero: dados.nomeOuNumero.trim(),
                    setor: dados.setor ?? SetorLeito.SALA_VERMELHA,
                    status,
                    paciente_id: STATUS_SEM_PACIENTE.includes(status) ? null : dados.pacienteId ?? null,
                    ventilador_mecanico: dados.ventiladorMecanico ?? false,
                    monitor_cardiaco: dados.monitorCardiaco ?? true,
                    diagnostico: STATUS_SEM_PACIENTE.includes(status) ? null : dados.diagnostico ?? null,
                    ativo: true,
                })
                .select(SELECT_LEITO)
                .single();

            if (error || !data) {
                // 23505 = unique_violation (nome repetido na unidade)
                if ((error as any)?.code === '23505') {
                    throw ErroDeNegocio.conflito(`Já existe um leito "${dados.nomeOuNumero}" nesta unidade`);
                }
                throw new Error(`Erro ao criar leito: ${error?.message || 'erro desconhecido'}`);
            }

            const leito = this.mapear(data);
            painelRealtime.publicar('leito:atualizado', leito);
            return {data: leito, error: null};
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    async listLeitos(
        filtros: FiltrosLeito = {},
        paginacao?: ParametrosPaginacao
    ): Promise<{ data: LeitoResposta[] | RespostaPaginada<LeitoResposta> | null; error: Error | null }> {
        try {
            let consulta = supabase
                .from('leito')
                .select(SELECT_LEITO, {count: 'exact'})
                // Sala Vermelha primeiro, depois por nome do leito.
                .order('setor', {ascending: true})
                .order('nome_ou_numero', {ascending: true});

            if (filtros.unidadeSaudeId) {
                consulta = consulta.eq('unidade_saude_id', filtros.unidadeSaudeId);
            }
            if (filtros.setor) {
                consulta = consulta.eq('setor', filtros.setor);
            }
            if (filtros.status) {
                consulta = consulta.eq('status', filtros.status);
            }
            if (!filtros.incluirInativos) {
                consulta = consulta.eq('ativo', true);
            }

            if (paginacao) {
                consulta = consulta.range(paginacao.de, paginacao.ate);
            }

            const {data, error, count} = await consulta;
            if (error) {
                throw new Error(`Erro ao listar leitos: ${error.message}`);
            }

            const leitos = (data ?? []).map((registro) => this.mapear(registro));

            if (!paginacao) {
                return {data: leitos, error: null};
            }
            return {
                data: montarRespostaPaginada(leitos, count ?? leitos.length, paginacao.pagina, paginacao.limite),
                error: null,
            };
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    async getLeito(id: string): Promise<{ data: LeitoResposta | null; error: Error | null }> {
        try {
            const {data, error} = await supabase
                .from('leito')
                .select(SELECT_LEITO)
                .eq('id', id)
                .maybeSingle();

            if (error) throw new Error(`Erro ao buscar leito: ${error.message}`);
            if (!data) throw ErroDeNegocio.naoEncontrado('Leito não encontrado');

            return {data: this.mapear(data), error: null};
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    async updateLeito(
        id: string,
        dados: DadosAtualizacaoLeito
    ): Promise<{ data: LeitoResposta | null; error: Error | null }> {
        try {
            const {data: leitoAtual} = await supabase
                .from('leito')
                .select('id, unidade_saude_id, status, paciente_id, diagnostico')
                .eq('id', id)
                .maybeSingle();

            if (!leitoAtual) throw ErroDeNegocio.naoEncontrado('Leito não encontrado');

            if (dados.unidadeSaudeId) await this.validarUnidade(dados.unidadeSaudeId);
            if (dados.pacienteId !== undefined) {
                await this.validarPaciente(dados.pacienteId);
                await this.validarPacienteSemLeito(dados.pacienteId, id);
            }

            const statusFinal = (dados.status ?? leitoAtual.status) as StatusLeito;
            const pacienteFinal =
                dados.pacienteId !== undefined ? dados.pacienteId : leitoAtual.paciente_id;
            this.validarCoerenciaStatus(statusFinal, pacienteFinal);

            const atualizacoes: Record<string, any> = {};
            if (dados.unidadeSaudeId) atualizacoes.unidade_saude_id = dados.unidadeSaudeId;
            if (dados.nomeOuNumero) atualizacoes.nome_ou_numero = dados.nomeOuNumero.trim();
            if (dados.setor) atualizacoes.setor = dados.setor;
            if (dados.status) atualizacoes.status = dados.status;
            if (dados.ventiladorMecanico !== undefined) atualizacoes.ventilador_mecanico = dados.ventiladorMecanico;
            if (dados.monitorCardiaco !== undefined) atualizacoes.monitor_cardiaco = dados.monitorCardiaco;
            if (dados.diagnostico !== undefined) atualizacoes.diagnostico = dados.diagnostico;

            // Invariante: leito LIVRE/HIGIENIZACAO nunca mantém paciente ou
            // diagnóstico (alta, transferência ou saída para higienização).
            if (STATUS_SEM_PACIENTE.includes(statusFinal)) {
                atualizacoes.paciente_id = null;
                atualizacoes.diagnostico = null;
            } else if (dados.pacienteId !== undefined) {
                atualizacoes.paciente_id = dados.pacienteId;
            }

            if (Object.keys(atualizacoes).length === 0) {
                return await this.getLeito(id);
            }

            const {data, error} = await supabase
                .from('leito')
                .update(atualizacoes)
                .eq('id', id)
                .select(SELECT_LEITO)
                .single();

            if (error || !data) {
                if ((error as any)?.code === '23505') {
                    throw ErroDeNegocio.conflito('Já existe um leito com esse nome nesta unidade');
                }
                throw new Error(`Erro ao atualizar leito: ${error?.message || 'erro desconhecido'}`);
            }

            const leito = this.mapear(data);
            painelRealtime.publicar('leito:atualizado', leito);
            return {data: leito, error: null};
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    /**
     * PATCH /api/leitos/:id/status
     * Regras:
     *   - OCUPADO exige paciente (no corpo ou já vinculado ao leito)
     *   - LIVRE / HIGIENIZACAO limpam paciente e diagnóstico (alta/saída)
     *   - MANUTENCAO e ISOLAMENTO mantêm o vínculo atual
     */
    async atualizarStatus(
        id: string,
        dados: DadosStatusLeito
    ): Promise<{ data: LeitoResposta | null; error: Error | null }> {
        try {
            const {data: leitoAtual} = await supabase
                .from('leito')
                .select('id, status, paciente_id, diagnostico')
                .eq('id', id)
                .eq('ativo', true)
                .maybeSingle();

            if (!leitoAtual) throw ErroDeNegocio.naoEncontrado('Leito não encontrado');

            const pacienteFinal =
                dados.pacienteId !== undefined ? dados.pacienteId : leitoAtual.paciente_id;

            this.validarCoerenciaStatus(dados.status, pacienteFinal);

            if (dados.pacienteId) {
                await this.validarPaciente(dados.pacienteId);
                await this.validarPacienteSemLeito(dados.pacienteId, id);
            }

            const atualizacoes: Record<string, any> = {status: dados.status};

            if (STATUS_SEM_PACIENTE.includes(dados.status)) {
                atualizacoes.paciente_id = null;
                atualizacoes.diagnostico = null;
            } else {
                if (dados.pacienteId !== undefined) atualizacoes.paciente_id = dados.pacienteId;
                if (dados.diagnostico !== undefined) atualizacoes.diagnostico = dados.diagnostico;
            }

            const {data, error} = await supabase
                .from('leito')
                .update(atualizacoes)
                .eq('id', id)
                .select(SELECT_LEITO)
                .single();

            if (error || !data) {
                throw new Error(`Erro ao atualizar status do leito: ${error?.message || 'erro desconhecido'}`);
            }

            const leito = this.mapear(data);
            painelRealtime.publicar('leito:atualizado', leito);
            return {data: leito, error: null};
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    /** Ocupação por status — alimenta o mapa de leitos da Sala Vermelha. */
    async resumoOcupacao(
        unidadeSaudeId?: string,
        setor?: SetorLeito
    ): Promise<{ data: ResumoOcupacaoLeitos | null; error: Error | null }> {
        try {
            let consulta = supabase
                .from('leito')
                .select('status, ventilador_mecanico, paciente_id')
                .eq('ativo', true);

            if (unidadeSaudeId) consulta = consulta.eq('unidade_saude_id', unidadeSaudeId);
            if (setor) consulta = consulta.eq('setor', setor);

            const {data, error} = await consulta;
            if (error) throw new Error(`Erro ao calcular ocupação: ${error.message}`);

            const leitos = data ?? [];
            const porStatus: Record<string, number> = {};
            for (const status of Object.values(StatusLeito)) {
                porStatus[status] = 0;
            }
            for (const leito of leitos) {
                porStatus[leito.status] = (porStatus[leito.status] ?? 0) + 1;
            }

            const total = leitos.length;
            const ocupados = porStatus[StatusLeito.OCUPADO] ?? 0;

            return {
                data: {
                    setor: setor ?? null,
                    total,
                    porStatus,
                    taxaOcupacao: total > 0 ? Number(((ocupados / total) * 100).toFixed(1)) : 0,
                    ventiladoresDisponiveis: leitos.filter(
                        (leito: any) => leito.ventilador_mecanico && !leito.paciente_id
                    ).length,
                },
                error: null,
            };
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }
}
