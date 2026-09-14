begin;

create table if not exists public.funcionario (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  cpf varchar(11) not null unique,
  cns varchar(15) not null unique,
  data_nascimento date not null,
  sexo text not null,
  raca_cor text not null,
  escolaridade text not null,
  endereco_logradouro text not null,
  endereco_numero text not null,
  endereco_complemento text,
  endereco_bairro text not null,
  endereco_cidade text not null,
  endereco_estado varchar(2) not null,
  endereco_cep varchar(8) not null,
  telefone varchar(11) not null,
  grupos_risco text[] default '{}',
  consentimento_lgpd boolean not null default true,
  papel text not null,
  data_contratacao date not null default current_date,
  crm text unique,
  coren text unique,
  criado_por uuid references public.funcionario(id),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.unidade_saude (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null,
  cnes varchar(7) not null unique,
  endereco_logradouro text not null,
  endereco_numero text not null,
  endereco_complemento text,
  endereco_bairro text not null,
  endereco_cidade text not null,
  endereco_estado varchar(2) not null,
  endereco_cep varchar(8) not null,
  telefone varchar(11) not null,
  servicos_essenciais text[] not null default '{}',
  servicos_ampliados text[] not null default '{}',
  criado_por uuid references public.funcionario(id),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.paciente (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf varchar(11) not null unique,
  cns varchar(15) not null unique,
  data_nascimento date not null,
  sexo text not null,
  raca_cor text not null,
  escolaridade text not null,
  endereco_logradouro text not null,
  endereco_numero text not null,
  endereco_complemento text,
  endereco_bairro text not null,
  endereco_cidade text not null,
  endereco_estado varchar(2) not null,
  endereco_cep varchar(8) not null,
  telefone varchar(11) not null,
  email text,
  grupos_risco text[] default '{}',
  consentimento_lgpd boolean not null default false,
  criado_por uuid not null references public.funcionario(id),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.funcionario_unidade (
  funcionario_id uuid not null references public.funcionario(id) on delete cascade,
  unidade_saude_id uuid not null references public.unidade_saude(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (funcionario_id, unidade_saude_id)
);

create table if not exists public.paciente_unidade (
  paciente_id uuid not null references public.paciente(id) on delete cascade,
  unidade_saude_id uuid not null references public.unidade_saude(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (paciente_id, unidade_saude_id)
);

create table if not exists public.consulta (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.paciente(id),
  medico_id uuid not null references public.funcionario(id),
  unidade_saude_id uuid not null references public.unidade_saude(id),
  observacoes text not null,
  cid10 text,
  data_consulta timestamptz not null default now(),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prontuario (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.paciente(id),
  profissional_id uuid not null references public.funcionario(id),
  unidade_saude_id uuid not null references public.unidade_saude(id),
  descricao text not null,
  cid10 text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prescricao (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.paciente(id),
  profissional_id uuid not null references public.funcionario(id),
  unidade_saude_id uuid not null references public.unidade_saude(id),
  detalhes_prescricao text not null,
  cid10 text not null,
  data_criacao timestamptz not null default now(),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.triagem (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.paciente(id),
  enfermeiro_id uuid not null references public.funcionario(id),
  unidade_saude_id uuid not null references public.unidade_saude(id),
  nivel_gravidade text not null,
  sinais_vitais jsonb not null,
  queixa_principal text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.relatorios_ia (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  resumo text,
  indicadores jsonb,
  recomendacoes jsonb,
  conteudo text,
  dados_agregados jsonb,
  unidade_saude_id uuid references public.unidade_saude(id),
  criado_por uuid references public.funcionario(id),
  criado_em timestamptz not null default now()
);

create index if not exists idx_funcionario_papel_ativo on public.funcionario(papel, ativo);
create index if not exists idx_paciente_ativo on public.paciente(ativo);
create index if not exists idx_consulta_paciente on public.consulta(paciente_id, ativo);
create index if not exists idx_triagem_paciente on public.triagem(paciente_id, ativo);
create index if not exists idx_triagem_created_at on public.triagem(created_at);
create index if not exists idx_prescricao_paciente on public.prescricao(paciente_id, ativo);

commit;
