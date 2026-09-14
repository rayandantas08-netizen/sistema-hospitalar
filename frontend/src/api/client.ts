// Em produção fullstack (backend servindo frontend), VITE_API_URL = /api
// Em produção separada (Pages + Render), VITE_API_URL = https://seu-backend.onrender.com/api
// Local: http://localhost:3000/api
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Log apenas em dev para debug
if (import.meta.env.DEV) {
  console.log('🔌 API_BASE_URL:', API_BASE_URL);
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
