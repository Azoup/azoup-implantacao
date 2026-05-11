import { db } from '../db/database'
import type { DbTask, DbUser } from '../db/types'
import { addTaskTimeLog } from './timeLogs'
import { addManualTimeSession, startTimer, stopTimer, getRunningSessionForUser } from './timeSessions'
import { createEventValidated, rescheduleEvent } from './events'
import { recomputeTaskStatus, setTaskStatus } from './tasks'
import { getUserForAudit, writeAuditLog } from './auditLogs'
import type { TaskStatus } from '../db/types'
import { enqueuePendingProjectGraphSync } from '../sync/supabaseDexieBridge'

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
  /** Hora local do novo prazo (`HH:mm`), quando `newDate` é informada. */
  newTime?: string | null
}

function toIsoAt(date: string, hhmm: string): string {
  return new Date(`${date}T${hhmm}:00`).toISOString()
}

async function hasEventForTaskOnDate(taskId: string, date: string): Promise<boolean> {
  const events = await db.events.where('taskId').equals(taskId).toArray()
  return events.some((e) => (e.startTime ?? '').slice(0, 10) === date)
}

/**
 * No novo modelo (1 Tarefa : N Eventos), reagendar é criar um novo evento `agendado` para a MESMA tarefa.
 * Se houver um evento em aberto (agendado) próximo da data atual, ele é cancelado primeiro via rescheduleEvent.
 */
async function attachNewScheduledEvent(
  task: DbTask,
  newDate: string,
  newTime: string,
  consumeHoursOnCancel: number,
  cancelNotes: string | undefined,
  actorUserId?: string,
): Promise<void> {
  const hhmm = /^\d{2}:\d{2}$/.test(newTime) ? newTime : '12:00'
  const startIso = toIsoAt(newDate, hhmm)
  const endIso = new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString()

  const existing = (await db.events.where('taskId').equals(task.id).toArray()).find((e) => e.status === 'agendado')
  if (existing) {
    await rescheduleEvent({
      eventId: existing.id,
      newStartTime: startIso,
      newEndTime: endIso,
      consumeHours: consumeHoursOnCancel,
      cancelNotes,
      actorUserId,
    })
    return
  }

  await createEventValidated({
    title: `${task.code} ${task.title}`.trim(),
    description: cancelNotes ?? 'Nova agenda criada via atendimento.',
    startTime: startIso,
    endTime: endIso,
    status: 'agendado',
    projectId: task.projectId,
    taskId: task.id,
    analystId: task.assignedTo,
    meetingLink: null,
    executionState: 'scheduled',
  })
  await recomputeTaskStatus(task.id, actorUserId)
}

async function createRetroEventSafely(
  task: DbTask,
  payload: Parameters<typeof createEventValidated>[0],
  context: 'attendance-ocorreu' | 'attendance-nao-ocorreu',
): Promise<void> {
  try {
    await createEventValidated(payload)
  } catch (err) {
    // Atendimento não deve falhar por sync remoto de evento; mantém operação local e agenda re-sync.
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[attendance] evento retroativo pendente de sincronização', {
      context,
      taskId: task.id,
      projectId: task.projectId,
      error: msg,
    })
    if (task.projectId) {
      enqueuePendingProjectGraphSync(task.projectId, {
        lastErrorCode: 'ATT_EVENT_SYNC',
        lastErrorMessage: msg,
        opId: crypto.randomUUID(),
      })
    }
  }
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
      await createRetroEventSafely(
        task,
        {
        title: `${task.code} ${task.title}`.trim(),
        description: notes || 'Registro retroativo criado via atendimento da tarefa.',
        startTime: retroStart,
        endTime: retroEndForEvent,
        status: 'realizado',
        projectId: task.projectId,
        taskId: task.id,
        analystId: input.analystId,
        meetingLink: null,
        },
        'attendance-ocorreu',
      )
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
      await createRetroEventSafely(
        task,
        {
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
        },
        'attendance-nao-ocorreu',
      )
    }

    if (!input.newDate) throw new Error('Informe a data de reagendamento.')
    const rescheduleTime =
      input.newTime && /^\d{2}:\d{2}$/.test(input.newTime) ? input.newTime : '12:00'

    // Modelo novo: a tarefa permanece aberta; criamos um novo evento agendado vinculado.
    // O cancelamento de evento (com ou sem horas) NÃO altera o status da tarefa.
    await attachNewScheduledEvent(
      task,
      input.newDate,
      rescheduleTime,
      withHours ? safeHours : 0,
      input.attendanceKind === 'nao_compareceu_sem_aviso'
        ? `No-show sem aviso. ${notes}`.trim()
        : `Cliente avisou. ${notes}`.trim(),
      input.actorUserId,
    )
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

