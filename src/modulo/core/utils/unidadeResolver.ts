import {supabaseServiceClient} from '@/shared/database/supabase';

/**
 * Descobre a qual unidade de saúde um atendimento pertence.
 *
 * Por que isso existe: o formulário de prescrição do frontend não exige a
 * unidade (o profissional já está vinculado a uma), mas `prescricao` guarda
 * `unidade_saude_id`. Em vez de gravar NULL ou exigir um campo a mais na tela,
 * o backend resolve a unidade na seguinte ordem de prioridade:
 *
 *   1. `unidadeSaudeId` informado explicitamente no corpo da requisição
 *   2. vínculo do profissional autenticado (`funcionario_unidade`)
 *   3. vínculo do paciente (`paciente_unidade`)
 *
 * Retorna `null` quando não há nenhuma informação — quem chamou decide se isso
 * é um erro (prontuário exige unidade, prescrição não).
 */
export class UnidadeResolver {
    static async resolver(opcoes: {
        unidadeSaudeId?: string | null;
        profissionalId?: string | null;
        pacienteId?: string | null;
    }): Promise<{ data: string | null; error: Error | null }> {
        try {
            if (opcoes.unidadeSaudeId) {
                const {data} = await supabaseServiceClient
                    .from('unidade_saude')
                    .select('id')
                    .eq('id', opcoes.unidadeSaudeId)
                    .single();

                if (!data) {
                    throw new Error('Unidade de saúde não encontrada');
                }
                return {data: opcoes.unidadeSaudeId, error: null};
            }

            if (opcoes.profissionalId) {
                const {data} = await supabaseServiceClient
                    .from('funcionario_unidade')
                    .select('unidade_saude_id')
                    .eq('funcionario_id', opcoes.profissionalId)
                    .limit(1)
                    .maybeSingle();

                if (data?.unidade_saude_id) {
                    return {data: data.unidade_saude_id, error: null};
                }
            }

            if (opcoes.pacienteId) {
                const {data} = await supabaseServiceClient
                    .from('paciente_unidade')
                    .select('unidade_saude_id')
                    .eq('paciente_id', opcoes.pacienteId)
                    .limit(1)
                    .maybeSingle();

                if (data?.unidade_saude_id) {
                    return {data: data.unidade_saude_id, error: null};
                }
            }

            return {data: null, error: null};
        } catch (error) {
            return {
                data: null,
                error: error instanceof Error ? error : new Error('Erro ao resolver unidade de saúde'),
            };
        }
    }
}
