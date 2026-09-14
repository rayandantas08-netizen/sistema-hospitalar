# Deploy no Render — guia e troubleshooting

## 1. O erro `Cannot find module '/opt/render/project/src/index.js'`

**Causa:** o serviço foi criado como "Node" e o Render não encontrou um comando de
start utilizável, então caiu no padrão `node index.js` (ou usou o campo `main` do
`package.json`, que apontava para `index.js`). O problema é que **não existe
`index.js` neste projeto**:

* o código-fonte é TypeScript e fica em `src/`;
* o build (`tsc`) gera `dist/`, cujo entrypoint é `dist/app.js`;
* o script `start` antigo era `set TS_NODE_BASEURL=./dist&& node -r tsconfig-paths/register dist/app.js`
  — sintaxe do **cmd do Windows**. No Linux do Render, `set` não é um comando e o
  `npm start` quebrava (ou era ignorado), sobrando o fallback `node index.js`.

**Correção aplicada no repositório:**

| Arquivo | O que mudou |
| --- | --- |
| `package.json` | `main` agora é `dist/app.js`; `start` é `node server.js`; adicionado `engines.node >= 20` |
| `server.js` (novo) | entrypoint multiplataforma: registra os aliases e carrega `dist/app.js` |
| `tsconfig.dist.json` (novo) | remapeia `@/*` para `./dist` (em produção os arquivos compilados estão lá, não em `./src`) |
| `render.yaml` (novo) | Blueprint com build/start commands, healthcheck e env vars |
| `src/app.ts` | endpoint `/healthz`, bind em `0.0.0.0`, shutdown gracioso no `SIGTERM` |
| `src/shared/database/supabase.ts` | mensagem de erro dizendo exatamente quais variáveis faltam |
| `src/modulo/ia/service/GroqService.ts` | client Groq criado sob demanda — a API sobe mesmo sem `GROQ_API_KEY` |
| `package.json` / `package-lock.json` | removidos `bcrypt` e `puppeteer` (não eram usados; causavam build nativo e download do Chromium) |

## 2. Como fazer o deploy

### Opção A — Blueprint (recomendado)

1. Render > **New +** > **Blueprint** > conecte este repositório.
2. O `render.yaml` cria o serviço web com tudo configurado.
3. Preencha os segredos em **Environment** (o Blueprint deixa `SUPABASE_URL`,
   `SUPABASE_KEY`, `SUPABASE_SERVICE_KEY` e `GROQ_API_KEY` como `sync: false`,
   ou seja, para você digitar; `JWT_SECRET` e `ADMIN_SECRET` são gerados
   automaticamente).
4. **Manual Deploy** > *Clear build cache & deploy* na primeira vez.

### Opção B — Serviço manual já existente

Em **Settings** do serviço:

```
Build Command:   npm ci --include=dev && npm run build
Start Command:   npm start
```

Os dois campos têm que estar corretos **ao mesmo tempo**. Cada combinação errada
produz um erro diferente no log:

| Build Command | Start Command | Resultado no log |
| --- | --- | --- |
| `npm install` (sem `run build`) | `node dist/app.js` | `Cannot find module '/opt/render/project/src/dist/app.js'` — `dist/` não existe no git, ele só nasce do `tsc` |
| qualquer | `node dist/app.js` | `Cannot find module '@/shared/database/supabase'` — o `tsc` não reescreve os aliases; só o `server.js` registra o `tsconfig-paths` |
| `npm ci` + `NODE_ENV=production` | `npm start` | `sh: 1: tsc: not found` — o npm trata `NODE_ENV=production` como `--omit=dev`, então o typescript nem é instalado |
| `npm ci && npm run build` | `npm start` | `Servidor rodando em 0.0.0.0:<PORT>` ✅ |

> **Nunca use `node dist/app.js` como Start Command neste projeto.** O entrypoint
> de produção é o `server.js` (via `npm start`), que carrega `tsconfig.dist.json`
> antes do `dist/app.js`.

Confira também:

* **Runtime:** Node (não "Static Site" — este diretório é a API).
* **Root Directory:** deixe em branco / `.` (o backend está na raiz; a pasta
  `frontend/` é um projeto separado que será movido para outro repositório).
* **Branch:** `main`.
* **Health Check Path:** `/healthz`.
* **Node version:** 22 (defina a env var `NODE_VERSION=22.22.3` se quiser fixar).

> **Não use `yarn install` / `yarn start` no Render.** O gerenciador de pacotes
> deste repositório é o **npm** (`package-lock.json` versionado e nenhum
> `yarn.lock`). Quando o Start Command é `yarn start`, o yarn roda sem um
> lockfile/instalação próprios e o boot falha com
> `error Command "start" not found.` — exatamente o erro que aparece quando o
> serviço foi criado manualmente com as configurações do template Node do Render.
> Se você faz questão de yarn: rode `yarn install` localmente, commite o
> `yarn.lock` gerado e use
> `Build Command: yarn install --frozen-lockfile && yarn build` /
> `Start Command: yarn start`. O recomendado é ficar no npm.

## 3. Variáveis de ambiente

| Variável | Obrigatória | Onde obter |
| --- | --- | --- |
| `SUPABASE_URL` | sim | Supabase > Project Settings > API |
| `SUPABASE_KEY` | sim | mesma tela (chave `anon`) |
| `SUPABASE_SERVICE_KEY` | sim | mesma tela (chave `service_role`) |
| `JWT_SECRET` | sim | string aleatória longa |
| `ADMIN_SECRET` | sim | string usada no `POST /api/auth/register-admin` |
| `GROQ_API_KEY` | só para `/api/ia/*` | console.groq.com |
| `PORT` | não | o Render injeta sozinho |
| `HOST` | não | padrão `0.0.0.0` |

`SUPABASE_SERVICE_KEY` é a que mais gente esquece: sem ela o boot aborta com
`Variáveis de ambiente obrigatórias não definidas: SUPABASE_SERVICE_KEY`.

## 4. Como validar que subiu

```bash
curl https://sistema-hospitalar.onrender.com/healthz
# {"status":"ok","uptime":12.3}

curl https://sistema-hospitalar.onrender.com/api/pacientes
# {"error":"Token não fornecido"}  <- esperado: a rota existe e exige JWT
```

O workflow `.github/workflows/ping.yml` faz um `curl -f` na raiz a cada 5 minutos.
Se quiser monitorar o healthcheck em vez da raiz, troque a URL para `/healthz`.

## 5. Erros comuns no log do Render

| Log | Causa | Solução |
| --- | --- | --- |
| `error Command "start" not found.` | Start Command usa **yarn**, mas o projeto é **npm** (só existe `package-lock.json`; não há `yarn.lock`) | `Start Command: npm start` (ou `node server.js`) |
| `Cannot find module '/opt/render/project/src/index.js'` | start command errado / `main` apontando para arquivo inexistente | `Start Command: npm start` (que roda `node server.js`) |
| `Cannot find module '@/shared/database/supabase'` | aliases não registrados antes de carregar o `dist` | use `node server.js` (ele carrega `tsconfig.dist.json`) |
| `Cannot find module './dist/app.js'` | build não rodou | `Build Command: npm ci --include=dev && npm run build` |
| `Cannot find module 'date-fns'` no boot | `date-fns` estava em `devDependencies` mas é importado por `src/modulo/triagem/service/PrioridadeService.ts` | movido para `dependencies` (instalação `--omit=dev` agora funciona) |
| `sh: 1: tsc: not found` no build | `NODE_ENV=production` faz o npm pular os `devDependencies` | adicione `--include=dev` ao `npm ci` |
| `Variáveis de ambiente obrigatórias não definidas: ...` | env vars faltando | Render > Environment |
| `GroqError: The GROQ_API_KEY environment variable is missing` | só se algo chamar `/api/ia/*` | defina `GROQ_API_KEY` |
| `Application failed to respond` / healthcheck falha | serviço não escutou em `PORT` | o `app.ts` já usa `process.env.PORT`; não fixe porta |
| build travado em `node-pre-gyp` / `Downloading Chrome` | dependências nativas | já removidas (`bcrypt`, `puppeteer`) |

## 6. Testando localmente igual ao Render (Linux/macOS)

```bash
npm ci
cp .env.example .env   # preencha os valores
npm run build
npm start              # node server.js
curl http://localhost:3000/healthz
```

No Windows o mesmo `npm start` funciona (não há mais `set ...&&`).
Para desenvolver com hot reload: `npm run dev` (usa `ts-node` + `tsconfig.json` da raiz).
