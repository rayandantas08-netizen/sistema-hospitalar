-- ============================================================================
-- Sistema Hospitalar — Salas, Chamadas de Pacientes, Leitos, MEWS e PEP SOAP
-- ============================================================================
-- Esta migration adiciona tudo o que o frontend precisa para:
--   1. Salas por unidade de saúde
--   2. Chamadas de pacientes (painel de TV) + fila de triados
--   3. Leitos (Sala Vermelha / UTI / Enfermaria / Isolamento)
--   4. Classificação de risco (Protocolo de Manchester) + escore MEWS
--   5. Prontuário eletrônico estruturado (SOAP) + prescrições estruturadas
--
-- Convenção de nomes: este banco usa nomes de tabela/coluna em snake_case e
-- SINGULAR (paciente, triagem, funcionario, consulta...). As tabelas novas
-- seguem a mesma convenção (sala, chamada, leito) — os endpoints REST expõem
-- os nomes em camelCase exatamente como o frontend espera.
--
-- A migration é IDEMPOTENTE: pode ser reaplicada sem erro.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Utilitário: manter updated_at sempre atualizado (o schema original criou
--    as colunas updated_at mas nenhum trigger que as alimentasse).
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- 1. SALAS
--    Cada sala pertence a uma unidade de saúde e pode ter um responsável
--    (médico ou enfermeiro). O backend valida o papel do responsável.
-- ----------------------------------------------------------------------------
create table if not exists public.sala (
  id                uuid primary key default gen_random_uuid(),
  unidade_saude_id  uuid not null references public.unidade_saude(id) on delete cascade,
  nome              text not null,
  tipo              text not null,
  responsavel_id    uuid references public.funcionario(id),
  status            text not null default 'LIVRE',
  ativo             boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint sala_status_check
    check (status in ('LIVRE', 'EM_ATENDIMENTO', 'MONITORADA', 'INATIVA'))
);

-- Uma unidade não pode ter duas salas ativas com o mesmo nome.
create unique index if not exists uq_sala_unidade_nome
  on public.sala (unidade_saude_id, lower(nome))
  where ativo;

create index if not exists idx_sala_unidade on public.sala (unidade_saude_id, ativo);
create index if not exists idx_sala_status on public.sala (status) where ativo;
create index if not exists idx_sala_responsavel on public.sala (responsavel_id);

drop trigger if exists trg_sala_updated_at on public.sala;
create trigger trg_sala_updated_at
  before update on public.sala
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. LEITOS
--    Regra de negócio garantida no banco: leito OCUPADO exige paciente.
-- ----------------------------------------------------------------------------
create table if not exists public.leito (
  id                   uuid primary key default gen_random_uuid(),
  unidade_saude_id     uuid not null references public.unidade_saude(id) on delete cascade,
  nome_ou_numero       text not null,
  setor                text not null default 'SALA_VERMELHA',
  status               text not null default 'LIVRE',
  paciente_id          uuid references public.paciente(id),
  ventilador_mecanico  boolean not null default false,
  monitor_cardiaco     boolean not null default true,
  diagnostico          text,
  ativo                boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint leito_setor_check
    check (setor in ('SALA_VERMELHA', 'UTI_GERAL', 'ENFERMARIA', 'ISOLAMENTO')),
  constraint leito_status_check
    check (status in ('LIVRE', 'OCUPADO', 'HIGIENIZACAO', 'MANUTENCAO', 'ISOLAMENTO')),
  constraint leito_ocupado_exige_paciente
    check (status <> 'OCUPADO' or paciente_id is not null)
);

create unique index if not exists uq_leito_unidade_nome
  on public.leito (unidade_saude_id, lower(nome_ou_numero))
  where ativo;

create index if not exists idx_leito_unidade_setor on public.leito (unidade_saude_id, setor, ativo);
create index if not exists idx_leito_status on public.leito (status) where ativo;
create index if not exists idx_leito_paciente on public.leito (paciente_id) where paciente_id is not null;

drop trigger if exists trg_leito_updated_at on public.leito;
create trigger trg_leito_updated_at
  before update on public.leito
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. CHAMADAS DE PACIENTES (painel de TV + consultório)
--    `sala_id` é a referência forte; `sala` guarda o nome denormalizado para o
--    painel de TV responder sem join (o frontend aceita um dos dois).
--    `unidade_saude_id` permite filtrar as chamadas por unidade no painel.
-- ----------------------------------------------------------------------------
create table if not exists public.chamada (
  id                uuid primary key default gen_random_uuid(),
  paciente_id       uuid not null references public.paciente(id),
  sala_id           uuid references public.sala(id) on delete set null,
  sala              text,
  senha             varchar(10) not null,
  prioridade        text not null,
  status            text not null default 'CHAMANDO',
  chamado_em        timestamptz not null default now(),
  atendido_em       timestamptz,
  finalizado_em     timestamptz,
  profissional_id   uuid references public.funcionario(id),
  triagem_id        uuid references public.triagem(id),
  unidade_saude_id  uuid references public.unidade_saude(id),
  ativo             boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- aceita 'Vermelho' (padrão do painel) e 'VERMELHO' (padrão da triagem)
  constraint chamada_prioridade_check
    check (upper(prioridade) in ('VERMELHO', 'LARANJA', 'AMARELO', 'VERDE', 'AZUL')),
  constraint chamada_status_check
    check (status in ('CHAMANDO', 'EM_ATENDIMENTO', 'FINALIZADO', 'CANCELADO')),
  -- uma chamada precisa apontar para uma sala (por id ou por nome)
  constraint chamada_sala_obrigatoria
    check (sala_id is not null or sala is not null)
);

create index if not exists idx_chamada_painel
  on public.chamada (chamado_em desc) where ativo;
create index if not exists idx_chamada_unidade
  on public.chamada (unidade_saude_id, chamado_em desc) where ativo;
create index if not exists idx_chamada_paciente on public.chamada (paciente_id, ativo);
create index if not exists idx_chamada_status on public.chamada (status) where ativo;
create index if not exists idx_chamada_sala on public.chamada (sala_id);

drop trigger if exists trg_chamada_updated_at on public.chamada;
create trigger trg_chamada_updated_at
  before update on public.chamada
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. TRIAGEM: escore MEWS + alias de classificação de risco
--    `nivel_gravidade` continua sendo a ÚNICA fonte de verdade (já é usada
--    pelo PrioridadeService). `classificacao_risco` é uma coluna gerada que
--    espelha o mesmo valor, evitando que os dois campos divirjam quando o
--    frontend lê a tabela diretamente.
-- ----------------------------------------------------------------------------
-- A escala AVPU vive DENTRO de `sinais_vitais` (jsonb), como o frontend envia;
-- só o resultado do escore vira coluna, para permitir ordenar/filtrar a fila.
alter table public.triagem add column if not exists mews_score integer;
alter table public.triagem
  add column if not exists classificacao_risco text
  generated always as (nivel_gravidade) stored;

-- NOT VALID: não revalida linhas antigas (pode haver dados legados), mas passa
-- a valer para todo insert/update novo.
alter table public.triagem drop constraint if exists triagem_mews_check;
alter table public.triagem
  add constraint triagem_mews_check
  check (mews_score is null or (mews_score >= 0 and mews_score <= 14)) not valid;

alter table public.triagem drop constraint if exists triagem_classificacao_check;
alter table public.triagem
  add constraint triagem_classificacao_check
  check (upper(nivel_gravidade) in ('VERMELHO', 'LARANJA', 'AMARELO', 'VERDE', 'AZUL')) not valid;

create index if not exists idx_triagem_fila_unidade
  on public.triagem (unidade_saude_id, nivel_gravidade, created_at)
  where ativo;
create index if not exists idx_triagem_sala_vermelha
  on public.triagem (unidade_saude_id, created_at)
  where ativo and upper(nivel_gravidade) = 'VERMELHO';

-- ----------------------------------------------------------------------------
-- 5. PRONTUÁRIO (PEP estruturado SOAP)
--    `descricao` continua existindo (nullable) para não quebrar registros
--    antigos nem o fluxo automático de prescrições.
-- ----------------------------------------------------------------------------
alter table public.prontuario add column if not exists data_hora timestamptz not null default now();
alter table public.prontuario add column if not exists subjetivo text;
alter table public.prontuario add column if not exists objetivo text;
alter table public.prontuario add column if not exists avaliacao text;
alter table public.prontuario add column if not exists plano text;
alter table public.prontuario add column if not exists assinado_digitalmente boolean not null default false;
alter table public.prontuario add column if not exists certificado_hash varchar(128);
alter table public.prontuario add column if not exists cid10_secundarios text[] default '{}';
alter table public.prontuario alter column descricao drop not null;

alter table public.prontuario drop constraint if exists prontuario_assinatura_check;
alter table public.prontuario
  add constraint prontuario_assinatura_check
  check (not assinado_digitalmente or certificado_hash is not null) not valid;

alter table public.prontuario drop constraint if exists prontuario_conteudo_check;
alter table public.prontuario
  add constraint prontuario_conteudo_check
  check (
    descricao is not null
    or subjetivo is not null
    or objetivo is not null
    or avaliacao is not null
    or plano is not null
  ) not valid;

create index if not exists idx_prontuario_data_hora on public.prontuario (data_hora desc) where ativo;
create index if not exists idx_prontuario_unidade on public.prontuario (unidade_saude_id, ativo);

drop trigger if exists trg_prontuario_updated_at on public.prontuario;
create trigger trg_prontuario_updated_at
  before update on public.prontuario
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. PRESCRIÇÃO estruturada
--    `detalhes_prescricao` e `cid10` passam a ser opcionais (o frontend novo
--    envia medicamento/via/posologia/duração) e `unidade_saude_id` também,
--    pois o backend resolve a unidade pelo profissional autenticado quando o
--    formulário não envia o campo.
-- ----------------------------------------------------------------------------
alter table public.prescricao add column if not exists medicamento text;
alter table public.prescricao add column if not exists via text;
alter table public.prescricao add column if not exists posologia text;
alter table public.prescricao add column if not exists duracao text;
alter table public.prescricao add column if not exists status text not null default 'ATIVA';
alter table public.prescricao alter column detalhes_prescricao drop not null;
alter table public.prescricao alter column cid10 drop not null;
alter table public.prescricao alter column unidade_saude_id drop not null;

alter table public.prescricao drop constraint if exists prescricao_status_check;
alter table public.prescricao
  add constraint prescricao_status_check
  check (status in ('ATIVA', 'SUSPENSA', 'CANCELADA', 'CONCLUIDA')) not valid;

alter table public.prescricao drop constraint if exists prescricao_conteudo_check;
alter table public.prescricao
  add constraint prescricao_conteudo_check
  check (
    detalhes_prescricao is not null
    or (medicamento is not null and posologia is not null)
  ) not valid;

create index if not exists idx_prescricao_status on public.prescricao (status, ativo) ;
create index if not exists idx_prescricao_unidade on public.prescricao (unidade_saude_id, ativo);

drop trigger if exists trg_prescricao_updated_at on public.prescricao;
create trigger trg_prescricao_updated_at
  before update on public.prescricao
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. CORREÇÃO: coluna data_desativacao
--    Os services já faziam soft delete gravando `data_desativacao`, mas a
--    coluna nunca existiu no schema — ou seja, DELETE /api/triagens/:id,
--    /api/prontuarios/:id e /api/prescricoes/:id falhavam no banco.
-- ----------------------------------------------------------------------------
alter table public.funcionario  add column if not exists data_desativacao timestamptz;
alter table public.unidade_saude add column if not exists data_desativacao timestamptz;
alter table public.paciente     add column if not exists data_desativacao timestamptz;
alter table public.consulta     add column if not exists data_desativacao timestamptz;
alter table public.prontuario   add column if not exists data_desativacao timestamptz;
alter table public.prescricao   add column if not exists data_desativacao timestamptz;
alter table public.triagem      add column if not exists data_desativacao timestamptz;
alter table public.sala         add column if not exists data_desativacao timestamptz;
alter table public.leito        add column if not exists data_desativacao timestamptz;

-- Triggers de updated_at nas tabelas legadas deste bloco.
drop trigger if exists trg_triagem_updated_at on public.triagem;
create trigger trg_triagem_updated_at
  before update on public.triagem
  for each row execute function public.set_updated_at();

drop trigger if exists trg_paciente_updated_at on public.paciente;
create trigger trg_paciente_updated_at
  before update on public.paciente
  for each row execute function public.set_updated_at();

drop trigger if exists trg_consulta_updated_at on public.consulta;
create trigger trg_consulta_updated_at
  before update on public.consulta
  for each row execute function public.set_updated_at();

commit;
