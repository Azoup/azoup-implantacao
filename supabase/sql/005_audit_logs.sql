-- VynTask — Auditoria operacional (pipeline base, passo 5 de 8)
-- Pré-requisitos: 001_profiles.sql + 002_core_domain.sql
-- Idempotente: CREATE TABLE IF NOT EXISTS + policies recriáveis.
-- Ordem completa: supabase/sql/README_RUN_ORDER.txt

-- Auditoria operacional: inclusao/alteracao/exclusao (projeto, timer, fase, tarefa...)

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('inclusao', 'alteracao', 'exclusao')),
  entity text not null check (entity in ('projeto', 'timer', 'fase', 'tarefa', 'contato', 'comentario', 'outro')),
  entity_id text null,
  entity_label text not null default '',
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_name text not null default '',
  user_email text not null default '',
  justification text null,
  details text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity);
create index if not exists audit_logs_user_idx on public.audit_logs (user_id, created_at desc);

create table if not exists public.project_deletion_logs (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  project_name text not null,
  deleted_by_user_id uuid not null references public.profiles (id) on delete cascade,
  deleted_by_user_name text not null default '',
  deleted_by_user_email text not null default '',
  justification text not null,
  deleted_at timestamptz not null default now()
);

create index if not exists project_deletion_logs_deleted_at_idx on public.project_deletion_logs (deleted_at desc);
create index if not exists project_deletion_logs_user_idx on public.project_deletion_logs (deleted_by_user_id, deleted_at desc);

alter table public.audit_logs enable row level security;
alter table public.project_deletion_logs enable row level security;

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select to authenticated using (auth.uid() is not null);

drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs
  for insert to authenticated with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists audit_logs_update on public.audit_logs;
create policy audit_logs_update on public.audit_logs
  for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists audit_logs_delete on public.audit_logs;
create policy audit_logs_delete on public.audit_logs
  for delete to authenticated using (auth.uid() is not null);

drop policy if exists project_deletion_logs_select on public.project_deletion_logs;
create policy project_deletion_logs_select on public.project_deletion_logs
  for select to authenticated using (auth.uid() is not null);

drop policy if exists project_deletion_logs_insert on public.project_deletion_logs;
create policy project_deletion_logs_insert on public.project_deletion_logs
  for insert to authenticated with check (auth.uid() is not null and deleted_by_user_id = auth.uid());

drop policy if exists project_deletion_logs_update on public.project_deletion_logs;
create policy project_deletion_logs_update on public.project_deletion_logs
  for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists project_deletion_logs_delete on public.project_deletion_logs;
create policy project_deletion_logs_delete on public.project_deletion_logs
  for delete to authenticated using (auth.uid() is not null);

grant select, insert, update, delete on table public.audit_logs to authenticated;
grant select, insert, update, delete on table public.project_deletion_logs to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.audit_logs;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.project_deletion_logs;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
