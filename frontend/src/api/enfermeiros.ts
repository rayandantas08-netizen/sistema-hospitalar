import { apiFetch, isDirectMode } from './client';
import type { ProfessionalRecord } from '../types/auth';
import { listEnfermeirosDirect } from './supabase-direct';

export async function listEnfermeiros(token: string): Promise<ProfessionalRecord[]> {
  if (isDirectMode()) return listEnfermeirosDirect() as Promise<ProfessionalRecord[]>;
  return apiFetch<ProfessionalRecord[]>('/enfermeiros', { method: 'GET' }, token);
}

export async function createEnfermeiro(payload: Record<string, unknown>, token: string): Promise<ProfessionalRecord> {
  if (isDirectMode()) throw new Error('Criar enfermeiro no modo GitHub Pages: use Supabase Dashboard ou backend');
  return apiFetch<ProfessionalRecord>('/enfermeiros', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function updateEnfermeiro(id: string, payload: Record<string, unknown>, token: string): Promise<ProfessionalRecord> {
  if (isDirectMode()) throw new Error('Atualizar enfermeiro no modo GitHub Pages precisa do backend');
  return apiFetch<ProfessionalRecord>(`/enfermeiros/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
}

export async function deleteEnfermeiro(id: string, token: string): Promise<void> {
  if (isDirectMode()) throw new Error('Deletar enfermeiro no modo GitHub Pages precisa do backend');
  return apiFetch<void>(`/enfermeiros/${id}`, { method: 'DELETE' }, token);
}
