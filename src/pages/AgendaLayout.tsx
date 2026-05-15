import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { AgendaEventModal, type AgendaEventModalHandle } from '../components/agenda/AgendaEventModal'
import { RoutePageFallback } from '../components/RoutePageFallback'
import { useAuth } from '../auth/AuthContext'
import { hasScope } from '../auth/permissions'
import { db } from '../db/database'
import {
  emptyAnalysts,
  emptyEvents,
  emptyProjects,
  emptyTasks,
} from '../lib/stableDexieEmpty'
import {
  parseAgendaIntentFromSearch,
  parseAgendaNavIntent,
  stripAgendaDeepLinkParams,
  AGENDA_CALENDAR_PATH,
} from '../lib/agendaDeepLink'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import {
  isGoogleCalendarSyncEnabled,
  pullGoogleCalendarEvents,
} from '../services/calendarPushQueue'
import { useUiFeedback } from '../ui/UiFeedbackContext'
import {
  loadAnalystFilterFromStorage,
  persistAnalystFilter,
  type AnalystFilter,
} from '../lib/agendaAnalystFilter'
import type { AgendaCalendarBoot, AgendaOutletContextValue } from './agendaOutletContext'

export function AgendaLayout() {
  const { user } = useAuth()
  const canEditAgenda = hasScope(user, 'agenda.edit')
  const { toastError, toast } = useUiFeedback()
  const location = useLocation()
  const navigate = useNavigate()
  const eventModalRef = useRef<AgendaEventModalHandle>(null)
  const prefillConsumedKey = useRef<string | null>(null)

  const events = useLiveQuery(() => db.events.orderBy('startTime').toArray(), []) ?? emptyEvents
  const analysts = useLiveQuery(() => db.analysts.toArray(), []) ?? emptyAnalysts
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? emptyTasks
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? emptyProjects
  const timeSessionsQuery = useLiveQuery(() => db.timeSessions.toArray(), [])
  const timeSessions = useMemo(() => timeSessionsQuery ?? [], [timeSessionsQuery])

  const [analystFilter, setAnalystFilterState] = useState<AnalystFilter>(loadAnalystFilterFromStorage)
  const [agendaProjectFilterId, setAgendaProjectFilterId] = useState<string | null>(null)
  const [calendarBoot, setCalendarBoot] = useState<AgendaCalendarBoot | null>(null)

  const setAnalystFilter = useCallback((next: AnalystFilter) => {
    persistAnalystFilter(next)
    setAnalystFilterState(next)
  }, [])

  const outletContext = useMemo<AgendaOutletContextValue>(
    () => ({
      events,
      analysts,
      tasks,
      projects,
      timeSessions,
      analystFilter,
      setAnalystFilter,
      agendaProjectFilterId,
      setAgendaProjectFilterId,
      eventModalRef,
      calendarBoot,
      setCalendarBoot,
    }),
    [
      events,
      analysts,
      tasks,
      projects,
      timeSessions,
      analystFilter,
      setAnalystFilter,
      agendaProjectFilterId,
      calendarBoot,
    ],
  )

  useEffect(() => {
    const intent = parseAgendaNavIntent(location.search, location.state)
    if (!intent) return

    const fromUrl = parseAgendaIntentFromSearch(location.search) != null
    const token = fromUrl
      ? `url:${location.key}:${location.search}`
      : `state:${location.key}:${intent.kind}:${intent.kind === 'editEvent' ? intent.eventId : intent.taskId}`

    if (prefillConsumedKey.current === token) return
    prefillConsumedKey.current = token

    const nextSearch = fromUrl ? stripAgendaDeepLinkParams(location.search) : location.search
    const targetPath =
      intent.kind === 'editEvent' ? AGENDA_CALENDAR_PATH : location.pathname || AGENDA_CALENDAR_PATH

    navigate({ pathname: targetPath, search: nextSearch, hash: location.hash }, { replace: true, state: {} })

    if (intent.kind === 'editEvent') {
      void (async () => {
        const z = await eventModalRef.current?.openEditEvent(intent.eventId)
        if (z) setCalendarBoot({ anchor: z })
      })().catch((err) => {
        console.warn('[agenda] Falha ao abrir evento para edição.', err)
        toastError('Não foi possível abrir o compromisso na agenda.')
      })
      return
    }

    if (!canEditAgenda) return
    void eventModalRef.current
      ?.openPrefillTask(intent.taskId, intent.projectId)
      .catch((err) => {
        console.warn('[agenda] Falha ao abrir pre-preenchimento de evento.', err)
        toastError('Não foi possível abrir o agendamento desta tarefa.')
      })
  }, [
    location.search,
    location.state,
    location.key,
    location.pathname,
    location.hash,
    navigate,
    canEditAgenda,
    toastError,
  ])

  const mappedAnalystIdsKey = useMemo(
    () =>
      analysts
        .filter((a) => a.active && a.googleCalendarId?.trim())
        .map((a) => a.id)
        .sort()
        .join(','),
    [analysts],
  )

  useEffect(() => {
    if (!isGoogleCalendarSyncEnabled() || !isSupabaseConfigured()) return
    if (!mappedAnalystIdsKey) return
    let cancelled = false
    void (async () => {
      try {
        const { imported, updated, deferred } = await pullGoogleCalendarEvents()
        if (deferred || cancelled) return
        if (imported > 0 || updated > 0) {
          toast(`Google Agenda: ${imported} novo(s), ${updated} atualizado(s).`)
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[agenda] Pull Google Calendar falhou.', err)
          toastError(
            err instanceof Error ? err.message : 'Não foi possível importar compromissos do Google Agenda.',
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mappedAnalystIdsKey, toast, toastError])

  return (
    <div className="page page--wide agenda-page agenda-page--gc">
      <nav className="agenda-view-tabs" aria-label="Vistas da agenda">
        <NavLink
          to={AGENDA_CALENDAR_PATH}
          className={({ isActive }) => 'agenda-view-tabs__link' + (isActive ? ' is-active' : '')}
        >
          Calendário
        </NavLink>
        <NavLink
          to="/agenda/em-execucao"
          className={({ isActive }) => 'agenda-view-tabs__link' + (isActive ? ' is-active' : '')}
        >
          Em execução
        </NavLink>
        <NavLink
          to="/agenda/tarefas-nao-agendadas"
          className={({ isActive }) => 'agenda-view-tabs__link' + (isActive ? ' is-active' : '')}
        >
          Tarefas não agendadas
        </NavLink>
      </nav>
      <Suspense fallback={<RoutePageFallback />}>
        <Outlet context={outletContext} />
      </Suspense>
      <AgendaEventModal
        ref={eventModalRef}
        projects={projects}
        tasks={tasks}
        analysts={analysts}
        canEditAgenda={canEditAgenda}
      />
    </div>
  )
}
