import { db } from '../db/database'
import type { TaskStatus } from '../db/types'
import { syncLabelsForProject } from './labels'
import { syncProjectKanbanFromPlanState } from './kanbanPhaseSync'

export async function setTaskStatus(taskId: string, next: TaskStatus): Promise<void> {
  const task = await db.tasks.get(taskId)
  if (!task) return

  const phase = await db.phases.get(task.phaseId)
  if (
    phase?.status === 'bloqueada' &&
    next !== 'cancelado' &&
    task.status === 'pendente' &&
    (next === 'em_andamento' || next === 'concluida')
  ) {
    throw new Error('Fase bloqueada: conclua a fase anterior.')
  }

  const project = await db.projects.get(task.projectId)
  if (!project) return

  await db.tasks.update(taskId, { status: next })

  const tasksInPhase = await db.tasks.where('phaseId').equals(task.phaseId).toArray()
  const phaseComplete =
    tasksInPhase.length > 0 && tasksInPhase.every((t) => t.status === 'concluida')

  if (phaseComplete && phase) {
    await db.phases.update(phase.id, { status: 'concluida' })
    const allPhases = await db.phases.where('projectId').equals(task.projectId).sortBy('orderIndex')
    const nextPh = allPhases.find((p) => p.orderIndex === phase.orderIndex + 1)
    if (nextPh) await db.phases.update(nextPh.id, { status: 'ativa' })
  }

  await syncLabelsForProject(task.projectId)
  await syncProjectKanbanFromPlanState(task.projectId)
}
