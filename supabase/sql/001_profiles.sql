-- Implantação Azoup — perfis ligados ao Supabase Auth
-- Como usar: Supabase → SQL → New query → colar tudo → Run
-- Seguro rodar de novo: recria políticas/funções; dados em profiles são mantidos (IF NOT EXISTS na tabela).

-- ---------------------------------------------------------------------------
-- 1) Tabela public.profiles (1 linha por usuário em auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  permissions text[] null,
  status text not null default 'pending' check (status in ('active', 'inactive', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz null
);

comment on table public.profiles is 'Perfil do app; id = auth.users.id. permissions = override de escopos (mesmos nomes do front).';

create index if not exists profiles_email_idx on public.profiles (lower(email));

-- ---------------------------------------------------------------------------
-- 2) Atualiza updated_at automaticamente
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

drop trigger if exists profiles_guard_privileged_update on public.profiles;
create trigger profiles_guard_privileged_update
  before update on public.profiles
  for each row
  execute function public.guard_profile_privileged_update();

-- ---------------------------------------------------------------------------
-- 3) Ao criar usuário no Auth, cria linha em profiles (SECURITY DEFINER)
-- Promoção a admin (exemplo, no SQL Editor): update public.profiles set role = 'admin' where id = '<uuid>';
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, status)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(coalesce(new.email, 'user'), '@', 1)
    ),
    -- Sempre 'user' no cadastro público; promoção a admin só via SQL/Dashboard (nunca confiar em metadata do cliente).
    'user',
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4) Admin: função auxiliar (bypass RLS interno via SECURITY DEFINER)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles pr
    where pr.id = auth.uid()
      and pr.role = 'admin'
      and pr.status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- 5) RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
  on public.profiles
  for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- Sem policy de INSERT para usuários: só o trigger (service/definer) cria a linha.
-- Sem policy de DELETE: só cascade se apagar em auth (cuidado em produção).

-- ---------------------------------------------------------------------------
-- 6) Permissões (cliente com JWT = role authenticated)
-- ---------------------------------------------------------------------------
revoke update on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (name, permissions, status, role, last_login_at) on table public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Opcional: backfill — usuários em auth.users sem linha em profiles
-- ATENÇÃO: `ON CONFLICT` só existe em INSERT. O comando inteiro abaixo é um
-- INSERT ... SELECT ... ON CONFLICT; não rode só o SELECT.
-- No SQL Editor: se der erro estranho no fim da linha, troque para "No limit".
-- ---------------------------------------------------------------------------
/*
insert into public.profiles (id, email, name, role, status)
select
  u.id,
  coalesce(u.email, ''),
  split_part(coalesce(u.email, 'user'), '@', 1),
  'user',
  'active'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
*/
