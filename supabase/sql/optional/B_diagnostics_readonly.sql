-- VynTask — Diagnóstico e verificação (produção / staging)
-- Rode no SQL Editor do Supabase (role com leitura no schema public).
-- Não altera dados por padrão; seções comentadas são sugestões de correção.

-- ---------------------------------------------------------------------------
-- 1) Tabelas esperadas pelo app (public)
-- ---------------------------------------------------------------------------
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'projects',
    'phases',
    'tasks',
    'time_logs',
    'time_sessions',
    'events',
    'comments',
    'labels',
    'plan_models',
    'plan_phases',
    'plan_tasks',
    'analysts',
    'audit_logs',
    'project_deletion_logs',
    'project_contacts'
  )
order by table_name;

-- ---------------------------------------------------------------------------
-- 2) Contagem de linhas (dados ainda existem no Postgres?)
-- ---------------------------------------------------------------------------
select 'profiles' as t, count(*)::bigint as n from public.profiles
union all select 'projects', count(*) from public.projects
union all select 'phases', count(*) from public.phases
union all select 'tasks', count(*) from public.tasks
union all select 'plan_models', count(*) from public.plan_models
union all select 'plan_phases', count(*) from public.plan_phases
union all select 'plan_tasks', count(*) from public.plan_tasks
union all select 'analysts', count(*) from public.analysts
union all select 'labels', count(*) from public.labels
union all select 'comments', count(*) from public.comments
union all select 'events', count(*) from public.events
union all select 'time_logs', count(*) from public.time_logs
union all select 'time_sessions', count(*) from public.time_sessions
union all select 'project_contacts', count(*) from public.project_contacts
order by t;

-- ---------------------------------------------------------------------------
-- 3) RLS ligado? (se ligado sem policy correta, o cliente pode “ver” 0 linhas)
-- ---------------------------------------------------------------------------
select tablename, rowsecurity as rls_on
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles', 'projects', 'phases', 'tasks', 'plan_models', 'plan_phases',
    'plan_tasks', 'analysts', 'labels', 'comments', 'events',
    'time_logs', 'time_sessions', 'project_contacts', 'audit_logs', 'project_deletion_logs'
  )
order by tablename;

-- ---------------------------------------------------------------------------
-- 4) Amostra de projetos (últimos criados) — confirma client_api_id, etc.
-- ---------------------------------------------------------------------------
select id, project_name, client_api_id, analyst_id, created_by, owner_id, created_at
from public.projects
order by created_at desc nulls last
limit 25;

-- ---------------------------------------------------------------------------
-- 5) Funções de permissão usadas pelo RLS (conferir definição de can_edit_project)
-- ---------------------------------------------------------------------------
select p.proname, pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('can_edit_project', 'profile_is_active', 'is_admin', 'task_project_id')
order by p.proname;

-- ---------------------------------------------------------------------------
-- 6) Políticas em projects (INSERT exige created_by = auth.uid(); UPDATE exige can_edit_project)
-- ---------------------------------------------------------------------------
select policyname, cmd, roles::text, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'projects'
order by policyname;

-- ---------------------------------------------------------------------------
-- 7) Opcional: criar tabelas de auditoria se ainda não existirem (remove 404 no PostgREST)
--     Aplique o arquivo completo: supabase/sql/005_audit_logs.sql
-- ---------------------------------------------------------------------------
-- \i supabase/sql/005_audit_logs.sql

-- ---------------------------------------------------------------------------
-- 8) RLS — “analista pode editar projeto”
--     O campo projects.analyst_id referencia public.analysts(id), não auth.uid().
--     Para ligar analista ao login e atualizar can_edit_project, rode na ordem:
--       supabase/sql/008_analysts_profile_link.sql
--     Depois preencha analysts.profile_id (uuid do perfil Supabase) para cada analista.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 9) plan_phases / plan_tasks = 0 ? Corrija ou o app fica sem estrutura de planos.
--     Antes de rodar 007_seed_plan_phases_tasks.sql, confira se os IDs batem com o seed:
-- ---------------------------------------------------------------------------
-- select id, key, name from public.plan_models order by key;
-- O arquivo 007 usa plan_model_id fixos (ex.: a1111111-1111-4111-8111-111111111111 = basic).
-- Se seus 3 modelos tiverem outros UUIDs, rode antes 006_seed_builtin_plan_models.sql (ou adapte o 007).
-- Depois rode no SQL Editor o conteúdo completo de: supabase/sql/007_seed_plan_phases_tasks.sql
