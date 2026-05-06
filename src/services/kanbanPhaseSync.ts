import { db } from '../db/database'
import type { DbPhase, DbProject, DbTask, KanbanColumn, PhaseStatus } from '../db/types'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import {
  enqueuePendingProjectGraphSync,
  updateProjectPartialInSupabase,
  upsertProjectGraphFromDexie,
  withDexieSupabaseSyncMuted,
} from '../sync/supabaseDexieBridge'
import {
  kanbanColumnToTargetPlanOrderIndex,
  planOrderIndexToKanbanColumn,
  targetPhaseArrayIndex,
} from '../lib/planPhaseKanban'
import { taskStatusDexiePatch } from '../lib/taskStatusDexie'
import { normalizeProjectPlacement } from './projectGovernance'
import { syncLabelsForProject } from './labels'

function sortedProjectPhases(projectId: string, phases: DbPhase[]): DbPhase[] {
  return phases.filter((p) => p.projectId === projectId).sort((a, b) => a.orderIndex - b.orderIndex)
}

/** Primeira fase (por ordem do plano) que ainda não tem todas as tarefas concluídas. */
function firstIncompletePhase(
  sorted: DbPhase[],
  tasks: DbTask[],
  projectId: string,
): DbPhase | null {
  for (const ph of sorted) {
    const ts = tasks.filter((t) => t.projectId === projectId && t.phaseId === ph.id)
    if (ts.length === 0) continue
    const allDone = ts.every((t) => t.status === 'concluida')
    if (!allDone) return ph
  }
  return null
}

/**
 * Coluna do kanban = fases do plano ligado ao projeto (códigos 0.x, 1.x, 2.x…).
 * - Fase 00 do plano (`orderIndex` 0, tarefas 0.x) → coluna **Novos clientes** (`novos`).
 * - Fase 01 (`orderIndex` 1, tarefas 1.x) → **Fase 01** … até Fase 04 para `orderIndex` ≥ 4.
 * - Todas as fases e tarefas concluídas → **Concluídos** (`finalizados`).
 */
export function deriveKanbanColumnFromPlanState(
  project: DbProject,
  phases: DbPhase[],
  tasks: DbTask[],
): KanbanColumn {
  if (project.status === 'cancelado') return 'cancelados'
  if (project.status === 'finalizado') return 'finalizados'

  const mine = sortedProjectPhases(project.id, phases)
  if (mine.length === 0) return 'novos'

  const projectTasks = tasks.filter((t) => t.projectId === project.id)
  if (projectTasks.length === 0) return 'novos'

  const cur = firstIncompletePhase(mine, tasks, project.id)
  if (!cur) return 'finalizados'

  return planOrderIndexToKanbanColumn(cur.orderIndex)
}

export async function syncProjectKanbanFromPlanState(projectId: string): Promise<void> {
  const project = await db.projects.get(projectId)
  if (!project) return
  const phases = await db.phases.where('projectId').equals(projectId).toArray()
  const tasks = await db.tasks.where('projectId').equals(projectId).toArray()
  const next = deriveKanbanColumnFromPlanState(project, phases, tasks)
  if (next !== project.kanbanColumn) {
    await db.projects.update(projectId, { kanbanColumn: next })
    if (isSupabaseConfigured()) {
      try {
        await withDexieSupabaseSyncMuted(async () => {
          await updateProjectPartialInSupabase(projectId, { kanbanColumn: next })
        })
      } catch (err) {
        console.warn('[kanban] Falha ao sincronizar coluna do projeto (será retentado na fila).', projectId, err)
        enqueuePendingProjectGraphSync(projectId, {
          lastErrorCode: 'PRJ_KANBAN_SYNC',
          lastErrorMessage: err instanceof Error ? err.message : String(err),
          opId: crypto.randomUUID(),
        })
      }
    }
  }
}

function appendKanbanNote(current: string | null | undefined, line: string): string {
  return `${current ?? ''}${line}`
}

/**
 * Ajusta fases/tarefas para refletir a coluna escolhida; exige justificativa (auditoria em notas internas).
 */
export async function applyManualKanbanColumnMove(
  projectId: string,
  to: KanbanColumn,
  justification: string,
): Promise<void> {
  const project = await db.projects.get(projectId)
  if (!project) throw new Error('Projeto não encontrado.')

  const phases = await db.phases.where('projectId').equals(projectId).sortBy('orderIndex')
  const tasks = await db.tasks.where('projectId').equals(projectId).toArray()
  const from = deriveKanbanColumnFromPlanState(project, phases, tasks)
  if (from === to) return

  const reason = justification.trim()
  if (reason.length < 8) throw new Error('Informe uma justificativa (mínimo 8 caracteres).')

  const line = `\n[${new Date().toISOString()}] Kanban: ${from} → ${to}. Motivo: ${reason}`

  if (to === 'cancelados') {
    const norm = normalizeProjectPlacement({ status: 'cancelado', kanbanColumn: 'cancelados' })
    const patch = {
      ...norm,
      internalNotes: appendKanbanNote(project.internalNotes, line),
    }
    if (isSupabaseConfigured()) {
      await withDexieSupabaseSyncMuted(async () => {
        await updateProjectPartialInSupabase(projectId, patch)
        await db.projects.update(projectId, patch)
      })
    } else {
      await db.projects.update(projectId, patch)
    }
    return
  }

  if (to === 'finalizados') {
    const nowIso = new Date().toISOString()
    await db.transaction('rw', db.projects, db.phases, db.tasks, async () => {
      for (const ph of phases) {
        await db.phases.update(ph.id, { status: 'concluida' })
      }
      for (const t of tasks) {
        if (t.status === 'cancelado') continue
        if (t.status === 'concluida') continue
        await db.tasks.update(t.id, taskStatusDexiePatch(t.status, 'concluida', nowIso))
      }
      const cur = await db.projects.get(projectId)
      if (!cur) return
      const norm = normalizeProjectPlacement({ status: 'finalizado', kanbanColumn: 'finalizados' })
      await db.projects.update(projectId, {
        ...norm,
        internalNotes: appendKanbanNote(cur.internalNotes, line),
      })
    })
    await syncLabelsForProject(projectId)
    if (isSupabaseConfigured()) await upsertProjectGraphFromDexie(projectId)
    return
  }

  const sorted = [...phases].sort((a, b) => a.orderIndex - b.orderIndex)

  const targetPlanOrder = kanbanColumnToTargetPlanOrderIndex(to)
  if (to !== 'novos' && targetPlanOrder === null) throw new Error('Coluna de fase inválida.')

  await db.transaction('rw', db.projects, db.phases, db.tasks, async () => {
    if (to === 'novos') {
      for (let i = 0; i < sorted.length; i++) {
        const st: PhaseStatus = i === 0 ? 'ativa' : 'bloqueada'
        await db.phases.update(sorted[i].id, { status: st })
      }
      const nowIso = new Date().toISOString()
      for (const t of tasks) {
        if (t.status === 'cancelado') continue
        if (t.status === 'pendente') continue
        await db.tasks.update(t.id, taskStatusDexiePatch(t.status, 'pendente', nowIso))
      }
    } else {
      const K = targetPhaseArrayIndex(sorted, targetPlanOrder!)
      for (let i = 0; i < sorted.length; i++) {
        const ph = sorted[i]
        let st: PhaseStatus
        if (i < K) st = 'concluida'
        else if (i === K) st = 'ativa'
        else st = 'bloqueada'
        await db.phases.update(ph.id, { status: st })
        const pts = tasks.filter((x) => x.phaseId === ph.id)
        const nowIso = new Date().toISOString()
        for (const t of pts) {
          if (t.status === 'cancelado') continue
          if (i < K) {
            if (t.status !== 'concluida') await db.tasks.update(t.id, taskStatusDexiePatch(t.status, 'concluida', nowIso))
          } else if (t.status !== 'pendente') {
            await db.tasks.update(t.id, taskStatusDexiePatch(t.status, 'pendente', nowIso))
          }
        }
      }
    }

    const cur = await db.projects.get(projectId)
    if (!cur) return
    const norm = normalizeProjectPlacement({ status: 'ativo', kanbanColumn: to })
    await db.projects.update(projectId, {
      status: norm.status,
      kanbanColumn: norm.kanbanColumn,
      internalNotes: appendKanbanNote(cur.internalNotes, line),
    })
  })

  await syncLabelsForProject(projectId)
  if (isSupabaseConfigured()) await upsertProjectGraphFromDexie(projectId)
  await syncProjectKanbanFromPlanState(projectId)
}
