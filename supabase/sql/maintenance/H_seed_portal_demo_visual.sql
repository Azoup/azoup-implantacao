-- Demo visual · Portal Cliente (TESTE)
-- Cria: cliente "TESTE", projeto "AREA CLIENTE TESTE", vínculos, template de boas-vindas,
--        uma fase/tarefa de exemplo e um evento na agenda.
--
-- PRÉ-REQUISITOS
--   1) Já ter aplicado F_portal_cliente_mvp.sql (e G se for usar upload de arquivos).
--   2) Criar o login no Supabase: Dashboard → Authentication → Users → Add user
--        E-mail: teste@teste.com
--        Senha: ex. Teste@2026  (você escolhe)
--        Marque "Auto Confirm User" (recomendado para demo local).
--   3) Rodar este script no SQL Editor (como postgres / service).
--
-- O script ajusta o perfil do usuário demo para tipo cliente, ativo e com scopes do portal.
-- Para isso, desliga temporariamente o trigger de proteção em UPDATE de profiles.

do $seed$
declare
  v_demo uuid;
  v_admin uuid;
  v_client uuid;
  v_project uuid;
  v_phase uuid;
  v_schema jsonb;
begin
  select u.id
    into v_demo
  from auth.users u
  where lower(coalesce(u.email, '')) = 'teste@teste.com'
  limit 1;

  if v_demo is null then
    raise exception
      'Crie primeiro o usuário teste@teste.com em Authentication → Users (veja comentários no topo de H_seed_portal_demo_visual.sql).';
  end if;

  select p.id
    into v_admin
  from public.profiles p
  where p.role = 'admin'
    and p.status = 'active'
  order by p.created_at asc
  limit 1;

  if v_admin is null then
    raise exception 'Nenhum admin ativo em public.profiles. Rode D_grant_admin_… ou promova um admin antes.';
  end if;

  -- Perfil demo: ativo, tipo cliente, scopes mínimos do portal
  begin
    alter table public.profiles disable trigger profiles_guard_privileged_update;

    update public.profiles
    set
      name = coalesce(nullif(trim(name), ''), 'Cliente Demo · TESTE'),
      status = 'active',
      user_type = 'client',
      permissions = array['portal.view', 'portal.agenda.view', 'portal.forms.fill']::text[]
    where id = v_demo;

    alter table public.profiles enable trigger profiles_guard_privileged_update;
  exception
    when others then
      alter table public.profiles enable trigger profiles_guard_privileged_update;
      raise;
  end;

  -- Cliente TESTE (reutiliza se já existir com esse nome)
  select c.id
    into v_client
  from public.clients c
  where c.name = 'TESTE'
  limit 1;

  if v_client is null then
    insert into public.clients (name, status)
    values ('TESTE', 'active')
    returning id into v_client;
  end if;

  insert into public.client_memberships (client_id, profile_id, role_in_client)
  values (v_client, v_demo, 'owner')
  on conflict (client_id, profile_id)
  do update set role_in_client = excluded.role_in_client;

  -- Projeto demo (reutiliza se já existir com esse nome)
  select pr.id
    into v_project
  from public.projects pr
  where pr.project_name = 'AREA CLIENTE TESTE'
  limit 1;

  if v_project is null then
    insert into public.projects (
      id,
      project_name,
      plan_type,
      hours_contracted,
      hours_used,
      owner_id,
      analyst_id,
      created_by,
      plan_snapshot
    )
    values (
      gen_random_uuid(),
      'AREA CLIENTE TESTE',
      'custom',
      0,
      0,
      v_admin,
      null,
      v_admin,
      '{"mode":"custom","modelId":null,"key":"custom","name":"Demo","hoursContracted":0,"phaseCount":1,"taskCount":1}'::jsonb
    )
    returning id into v_project;
  end if;

  insert into public.project_client_links (project_id, client_id)
  values (v_project, v_client)
  on conflict (project_id, client_id) do nothing;

  -- Template de boas-vindas (um ativo por projeto, se ainda não houver)
  if not exists (
    select 1
    from public.welcome_form_templates w
    where w.project_id = v_project
      and w.is_active = true
  ) then
    -- Campos completos vêm do app (version azoup); aqui só marcamos URL do Google Form oficial.
    v_schema := jsonb_build_object(
      'version', 'azoup',
      'externalGoogleFormUrl',
      'https://docs.google.com/forms/d/e/1FAIpQLSdSy1e16-PLYcM1VEGTnBSmwc6zn1H1A_37mt6R_LGYIfnt_g/viewform?usp=dialog',
      'fields', '[]'::jsonb
    );

    insert into public.welcome_form_templates (
      project_id,
      name,
      form_schema,
      is_active,
      created_by
    )
    values (
      v_project,
      'Jornada do cliente Azoup (Implantação Azoup)',
      v_schema,
      true,
      v_admin
    );
  end if;

  -- Fase + tarefa de exemplo (só se o projeto estiver vazio de fases)
  select ph.id
    into v_phase
  from public.phases ph
  where ph.project_id = v_project
  limit 1;

  if v_phase is null then
    v_phase := gen_random_uuid();
    insert into public.phases (id, project_id, name, order_index, status)
    values (v_phase, v_project, 'Implantação · demo', 0, 'ativa');

    insert into public.tasks (
      id,
      title,
      description,
      project_id,
      phase_id,
      status,
      priority,
      estimated_hours,
      actual_hours,
      assigned_to,
      due_date,
      is_informational,
      code,
      sort_order
    )
    values (
      gen_random_uuid(),
      'Reunião de alinhamento (exemplo)',
      'Tarefa de demonstração para o portal do cliente.',
      v_project,
      v_phase,
      'em_andamento',
      'media',
      2,
      0,
      null,
      null,
      false,
      'DEMO-01',
      0
    );
  end if;

  -- Evento de exemplo na agenda (só se não houver evento neste projeto)
  if not exists (select 1 from public.events e where e.project_id = v_project) then
    insert into public.events (
      id,
      title,
      description,
      start_time,
      end_time,
      status,
      project_id,
      task_id,
      analyst_id
    )
    values (
      gen_random_uuid(),
      'Kickoff · demo visual',
      'Evento de exemplo para o cliente visualizar a agenda.',
      now() + interval '2 days',
      now() + interval '2 days' + interval '1 hour',
      'agendado',
      v_project,
      null,
      null
    );
  end if;

  raise notice 'Portal demo OK. Faça login com teste@teste.com e abra /portal — projeto_id=%', v_project;
end
$seed$;
