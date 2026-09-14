begin;

create table if not exists public.fornecedor (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text,
  cnpj varchar(14) not null unique,
  contato text,
  telefone varchar(11),
  email text,
  endereco jsonb,
  ativo boolean not null default true,
  criado_por uuid references public.funcionario(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medicamento (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  principio_ativo text not null,
  forma_farmaceutica text not null,
  unidade_medida text not null default 'unidade',
  codigo_barras text,
  fabricante text,
  controlado boolean not null default false,
  ativo boolean not null default true,
  criado_por uuid references public.funcionario(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estoque_lote (
  id uuid primary key default gen_random_uuid(),
  medicamento_id uuid not null references public.medicamento(id),
  unidade_saude_id uuid not null references public.unidade_saude(id),
  fornecedor_id uuid references public.fornecedor(id),
  lote text not null,
  validade date not null,
  quantidade integer not null default 0 check (quantidade >= 0),
  quantidade_minima integer not null default 0 check (quantidade_minima >= 0),
  custo_unitario numeric(12,2),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (medicamento_id, unidade_saude_id, lote)
);

create table if not exists public.movimentacao_estoque (
  id uuid primary key default gen_random_uuid(),
  estoque_lote_id uuid not null references public.estoque_lote(id),
  tipo text not null check (tipo in ('ENTRADA', 'SAIDA', 'AJUSTE', 'TRANSFERENCIA')), 
  quantidade integer not null check (quantidade > 0),
  unidade_origem_id uuid references public.unidade_saude(id),
  unidade_destino_id uuid references public.unidade_saude(id),
  observacao text,
  nota_fiscal_id uuid,
  criado_por uuid not null references public.funcionario(id),
  created_at timestamptz not null default now()
);

create table if not exists public.solicitacao_compra (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  unidade_saude_id uuid not null references public.unidade_saude(id),
  solicitante_id uuid not null references public.funcionario(id),
  status text not null default 'PENDENTE' check (status in ('PENDENTE', 'APROVADA', 'REJEITADA', 'RECEBIDA', 'CANCELADA')),
  justificativa text,
  valor_estimado numeric(12,2) not null default 0,
  aprovado_por uuid references public.funcionario(id),
  aprovado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.solicitacao_compra_item (
  id uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references public.solicitacao_compra(id) on delete cascade,
  medicamento_id uuid not null references public.medicamento(id),
  quantidade integer not null check (quantidade > 0),
  valor_unitario_estimado numeric(12,2),
  observacao text
);

create table if not exists public.nota_fiscal (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  chave_acesso text unique,
  fornecedor_id uuid not null references public.fornecedor(id),
  unidade_saude_id uuid not null references public.unidade_saude(id),
  data_emissao date,
  data_recebimento date not null default current_date,
  valor_total numeric(12,2) not null default 0,
  status text not null default 'CONFERENCIA' check (status in ('LANCADA', 'CONFERENCIA', 'RECEBIDA', 'CANCELADA')),
  observacao text,
  lancado_por uuid not null references public.funcionario(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nota_fiscal_item (
  id uuid primary key default gen_random_uuid(),
  nota_fiscal_id uuid not null references public.nota_fiscal(id) on delete cascade,
  medicamento_id uuid not null references public.medicamento(id),
  lote text not null,
  validade date not null,
  quantidade integer not null check (quantidade > 0),
  valor_unitario numeric(12,2) not null default 0
);

create table if not exists public.dispensacao (
  id uuid primary key default gen_random_uuid(),
  prescricao_id uuid not null references public.prescricao(id),
  paciente_id uuid not null references public.paciente(id),
  medicamento_id uuid not null references public.medicamento(id),
  estoque_lote_id uuid not null references public.estoque_lote(id),
  unidade_saude_id uuid not null references public.unidade_saude(id),
  quantidade integer not null check (quantidade > 0),
  dispensado_por uuid not null references public.funcionario(id),
  observacao text,
  created_at timestamptz not null default now()
);

alter table public.movimentacao_estoque
  drop constraint if exists movimentacao_estoque_nota_fiscal_id_fkey;

alter table public.movimentacao_estoque
  add constraint movimentacao_estoque_nota_fiscal_id_fkey
  foreign key (nota_fiscal_id) references public.nota_fiscal(id);

create index if not exists idx_estoque_unidade on public.estoque_lote(unidade_saude_id, ativo);
create index if not exists idx_estoque_validade on public.estoque_lote(validade);
create index if not exists idx_movimentacao_lote on public.movimentacao_estoque(estoque_lote_id, created_at);
create index if not exists idx_solicitacao_unidade_status on public.solicitacao_compra(unidade_saude_id, status);
create index if not exists idx_nota_fiscal_unidade_status on public.nota_fiscal(unidade_saude_id, status);
create index if not exists idx_dispensacao_paciente on public.dispensacao(paciente_id, created_at);

commit;
