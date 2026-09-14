import dotenv from 'dotenv';
dotenv.config();
import {createClient} from '@supabase/supabase-js';

const variaveisObrigatorias = ['SUPABASE_URL', 'SUPABASE_KEY', 'SUPABASE_SERVICE_KEY'] as const;
const ausentes = variaveisObrigatorias.filter((variavel) => !process.env[variavel]);

if (ausentes.length > 0) {
    throw new Error(
        `Variáveis de ambiente obrigatórias não definidas: ${ausentes.join(', ')}. ` +
        'Defina-as no .env (local) ou em Render > Environment (produção). Veja o .env.example.'
    );
}

export const supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export const supabaseServiceClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);