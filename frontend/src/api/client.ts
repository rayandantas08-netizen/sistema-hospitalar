// Em produção fullstack (backend servindo frontend), VITE_API_URL = /api
// Em produção separada (Pages + Render), VITE_API_URL = https://seu-backend.onrender.com/api
// Local: http://localhost:3000/api
// GitHub Pages ONLY (sem backend): deixe VITE_API_URL vazio e use VITE_SUPABASE_URL + VITE_SUPABASE_KEY
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const isDirectMode = () => {
  if (import.meta.env.VITE_USE_SUPABASE_DIRECT === 'true') return true;
  const hasSupabase = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_KEY;
  if (!import.meta.env.VITE_API_URL && hasSupabase) return true;
  // No GitHub Pages, se API_URL=/api, não existe backend, usa Supabase direto
  if (hasSupabase && import.meta.env.VITE_API_URL === '/api') {
    if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
      return true;
    }
  }
  return false;
};

// Log apenas em dev para debug
if (import.meta.env.DEV) {
  console.log('🔌 API_BASE_URL:', API_BASE_URL);
  console.log('🔌 Direct mode (Supabase sem backend):', isDirectMode() ? '✅ ATIVO' : '❌ inativo');
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(`Não foi possível conectar à API em ${API_BASE_URL}. Verifique se o backend está rodando na porta 3000.`);
  }

  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`A API retornou uma resposta inválida (${response.status}).`);
  }

  if (!response.ok) {
    const details = payload?.details || payload?.errors;
    const message = details ? `${payload?.error || payload?.message || 'Erro na requisição'}: ${details}` : payload?.error || payload?.message || 'Erro na requisição';
    throw new Error(message);
  }

  return payload as T;
}

export { API_BASE_URL };
