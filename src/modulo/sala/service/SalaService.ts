import {supabaseServiceClient} from '@/shared/database/supabase';
import {Papeis, StatusChamada, StatusSala} from '../../core/model/Enums';
import {ErroDeNegocio} from '../../core/utils/respostaHttp';
import {ParametrosPaginacao, montarRespostaPaginada} from '../../core/utils/paginacao';
import {Sala, SalaResposta} from '../model/Sala';
import {RespostaPaginada} from '../../core/model/Interfaces';

// Cliente com service-role: o backend já autorizou o usuário no middleware
// `requireAuth`, então a escrita/leitura aqui não depende de políticas RLS.
const supabase = supabaseServiceClient;

const SELECT_SALA = `
    id,
    unidade_saude_id,
    nome,
    tipo,
    responsavel_id,
    status,
    ativo,
    created_at,
    updated_at,
    unidade:unidade_saude_id (nome),
    responsavel:responsavel_id (nome, papel)
`;

export interface FiltrosSala {
    unidadeSaudeId?: string;
    status?: StatusSala;
    tipo?: string;
    incluirInativas?: boolean;
}

export interface DadosSala {
    unidadeSaudeId: string;
    nome: string;
    tipo: string;
    responsavelId?: string | null;
    status?: StatusSala;
}

export interface DadosAtualizacaoSala {
    unidadeSaudeId?: string;
    nome?: string;
    tipo?: string;
    responsavelId?: string | null;
    status?: StatusSala;
}

/** Papéis que podem ser responsáveis por uma sala (médicos e enfermeiros). */
const PAPEIS_RESPONSAVEL = [Papeis.MEDICO, Papeis.ENFERMEIRO];

export class SalaService {
    private mapear(registro: any): SalaResposta {
        return {
            id: registro.id,
            unidadeSaudeId: registro.unidade_saude_id,
            unidadeNome: registro.unidade?.nome ?? null,
            nome: registro.nome,
            tipo: registro.tipo,
            responsavelId: registro.responsavel_id ?? null,
            responsavelNome: registro.responsavel?.nome ?? null,
            responsavelPapel: registro.responsavel?.papel ?? null,
            status: registro.status as StatusSala,
            ativo: Boolean(registro.ativo),
            createdAt: registro.created_at ?? null,
            updatedAt: registro.updated_at ?? null,
        };
    }

    /** Valida se o responsável informado é um médico ou enfermeiro ativo. */
    private async validarResponsavel(responsavelId?: string | null): Promise<void> {
        if (responsavelId === undefined || responsavelId === null) return;

        const {data: funcionario} = await supabase
            .from('funcionario')
            .select('id, papel, ativo')
            .eq('id', responsavelId)
            .maybeSingle();

        if (!funcionario) {
            throw ErroDeNegocio.naoEncontrado('Responsável não encontrado');
        }
        if (!funcionario.ativo) {
            throw new ErroDeNegocio('Responsável está inativo');
        }
        if (!PAPEIS_RESPONSAVEL.includes(funcionario.papel as Papeis)) {
            throw new ErroDeNegocio('O responsável pela sala deve ser um médico ou enfermeiro');
        }
    }

    private async validarUnidade(unidadeSaudeId: string): Promise<void> {
        const {data: unidade} = await supabase
            .from('unidade_saude')
            .select('id, ativo')
            .eq('id', unidadeSaudeId)
            .maybeSingle();

        if (!unidade) {
            throw ErroDeNegocio.naoEncontrado('Unidade de saúde não encontrada');
        }
        if (!unidade.ativo) {
            throw new ErroDeNegocio('Unidade de saúde está inativa');
        }
    }

    /** Uma unidade não pode ter duas salas ativas com o mesmo nome. */
    private async validarNomeUnico(
        unidadeSaudeId: string,
        nome: string,
        ignorarSalaId?: string
    ): Promise<void> {
        const {data} = await supabase
            .from('sala')
            .select('id, nome')
            .eq('unidade_saude_id', unidadeSaudeId)
            .eq('ativo', true)
            .ilike('nome', nome);

        const conflito = (data ?? []).find((sala: any) => sala.id !== ignorarSalaId);
        if (conflito) {
            throw ErroDeNegocio.conflito(`Já existe uma sala "${nome}" nesta unidade`);
        }
    }

    async createSala(dados: DadosSala): Promise<{ data: SalaResposta | null; error: Error | null }> {
        try {
            await this.validarUnidade(dados.unidadeSaudeId);
            await this.validarResponsavel(dados.responsavelId);
            await this.validarNomeUnico(dados.unidadeSaudeId, dados.nome);

            const {data, error} = await supabase
                .from('sala')
                .insert({
                    unidade_saude_id: dados.unidadeSaudeId,
                    nome: dados.nome.trim(),
                    tipo: dados.tipo.trim(),
                    responsavel_id: dados.responsavelId ?? null,
                    status: dados.status ?? StatusSala.LIVRE,
                    ativo: true,
                })
                .select(SELECT_SALA)
                .single();

            if (error || !data) {
                throw new Error(`Erro ao criar sala: ${error?.message || 'erro desconhecido'}`);
            }

            return {data: this.mapear(data), error: null};
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    async listSalas(
        filtros: FiltrosSala = {},
        paginacao: ParametrosPaginacao
    ): Promise<{ data: RespostaPaginada<SalaResposta> | null; error: Error | null }> {
        try {
            let consulta = supabase
                .from('sala')
                .select(SELECT_SALA, {count: 'exact'})
                .order('nome', {ascending: true})
                .range(paginacao.de, paginacao.ate);

            if (filtros.unidadeSaudeId) {
                consulta = consulta.eq('unidade_saude_id', filtros.unidadeSaudeId);
            }
            if (filtros.status) {
                consulta = consulta.eq('status', filtros.status);
            }
            if (filtros.tipo) {
                consulta = consulta.ilike('tipo', `%${filtros.tipo}%`);
            }
            if (!filtros.incluirInativas) {
                consulta = consulta.eq('ativo', true);
            }

            const {data, error, count} = await consulta;
            if (error) {
                throw new Error(`Erro ao listar salas: ${error.message}`);
            }

            const salas = (data ?? []).map((registro) => this.mapear(registro));
            return {
                data: montarRespostaPaginada(salas, count ?? salas.length, paginacao.pagina, paginacao.limite),
                error: null,
            };
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    /** Salas de uma unidade específica — usado por GET /api/unidades/:id/salas. */
    async listSalasByUnidade(
        unidadeSaudeId: string,
        incluirInativas = false
    ): Promise<{ data: SalaResposta[]; error: Error | null }> {
        try {
            await this.validarUnidade(unidadeSaudeId);

            let consulta = supabase
                .from('sala')
                .select(SELECT_SALA)
                .eq('unidade_saude_id', unidadeSaudeId)
                .order('nome', {ascending: true});

            if (!incluirInativas) {
                consulta = consulta.eq('ativo', true);
            }

            const {data, error} = await consulta;
            if (error) {
                throw new Error(`Erro ao listar salas da unidade: ${error.message}`);
            }

            return {data: (data ?? []).map((registro) => this.mapear(registro)), error: null};
        } catch (error) {
            return {data: [], error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    async getSala(id: string): Promise<{ data: SalaResposta | null; error: Error | null }> {
        try {
            const {data, error} = await supabase
                .from('sala')
                .select(SELECT_SALA)
                .eq('id', id)
                .maybeSingle();

            if (error) {
                throw new Error(`Erro ao buscar sala: ${error.message}`);
            }
            if (!data) {
                throw ErroDeNegocio.naoEncontrado('Sala não encontrada');
            }

            return {data: this.mapear(data), error: null};
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    async updateSala(
        id: string,
        dados: DadosAtualizacaoSala
    ): Promise<{ data: SalaResposta | null; error: Error | null }> {
        try {
            const {data: salaAtual} = await supabase
                .from('sala')
                .select('id, unidade_saude_id, nome, ativo')
                .eq('id', id)
                .maybeSingle();

            if (!salaAtual) {
                throw ErroDeNegocio.naoEncontrado('Sala não encontrada');
            }

            const unidadeFinal = dados.unidadeSaudeId ?? salaAtual.unidade_saude_id;
            const nomeFinal = dados.nome ?? salaAtual.nome;

            if (dados.unidadeSaudeId) {
                await this.validarUnidade(dados.unidadeSaudeId);
            }
            // `responsavelId: null` limpa o responsável; `undefined` mantém.
            if (dados.responsavelId !== undefined) {
                await this.validarResponsavel(dados.responsavelId);
            }
            if (dados.nome || dados.unidadeSaudeId) {
                await this.validarNomeUnico(unidadeFinal, nomeFinal, id);
            }

            const atualizacoes: Record<string, any> = {};
            if (dados.unidadeSaudeId) atualizacoes.unidade_saude_id = dados.unidadeSaudeId;
            if (dados.nome) atualizacoes.nome = dados.nome.trim();
            if (dados.tipo) atualizacoes.tipo = dados.tipo.trim();
            if (dados.responsavelId !== undefined) atualizacoes.responsavel_id = dados.responsavelId;
            if (dados.status) atualizacoes.status = dados.status;

            if (Object.keys(atualizacoes).length === 0) {
                return await this.getSala(id);
            }

            const {data, error} = await supabase
                .from('sala')
                .update(atualizacoes)
                .eq('id', id)
                .select(SELECT_SALA)
                .single();

            if (error || !data) {
                throw new Error(`Erro ao atualizar sala: ${error?.message || 'erro desconhecido'}`);
            }

            return {data: this.mapear(data), error: null};
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    /**
     * Soft delete. Regra: sala com atendimento em andamento não pode ser
     * removida — finalize/cancele as chamadas abertas antes.
     */
    async deleteSala(id: string): Promise<{ data: boolean; error: Error | null }> {
        try {
            const {data: sala} = await supabase
                .from('sala')
                .select('id')
                .eq('id', id)
                .eq('ativo', true)
                .maybeSingle();

            if (!sala) {
                throw ErroDeNegocio.naoEncontrado('Sala não encontrada');
            }

            const {data: chamadasAbertas} = await supabase
                .from('chamada')
                .select('id')
                .eq('sala_id', id)
                .eq('ativo', true)
                .in('status', [StatusChamada.CHAMANDO, StatusChamada.EM_ATENDIMENTO])
                .limit(1);

            if (chamadasAbertas && chamadasAbertas.length > 0) {
                throw ErroDeNegocio.conflito(
                    'Sala possui chamadas em andamento. Finalize os atendimentos antes de desativá-la.'
                );
            }

            const {error} = await supabase
                .from('sala')
                .update({
                    ativo: false,
                    status: StatusSala.INATIVA,
                    data_desativacao: new Date().toISOString(),
                })
                .eq('id', id);

            if (error) {
                throw new Error(`Erro ao desativar sala: ${error.message}`);
            }

            return {data: true, error: null};
        } catch (error) {
            return {data: false, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    /** Sala ativa pelo id ou pelo nome — usado ao registrar uma chamada. */
    async resolverSala(opcoes: {
        salaId?: string;
        nomeSala?: string;
        unidadeSaudeId?: string;
    }): Promise<{ data: Sala | null; error: Error | null }> {
        try {
            let consulta = supabase
                .from('sala')
                .select('id, unidade_saude_id, nome, tipo, responsavel_id, status, ativo')
                .eq('ativo', true);

            if (opcoes.salaId) {
                consulta = consulta.eq('id', opcoes.salaId);
            } else if (opcoes.nomeSala) {
                consulta = consulta.ilike('nome', opcoes.nomeSala);
            } else {
                throw new ErroDeNegocio('Informe salaId ou o nome da sala');
            }

            if (opcoes.unidadeSaudeId) {
                consulta = consulta.eq('unidade_saude_id', opcoes.unidadeSaudeId);
            }

            const {data, error} = await consulta.limit(1).maybeSingle();
            if (error) {
                throw new Error(`Erro ao buscar sala: ${error.message}`);
            }
            if (!data) {
                throw ErroDeNegocio.naoEncontrado(
                    opcoes.salaId
                        ? 'Sala não encontrada (ou inativa)'
                        : `Sala "${opcoes.nomeSala}" não encontrada (ou inativa)`
                );
            }

            const sala = new Sala(
                data.id,
                data.unidade_saude_id,
                data.nome,
                data.tipo,
                data.status as StatusSala,
                data.responsavel_id,
                Boolean(data.ativo)
            );
            return {data: sala, error: null};
        } catch (error) {
            return {data: null, error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }

    /** Atualiza o status da sala (usado quando uma chamada é aberta/encerrada). */
    async atualizarStatus(id: string, status: StatusSala): Promise<{ error: Error | null }> {
        try {
            const {error} = await supabase.from('sala').update({status}).eq('id', id);
            if (error) throw new Error(`Erro ao atualizar status da sala: ${error.message}`);
            return {error: null};
        } catch (error) {
            return {error: error instanceof Error ? error : new Error('Erro desconhecido')};
        }
    }
}
