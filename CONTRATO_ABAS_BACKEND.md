# Contrato das abas versus backend

## Status geral

As abas de pacientes, médicos e enfermeiros possuem endpoints e DTOs no backend. As abas de unidades, consultas, triagem, prontuários e prescrições também possuem endpoints. Farmácia, estoque, movimentações, dispensação, compras, notas fiscais e fornecedores possuem tabelas no Supabase, mas ainda não possuem rotas/controllers/services no backend.

Implementado nesta rodada (chamadas de pacientes, salas e leitos):

- **Salas**: `GET/POST /api/salas`, `GET/PUT/DELETE /api/salas/:id`, `GET /api/unidades/:unidadeSaudeId/salas` (alias `/api/unidades-saude/:unidadeSaudeId/salas`)
- **Chamadas / Painel de TV**: `POST /api/chamadas/chamar`, `GET /api/chamadas/ultimas`, `GET /api/chamadas/fila`, `PATCH /api/chamadas/:id/finalizar`, `PATCH /api/chamadas/:id/iniciar`, `GET /api/chamadas/eventos` (SSE), `ws://<host>/api/chamadas/ws`
- **Leitos**: `GET/POST /api/leitos`, `PATCH /api/leitos/:id/status`, `PUT /api/leitos/:id`, `GET /api/leitos/resumo`, `GET /api/sala-vermelha/leitos`
- **Sala Vermelha**: `GET /api/sala-vermelha/fila`
- **Triagem**: `GET /api/triagens` com paginação/filtros e `GET /api/triagens/:id/mews`
- **PEP SOAP**: `POST /api/prontuarios/:id/assinar` e campos SOAP no `POST /api/prontuarios`

### Paginação e filtros (padrão novo)

Endpoints de listagem aceitam `?pagina=1&limite=20` (ou `page`/`limit`) e devolvem:

```json
{
  "data": [ ... ],
  "paginacao": { "pagina": 1, "limite": 20, "total": 42, "totalPaginas": 3 }
}
```

`GET /api/triagens`, `GET /api/prontuarios` e `GET /api/prescricoes` mantêm o **array simples** quando nenhum parâmetro de paginação/filtro é enviado (compatibilidade com o contrato antigo) e passam a devolver o envelope acima quando há paginação.

### Salas — campos

`POST /api/salas` obrigatórios: `unidadeSaudeId`, `nome`, `tipo`. Opcionais: `responsavelId` (médico ou enfermeiro ativo; `null` limpa), `status` (`LIVRE` padrão, `EM_ATENDIMENTO`, `MONITORADA`, `INATIVA`).

Resposta de cada sala: `id`, `unidadeSaudeId`, `unidadeNome`, `nome`, `tipo`, `responsavelId`, `responsavelNome`, `responsavelPapel`, `status`, `ativo`.

### Chamadas — campos

`POST /api/chamadas/chamar` — informe `pacienteId` **ou** `triagemId`; e `salaId` **ou** `sala` (nome). Opcionais: `senha` (gerada automaticamente se ausente), `prioridade` (aceita `Vermelho` ou `VERMELHO`; obrigatória quando não há `triagemId`), `profissionalId` (padrão: usuário autenticado).

A resposta (e o evento do painel) traz: `id`, `pacienteId`, `pacienteNome`, `senha`, `prioridade`, `status`, `salaId`, `sala`, `unidadeSaudeId`, `chamadoEm`, `atendidoEm`, `finalizadoEm`, `profissionalId`, `profissionalNome`.

### Leitos — campos

`POST /api/leitos` obrigatórios: `unidadeSaudeId`, `nomeOuNumero`. Opcionais: `setor` (padrão `SALA_VERMELHA`), `status` (padrão `LIVRE`), `pacienteId`, `ventiladorMecanico` (padrão `false`), `monitorCardiaco` (padrão `true`), `diagnostico`.

`PATCH /api/leitos/:id/status` aceita `{ "status": "OCUPADO", "pacienteId": "<uuid>", "diagnostico": "..." }`. Para `LIVRE`/`HIGIENIZACAO` não envie paciente: o backend limpa os vínculos.

### Triagem — escore MEWS

`POST /api/triagens` continua igual (o `enfermeiroId` vem do token e a classificação é calculada pelo backend), com um campo novo opcional dentro de `sinaisVitais`: `escalaAvpu` (`ALERTA`, `VOZ`, `DOR`, `IRRESPONSIVO`). O backend calcula o escore **MEWS** (0–14) e o devolve como `mewsScore`; `GET /api/triagens/:id/mews` detalha a pontuação, a faixa de risco e a conduta sugerida.

### Prontuário — SOAP

`POST /api/prontuarios` passa a aceitar `subjetivo`, `objetivo`, `avaliacao`, `plano` (ao menos um), mais `cid10`, `cid10Secundarios`, `assinadoDigitalmente` e `dataHora`. `unidadeSaudeId` é opcional: quando ausente, o backend resolve pelo vínculo do profissional. `POST /api/prontuarios/:id/assinar` grava o `certificadoHash` (selo SHA-256 de integridade — não é assinatura ICP-Brasil).

### Prescrição estruturada

`POST /api/prescricoes` obrigatórios: `pacienteId` + (`medicamento` e `posologia`) **ou** `detalhesPrescricao` (formato antigo, ainda aceito). Opcionais: `via`, `duracao`, `status`, `cid10`, `unidadeSaudeId` (resolvida pelo vínculo quando ausente). O backend lança automaticamente uma entrada no prontuário (campo `plano`).

## Campos obrigatórios por aba

### Pacientes: `POST /api/pacientes`

Obrigatórios:

- `nome`
- `cpf`: 11 dígitos
- `cns`: 15 dígitos
- `dataNascimento`
- `sexo`: `MASCULINO`, `FEMININO` ou `OUTRO`
- `racaCor`: `BRANCA`, `PRETA`, `PARDA`, `AMARELA`, `INDIGENA` ou `NAO_DECLARADO`
- `escolaridade`
- `endereco.logradouro`, `numero`, `bairro`, `cidade`, `estado`, `cep`
- `telefone`: 10 ou 11 dígitos
- `consentimentoLGPD`: deve ser `true`

Opcionais:

- `email`
- `gruposRisco`
- `unidadeSaudeId`

### Médicos: `POST /api/medicos`

Obrigatórios:

- Todos os dados pessoais de paciente, exceto `gruposRisco` e `consentimentoLGPD`
- `email` na prática é obrigatório no service, embora o DTO o marque opcional
- `senha`: mínimo de 5 caracteres no DTO
- `dataContratacao`
- `crm`: formato aceito pelo service `12345-SP` ou `123456-SP`

Opcional:

- `unidadeSaudeId`

### Enfermeiros: `POST /api/enfermeiros`

Obrigatórios:

- `nome`, `cpf`, `cns`, `dataNascimento`
- `sexo`, `racaCor`, `escolaridade`
- endereço completo
- `telefone`, `email`
- `senha`: mínimo de 8 caracteres
- `dataContratacao`
- `coren`: formato `123456-SP`

Opcional:

- `unidadeSaudeId`

### Unidades: `POST /api/unidades-saude`

Obrigatórios:

- `nome`
- `tipo`: `UBS`, `UPA` ou `HOSPITAL`
- `cnes`: 7 dígitos
- `endereco.logradouro`, `numero`, `bairro`, `cidade`, `estado` com 2 caracteres e `cep` com 8 dígitos
- `telefone`
- `servicosEssenciais`: array com pelo menos um serviço

Opcional:

- `endereco.complemento`
- `servicosAmpliados`

### Consultas: `POST /api/consultas`

Obrigatórios:

- `pacienteId`: UUID
- `unidadeSaudeId`: UUID
- `observacoes`: mínimo de 10 caracteres

Opcional:

- `cid10`

O backend define o médico pelo usuário autenticado e define `data_consulta` automaticamente. Portanto, o formulário não deve exigir médico, data ou horário neste contrato atual.

### Triagem: `POST /api/triagens`

Obrigatórios:

- `pacienteId`: UUID
- `unidadeSaudeId`: UUID
- `queixaPrincipal`
- `sinaisVitais.pressaoArterialSistolica`
- `sinaisVitais.pressaoArterialDiastolica`
- `sinaisVitais.frequenciaCardiaca`
- `sinaisVitais.frequenciaRespiratoria`
- `sinaisVitais.temperatura`
- `sinaisVitais.saturacaoOxigenio`
- `sinaisVitais.nivelDor`
- `sinaisVitais.estadoConsciente`: boolean

O `enfermeiroId` é obtido do usuário autenticado e `nivelGravidade` é calculado pelo backend. Não deve ser digitado pelo usuário.

### Prontuários: `POST /api/prontuarios`

Obrigatórios:

- `pacienteId`: UUID
- `unidadeSaudeId`: UUID
- `descricao`: mínimo de 10 caracteres
- `cid10`: CID-10 válido

O profissional é obtido do usuário autenticado pelo backend.

### Prescrições: `POST /api/prescricoes`

Obrigatórios:

- `pacienteId`: UUID
- `unidadeSaudeId`: UUID
- `detalhesPrescricao`: mínimo de 10 caracteres
- `cid10`: CID-10 válido

O profissional é obtido do usuário autenticado pelo backend.

## Abas sem contrato HTTP implementado

As tabelas existem no Supabase, mas ainda faltam endpoints para:

- Farmácia
- Estoque
- Movimentações
- Dispensação
- Solicitações de compra
- Notas fiscais
- Fornecedores

Os formulários dessas abas podem existir visualmente, mas não devem informar que salvaram no banco até que controllers, DTOs, services e rotas sejam criados.

## Divergências corrigidas no frontend

- Consulta não deve pedir médico, data e horário como campos obrigatórios.
- Consulta precisa pedir unidade de saúde.
- Triagem precisa pedir unidade e todos os sinais vitais, inclusive estado consciente.
- Triagem não deve pedir enfermeiro nem classificação manual.
- Prontuário precisa pedir unidade de saúde.
- Prescrição precisa pedir unidade de saúde.
- Unidade precisa pedir endereço completo, telefone e serviços essenciais.
- Paciente precisa permitir grupos de risco e unidade de saúde.
