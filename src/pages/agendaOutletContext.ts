import type { RefObject } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { AgendaEventModalHandle } from '../components/agenda/AgendaEventModal'
import type { AnalystFilter } from '../lib/agendaAnalystFilter'
import type { DbAnalyst, DbEvent, DbProject, DbTask, DbTimeSession } from '../db/types'

export type AgendaCalendarBoot = { anchor: Date }

export type AgendaOutletContextValue = {
  events: DbEvent[]
  analysts: DbAnalyst[]
  tasks: DbTask[]
  projects: DbProject[]
  timeSessions: DbTimeSession[]
  analystFilter: AnalystFilter
  setAnalystFilter: (next: AnalystFilter) => void
  agendaProjectFilterId: string | null
  setAgendaProjectFilterId: (next: string | null) => void
  eventModalRef: RefObject<AgendaEventModalHandle | null>
  /** Após deep link de edição: a vista Calendário consome e alinha semana/dia. */
  calendarBoot: AgendaCalendarBoot | null
  setCalendarBoot: (next: AgendaCalendarBoot | null) => void
}

export function useAgendaOutlet(): AgendaOutletContextValue {
  return useOutletContext<AgendaOutletContextValue>()
}
