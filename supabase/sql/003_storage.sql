-- VynTask — Storage (anexos, PDFs, imagens de projeto/comentário)
-- Pré-requisitos: 001_profiles.sql + 002_core_domain.sql (funções profile_is_active, can_edit_project).
-- Convenção de path no bucket:  "<project_uuid>/qualquer/subpasta/arquivo.ext"
--   Ex.: front: `supabase.storage.from('vyntask').upload(\`${projectId}/comments/${commentId}/foto.png\`, file)`
-- Uso: SQL Editor → Run.

-- ---------------------------------------------------------------------------
-- Path → UUID do projeto (primeiro segmento antes de "/")
-- ---------------------------------------------------------------------------
create or replace function public.path_leading_project_id(path text)
returns uuid
language sql
immutable
as $$
  select case
    when path ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/'
    then split_part(path, '/', 1)::uuid
    else null::uuid
  end;
$$;

-- ---------------------------------------------------------------------------
-- Bucket privado (só RLS; não expõe URL pública sem signed URL)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vyntask', 'vyntask', false, 52428800, null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Políticas em storage.objects
-- ---------------------------------------------------------------------------
drop policy if exists "vyntask_objects_select" on storage.objects;
create policy "vyntask_objects_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'vyntask'
    and public.profile_is_active()
  );

drop policy if exists "vyntask_objects_insert" on storage.objects;
create policy "vyntask_objects_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'vyntask'
    and public.profile_is_active()
    and public.can_edit_project(public.path_leading_project_id(name))
  );

drop policy if exists "vyntask_objects_update" on storage.objects;
create policy "vyntask_objects_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'vyntask'
    and public.profile_is_active()
    and public.can_edit_project(public.path_leading_project_id(name))
  )
  with check (
    bucket_id = 'vyntask'
    and public.profile_is_active()
    and public.can_edit_project(public.path_leading_project_id(name))
  );

drop policy if exists "vyntask_objects_delete" on storage.objects;
create policy "vyntask_objects_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'vyntask'
    and public.profile_is_active()
    and public.can_edit_project(public.path_leading_project_id(name))
  );
