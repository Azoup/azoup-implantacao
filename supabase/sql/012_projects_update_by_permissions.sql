-- Implantação Azoup — UPDATE de projects orientado por permissões de login (RBAC)
-- Objetivo: edição de projeto deve respeitar perfil/permissões do usuário autenticado,
-- sem depender de vínculo operacional em analysts.profile_id.
--
-- Resultado:
-- - UPDATE em public.projects exige scope 'projects.edit' (ou admin ativo)
-- - relação projects.analyst_id deixa de conceder edição por si só para UPDATE

begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create or replace function public.profile_has_scope(p_scope text)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.profiles pr
    where pr.id = auth.uid()
      and pr.status = 'active'
      and (
        pr.role = 'admin'
        or (
          pr.permissions is not null
          and pr.permissions @> array[p_scope]::text[]
        )
      )
  );
$function$;

create or replace function public.can_update_project_by_profile()
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select public.profile_has_scope('projects.edit');
$function$;

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
  for update
  to authenticated
  using (
    public.profile_is_active()
    and public.can_update_project_by_profile()
  )
  with check (
    public.profile_is_active()
    and public.can_update_project_by_profile()
  );

commit;
