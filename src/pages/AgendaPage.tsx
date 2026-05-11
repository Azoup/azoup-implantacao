import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addDays, addMonths, addWeeks, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, CalendarPlus, ChevronLeft, ChevronRight, Clock, ListTodo, Video } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { toZonedTime } from 'date-fns-tz'
import { useLocation, useNavigate } from 'react-router-dom'
import { AgendaMiniMonth } from '../components/AgendaMiniMonth'
import { useAuth } from '../auth/AuthContext'
import { hasScope } from '../auth/permissions'
import { db } from '../db/database'
import { eventColorsFromAnalyst } from '../lib/analystColors'
import { buildGoogleCalendarTemplateUrl } from '../lib/googleCalendarUrl'
import { brDateTimeToIso, normalizeBrDateInput, normalizeTimeInput } from '../lib/dateTimeInput'
import { formatDurationHmFromHours } from '../lib/durationFormat'
import { compareTaskCode } from '../lib/taskCode'
import type { DbEvent, DbProject, DbTask } from '../db/types'
import { createEventValidated, updateEventValidated } from '../services/events'
import { getRunningSessionForUser, startTimer, stopTimer } from '../services/timeSessions'
import { setTaskStatus } from '../services/tasks'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { useRegisterUnsavedChanges } from '../navigation/UnsavedChangesContext'
import { useUnsavedCloseGuard } from '../navigation/useUnsavedCloseGuard'
import { useUiFeedback } from '../ui/UiFeedbackContext'
import {
  emptyAnalysts,
  emptyEvents,
  emptyProjects,
  emptyTasks,
} from '../lib/stableDexieEmpty'
import {
  assignLanes,
  CAL_TZ,
  dayKey,
  dayKeyFromIso,
  formatDayHeader,
  formatSingleDayLong,
  formatWeekRangeLabel,
  GRID_END_HOUR,
  GRID_START_HOUR,
  hourSlots,
  layoutInGrid,
  minutesFromMidnightInTz,
  mondayOfWeekContaining,
  type Segment,
  weekDaysMonFri,
  zonedNow,
} from '../lib/calendarGrid'

type ViewMode = 'week' | 'day'
type CloseTaskDecision = 'keep' | 'in_progress' | 'done'

function agendaModalSnapshotArg(p: {
  editingEventId: string | null
  title: string
  description: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  analystId: string
  meetingLink: string
  modalProjectId: string | null
  modalTaskId: string | null
}) {
  return JSON.stringify(p)
}

function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function toTimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function clipSegment(ev: DbEvent): Segment | null {
  const gridStart = GRID_START_HOUR * 60
  const gridEnd = GRID_END_HOUR * 60
  let s = minutesFromMidnightInTz(ev.startTime)
  let e = minutesFromMidnightInTz(ev.endTime)
  if (e <= s) e = s + 30
  s = Math.max(gridStart, s)
  e = Math.min(gridEnd, e)
  if (e <= s) return null
  return { id: ev.id, startMin: s, endMin: e }
}

type AgendaLocationState = {
  prefillTaskId?: string
  prefillProjectId?: string
  editEventId?: string
}

export function AgendaPage() {
  const { user } = useAuth()
  const canEditAgenda = hasScope(user, 'agenda.edit')
  const location = useLocation()
  const navigate = useNavigate()
  const prefillConsumedKey = useRef<string | null>(null)
  const { toast, toastError, toastWarn } = useUiFeedback()

  const events = useLiveQuery(() => db.events.orderBy('startTime').toArray(), []) ?? emptyEvents
  const analysts = useLiveQuery(() => db.analysts.toArray(), []) ?? emptyAnalysts
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? emptyTasks
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? emptyProjects
  const timeSessionsQuery = useLiveQuery(() => db.timeSessions.toArray(), [])
  const timeSessions = useMemo(() => timeSessionsQuery ?? [], [timeSessionsQuery])

  const [weekMonday, setWeekMonday] = useState(() => mondayOfWeekContaining(new Date()))
  const [activeDay, setActiveDay] = useState(() => zonedNow())
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(zonedNow()))
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [filter, setFilter] = useState<string>('all')
  /** Filtra a grade e a lista de tarefas sem compromisso na lateral. */
  const [agendaProjectFilterId, setAgendaProjectFilterId] = useState<string | null>(null)
  const [unscheduledSearch, setUnscheduledSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [analystId, setAnalystId] = useState<string>('')
  const [meetingLink, setMeetingLink] = useState('')
  const [modalProjectId, setModalProjectId] = useState<string | null>(null)
  const [modalTaskId, setModalTaskId] = useState<string | null>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [agendaModalBaseline, setAgendaModalBaseline] = useState<string | null>(null)
  const [agendaEventSaving, setAgendaEventSaving] = useState(false)
  const [closingEventId, setClosingEventId] = useState<string | null>(null)
  const [closeTaskDecision, setCloseTaskDecision] = useState<CloseTaskDecision>('keep')
  const [closeOutcomeSummary, setCloseOutcomeSummary] = useState('')
  const [closeNextStep, setCloseNextStep] = useState('')
  const [closeLoggedHours, setCloseLoggedHours] = useState('')
  const [closeSaving, setCloseSaving] = useState(false)
  const [timerTick, setTimerTick] = useState(0)

  function prefillModalFromTask(task: DbTask, projectRow?: DbProject | null) {
    if (!canEditAgenda) return
    const now = new Date()
    const end = new Date(now.getTime() + 60 * 60 * 1000)
    const p = projectRow ?? projects.find((x) => x.id === task.projectId) ?? null
    setEditingEventId(null)
    setTitle(`${task.code} ${task.title}`.trim())
    setDescription('')
    setStartDate(toDateInput(now))
    setStartTime(toTimeInput(now))
    setEndDate(toDateInput(end))
    setEndTime(toTimeInput(end))
    setAnalystId(task.assignedTo ?? p?.analystId ?? '')
    setMeetingLink('')
    setModalProjectId(p?.id ?? task.projectId ?? null)
    setModalTaskId(task.id)
    setModalOpen(true)
  }

  useEffect(() => {
    const st = location.state as AgendaLocationState | null
    if (!st) return

    if (st.editEventId) {
      const token = `${location.key}:edit:${st.editEventId}`
      if (prefillConsumedKey.current === token) return
      prefillConsumedKey.current = token
      const eid = st.editEventId
      navigate(location.pathname, { replace: true, state: {} })
      void (async () => {
        const ev = await db.events.get(eid)
        if (!ev) {
          toastError('Evento não encontrado na agenda.')
          return
        }
        const startDt = new Date(ev.startTime)
        const endDt = new Date(ev.endTime)
        const zStart = toZonedTime(startDt, CAL_TZ)
        setWeekMonday(mondayOfWeekContaining(zStart))
        setActiveDay(zStart)
        setMonthCursor(startOfMonth(zStart))
        setViewMode('day')
        if (!canEditAgenda) {
          toastWarn('Sem permissão para editar a agenda.')
          return
        }
        setEditingEventId(ev.id)
        setTitle(ev.title)
        setDescription(ev.description ?? '')
        setStartDate(toDateInput(startDt))
        setStartTime(toTimeInput(startDt))
        setEndDate(toDateInput(endDt))
        setEndTime(toTimeInput(endDt))
        setAnalystId(ev.analystId ?? '')
        setMeetingLink(ev.meetingLink ?? '')
        setModalProjectId(ev.projectId)
        setModalTaskId(ev.taskId)
        setModalOpen(true)
      })().catch((err) => {
        console.warn('[agenda] Falha ao abrir evento para edição.', err)
      })
      return
    }

    if (!st.prefillTaskId) return
    const token = `${location.key}:prefill:${st.prefillTaskId}`
    if (prefillConsumedKey.current === token) return
    prefillConsumedKey.current = token
    const tid = st.prefillTaskId
    const pid = st.prefillProjectId
    navigate(location.pathname, { replace: true, state: {} })
    if (!canEditAgenda) return
    void (async () => {
      const task = await db.tasks.get(tid)
      const project = await db.projects.get(pid ?? task?.projectId ?? '')
      if (!task) {
        toastError('Tarefa não encontrada.')
        return
      }
      const now = new Date()
      const end = new Date(now.getTime() + 60 * 60 * 1000)
      setTitle(`${task.code} ${task.title}`.trim())
      const aid = task.assignedTo ?? project?.analystId ?? ''
      setAnalystId(aid)
      setStartDate(toDateInput(now))
      setStartTime(toTimeInput(now))
      setEndDate(toDateInput(end))
      setEndTime(toTimeInput(end))
      setModalProjectId(project?.id ?? task.projectId ?? null)
      setModalTaskId(task.id)
      setEditingEventId(null)
      setModalOpen(true)
    })().catch((err) => {
      console.warn('[agenda] Falha ao abrir pre-preenchimento de evento.', err)
    })
  }, [location.state, location.key, location.pathname, navigate, canEditAgenda, toastError, toastWarn])

  const todayKey = dayKey(zonedNow())

  const displayDays = useMemo(() => {
    if (viewMode === 'week') return weekDaysMonFri(weekMonday)
    return [activeDay]
  }, [viewMode, weekMonday, activeDay])

  const subtitle = useMemo(() => {
    if (viewMode === 'week') return formatWeekRangeLabel(weekMonday)
    return formatSingleDayLong(activeDay)
  }, [viewMode, weekMonday, activeDay])

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])

  const projectNameById = useMemo(() => new Map(projects.map((p) => [p.id, p.projectName])), [projects])

  const projectsForPickers = useMemo(
    () =>
      [...projects]
        .filter((p) => p.status !== 'cancelado')
        .sort((a, b) => a.projectName.localeCompare(b.projectName, 'pt')),
    [projects],
  )

  const filteredEvents = useMemo(() => {
    let list =
      filter === 'all'
        ? events
        : filter === 'unassigned'
          ? events.filter((e) => !e.analystId)
          : events.filter((e) => e.analystId === filter)
    if (agendaProjectFilterId) {
      list = list.filter((ev) => {
        const pid = ev.projectId ?? (ev.taskId ? taskById.get(ev.taskId)?.projectId : undefined)
        return pid === agendaProjectFilterId
      })
    }
    return list
  }, [events, filter, agendaProjectFilterId, taskById])

  const unscheduledSearchNorm = unscheduledSearch.trim().toLowerCase()

  const openTasksForModalSelect = useMemo(() => {
    if (!modalProjectId) return []
    return tasks
      .filter((t) => t.projectId === modalProjectId && t.status !== 'concluida' && t.status !== 'cancelado')
      .sort((a, b) => compareTaskCode(a.code, b.code) || a.sortOrder - b.sortOrder)
  }, [tasks, modalProjectId])

  const dayKeysVisible = useMemo(() => new Set(displayDays.map((d) => dayKey(d))), [displayDays])

  const daysWithEvents = useMemo(() => {
    const s = new Set<string>()
    for (const ev of filteredEvents) {
      s.add(dayKeyFromIso(ev.startTime))
    }
    return s
  }, [filteredEvents])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DbEvent[]>()
    for (const k of dayKeysVisible) map.set(k, [])
    for (const ev of filteredEvents) {
      const k = dayKeyFromIso(ev.startTime)
      if (map.has(k)) map.get(k)!.push(ev)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime))
    }
    return map
  }, [filteredEvents, dayKeysVisible])

  const laneMaps = useMemo(() => {
    const out = new Map<string, Map<string, { lane: number; laneCount: number }>>()
    for (const k of dayKeysVisible) {
      const list = eventsByDay.get(k) ?? []
      const segments: Segment[] = []
      for (const ev of list) {
        const seg = clipSegment(ev)
        if (seg) segments.push(seg)
      }
      out.set(k, assignLanes(segments))
    }
    return out
  }, [eventsByDay, dayKeysVisible])

  const unscheduled = useMemo(() => {
    const linked = new Set(events.map((e) => e.taskId).filter(Boolean) as string[])
    let list = tasks.filter((t) => !linked.has(t.id) && t.status !== 'concluida' && t.status !== 'cancelado')
    if (agendaProjectFilterId) list = list.filter((t) => t.projectId === agendaProjectFilterId)
    if (unscheduledSearchNorm) {
      list = list.filter((t) => {
        const pn = projectNameById.get(t.projectId) ?? ''
        const hay = `${t.code} ${t.title} ${pn}`.toLowerCase()
        return hay.includes(unscheduledSearchNorm)
      })
    }
    list = [...list].sort((a, b) => {
      const na = projectNameById.get(a.projectId) ?? ''
      const nb = projectNameById.get(b.projectId) ?? ''
      const c = na.localeCompare(nb, 'pt')
      if (c !== 0) return c
      return compareTaskCode(a.code, b.code) || a.sortOrder - b.sortOrder
    })
    return list.slice(0, 150)
  }, [tasks, events, agendaProjectFilterId, unscheduledSearchNorm, projectNameById])

  const nowTopPct = layoutInGrid(new Date().toISOString(), new Date(Date.now() + 60_000).toISOString()).topPct
  const userId = user?.id ?? null

  const executionEventsToday = useMemo(
    () =>
      filteredEvents
        .filter((ev) => dayKeyFromIso(ev.startTime) === todayKey)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [filteredEvents, todayKey],
  )

  const activeSessionByTaskId = useMemo(() => {
    const out = new Map<string, string>()
    if (!userId) return out
    for (const s of timeSessions) {
      if (s.userId === userId && s.endedAt == null) out.set(s.taskId, s.id)
    }
    return out
  }, [timeSessions, userId])

  useEffect(() => {
    if (activeSessionByTaskId.size === 0) return
    const id = window.setInterval(() => setTimerTick((v) => v + 1), 1000)
    return () => window.clearInterval(id)
  }, [activeSessionByTaskId.size])

  const eventById = useMemo(() => new Map(events.map((ev) => [ev.id, ev])), [events])
  const closingEvent = closingEventId ? eventById.get(closingEventId) ?? null : null

  function formatSecondsClock(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds))
    const hh = String(Math.floor(s / 3600)).padStart(2, '0')
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }

  function hoursSuggestionForEvent(ev: DbEvent): number {
    if (!ev.taskId || !userId) return 0
    const sessions = timeSessions.filter((s) => s.userId === userId && s.taskId === ev.taskId)
    const targetDay = dayKeyFromIso(ev.startTime)
    const nowMs = Date.now() + timerTick * 0
    const seconds = sessions
      .filter((s) => dayKeyFromIso(s.startedAt) === targetDay)
      .reduce((acc, s) => {
        if (s.endedAt == null) {
          const startMs = new Date(s.startedAt).getTime()
          if (!Number.isFinite(startMs)) return acc
          return acc + Math.max(0, Math.floor((nowMs - startMs) / 1000))
        }
        return acc + (s.durationSeconds ?? 0)
      }, 0)
    return Math.round((seconds / 3600) * 100) / 100
  }

  async function persistExecutionEvent(
    ev: DbEvent,
    updates: Partial<Pick<DbEvent, 'status' | 'executionState' | 'outcomeSummary' | 'nextStep' | 'closedAt' | 'loggedHours'>>,
  ) {
    await updateEventValidated(ev.id, {
      title: ev.title,
      description: ev.description,
      startTime: ev.startTime,
      endTime: ev.endTime,
      status: updates.status ?? ev.status,
      projectId: ev.projectId,
      taskId: ev.taskId,
      analystId: ev.analystId,
      meetingLink: ev.meetingLink,
      executionState: updates.executionState ?? ev.executionState ?? 'scheduled',
      outcomeSummary: updates.outcomeSummary ?? ev.outcomeSummary ?? null,
      nextStep: updates.nextStep ?? ev.nextStep ?? null,
      closedAt: updates.closedAt ?? ev.closedAt ?? null,
      loggedHours: updates.loggedHours ?? ev.loggedHours ?? null,
    })
  }

  async function handleStartExecution(ev: DbEvent) {
    if (!userId) return
    if (!ev.taskId) {
      toastWarn('Vincule uma tarefa ao evento para usar o timer.')
      return
    }
    try {
      await startTimer(ev.taskId, userId)
      await persistExecutionEvent(ev, { executionState: 'in_progress' })
      toast('Execução iniciada.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Não foi possível iniciar o timer.')
    }
  }

  async function handlePauseExecution(ev: DbEvent) {
    if (!userId || !ev.taskId) return
    try {
      const running = await getRunningSessionForUser(userId)
      if (!running || running.taskId !== ev.taskId) {
        toastWarn('Nenhum timer ativo para pausar neste item.')
        return
      }
      await stopTimer(running.id, userId)
      await persistExecutionEvent(ev, { executionState: 'paused' })
      toast('Execução pausada.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Não foi possível pausar o timer.')
    }
  }

  async function handleResumeExecution(ev: DbEvent) {
    if (!userId || !ev.taskId) return
    try {
      await startTimer(ev.taskId, userId)
      await persistExecutionEvent(ev, { executionState: 'in_progress' })
      toast('Execução retomada.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Não foi possível retomar o timer.')
    }
  }

  function openCloseWizard(ev: DbEvent) {
    setClosingEventId(ev.id)
    setCloseTaskDecision(ev.taskId ? 'keep' : 'in_progress')
    setCloseOutcomeSummary(ev.outcomeSummary ?? '')
    setCloseNextStep(ev.nextStep ?? '')
    setCloseLoggedHours(String(hoursSuggestionForEvent(ev) || ''))
  }

  async function handleConfirmCloseWizard() {
    if (!closingEvent || !userId) return
    if (!closeOutcomeSummary.trim() || !closeNextStep.trim()) {
      toastWarn('Preencha resultado e próximo passo para concluir.')
      return
    }
    const parsedHours = Number(closeLoggedHours.replace(',', '.'))
    if (!Number.isFinite(parsedHours) || parsedHours < 0) {
      toastWarn('Horas inválidas. Informe um número maior ou igual a zero.')
      return
    }
    setCloseSaving(true)
    try {
      if (closingEvent.taskId) {
        if (closeTaskDecision === 'done') await setTaskStatus(closingEvent.taskId, 'concluida', userId)
        if (closeTaskDecision === 'in_progress') await setTaskStatus(closingEvent.taskId, 'em_andamento', userId)
      }
      const running = await getRunningSessionForUser(userId)
      if (running && closingEvent.taskId && running.taskId === closingEvent.taskId) {
        await stopTimer(running.id, userId)
      }
      await persistExecutionEvent(closingEvent, {
        status: 'realizado',
        executionState: 'completed',
        outcomeSummary: closeOutcomeSummary.trim(),
        nextStep: closeNextStep.trim(),
        closedAt: new Date().toISOString(),
        loggedHours: parsedHours,
      })
      setClosingEventId(null)
      toast('Execução concluída e registrada.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Não foi possível concluir a execução.')
    } finally {
      setCloseSaving(false)
    }
  }

  const primaryExecutionCta = useMemo(() => {
    const runningEvent = executionEventsToday.find((ev) => ev.taskId && activeSessionByTaskId.has(ev.taskId))
    if (runningEvent) {
      return { label: 'Pausar execução', kind: 'pause' as const, eventId: runningEvent.id }
    }
    const pausedEvent = executionEventsToday.find((ev) => ev.executionState === 'paused' && ev.taskId)
    if (pausedEvent) {
      return { label: 'Retomar execução', kind: 'resume' as const, eventId: pausedEvent.id }
    }
    const startCandidate = executionEventsToday.find((ev) => ev.status !== 'cancelado' && ev.executionState !== 'completed')
    if (startCandidate) {
      return { label: 'Iniciar execução', kind: 'start' as const, eventId: startCandidate.id }
    }
    return null
  }, [executionEventsToday, activeSessionByTaskId])

  const goToday = useCallback(() => {
    const now = new Date()
    const mon = mondayOfWeekContaining(now)
    setWeekMonday(mon)
    setActiveDay(zonedNow())
    setMonthCursor(startOfMonth(toZonedTime(now, CAL_TZ)))
  }, [])

  const goPrev = useCallback(() => {
    if (viewMode === 'week') {
      setWeekMonday((w) => addWeeks(w, -1))
    } else {
      setActiveDay((d) => {
        const n = addDays(d, -1)
        setWeekMonday(mondayOfWeekContaining(n))
        return n
      })
    }
  }, [viewMode])

  const goNext = useCallback(() => {
    if (viewMode === 'week') {
      setWeekMonday((w) => addWeeks(w, 1))
    } else {
      setActiveDay((d) => {
        const n = addDays(d, 1)
        setWeekMonday(mondayOfWeekContaining(n))
        return n
      })
    }
  }, [viewMode])

  const switchToDay = useCallback(() => {
    setViewMode('day')
    setActiveDay(zonedNow())
    setWeekMonday(mondayOfWeekContaining(new Date()))
  }, [])

  const switchToWeek = useCallback(() => {
    setViewMode('week')
    setWeekMonday(mondayOfWeekContaining(activeDay))
  }, [activeDay])

  const onMiniSelectDay = useCallback((d: Date) => {
    const z = toZonedTime(d, CAL_TZ)
    setActiveDay(z)
    setWeekMonday(mondayOfWeekContaining(z))
    setMonthCursor(startOfMonth(z))
    setViewMode('day')
  }, [])

  function resetAgendaEventModal() {
    setAgendaEventSaving(false)
    setAgendaModalBaseline(null)
    setModalOpen(false)
    setModalProjectId(null)
    setModalTaskId(null)
    setEditingEventId(null)
    setTitle('')
    setDescription('')
    setStartDate('')
    setStartTime('')
    setEndDate('')
    setEndTime('')
    setAnalystId('')
    setMeetingLink('')
  }

  function closeEventModalImmediate() {
    if (agendaEventSaving) return
    resetAgendaEventModal()
  }

  async function saveEventFromModal(e: FormEvent) {
    e.preventDefault()
    if (!canEditAgenda || agendaEventSaving) return
    if (!startDate || !startTime || !endDate || !endTime) return
    const startIso = brDateTimeToIso(startDate, startTime)
    const endIso = brDateTimeToIso(endDate, endTime)
    if (!startIso || !endIso) {
      toast('Use o formato BR: data dd/MM/aaaa e hora HH:mm.', 'warn')
      return
    }
    setAgendaEventSaving(true)
    let cloudSync: 'local_only' | 'queued' | 'synced' = 'local_only'
    try {
      if (editingEventId) {
        const current = await db.events.get(editingEventId)
        if (!current) {
          toastError('Evento não encontrado.')
          return
        }
        const result = await updateEventValidated(editingEventId, {
          title: title.trim() || 'Evento',
          description: description.trim(),
          startTime: startIso,
          endTime: endIso,
          status: current.status,
          projectId: modalProjectId,
          taskId: modalTaskId,
          analystId: analystId || null,
          meetingLink: meetingLink.trim() || null,
        })
        cloudSync = result.cloudSync
      } else {
        const result = await createEventValidated({
          title: title.trim() || 'Evento',
          description: description.trim(),
          startTime: startIso,
          endTime: endIso,
          status: 'agendado',
          projectId: modalProjectId,
          taskId: modalTaskId,
          analystId: analystId || null,
          meetingLink: meetingLink.trim() || null,
        })
        cloudSync = result.cloudSync
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Não foi possível salvar o evento.')
      return
    } finally {
      setAgendaEventSaving(false)
    }
    resetAgendaEventModal()
    if (cloudSync === 'synced') {
      toast('Evento salvo e confirmado na nuvem.')
    } else if (cloudSync === 'queued') {
      toastWarn('Evento salvo localmente. Nuvem pendente (fila de sincronização).')
    } else {
      toast('Evento salvo (dados locais neste aparelho).')
    }
  }

  useLayoutEffect(() => {
    if (!modalOpen) {
      setAgendaModalBaseline(null)
      return
    }
    setAgendaModalBaseline((prev) => {
      if (prev !== null) return prev
      return agendaModalSnapshotArg({
        editingEventId,
        title,
        description,
        startDate,
        startTime,
        endDate,
        endTime,
        analystId,
        meetingLink,
        modalProjectId,
        modalTaskId,
      })
    })
  }, [
    modalOpen,
    editingEventId,
    title,
    description,
    startDate,
    startTime,
    endDate,
    endTime,
    analystId,
    meetingLink,
    modalProjectId,
    modalTaskId,
  ])

  const agendaModalDirty = useMemo(() => {
    if (!modalOpen || agendaModalBaseline === null) return false
    return (
      agendaModalSnapshotArg({
        editingEventId,
        title,
        description,
        startDate,
        startTime,
        endDate,
        endTime,
        analystId,
        meetingLink,
        modalProjectId,
        modalTaskId,
      }) !== agendaModalBaseline
    )
  }, [
    modalOpen,
    agendaModalBaseline,
    editingEventId,
    title,
    description,
    startDate,
    startTime,
    endDate,
    endTime,
    analystId,
    meetingLink,
    modalProjectId,
    modalTaskId,
  ])

  useRegisterUnsavedChanges({
    enabled: modalOpen,
    isDirty: () => agendaModalDirty,
    onSave: async () => {
      await saveEventFromModal({ preventDefault() {} } as FormEvent)
    },
    message: 'Há alterações não gravadas neste evento da agenda.',
  })

  const attemptCloseEventModal = useUnsavedCloseGuard({
    isDirty: () => agendaModalDirty,
    onSave: async () => {
      await saveEventFromModal({ preventDefault() {} } as FormEvent)
    },
    onDiscard: closeEventModalImmediate,
    message: 'Ha alteracoes nao gravadas neste evento da agenda. Deseja gravar antes de sair?',
  })

  useEffect(() => {
    if (!modalOpen) return
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape' || agendaEventSaving) return
      ev.preventDefault()
      void attemptCloseEventModal()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalOpen, agendaEventSaving, attemptCloseEventModal])

  const slots = hourSlots()

  const headerTitle =
    viewMode === 'week'
      ? formatInTimeZone(weekMonday, CAL_TZ, 'MMMM yyyy', { locale: ptBR })
      : formatInTimeZone(activeDay, CAL_TZ, 'MMMM yyyy', { locale: ptBR })

  return (
    <div className="page page--wide agenda-page agenda-page--gc">
      <div className="agenda-gc-layout">
        <aside className="agenda-gc-sidebar panel" aria-label="Calendário em miniatura e filtros da agenda">
          <AgendaMiniMonth
            anchor={monthCursor}
            todayKeyStr={todayKey}
            daysWithEvents={daysWithEvents}
            onSelectDay={onMiniSelectDay}
            onPrevMonth={() => setMonthCursor((m) => subMonths(m, 1))}
            onNextMonth={() => setMonthCursor((m) => addMonths(m, 1))}
          />
          <div className="agenda-gc-legend">
            <h3 className="agenda-gc-legend__title">Legenda</h3>
            <p className="agenda-gc-legend__hint muted">A cor do evento segue o analista responsável.</p>
            <button
              type="button"
              className={'agenda-gc-legend__row' + (filter === 'all' ? ' is-active' : '')}
              onClick={() => setFilter('all')}
            >
              <span className="agenda-gc-legend__dot agenda-gc-legend__dot--all" />
              Todos os eventos
            </button>
            {analysts.filter((a) => a.active).map((a) => (
              <button
                key={a.id}
                type="button"
                className={'agenda-gc-legend__row' + (filter === a.id ? ' is-active' : '')}
                onClick={() => setFilter(a.id)}
              >
                <span className="agenda-gc-legend__dot" style={{ background: a.color }} />
                {a.name}
              </button>
            ))}
            <button
              type="button"
              className={'agenda-gc-legend__row' + (filter === 'unassigned' ? ' is-active' : '')}
              onClick={() => setFilter('unassigned')}
            >
              <span className="agenda-gc-legend__dot agenda-gc-legend__dot--unassigned" />
              Sem responsável
            </button>
          </div>
          <div className="agenda-google-card">
            <h3 className="agenda-google-card__title">Google Agenda</h3>
            <p className="agenda-google-card__text muted">
              Use <strong>Abrir no Google</strong> em cada evento para criar o mesmo compromisso na sua conta Google
              (abre em nova aba; não exige login no VynTask).
            </p>
            <p className="agenda-google-card__text muted">
              <strong>Sincronização automática</strong> (dois sentidos) exige projeto no Google Cloud, OAuth e um
              servidor seguro para guardar tokens — possível em uma fase futura com backend.
            </p>
          </div>
        </aside>

        <div className="agenda-gc-main">
          <header className="agenda-gc-bar agenda-gc-bar--surface" aria-label="Período e visualização da agenda">
            <div className="agenda-gc-bar__left">
              <h1 className="agenda-gc-bar__title">Agenda</h1>
              <p className="agenda-gc-bar__sub">{subtitle}</p>
            </div>
            <div className="agenda-gc-bar__center">
              <button type="button" className="agenda-gc-today" onClick={goToday}>
                Hoje
              </button>
              <div className="agenda-gc-arrows">
                <button type="button" className="btn btn--icon agenda-gc-icon" aria-label="Anterior" onClick={goPrev}>
                  <ChevronLeft size={22} strokeWidth={1.75} />
                </button>
                <button type="button" className="btn btn--icon agenda-gc-icon" aria-label="Próximo" onClick={goNext}>
                  <ChevronRight size={22} strokeWidth={1.75} />
                </button>
              </div>
              <span className="agenda-gc-bar__month" aria-hidden>
                {headerTitle}
              </span>
            </div>
            <div className="agenda-gc-bar__right">
              <div className="agenda-seg agenda-seg--gc">
                <button
                  type="button"
                  className={'agenda-seg__btn' + (viewMode === 'day' ? ' is-active' : '')}
                  onClick={switchToDay}
                >
                  Dia
                </button>
                <button
                  type="button"
                  className={'agenda-seg__btn' + (viewMode === 'week' ? ' is-active' : '')}
                  onClick={switchToWeek}
                >
                  Semana
                </button>
              </div>
              <button
                type="button"
                className="btn btn--primary agenda-gc-create"
                disabled={!canEditAgenda}
                onClick={() => {
                  if (!canEditAgenda) return
                  const now = new Date()
                  const end = new Date(now.getTime() + 60 * 60 * 1000)
                  setEditingEventId(null)
                  setTitle('')
                  setDescription('')
                  setAnalystId('')
                  setMeetingLink('')
                  setStartDate(toDateInput(now))
                  setStartTime(toTimeInput(now))
                  setEndDate(toDateInput(end))
                  setEndTime(toTimeInput(end))
                  setModalProjectId(null)
                  setModalTaskId(null)
                  setModalOpen(true)
                }}
              >
                + Criar
              </button>
            </div>
          </header>

          <section className="agenda-exec panel" aria-label="Execução inteligente de hoje">
            <div className="agenda-exec__head">
              <div>
                <h2 className="agenda-exec__title">Execução de hoje</h2>
                <p className="agenda-exec__hint muted">
                  Entre na reunião, execute com timer e conclua com resultado, próximo passo e horas.
                </p>
              </div>
              {primaryExecutionCta ? (
                <button
                  type="button"
                  className="btn btn--primary agenda-exec__primary"
                  onClick={() => {
                    const target = eventById.get(primaryExecutionCta.eventId)
                    if (!target) return
                    if (primaryExecutionCta.kind === 'pause') {
                      void handlePauseExecution(target)
                      return
                    }
                    if (primaryExecutionCta.kind === 'resume') {
                      void handleResumeExecution(target)
                      return
                    }
                    void handleStartExecution(target)
                  }}
                >
                  {primaryExecutionCta.label}
                </button>
              ) : null}
            </div>
            <div className="agenda-exec__list">
              {executionEventsToday.length === 0 ? (
                <div className="agenda-empty agenda-exec__empty" role="status">
                  <Calendar className="agenda-empty__icon" size={26} strokeWidth={1.75} aria-hidden />
                  <p className="agenda-empty__title">Sem execuções para hoje</p>
                  <p className="agenda-empty__hint muted">
                    Compromissos do dia com tarefa vinculada aparecem aqui para timer e fechamento.
                  </p>
                </div>
              ) : null}
              {executionEventsToday.map((ev) => {
                const task = ev.taskId ? taskById.get(ev.taskId) : null
                const runningSessionId = ev.taskId ? activeSessionByTaskId.get(ev.taskId) : undefined
                const state = runningSessionId
                  ? 'running'
                  : ev.executionState === 'paused'
                    ? 'paused'
                    : ev.executionState === 'completed' || ev.status === 'realizado'
                      ? 'done'
                      : 'scheduled'
                const suggestedHours = hoursSuggestionForEvent(ev)
                const suggestedSeconds = Math.round(suggestedHours * 3600)
                return (
                  <article key={ev.id} className={`agenda-exec-item is-${state}`}>
                    <div className="agenda-exec-item__main">
                      <p className="agenda-exec-item__time">
                        {formatInTimeZone(ev.startTime, CAL_TZ, 'HH:mm')} - {formatInTimeZone(ev.endTime, CAL_TZ, 'HH:mm')}
                      </p>
                      <h3 className="agenda-exec-item__title">{ev.title}</h3>
                      <p className="agenda-exec-item__meta">
                        {task ? `${task.code} · ${task.title}` : 'Sem tarefa vinculada'}
                      </p>
                    </div>
                    <div className="agenda-exec-item__side">
                      <span className={`agenda-exec-chip is-${state}`}>
                        {state === 'running'
                          ? 'Em execução'
                          : state === 'paused'
                            ? 'Pausado'
                            : state === 'done'
                              ? 'Concluído'
                              : 'Agendado'}
                      </span>
                      <span className="agenda-exec-item__timer" aria-live="polite">
                        {formatSecondsClock(suggestedSeconds)}
                      </span>
                    </div>
                    <div className="agenda-exec-item__actions">
                      {ev.meetingLink ? (
                        <a className="btn btn--ghost" href={ev.meetingLink} target="_blank" rel="noopener noreferrer">
                          Entrar na reunião
                        </a>
                      ) : null}
                      {task ? (
                        state === 'running' ? (
                          <button type="button" className="btn btn--ghost" onClick={() => void handlePauseExecution(ev)}>
                            Pausar
                          </button>
                        ) : state === 'paused' ? (
                          <button type="button" className="btn btn--ghost" onClick={() => void handleResumeExecution(ev)}>
                            Retomar
                          </button>
                        ) : state !== 'done' ? (
                          <button type="button" className="btn btn--ghost" onClick={() => void handleStartExecution(ev)}>
                            Iniciar timer
                          </button>
                        ) : null
                      ) : null}
                      {state !== 'done' ? (
                        <button type="button" className="btn btn--primary" onClick={() => openCloseWizard(ev)}>
                          Fechar execução
                        </button>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="cal-shell cal-shell--gc">
            <div className="cal-scroll">
              <div className="cal-head">
                <div className="cal-head__spacer" aria-hidden />
                {displayDays.map((d) => {
                  const dk = dayKey(d)
                  const { weekday, day } = formatDayHeader(d)
                  const isToday = dk === todayKey
                  return (
                    <div key={dk} className={'cal-head__col' + (isToday ? ' is-today' : '')}>
                      <span className="cal-head__wd">{weekday}</span>
                      <span className={'cal-head__num' + (isToday ? ' is-ring' : '')}>{day}</span>
                    </div>
                  )
                })}
              </div>
              <div className="cal-body" style={{ height: `${slots.length * 52}px` }}>
                <div className="cal-times">
                  {slots.map((h) => (
                    <div key={h} className="cal-times__cell">
                      {String(h).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>
                {displayDays.map((d) => {
                  const dk = dayKey(d)
                  const list = eventsByDay.get(dk) ?? []
                  const lanes = laneMaps.get(dk) ?? new Map()
                  const showNow = dk === todayKey
                  return (
                    <div key={dk} className={'cal-day' + (showNow ? ' is-today-col' : '')}>
                      <div className="cal-day__grid" aria-hidden>
                        {slots.map((h) => (
                          <div key={h} className="cal-day__hour" />
                        ))}
                      </div>
                      {showNow ? (
                        <div className="cal-now-line" style={{ top: `${nowTopPct}%` }} aria-hidden />
                      ) : null}
                      <div className="cal-day__events">
                        {list.map((ev) => {
                          const an = analysts.find((a) => a.id === ev.analystId)
                          const { topPct, heightPct } = layoutInGrid(ev.startTime, ev.endTime)
                          const lane = lanes.get(ev.id)
                          const lc = lane?.laneCount ?? 1
                          const ln = lane?.lane ?? 0
                          const widthPct = 100 / lc
                          const leftPct = ln * widthPct
                          const cancelled = ev.status === 'cancelado'
                          const task = ev.taskId ? tasks.find((t) => t.id === ev.taskId) : undefined
                          const proj = ev.projectId
                            ? projects.find((p) => p.id === ev.projectId)
                            : task
                              ? projects.find((p) => p.id === task.projectId)
                              : undefined
                          const sub = proj?.projectName
                          const { accent, bg, text } = eventColorsFromAnalyst(an?.color, cancelled)
                          const gCalUrl = buildGoogleCalendarTemplateUrl({
                            title: ev.title,
                            startIso: ev.startTime,
                            endIso: ev.endTime,
                            details: [ev.description, sub ? `Projeto: ${sub}` : '', an ? `Analista: ${an.name}` : '']
                              .filter(Boolean)
                              .join('\n'),
                            location: ev.meetingLink ?? undefined,
                          })
                          return (
                            <div
                              key={ev.id}
                              className={'cal-event cal-event--gc' + (cancelled ? ' is-cancelled' : '')}
                              style={{
                                top: `${topPct}%`,
                                height: `${heightPct}%`,
                                left: `${leftPct + 0.8}%`,
                                width: `${widthPct - 1.6}%`,
                                ['--evt-accent' as string]: accent,
                                ['--evt-bg' as string]: bg,
                                ['--evt-text' as string]: text,
                              }}
                              title={ev.title}
                            >
                              <span className="cal-event__accent-bar" aria-hidden />
                              <div className="cal-event__body">
                                <span className="cal-event__title">{ev.title}</span>
                                <span className="cal-event__time">
                                  {formatInTimeZone(ev.startTime, CAL_TZ, 'HH:mm')} —{' '}
                                  {formatInTimeZone(ev.endTime, CAL_TZ, 'HH:mm')}
                                </span>
                                {sub ? <span className="cal-event__sub">{sub}</span> : null}
                                {cancelled ? <span className="cal-event__badge">Cancelado</span> : null}
                              </div>
                              <div className="cal-event__foot">
                                {ev.meetingLink ? (
                                  <a
                                    className="cal-event__icon-btn"
                                    href={ev.meetingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Link da reunião"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Video size={14} strokeWidth={2} />
                                  </a>
                                ) : null}
                                <a
                                  className="cal-event__icon-btn cal-event__icon-btn--google"
                                  href={gCalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Adicionar ao Google Agenda"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <CalendarPlus size={14} strokeWidth={2} />
                                </a>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </div>

        <aside className="panel agenda-side agenda-side--gc" aria-label="Tarefas sem compromisso na agenda">
          <h2 className="panel__title">Tarefas não agendadas</h2>
          <p className="muted agenda-unsched-intro">
            O mesmo filtro de projeto abaixo também limita os eventos na grade ao projeto escolhido. Clique numa
            tarefa para abrir o compromisso já vinculado.
          </p>
          <label className="field agenda-unsched-field">
            <span>Projeto</span>
            <select
              className="input agenda-unsched-select"
              value={agendaProjectFilterId ?? ''}
              onChange={(e) => setAgendaProjectFilterId(e.target.value || null)}
            >
              <option value="">Todos os projetos</option>
              {projectsForPickers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.projectName}
                </option>
              ))}
            </select>
          </label>
          <label className="field agenda-unsched-field">
            <span>Buscar</span>
            <input
              className="input"
              placeholder="Código, título ou nome do projeto…"
              value={unscheduledSearch}
              onChange={(e) => setUnscheduledSearch(e.target.value)}
              aria-label="Buscar tarefas não agendadas"
            />
          </label>
          <div className="uns-list">
            {unscheduled.map((t) => {
              const p = projects.find((x) => x.id === t.projectId)
              return (
                <button
                  key={t.id}
                  type="button"
                  className="uns-card uns-card--gc uns-card--interactive"
                  disabled={!canEditAgenda}
                  title={canEditAgenda ? 'Agendar esta tarefa' : 'Sem permissão para editar a agenda'}
                  onClick={() => prefillModalFromTask(t, p ?? null)}
                >
                  <span className="uns-card__accent" aria-hidden />
                  <div className="uns-card__inner">
                    <div className="uns-card__title">
                      {t.code} {t.title}
                    </div>
                    <div className="uns-card__meta">
                      <Clock size={14} strokeWidth={1.75} aria-hidden />
                      <span>{formatDurationHmFromHours(t.estimatedHours)}</span>
                    </div>
                    <div className="uns-card__proj">{p?.projectName ?? '—'}</div>
                    <div className="uns-card__cta muted">Agendar…</div>
                  </div>
                </button>
              )
            })}
            {unscheduled.length === 0 ? (
              <div className="agenda-empty uns-list__empty" role="status">
                <ListTodo className="agenda-empty__icon" size={26} strokeWidth={1.75} aria-hidden />
                <p className="agenda-empty__title">
                  {agendaProjectFilterId || unscheduledSearchNorm
                    ? 'Nenhuma tarefa com esse filtro'
                    : 'Nada pendente de agendar'}
                </p>
                <p className="agenda-empty__hint muted">
                  {agendaProjectFilterId || unscheduledSearchNorm
                    ? 'Limpe a busca ou troque o projeto para ver mais itens.'
                    : 'Tarefas em aberto sem compromisso na agenda aparecem aqui.'}
                </p>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      {modalOpen ? (
        <div
          className="modal-backdrop modal-backdrop--agenda-event"
          role="presentation"
          onClick={agendaEventSaving ? undefined : () => void attemptCloseEventModal()}
        >
          <div
            className="modal modal--agenda-event"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agenda-event-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal--agenda-event__header">
              <h2 id="agenda-event-dialog-title" className="modal__title">
                {editingEventId ? 'Editar evento' : 'Novo evento'}
              </h2>
              <p className="muted modal--agenda-event__tz">Fuso: {CAL_TZ}</p>
              {modalTaskId ? (
                <p className="agenda-modal__link-hint muted">
                  Vinculado a uma tarefa: o compromisso aparece no projeto e pode seguir o analista da tarefa.
                </p>
              ) : modalProjectId ? (
                <p className="agenda-modal__link-hint muted">Vinculado ao projeto (sem tarefa específica).</p>
              ) : null}
            </div>
            <form className="agenda-event-form" onSubmit={saveEventFromModal}>
              <div className="modal--agenda-event__scroll">
                <div className="agenda-event-form__grid">
                  <label className="field">
                    <span>Projeto (opcional)</span>
                    <select
                      value={modalProjectId ?? ''}
                      autoFocus={!editingEventId}
                      onChange={(e) => {
                        const v = e.target.value || null
                        setModalProjectId(v)
                        setModalTaskId((cur) => {
                          if (!cur || !v) return null
                          const tk = tasks.find((t) => t.id === cur)
                          return tk?.projectId === v ? cur : null
                        })
                      }}
                    >
                      <option value="">— Nenhum</option>
                      {projectsForPickers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.projectName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Tarefa (opcional)</span>
                    <select
                      value={modalTaskId ?? ''}
                      disabled={!modalProjectId}
                      onChange={(e) => {
                        const v = e.target.value || null
                        setModalTaskId(v)
                        if (!v) return
                        const task = tasks.find((t) => t.id === v)
                        if (!task) return
                        setModalProjectId(task.projectId)
                        setTitle(`${task.code} ${task.title}`.trim())
                        const proj = projects.find((pr) => pr.id === task.projectId)
                        setAnalystId(task.assignedTo ?? proj?.analystId ?? '')
                      }}
                    >
                      <option value="">— Nenhuma</option>
                      {openTasksForModalSelect.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.code} {t.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!modalProjectId ? (
                    <p className="agenda-modal-field-hint muted agenda-event-form__span2">
                      Escolha um projeto para listar tarefas em aberto e vincular ao cronograma.
                    </p>
                  ) : null}
                  <label className="field agenda-event-form__span2">
                    <span>Título</span>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!!editingEventId} />
                  </label>
                  <label className="field agenda-event-form__span2">
                    <span>Descrição (opcional)</span>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Notas visíveis no Google Agenda ao exportar…"
                    />
                  </label>
                  <label className="field">
                    <span>Data início</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="dd/MM/aaaa"
                      value={startDate}
                      onChange={(e) => setStartDate(normalizeBrDateInput(e.target.value))}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Hora início</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="HH:mm"
                      value={startTime}
                      onChange={(e) => setStartTime(normalizeTimeInput(e.target.value))}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Data fim</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="dd/MM/aaaa"
                      value={endDate}
                      onChange={(e) => setEndDate(normalizeBrDateInput(e.target.value))}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Hora fim</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="HH:mm"
                      value={endTime}
                      onChange={(e) => setEndTime(normalizeTimeInput(e.target.value))}
                      required
                    />
                  </label>
                  <label className="field agenda-event-form__span2">
                    <span>Analista (define a cor na grade)</span>
                    <select value={analystId} onChange={(e) => setAnalystId(e.target.value)}>
                      <option value="">— Sem responsável (cor neutra)</option>
                      {analysts
                        .filter((a) => a.active)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="field agenda-event-form__span2">
                    <span>Link da reunião (Meet, Zoom…)</span>
                    <input
                      type="url"
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      placeholder="https://…"
                    />
                  </label>
                </div>
              </div>
              <div className="modal__actions modal__actions--sticky">
                {isSupabaseConfigured() ? (
                  <span className="muted">Salvar agora, sincronizar na nuvem em segundo plano.</span>
                ) : null}
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => void attemptCloseEventModal()}
                  disabled={agendaEventSaving}
                >
                  Fechar
                </button>
                <button type="submit" className="btn btn--primary" disabled={!canEditAgenda || agendaEventSaving}>
                  {agendaEventSaving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {closingEvent ? (
        <div className="modal-backdrop" role="presentation" onClick={closeSaving ? undefined : () => setClosingEventId(null)}>
          <div
            className="modal modal--agenda-close"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agenda-close-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="agenda-close-title" className="modal__title">
              Fechamento da execução
            </h2>
            <p className="muted">
              Concluir reunião com registro claro do resultado, próximos passos e horas confirmadas.
            </p>
            <div className="stack">
              <label className="field">
                <span>Resultado da reunião</span>
                <textarea
                  rows={2}
                  value={closeOutcomeSummary}
                  onChange={(e) => setCloseOutcomeSummary(e.target.value)}
                  placeholder="Resumo objetivo do que foi decidido."
                />
              </label>
              <label className="field">
                <span>Próximo passo</span>
                <textarea
                  rows={2}
                  value={closeNextStep}
                  onChange={(e) => setCloseNextStep(e.target.value)}
                  placeholder="Ação + responsável + prazo."
                />
              </label>
              {closingEvent.taskId ? (
                <label className="field">
                  <span>Atualização da tarefa vinculada</span>
                  <select value={closeTaskDecision} onChange={(e) => setCloseTaskDecision(e.target.value as CloseTaskDecision)}>
                    <option value="keep">Manter status da tarefa</option>
                    <option value="in_progress">Marcar como em andamento</option>
                    <option value="done">Concluir tarefa</option>
                  </select>
                </label>
              ) : null}
              <label className="field">
                <span>Horas registradas</span>
                <input
                  value={closeLoggedHours}
                  onChange={(e) => setCloseLoggedHours(e.target.value)}
                  placeholder="Ex.: 1.50"
                />
              </label>
            </div>
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" disabled={closeSaving} onClick={() => setClosingEventId(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn--primary" disabled={closeSaving} onClick={() => void handleConfirmCloseWizard()}>
                {closeSaving ? 'Concluindo...' : 'Concluir reunião'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
