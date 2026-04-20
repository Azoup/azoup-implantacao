-- Opcional: versionamento por linha (updated_at) em projetos / fases / tarefas.
-- Objetivos:
--   1) Pull incremental no cliente (.gt('updated_at', cursor)).
--   2) Supabase Realtime postgres_changes com merges por timestamp.
--   3) DELETE via Realtime com payload.old completo (REPLICA IDENTITY FULL).
--
-- Pré-requisitos: tabelas public.projects, public.phases, public.tasks já existentes.
-- Habilitar Realtime nas tabelas no Dashboard Supabase (Database → Replication) se ainda não estiver.

-- —— Função genérica ——
CREATE OR REPLACE FUNCTION public.vyntask_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- —— projects ——
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.projects
SET updated_at = COALESCE(created_at::timestamptz, now())
WHERE updated_at IS NULL;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE PROCEDURE public.vyntask_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects (updated_at);

ALTER TABLE public.projects REPLICA IDENTITY FULL;

-- —— phases ——
ALTER TABLE public.phases
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.phases p
SET updated_at = COALESCE(
  (SELECT pr.created_at::timestamptz FROM public.projects pr WHERE pr.id = p.project_id),
  now()
);

DROP TRIGGER IF EXISTS trg_phases_updated_at ON public.phases;
CREATE TRIGGER trg_phases_updated_at
BEFORE UPDATE ON public.phases
FOR EACH ROW
EXECUTE PROCEDURE public.vyntask_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_phases_updated_at ON public.phases (updated_at);

ALTER TABLE public.phases REPLICA IDENTITY FULL;

-- —— tasks ——
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.tasks t
SET updated_at = COALESCE(
  t.created_at::timestamptz,
  (SELECT pr.created_at::timestamptz FROM public.projects pr WHERE pr.id = t.project_id),
  now()
);

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE PROCEDURE public.vyntask_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON public.tasks (updated_at);

ALTER TABLE public.tasks REPLICA IDENTITY FULL;

COMMENT ON COLUMN public.projects.updated_at IS 'Atualizado automaticamente em UPDATE; usado por sync incremental e Realtime.';
COMMENT ON COLUMN public.phases.updated_at IS 'Atualizado automaticamente em UPDATE; usado por sync incremental e Realtime.';
COMMENT ON COLUMN public.tasks.updated_at IS 'Atualizado automaticamente em UPDATE; usado por sync incremental e Realtime.';
