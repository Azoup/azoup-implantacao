-- Status operacional "inadimplente" + CHECK atualizado (mantém pausado→congelado se ainda existir legado).

begin;

update public.projects
set status = 'congelado'
where status = 'pausado';

update public.projects
set status = 'cancelado'
where status = 'inativo';

alter table public.projects
  drop constraint if exists projects_status_check;

alter table public.projects
  add constraint projects_status_check
  check (status in ('ativo', 'inadimplente', 'congelado', 'finalizado', 'cancelado'));

comment on column public.projects.status is
  'ativo (UI: Em andamento) | inadimplente | congelado | finalizado | cancelado (UI: nunca use inativo)';

commit;
