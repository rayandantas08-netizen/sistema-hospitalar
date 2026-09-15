-- ----------------------------------------------------------------------------
-- Sala da triagem
--
-- Permite registrar em qual sala/consultório a triagem aconteceu. O frontend
-- passa a exibir um seletor de sala no formulário de classificação de risco e
-- o médico consegue saber para onde direcionar a chamada do paciente.
--
-- Nullable propositalmente: triagens antigas e clientes que ainda não enviam
-- salaId continuam funcionando sem migração de dados.
-- ----------------------------------------------------------------------------
alter table public.triagem
  add column if not exists sala_id uuid references public.sala(id);

-- A fila de atendimento por sala usa este índice (sala + ordem de chegada).
create index if not exists idx_triagem_sala
  on public.triagem (sala_id, nivel_gravidade, created_at)
  where ativo;
