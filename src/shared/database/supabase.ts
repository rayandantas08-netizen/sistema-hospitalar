import dotenv from 'dotenv';
dotenv.config();
import {createClient} from '@supabase/supabase-js';

const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_KEY', 'SUPABASE_SERVICE_KEY'];
const missing = requiredEnvVars.filter((key) => !process.env[key]);

if (missing.length > 0) {
    console.error(`❌ Variáveis de ambiente faltando: ${missing.join(', ')}`);
    console.error('💡 Crie um arquivo .env baseado no .env.example ou configure no GitHub Secrets');
    if (process.env.NODE_ENV === 'production') {
        throw new Error(`Variáveis obrigatórias não definidas: ${missing.join(', ')}`);
    }
}

// Fallback para não quebrar build sem env (apenas para CI)
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'placeholder-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'placeholder-service-key';

export const supabaseClient = createClient(supabaseUrl, supabaseKey);

export const supabaseServiceClient = createClient(supabaseUrl, supabaseServiceKey);