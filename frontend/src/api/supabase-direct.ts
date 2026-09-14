/**
 * API Direta - Frontend fala direto com Supabase
 * Para rodar SÓ no GitHub Pages, sem backend Node
 * 
 * Isso permite: GitHub Pages (frontend estático) + Supabase (banco)
 * Sem precisar de Render, Vercel, etc.
 */

import { supabase } from '../lib/supabase';

if (!supabase) {
  console.warn('Supabase client não configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_KEY');
}

function ensureSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado! Configure VITE_SUPABASE_URL e VITE_SUPABASE_KEY em .env ou GitHub Secrets. ' +
      'Pegue em: https://supabase.com/dashboard/project/ohllteerhgvcewwvktua/settings/api'
    );
  }
  return supabase;
}

// ============ AUTH ============
export async function loginDirect(email: string, password: string) {
  const client = ensureSupabase();
  
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw new Error(error.message);
  if (!data.session) throw new Error('Sessão não criada');

  // Busca dados do funcionário
  const { data: funcionario, error: funcError } = await client
    .from('funcionario')
    .select('*')
    .eq('id', data.user.id)
    .eq('ativo', true)
    .single();

  if (funcError || !funcionario) {
    throw new Error('Usuário não encontrado na tabela funcionario ou inativo');
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    token: data.session.access_token, // compatibilidade
    papel: funcionario.papel,
    user_id: funcionario.id,
    user: {
      id: funcionario.id,
      email: funcionario.email,
      nome: funcionario.nome,
      papel: funcionario.papel,
    }
  };
}

export async function getCurrentUserDirect(token: string) {
  const client = ensureSupabase();
  
  // Valida token e pega user
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) throw new Error('Token inválido');

  const { data: funcionario, error: funcError } = await client
    .from('funcionario')
    .select('*')
    .eq('id', user.id)
    .eq('ativo', true)
    .single();

  if (funcError || !funcionario) throw new Error('Usuário não encontrado');

  return {
    id: funcionario.id,
    email: funcionario.email,
    nome: funcionario.nome,
    papel: funcionario.papel,
  };
}

export async function registerAdminDirect(payload: any) {
  const client = ensureSupabase();
  
  // Verifica ADMIN_SECRET (simulado - no modo direto, confia no Supabase)
  // Em produção direta, você deve criar o primeiro admin via Supabase Dashboard
  
  const { data, error } = await client.auth.signUp({
    email: payload.email,
    password: payload.password,
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Erro ao criar usuário');

  // Cria registro na tabela funcionario
  const { error: funcError } = await client.from('funcionario').insert({
    id: data.user.id,
    nome: payload.nome,
    email: payload.email,
    cpf: payload.cpf,
    cns: payload.cns,
    data_nascimento: payload.data_nascimento,
    sexo: payload.sexo,
    raca_cor: payload.raca_cor,
    escolaridade: payload.escolaridade,
    endereco_logradouro: payload.endereco_logradouro,
    endereco_numero: payload.endereco_numero,
    endereco_complemento: payload.endereco_complemento,
    endereco_bairro: payload.endereco_bairro,
    endereco_cidade: payload.endereco_cidade,
    endereco_estado: payload.endereco_estado,
    endereco_cep: payload.endereco_cep,
    telefone: payload.telefone,
    papel: 'ADMINISTRADOR_PRINCIPAL',
    ativo: true,
  });

  if (funcError) throw new Error(`Erro ao criar funcionário: ${funcError.message}`);

  return {
    id: data.user.id,
    email: payload.email,
    papel: 'ADMINISTRADOR_PRINCIPAL',
    message: 'Admin criado com sucesso'
  };
}

// ============ PACIENTES ============
export async function listPacientesDirect() {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('paciente')
    .select('*')
    .eq('ativo', true)
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getPacienteDirect(id: string) {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('paciente')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

export async function createPacienteDirect(payload: any) {
  const client = ensureSupabase();
  const { data: { user } } = await client.auth.getUser();
  
  const { data, error } = await client
    .from('paciente')
    .insert({
      ...payload,
      criado_por: user?.id,
    })
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePacienteDirect(id: string, payload: any) {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('paciente')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

export async function deletePacienteDirect(id: string) {
  const client = ensureSupabase();
  const { error } = await client
    .from('paciente')
    .update({ ativo: false })
    .eq('id', id);
  
  if (error) throw new Error(error.message);
}

// ============ MÉDICOS / ENFERMEIROS (funcionarios) ============
export async function listMedicosDirect() {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('funcionario')
    .select('*')
    .eq('papel', 'MEDICO')
    .eq('ativo', true);
  
  if (error) throw new Error(error.message);
  return data || [];
}

export async function listEnfermeirosDirect() {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('funcionario')
    .select('*')
    .eq('papel', 'ENFERMEIRO')
    .eq('ativo', true);
  
  if (error) throw new Error(error.message);
  return data || [];
}

// Adicione outras funções conforme necessário (consultas, triagens, etc)
export async function listConsultasDirect() {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('consulta')
    .select(`
      *,
      paciente:paciente_id (nome),
      medico:medico_id (nome)
    `)
    .eq('ativo', true)
    .order('data_consulta', { ascending: false });
  
  if (error) throw new Error(error.message);
  return data || [];
}
