import { db } from '../db/database'
import type { DbEvent } from '../db/types'
import { isProjectEligibleForScheduling } from '../lib/projectStatus'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { uuid } from '../lib/uuid'
import {
  deleteEventRowFromSupabase,
  syncEventRowToSupabase,
} from '../sync/supabaseDexieBridge'
import { dispatchSyncFailure } from '../sync/syncFailure'
import { addTaskTimeLog } from './timeLogs'
import { recomputeTaskStatus } from './tasks'
import { getUserForAudit, writeAuditLog } from './auditLogs'
import {
  deleteEventFromGoogleCalendar,
  isGoogleCalendarSyncEnabled,
  maybeEnqueueGoogleCalendarPush,
} from './calendarPushQueue'

type EventInput = {
  title: string
  description: string
  startTime: string
  endTime: string
  status: 'agendado' | 'realizado' | 'cancelado'
  projectId: string | null
  taskId: string | null
  analystId: string | null
  meetingLink: string | null
  executionState?: 'scheduled' | 'in_progress' | 'paused' | 'completed' | null
  outcomeSummary?: string | null
  nextStep?: string | null
  closedAt?: string | null
  loggedHours?: number | null
}

export type EventWriteResult = {
  id: string
  cloudSync: 'local_only' | 'queued' | 'synced'
}

function ensureValidEventWindow(startTime: string, endTime: string): void {
  const s = new Date(startTime).getTime()
  const e = new Date(endTime).getTime()
  if (!Number.isFinite(s) || !Number.isFinite(e)) throw new Error('Data/hora inválida no evento.')
  if (e <= s) throw new Error('O fim do evento precisa ser depois do início.')
}

async function validateEventLinks(data: EventInput): Promise<EventInput> {
  ensureValidEventWindow(data.startTime, data.endTime)

  let projectId = data.projectId
  const taskId = data.taskId

  if (taskId) {
    const task = await db.tasks.get(taskId)
    if (!task) throw new Error('Tarefa vinculada não encontrada.')
    if (projectId && task.projectId !== projectId) {
      throw new Error('A tarefa vinculada não pertence ao projeto informado.')
    }
    projectId = task.projectId
  }

  if (projectId) {
    const project = await db.projects.get(projectId)
    if (!project) throw new Error('Projeto vinculado não encontrado.')
    if (!isProjectEligibleForScheduling(project.status)) {
      throw new Error('Não é possível vincular a projeto finalizado, cancelado ou congelado.')
    }
  }

  if (data.analystId) {
    const analyst = await db.analysts.get(data.analystId)
    if (!analyst) throw new Error('Analista não encontrado.')
    if (!analyst.active) throw new Error('Analista inativo não pode receber novo evento.')
  }

  const cleanLink = data.meetingLink?.trim() ? data.meetingLink.trim() : null
  if (cleanLink) {
    try {
      const u = new URL(cleanLink)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('invalid protocol')
    } catch {
      throw new Error('Link da reunião inválido. Use URL completa (https://...).')
    }
  }

  const outcomeSummary = data.outcomeSummary?.trim() ? data.outcomeSummary.trim() : null
  const nextStep = data.nextStep?.trim() ? data.nextStep.trim() : null
  const closedAt = data.closedAt ?? null
  const loggedHours = Number.isFinite(data.loggedHours) ? Math.max(0, Number(data.loggedHours)) : null
  return {
    ...data,
    projectId,
    taskId,
    meetingLink: cleanLink,
    outcomeSummary,
    nextStep,
    closedAt,
    loggedHours,
    executionState: data.executionState ?? null,
  }
}

export async function createEventValidated(input: EventInput): Promise<EventWriteResult> {
  const valid = await validateEventLinks(input)
  const id = uuid()
  const row: DbEvent = {
    id,
    ...valid,
    createdAt: new Date().toISOString(),
    recordingLink: null,
  }
  await db.events.add(row)
  if (!isSupabaseConfigured()) return { id, cloudSync: 'local_only' }
  try {
    await syncEventRowToSupabase(row)
    if (isGoogleCalendarSyncEnabled()) await maybeEnqueueGoogleCalendarPush(id)
    return { id, cloudSync: 'synced' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    dispatchSyncFailure({ table: 'events', operation: 'upsert', message })
    console.warn('[events] created event saved locally; cloud sync queued', { id, err })
    return { id, cloudSync: 'queued' }
  }
}

type CancelEventInput = {
  eventId: string
  consumeHours?: number
  notes?: string
  actorUserId?: string | null
}

type MarkEventRealizedInput = {
  eventId: string
  endTime?: string
  outcomeSummary?: string | null
  nextStep?: string | null
  loggedHours?: number | null
  closedAt?: string | null
  actorUserId?: string | null
}

type RescheduleEventInput = {
  eventId: string
  newStartTime: string
  newEndTime: string
  consumeHours?: number
  cancelNotes?: string
  actorUserId?: string | null
}

async function persistEventChange(eventId: string): Promise<EventWriteResult> {
  if (!isSupabaseConfigured()) return { id: eventId, cloudSync: 'local_only' }
  const updated = await db.events.get(eventId)
  if (!updated) return { id: eventId, cloudSync: 'queued' }
  try {
    await syncEventRowToSupabase(updated)
    if (isGoogleCalendarSyncEnabled()) await maybeEnqueueGoogleCalendarPush(eventId)
    return { id: eventId, cloudSync: 'synced' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    dispatchSyncFailure({ table: 'events', operation: 'upsert', message })
    console.warn('[events] saved locally; cloud sync queued', { id: eventId, err })
    return { id: eventId, cloudSync: 'queued' }
  }
}

/**
 * Cancela um evento (agenda) sem consumir horas da tarefa.
 * O status da tarefa NÃO é alterado por esta função — chame recomputeTaskStatus em seguida.
 */
export async function cancelEventNoHours(input: CancelEventInput): Promise<EventWriteResult> {
  const event = await db.events.get(input.eventId)
  if (!event) throw new Error('Evento não encontrado.')
  await db.events.update(input.eventId, {
    status: 'cancelado',
    executionState: null,
    closedAt: new Date().toISOString(),
    loggedHours: 0,
    nextStep: input.notes ? `Cancelado sem horas. ${input.notes}` : event.nextStep ?? null,
  })

  if (input.actorUserId && event.taskId) {
    const actor = await getUserForAudit(input.actorUserId)
    await writeAuditLog({
      action: 'alteracao',
      entity: 'tarefa',
      entityId: event.taskId,
      entityLabel: event.title,
      details: `Agenda cancelada sem consumo de horas.${input.notes ? ' ' + input.notes : ''}`,
      user: actor,
    })
  }

  if (event.taskId) await recomputeTaskStatus(event.taskId, input.actorUserId ?? undefined)
  return persistEventChange(input.eventId)
}

/**
 * Cancela um evento consumindo horas da tarefa (no-show sem aviso, por exemplo).
 * Registra um TimeLog `cancelado_com_horas` mas mantém a tarefa aberta.
 */
export async function cancelEventWithHours(input: CancelEventInput): Promise<EventWriteResult> {
  const hours = Number.isFinite(input.consumeHours) ? Math.max(0, Number(input.consumeHours)) : 0
  if (hours <= 0) throw new Error('Informe horas maiores que zero para cancelar com consumo.')
  const event = await db.events.get(input.eventId)
  if (!event) throw new Error('Evento não encontrado.')
  if (!event.taskId) throw new Error('Evento sem tarefa vinculada não pode consumir horas.')

  await db.events.update(input.eventId, {
    status: 'cancelado',
    executionState: null,
    closedAt: new Date().toISOString(),
    loggedHours: hours,
    nextStep: input.notes ? `Cancelado com ${hours}h. ${input.notes}` : event.nextStep ?? null,
  })

  await addTaskTimeLog({
    taskId: event.taskId,
    userId: input.actorUserId ?? '',
    hours,
    logType: 'cancelado_com_horas',
    executionDate: new Date().toISOString(),
    notes: input.notes ?? 'Agenda cancelada com consumo de horas.',
  })

  if (input.actorUserId) {
    const actor = await getUserForAudit(input.actorUserId)
    await writeAuditLog({
      action: 'alteracao',
      entity: 'tarefa',
      entityId: event.taskId,
      entityLabel: event.title,
      details: `Agenda cancelada consumindo ${hours}h.${input.notes ? ' ' + input.notes : ''}`,
      user: actor,
    })
  }

  await recomputeTaskStatus(event.taskId, input.actorUserId ?? undefined)
  return persistEventChange(input.eventId)
}

/**
 * Marca um evento como realizado. O status da tarefa será recomputado para `concluida` (a menos que outro override esteja ativo).
 */
export async function markEventRealized(input: MarkEventRealizedInput): Promise<EventWriteResult> {
  const event = await db.events.get(input.eventId)
  if (!event) throw new Error('Evento não encontrado.')

  await db.events.update(input.eventId, {
    status: 'realizado',
    executionState: 'completed',
    endTime: input.endTime ?? event.endTime,
    outcomeSummary: input.outcomeSummary ?? event.outcomeSummary ?? null,
    nextStep: input.nextStep ?? event.nextStep ?? null,
    loggedHours: input.loggedHours ?? event.loggedHours ?? null,
    closedAt: input.closedAt ?? new Date().toISOString(),
  })

  if (input.actorUserId && event.taskId) {
    const actor = await getUserForAudit(input.actorUserId)
    await writeAuditLog({
      action: 'alteracao',
      entity: 'tarefa',
      entityId: event.taskId,
      entityLabel: event.title,
      details: `Agenda marcada como realizada${input.loggedHours ? ` (${input.loggedHours}h)` : ''}.`,
      user: actor,
    })
  }

  if (event.taskId) await recomputeTaskStatus(event.taskId, input.actorUserId ?? undefined)
  return persistEventChange(input.eventId)
}

/**
 * Reagenda um evento: cancela o atual (com/sem horas) e cria um novo `agendado` para a mesma tarefa.
 * Substitui o antigo fluxo de "clonar tarefa" do modelo 1:1.
 */
export async function rescheduleEvent(input: RescheduleEventInput): Promise<{ cancelled: EventWriteResult; created: EventWriteResult }> {
  const event = await db.events.get(input.eventId)
  if (!event) throw new Error('Evento não encontrado.')
  ensureValidEventWindow(input.newStartTime, input.newEndTime)

  const hours = Number.isFinite(input.consumeHours) ? Math.max(0, Number(input.consumeHours)) : 0
  const cancelled =
    hours > 0
      ? await cancelEventWithHours({
          eventId: event.id,
          consumeHours: hours,
          notes: input.cancelNotes,
          actorUserId: input.actorUserId,
        })
      : await cancelEventNoHours({
          eventId: event.id,
          notes: input.cancelNotes,
          actorUserId: input.actorUserId,
        })

  const created = await createEventValidated({
    title: event.title,
    description: event.description,
    startTime: input.newStartTime,
    endTime: input.newEndTime,
    status: 'agendado',
    projectId: event.projectId,
    taskId: event.taskId,
    analystId: event.analystId,
    meetingLink: event.meetingLink,
    executionState: 'scheduled',
    outcomeSummary: null,
    nextStep: null,
    closedAt: null,
    loggedHours: null,
  })

  if (event.taskId) await recomputeTaskStatus(event.taskId, input.actorUserId ?? undefined)
  return { cancelled, created }
}

export async function updateEventValidated(eventId: string, input: EventInput): Promise<EventWriteResult> {
  const current = await db.events.get(eventId)
  if (!current) throw new Error('Evento não encontrado.')
  const valid = await validateEventLinks(input)
  await db.events.update(eventId, {
    title: valid.title,
    description: valid.description,
    startTime: valid.startTime,
    endTime: valid.endTime,
    status: valid.status,
    projectId: valid.projectId,
    taskId: valid.taskId,
    analystId: valid.analystId,
    meetingLink: valid.meetingLink,
    executionState: valid.executionState ?? null,
    outcomeSummary: valid.outcomeSummary ?? null,
    nextStep: valid.nextStep ?? null,
    closedAt: valid.closedAt ?? null,
    loggedHours: valid.loggedHours ?? null,
  })
  if (!isSupabaseConfigured()) return { id: eventId, cloudSync: 'local_only' }
  const updated = await db.events.get(eventId)
  if (!updated) return { id: eventId, cloudSync: 'queued' }
  try {
    await syncEventRowToSupabase(updated)
    if (isGoogleCalendarSyncEnabled()) await maybeEnqueueGoogleCalendarPush(eventId)
    return { id: eventId, cloudSync: 'synced' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    dispatchSyncFailure({ table: 'events', operation: 'upsert', message })
    console.warn('[events] updated event saved locally; cloud sync queued', { id: eventId, err })
    return { id: eventId, cloudSync: 'queued' }
  }
}

/**
 * Exclui o compromisso localmente e na nuvem; remove no Google quando já sincronizado.
 * Com sync Google ativo, a exclusão remota passa pela Edge Function (Google + linha `events`).
 */
export async function deleteEventValidated(eventId: string): Promise<EventWriteResult> {
  const event = await db.events.get(eventId)
  if (!event) throw new Error('Evento não encontrado.')

  if (isGoogleCalendarSyncEnabled() && isSupabaseConfigured()) {
    try {
      await deleteEventFromGoogleCalendar(eventId)
      await db.events.delete(eventId)
      return { id: eventId, cloudSync: 'synced' }
    } catch (err) {
      await db.events.delete(eventId)
      try {
        await deleteEventRowFromSupabase(eventId)
        return { id: eventId, cloudSync: 'synced' }
      } catch (inner) {
        const message = inner instanceof Error ? inner.message : String(inner)
        dispatchSyncFailure({ table: 'events', operation: 'delete', message })
        throw err instanceof Error ? err : new Error(String(err))
      }
    }
  }

  await db.events.delete(eventId)
  if (!isSupabaseConfigured()) return { id: eventId, cloudSync: 'local_only' }
  try {
    await deleteEventRowFromSupabase(eventId)
    return { id: eventId, cloudSync: 'synced' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    dispatchSyncFailure({ table: 'events', operation: 'delete', message })
    console.warn('[events] deleted locally; cloud delete pending', { eventId, err })
    return { id: eventId, cloudSync: 'queued' }
  }
}

