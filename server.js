/**
 * Ponto de entrada do servidor em produção.
 *
 * Por que este arquivo existe?
 * 1. O código é TypeScript e é compilado para ./dist (o arquivo principal é
 *    dist/app.js). Não existe index.js na raiz do projeto — era exatamente isso
 *    que o Render tentava executar e falhava com
 *    "Cannot find module '/opt/render/project/src/index.js'".
 * 2. O projeto usa aliases de import ("@/shared/...", "@/modulo/..."). Depois do
 *    build esses aliases permanecem no JavaScript gerado, então é preciso
 *    registrar o tsconfig-paths ANTES de carregar dist/app.js — usando o
 *    tsconfig.dist.json, que aponta "@/..." para ./dist (e não para ./src).
 * 3. O script antigo era `set TS_NODE_BASEURL=./dist&& node ...`, que só
 *    funciona no prompt do Windows. No Linux do Render o `set ...&& node` era
 *    interpretado como nome de arquivo e quebrava. Este arquivo é
 *    multiplataforma e não depende de variável de ambiente.
 */
process.env.TS_NODE_PROJECT = process.env.TS_NODE_PROJECT || './tsconfig.dist.json';
require('tsconfig-paths/register');
require('./dist/app.js');
