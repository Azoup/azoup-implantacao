-- VynTask — verificação pós-ajustes (somente leitura)
-- Uso: rodar no SQL Editor após 012 + 013.
-- Objetivo: confirmar policy de update por permissão e hardening de EXECUTE.

-- 1) Policy de UPDATE em projects
select policyname, cmd, permissive, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'projects'
  and policyname = 'projects_update';

-- 2) Funções esperadas para autorização por perfil
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('profile_has_scope', 'can_update_project_by_profile')
order by function_name;

-- 3) Superfície RPC/EXECUTE em funções sensíveis
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'admin_set_profile_permissions',
    'admin_set_profile_status',
    'admin_set_profile_user_type',
    'admin_create_client',
    'admin_link_profile_to_client',
    'admin_link_project_to_client',
    'is_admin',
    'profile_is_active',
    'can_edit_project',
    'can_view_project_as_client',
    'is_client_member',
    'task_project_id',
    'profile_has_scope',
    'can_update_project_by_profile'
  )
order by function_name, args;
