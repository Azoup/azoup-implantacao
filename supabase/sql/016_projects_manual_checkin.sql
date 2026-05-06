-- Check-in manual de projeto (frescor operacional no VynTask).
-- Idempotente: ADD COLUMN IF NOT EXISTS.
--
-- Depois de aplicar no Supabase, no frontend (.env.local / Netlify):
--   VITE_SYNC_PROJECT_MANUAL_CHECKIN=1
-- Sem isso, o app grava só em IndexedDB (Dexie); o PATCH para `projects` não inclui estes campos.
--
-- Sem esta migration, se ligar a flag antes das colunas, o UPDATE pode falhar (coluna inexistente).

alter table public.projects add column if not exists last_manual_checkin_at timestamptz null;
alter table public.projects add column if not exists last_manual_checkin_by uuid null references auth.users (id) on delete set null;

comment on column public.projects.last_manual_checkin_at is
  'Último check-in manual da equipe (timestamptz ISO gravado pelo app).';
comment on column public.projects.last_manual_checkin_by is
  'Usuário (auth.users.id) que registrou o último check-in manual.';

create index if not exists projects_last_manual_checkin_at_idx
  on public.projects (last_manual_checkin_at desc nulls last);
