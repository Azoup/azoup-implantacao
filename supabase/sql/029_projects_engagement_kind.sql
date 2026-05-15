-- Classificação do ciclo do projeto: implantação operacional padrão vs. projeto só de upsell/expansão.
-- Distinto de client_type (segmento de negócio) e plan_type (contrato).
-- Idempotente: ADD COLUMN IF NOT EXISTS. Não altera project_name (trilha de auditoria).

alter table public.projects
  add column if not exists engagement_kind text not null default 'operacao_padrao'
    check (engagement_kind in ('operacao_padrao', 'upsell'));

comment on column public.projects.engagement_kind is
  'operacao_padrao — ciclo principal de implantação; upsell — expansão comercial (ex.: marcador [UPSELL] no nome).';

-- Backfill a partir do marcador legado no nome (ILIKE: case-insensitive). Não remove o prefixo do título.
update public.projects
set engagement_kind = 'upsell'
where project_name ilike '%[upsell]%'
  and engagement_kind = 'operacao_padrao';
