/**
 * Variáveis de ambiente mínimas para os testes.
 *
 * `src/shared/database/supabase.ts` lança erro na importação quando
 * SUPABASE_URL/SUPABASE_KEY/SUPABASE_SERVICE_KEY não existem. Os valores abaixo
 * são fictícios: nenhum teste faz requisição real para o Supabase (os fluxos
 * testados são validação de DTO, cálculo de escores e guardas de autenticação,
 * que respondem antes de tocar no banco).
 */
// 127.0.0.1:9 (porta discard) recusa a conexão na hora. Se apontássemos para um
// host inexistente, as tentativas de validação de JWT ficariam penduradas
// esperando DNS e o Jest avisaria de handles abertos.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:9';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'chave-anon-de-teste';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'chave-service-de-teste';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'segredo-de-teste';
process.env.NODE_ENV = 'test';
// Porta alta fixa nos testes para não disputar a 3000 com um servidor local.
// (PORT=0 não serve: o app usa `Number(PORT) || 3000`, e 0 é falsy.)
process.env.PORT = process.env.PORT_TESTE || '3199';

// Garante que o token de painel de TV não interfira nos testes de 401.
delete process.env.PAINEL_TV_TOKEN;
