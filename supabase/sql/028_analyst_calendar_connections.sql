-- Google Calendar: credenciais por analista (não por login do portal).
-- Regra de produto: sync usa o token Google do analista X; clientes nunca vinculam conta pessoal como fonte da equipe.
-- Tokens só via service_role (Edge Functions); clientes não leem refresh_token.

-- ---------------------------------------------------------------------------
-- 1) Tabela nova (1 conexão Google por analista)
-- ---------------------------------------------------------------------------
create table if not exists public.analyst_calendar_connections (
  analyst_id uuid primary key references public.analysts (id) on delete cascade,
  refresh_token_enc text not null,
  default_calendar_id text null,
  google_email text null,
  sync_cursor text null,
  linked_by_user_id uuid null references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.analyst_calendar_connections is
  'Credenciais Google Calendar por analista; linked_by_user_id = quem concluiu o OAuth (auditoria). Acesso só service_role.';

create index if not exists analyst_calendar_connections_linked_by_idx
  on public.analyst_calendar_connections (linked_by_user_id);

-- ---------------------------------------------------------------------------
-- 2) Outbox: coluna analyst_id para workers resolverem token por analista
-- ---------------------------------------------------------------------------
alter table public.calendar_sync_outbox
  add column if not exists analyst_id uuid null references public.analysts (id) on delete set null;

create index if not exists calendar_sync_outbox_analyst_idx
  on public.calendar_sync_outbox (analyst_id)
  where analyst_id is not null;

-- ---------------------------------------------------------------------------
-- 3) Migração legado user_calendar_connections → analyst (se a tabela existir)
--    Um mesmo profile pode teoricamente aparecer em mais de um analista — usa o menor id (determinístico). TODO: revisar duplicidade.
-- ---------------------------------------------------------------------------
do $migrate$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'user_calendar_connections'
  ) then
    insert into public.analyst_calendar_connections (
      analyst_id,
      refresh_token_enc,
      default_calendar_id,
      google_email,
      sync_cursor,
      linked_by_user_id,
      updated_at
    )
    select
      pick.analyst_id,
      u.refresh_token_enc,
      u.default_calendar_id,
      u.google_email,
      u.sync_cursor,
      u.user_id,
      u.updated_at
    from public.user_calendar_connections u
    cross join lateral (
      select a.id as analyst_id
      from public.analysts a
      where a.profile_id = u.user_id
      order by a.id
      limit 1
    ) pick
    on conflict (analyst_id) do update set
      refresh_token_enc = excluded.refresh_token_enc,
      default_calendar_id = excluded.default_calendar_id,
      google_email = excluded.google_email,
      sync_cursor = excluded.sync_cursor,
      linked_by_user_id = excluded.linked_by_user_id,
      updated_at = excluded.updated_at;

    drop table public.user_calendar_connections;
  end if;
end
$migrate$;

-- ---------------------------------------------------------------------------
-- 4) Grants (mesmo padrão 027: sem acesso authenticated)
-- ---------------------------------------------------------------------------
revoke all on public.analyst_calendar_connections from authenticated;
revoke all on public.analyst_calendar_connections from anon;
grant select, insert, update, delete on public.analyst_calendar_connections to service_role;
