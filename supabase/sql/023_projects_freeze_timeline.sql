-- Histórico de congelamento / descongelamento (motivos e datas) persistido no projeto.

alter table public.projects add column if not exists freeze_timeline jsonb not null default '[]'::jsonb;

comment on column public.projects.freeze_timeline is
  'Array JSON: {kind: freeze|unfreeze, at, by, reason} — append ao alternar situação pela grade ou detalhe.';
