-- VynTask — Security Advisor: funções com search_path fixo (evita hijack de search_path).
-- Rode no SQL Editor do Supabase (produção). Idempotente (CREATE OR REPLACE).

-- profiles trigger (001_profiles.sql)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- updated_at em projects/phases/tasks (optional/D_domain_row_versioning_updated_at.sql)
create or replace function public.vyntask_set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- welcome_form_submissions (maintenance/F_portal_cliente_mvp.sql)
create or replace function public.set_updated_at_welcome_form_submissions()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- storage path helper (003_storage.sql)
create or replace function public.path_leading_project_id(path text)
returns uuid
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when path ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/'
    then split_part(path, '/', 1)::uuid
    else null::uuid
  end;
$$;
