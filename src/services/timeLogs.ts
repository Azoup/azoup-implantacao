import { uuid } from '../lib/uuid'
import { db } from '../db/database'
import { recalculateTaskActualHours } from './hoursAccounting'
import type { TimeLogType } from '../db/types'

export async function addTaskTimeLog(opts: {
  taskId: string
  userId: string
  hours: number
  logType: TimeLogType
  executionDate: string
  notes: string
}): Promise<void> {
  const task = await db.tasks.get(opts.taskId)
  if (!task) throw new Error('Tarefa não encontrada')

  const effectiveHours = opts.logType === 'cancelado_sem_horas' ? 0 : Math.max(0, opts.hours)

  await db.timeLogs.add({
    id: uuid(),
    taskId: opts.taskId,
    userId: opts.userId,
    hours: effectiveHours,
    logType: opts.logType,
    notes: opts.notes.trim(),
    executionDate: opts.executionDate,
    isLocked: false,
  })

  await recalculateTaskActualHours(opts.taskId)
}
