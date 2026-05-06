-- No-show and reschedule traceability for task lifecycle.
alter table public.tasks
  add column if not exists cancel_reason text null,
  add column if not exists rescheduled_from_task_id uuid null references public.tasks (id) on delete set null,
  add column if not exists rescheduled_to_task_id uuid null references public.tasks (id) on delete set null;

create index if not exists idx_tasks_cancel_reason on public.tasks (cancel_reason);
create index if not exists idx_tasks_rescheduled_from on public.tasks (rescheduled_from_task_id);
create index if not exists idx_tasks_rescheduled_to on public.tasks (rescheduled_to_task_id);
