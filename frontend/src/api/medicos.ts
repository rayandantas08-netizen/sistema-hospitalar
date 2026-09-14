import { apiFetch } from './client';
import type { ProfessionalRecord } from '../types/auth';

export async function listMedicos(token: string): Promise<ProfessionalRecord[]> {
  return apiFetch<ProfessionalRecord[]>('/medicos', { method: 'GET' }, token);
}

export async function createMedico(payload: Record<string, unknown>, token: string): Promise<ProfessionalRecord> {
  return apiFetch<ProfessionalRecord>('/medicos', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function updateMedico(id: string, payload: Record<string, unknown>, token: string): Promise<ProfessionalRecord> {
  return apiFetch<ProfessionalRecord>(`/medicos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
}

export async function deleteMedico(id: string, token: string): Promise<void> {
  return apiFetch<void>(`/medicos/${id}`, { method: 'DELETE' }, token);
}
