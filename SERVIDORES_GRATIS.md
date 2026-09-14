# 🆓 Servidores Grátis para rodar seu Sistema Hospitalar

Você perguntou: **"tem algum servidor grátis?"** - SIM! Vários! Todos conectam direto no seu GitHub e fazem deploy automático.

---

## 🏆 TOP 3 Recomendados (100% grátis)

### 1. **Render.com** - MAIS FÁCIL (Recomendado)
**O que é:** Roda seu backend Node + frontend juntos
**Plano grátis:** 750h/mês, dorme após 15min sem uso (acorda sozinho)
**Vantagem:** Já está configurado no seu projeto!

**Como usar:**
1. Acesse https://dashboard.render.com
2. Clique **New + > Web Service**
3. Conecte seu GitHub: `rayandantas08-netizen/sistema-hospitalar`
4. Render vai detectar o `render.yaml` automaticamente
5. Adicione as variáveis (Settings > Environment):
   ```
   SUPABASE_URL=https://ohllteerhgvcewwvktua.supabase.co
   SUPABASE_KEY=sua-chave-anon
   SUPABASE_SERVICE_KEY=sua-chave-service-role
   JWT_SECRET=gere-uma-forte
   ADMIN_SECRET=outra-forte
   GROQ_API_KEY=gsk_...
   ```
6. Clique Deploy! Em 3 minutos seu backend estará em `https://seu-app.onrender.com`

**Depois configure no GitHub Pages:**
- Vá em GitHub > Settings > Secrets > Variables
- `VITE_API_URL` = `https://seu-app.onrender.com/api`

---

### 2. **Vercel.com** - MAIS RÁPIDO
**O que é:** Roda frontend + backend serverless (sem dormir!)
**Plano grátis:** 100GB banda, 6000h execução, NÃO dorme
**Vantagem:** Muito rápido, deploy em 30s

**Como usar:**
1. Acesse https://vercel.com/new
2. Importe seu GitHub repo
3. Configure:
   - Framework: **Vite**
   - Build Command: `npm run build:full`
   - Output Directory: `frontend/dist`
4. Adicione Environment Variables (mesmas do Render)
5. Deploy! Seu app fica em `https://seu-app.vercel.app` com frontend + backend juntos!

**Arquivos já criados:** `vercel.json` e `api/index.js`

---

### 3. **GitHub Pages + Supabase Direto** - SEM SERVIDOR EXTRA (100% GitHub)
**O que é:** Frontend no GitHub Pages falando DIRETO com Supabase, sem backend Node
**Plano grátis:** GitHub Pages é grátis pra sempre
**Vantagem:** Só usa GitHub + Supabase que você já tem!
**Limitação:** Algumas funções avançadas (PDF, IA) precisam do backend

**Como usar (JÁ CONFIGUREI PRA VOCÊ!):**
1. No GitHub, vá em Settings > Secrets:
   ```
   VITE_SUPABASE_URL=https://ohllteerhgvcewwvktua.supabase.co
   VITE_SUPABASE_KEY=sua-chave-anon-publica
   VITE_USE_SUPABASE_DIRECT=true
   ```
2. Deixe `VITE_API_URL` vazio ou `/api`
3. Faça push na main
4. Seu frontend vai detectar que está no GitHub Pages e usar Supabase direto!
5. Acesse `https://rayandantas08-netizen.github.io/sistema-hospitalar/`

**O que funciona no modo direto:**
- ✅ Login (via Supabase Auth)
- ✅ Listar pacientes, médicos, enfermeiros
- ✅ Criar/editar pacientes
- ❌ Gerar PDF (precisa backend)
- ❌ Relatórios IA (precisa Groq + backend)

---

## 📊 Comparação

| Servidor | Preço | Dorme? | Velocidade | Fácil? | Frontend+Backend juntos? |
|----------|-------|--------|------------|--------|--------------------------|
| **Render** | Grátis | Sim (15min) | Média | ⭐⭐⭐⭐⭐ | Sim |
| **Vercel** | Grátis | Não | Muito rápida | ⭐⭐⭐⭐ | Sim |
| **Railway** | $5 grátis/mês | Não | Rápida | ⭐⭐⭐ | Sim |
| **Fly.io** | Grátis* | Não | Rápida | ⭐⭐ | Sim |
| **GitHub Pages + Supabase** | Grátis | Não | Rápida | ⭐⭐⭐⭐⭐ | Não (só frontend) |
| **Netlify** | Grátis | Não | Rápida | ⭐⭐⭐⭐ | Sim (com Functions) |

---

## 🚀 Qual escolher?

- **Quer tudo funcionando 100%?** → **Render ou Vercel** (backend completo)
- **Quer teste rápido só com GitHub?** → **GitHub Pages + Supabase Direto** (já configurei!)
- **Quer o mais rápido e que não dorme?** → **Vercel**

---

## 🔧 Configuração Rápida Render (Passo a Passo com Print)

1. **Crie conta:** https://render.com (Login com GitHub)
2. **New Web Service:**
   - Connect GitHub repo
   - Name: `sistema-hospitalar`
   - Build: `npm install --ignore-scripts && npm run build && cd frontend && npm install && npm run build`
   - Start: `npm run start:prod`
3. **Environment Variables:** Adicione todas do `.env.example`
4. **Deploy** → copie URL: `https://sistema-hospitalar-xxxx.onrender.com`
5. **Volte no GitHub:** Settings > Secrets > Variables > `VITE_API_URL` = `https://.../api`
6. **Push** → frontend no Pages vai usar backend no Render!

---

## 🔧 Configuração Rápida Vercel

1. **Importe:** https://vercel.com/new → seu repo
2. **Env Vars:** mesmas do Render
3. **Deploy** → tudo junto em `https://seu-app.vercel.app`
4. **Pronto!** Não precisa GitHub Pages, Vercel já hospeda tudo!

---

## 🆘 Dúvidas?

**"Qual é 100% grátis pra sempre?"**
- GitHub Pages + Supabase = grátis pra sempre
- Render free = grátis pra sempre (mas dorme)
- Vercel free = grátis pra sempre (não dorme, melhor!)

**"Preciso de cartão?"**
- Render: Não
- Vercel: Não
- Railway: Sim (mas tem $5 grátis)
- Fly.io: Sim

**"Qual você recomenda?"**
Para teste: **Vercel** (não dorme, rápido, grátis)
Para só GitHub: **Modo Direto** que já configurei!

---

## ✅ O que já está pronto no seu código:

- `render.yaml` - Render detecta automático
- `vercel.json` + `api/index.js` - Vercel detecta automático
- `frontend/src/lib/supabase.ts` - Modo direto GitHub Pages
- `frontend/src/api/supabase-direct.ts` - API direta sem backend
- `Dockerfile` - Para qualquer servidor

É só escolher um e fazer deploy!
