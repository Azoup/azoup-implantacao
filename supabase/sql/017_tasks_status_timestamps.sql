-- Add completion/cancellation timestamps used by dashboard KPI windows.
alter table public.tasks
  add column if not exists completed_at timestamptz null,
  add column if not exists cancelled_at timestamptz null;

create index if not exists idx_tasks_completed_at on public.tasks (completed_at);
create index if not exists idx_tasks_cancelled_at on public.tasks (cancelled_at);
