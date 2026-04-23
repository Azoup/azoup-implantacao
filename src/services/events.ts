import { db } from '../db/database'
import { uuid } from '../lib/uuid'

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

  return { ...data, projectId, taskId, meetingLink: cleanLink }
}

export async function createEventValidated(input: EventInput): Promise<string> {
  const valid = await validateEventLinks(input)
  const id = uuid()
  await db.events.add({
    id,
    ...valid,
    createdAt: new Date().toISOString(),
    recordingLink: null,
  })
  return id
}

export async function updateEventValidated(eventId: string, input: EventInput): Promise<void> {
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
  })
}

