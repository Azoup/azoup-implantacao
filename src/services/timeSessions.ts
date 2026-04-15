import { uuid } from '../lib/uuid'
import { db } from '../db/database'
import { recalculateTaskActualHours } from './hoursAccounting'
import { getUserForAudit, writeAuditLog } from './auditLogs'

export async function getRunningSessionForUser(userId: string) {
  const all = await db.timeSessions.where('userId').equals(userId).toArray()
  return all.find((s) => s.endedAt == null) ?? null
}

export async function startTimer(taskId: string, userId: string): Promise<string> {
  const task = await db.tasks.get(taskId)
  if (!task) throw new Error('Tarefa não encontrada')
  const project = await db.projects.get(task.projectId)
  const analystId = task.assignedTo ?? project?.analystId ?? null

  const running = await getRunningSessionForUser(userId)
  if (running) {
    if (running.taskId === taskId) throw new Error('O cronômetro já está rodando nesta tarefa.')
    throw new Error('Pare o cronômetro na outra tarefa antes de iniciar um novo.')
  }

  const now = new Date().toISOString()
  const id = uuid()
  await db.timeSessions.add({
    id,
    taskId,
    userId,
    analystId,
    startedAt: now,
    endedAt: null,
    durationSeconds: null,
    source: 'timer',
    notes: '',
    createdAt: now,
  })
  const actor = await getUserForAudit(userId)
  await writeAuditLog({
    action: 'inclusao',
    entity: 'timer',
    entityId: id,
    entityLabel: task.title,
    details: `Início de cronômetro na tarefa ${task.code}.`,
    user: actor,
  })
  return id
}

export async function stopTimer(sessionId: string, userId: string): Promise<void> {
  const session = await db.timeSessions.get(sessionId)
  if (!session) throw new Error('Sessão não encontrada')
  if (session.userId !== userId) throw new Error('Esta sessão pertence a outro usuário.')
  if (session.endedAt != null) throw new Error('Esta sessão já foi encerrada.')

  const end = Date.now()
  const start = new Date(session.startedAt).getTime()
  const seconds = Math.max(0, Math.floor((end - start) / 1000))

  await db.timeSessions.update(sessionId, {
    endedAt: new Date(end).toISOString(),
    durationSeconds: seconds,
  })
  await recalculateTaskActualHours(session.taskId)
  const task = await db.tasks.get(session.taskId)
  const actor = await getUserForAudit(userId)
  await writeAuditLog({
    action: 'alteracao',
    entity: 'timer',
    entityId: sessionId,
    entityLabel: task?.title ?? session.taskId,
    details: `Cronômetro encerrado com duração de ${seconds}s.`,
    user: actor,
  })
}

/** Bloco manual (esqueci de usar o cronômetro): duração em horas decimais. */
export async function addManualTimeSession(opts: {
  taskId: string
  userId: string
  hours: number
  notes?: string
  at?: string
}): Promise<string> {
  const task = await db.tasks.get(opts.taskId)
  if (!task) throw new Error('Tarefa não encontrada')
  const project = await db.projects.get(task.projectId)
  const analystId = task.assignedTo ?? project?.analystId ?? null
  const h = Math.max(0, opts.hours)
  if (h <= 0) throw new Error('Informe um tempo maior que zero.')

  const seconds = Math.round(h * 3600)
  const at = opts.at ?? new Date().toISOString()
  const id = uuid()
  await db.timeSessions.add({
    id,
    taskId: opts.taskId,
    userId: opts.userId,
    analystId,
    startedAt: at,
    endedAt: at,
    durationSeconds: seconds,
    source: 'manual',
    notes: (opts.notes ?? '').trim(),
    createdAt: new Date().toISOString(),
  })
  await recalculateTaskActualHours(opts.taskId)
  const actor = await getUserForAudit(opts.userId)
  await writeAuditLog({
    action: 'inclusao',
    entity: 'timer',
    entityId: id,
    entityLabel: task.title,
    details: `Lançamento manual de ${h.toFixed(2)}h na tarefa ${task.code}.`,
    user: actor,
  })
  return id
}

export async function updateSessionDurationSeconds(sessionId: string, userId: string, seconds: number): Promise<void> {
  const session = await db.timeSessions.get(sessionId)
  if (!session) throw new Error('Sessão não encontrada')
  if (session.userId !== userId) throw new Error('Sem permissão para editar esta sessão.')
  if (session.endedAt == null) throw new Error('Não é possível editar duração com o cronômetro em andamento.')

  const s = Math.max(0, Math.floor(seconds))
  await db.timeSessions.update(sessionId, { durationSeconds: s })
  await recalculateTaskActualHours(session.taskId)
  const task = await db.tasks.get(session.taskId)
  const actor = await getUserForAudit(userId)
  await writeAuditLog({
    action: 'alteracao',
    entity: 'timer',
    entityId: sessionId,
    entityLabel: task?.title ?? session.taskId,
    details: `Duração ajustada para ${s}s.`,
    user: actor,
  })
}

export async function deleteTimeSession(sessionId: string, userId: string, justification: string): Promise<void> {
  const session = await db.timeSessions.get(sessionId)
  if (!session) return
  if (session.userId !== userId) throw new Error('Sem permissão para excluir esta sessão.')
  if (session.endedAt == null) throw new Error('Pare o cronômetro antes de excluir a sessão.')
  const reason = justification.trim()
  if (reason.length < 8) throw new Error('Informe uma justificativa com pelo menos 8 caracteres.')

  const taskId = session.taskId
  const task = await db.tasks.get(taskId)
  await db.timeSessions.delete(sessionId)
  await recalculateTaskActualHours(taskId)
  const actor = await getUserForAudit(userId)
  await writeAuditLog({
    action: 'exclusao',
    entity: 'timer',
    entityId: sessionId,
    entityLabel: task?.title ?? taskId,
    details: `Registro de tempo removido (origem: ${session.source}).`,
    justification: reason,
    user: actor,
  })
}
