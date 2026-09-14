# Contrato das abas versus backend

## Status geral

As abas de pacientes, médicos e enfermeiros possuem endpoints e DTOs no backend. As abas de unidades, consultas, triagem, prontuários e prescrições também possuem endpoints. Farmácia, estoque, movimentações, dispensação, compras, notas fiscais e fornecedores possuem tabelas no Supabase, mas ainda não possuem rotas/controllers/services no backend.

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
