import { apiFetch } from './client';
import type { AuthUser, LoginResponse, RegisterAdminPayload } from '../types/auth';

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerAdmin(payload: RegisterAdminPayload) {
  return apiFetch<{ id: string; email: string; papel: string; message: string }>('/auth/register-admin', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/me', {}, token);
}
