-- ============================================================================
-- Seed inicial de INFRAESTRUTURA (idempotente)
-- ============================================================================
-- Insere a estrutura física mínima para o sistema ser utilizável em um banco
-- vazio, sem depender de nenhum usuário autenticado:
--
--   * 1 unidade: "Hospital Central de Clínicas"
--   * 4 salas: Consultório 01, Consultório 03, Consultório 05 e Sala Vermelha
--   * 6 leitos na Sala Vermelha (Leito 01 ao Leito 06)
--
-- O usuário ADMINISTRADOR_PRINCIPAL NÃO é criado aqui de propósito: no
-- Supabase a senha vive em `auth.users` e é gerada/validada pelo GoTrue (que
-- usa bcrypt). Criar esse usuário exige a service-role key, por isso essa parte
-- fica no seed TypeScript: `npm run seed` (src/scripts/seed.ts).
--
-- Seguro para reexecutar: só insere o que ainda não existe.
-- ============================================================================

begin;

do $$
declare
  v_unidade_id uuid;
  v_total_salas integer;
  v_total_leitos integer;
begin
  -- --------------------------------------------------------------------------
  -- 1. Unidade hospitalar
  -- --------------------------------------------------------------------------
  select id into v_unidade_id
  from public.unidade_saude
  where cnes = '1234567'
  limit 1;

  if v_unidade_id is null then
    insert into public.unidade_saude (
      nome, tipo, cnes,
      endereco_logradouro, endereco_numero, endereco_complemento,
      endereco_bairro, endereco_cidade, endereco_estado, endereco_cep,
      telefone, servicos_essenciais, servicos_ampliados
    ) values (
      'Hospital Central de Clínicas', 'HOSPITAL', '1234567',
      'Avenida Central', '1200', null,
      'Centro', 'São Paulo', 'SP', '01001000',
      '1130001000',
      array['Pronto-socorro', 'Internação', 'Exames laboratoriais', 'Radiologia', 'Farmácia', 'Emergência'],
      array['UTI adulto', 'Cirurgia geral', 'Pediatria']
    )
    returning id into v_unidade_id;

    raise notice 'Seed: unidade "Hospital Central de Clínicas" criada (%).', v_unidade_id;
  else
    raise notice 'Seed: unidade "Hospital Central de Clínicas" já existe (%).', v_unidade_id;
  end if;

  -- --------------------------------------------------------------------------
  -- 2. Salas
  -- --------------------------------------------------------------------------
  insert into public.sala (unidade_saude_id, nome, tipo, status)
  select v_unidade_id, s.nome, s.tipo, 'LIVRE'
  from (values
    ('Consultório 01 (Clínica Geral)', 'Consultório médico'),
    ('Consultório 03 (Clínica Médica)', 'Consultório médico'),
    ('Consultório 05 (Pediatria)', 'Consultório médico'),
    ('Sala Vermelha (Emergência)', 'Emergência')
  ) as s(nome, tipo)
  where not exists (
    select 1 from public.sala existente
    where existente.unidade_saude_id = v_unidade_id
      and lower(existente.nome) = lower(s.nome)
  );

  select count(*) into v_total_salas
  from public.sala
  where unidade_saude_id = v_unidade_id and ativo;
  raise notice 'Seed: unidade possui % sala(s) ativa(s).', v_total_salas;

  -- --------------------------------------------------------------------------
  -- 3. Leitos da Sala Vermelha
  --    Leito 01 e 02 já nascem com ventilador mecânico disponível; todos os
  --    leitos da Sala Vermelha têm monitor cardíaco (padrão do schema).
  -- --------------------------------------------------------------------------
  insert into public.leito (
    unidade_saude_id, nome_ou_numero, setor, status,
    ventilador_mecanico, monitor_cardiaco
  )
  select v_unidade_id, l.nome, 'SALA_VERMELHA', 'LIVRE', l.ventilador, true
  from (values
    ('Leito 01', true),
    ('Leito 02', true),
    ('Leito 03', false),
    ('Leito 04', false),
    ('Leito 05', false),
    ('Leito 06', false)
  ) as l(nome, ventilador)
  where not exists (
    select 1 from public.leito existente
    where existente.unidade_saude_id = v_unidade_id
      and lower(existente.nome_ou_numero) = lower(l.nome)
  );

  select count(*) into v_total_leitos
  from public.leito
  where unidade_saude_id = v_unidade_id and setor = 'SALA_VERMELHA' and ativo;
  raise notice 'Seed: Sala Vermelha possui % leito(s) ativo(s).', v_total_leitos;
end $$;

commit;
