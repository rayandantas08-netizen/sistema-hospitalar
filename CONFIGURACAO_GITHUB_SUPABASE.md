# 🔧 Como configurar Supabase + GitHub - Sistema Hospitalar

Você conectou GitHub ao Supabase e tem um `.env` local, mas não pode subir pro GitHub. Correto! Vamos configurar usando **GitHub Secrets**.

---

## ❗ IMPORTANTE: GitHub Pages NÃO roda backend

- **GitHub Pages** = só site estático (HTML/CSS/JS). Seu frontend em React/Vite roda lá ✅
- **Backend Node/Express** = precisa de servidor. Não roda no Pages ❌
- **Solução para teste**: 
  - Opção 1: Frontend no Pages + Backend no Render/Railway/Vercel (grátis)
  - Opção 2: Tudo junto em um servidor só (Render, Railway, Fly.io) - backend serve o frontend

Seu projeto já está preparado para as duas opções!

---

## Passo 1: Pegar as chaves do Supabase

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto: `ohllteerhgvcewwvktua` (Sistema-hospitalar)
3. Vá em **Project Settings > API**
4. Copie:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` → `SUPABASE_KEY`
   - `service_role` → `SUPABASE_SERVICE_KEY` (⚠️ secreta, nunca exponha no frontend)

---

## Passo 2: Configurar Secrets no GitHub

1. Vá no seu repositório GitHub: `https://github.com/rayandantas08-netizen/sistema-hospitalar`
2. Clique em **Settings > Secrets and variables > Actions**
3. Clique em **New repository secret** e adicione um por um:

### Secrets (valores sensíveis):
```
SUPABASE_URL = https://ohllteerhgvcewwvktua.supabase.co
SUPABASE_KEY = sua-chave-anon-publica
SUPABASE_SERVICE_KEY = sua-chave-service-role
JWT_SECRET = gere uma chave aleatória forte (ex: openssl rand -base64 32)
ADMIN_SECRET = outra chave forte para criar admin
GROQ_API_KEY = gsk_sua-chave-groq (opcional)
VITE_API_URL = https://sistema-hospitalar.onrender.com/api (ou /api se tudo junto)
```

### Variables (valores públicos, não sensíveis):
Vá na aba **Variables**:
```
VITE_API_URL = https://sistema-hospitalar.onrender.com/api
VITE_BASE_PATH = /sistema-hospitalar/
```

> **Diferença**: Secrets são escondidos nos logs, Variables aparecem. Use Secrets para chaves!

---

## Passo 3: Como funciona local vs GitHub?

### Local (seu PC):
- Crie `.env` na raiz baseado no `.env.example`
- Crie `frontend/.env` baseado no `frontend/.env.example`
- Rode `npm run dev` (backend) e `npm run dev` dentro de `frontend/` (frontend)

### GitHub Actions (deploy automático):
- O workflow `.github/workflows/deploy-frontend.yml` já lê automaticamente `secrets.*` e `vars.*`
- Você NÃO precisa commitar `.env`
- Ao fazer push na branch `main`, o deploy acontece sozinho

---

## Passo 4: Testar a conexão

### Teste local:
```bash
npm install
npm run build
npm start
# Acesse http://localhost:3000/health
# Deve mostrar: supabaseConfigured: true
```

### Teste produção:
Após configurar Secrets e fazer push:
- Frontend: https://rayandantas08-netizen.github.io/sistema-hospitalar/
- Backend health: https://sistema-hospitalar.onrender.com/health (se estiver no Render)

---

## Passo 5: Se quiser rodar TUDO junto (backend servindo frontend)

Já configurei `src/app.ts` para isso!

1. Build frontend: `cd frontend && npm run build`
2. Build backend: `npm run build`
3. O backend vai detectar `frontend/dist` e servir automaticamente
4. Faça deploy em **Render, Railway, Vercel, Fly.io** - todos têm plano grátis e conectam com GitHub

No Render:
- Root Directory: `./`
- Build Command: `npm install && npm run build && cd frontend && npm install && npm run build`
- Start Command: `npm start`
- Adicione as mesmas variáveis de ambiente no painel do Render

---

## Estrutura de envs

### Backend (raiz/.env):
```
SUPABASE_URL
SUPABASE_KEY
SUPABASE_SERVICE_KEY
JWT_SECRET
ADMIN_SECRET
GROQ_API_KEY
PORT
```

### Frontend (frontend/.env):
```
VITE_API_URL
VITE_BASE_PATH
```

---

## Checklist rápido

- [ ] Peguei URL e chaves no Supabase Dashboard
- [ ] Adicionei todos os Secrets no GitHub
- [ ] Adicionei Variables VITE_API_URL e VITE_BASE_PATH
- [ ] Fiz push na main e vi o workflow rodar em Actions
- [ ] Testei /health do backend
- [ ] Frontend carregando e conectando na API

---

## Problemas comuns

**"SUPABASE_URL e SUPABASE_KEY devem ser definidos"**
→ Faltou configurar Secrets no GitHub ou .env local

**Frontend em branco no GitHub Pages**
→ Verifique VITE_BASE_PATH = /sistema-hospitalar/ (com barras)

**CORS error**
→ Backend já está com CORS liberado para *.github.io. Se ainda der erro, verifique VITE_API_URL

**Backend não sobe no Render**
→ Verifique se todas envs estão no painel do Render também

---

## Próximos passos

Se quiser, posso:
1. Configurar deploy automático no Render/Vercel
2. Criar um Dockerfile para rodar tudo junto
3. Adicionar autenticação Supabase direto no frontend
