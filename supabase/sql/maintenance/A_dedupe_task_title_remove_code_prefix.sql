-- =============================================================================
-- Manutenção (supabase/sql/maintenance/) — ver README_RUN_ORDER.txt seção D).
-- Remove redundância no título: quando `title` começa com `code` + espaço
-- (ex.: code = '0.1', title = '0.1 Primeiro Contato' → title = 'Primeiro Contato').
-- Aplica em catálogo (`plan_tasks`) e em tarefas de projeto (`tasks`).
-- Idempotente: rodar de novo não altera linhas já limpas.
-- Rode no SQL Editor (transação opcional: descomente BEGIN/COMMIT abaixo).
-- =============================================================================

-- BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Modelos de plano (catálogo)
-- ---------------------------------------------------------------------------
update public.plan_tasks pt
set title = btrim(substring(pt.title from (char_length(pt.code) + 2)))
where char_length(pt.title) > char_length(pt.code)
  and substring(pt.title from 1 for char_length(pt.code)) = pt.code
  and substring(pt.title from char_length(pt.code) + 1 for 1) = ' ';

-- ---------------------------------------------------------------------------
-- 2) Tarefas dos projetos (mesmo padrão vindo do clone do plano)
-- ---------------------------------------------------------------------------
update public.tasks t
set title = btrim(substring(t.title from (char_length(t.code) + 2)))
where char_length(t.title) > char_length(t.code)
  and substring(t.title from 1 for char_length(t.code)) = t.code
  and substring(t.title from char_length(t.code) + 1 for 1) = ' ';

-- COMMIT;

-- ---------------------------------------------------------------------------
-- Conferência rápida (não altera dados)
-- ---------------------------------------------------------------------------
-- Ainda com prefixo redundante?
-- select id, code, title from public.plan_tasks
-- where char_length(title) > char_length(code)
--   and substring(title from 1 for char_length(code)) = code
--   and substring(title from char_length(code) + 1 for 1) = ' ';
--
-- select id, code, title from public.tasks
-- where char_length(title) > char_length(code)
--   and substring(title from 1 for char_length(code)) = code
--   and substring(title from char_length(code) + 1 for 1) = ' ';
