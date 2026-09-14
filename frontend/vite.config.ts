import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// O GitHub Pages publica o projeto em um subdiretório:
// https://<usuario>.github.io/sistema-hospitalar/
// Por isso o build precisa de `base`, senão os assets (/assets/...) são
// procurados na raiz do domínio e o site carrega em branco.
//
// Em `npm run dev` mantemos '/' para continuar acessando em http://localhost:5173/
// Para trocar o caminho publicado, defina a variável de ambiente VITE_BASE_PATH.
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : (process.env.VITE_BASE_PATH ?? '/sistema-hospitalar/'),
  plugins: [react()],
}))
