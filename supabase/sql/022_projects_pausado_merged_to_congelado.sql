-- Unifica status operacional: "pausado" deixa de existir e vira "congelado".
-- Idempotente (converte dados e recria CHECK).

begin;

-- 1) Migrar dados existentes
update public.projects
set status = 'congelado'
where status = 'pausado';

-- 2) Ajustar constraint de CHECK
alter table public.projects
  drop constraint if exists projects_status_check;

alter table public.projects
  add constraint projects_status_check
  check (status in ('ativo', 'congelado', 'finalizado', 'cancelado'));

comment on column public.projects.status is
  'ativo | congelado | finalizado | cancelado';

commit;

