# Frontend — Sistema Hospitalar (React + Vite)

Projeto **autocontido**: tem `package.json`, lockfile, tsconfig, lint (oxlint),
`.gitignore`, `.env.example` e docs próprios — incluindo o documento de design
[`PROMPT_DESIGN_FRONTEND_HOSPITALAR.md`](./PROMPT_DESIGN_FRONTEND_HOSPITALAR.md).
Não depende de nenhum arquivo fora desta pasta — ela foi preparada para ser
movida para um repositório independente.

## Rodando localmente

```bash
cd frontend
npm ci
npm run dev        # http://localhost:5173/
```

A API usada em desenvolvimento é `http://localhost:3000/api` (backend na raiz do repositório).
Para apontar para outro backend: `VITE_API_URL=https://.../api npm run dev`.

## Como separar em um repositório próprio

Esta pasta está pronta para virar um repositório independente. Passo a passo:

1. **Criar o novo repositório** (ex.: `sistema-hospitalar-frontend`) no GitHub.
2. **Copiar o conteúdo desta pasta para a raiz dele** (mantendo os arquivos ocultos):

   ```bash
   git clone https://github.com/<usuario>/sistema-hospitalar-frontend.git
   cp -r frontend/. sistema-hospitalar-frontend/
   ```

   Se quiser preservar o histórico do Git apenas desta pasta, use
   `git filter-repo --subdirectory-filter frontend` no clone do repositório atual.
3. **Ativar o workflow de deploy**: mover `frontend/.github/workflows/deploy-frontend.yml`
   para `.github/workflows/deploy-frontend.yml` na raiz do novo repositório
   (os caminhos internos já estão prontos para a raiz — não precisa editar nada).
4. **Ajustar a base do GitHub Pages**: o Pages publica em
   `https://<usuario>.github.io/<nome-do-repo>/`, então defina a *repository variable*
   `VITE_BASE_PATH=/<nome-do-repo>/` (Settings → Secrets and variables → Actions)
   se o nome do novo repositório for diferente de `sistema-hospitalar`.
5. **Configurar a URL da API**: defina a *repository variable* `VITE_API_URL`
   (padrão no workflow: `https://sistema-hospitalar.onrender.com/api`).
6. **Pages**: Settings → Pages → Source: **GitHub Actions**.
7. **No repositório do backend**: apagar a pasta `frontend/` (e abrir PR).

## Publicação no GitHub Pages

O site é publicado em **https://rayandantas08-netizen.github.io/sistema-hospitalar/**, ou seja,
em um **subdiretório** do domínio. Por isso:

1. `vite.config.ts` define `base: '/sistema-hospitalar/'` **apenas no build**
   (no `npm run dev` continua `/`). Para trocar o caminho: `VITE_BASE_PATH=/outro/ npm run build`.
2. O `BrowserRouter` usa `basename={import.meta.env.BASE_URL}` e a navegação interna usa
   `<Link>`/`<NavLink>` — **não** use `<a href="/rota">`, isso quebra no subdiretório.
3. O deploy é feito pelo workflow `frontend/.github/workflows/deploy-frontend.yml`.
   Enquanto ele estiver dentro de `frontend/`, o GitHub **não** o executa (só vale
   `.github/` na raiz do repo) — ele entra em ação quando a pasta for movida para o
   repositório próprio do frontend (veja a seção acima). No repositório do frontend,
   ele roda `npm run build` na raiz, gera `404.html` (fallback de SPA para rotas como
   `/pacientes`), adiciona `.nojekyll` e publica `dist` com `actions/deploy-pages`.
4. A URL da API em produção vem de `VITE_API_URL` no build
   (padrão: `https://sistema-hospitalar.onrender.com/api`; sobrescreva criando a
   *repository variable* `VITE_API_URL` em Settings → Secrets and variables → Actions).

---

# React + TypeScript + Vite


This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
