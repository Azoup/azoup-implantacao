import { db } from '../db/database'
import type { DbEvent } from '../db/types'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { uuid } from '../lib/uuid'
import { syncEventRowToSupabase } from '../sync/supabaseDexieBridge'
import { dispatchSyncFailure } from '../sync/syncFailure'

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
    return { id, cloudSync: 'synced' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    dispatchSyncFailure({ table: 'events', operation: 'upsert', message })
    console.warn('[events] created event saved locally; cloud sync queued', { id, err })
    return { id, cloudSync: 'queued' }
  }
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
    return { id: eventId, cloudSync: 'synced' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    dispatchSyncFailure({ table: 'events', operation: 'upsert', message })
    console.warn('[events] updated event saved locally; cloud sync queued', { id: eventId, err })
    return { id: eventId, cloudSync: 'queued' }
  }
}

