import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import type { DbEvent, DbTask } from '../db/types'
import { CAL_TZ } from './calendarGrid'
import { stripTaskCodePrefix } from './calendarEventTitle'
import {
  resolveSessionType,
  sessionTypeDescription,
  sessionTypeUsesGoogleMeet,
} from './sessionType'

const fmtOpts = { locale: ptBR }

function formatEventDate(startIso: string): string {
  return formatInTimeZone(startIso, CAL_TZ, 'dd/MM/yyyy', fmtOpts)
}

function formatEventTime(iso: string): string {
  return formatInTimeZone(iso, CAL_TZ, "HH'h'mm", fmtOpts)
}

/** Normaliza URL do Meet para colar no WhatsApp (https). */
export function formatMeetLinkForExport(link: string | null | undefined): string | null {
  const trimmed = link?.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^meet\.google\.com/i.test(trimmed)) return `https://${trimmed}`
  return trimmed
}

function taskDisplayTitle(task: DbTask | undefined, event: DbEvent): string {
  if (task?.title?.trim()) {
    return stripTaskCodePrefix(task.title.trim()) || task.title.trim()
  }
  const fromEvent = event.title.includes(' - ') ? event.title.split(' - ').pop()?.trim() : event.title
  return fromEvent?.trim() || 'Compromisso'
}

export function buildWhatsAppScheduleText(
  project: { projectName: string },
  events: readonly DbEvent[],
  tasks: readonly DbTask[],
): string {
  const taskById = new Map(tasks.map((t) => [t.id, t]))
  const header = `AZOUP & ${project.projectName.trim().toUpperCase()}`
  const lines = events.map((ev) => {
    const task = ev.taskId ? taskById.get(ev.taskId) : undefined
    const date = formatEventDate(ev.startTime)
    const startH = formatEventTime(ev.startTime)
    const endH = formatEventTime(ev.endTime)
    const title = taskDisplayTitle(task, ev)
    const sessionType = resolveSessionType(title, task?.sessionType)
    const desc = sessionTypeDescription(title, task?.sessionType)
    const parts = [`${date} - ${startH} às ${endH} - ${title}`, `> ${desc}`]
    if (sessionTypeUsesGoogleMeet(sessionType)) {
      const meet = formatMeetLinkForExport(ev.meetingLink)
      if (meet) parts.push(`> ${meet}`)
    }
    return parts.join('\n')
  })
  return [header, '', ...lines].join('\n')
}
