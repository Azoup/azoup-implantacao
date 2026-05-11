import { CalendarClock, CalendarX2, Check, CircleSlash, Info, Lock, Timer } from 'lucide-react'
import type { DbEvent, DbTask } from '../db/types'

type Props = {
  task: Pick<
    DbTask,
    'id' | 'status' | 'isInformational' | 'completedAt' | 'completedManualOverride' | 'cancelledManually'
  >
  events: readonly DbEvent[]
  /**
   * Eventos já limitados à linha (ex.: cadeia `rescheduled*` mesclada no detalhe do projeto).
   * Quando definido, ignora o filtro por `task.id` em `events`.
   */
  rowScopedEvents?: readonly DbEvent[]
  className?: string
}

type ChipState = 'no_schedule' | 'scheduled' | 'in_session' | 'done_event' | 'done_manual' | 'removed' | 'informational'

const DATE_FMT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
const TIME_FMT = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

function pickEventsForTask(events: readonly DbEvent[], taskId: string): DbEvent[] {
  return events.filter((ev) => ev.taskId === taskId)
}

function nextScheduledOrLast(events: readonly DbEvent[]): DbEvent | null {
  const scheduled = events.filter((e) => e.status === 'agendado')
  if (scheduled.length === 0) return null
  const now = Date.now()
  const sorted = [...scheduled].sort((a, b) => a.startTime.localeCompare(b.startTime))
  const inWindow = sorted.find((e) => {
    const s = new Date(e.startTime).getTime()
    const en = new Date(e.endTime).getTime()
    return s <= now && en > now
  })
  if (inWindow) return inWindow
  const upcoming = sorted.find((e) => new Date(e.startTime).getTime() > now)
  if (upcoming) return upcoming
  return sorted[sorted.length - 1] ?? null
}

function lastRealized(events: readonly DbEvent[]): DbEvent | null {
  const realized = events.filter((e) => e.status === 'realizado')
  if (realized.length === 0) return null
  return [...realized].sort((a, b) => (b.endTime ?? b.startTime).localeCompare(a.endTime ?? a.startTime))[0] ?? null
}

function deriveState(props: Props): { state: ChipState; primaryEvent: DbEvent | null; taskEvents: DbEvent[] } {
  const taskEvents =
    props.rowScopedEvents !== undefined
      ? [...props.rowScopedEvents]
      : pickEventsForTask(props.events, props.task.id)

  if (props.task.isInformational) {
    return { state: 'informational', primaryEvent: null, taskEvents }
  }
  if (props.task.cancelledManually || props.task.status === 'cancelado') {
    return { state: 'removed', primaryEvent: null, taskEvents }
  }
  if (props.task.completedManualOverride) {
    return { state: 'done_manual', primaryEvent: null, taskEvents }
  }
  const realized = lastRealized(taskEvents)
  if (realized) {
    return { state: 'done_event', primaryEvent: realized, taskEvents }
  }
  const scheduled = nextScheduledOrLast(taskEvents)
  if (scheduled) {
    const now = Date.now()
    const startMs = new Date(scheduled.startTime).getTime()
    const endMs = new Date(scheduled.endTime).getTime()
    const inSession = startMs <= now && endMs > now
    return { state: inSession ? 'in_session' : 'scheduled', primaryEvent: scheduled, taskEvents }
  }
  return { state: 'no_schedule', primaryEvent: null, taskEvents }
}

const STATE_META: Record<
  ChipState,
  { tone: 'info' | 'warning' | 'success' | 'muted' | 'danger'; icon: typeof CalendarClock; label: string }
> = {
  no_schedule: { tone: 'info', icon: CalendarX2, label: 'Sem agenda' },
  scheduled: { tone: 'warning', icon: CalendarClock, label: 'Agendada' },
  in_session: { tone: 'warning', icon: Timer, label: 'Em sessão' },
  done_event: { tone: 'success', icon: Check, label: 'Concluída' },
  done_manual: { tone: 'success', icon: Lock, label: 'Concluída (manual)' },
  removed: { tone: 'muted', icon: CircleSlash, label: 'Removida do escopo' },
  informational: { tone: 'muted', icon: Info, label: 'Informativa' },
}

export function TaskScheduleChip({ task, events, rowScopedEvents, className }: Props) {
  const { state, primaryEvent, taskEvents } = deriveState({ task, events, rowScopedEvents })
  const meta = STATE_META[state]
  const Icon = meta.icon
  const scheduledCount = taskEvents.filter((e) => e.status === 'agendado').length

  let datePart = ''
  if (state === 'scheduled' && primaryEvent) {
    const d = new Date(primaryEvent.startTime)
    datePart = `${DATE_FMT.format(d)} · ${TIME_FMT.format(d)}`
  } else if (state === 'in_session' && primaryEvent) {
    datePart = `até ${TIME_FMT.format(new Date(primaryEvent.endTime))}`
  } else if (state === 'done_event' && primaryEvent) {
    datePart = DATE_FMT.format(new Date(primaryEvent.endTime ?? primaryEvent.startTime))
  } else if (state === 'done_manual' && task.completedAt) {
    datePart = DATE_FMT.format(new Date(task.completedAt))
  }

  const extras: string[] = []
  if (state === 'scheduled' && scheduledCount > 1) {
    extras.push(`+${scheduledCount - 1} agenda${scheduledCount - 1 > 1 ? 's' : ''}`)
  }
  const now = Date.now()
  if (
    rowScopedEvents &&
    taskEvents.some((e) => e.status === 'cancelado') &&
    taskEvents.some((e) => e.status === 'agendado' && new Date(e.startTime).getTime() > now) &&
    (state === 'scheduled' || state === 'in_session')
  ) {
    extras.push('agenda anterior cancelada')
  }

  const detailTitle =
    state === 'informational'
      ? 'Informativa · não consome horas do contrato'
      : `${meta.label}${datePart ? ' · ' + datePart : ''}${extras.length ? ' · ' + extras.join(' · ') : ''}`
  const ariaLabel =
    state === 'informational' ? 'Informativa, não consome horas do contrato' : `${meta.label}${datePart ? ' ' + datePart : ''}`

  return (
    <span
      className={
        'task-schedule-chip task-schedule-chip--' +
        meta.tone +
        ' task-schedule-chip--' +
        state +
        (className ? ' ' + className : '')
      }
      role="status"
      aria-label={ariaLabel}
      title={detailTitle}
    >
      <Icon size={12} aria-hidden />
      <span className="task-schedule-chip__label">{meta.label}</span>
      {datePart ? <span className="task-schedule-chip__date">{datePart}</span> : null}
      {extras.length > 0 ? <span className="task-schedule-chip__extra">{extras.join(' · ')}</span> : null}
    </span>
  )
}
