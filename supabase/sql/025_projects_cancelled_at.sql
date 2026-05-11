-- Data de cancelamento do projeto (editável na UI; padrão sugerido = hoje ao cancelar).

alter table public.projects add column if not exists cancelled_at date null;

comment on column public.projects.cancelled_at is
  'Data negocial do cancelamento; null se não cancelado ou registro legado sem data.';
