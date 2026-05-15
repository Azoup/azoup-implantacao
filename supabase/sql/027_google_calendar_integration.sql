-- Google Calendar integration: colunas em events, tabela de tokens por usuário, outbox de sync.
-- Tokens ficam acessíveis apenas via service_role (Edge Functions); o app autenticado não lê a tabela.

alter table public.events
  add column if not exists google_event_id text null,
  add column if not exists google_calendar_id text null,
  add column if not exists google_sync_status text null,
  add column if not exists google_updated_at timestamptz null;

create unique index if not exists events_google_event_id_unique
  on public.events (google_event_id)
  where google_event_id is not null;

comment on column public.events.google_event_id is 'ID do evento no Google Calendar quando sincronizado.';
comment on column public.events.google_sync_status is 'Estado da última tentativa de sync com Google (ex.: pending, synced, error).';

create table if not exists public.user_calendar_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token_enc text not null,
  default_calendar_id text null,
  google_email text null,
  sync_cursor text null,
  updated_at timestamptz not null default now()
);

comment on table public.user_calendar_connections is 'Credenciais Google Calendar por usuário; uso exclusivo via Edge Functions (service_role).';

create table if not exists public.calendar_sync_outbox (
  id uuid primary key default gen_random_uuid(),
  event_id uuid null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  operation text not null check (operation in ('push', 'delete', 'pull_hint')),
  payload jsonb null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz null
);

create index if not exists calendar_sync_outbox_pending_idx
  on public.calendar_sync_outbox (created_at)
  where processed_at is null;

revoke all on public.user_calendar_connections from authenticated;
revoke all on public.user_calendar_connections from anon;
grant select, insert, update, delete on public.user_calendar_connections to service_role;

revoke all on public.calendar_sync_outbox from authenticated;
revoke all on public.calendar_sync_outbox from anon;
grant select, insert, update, delete on public.calendar_sync_outbox to service_role;
