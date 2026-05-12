-- Implantação Azoup — correção complementar: bloquear EXECUTE para role anon em funções sensíveis
-- Motivo: em alguns projetos Supabase existe grant explícito para anon/authenticated em funções,
-- então revogar apenas de PUBLIC pode não ser suficiente.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $$
declare
  fn_sig text;
begin
  -- Bloqueia ANON nas funções sensíveis e helper internas.
  foreach fn_sig in array array[
    'public.admin_set_profile_permissions(uuid, text[])',
    'public.admin_set_profile_status(uuid, text)',
    'public.admin_set_profile_user_type(uuid, text)',
    'public.admin_create_client(text)',
    'public.admin_link_profile_to_client(uuid, uuid, text)',
    'public.admin_link_project_to_client(uuid, uuid)',
    'public.is_admin()',
    'public.profile_is_active()',
    'public.can_edit_project(uuid)',
    'public.can_view_project_as_client(uuid)',
    'public.is_client_member(uuid)',
    'public.task_project_id(uuid)',
    'public.profile_has_scope(text)',
    'public.can_update_project_by_profile()',
    'public.handle_new_user()',
    'public.guard_profile_privileged_update()',
    'public.rls_auto_enable()'
  ]
  loop
    begin
      execute format('revoke execute on function %s from anon', fn_sig);
      execute format('revoke execute on function %s from public', fn_sig);
    exception
      when undefined_function then
        null;
    end;
  end loop;

  -- Mantém somente as RPCs administrativas que o app usa para usuários logados.
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
      execute format('grant execute on function %s to authenticated', fn_sig);
    exception
      when undefined_function then
        null;
    end;
  end loop;
end $$;

commit;
