# Frontend — Sistema Hospitalar (React + Vite)

## Rodando localmente

```bash
cd frontend
npm ci
npm run dev        # http://localhost:5173/
```

A API usada em desenvolvimento é `http://localhost:3000/api` (backend na raiz do repositório).
Para apontar para outro backend: `VITE_API_URL=https://.../api npm run dev`.

## Publicação no GitHub Pages

O site é publicado em **https://rayandantas08-netizen.github.io/sistema-hospitalar/**, ou seja,
em um **subdiretório** do domínio. Por isso:

1. `vite.config.ts` define `base: '/sistema-hospitalar/'` **apenas no build**
   (no `npm run dev` continua `/`). Para trocar o caminho: `VITE_BASE_PATH=/outro/ npm run build`.
2. O `BrowserRouter` usa `basename={import.meta.env.BASE_URL}` e a navegação interna usa
   `<Link>`/`<NavLink>` — **não** use `<a href="/rota">`, isso quebra no subdiretório.
3. O deploy é feito pelo workflow `.github/workflows/deploy-frontend.yml`
   (Settings → Pages → Source: **GitHub Actions**). Ele roda `npm run build` em `frontend/`,
   gera `404.html` (fallback de SPA para rotas como `/pacientes`), adiciona `.nojekyll`
   e publica `frontend/dist` com `actions/deploy-pages`.
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
