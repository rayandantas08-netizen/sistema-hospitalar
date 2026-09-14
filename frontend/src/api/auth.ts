import { apiFetch, isDirectMode } from './client';
import type { AuthUser, LoginResponse, RegisterAdminPayload } from '../types/auth';
import { loginDirect, getCurrentUserDirect, registerAdminDirect } from './supabase-direct';

export async function login(email: string, password: string): Promise<LoginResponse> {
  if (isDirectMode()) {
    console.log('🔌 Login via Supabase direto (GitHub Pages mode)');
    const result: any = await loginDirect(email, password);
    // Normaliza para LoginResponse
    return {
      access_token: result.access_token || result.token,
      refresh_token: result.refresh_token,
      papel: result.papel || result.user?.papel,
      user_id: result.user_id || result.user?.id,
      ...result
    } as LoginResponse;
  }
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerAdmin(payload: RegisterAdminPayload) {
  if (isDirectMode()) {
    console.log('🔌 Register admin via Supabase direto');
    return registerAdminDirect(payload);
  }
  return apiFetch<{ id: string; email: string; papel: string; message: string }>('/auth/register-admin', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  if (isDirectMode()) {
    return getCurrentUserDirect(token) as Promise<AuthUser>;
  }
  return apiFetch<AuthUser>('/auth/me', {}, token);
}
