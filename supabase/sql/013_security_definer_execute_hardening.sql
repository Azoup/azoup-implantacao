-- VynTask — hardening de EXECUTE em funções SECURITY DEFINER expostas via RPC
-- Objetivo:
-- 1) remover superfície de ataque do role anon/public em funções internas/sensíveis
-- 2) manter somente RPCs administrativas necessárias para usuários autenticados (com check de admin interno)

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $$
declare
  fn_sig text;
begin
  -- Base segura: remove herança de EXECUTE via PUBLIC para funções sensíveis/internal helpers.
  foreach fn_sig in array array[
    'public.is_admin()',
    'public.profile_is_active()',
    'public.can_edit_project(uuid)',
    'public.can_view_project_as_client(uuid)',
    'public.is_client_member(uuid)',
    'public.task_project_id(uuid)',
    'public.handle_new_user()',
    'public.guard_profile_privileged_update()',
    'public.rls_auto_enable()',
    'public.profile_has_scope(text)',
    'public.can_update_project_by_profile()'
  ]
  loop
    begin
      execute format('revoke all on function %s from public', fn_sig);
    exception
      when undefined_function then
        null;
    end;
  end loop;

  -- RPCs admin usadas pelo app: só usuários autenticados podem chamar.
  -- A autorização final continua sendo validada dentro da função (public.is_admin()).
  foreach fn_sig in array array[
    'public.admin_set_profile_permissions(uuid, text[])',
    'public.admin_set_profile_status(uuid, text)',
    'public.admin_set_profile_user_type(uuid, text)',
    'public.admin_create_client(text)',
    'public.admin_link_profile_to_client(uuid, uuid, text)',
    'public.admin_link_project_to_client(uuid, uuid)'
  ]
  loop
    begin
      execute format('revoke all on function %s from public', fn_sig);
      execute format('grant execute on function %s to authenticated', fn_sig);
    exception
      when undefined_function then
        null;
    end;
  end loop;
end $$;

commit;
