import { db } from '../db/database'
import type { DbEvent, DbTask, TaskStatus } from '../db/types'
import { taskStatusDexiePatch } from '../lib/taskStatusDexie'
import { syncLabelsForProject } from './labels'
import { syncProjectKanbanFromPlanState } from './kanbanPhaseSync'
import { getUserForAudit, writeAuditLog } from './auditLogs'

/**
 * Deriva o status da tarefa a partir dos eventos vinculados e flags manuais.
 * Regra única (1 Tarefa : N Eventos):
 *  - completedManualOverride → concluida
 *  - ≥1 evento realizado → concluida
 *  - cancelledManually → cancelado (remoção explícita de escopo)
 *  - ≥1 evento agendado → em_andamento
 *  - caso contrário → pendente
 *
 * Cancelamentos de eventos (com ou sem horas) NÃO interferem no status da tarefa.
 */
export function deriveTaskStatusFromEvents(task: Pick<DbTask, 'id' | 'completedManualOverride' | 'cancelledManually'>, events: readonly DbEvent[]): TaskStatus {
  if (task.completedManualOverride) return 'concluida'
  const taskEvents = events.filter((e) => e.taskId === task.id)
  if (taskEvents.some((e) => e.status === 'realizado')) return 'concluida'
  if (task.cancelledManually) return 'cancelado'
  if (taskEvents.some((e) => e.status === 'agendado')) return 'em_andamento'
  return 'pendente'
}

/**
 * Recalcula e persiste o status canônico da tarefa.
 * Chame após qualquer mutação em DbEvent associado, ou após override manual.
 */
export async function recomputeTaskStatus(taskId: string, actorUserId?: string): Promise<TaskStatus | null> {
  const task = await db.tasks.get(taskId)
  if (!task) return null
  const events = await db.events.where('taskId').equals(taskId).toArray()
  const nextStatus = deriveTaskStatusFromEvents(task, events)
  if (task.status === nextStatus) return nextStatus

  const nowIso = new Date().toISOString()
  const patch = taskStatusDexiePatch(task.status, nextStatus, nowIso)
  await db.tasks.update(taskId, patch)

  if (actorUserId) {
    const actor = await getUserForAudit(actorUserId)
    await writeAuditLog({
      action: 'alteracao',
      entity: 'tarefa',
      entityId: task.id,
      entityLabel: `${task.code} · ${task.title}`,
      details: `Status recomputado de ${task.status} para ${nextStatus} (derivado de eventos).`,
      user: actor,
    })
  }

  await syncLabelsForProject(task.projectId)
  await syncProjectKanbanFromPlanState(task.projectId)
  return nextStatus
}

/**
 * Marca a tarefa como concluída por override manual, exigindo justificativa.
 * Útil quando não existe evento `realizado` mas o usuário precisa fechar a tarefa.
 */
export async function setTaskCompletedManualOverride(
  taskId: string,
  reason: string,
  actorUserId?: string,
): Promise<void> {
  const trimmed = reason.trim()
  if (trimmed.length < 3) throw new Error('Informe uma justificativa para concluir a tarefa sem atendimento registrado.')
  const task = await db.tasks.get(taskId)
  if (!task) throw new Error('Tarefa não encontrada.')

  const nowIso = new Date().toISOString()
  await db.tasks.update(taskId, {
    completedManualOverride: true,
    completedManualOverrideReason: trimmed,
    cancelledManually: false,
    status: 'concluida',
    completedAt: nowIso,
    cancelledAt: null,
  })

  if (actorUserId) {
    const actor = await getUserForAudit(actorUserId)
    await writeAuditLog({
      action: 'alteracao',
      entity: 'tarefa',
      entityId: task.id,
      entityLabel: `${task.code} · ${task.title}`,
      details: `Tarefa concluída por override manual: ${trimmed}`,
      user: actor,
    })
  }

  await syncLabelsForProject(task.projectId)
  await syncProjectKanbanFromPlanState(task.projectId)
}

/** Reverte um override manual (ex.: cliente fez o atendimento depois). */
export async function clearTaskCompletedManualOverride(taskId: string, actorUserId?: string): Promise<void> {
  const task = await db.tasks.get(taskId)
  if (!task) return
  if (!task.completedManualOverride) return
  await db.tasks.update(taskId, {
    completedManualOverride: false,
    completedManualOverrideReason: null,
  })
  if (actorUserId) {
    const actor = await getUserForAudit(actorUserId)
    await writeAuditLog({
      action: 'alteracao',
      entity: 'tarefa',
      entityId: task.id,
      entityLabel: `${task.code} · ${task.title}`,
      details: `Override manual de conclusão removido.`,
      user: actor,
    })
  }
  await recomputeTaskStatus(taskId, actorUserId)
}

/**
 * Remove a tarefa do escopo do projeto (cancelamento da tarefa em si).
 * Diferente de cancelar uma agenda — esta ação fecha o item permanentemente como "fora do escopo".
 */
export async function removeTaskFromScope(taskId: string, reason: string, actorUserId?: string): Promise<void> {
  const trimmed = reason.trim()
  if (trimmed.length < 3) throw new Error('Informe um motivo para remover a tarefa do escopo.')
  const task = await db.tasks.get(taskId)
  if (!task) throw new Error('Tarefa não encontrada.')

  const nowIso = new Date().toISOString()
  await db.tasks.update(taskId, {
    cancelledManually: true,
    completedManualOverride: false,
    completedManualOverrideReason: null,
    status: 'cancelado',
    cancelledAt: nowIso,
    completedAt: null,
  })

  if (actorUserId) {
    const actor = await getUserForAudit(actorUserId)
    await writeAuditLog({
      action: 'alteracao',
      entity: 'tarefa',
      entityId: task.id,
      entityLabel: `${task.code} · ${task.title}`,
      details: `Tarefa removida do escopo: ${trimmed}`,
      user: actor,
    })
  }

  await syncLabelsForProject(task.projectId)
  await syncProjectKanbanFromPlanState(task.projectId)
}

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
