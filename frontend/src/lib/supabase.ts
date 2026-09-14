import { createClient } from '@supabase/supabase-js';

// Para GitHub Pages: frontend fala DIRETO com Supabase, sem backend Node
// Configure em GitHub Secrets: VITE_SUPABASE_URL e VITE_SUPABASE_KEY

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY as string | undefined;

// Só cria cliente se tiver as vars (modo GitHub Pages)
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Verifica se está em modo direto (sem backend)
export const isDirectMode = () => {
  // Se VITE_USE_SUPABASE_DIRECT=true, força modo direto
  if (import.meta.env.VITE_USE_SUPABASE_DIRECT === 'true') return true;
  // Se não tem VITE_API_URL mas tem Supabase, usa direto
  if (!import.meta.env.VITE_API_URL && supabaseUrl && supabaseKey) return true;
  // Se VITE_API_URL=/api mas estamos no GitHub Pages (sem backend), usa direto
  if (supabaseUrl && supabaseKey && import.meta.env.VITE_API_URL === '/api') {
    // No GitHub Pages, /api não existe, então usa direto
    const isGitHubPages = window.location.hostname.includes('github.io');
    if (isGitHubPages) return true;
  }
  return false;
};

if (import.meta.env.DEV) {
  console.log('🔌 Supabase direct mode:', isDirectMode() ? '✅ ATIVO (sem backend)' : '❌ inativo (usando backend API)');
  console.log('🔌 Supabase URL:', supabaseUrl ? 'configurado' : 'não configurado');
}
