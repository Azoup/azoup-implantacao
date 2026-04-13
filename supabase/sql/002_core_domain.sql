-- VynTask — domínio principal (analistas, modelos de plano, projetos, fases, tarefas, agenda, horas, comentários, labels)
-- Pré-requisito: 001_profiles.sql já aplicado (public.profiles + public.is_admin()).
-- Uso: SQL Editor → colar → Run. Idempotente na medida do possível (DROP POLICY IF EXISTS, CREATE OR REPLACE).

-- ---------------------------------------------------------------------------
-- Helper RLS (não depende das tabelas abaixo; exige 001_profiles aplicado)
-- ---------------------------------------------------------------------------
create or replace function public.profile_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles pr
    where pr.id = auth.uid()
      and pr.status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- Catálogo: analistas
-- ---------------------------------------------------------------------------
create table if not exists public.analysts (
  id uuid primary key,
  name text not null,
  avatar_url text null,
  color text not null default '#6366f1',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catálogo: modelos de plano + estrutura
-- ---------------------------------------------------------------------------
create table if not exists public.plan_models (
  id uuid primary key,
  key text not null unique,
  name text not null,
  hours_contracted double precision not null default 0,
  phase_count integer not null default 0,
  active boolean not null default true,
  presentation_url text null,
  client_description text null
);

create table if not exists public.plan_phases (
  id uuid primary key,
  plan_model_id uuid not null references public.plan_models (id) on delete cascade,
  name text not null,
  order_index integer not null default 0
);

create index if not exists plan_phases_model_idx on public.plan_phases (plan_model_id);

create table if not exists public.plan_tasks (
  id uuid primary key,
  plan_phase_id uuid not null references public.plan_phases (id) on delete cascade,
  code text not null,
  title text not null,
  description text not null default '',
  estimated_hours double precision not null default 0,
  is_informational boolean not null default false,
  sort_order integer not null default 0
);

create index if not exists plan_tasks_phase_idx on public.plan_tasks (plan_phase_id);

-- ---------------------------------------------------------------------------
-- Projetos
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key,
  project_name text not null,
  plan_type text not null,
  hours_contracted double precision not null default 0,
  hours_used double precision not null default 0,
  start_date date null,
  due_date date null,
  status text not null default 'ativo'
    check (status in ('ativo', 'pausado', 'finalizado', 'cancelado')),
  owner_id uuid not null references auth.users (id) on delete restrict,
  analyst_id uuid null references public.analysts (id) on delete set null,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  kanban_column text not null default 'novos'
    check (kanban_column in (
      'novos', 'fase_01', 'fase_02', 'fase_03', 'fase_04', 'finalizados', 'cancelados'
    )),
  cnpj text null,
  razao_social text null,
  trade_name text null,
  cep text null,
  address_street text null,
  address_number text null,
  address_complement text null,
  address_neighborhood text null,
  address_city text null,
  address_state text null,
  implantation_contact_name text null,
  implantation_contact_phone text null,
  corporate_email text null,
  client_api_id text null,
  internal_notes text null,
  state_registration text null,
  secondary_cnpj text null,
  secondary_razao_social text null,
  modules_description text null,
  plan_snapshot_captured_at timestamptz not null default now(),
  plan_snapshot jsonb not null default '{}'::jsonb
);

create index if not exists projects_status_idx on public.projects (status);
create index if not exists projects_kanban_idx on public.projects (kanban_column);
create index if not exists projects_created_idx on public.projects (created_at desc);

create table if not exists public.project_contacts (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  phone text not null default '',
  role text not null default ''
);

create index if not exists project_contacts_project_idx on public.project_contacts (project_id);

create table if not exists public.phases (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  order_index integer not null default 0,
  status text not null default 'bloqueada'
    check (status in ('bloqueada', 'ativa', 'concluida'))
);

create index if not exists phases_project_idx on public.phases (project_id);

create table if not exists public.tasks (
  id uuid primary key,
  title text not null,
  description text not null default '',
  project_id uuid not null references public.projects (id) on delete cascade,
  phase_id uuid not null references public.phases (id) on delete cascade,
  status text not null default 'pendente'
    check (status in ('pendente', 'em_andamento', 'concluida', 'cancelado')),
  priority text not null default 'media'
    check (priority in ('baixa', 'media', 'alta')),
  estimated_hours double precision not null default 0,
  actual_hours double precision not null default 0,
  assigned_to uuid null references public.analysts (id) on delete set null,
  due_date date null,
  is_informational boolean not null default false,
  created_at timestamptz not null default now(),
  code text not null,
  sort_order integer not null default 0
);

create index if not exists tasks_project_idx on public.tasks (project_id);
create index if not exists tasks_phase_idx on public.tasks (phase_id);
create index if not exists tasks_status_idx on public.tasks (status);

create table if not exists public.events (
  id uuid primary key,
  title text not null,
  description text not null default '',
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'agendado'
    check (status in ('agendado', 'realizado', 'cancelado')),
  project_id uuid null references public.projects (id) on delete set null,
  task_id uuid null references public.tasks (id) on delete set null,
  analyst_id uuid null references public.analysts (id) on delete set null,
  meeting_link text null,
  recording_link text null,
  created_at timestamptz not null default now()
);

create index if not exists events_start_idx on public.events (start_time);
create index if not exists events_project_idx on public.events (project_id);
create index if not exists events_task_idx on public.events (task_id);

create table if not exists public.time_logs (
  id uuid primary key,
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  hours double precision not null default 0,
  log_type text not null
    check (log_type in ('executado', 'cancelado_sem_horas', 'cancelado_com_horas')),
  notes text not null default '',
  execution_date date not null,
  is_locked boolean not null default false
);

create index if not exists time_logs_task_idx on public.time_logs (task_id);
create index if not exists time_logs_user_idx on public.time_logs (user_id);

create table if not exists public.time_sessions (
  id uuid primary key,
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  analyst_id uuid null references public.analysts (id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz null,
  duration_seconds integer null,
  source text not null default 'timer'
    check (source in ('timer', 'manual')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists time_sessions_task_idx on public.time_sessions (task_id);
create index if not exists time_sessions_user_idx on public.time_sessions (user_id);

create table if not exists public.comments (
  id uuid primary key,
  content text not null,
  author_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid null references public.projects (id) on delete cascade,
  task_id uuid null references public.tasks (id) on delete set null,
  event_id uuid null references public.events (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz null,
  doc_links jsonb null default '[]'::jsonb,
  doc_attachments jsonb null default '[]'::jsonb
);

create index if not exists comments_task_idx on public.comments (task_id);
create index if not exists comments_project_idx on public.comments (project_id);
create index if not exists comments_event_idx on public.comments (event_id);

create table if not exists public.labels (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  code text not null,
  name text not null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed'))
);

create index if not exists labels_project_idx on public.labels (project_id);

-- Funções que leem projects/tasks (só após as tabelas existirem)
create or replace function public.can_edit_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and (
        p.created_by = auth.uid()
        or p.owner_id = auth.uid()
        or public.is_admin()
      )
  );
$$;

create or replace function public.task_project_id(p_task_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.project_id from public.tasks t where t.id = p_task_id;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.analysts enable row level security;
alter table public.plan_models enable row level security;
alter table public.plan_phases enable row level security;
alter table public.plan_tasks enable row level security;
alter table public.projects enable row level security;
alter table public.project_contacts enable row level security;
alter table public.phases enable row level security;
alter table public.tasks enable row level security;
alter table public.events enable row level security;
alter table public.time_logs enable row level security;
alter table public.time_sessions enable row level security;
alter table public.comments enable row level security;
alter table public.labels enable row level security;

-- Catálogo: equipe ativa lê e edita (espelha app local multiusuário de confiança)
drop policy if exists analysts_all on public.analysts;
create policy analysts_all on public.analysts for all using (public.profile_is_active()) with check (public.profile_is_active());

drop policy if exists plan_models_all on public.plan_models;
create policy plan_models_all on public.plan_models for all using (public.profile_is_active()) with check (public.profile_is_active());

drop policy if exists plan_phases_all on public.plan_phases;
create policy plan_phases_all on public.plan_phases for all using (public.profile_is_active()) with check (public.profile_is_active());

drop policy if exists plan_tasks_all on public.plan_tasks;
create policy plan_tasks_all on public.plan_tasks for all using (public.profile_is_active()) with check (public.profile_is_active());

-- Projetos
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select using (public.profile_is_active());

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert with check (
    public.profile_is_active()
    and created_by = auth.uid()
  );

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
  for update using (public.profile_is_active() and public.can_edit_project(id))
  with check (public.profile_is_active() and public.can_edit_project(id));

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects
  for delete using (public.profile_is_active() and public.can_edit_project(id));

-- Filhos de projeto
drop policy if exists project_contacts_select on public.project_contacts;
create policy project_contacts_select on public.project_contacts
  for select using (public.profile_is_active());

drop policy if exists project_contacts_write on public.project_contacts;
create policy project_contacts_write on public.project_contacts
  for all using (public.profile_is_active() and public.can_edit_project(project_id))
  with check (public.profile_is_active() and public.can_edit_project(project_id));

drop policy if exists phases_select on public.phases;
create policy phases_select on public.phases
  for select using (public.profile_is_active());

drop policy if exists phases_write on public.phases;
create policy phases_write on public.phases
  for all using (public.profile_is_active() and public.can_edit_project(project_id))
  with check (public.profile_is_active() and public.can_edit_project(project_id));

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select using (public.profile_is_active());

drop policy if exists tasks_write on public.tasks;
create policy tasks_write on public.tasks
  for all using (public.profile_is_active() and public.can_edit_project(project_id))
  with check (public.profile_is_active() and public.can_edit_project(project_id));

drop policy if exists labels_select on public.labels;
create policy labels_select on public.labels
  for select using (public.profile_is_active());

drop policy if exists labels_write on public.labels;
create policy labels_write on public.labels
  for all using (public.profile_is_active() and public.can_edit_project(project_id))
  with check (public.profile_is_active() and public.can_edit_project(project_id));

-- Eventos (sem projeto = agenda livre para equipe ativa)
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select using (public.profile_is_active());

drop policy if exists events_insert on public.events;
create policy events_insert on public.events
  for insert with check (
    public.profile_is_active()
    and (
      project_id is null
      or public.can_edit_project(project_id)
    )
  );

drop policy if exists events_update on public.events;
create policy events_update on public.events
  for update using (
    public.profile_is_active()
    and (
      project_id is null
      or public.can_edit_project(project_id)
    )
  )
  with check (
    public.profile_is_active()
    and (
      project_id is null
      or public.can_edit_project(project_id)
    )
  );

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
  for delete using (
    public.profile_is_active()
    and (
      project_id is null
      or public.can_edit_project(project_id)
    )
  );

-- Apontamentos de hora: o usuário grava para si no projeto que consegue editar
drop policy if exists time_logs_select on public.time_logs;
create policy time_logs_select on public.time_logs
  for select using (public.profile_is_active());

drop policy if exists time_logs_insert on public.time_logs;
create policy time_logs_insert on public.time_logs
  for insert with check (
    public.profile_is_active()
    and user_id = auth.uid()
    and public.can_edit_project(public.task_project_id(task_id))
  );

drop policy if exists time_logs_update on public.time_logs;
create policy time_logs_update on public.time_logs
  for update using (
    public.profile_is_active()
    and (
      public.is_admin()
      or (
        user_id = auth.uid()
        and public.can_edit_project(public.task_project_id(task_id))
      )
    )
  )
  with check (
    public.profile_is_active()
    and (
      public.is_admin()
      or (
        user_id = auth.uid()
        and public.can_edit_project(public.task_project_id(task_id))
      )
    )
  );

drop policy if exists time_logs_delete on public.time_logs;
create policy time_logs_delete on public.time_logs
  for delete using (
    public.profile_is_active()
    and (
      public.is_admin()
      or (
        user_id = auth.uid()
        and public.can_edit_project(public.task_project_id(task_id))
      )
    )
  );

drop policy if exists time_sessions_select on public.time_sessions;
create policy time_sessions_select on public.time_sessions
  for select using (public.profile_is_active());

drop policy if exists time_sessions_insert on public.time_sessions;
create policy time_sessions_insert on public.time_sessions
  for insert with check (
    public.profile_is_active()
    and user_id = auth.uid()
    and public.can_edit_project(public.task_project_id(task_id))
  );

drop policy if exists time_sessions_update on public.time_sessions;
create policy time_sessions_update on public.time_sessions
  for update using (
    public.profile_is_active()
    and (
      public.is_admin()
      or (
        user_id = auth.uid()
        and public.can_edit_project(public.task_project_id(task_id))
      )
    )
  )
  with check (
    public.profile_is_active()
    and (
      public.is_admin()
      or (
        user_id = auth.uid()
        and public.can_edit_project(public.task_project_id(task_id))
      )
    )
  );

drop policy if exists time_sessions_delete on public.time_sessions;
create policy time_sessions_delete on public.time_sessions
  for delete using (
    public.profile_is_active()
    and (
      public.is_admin()
      or (
        user_id = auth.uid()
        and public.can_edit_project(public.task_project_id(task_id))
      )
    )
  );

-- Comentários
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select using (public.profile_is_active());

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments
  for insert with check (
    public.profile_is_active()
    and author_id = auth.uid()
    and (
      (
        task_id is null
        and project_id is null
        and event_id is null
      )
      or (
        task_id is not null
        and public.can_edit_project(public.task_project_id(task_id))
      )
      or (
        project_id is not null
        and public.can_edit_project(project_id)
      )
      or (
        event_id is not null
        and exists (
          select 1
          from public.events e
          where e.id = event_id
            and (
              e.project_id is null
              or public.can_edit_project(e.project_id)
            )
        )
      )
    )
  );

drop policy if exists comments_update on public.comments;
create policy comments_update on public.comments
  for update using (
    public.profile_is_active()
    and (
      author_id = auth.uid()
      or public.is_admin()
      or (project_id is not null and public.can_edit_project(project_id))
      or (
        task_id is not null
        and public.can_edit_project(public.task_project_id(task_id))
      )
    )
  )
  with check (
    public.profile_is_active()
    and (
      author_id = auth.uid()
      or public.is_admin()
      or (project_id is not null and public.can_edit_project(project_id))
      or (
        task_id is not null
        and public.can_edit_project(public.task_project_id(task_id))
      )
    )
  );

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments
  for delete using (
    public.profile_is_active()
    and (
      author_id = auth.uid()
      or public.is_admin()
      or (project_id is not null and public.can_edit_project(project_id))
      or (
        task_id is not null
        and public.can_edit_project(public.task_project_id(task_id))
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on table public.analysts to authenticated;
grant select, insert, update, delete on table public.plan_models to authenticated;
grant select, insert, update, delete on table public.plan_phases to authenticated;
grant select, insert, update, delete on table public.plan_tasks to authenticated;
grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.project_contacts to authenticated;
grant select, insert, update, delete on table public.phases to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.events to authenticated;
grant select, insert, update, delete on table public.time_logs to authenticated;
grant select, insert, update, delete on table public.time_sessions to authenticated;
grant select, insert, update, delete on table public.comments to authenticated;
grant select, insert, update, delete on table public.labels to authenticated;
