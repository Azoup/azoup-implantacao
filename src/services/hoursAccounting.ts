import { db } from '../db/database'

/** Soma horas registradas via modal de log (inclui 0 em cancelado sem horas). */
export async function sumTimeLogHoursForTask(taskId: string): Promise<number> {
  const logs = await db.timeLogs.where('taskId').equals(taskId).toArray()
  return logs.reduce((s, l) => s + (Number.isFinite(l.hours) ? l.hours : 0), 0)
}

/** Soma durações de sessões concluídas (timesheet / cronômetro). */
export async function sumSessionHoursForTask(taskId: string): Promise<number> {
  const sessions = await db.timeSessions.where('taskId').equals(taskId).toArray()
  let sec = 0
  for (const x of sessions) {
    if (x.endedAt != null && x.durationSeconds != null && x.durationSeconds > 0) {
      sec += x.durationSeconds
    }
  }
  return sec / 3600
}

/**
 * Recalcula `actualHours` da tarefa = logs + sessões concluídas.
 * Atualiza `hoursUsed` do projeto somando apenas tarefas não informativas.
 */
export async function recalculateTaskActualHours(taskId: string): Promise<void> {
  const task = await db.tasks.get(taskId)
  if (!task) return
  const fromLogs = await sumTimeLogHoursForTask(taskId)
  const fromSessions = await sumSessionHoursForTask(taskId)
  const total = Math.round((fromLogs + fromSessions) * 1000) / 1000
  await db.tasks.update(taskId, { actualHours: total })
  await recalculateProjectHoursUsed(task.projectId)
}

export async function recalculateProjectHoursUsed(projectId: string): Promise<void> {
  const tasks = await db.tasks.where('projectId').equals(projectId).toArray()
  let sum = 0
  for (const t of tasks) {
    if (!t.isInformational) sum += t.actualHours
  }
  const rounded = Math.round(sum * 1000) / 1000
  await db.projects.update(projectId, { hoursUsed: rounded })
}

/** Reprocessa todos os projetos (ex.: migração). */
export async function recalculateAllProjectHours(): Promise<void> {
  const projects = await db.projects.toArray()
  for (const p of projects) {
    const tasks = await db.tasks.where('projectId').equals(p.id).toArray()
    for (const t of tasks) {
      const fromLogs = await sumTimeLogHoursForTask(t.id)
      const fromSessions = await sumSessionHoursForTask(t.id)
      const total = Math.round((fromLogs + fromSessions) * 1000) / 1000
      await db.tasks.update(t.id, { actualHours: total })
    }
    await recalculateProjectHoursUsed(p.id)
  }
}
