-- Status operacional "congelado" + alerta manual (nota) em projetos.
-- Idempotente onde possível.

-- 1) Ampliar CHECK de status (inclui congelado)
alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects
  add constraint projects_status_check
  check (status in ('ativo', 'pausado', 'congelado', 'finalizado', 'cancelado'));

comment on column public.projects.status is
  'ativo | pausado | congelado (paralisacao operacional) | finalizado | cancelado';

-- 2) Alerta manual: texto nao vazio = alerta ativo + justificativa
alter table public.projects add column if not exists manual_attention_note text null;
alter table public.projects add column if not exists manual_attention_at timestamptz null;
alter table public.projects add column if not exists manual_attention_by uuid null references auth.users (id) on delete set null;

comment on column public.projects.manual_attention_note is
  'Justificativa do alerta operacional; null ou vazio = sem alerta.';
comment on column public.projects.manual_attention_at is
  'Momento da ultima ativacao/alteracao do alerta manual.';
comment on column public.projects.manual_attention_by is
  'Usuario que definiu ou alterou o alerta manual.';
