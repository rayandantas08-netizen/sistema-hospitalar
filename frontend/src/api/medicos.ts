import { apiFetch, isDirectMode } from './client';
import type { ProfessionalRecord } from '../types/auth';
import { listMedicosDirect } from './supabase-direct';

export async function listMedicos(token: string): Promise<ProfessionalRecord[]> {
  if (isDirectMode()) return listMedicosDirect() as Promise<ProfessionalRecord[]>;
  return apiFetch<ProfessionalRecord[]>('/medicos', { method: 'GET' }, token);
}

export async function createMedico(payload: Record<string, unknown>, token: string): Promise<ProfessionalRecord> {
  // No modo direto, criação de médico é via Supabase Auth + funcionario
  if (isDirectMode()) throw new Error('Criar médico no modo GitHub Pages: use o Supabase Dashboard ou ative o backend');
  return apiFetch<ProfessionalRecord>('/medicos', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function updateMedico(id: string, payload: Record<string, unknown>, token: string): Promise<ProfessionalRecord> {
  if (isDirectMode()) throw new Error('Atualizar médico no modo GitHub Pages precisa do backend');
  return apiFetch<ProfessionalRecord>(`/medicos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
}

export async function deleteMedico(id: string, token: string): Promise<void> {
  if (isDirectMode()) throw new Error('Deletar médico no modo GitHub Pages precisa do backend');
  return apiFetch<void>(`/medicos/${id}`, { method: 'DELETE' }, token);
}
