-- VynTask — Realtime (Postgres Changes)
-- Pré-requisitos: 001 + 002 (tabelas em public). 003 Storage não é necessário.
-- Efeito: clientes com `supabase.channel(...).on('postgres_changes', ...)` recebem eventos.
-- Idempotente: só faz ADD TABLE se a tabela ainda não estiver na publicação.
-- Uso: SQL Editor → Run.

do $$
declare
  t text;
  tables text[] := array[
    'profiles',
    'analysts',
    'plan_models',
    'plan_phases',
    'plan_tasks',
    'projects',
    'project_contacts',
    'phases',
    'tasks',
    'events',
    'time_logs',
    'time_sessions',
    'comments',
    'labels'
  ];
begin
  foreach t in array tables
  loop
    if not exists (
      select 1
      from pg_publication_tables pt
      where pt.pubname = 'supabase_realtime'
        and pt.schemaname = 'public'
        and pt.tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
