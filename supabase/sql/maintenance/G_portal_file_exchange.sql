-- Portal Cliente MVP - troca de arquivos (templates + envio do cliente)

create table if not exists public.portal_project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in ('template', 'client_submission')),
  original_name text not null,
  mime_type text null,
  size_bytes bigint not null default 0,
  storage_path text not null unique,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.portal_project_files enable row level security;

drop policy if exists portal_project_files_select on public.portal_project_files;
create policy portal_project_files_select on public.portal_project_files
for select to authenticated
using (
  public.can_edit_project(project_id)
  or (
    public.can_view_project_as_client(project_id)
    and (kind = 'template' or uploaded_by = auth.uid())
  )
);

drop policy if exists portal_project_files_insert on public.portal_project_files;
create policy portal_project_files_insert on public.portal_project_files
for insert to authenticated
with check (
  (
    public.can_edit_project(project_id)
    and uploaded_by = auth.uid()
  )
  or (
    public.can_view_project_as_client(project_id)
    and kind = 'client_submission'
    and uploaded_by = auth.uid()
  )
);

drop policy if exists portal_project_files_delete on public.portal_project_files;
create policy portal_project_files_delete on public.portal_project_files
for delete to authenticated
using (public.can_edit_project(project_id) or uploaded_by = auth.uid());

grant select, insert, delete on public.portal_project_files to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portal-files',
  'portal-files',
  false,
  104857600,
  array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/pdf',
    'text/csv',
    'application/zip'
  ]
)
on conflict (id) do nothing;

drop policy if exists "portal-files select" on storage.objects;
create policy "portal-files select" on storage.objects
for select to authenticated
using (
  bucket_id = 'portal-files'
  and (
    public.can_edit_project((storage.foldername(name))[1]::uuid)
    or public.can_view_project_as_client((storage.foldername(name))[1]::uuid)
  )
);

drop policy if exists "portal-files insert" on storage.objects;
create policy "portal-files insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'portal-files'
  and (
    public.can_edit_project((storage.foldername(name))[1]::uuid)
    or public.can_view_project_as_client((storage.foldername(name))[1]::uuid)
  )
);

drop policy if exists "portal-files delete" on storage.objects;
create policy "portal-files delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'portal-files'
  and (
    public.can_edit_project((storage.foldername(name))[1]::uuid)
    or owner = auth.uid()
  )
);
