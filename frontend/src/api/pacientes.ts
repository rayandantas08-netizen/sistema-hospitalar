import { apiFetch } from './client';
import type { PatientRecord } from '../types/auth';

export async function listPacientes(token: string): Promise<PatientRecord[]> {
  return apiFetch<PatientRecord[]>('/pacientes', { method: 'GET' }, token);
}

export async function getPaciente(id: string, token: string): Promise<PatientRecord> {
  return apiFetch<PatientRecord>(`/pacientes/${id}`, { method: 'GET' }, token);
}

export async function createPaciente(payload: Record<string, unknown>, token: string): Promise<PatientRecord> {
  return apiFetch<PatientRecord>('/pacientes', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

export async function updatePaciente(id: string, payload: Record<string, unknown>, token: string): Promise<PatientRecord> {
  return apiFetch<PatientRecord>(`/pacientes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
}

export async function deletePaciente(id: string, token: string): Promise<void> {
  return apiFetch<void>(`/pacientes/${id}`, { method: 'DELETE' }, token);
}

export async function getPacienteHistorico(id: string, token: string): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>(`/pacientes/${id}/historico`, { method: 'GET' }, token);
}
