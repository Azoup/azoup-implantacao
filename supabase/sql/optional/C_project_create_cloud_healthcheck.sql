-- ============================================================================
-- Healthcheck (somente leitura) para falhas no cadastro de projeto em nuvem.
-- Não altera dados. Rode no SQL Editor para validar pré-requisitos de escrita.
-- ============================================================================

-- 1) Funções de permissão e relação analyst/profile.
select
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('can_edit_project', 'profile_is_active', 'is_admin')
order by p.proname;

-- 2) Policies da tabela projects (insert/update/delete).
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'projects'
order by policyname;

-- 3) Analistas sem profile_id (podem falhar em cenários de RLS por analista).
select id, name, profile_id
from public.analysts
where active = true
  and profile_id is null
order by name;

-- 4) Projetos com analyst_id sem correspondência em analysts (integridade operacional).
select p.id, p.project_name, p.analyst_id
from public.projects p
left join public.analysts a on a.id = p.analyst_id
where p.analyst_id is not null
  and a.id is null
order by p.created_at desc;

-- 5) Contagem de catálogo de planos (base mínima esperada para criação).
select
  (select count(*) from public.plan_models) as plan_models,
  (select count(*) from public.plan_phases) as plan_phases,
  (select count(*) from public.plan_tasks) as plan_tasks;

-- 6) Últimos projetos criados (sanidade de gravação recente).
select id, project_name, created_at, created_by, owner_id, analyst_id
from public.projects
order by created_at desc
limit 20;
