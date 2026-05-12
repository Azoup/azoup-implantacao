-- Colunas extras do kanban (Visão geral): Congelados e Inadimplentes (alinhado ao app `KanbanColumn`).
alter table public.projects
  drop constraint if exists projects_kanban_column_check;

alter table public.projects
  add constraint projects_kanban_column_check
  check (kanban_column in (
    'novos',
    'fase_01',
    'fase_02',
    'fase_03',
    'fase_04',
    'finalizados',
    'congelados',
    'inadimplentes',
    'cancelados'
  ));
