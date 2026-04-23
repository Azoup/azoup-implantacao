-- Portal Cliente MVP - Fase 1/2/4/5 (base de dados, RLS e operações admin)

alter table if exists public.profiles
  add column if not exists user_type text not null default 'internal';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_user_type_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_user_type_check
      check (user_type in ('internal', 'client'));
  end if;
end $$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.client_memberships (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_in_client text not null default 'member' check (role_in_client in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (client_id, profile_id)
);

create table if not exists public.project_client_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, client_id)
);

create table if not exists public.welcome_form_templates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  form_schema jsonb not null default '{"fields":[]}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.welcome_form_submissions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.welcome_form_templates(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at_welcome_form_submissions()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_welcome_form_submissions_updated_at on public.welcome_form_submissions;
create trigger trg_welcome_form_submissions_updated_at
before update on public.welcome_form_submissions
for each row execute function public.set_updated_at_welcome_form_submissions();

create or replace function public.is_client_member(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.client_memberships cm
    join public.profiles p on p.id = cm.profile_id
    where cm.client_id = p_client_id
      and cm.profile_id = auth.uid()
      and p.status = 'active'
  );
$$;

create or replace function public.can_view_project_as_client(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_client_links pcl
    where pcl.project_id = p_project_id
      and public.is_client_member(pcl.client_id)
  );
$$;

alter table public.clients enable row level security;
alter table public.client_memberships enable row level security;
alter table public.project_client_links enable row level security;
alter table public.welcome_form_templates enable row level security;
alter table public.welcome_form_submissions enable row level security;

drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
for select to authenticated
using (public.is_admin() or public.is_client_member(id));

drop policy if exists clients_write on public.clients;
create policy clients_write on public.clients
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists client_memberships_select on public.client_memberships;
create policy client_memberships_select on public.client_memberships
for select to authenticated
using (public.is_admin() or profile_id = auth.uid());

drop policy if exists client_memberships_write on public.client_memberships;
create policy client_memberships_write on public.client_memberships
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists project_client_links_select on public.project_client_links;
create policy project_client_links_select on public.project_client_links
for select to authenticated
using (public.is_admin() or public.can_view_project_as_client(project_id) or public.can_edit_project(project_id));

drop policy if exists project_client_links_write on public.project_client_links;
create policy project_client_links_write on public.project_client_links
for all to authenticated
using (public.is_admin() or public.can_edit_project(project_id))
with check (public.is_admin() or public.can_edit_project(project_id));

drop policy if exists welcome_templates_select on public.welcome_form_templates;
create policy welcome_templates_select on public.welcome_form_templates
for select to authenticated
using (public.can_view_project_as_client(project_id) or public.can_edit_project(project_id));

drop policy if exists welcome_templates_write on public.welcome_form_templates;
create policy welcome_templates_write on public.welcome_form_templates
for all to authenticated
using (public.can_edit_project(project_id))
with check (public.can_edit_project(project_id));

drop policy if exists welcome_submissions_select on public.welcome_form_submissions;
create policy welcome_submissions_select on public.welcome_form_submissions
for select to authenticated
using (
  public.can_edit_project(project_id)
  or (public.can_view_project_as_client(project_id) and submitted_by = auth.uid())
);

drop policy if exists welcome_submissions_insert on public.welcome_form_submissions;
create policy welcome_submissions_insert on public.welcome_form_submissions
for insert to authenticated
with check (
  submitted_by = auth.uid()
  and public.can_view_project_as_client(project_id)
  and exists (
    select 1 from public.project_client_links pcl
    where pcl.project_id = welcome_form_submissions.project_id
      and pcl.client_id = welcome_form_submissions.client_id
      and public.is_client_member(pcl.client_id)
  )
);

drop policy if exists welcome_submissions_update on public.welcome_form_submissions;
create policy welcome_submissions_update on public.welcome_form_submissions
for update to authenticated
using (public.can_edit_project(project_id) or submitted_by = auth.uid())
with check (public.can_edit_project(project_id) or submitted_by = auth.uid());

grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.client_memberships to authenticated;
grant select, insert, update, delete on public.project_client_links to authenticated;
grant select, insert, update, delete on public.welcome_form_templates to authenticated;
grant select, insert, update, delete on public.welcome_form_submissions to authenticated;

create or replace function public.admin_set_profile_user_type(p_profile_id uuid, p_user_type text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Sem permissão para alterar tipo de perfil';
  end if;

  if p_user_type not in ('internal', 'client') then
    raise exception 'Tipo de usuário inválido';
  end if;

  update public.profiles
    set user_type = p_user_type,
        updated_at = now()
  where id = p_profile_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Perfil não encontrado';
  end if;

  return v_profile;
end;
$$;

create or replace function public.admin_create_client(p_name text)
returns public.clients
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client public.clients;
begin
  if not public.is_admin() then
    raise exception 'Sem permissão para criar cliente';
  end if;
  insert into public.clients (name) values (trim(p_name)) returning * into v_client;
  return v_client;
end;
$$;

create or replace function public.admin_link_profile_to_client(
  p_profile_id uuid,
  p_client_id uuid,
  p_role_in_client text default 'member'
)
returns public.client_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership public.client_memberships;
begin
  if not public.is_admin() then
    raise exception 'Sem permissão para vincular perfil ao cliente';
  end if;

  if p_role_in_client not in ('owner', 'member') then
    raise exception 'role_in_client inválido';
  end if;

  insert into public.client_memberships (profile_id, client_id, role_in_client)
  values (p_profile_id, p_client_id, p_role_in_client)
  on conflict (client_id, profile_id)
  do update set role_in_client = excluded.role_in_client
  returning * into v_membership;

  return v_membership;
end;
$$;

create or replace function public.admin_link_project_to_client(
  p_project_id uuid,
  p_client_id uuid
)
returns public.project_client_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.project_client_links;
begin
  if not public.is_admin() then
    raise exception 'Sem permissão para vincular projeto ao cliente';
  end if;

  insert into public.project_client_links (project_id, client_id)
  values (p_project_id, p_client_id)
  on conflict (project_id, client_id) do nothing
  returning * into v_link;

  if v_link.id is null then
    select * into v_link
    from public.project_client_links
    where project_id = p_project_id and client_id = p_client_id
    limit 1;
  end if;

  return v_link;
end;
$$;
