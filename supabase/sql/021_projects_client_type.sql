-- Tipo de cliente / unidade de negócio no projeto (classificação operacional).
-- Idempotente.

alter table public.projects
  add column if not exists client_type text not null default 'generico'
    check (client_type in ('confeccao', 'generico'));

comment on column public.projects.client_type is
  'confeccao | generico — segmento de negócio do cliente no projeto.';
