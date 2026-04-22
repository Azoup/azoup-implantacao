-- VynTask — hardening emergencial de Auth/Permissões/Auditoria
-- Execute em ambiente já em uso para alinhar:
-- 1) cadastro híbrido (profiles.status = pending por padrão)
-- 2) proteção de colunas privilegiadas em profiles (role/status/permissions)
-- 3) policies de auditoria restritas (update/delete admin)

alter table public.profiles
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_status_check check (status in ('active', 'inactive', 'pending'));

alter table public.profiles
  alter column status set default 'pending';

create or replace function public.guard_profile_privileged_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    if auth.uid() is null or auth.uid() <> old.id then
      raise exception 'Sem permissão para alterar este perfil.';
    end if;
    if new.role is distinct from old.role then
      raise exception 'Apenas admin pode alterar role.';
    end if;
    if new.status is distinct from old.status then
      raise exception 'Apenas admin pode alterar status.';
    end if;
    if new.permissions is distinct from old.permissions then
      raise exception 'Apenas admin pode alterar permissões.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged_update on public.profiles;
create trigger profiles_guard_privileged_update
  before update on public.profiles
  for each row
  execute function public.guard_profile_privileged_update();

revoke update on table public.profiles from authenticated;
grant update (name, permissions, status, role, last_login_at) on table public.profiles to authenticated;

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select to authenticated using (public.profile_is_active());

drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs
  for insert to authenticated with check (public.profile_is_active() and user_id = auth.uid());

drop policy if exists audit_logs_update on public.audit_logs;
create policy audit_logs_update on public.audit_logs
  for update to authenticated using (public.profile_is_active() and public.is_admin())
  with check (public.profile_is_active() and public.is_admin());

drop policy if exists audit_logs_delete on public.audit_logs;
create policy audit_logs_delete on public.audit_logs
  for delete to authenticated using (public.profile_is_active() and public.is_admin());

drop policy if exists project_deletion_logs_select on public.project_deletion_logs;
create policy project_deletion_logs_select on public.project_deletion_logs
  for select to authenticated using (public.profile_is_active());

drop policy if exists project_deletion_logs_insert on public.project_deletion_logs;
create policy project_deletion_logs_insert on public.project_deletion_logs
  for insert to authenticated with check (public.profile_is_active() and deleted_by_user_id = auth.uid());

drop policy if exists project_deletion_logs_update on public.project_deletion_logs;
create policy project_deletion_logs_update on public.project_deletion_logs
  for update to authenticated using (public.profile_is_active() and public.is_admin())
  with check (public.profile_is_active() and public.is_admin());

drop policy if exists project_deletion_logs_delete on public.project_deletion_logs;
create policy project_deletion_logs_delete on public.project_deletion_logs
  for delete to authenticated using (public.profile_is_active() and public.is_admin());
