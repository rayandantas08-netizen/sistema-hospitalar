# 🚀 Guia Rápido - Configurar Supabase + GitHub

## Você disse:
> "conectei minha conta da github ao supabase, onde é o banco de dados, precisamos configurar ela para conectar"

## O que já fiz no código:

### ✅ 1. `.env.example` atualizado
Agora tem todas as variáveis que você mencionou:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`
- `ADMIN_SECRET`
- `GROQ_API_KEY`

### ✅ 2. `frontend/.env.example` criado
Para configurar a URL da API no frontend

### ✅ 3. `src/shared/database/supabase.ts` melhorado
Não quebra mais o build se faltar env, e dá mensagem clara do que falta

### ✅ 4. `src/app.ts` agora serve frontend + backend juntos
Se você fizer build do frontend, o backend serve automaticamente. Isso permite rodar **tudo no mesmo servidor** (Render, Railway, etc)

### ✅ 5. Workflows GitHub Actions configurados
- `deploy-frontend.yml` - Deploy automático do frontend no GitHub Pages (já existia, melhorei)
- `deploy-fullstack.yml` - Deploy fullstack manual

### ✅ 6. Arquivos extras:
- `render.yaml` - Para deploy fácil no Render
- `Dockerfile` - Para deploy em qualquer lugar
- `scripts/check-supabase.js` - Testa conexão com Supabase
- `CONFIGURACAO_GITHUB_SUPABASE.md` - Guia completo

---

## 🔥 AGORA FAÇA ISSO (3 minutos):

### Passo 1: Pegar chaves no Supabase
1. https://supabase.com/dashboard/project/ohllteerhgvcewwvktua/settings/api
2. Copie:
   - **Project URL** 
   - **anon public key**
   - **service_role key** (clique em Reveal)

### Passo 2: Colocar no GitHub Secrets
1. Vá em: https://github.com/rayandantas08-netizen/sistema-hospitalar/settings/secrets/actions
2. Clique **New repository secret** para cada um:

| Nome | Valor | Onde pega |
|------|-------|-----------|
| `SUPABASE_URL` | `https://ohllteerhgvcewwvktua.supabase.co` | Supabase Dashboard |
| `SUPABASE_KEY` | `eyJ...` (anon) | Supabase Dashboard |
| `SUPABASE_SERVICE_KEY` | `eyJ...` (service_role) | Supabase Dashboard |
| `JWT_SECRET` | Gere com: `openssl rand -base64 32` | Invente uma |
| `ADMIN_SECRET` | Outra chave forte | Invente outra |
| `GROQ_API_KEY` | `gsk_...` (opcional) | groq.com |

3. Na aba **Variables** (ao lado de Secrets):
   - `VITE_API_URL` = `https://sistema-hospitalar.onrender.com/api` (ou `/api` se tudo junto)
   - `VITE_BASE_PATH` = `/sistema-hospitalar/`

### Passo 3: Testar local (opcional)
```bash
# Na raiz do projeto, crie .env
cp .env.example .env
# Edite .env com suas chaves reais

# Teste conexão
npm run check:env

# Rode backend
npm run dev

# Em outro terminal, rode frontend
cd frontend
cp .env.example .env
npm run dev
```

### Passo 4: Deploy automático
```bash
git add .
git commit -m "configura supabase + github"
git push origin arena/01a0a161-sistema-hospitalar
# Depois faça merge pra main ou mude workflow pra sua branch
```

Se fizer push na `main`, o GitHub Actions vai:
1. Buildar frontend com suas variáveis
2. Publicar em https://rayandantas08-netizen.github.io/sistema-hospitalar/

---

## 🤔 "Quero rodar backend no GitHub também"

**GitHub Pages não roda backend Node.** É só site estático.

Para teste completo, você tem 2 opções:

### Opção A: Frontend no Pages + Backend no Render (recomendado, grátis)
1. Já está configurado! Seu `deploy-frontend.yml` aponta para `https://sistema-hospitalar.onrender.com/api`
2. Configure as mesmas envs no painel do Render: https://dashboard.render.com
3. Pronto!

### Opção B: Tudo junto no Render/Railway/Fly.io
1. Conecte seu GitHub no Render
2. Use o `render.yaml` que criei - ele já sabe como buildar tudo
3. Configure envs no Render
4. Seu site será algo como `https://sistema-hospitalar.onrender.com` com frontend + backend juntos

---

## 🆘 Problemas?

**"Variáveis não definidas"**
→ Verifique se adicionou nos Secrets do GitHub E fez push na main

**"Frontend branco"**
→ Verifique `VITE_BASE_PATH` = `/sistema-hospitalar/`

**"CORS error"**
→ Backend já está com CORS liberado. Verifique se `VITE_API_URL` está correta

**"Não conecta no Supabase"**
→ Rode `npm run check:env` local para testar

---

## 📚 Arquivos importantes
- `CONFIGURACAO_GITHUB_SUPABASE.md` - Guia detalhado
- `.env.example` - Exemplo backend
- `frontend/.env.example` - Exemplo frontend
- `.github/workflows/deploy-frontend.yml` - Deploy Pages
