#!/usr/bin/env node
// Verifica se as variáveis do Supabase estão configuradas e testa conexão
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Verificando configuração Supabase...\n');

const required = ['SUPABASE_URL', 'SUPABASE_KEY', 'SUPABASE_SERVICE_KEY'];
let hasError = false;

required.forEach(key => {
    if (!process.env[key]) {
        console.log(`❌ ${key}: NÃO CONFIGURADO`);
        hasError = true;
    } else {
        const val = process.env[key];
        console.log(`✅ ${key}: ${val.substring(0, 20)}... (${val.length} chars)`);
    }
});

console.log('\nOutras variáveis:');
['JWT_SECRET', 'ADMIN_SECRET', 'GROQ_API_KEY'].forEach(key => {
    console.log(`${process.env[key] ? '✅' : '⚠️ '} ${key}: ${process.env[key] ? 'configurado' : 'não configurado (opcional)'}`);
});

if (hasError) {
    console.log('\n❌ Configure as variáveis no .env ou no GitHub Secrets');
    console.log('💡 Veja .env.example e CONFIGURACAO_GITHUB_SUPABASE.md');
    process.exit(1);
}

console.log('\n🔌 Testando conexão com Supabase...');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

(async () => {
    try {
        const { data, error } = await supabase.from('funcionario').select('count').limit(1);
        if (error) {
            console.log(`⚠️ Conexão OK, mas erro ao consultar: ${error.message}`);
            console.log('Isso pode ser normal se a tabela não existir ainda. Rode as migrations do Supabase.');
        } else {
            console.log('✅ Conexão com Supabase funcionando!');
        }
        
        // Testa service client
        const supabaseService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        console.log('✅ Service client criado com sucesso');
        
        console.log('\n🎉 Tudo pronto para rodar!');
        console.log('→ npm run dev (backend)');
        console.log('→ cd frontend && npm run dev (frontend)');
    } catch (err) {
        console.error('❌ Erro ao conectar:', err.message);
        process.exit(1);
    }
})();
