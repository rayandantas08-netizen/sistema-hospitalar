# Sistema Hospitalar - Backend

Bem-vindo ao repositório do backend do **Sistema Hospitalar**, uma API RESTful completa projetada para gerenciar operações em clínicas, hospitais e unidades de saúde. O sistema suporta autenticação segura, gerenciamento de pacientes, profissionais, consultas, prescrições, prontuários, triagens, unidades de saúde e uma **camada avançada de Inteligência Artificial** para suporte à decisão clínica e epidemiológica.

## Funcionalidades Principais

* **Autenticação e Autorização**: JWT com papéis granulares (`ADMINISTRADOR_PRINCIPAL`, `MEDICO`, `ENFERMEIRO`).
* **Gestão de Pacientes**: Cadastro, atualização, exclusão lógica (soft delete), histórico clínico e consentimento LGPD explícito.
* **Consultas Médicas**: Criação, edição, listagem por paciente, médico ou unidade, com suporte a CID-10.
* **Prescrições e Prontuários**: Registro, edição, geração de PDFs e anonimização automática de dados sensíveis.
* **Triagens**: Avaliação inicial por enfermeiros com sinais vitais, classificação de gravidade e priorização.
* **Unidades de Saúde**: Cadastro e gerenciamento de hospitais/UPAs com CNES, serviços essenciais e ampliados.
* **Inteligência Artificial** (novo em 3.2.0):

    * **Relatório de Surto Respiratório**: Análise de risco epidemiológico global ou por unidade, com resumo executivo, indicadores, recomendações e análise completa em Markdown.
    * **Análise de Paciente Recorrente**: Identificação de padrões de atendimentos frequentes com sugestões clínicas personalizadas.
    * **Análise Operacional de Triagens**: Avaliação de risco de sobrecarga por unidade, distribuição por gravidade e recomendações operacionais.
    * **Histórico de Relatórios**: Armazenamento e consulta de todos os relatórios gerados, com acesso por tipo e data.
* **Segurança**: Criptografia de dados sensíveis, rate limiting, validação rigorosa, conformidade total com LGPD e logs de auditoria.
* **Desempenho**: Cache (Redis), índices otimizados, processamento assíncrono (BullMQ), paginação e respostas compactas.

## Tecnologias Utilizadas

* **Backend**: Node.js + Express.js
* **Banco de Dados**: PostgreSQL (via Supabase)
* **Autenticação**: Supabase Auth + JWT
* **Cache**: Redis
* **Fila Assíncrona**: BullMQ
* **Geração de PDF**: pdfkit
* **Inteligência Artificial**: Groq SDK (modelo Compound)
* **Segurança**: express-rate-limit, helmet, express-validator, bcrypt
* **Hospedagem**: Render.com (autoescalamento)
* **Logging**: Winston

## Pré-requisitos

* Node.js v18 ou superior
* Conta no Supabase (projeto PostgreSQL)
* Redis (local ou cloud)
* Chave API do Groq (para funcionalidades de IA)
* Conta no Render.com (para deploy)

## Configuração e Execução

1. **Clonar o repositório**:

   ```bash
   git clone https://github.com/seu-usuario/sistema-hospitalar.git
   cd sistema-hospitalar
   ```

2. **Instalar dependências**:

   ```bash
   npm install
   ```

3. **Configurar variáveis de ambiente**:

   Crie um arquivo `.env` baseado no `.env.example`:

   ```env
   SUPABASE_URL=sua-url-supabase
   SUPABASE_KEY=sua-chave-supabase
   JWT_SECRET=sua-chave-secreta-jwt
   ADMIN_SECRET=seu-secret-para-criar-admin
   GROQ_API_KEY=sua-chave-groq
   ```

4. **Build e execução**:

    * Desenvolvimento:

      ```bash
      npm run dev
      ```
    * Produção:

      ```bash
      npm run build
      npm start
      ```

5. **Acessar a API**:

    * Local: `http://localhost:3000`
    * Produção: `https://SUA-URL.com`

## Deploy no Render

O repositório inclui um [`render.yaml`](./render.yaml) (Blueprint). No Render:
**New + > Blueprint > conectar este repositório**. O serviço é criado com:

| Campo | Valor |
| --- | --- |
| Runtime | Node |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` (executa `node server.js`) |
| Health check path | `/healthz` |

Detalhes importantes:

* **Não existe `index.js`** — o entrypoint de produção é `server.js`, que registra
  os aliases (`@/...`) via `tsconfig-paths` usando o `tsconfig.dist.json` e então
  carrega o `dist/app.js` gerado pelo `tsc`.
* **Variáveis obrigatórias** (Render > Environment): `SUPABASE_URL`,
  `SUPABASE_KEY`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, `ADMIN_SECRET`.
  Sem as três primeiras a API aborta o boot com uma mensagem listando o que falta.
  `GROQ_API_KEY` é opcional: sem ela só os endpoints `/api/ia/*` falham.
* A porta vem do `PORT` injetado pelo Render; o servidor escuta em `0.0.0.0`.
* `bcrypt` e `puppeteer` foram removidos das dependências (não são usados no
  código): evitam compilação nativa e o download do Chromium no build.

Passo a passo completo e solução de erros comuns: [`RENDER_DEPLOY.md`](./RENDER_DEPLOY.md).

## Estrutura do repositório

Este repositório é o **backend**. Todo o código do frontend (React + Vite) está
isolado na pasta [`frontend/`](./frontend), que é um projeto 100% autocontido
(`package.json`, lockfile, tsconfig, lint e docs próprios) — ela foi preparada
para ser movida para um repositório independente sem nenhuma edição no backend.

```
sistema-hospitalar/          <- BACKEND (API Node.js/Express/TypeScript)
├── src/                     <- código-fonte da API
├── server.js                <- entrypoint de produção
├── render.yaml              <- blueprint de deploy (Render)
├── supabase/                <- migrations do banco
└── frontend/                <- FRONTEND (React + Vite), pronto para separar
```

Para separar o frontend em outro repositório, veja o guia em
[`frontend/README.md`](./frontend/README.md).

## Documentação da API

Todos os endpoints estão organizados por recurso. Base URL: `/api`

### Autenticação (`/auth`)

* `POST /auth/register-admin` – Cria administrador principal (exige `adminSecret`)
* `POST /auth/login` – Autenticação e emissão de JWT
* `POST /auth/forgot-password` – Inicia recuperação de senha

### Consultas (`/consultas`)

* `POST /consultas` – Cria consulta (médicos)
* `GET /consultas/:id`
* `GET /consultas/pacientes/:pacienteId`
* `GET /consultas/profissional/:medicoId`
* `GET /consultas/unidade/:unidadeId/*`
* `PUT /consultas/:id`
* `DELETE /consultas/:id`

### Enfermeiros e Médicos (`/enfermeiros`, `/medicos`)

* `POST`, `GET` (lista e individual), `PUT`, `DELETE` (soft delete) – Restritos a administradores

### Pacientes (`/pacientes`)

* `POST /pacientes` (enfermeiros/admin)
* `GET /pacientes`
* `PUT /pacientes/:id`
* `DELETE /pacientes/:id`
* `GET /pacientes/:id/historico`

### Prescrições (`/prescricoes`)

* `POST`, `GET`, `PUT`, `DELETE`
* `GET /prescricoes/:id/pdf` – Geração de PDF

### Prontuários (`/prontuarios`)

* `POST`, `GET`, `PUT`, `DELETE`
* `GET /prontuarios/:id/pdf`

### Triagens (`/triagens`)

* `POST` (enfermeiros)
* `GET`, `PUT`, `DELETE`
* `GET /triagens/gravidade/:cor/unidade/:unidadeId`

### Unidades de Saúde (`/unidades-saude`)

* `POST`, `GET`, `PUT`, `DELETE`
* `GET /unidades-saude/:id/funcionarios`

### Inteligência Artificial (`/ia`)

* `GET /ia/surto` – Relatório de risco de surto respiratório (admin/médico, opcional `?unidade_saude_id=`)
* `GET /ia/paciente/:pacienteId/recorrente` – Análise de recorrência (apenas médicos)
* `GET /ia/triagens/:unidadeSaudeId` – Análise operacional de triagens (admin/médico)
* `GET /ia/relatorios` – Lista últimos relatórios gerados (todos os profissionais, opcional `?limit=`)
* `GET /ia/relatorios/:id` – Detalhes de relatório específico (todos os profissionais)

Todos os relatórios de IA utilizam dados agregados e anonimizados, são salvos na tabela `relatorios_ia` e gerados com o modelo **Groq Compound**.

## Conformidade com LGPD

* Consentimento explícito obrigatório no cadastro de pacientes 
* Anonimização automática em prontuários, PDFs e dados enviados à IA 
* Logs de auditoria completos 
* Criptografia de dados sensíveis (CPF, CNS)
* Soft delete com retenção para auditoria 
* IA: Nenhum dado pessoal é enviado ao modelo — apenas agregados

## Contribuição

Contribuições são super bem-vindas!

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças
4. Push e abra um Pull Request

## Contato

* **E-mail**: [queirozdouglas466@gmail.com](mailto:queirozdouglas466@gmail.com)
* **Issues**: Abra uma issue no repositório

## Licença

Apache License 2.0

---

**Versão**: 3.2.0  
**Data**: 05 de Janeiro de 2026
