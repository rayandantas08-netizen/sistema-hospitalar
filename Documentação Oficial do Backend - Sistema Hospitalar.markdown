# Documentação Oficial do Backend - Sistema Hospitalar

Esta documentação detalha todos os endpoints da API RESTful do **Sistema Hospitalar**, hospedada em `https://sistema-hospitalar.onrender.com`. O sistema é implementado com **Node.js**, **Express** e **PostgreSQL** (via Supabase), com autenticação JWT, segurança reforçada e plena conformidade com a LGPD.

**Versão da Documentação**: 3.2.0  
**Data**: 05 de Janeiro de 2026

---

## 1. Visão Geral do Sistema

O sistema gerencia operações hospitalares completas, incluindo autenticação de profissionais (administradores, médicos e enfermeiros), pacientes, consultas, prescrições, prontuários, triagens, unidades de saúde e uma **camada avançada de Inteligência Artificial** para suporte à decisão clínica e epidemiológica.

### Características Principais

* **Arquitetura**: RESTful com endpoints organizados por recurso (`/api/auth`, `/api/consultas`, etc.).
* **Autenticação**: JWT com papéis granulares e expiração configurável.
* **Segurança**: Validação rigorosa, rate limiting, bcrypt, criptografia de dados sensíveis e proteção contra ataques comuns.
* **LGPD**: Consentimento explícito, anonimização automática, logs de auditoria e soft delete.
* **Desempenho**: Índices otimizados, cache (Redis), operações assíncronas (BullMQ) e paginação.
* **Inteligência Artificial**: Relatórios gerados com Groq SDK utilizando **exclusivamente dados agregados e anonimizados**.
* **Hospedagem**: Render.com com autoescalamento.

---

## 2. Endpoints do Sistema

Base URL: `/api`

### 2.1 Autenticação (`/auth`)

| Método | Endpoint               | Descrição                                           | Papéis Permitidos  |
|--------|------------------------|-----------------------------------------------------|--------------------|
| POST   | /auth/register-admin   | Cria administrador principal (exige `adminSecret`)  | Nenhum (secret)    |
| POST   | /auth/login            | Login e emissão de JWT                              | Todos              |
| POST   | /auth/forgot-password  | Inicia recuperação de senha                         | Nenhum             |

### 2.2 Consultas (`/consultas`)

| Método  | Endpoint                                           | Descrição                      | Papéis Permitidos   |
|---------|----------------------------------------------------|--------------------------------|---------------------|
| POST    | /consultas                                         | Cria consulta                  | MÉDICO              |
| GET     | /consultas/:id                                     | Detalhes de consulta           | MÉDICO, ENFERMEIRO  |
| GET     | /consultas/pacientes/:pacienteId                   | Consultas por paciente         | MÉDICO, ENFERMEIRO  |
| GET     | /consultas/profissional/:medicoId                  | Consultas por médico           | ADMINISTRADOR       |
| GET     | /consultas/unidade/:unidadeId                      | Todas as consultas da unidade  | ADMINISTRADOR       |
| GET     | /consultas/unidade/:unidadeId/atendimentos-ativos  | Atendimentos ativos            | ADMINISTRADOR       |
| PUT     | /consultas/:id                                     | Atualiza consulta              | MÉDICO (criador)    |
| DELETE  | /consultas/:id                                     | Soft delete                    | MÉDICO (criador)    |

### 2.3 Enfermeiros e Médicos (`/enfermeiros`, `/medicos`)

Endpoints equivalentes para ambos os recursos:

* `POST` – Criação (ADMINISTRADOR)
* `GET /` – Lista ativos
* `GET /:id` – Detalhes (ADMINISTRADOR ou próprio profissional)
* `PUT /:id` – Atualização (ADMINISTRADOR)
* `DELETE /:id` – Soft delete (ADMINISTRADOR)

### 2.4 Pacientes (`/pacientes`)

| Método  | Endpoint                  | Descrição                   | Papéis Permitidos          |
|---------|---------------------------|-----------------------------|----------------------------|
| POST    | /pacientes                | Cria paciente               | ENFERMEIRO, ADMINISTRADOR  |
| GET     | /pacientes                | Lista pacientes             | ENFERMEIRO, MÉDICO, ADMIN  |
| GET     | /pacientes/:id            | Detalhes do paciente        | ENFERMEIRO, MÉDICO, ADMIN  |
| GET     | /pacientes/:id/historico  | Histórico clínico completo  | ENFERMEIRO, MÉDICO, ADMIN  |
| PUT     | /pacientes/:id            | Atualiza paciente           | ENFERMEIRO, ADMINISTRADOR  |
| DELETE  | /pacientes/:id            | Soft delete                 | ENFERMEIRO, ADMINISTRADOR  |

### 2.5 Prescrições (`/prescricoes`)

| Método  | Endpoint                            | Descrição                 | Papéis Permitidos          |
|---------|-------------------------------------|---------------------------|----------------------------|
| POST    | /prescricoes                        | Cria prescrição           | MÉDICO, ENFERMEIRO (UPA)   |
| GET     | /prescricoes/:id                    | Detalhes                  | MÉDICO, ENFERMEIRO         |
| GET     | /prescricoes/pacientes/:pacienteId  | Prescrições por paciente  | MÉDICO, ENFERMEIRO         |
| PUT     | /prescricoes/:id                    | Atualiza                  | MÉDICO, ENFERMEIRO (UPA)   |
| DELETE  | /prescricoes/:id                    | Soft delete               | MÉDICO                     |
| GET     | /prescricoes/:id/pdf                | Gera PDF (anonimizado)    | MÉDICO, ENFERMEIRO, ADMIN  |

### 2.6 Prontuários (`/prontuarios`)

Estrutura equivalente às prescrições, com anonimização obrigatória e geração de PDF.

### 2.7 Triagens (`/triagens`)

| Método | Endpoint                                     | Descrição                        | Papéis Permitidos    |
|--------|----------------------------------------------|----------------------------------|----------------------|
| POST   | /triagens                                    | Cria triagem                     | ENFERMEIRO           |
| GET    | /triagens/:id                                | Detalhes                         | ENFERMEIRO, MÉDICO   |
| GET    | /triagens/pacientes/:pacienteId              | Triagens por paciente            | ENFERMEIRO, MÉDICO   |
| GET    | /triagens/gravidade/:cor/unidade/:unidadeId  | Triagens por gravidade e unidade | ENFERMEIRO, MÉDICO   |
| PUT    | /triagens/:id                                | Atualiza                         | ENFERMEIRO (criador) |
| DELETE | /triagens/:id                                | Soft delete                      | ENFERMEIRO (criador) |

### 2.8 Salas por Unidade de Saúde (`/salas`)

Tabela `sala`: `id`, `unidade_saude_id`, `nome`, `tipo` (ex.: "Consultório médico", "Emergência", "Farmácia", "Triagem", "Exames"), `responsavel_id` (médico ou enfermeiro), `status` (`LIVRE`, `EM_ATENDIMENTO`, `MONITORADA`, `INATIVA`).

| Método | Endpoint                            | Descrição                                            | Papéis Permitidos             |
|--------|-------------------------------------|------------------------------------------------------|-------------------------------|
| GET    | /salas                              | Lista salas (join com responsável e unidade)         | ADMINISTRADOR, MÉDICO, ENFERMEIRO |
| GET    | /salas/:id                          | Detalhes da sala                                     | ADMINISTRADOR, MÉDICO, ENFERMEIRO |
| POST   | /salas                              | Cria sala                                            | ADMINISTRADOR                 |
| PUT    | /salas/:id                          | Atualiza sala e responsável (`responsavelId: null` limpa) | ADMINISTRADOR, ENFERMEIRO |
| DELETE | /salas/:id                          | Soft delete (bloqueado se houver chamada em andamento) | ADMINISTRADOR               |
| GET    | /unidades/:unidadeSaudeId/salas     | Salas de uma unidade específica                      | ADMINISTRADOR, MÉDICO, ENFERMEIRO |
| GET    | /unidades-saude/:unidadeSaudeId/salas | Alias do endpoint acima                            | ADMINISTRADOR, MÉDICO, ENFERMEIRO |

**Regras de negócio**: o responsável precisa ser um `funcionario` ativo com papel MEDICO ou ENFERMEIRO; não pode haver duas salas ativas com o mesmo nome na mesma unidade (409); a listagem é paginada (`?pagina=1&limite=20`, aceita também `page`/`limit`) e devolve `{data, paginacao}`.

### 2.8.1 Chamadas de Pacientes (`/chamadas`) — Painel de TV

Tabela `chamada`: `id`, `paciente_id`, `sala_id`, `sala` (nome denormalizado), `senha` (ex.: `A014`, `V001`), `prioridade` (`Vermelho`, `Laranja`, `Amarelo`, `Verde`, `Azul`), `status` (`CHAMANDO`, `EM_ATENDIMENTO`, `FINALIZADO`, `CANCELADO`), `chamado_em`, `atendido_em`, `finalizado_em`, `profissional_id`, `triagem_id`, `unidade_saude_id`.

| Método | Endpoint                      | Descrição                                                       | Papéis Permitidos / Acesso          |
|--------|-------------------------------|-----------------------------------------------------------------|-------------------------------------|
| POST   | /chamadas/chamar              | Registra a chamada e publica evento no painel (SSE + WebSocket) | ADMINISTRADOR, MÉDICO, ENFERMEIRO   |
| GET    | /chamadas/ultimas             | Últimas 10 chamadas para o painel de TV (`?limite=10`)          | JWT **ou** `PAINEL_TV_TOKEN`        |
| GET    | /chamadas/fila                | Fila de pacientes triados aguardando chamada                    | ADMINISTRADOR, MÉDICO, ENFERMEIRO   |
| GET    | /chamadas                     | Histórico paginado (`?status=`, `?unidadeSaudeId=`)             | ADMINISTRADOR, MÉDICO, ENFERMEIRO   |
| GET    | /chamadas/:id                 | Detalhes da chamada                                             | ADMINISTRADOR, MÉDICO, ENFERMEIRO   |
| PATCH  | /chamadas/:id/finalizar       | Marca o atendimento como concluído (`status` FINALIZADO/CANCELADO) | ADMINISTRADOR, MÉDICO, ENFERMEIRO |
| PATCH  | /chamadas/:id/iniciar         | Paciente entrou no consultório (CHAMANDO → EM_ATENDIMENTO)       | ADMINISTRADOR, MÉDICO, ENFERMEIRO   |
| GET    | /chamadas/eventos             | Stream SSE do painel (EventSource)                              | JWT **ou** `PAINEL_TV_TOKEN`        |
| GET    | /chamadas/realtime            | Diagnóstico do canal em tempo real (conexões ativas)            | JWT **ou** `PAINEL_TV_TOKEN`        |
| WS     | /chamadas/ws                  | WebSocket do painel (`ws://<host>/api/chamadas/ws?token=...`)    | JWT **ou** `PAINEL_TV_TOKEN`        |

**Regras de negócio**: a senha é gerada automaticamente quando não enviada (prefixo `V` para Vermelho/Laranja, `A` para as demais, sequencial do dia, 3 dígitos); um paciente não pode ter duas chamadas abertas (409); a sala passa para `EM_ATENDIMENTO` ao receber a chamada e volta para `LIVRE` quando o atendimento é finalizado; sala `INATIVA` não recebe chamadas.

**Eventos publicados**: `chamada:criada`, `chamada:atualizada`, `chamada:finalizada`, `sala:atualizada`, `leito:atualizado`, `triagem:criada`.

### 2.8.2 Leitos e Internação (`/leitos`)

Tabela `leito`: `id`, `unidade_saude_id`, `nome_ou_numero` (ex.: "Leito 01"), `setor` (`SALA_VERMELHA`, `UTI_GERAL`, `ENFERMARIA`, `ISOLAMENTO`), `status` (`LIVRE`, `OCUPADO`, `HIGIENIZACAO`, `MANUTENCAO`, `ISOLAMENTO`), `paciente_id`, `ventilador_mecanico`, `monitor_cardiaco`, `diagnostico`.

| Método | Endpoint                | Descrição                                                        | Papéis Permitidos                  |
|--------|-------------------------|------------------------------------------------------------------|------------------------------------|
| GET    | /leitos?setor=SALA_VERMELHA | Lista leitos (filtros `setor`, `status`, `unidadeSaudeId`)     | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |
| GET    | /leitos/resumo          | Ocupação por status, taxa de ocupação e ventiladores disponíveis | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |
| GET    | /leitos/:id             | Detalhes do leito                                                | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |
| POST   | /leitos                 | Cria leito                                                       | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |
| PUT    | /leitos/:id             | Atualiza leito (internação, equipamentos, diagnóstico)           | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |
| PATCH  | /leitos/:id/status      | Atualiza apenas o status (livre/ocupado/higienização/manutenção)  | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |
| GET    | /sala-vermelha/leitos   | Leitos do setor SALA_VERMELHA                                    | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |

**Regras de negócio**: `OCUPADO` exige paciente vinculado (validado no DTO e no banco); `LIVRE` e `HIGIENIZACAO` limpam `paciente_id` e `diagnostico` (alta/saída para higienização); um paciente não pode ocupar dois leitos simultaneamente (409); `nomeOuNumero` é único por unidade (409).

### 2.8.3 Sala Vermelha (`/sala-vermelha`)

| Método | Endpoint             | Descrição                                                     | Papéis Permitidos                  |
|--------|----------------------|---------------------------------------------------------------|------------------------------------|
| GET    | /sala-vermelha/fila  | Triagens classificadas como **VERMELHO** aguardando chamada   | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |
| GET    | /sala-vermelha/leitos| Leitos do setor SALA_VERMELHA                                 | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |

Cada item da fila traz `triagemId`, `pacienteId`, `pacienteNome`, `senha`, `classificacaoRisco`, `prioridade`, `mewsScore`, `queixaPrincipal`, `minutosAguardando`, `tempoAlvoMinutos` e `excedeTempoAlvo`.

### 2.8.4 Triagem com Protocolo de Manchester + MEWS (`/triagens`)

A triagem grava a classificação de risco (`nivel_gravidade` / `classificacaoRisco`: VERMELHO, LARANJA, AMARELO, VERDE, AZUL), os sinais vitais em JSONB (`pressaoArterialSistolica`, `pressaoArterialDiastolica`, `frequenciaCardiaca`, `frequenciaRespiratoria`, `temperatura`, `saturacaoOxigenio`, `nivelDor`, `estadoConsciente`, `escalaAvpu`) e o **escore MEWS** (0–14).

| Método | Endpoint                                          | Descrição                                                        | Papéis Permitidos                  |
|--------|---------------------------------------------------|------------------------------------------------------------------|------------------------------------|
| POST   | /triagens                                         | Cria triagem (calcula classificação e MEWS automaticamente)       | ENFERMEIRO, ADMINISTRADOR          |
| GET    | /triagens                                         | Lista com paginação e filtros (`unidadeSaudeId`, `classificacaoRisco`, `pacienteId`, `mewsMinimo`) | ADMINISTRADOR, MÉDICO, ENFERMEIRO |
| GET    | /triagens/:id/mews                                | Escore MEWS da triagem (gravado + recalculado, faixa e conduta)   | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |
| GET    | /triagens/fila                                    | Mesma fila de `/sala-vermelha/fila`                               | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |
| GET    | /triagens/:id                                     | Detalhes da triagem                                               | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |
| PUT    | /triagens/:id                                     | Atualiza triagem                                                  | ENFERMEIRO, ADMINISTRADOR          |
| DELETE | /triagens/:id                                     | Soft delete                                                       | ENFERMEIRO, ADMINISTRADOR          |

**Compatibilidade**: sem parâmetros de paginação, `GET /api/triagens` continua devolvendo um **array** (contrato antigo, agora enriquecido com `mewsScore`, `classificacaoRisco`, `pacienteNome`); com `?pagina=&limite=` devolve `{data, paginacao}`.

**MEWS**: PAS ≤70 (3 pts) · FC ≤40 ou ≥130 (até 3 pts) · FR <9 ou ≥30 (até 3 pts) · temperatura <35 °C ou ≥38,5 °C (2 pts) · AVPU (0–3 pts). Faixas: 0–2 baixo, 3–4 moderado, ≥5 alto, ≥7 crítico.

### 2.8.5 Prontuário Eletrônico (PEP SOAP) (`/prontuarios`)

Tabela `prontuario`: `paciente_id`, `profissional_id` (exposto como `medicoId`), `unidade_saude_id`, `data_hora`, `subjetivo`, `objetivo`, `avaliacao`, `plano`, `cid10`, `cid10_secundarios`, `assinado_digitalmente`, `certificado_hash`.

| Método | Endpoint                  | Descrição                                                          | Papéis Permitidos                  |
|--------|---------------------------|--------------------------------------------------------------------|------------------------------------|
| GET    | /prontuarios              | Lista (filtros `pacienteId`, `unidadeSaudeId`, `profissionalId`, `cid10`, `apenasAssinados` + paginação) | ADMINISTRADOR, MÉDICO, ENFERMEIRO |
| POST   | /prontuarios              | Cria entrada SOAP (ao menos S, O, A, P ou descrição)                | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |
| GET    | /prontuarios/:id          | Detalhes                                                           | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |
| GET    | /prontuarios/pacientes/:pacienteId | Prontuários do paciente                                   | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |
| PUT    | /prontuarios/:id          | Atualiza conteúdo SOAP                                             | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |
| POST   | /prontuarios/:id/assinar  | Assina o prontuário (grava `certificadoHash` SHA-256; 409 se já assinado) | MEDICO (autor), ADMINISTRADOR |
| GET    | /prontuarios/:id/pdf      | Gera PDF anonimizado                                               | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |
| DELETE | /prontuarios/:id          | Soft delete                                                        | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |

> **Nota sobre assinatura**: `certificado_hash` é um **selo de integridade** (SHA-256 do conteúdo canônico) que detecta alteração posterior. Não substitui uma assinatura digital ICP-Brasil, que exigiria certificado A1/A3 do profissional.

### 2.8.6 Prescrições estruturadas (`/prescricoes`)

Tabela `prescricao`: `paciente_id`, `profissional_id`, `unidade_saude_id` (opcional — resolvida pelo vínculo do profissional), `medicamento`, `via`, `posologia`, `duracao`, `status` (`ATIVA`, `SUSPENSA`, `CANCELADA`, `CONCLUIDA`), `detalhes_prescricao` (legado), `cid10`.

| Método | Endpoint                          | Descrição                                                        | Papéis Permitidos                  |
|--------|-----------------------------------|------------------------------------------------------------------|------------------------------------|
| GET    | /prescricoes                      | Lista (filtros `pacienteId`, `unidadeSaudeId`, `profissionalId`, `status` + paginação) | ADMINISTRADOR, MÉDICO, ENFERMEIRO |
| POST   | /prescricoes                      | Cria prescrição (medicamento + posologia obrigatórios)            | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |
| GET    | /prescricoes/:id                  | Detalhes                                                          | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |
| GET    | /prescricoes/pacientes/:pacienteId| Prescrições do paciente                                           | MÉDICO, ENFERMEIRO                 |
| PUT    | /prescricoes/:id                  | Atualiza prescrição                                               | MÉDICO, ENFERMEIRO                 |
| GET    | /prescricoes/:id/pdf              | Gera PDF anonimizado                                              | ADMINISTRADOR, MÉDICO, ENFERMEIRO  |
| DELETE | /prescricoes/:id                  | Soft delete                                                       | MÉDICO                             |

**Regras de negócio**: cada prescrição gera automaticamente uma entrada no prontuário (campo `plano` do SOAP); ENFERMEIRO só prescreve em unidade do tipo UPA.

### 2.9 Unidades de Saúde (`/unidades-saude`)

| Método | Endpoint                                 | Descrição           | Papéis Permitidos |
|--------|------------------------------------------|---------------------|-------------------|
| POST   | /unidades-saude                          | Cria unidade        | ADMINISTRADOR     |
| GET    | /unidades-saude                          | Lista unidades      | ADMINISTRADOR     |
| GET    | /unidades-saude/:id                      | Detalhes da unidade | ADMINISTRADOR     |
| GET    | /unidades-saude/:id/funcionarios         | Lista funcionários  | ADMINISTRADOR     |
| PUT    | /unidades-saude/:id                      | Atualiza unidade    | ADMINISTRADOR     |
| DELETE | /unidades-saude/:id                      | Soft delete         | ADMINISTRADOR     |
| POST   | /unidades-saude/:id/funcionarios/:funcId | Associa funcionário | ADMINISTRADOR     |

### 2.10 Inteligência Artificial (`/ia`) — **Novo em 3.2.0**

Todos os relatórios são gerados com **dados agregados e anonimizados** (conformidade total com LGPD), utilizando Groq SDK para processamento rápido e respostas em português brasileiro.

| Método | Endpoint                                      | Descrição                                                                                  | Papéis Permitidos             | Parâmetros                          |
|--------|-----------------------------------------------|--------------------------------------------------------------------------------------------|-------------------------------|-------------------------------------|
| GET    | /ia/surto                                     | Relatório de risco de surto respiratório (global ou por unidade)                           | ADMINISTRADOR, MÉDICO         | `?unidade_saude_id=UUID` (opcional) |
| GET    | /ia/paciente/:pacienteId/recorrente           | Análise de padrões de recorrência de um paciente específico                                 | ADMINISTRADOR, MÉDICO         | `:pacienteId` obrigatório           |
| GET    | /ia/triagens/:unidadeSaudeId                  | Análise operacional de triagens (risco de sobrecarga e distribuição por gravidade)        | ADMINISTRADOR, MÉDICO         | `:unidadeSaudeId` obrigatório       |
| GET    | /ia/relatorios                                | Lista os últimos relatórios gerados (histórico completo)                                   | ADMINISTRADOR, MÉDICO         | `?limit=N` (padrão 20)              |
| GET    | /ia/relatorios/:id                            | Detalhes de um relatório específico                                                        | ADMINISTRADOR, MÉDICO         | `:id` obrigatório                   |

**Armazenamento**: Tabela `relatorios_ia` com colunas: `id`, `tipo` (`surto_j`, `triagem_unidade`, `recorrente`), `conteudo` (JSONB), `unidade_saude_id`, `criado_por`, criado_em.
**Conformidade LGPD**: Nenhum dado pessoal é enviado ao modelo de IA — apenas agregados mensais ou por unidade.

---

## 3. Considerações Técnicas

* **Segurança**: HTTPS, rate limiting, proteção contra brute force e SQL injection, auditoria completa.
* **Desempenho**: Latência média de 100–300ms (PDF/IA ~1–4s), cache Redis, paginação e joins otimizados.
* **Escalabilidade**: Preparado para milhares de usuários simultâneos.
* **IA**: Uso responsável — apenas dados agregados, respostas em PT-BR, recomendações práticas e clínicas.
