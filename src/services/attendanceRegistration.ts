import { db } from '../db/database'
import { uuid } from '../lib/uuid'
import type { DbTask, DbUser } from '../db/types'
import { addTaskTimeLog } from './timeLogs'
import { addManualTimeSession, startTimer, stopTimer, getRunningSessionForUser } from './timeSessions'
import { createEventValidated } from './events'
import { setTaskStatus } from './tasks'
import { getUserForAudit, writeAuditLog } from './auditLogs'
import type { TaskStatus } from '../db/types'

export type AttendanceKind = 'ocorreu' | 'nao_compareceu_avisou' | 'nao_compareceu_sem_aviso'
export type AttendanceEntryMode = 'timer' | 'manual'
export type AttendanceOutcomeMode = 'keep' | 'concluir' | 'reabrir'

export type RegisterAttendanceInput = {
  taskId: string
  actorUserId: string
  attendanceKind: AttendanceKind
  entryMode: AttendanceEntryMode
  manualHours: number
  notes: string
  executionDate: string
  executionTime?: string
  analystId: string | null
  taskStatus?: Extract<TaskStatus, 'pendente' | 'em_andamento' | 'concluida'>
  outcomeMode?: AttendanceOutcomeMode
  createRetroEvent?: boolean
  newDate?: string | null
}

function toIsoAt(date: string, hhmm: string): string {
  return new Date(`${date}T${hhmm}:00`).toISOString()
}

async function hasEventForTaskOnDate(taskId: string, date: string): Promise<boolean> {
  const events = await db.events.where('taskId').equals(taskId).toArray()
  return events.some((e) => (e.startTime ?? '').slice(0, 10) === date)
}

async function createRescheduledCopy(task: DbTask, newDate: string): Promise<void> {
  const siblings = await db.tasks.where('phaseId').equals(task.phaseId).toArray()
  const nextSort = siblings.reduce((m, x) => Math.max(m, x.sortOrder), 0) + 1
  await db.tasks.add({
    ...task,
    id: uuid(),
    status: 'pendente',
    actualHours: 0,
    dueDate: toIsoAt(newDate, '12:00'),
    createdAt: new Date().toISOString(),
    sortOrder: nextSort,
    title: `${task.title} (reagendada)`,
  })
}

export async function registerTaskAttendance(input: RegisterAttendanceInput): Promise<void> {
  const task = await db.tasks.get(input.taskId)
  if (!task) throw new Error('Tarefa não encontrada.')

  if (input.analystId !== undefined) {
    await db.tasks.update(task.id, { assignedTo: input.analystId })
  }

  const actor = await getUserForAudit(input.actorUserId)
  /** Início de cronômetro já ajusta status em `startTimer`; não sobrescrever com o select do modal. */
  let skipApplyTaskStatusFromForm = false
  const safeHours = Number.isFinite(input.manualHours) ? Math.max(0, input.manualHours) : 0
  const notes = input.notes.trim()
  const execDate = input.executionDate
  const execTime = input.executionTime && /^\d{2}:\d{2}$/.test(input.executionTime) ? input.executionTime : '12:00'
  const retroStart = toIsoAt(execDate, execTime)

  function retroEndFromDurationHours(h: number): string {
    if (h > 0) {
      return new Date(new Date(retroStart).getTime() + Math.max(30, Math.round(h * 60)) * 60 * 1000).toISOString()
    }
    return new Date(new Date(retroStart).getTime() + 60 * 60 * 1000).toISOString()
  }

  if (input.attendanceKind === 'ocorreu') {
    let retroEndForEvent = retroEndFromDurationHours(0)

    if (input.entryMode === 'timer') {
      const running = await getRunningSessionForUser(input.actorUserId)
      if (running?.taskId === task.id) {
        const sessionId = running.id
        await stopTimer(sessionId, input.actorUserId)
        const sess = await db.timeSessions.get(sessionId)
        const hoursFromTimer = (sess?.durationSeconds ?? 0) / 3600
        retroEndForEvent = retroEndFromDurationHours(hoursFromTimer)
      } else {
        if (running) throw new Error('Já existe cronômetro ativo em outra tarefa.')
        await startTimer(task.id, input.actorUserId)
        skipApplyTaskStatusFromForm = true
        retroEndForEvent = retroEndFromDurationHours(0)
      }
    } else {
      if (safeHours <= 0) throw new Error('Informe horas manuais maiores que zero.')
      await addManualTimeSession({
        taskId: task.id,
        userId: input.actorUserId,
        hours: safeHours,
        notes,
        at: toIsoAt(execDate, execTime),
      })
      retroEndForEvent = retroEndFromDurationHours(safeHours)
    }

    if ((input.createRetroEvent ?? true) && !(await hasEventForTaskOnDate(task.id, execDate))) {
      await createEventValidated({
        title: `${task.code} ${task.title}`.trim(),
        description: notes || 'Registro retroativo criado via atendimento da tarefa.',
        startTime: retroStart,
        endTime: retroEndForEvent,
        status: 'realizado',
        projectId: task.projectId,
        taskId: task.id,
        analystId: input.analystId,
        meetingLink: null,
      })
    }
  } else {
    const withHours = input.attendanceKind === 'nao_compareceu_sem_aviso'
    if (withHours && safeHours <= 0) {
      throw new Error('Quando não houve aviso prévio, o lançamento deve consumir horas.')
    }
    await addTaskTimeLog({
      taskId: task.id,
      userId: input.actorUserId,
      hours: withHours ? safeHours : 0,
      logType: withHours ? 'cancelado_com_horas' : 'cancelado_sem_horas',
      executionDate: toIsoAt(execDate, execTime),
      notes,
    })

    const retroEndCancel = retroEndFromDurationHours(
      input.attendanceKind === 'nao_compareceu_sem_aviso' ? safeHours : 0,
    )

    if ((input.createRetroEvent ?? true) && !(await hasEventForTaskOnDate(task.id, execDate))) {
      await createEventValidated({
        title: `${task.code} ${task.title}`.trim(),
        description:
          notes ||
          (input.attendanceKind === 'nao_compareceu_sem_aviso'
            ? 'Não ocorreu (sem aviso).'
            : 'Não ocorreu (cliente avisou).'),
        startTime: retroStart,
        endTime: retroEndCancel,
        status: 'cancelado',
        projectId: task.projectId,
        taskId: task.id,
        analystId: input.analystId,
        meetingLink: null,
      })
    }

    if (!input.newDate) throw new Error('Informe a data de reagendamento.')
    await createRescheduledCopy(task, input.newDate)
    await setTaskStatus(task.id, 'cancelado', input.actorUserId)
  }

  if (input.attendanceKind === 'ocorreu' && input.outcomeMode === 'concluir') {
    await setTaskStatus(task.id, 'concluida', input.actorUserId)
  } else if (input.attendanceKind === 'ocorreu' && input.outcomeMode === 'reabrir') {
    await setTaskStatus(task.id, 'pendente', input.actorUserId)
  } else if (input.attendanceKind === 'ocorreu' && input.taskStatus && !skipApplyTaskStatusFromForm) {
    await setTaskStatus(task.id, input.taskStatus, input.actorUserId)
  }

  await writeAuditLog({
    action: 'alteracao',
    entity: 'tarefa',
    entityId: task.id,
    entityLabel: `${task.code} · ${task.title}`,
    details: `Atendimento registrado (${input.attendanceKind}, modo ${input.entryMode}).`,
    user: actor as Pick<DbUser, 'id' | 'name' | 'email'>,
  })
}

