-- VynTask — Readiness checklist para estabilidade de sync de projetos (cloud/SaaS).
-- Não altera dados críticos; apenas valida pré-condições e imprime sinais de risco.

-- 1) Estruturas essenciais
select
  'projects' as table_name,
  exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'projects') as exists;
select
  'phases' as table_name,
  exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'phases') as exists;
select
  'tasks' as table_name,
  exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'tasks') as exists;

-- 2) Campo de versão temporal (recomendado para concorrência e incremental pull)
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('projects', 'phases', 'tasks')
  and column_name = 'updated_at'
order by table_name;

-- 3) Campo opcional de tarefas avulsas
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'tasks'
  and column_name = 'is_ad_hoc';

-- 4) RLS habilitado nas tabelas de agregado
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('projects', 'phases', 'tasks');

-- 5) Policies mínimas esperadas em projects
select policyname, cmd, permissive, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'projects'
order by policyname;

-- 6) Funções de segurança críticas
select p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('profile_is_active', 'can_edit_project', 'is_admin')
order by p.proname;

-- 7) Integridade operacional (analistas ativos sem profile_id)
select id, name, profile_id
from public.analysts
where active = true
  and profile_id is null
order by name;

-- 8) Projetos recentes para checar escrita/edição em nuvem
select id, project_name, created_at, created_by, owner_id, analyst_id
from public.projects
order by created_at desc
limit 25;
