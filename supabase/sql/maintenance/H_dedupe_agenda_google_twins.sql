-- =============================================================================
-- Manutenção (supabase/sql/maintenance/) — limpar agenda local sem Google.
--
-- Objetivo: remover da tabela `public.events` tudo que NÃO veio do Google
-- (`google_event_id` nulo) e por isso aparece duplicado ou “fantasma” na
-- tela Agenda (Calendário). A fonte da verdade passa a ser só o pull Google.
--
-- O que NÃO é alterado:
--   • `public.tasks` — tarefas permanecem (status, due_date, etc.)
--   • `public.projects` — projetos permanecem
--   • `public.time_logs` / `public.time_sessions` — apontamentos e timer
--
-- Efeitos colaterais esperados (só em `events` e dependentes):
--   • Blocos de agenda vinculados a `task_id` somem do calendário; a tarefa
--     continua na lista/kanban (reagende ou deixe o Google recriar o evento).
--   • `comments.event_id` → NULL (on delete set null)
--   • `calendar_sync_outbox` — linhas do evento removidas (cascade)
--
-- Fluxo seguro:
--   1) Rode a prévia (seção 1) e confira totais / amostra.
--   2) Opcional: BEGIN; DELETE (seção 2); ROLLBACK; para simular.
--   3) BEGIN; DELETE; COMMIT; em janela de baixo uso.
--
-- Sincronização local: após DELETE no Supabase, force pull Google ou reabra o
-- app (Dexie) para alinhar a cópia offline.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Prévia — eventos que seriam removidos (não altera dados)
-- ---------------------------------------------------------------------------

-- Resumo
select
  count(*) as total_sem_google,
  count(*) filter (where task_id is not null) as com_tarefa_vinculada,
  count(*) filter (where task_id is null and project_id is not null) as so_projeto,
  count(*) filter (where task_id is null and project_id is null) as avulsos_equipe,
  min(start_time) as inicio_mais_antigo,
  max(start_time) as inicio_mais_recente
from public.events
where google_event_id is null;

-- Amostra (últimos 200 por data de início)
select
  e.id,
  e.title,
  e.start_time,
  e.end_time,
  e.status,
  e.analyst_id,
  e.project_id,
  e.task_id,
  e.google_sync_status,
  e.created_at
from public.events e
where e.google_event_id is null
order by e.start_time desc
limit 200;

-- ---------------------------------------------------------------------------
-- 2) DELETE — descomente após validar a prévia
-- ---------------------------------------------------------------------------
-- begin;
--
-- delete from public.events e
-- where e.google_event_id is null;
--
-- commit;

-- ---------------------------------------------------------------------------
-- 3) (Opcional) Só histórico — avulsos antes de amanhã 00:00 America/Sao_Paulo
--    Use se quiser manter compromissos futuros criados no app até sincronizar.
-- ---------------------------------------------------------------------------
-- with bounds as (
--   select (
--     (date_trunc('day', now() at time zone 'America/Sao_Paulo') + interval '1 day')
--     at time zone 'America/Sao_Paulo'
--   ) as historical_before
-- )
-- delete from public.events e
-- using bounds b
-- where e.google_event_id is null
--   and e.start_time < b.historical_before;

-- ---------------------------------------------------------------------------
-- 4) (Legado) Dedupe “gêmeo” — app avulso + import Google no mesmo slot.
--    Subconjunto da seção 2; mantido só para prévia cirúrgica se necessário.
-- ---------------------------------------------------------------------------
-- with bounds as (
--   select (
--     (date_trunc('day', now() at time zone 'America/Sao_Paulo') + interval '1 day')
--     at time zone 'America/Sao_Paulo'
--   ) as historical_before
-- ),
-- norm as (
--   select
--     e.id,
--     e.analyst_id,
--     e.title,
--     e.start_time,
--     e.google_event_id,
--     upper(
--       regexp_replace(
--         regexp_replace(
--           regexp_replace(trim(coalesce(e.title, '')), '^\d+(?:\.\d+)+\.?\s*', '', 'g'),
--           '\s*\([^)]*\)',
--           ' ',
--           'g'
--         ),
--         '[^A-Z0-9\s]',
--         ' ',
--         'g'
--       )
--     ) as norm_title,
--     case
--       when position(' - ' in upper(
--         regexp_replace(
--           regexp_replace(
--             regexp_replace(trim(coalesce(e.title, '')), '^\d+(?:\.\d+)+\.?\s*', '', 'g'),
--             '\s*\([^)]*\)',
--             ' ',
--             'g'
--           ),
--           '[^A-Z0-9\s]',
--           ' ',
--           'g'
--         )
--       )) > 0
--       then trim(
--         substring(
--           upper(
--             regexp_replace(
--               regexp_replace(
--                 regexp_replace(trim(coalesce(e.title, '')), '^\d+(?:\.\d+)+\.?\s*', '', 'g'),
--                 '\s*\([^)]*\)',
--                 ' ',
--                 'g'
--               ),
--               '[^A-Z0-9\s]',
--               ' ',
--               'g'
--             )
--           )
--           from position(
--             ' - ' in upper(
--               regexp_replace(
--                 regexp_replace(
--                   regexp_replace(trim(coalesce(e.title, '')), '^\d+(?:\.\d+)+\.?\s*', '', 'g'),
--                   '\s*\([^)]*\)',
--                   ' ',
--                   'g'
--                 ),
--                 '[^A-Z0-9\s]',
--                 ' ',
--                 'g'
--               )
--             )
--           ) + 3
--         )
--       )
--       else trim(
--         upper(
--           regexp_replace(
--             regexp_replace(
--               regexp_replace(trim(coalesce(e.title, '')), '^\d+(?:\.\d+)+\.?\s*', '', 'g'),
--               '\s*\([^)]*\)',
--               ' ',
--               'g'
--             ),
--             '[^A-Z0-9\s]',
--             ' ',
--             'g'
--           )
--         )
--       )
--     end as norm_subject
--   from public.events e
-- ),
-- app_only as (
--   select n.*
--   from norm n
--   cross join bounds b
--   where n.google_event_id is null
--     and n.start_time < b.historical_before
-- ),
-- google_rows as (
--   select n.*
--   from norm n
--   where n.google_event_id is not null
-- ),
-- pairs as (
--   select
--     a.id as app_event_id,
--     a.title as app_title,
--     a.start_time as app_start,
--     g.id as google_row_id,
--     g.title as google_title,
--     g.start_time as google_start
--   from app_only a
--   join google_rows g
--     on g.analyst_id is not distinct from a.analyst_id
--    and abs(extract(epoch from (a.start_time - g.start_time))) <= 120
--    and (
--      a.norm_subject = g.norm_subject
--      or (
--        length(a.norm_subject) >= 6
--        and length(g.norm_subject) >= 6
--        and (
--          a.norm_subject like '%' || g.norm_subject || '%'
--          or g.norm_subject like '%' || a.norm_subject || '%'
--        )
--      )
--      or a.norm_title = g.norm_title
--    )
-- )
-- select *
-- from pairs
-- order by app_start desc, app_event_id;
