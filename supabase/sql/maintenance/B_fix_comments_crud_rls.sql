-- Implantação Azoup — Correção emergencial de RLS para documentação (comments)
-- Objetivo: restaurar INSERT/UPDATE/DELETE em public.comments para usuários autenticados
-- com perfil ativo e permissão de edição no projeto (incluindo analista vinculado por profile_id).
--
-- Pode ser executado com segurança em ambiente já em uso (idempotente).

alter table public.analysts
  add column if not exists profile_id uuid null references public.profiles (id) on delete set null;

create index if not exists analysts_profile_id_idx on public.analysts (profile_id);

create or replace function public.can_edit_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and (
        p.created_by = auth.uid()
        or p.owner_id = auth.uid()
        or public.is_admin()
        or (
          p.analyst_id is not null
          and exists (
            select 1
            from public.analysts a
            where a.id = p.analyst_id
              and a.profile_id is not null
              and a.profile_id = auth.uid()
          )
        )
      )
  );
$function$;

drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select using (public.profile_is_active());

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments
  for insert with check (
    public.profile_is_active()
    and author_id = auth.uid()
    and (
      (
        task_id is null
        and project_id is null
        and event_id is null
      )
      or (
        task_id is not null
        and public.can_edit_project(public.task_project_id(task_id))
      )
      or (
        project_id is not null
        and public.can_edit_project(project_id)
      )
      or (
        event_id is not null
        and exists (
          select 1
          from public.events e
          where e.id = event_id
            and (
              e.project_id is null
              or public.can_edit_project(e.project_id)
            )
        )
      )
    )
  );

drop policy if exists comments_update on public.comments;
create policy comments_update on public.comments
  for update using (
    public.profile_is_active()
    and (
      author_id = auth.uid()
      or public.is_admin()
      or (project_id is not null and public.can_edit_project(project_id))
      or (
        task_id is not null
        and public.can_edit_project(public.task_project_id(task_id))
      )
    )
  )
  with check (
    public.profile_is_active()
    and (
      author_id = auth.uid()
      or public.is_admin()
      or (project_id is not null and public.can_edit_project(project_id))
      or (
        task_id is not null
        and public.can_edit_project(public.task_project_id(task_id))
      )
    )
  );

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments
  for delete using (
    public.profile_is_active()
    and (
      author_id = auth.uid()
      or public.is_admin()
      or (project_id is not null and public.can_edit_project(project_id))
      or (
        task_id is not null
        and public.can_edit_project(public.task_project_id(task_id))
      )
    )
  );

grant select, insert, update, delete on table public.comments to authenticated;
