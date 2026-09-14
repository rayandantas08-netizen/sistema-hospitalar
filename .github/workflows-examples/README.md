# ⚠️ ATUALIZAÇÃO MANUAL NECESSÁRIA

O bot não tem permissão para atualizar arquivos em `.github/workflows/` diretamente (proteção do GitHub).

## O que fazer:

1. Vá no seu repositório no GitHub
2. Abra `.github/workflows/deploy-frontend.yml`
3. Clique no lápis (Edit)
4. Copie o conteúdo de `.github/workflows-examples/deploy-frontend.yml` e cole lá
5. Faça commit

Ou via linha de comando local:

```bash
cp .github/workflows-examples/deploy-frontend.yml .github/workflows/deploy-frontend.yml
cp .github/workflows-examples/deploy-fullstack.yml .github/workflows/deploy-fullstack.yml
git add .github/workflows/
git commit -m "atualiza workflows"
git push
```

## O que mudou no workflow:

- Agora lê `secrets.VITE_API_URL` além de `vars.VITE_API_URL`
- Adiciona suporte para `arena/*` branches (para teste)
- Suporte para `VITE_SUPABASE_URL` e `VITE_SUPABASE_KEY` opcionais
- Novo workflow `deploy-fullstack.yml` para deploy manual fullstack
