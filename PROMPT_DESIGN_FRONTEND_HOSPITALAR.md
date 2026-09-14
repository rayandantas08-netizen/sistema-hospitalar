# Prompt para criar o frontend do Sistema Hospitalar

Crie um sistema web hospitalar completo, bonito, profissional e responsivo chamado **Hospitalar**. O sistema deve funcionar como um painel operacional real para hospitais, UPAs e UBSs, com foco em clareza, velocidade, segurança e uso diário por equipes de saúde.

## Contexto técnico

O frontend deve ser preparado para consumir uma API REST existente:

- Base URL local: `http://localhost:3000/api`
- Autenticação: JWT no header `Authorization: Bearer <token>`
- Backend: Node.js, Express, TypeScript e Supabase
- Frontend desejado: HTML, CSS e JavaScript ou React com Vite
- Não criar dados falsos como se fossem reais quando a API estiver disponível
- Criar estados de loading, vazio, erro, sucesso e sessão expirada
- Nunca exibir ou incluir chaves, senhas ou valores do arquivo `.env`

## Direção visual

Crie uma interface com aparência de produto hospitalar premium, confiável e contemporâneo. Evite o visual genérico de dashboard administrativo.

- Estilo: clínico, calmo, humano, preciso e sofisticado
- Paleta principal: azul petróleo, azul claro, branco, cinza azulado e verde hospitalar
- Use vermelho, laranja, amarelo, verde e azul para níveis de prioridade da triagem
- Evite excesso de roxo, gradientes chamativos, cards decorativos e visual de landing page
- Use tipografia moderna e legível, com hierarquia clara
- Layout com sidebar, cabeçalho contextual, breadcrumbs, tabelas densas e painéis bem organizados
- Cards apenas quando representarem indicadores, alertas ou entidades repetidas
- Use ícones consistentes para navegação, ações, status, usuários, prontuários e configurações
- A interface deve funcionar muito bem em desktop, tablet e celular
- Use acessibilidade: contraste adequado, foco visível, labels, navegação por teclado e mensagens claras
- Inclua microinterações discretas: carregamento, confirmação, atualização de tabelas e transições curtas

## Perfis de acesso

O sistema possui três perfis:

1. **Administrador principal**
   - Acessa o dashboard geral
   - Cadastra, edita e desativa médicos e enfermeiros
   - Gerencia unidades de saúde
   - Visualiza pacientes, equipes, consultas e relatórios
   - Pode acessar relatórios operacionais e de IA

2. **Médico**
   - Visualiza pacientes
   - Consulta histórico clínico
   - Cria e acompanha consultas
   - Cria prontuários e prescrições
   - Analisa pacientes recorrentes
   - Visualiza indicadores clínicos permitidos

3. **Enfermeiro**
   - Visualiza pacientes
   - Cadastra e atualiza pacientes
   - Realiza triagens
   - Classifica pacientes por gravidade
   - Acompanha fila de atendimento
   - Pode atuar em prescrições e fluxos permitidos para a unidade

Esconda ações não permitidas para o perfil atual e, quando necessário, mostre uma mensagem de acesso negado.

## Telas obrigatórias

### 1. Login

Criar uma tela de login elegante e objetiva com:

- E-mail
- Senha
- Mostrar/ocultar senha
- Botão Entrar
- Link de recuperação de senha
- Link para cadastro do administrador principal
- Mensagens de credenciais inválidas, backend indisponível e sessão expirada
- Estado de carregamento no botão

### 2. Cadastro do administrador

Criar formulário completo dividido em seções:

- Dados pessoais: nome, CPF, CNS, data de nascimento, sexo, raça/cor e escolaridade
- Contato: e-mail e telefone
- Endereço: logradouro, número, bairro, cidade, estado e CEP
- Senha da conta
- Senha especial do administrador
- Validação de CPF com 11 dígitos
- Validação de CNS com 15 dígitos
- Validação de telefone com 10 ou 11 dígitos
- Validação de CEP com 8 dígitos
- Não preencher automaticamente a senha especial
- Exibir sucesso, erro de validação, e-mail já cadastrado e limite de requisições

### 3. Dashboard

Criar um dashboard operacional com:

- Total de pacientes ativos
- Total de médicos
- Total de enfermeiros
- Total de unidades de saúde
- Consultas do dia
- Triagens pendentes
- Distribuição de pacientes por gravidade
- Alertas clínicos e administrativos
- Atalhos para cadastrar paciente, criar consulta e iniciar triagem
- Gráficos simples, legíveis e úteis
- Filtro por unidade de saúde e período

### 4. Pacientes

Criar uma área completa de pacientes com:

- Tabela com nome, CPF, CNS, idade, telefone, unidade e status
- Busca por nome, CPF ou CNS
- Filtros por unidade, grupo de risco e status
- Paginação ou carregamento progressivo
- Cadastro de paciente
- Edição de paciente
- Desativação lógica com confirmação
- Página de detalhes do paciente
- Histórico clínico com abas para consultas, prontuários, prescrições e triagens
- Indicadores visuais para grupos de risco
- Consentimento LGPD obrigatório no cadastro

Campos do paciente:

- Nome
- CPF
- CNS
- Data de nascimento
- Sexo
- Raça/cor
- Escolaridade
- Telefone
- E-mail opcional
- Endereço completo
- Grupos de risco: idoso, gestante, diabético, hipertenso, imunossuprimido, criança, obeso e asmático
- Consentimento LGPD
- Unidade de saúde opcional

### 5. Médicos

Criar uma área de gestão de médicos para administradores:

- Lista com nome, CRM, e-mail, telefone, unidade e status
- Cadastro e edição
- Desativação lógica
- Filtros por unidade e status
- Perfil detalhado do profissional

Campos:

- Nome, CPF, CNS, data de nascimento
- Sexo, raça/cor e escolaridade
- Endereço, telefone e e-mail
- Senha inicial
- Data de contratação
- CRM no formato `12345-SP` ou `123456-SP`
- Unidade de saúde

### 6. Enfermeiros

Criar uma área equivalente à de médicos:

- Lista, busca e filtros
- Cadastro, edição e desativação
- Perfil detalhado
- Unidade de saúde

Campos adicionais:

- Senha inicial
- Data de contratação
- COREN no formato `123456-SP`

### 7. Unidades de saúde

Criar gerenciamento de unidades para administradores:

- Lista de unidades com nome, tipo, CNES, cidade, telefone e status
- Tipos: Hospital, UPA e UBS
- Cadastro e edição
- Associação de médicos, enfermeiros e pacientes
- Visualização da equipe da unidade
- Serviços essenciais e ampliados
- Endereço completo
- CNES com 7 dígitos

### 8. Consultas

Criar agenda e gestão de consultas:

- Lista por dia, semana e mês
- Filtros por paciente, médico, unidade e status
- Cadastro de consulta
- Observações e CID-10
- Status: agendada, em atendimento, concluída e cancelada
- Visualização do histórico do paciente
- Ações conforme o perfil do usuário

### 9. Triagem

Criar uma tela de triagem com fluxo rápido para enfermeiros:

- Seleção do paciente
- Unidade de saúde
- Queixa principal
- Pressão arterial sistólica e diastólica
- Frequência cardíaca
- Frequência respiratória
- Temperatura
- Saturação de oxigênio
- Nível de dor
- Estado consciente
- Classificação automática de gravidade

Exibir a classificação com cores e prazos:

- Vermelho: emergência, atendimento imediato
- Laranja: muito urgente, até 10 minutos
- Amarelo: urgente, até 60 minutos
- Verde: pouco urgente, até 120 minutos
- Azul: não urgente, até 240 minutos

Criar uma fila visual de atendimento ordenada por prioridade.

### 10. Prontuários e prescrições

Criar telas para:

- Lista de prontuários por paciente
- Criação e edição de registros clínicos
- CID-10
- Detalhes da prescrição
- Histórico cronológico
- Download de PDF quando disponível
- Avisos de privacidade e acesso restrito

### 11. Relatórios e inteligência artificial

Criar uma área de relatórios para administradores e médicos:

- Relatório de risco de surto respiratório
- Análise de paciente recorrente
- Análise operacional de triagens por unidade
- Histórico de relatórios gerados
- Filtro por tipo, unidade e período
- Indicadores, resumo executivo, recomendações e conteúdo completo
- Mostrar que os dados enviados para análise são agregados e anonimizados

## Componentes reutilizáveis

Crie componentes consistentes para:

- Sidebar responsiva
- Topbar com usuário e unidade atual
- Breadcrumbs
- Tabelas com ordenação, busca e paginação
- Modal de confirmação
- Drawer de detalhes
- Formulários por etapas
- Campos com máscara e validação
- Toasts de sucesso e erro
- Badges de status
- Skeleton loading
- Empty states
- Alertas de permissão
- Seletor de unidade de saúde
- Timeline clínica
- Cards de indicador
- Gráficos de triagem

## Rotas sugeridas

- `/login`
- `/cadastro-administrador`
- `/dashboard`
- `/pacientes`
- `/pacientes/:id`
- `/medicos`
- `/enfermeiros`
- `/unidades`
- `/consultas`
- `/triagem`
- `/prontuarios`
- `/prescricoes`
- `/relatorios`
- `/configuracoes`

## Regras importantes

- Não criar uma landing page de marketing: a primeira tela após o login deve ser o dashboard operacional.
- Não usar dados clínicos reais ou credenciais reais no código.
- Não colocar segredos no frontend.
- Não esconder erros silenciosamente.
- Usar confirmação antes de desativar registros.
- Preservar dados clínicos e identificar claramente alterações salvas.
- Mostrar unidade e perfil atual no contexto das telas.
- Manter tabelas legíveis mesmo com muitos registros.
- Criar uma experiência visual bonita, mas subordinada à segurança, legibilidade e rapidez do trabalho hospitalar.

Entregue o frontend completo com dados conectados à API, rotas protegidas por perfil, validação de formulários, estados de carregamento e tratamento de erros. Gere também uma versão responsiva e refinada para desktop e celular.
