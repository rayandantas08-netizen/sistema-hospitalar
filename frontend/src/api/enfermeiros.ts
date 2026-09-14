import { apiFetch } from './client';
import type { ProfessionalRecord } from '../types/auth';

export async function listEnfermeiros(token: string): Promise<ProfessionalRecord[]> {
  return apiFetch<ProfessionalRecord[]>('/enfermeiros', { method: 'GET' }, token);
}

export async function createEnfermeiro(payload: Record<string, unknown>, token: string): Promise<ProfessionalRecord> {
  return apiFetch<ProfessionalRecord>('/enfermeiros', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function updateEnfermeiro(id: string, payload: Record<string, unknown>, token: string): Promise<ProfessionalRecord> {
  return apiFetch<ProfessionalRecord>(`/enfermeiros/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
}

export async function deleteEnfermeiro(id: string, token: string): Promise<void> {
  return apiFetch<void>(`/enfermeiros/${id}`, { method: 'DELETE' }, token);
}
