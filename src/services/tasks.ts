import { db } from '../db/database'
import type { TaskStatus } from '../db/types'
import { taskStatusDexiePatch } from '../lib/taskStatusDexie'
import { syncLabelsForProject } from './labels'
import { syncProjectKanbanFromPlanState } from './kanbanPhaseSync'
import { getUserForAudit, writeAuditLog } from './auditLogs'

export async function setTaskStatus(taskId: string, next: TaskStatus, actorUserId?: string): Promise<void> {
  const task = await db.tasks.get(taskId)
  if (!task) return
  const prevStatus = task.status

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

  const nowIso = new Date().toISOString()
  const patch = prevStatus === next ? { status: next } : taskStatusDexiePatch(prevStatus, next, nowIso)
  await db.tasks.update(taskId, patch)
  if (actorUserId && prevStatus !== next) {
    const actor = await getUserForAudit(actorUserId)
    await writeAuditLog({
      action: 'alteracao',
      entity: 'tarefa',
      entityId: task.id,
      entityLabel: `${task.code} · ${task.title}`,
      details: `Status alterado de ${prevStatus} para ${next}.`,
      user: actor,
    })
  }

  const tasksInPhase = await db.tasks.where('phaseId').equals(task.phaseId).toArray()
  const phaseComplete =
    tasksInPhase.length > 0 && tasksInPhase.every((t) => t.status === 'concluida')

  if (phaseComplete && phase) {
    await db.phases.update(phase.id, { status: 'concluida' })
    if (actorUserId) {
      const actor = await getUserForAudit(actorUserId)
      await writeAuditLog({
        action: 'alteracao',
        entity: 'fase',
        entityId: phase.id,
        entityLabel: phase.name,
        details: `Fase marcada como concluída por automação ao concluir tarefas.`,
        user: actor,
      })
    }
    const allPhases = await db.phases.where('projectId').equals(task.projectId).sortBy('orderIndex')
    const nextPh = allPhases.find((p) => p.orderIndex === phase.orderIndex + 1)
    if (nextPh) {
      await db.phases.update(nextPh.id, { status: 'ativa' })
      if (actorUserId) {
        const actor = await getUserForAudit(actorUserId)
        await writeAuditLog({
          action: 'alteracao',
          entity: 'fase',
          entityId: nextPh.id,
          entityLabel: nextPh.name,
          details: `Fase ativada automaticamente após conclusão da fase anterior.`,
          user: actor,
        })
      }
    }
  }

  await syncLabelsForProject(task.projectId)
  await syncProjectKanbanFromPlanState(task.projectId)
}
