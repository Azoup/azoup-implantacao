import { useEffect, useMemo } from 'react'
import type { DbPhase, DbProject, DbTask } from '../db/types'
import { deriveKanbanColumnFromPlanState, syncProjectKanbanFromPlanState } from '../services/kanbanPhaseSync'

/** Mantém `project.kanbanColumn` alinhado às fases/tarefas sempre que os dados mudam. */
export function useReconcileKanbanColumns(
  projects: DbProject[],
  phases: DbPhase[],
  tasks: DbTask[],
): void {
  const idsNeedingSync = useMemo(() => {
    return projects
      .filter((p) => deriveKanbanColumnFromPlanState(p, phases, tasks) !== p.kanbanColumn)
      .map((p) => p.id)
  }, [projects, phases, tasks])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        for (const id of idsNeedingSync) {
          if (cancelled) break
          await syncProjectKanbanFromPlanState(id)
        }
      } catch (err) {
        // Evita Promise rejeitada sem tratamento na reconciliação automática.
        console.warn('[kanban] reconcile automático falhou; seguirá em próxima rodada.', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [idsNeedingSync.join('|')])
}
