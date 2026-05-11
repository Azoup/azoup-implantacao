import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import {
  ArrowDownAZ,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Clock3,
  ExternalLink,
  FolderKanban,
  LayoutGrid,
  LayoutList,
  Pause,
  Pencil,
  Play,
  Square,
  Timer,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { hasScope } from '../auth/permissions'
import { db } from '../db/database'
import { emptyAnalysts, emptyEvents, emptyPhases, emptyProjects, emptyTasks } from '../lib/stableDexieEmpty'
import { formatDurationHMS, useRunningTimerSession } from '../hooks/useRunningTimerSession'
import { formatDatePt, parseAppDate, weekdayTitlePt } from '../lib/dates'
import { deriveKanbanColumnFromPlanState } from '../services/kanbanPhaseSync'
import { useReconcileKanbanColumns } from '../hooks/useReconcileKanbanColumns'
import { planPillClass, planSummaryLabel } from '../constants/customPlan'
import { buildDashboardMetrics, filterProjectsByDashboardFilters } from '../lib/metrics/deploymentMetrics'
import {
  endOfDay,
  endOfMonth,
  endOfWeekSunday,
  getPeriodRange,
  isIsoInRange,
  startOfDay,
  startOfMonth,
  startOfWeekMonday,
} from '../lib/metrics/timeMetrics'
import { formatDurationHmFromHours } from '../lib/durationFormat'
import { DashboardMainTabs, type DashboardMainTab } from '../components/dashboard/DashboardMainTabs'
import { DashboardSummaryTab } from '../components/dashboard/DashboardSummaryTab'
import { DashboardQueryTab } from '../components/dashboard/DashboardQueryTab'
import { DashboardFilterBar } from '../components/dashboard/DashboardFilterBar'
import type {
  DashboardFilters,
  DashboardKpiDrilldownKey,
  DashboardKpiWindow,
  DashboardPeriodPreset,
  DashboardQuerySubTab,
} from '../types/dashboard'
import { projectProgressPercent } from '../lib/projectProgress'
import { statusLabelPt } from '../lib/projectPhaseUi'
import { isDashboardOperationalStatus } from '../lib/projectStatus'
import { getActivePlanLabel, getLastCompletedPlanLabel, planPhaseAccentHex } from '../lib/planLabelDisplay'
import { PlanLabelRow } from '../components/PlanLabelChips'
import { AnalystAvatar } from '../components/AnalystAvatar'
import { useUiFeedback } from '../ui/UiFeedbackContext'
import { updateEventValidated } from '../services/events'
import type { DbAnalyst, DbEvent, DbPhase, DbProject, DbTask, TaskStatus } from '../db/types'
import { addManualTimeSession, startTimer, stopTimer } from '../services/timeSessions'
import { setTaskStatus } from '../services/tasks'
import {
  buildDashboardKpiBreakdown,
  dashboardKpiDrilldownList,
  dashboardKpiDrilldownSubTab,
  dashboardKpiDrilldownTitle,
} from '../lib/metrics/dashboardKpiBreakdown'
import { compareTaskCode } from '../lib/taskCode'
import { DashboardKpiDrilldownBanner } from '../components/dashboard/DashboardKpiDrilldownBanner'
import { RegisterHoursModal } from '../components/RegisterHoursModal'

type DashboardProjectSort = { key: 'name' | 'startDate'; direction: 'asc' | 'desc' }
type AgendaTaskOutcome = 'keep' | 'pendente' | 'em_andamento' | 'concluida'
/** Quantidade de cartões quando a lista está recolhida (antes de "Mostrar tudo"). */
const DASHBOARD_ONGOING_PROJECTS_COLLAPSED_COUNT = 1

type OngoingProjectCardData = {
  id: string
  sortStartMs: number
  projectName: string
  projectLink: string
  analystName: string
  analystColor: string
  analystAvatarUrl: string | null
  hasAnalyst: boolean
  planClassName: string
  planName: string
  usedHoursLabel: string
  expectedHoursLabel: string
  currentPhaseName: string
  milestoneLabel: string
  lastLabel: ReturnType<typeof getLastCompletedPlanLabel>
  activeLabel: ReturnType<typeof getActivePlanLabel>
  resolveCodeColor: (code: string) => string | null
  progressPercent: number
  doneTaskCount: number
  totalTaskCount: number
  startDateLabel: string
  lastCheckinLabel: string
}

function buildDashboardOngoingProjectCards(params: {
  sourceProjects: DbProject[]
  analysts: DbAnalyst[]
  phases: DbPhase[]
  tasks: DbTask[]
  events: DbEvent[]
}): OngoingProjectCardData[] {
  const { sourceProjects, analysts, phases, tasks, events } = params
  const analystById = new Map(analysts.map((analyst) => [analyst.id, analyst]))
  const tasksByProject = new Map<string, (typeof tasks)>()
  const phasesByProject = new Map<string, (typeof phases)>()
  const eventsByProject = new Map<string, (typeof events)>()

  for (const task of tasks) {
    const current = tasksByProject.get(task.projectId)
    if (current) current.push(task)
    else tasksByProject.set(task.projectId, [task])
  }
  for (const phase of phases) {
    const current = phasesByProject.get(phase.projectId)
    if (current) current.push(phase)
    else phasesByProject.set(phase.projectId, [phase])
  }
  for (const event of events) {
    if (!event.projectId) continue
    const current = eventsByProject.get(event.projectId)
    if (current) current.push(event)
    else eventsByProject.set(event.projectId, [event])
  }

  return sourceProjects
    .filter((project) => isDashboardOperationalStatus(project.status))
    .filter((project) => deriveKanbanColumnFromPlanState(project, phases, tasks) !== 'finalizados')
    .map((project) => {
      const projectTasks = (tasksByProject.get(project.id) ?? []).filter((task) => !task.isInformational)
      const allProjectTasks = tasksByProject.get(project.id) ?? []
      const projectPhases = [...(phasesByProject.get(project.id) ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)
      const projectEvents = eventsByProject.get(project.id) ?? []
      const analyst = project.analystId ? analystById.get(project.analystId) : undefined

      const doneTaskCount = projectTasks.filter((task) => task.status === 'concluida').length
      const estimatedHours = projectTasks.reduce((sum, task) => sum + Math.max(0, Number(task.estimatedHours) || 0), 0)
      const currentPhase =
        projectPhases.find((phase) => phase.status === 'ativa') ??
        projectPhases.find((phase) => phase.status !== 'concluida') ??
        projectPhases.at(-1) ??
        null
      const lastLabel = getLastCompletedPlanLabel(allProjectTasks, project.id)
      const activeLabel = getActivePlanLabel(allProjectTasks, project.id, phases)
      const lastCompletedEvent = projectEvents
        .filter((event) => event.status === 'realizado')
        .sort((a, b) => new Date(b.endTime ?? b.startTime).getTime() - new Date(a.endTime ?? a.startTime).getTime())
        .at(0)
      const latestDoneTask = projectTasks
        .filter((task) => task.status === 'concluida')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .at(0)
      const milestoneLabel = lastCompletedEvent
        ? `Marco: ${lastCompletedEvent.title}`
        : latestDoneTask
          ? `Tarefa concluída: ${latestDoneTask.code}`
          : 'Sem marco concluído'

      const resolveCodeColor = (code: string): string | null => {
        const major = Number.parseInt(code.split('.')[0] ?? '0', 10)
        const phase = Number.isFinite(major) && major >= 0 ? projectPhases[major] : null
        return phase?.colorHex ?? (phase ? planPhaseAccentHex(phase.orderIndex) : null)
      }
      return {
        id: project.id,
        sortStartMs: parseAppDate(project.startDate ?? project.createdAt).getTime(),
        projectName: project.projectName,
        projectLink: `/projetos/${project.id}`,
        analystName: analyst?.name ?? 'Sem responsável',
        analystColor: analyst?.color ?? 'var(--accent)',
        analystAvatarUrl: analyst?.avatarUrl ?? null,
        hasAnalyst: !!analyst,
        planClassName: planPillClass(project.planType),
        planName: planSummaryLabel(project.planType),
        usedHoursLabel: formatDurationHmFromHours(project.hoursUsed),
        expectedHoursLabel: formatDurationHmFromHours(estimatedHours > 0 ? estimatedHours : project.hoursContracted),
        currentPhaseName: currentPhase?.name ?? 'Fase não definida',
        milestoneLabel,
        lastLabel,
        activeLabel,
        resolveCodeColor,
        progressPercent: projectProgressPercent(tasks, project.id),
        doneTaskCount,
        totalTaskCount: projectTasks.length,
        startDateLabel: formatDatePt(project.startDate ?? project.createdAt),
        lastCheckinLabel: project.lastManualCheckinAt ? formatDatePt(project.lastManualCheckinAt, 'dd/MM HH:mm') : '—',
      }
    })
}

function toDateInputFromIso(iso: string): string {
  const dt = new Date(iso)
  if (!Number.isFinite(dt.getTime())) return ''
  const year = dt.getFullYear()
  const month = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toTimeInputFromIso(iso: string): string {
  const dt = new Date(iso)
  if (!Number.isFinite(dt.getTime())) return ''
  const hh = String(dt.getHours()).padStart(2, '0')
  const mm = String(dt.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function localDateTimeInputToIso(dateInput: string, timeInput: string): string | null {
  if (!dateInput || !timeInput) return null
  const dt = new Date(`${dateInput}T${timeInput}:00`)
  if (!Number.isFinite(dt.getTime())) return null
  return dt.toISOString()
}

function toMonthInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function taskStatusLabelPt(status: TaskStatus): string {
  if (status === 'concluida') return 'Concluída'
  if (status === 'cancelado') return 'Cancelada'
  if (status === 'em_andamento') return 'Em andamento'
  return 'Pendente'
}

function kpiWindowDescriptionPt(w: DashboardKpiWindow): string {
  if (w === 'today') return 'Hoje'
  if (w === 'week') return 'Essa semana'
  if (w === 'month') return 'Esse mês'
  return 'Total'
}

function eventStatusPt(ev: DbEvent): string {
  if (ev.status === 'agendado') return 'Agendada'
  if (ev.status === 'realizado') return 'Realizada'
  return 'Cancelada'
}

function dashboardAgendaStatus(ev: DbEvent, at: Date): { label: string; className: string } {
  if (ev.status === 'cancelado') return { label: 'Cancelado', className: 'is-cancelado' }
  if (ev.status === 'realizado') return { label: 'Realizado', className: 'is-realizado' }
  if (ev.status === 'agendado') {
    if (at.getTime() > new Date(ev.endTime).getTime()) return { label: 'Encerrado', className: 'is-encerrado' }
    return { label: 'Agendado', className: 'is-agendado' }
  }
  return { label: 'Agendado', className: 'is-agendado' }
}

export function DashboardPage() {
  const { user } = useAuth()
  const { toast, toastError } = useUiFeedback()
  const { running: runningTimer, liveSeconds: runningLiveSeconds } = useRunningTimerSession(user?.id)
  const runningTimerContext = useLiveQuery(
    async () => {
      if (!runningTimer?.taskId) return null
      const task = await db.tasks.get(runningTimer.taskId)
      if (!task) return null
      const project = await db.projects.get(task.projectId)
      if (!project) return null
      return { task, project }
    },
    [runningTimer?.taskId],
  )

  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? emptyProjects
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? emptyTasks
  const phases = useLiveQuery(() => db.phases.toArray(), []) ?? emptyPhases
  const events = useLiveQuery(() => db.events.toArray(), []) ?? emptyEvents
  const analysts = useLiveQuery(() => db.analysts.filter((a) => a.active).toArray(), []) ?? emptyAnalysts
  useReconcileKanbanColumns(projects, phases, tasks)

  const [now, setNow] = useState(() => new Date())
  const [mainTab, setMainTab] = useState<DashboardMainTab>('summary')
  const [querySubTab, setQuerySubTab] = useState<DashboardQuerySubTab>('projects')
  const [kpiDrilldown, setKpiDrilldown] = useState<DashboardKpiDrilldownKey | null>(null)
  const [periodPreset, setPeriodPreset] = useState<DashboardPeriodPreset>('month')
  const [kpiWindow, setKpiWindow] = useState<DashboardKpiWindow>('total')
  const [kpiAnchorDate, setKpiAnchorDate] = useState(() => new Date())
  const [summaryMonthYear, setSummaryMonthYear] = useState(() => toMonthInputValue(new Date()))
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [filterAnalystId, setFilterAnalystId] = useState('all')
  const [filterStatus, setFilterStatus] = useState<DashboardFilters['status']>('all')
  const [filterPlanType, setFilterPlanType] = useState('all')
  const [filterClientName, setFilterClientName] = useState('all')
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const todayTitle = useMemo(() => weekdayTitlePt(new Date()), [])

  const periodRange = useMemo(
    () => getPeriodRange(periodPreset, now, customStartDate, customEndDate),
    [periodPreset, now, customStartDate, customEndDate],
  )

  const dashboardFilters = useMemo<DashboardFilters>(
    () => ({
      periodPreset,
      customStart: customStartDate,
      customEnd: customEndDate,
      analystId: filterAnalystId,
      status: filterStatus,
      planType: filterPlanType,
      clientName: filterClientName,
    }),
    [periodPreset, customStartDate, customEndDate, filterAnalystId, filterStatus, filterPlanType, filterClientName],
  )

  const metrics = useMemo(
    () =>
      buildDashboardMetrics({
        now,
        filters: dashboardFilters,
        periodRange,
        projects,
        phases,
        tasks,
        events,
        analysts,
      }),
    [now, dashboardFilters, periodRange, projects, phases, tasks, events, analysts],
  )

  /**
   * Escopo base dos KPIs (cards + drilldown): só filtros de facet (analista/status/plano/cliente).
   * Não usa `periodRange` da consulta — senão projetos com início fora do preset ficam de fora e
   * viradas/tarefas no recorte Hoje/semana/mês somem (o tempo correto é `kpiRange` + `isInKpiRange`).
   */
  const kpiFacetScopedProjects = useMemo(
    () => filterProjectsByDashboardFilters(projects, dashboardFilters),
    [projects, dashboardFilters],
  )

  const kpiBreakdownScopedProjects = useMemo(() => kpiFacetScopedProjects, [kpiFacetScopedProjects])

  const kpiBreakdownScopedProjectIds = useMemo(
    () => new Set(kpiBreakdownScopedProjects.map((p) => p.id)),
    [kpiBreakdownScopedProjects],
  )

  const kpiBreakdownScopedTasks = useMemo(
    () => tasks.filter((t) => kpiBreakdownScopedProjectIds.has(t.projectId)),
    [tasks, kpiBreakdownScopedProjectIds],
  )

  const kpiBreakdownScopedEvents = useMemo(() => {
    const taskToProject = new Map(kpiBreakdownScopedTasks.map((task) => [task.id, task.projectId]))
    return events.filter((ev) => {
      const projectId = ev.projectId ?? (ev.taskId ? taskToProject.get(ev.taskId) ?? null : null)
      return !!projectId && kpiBreakdownScopedProjectIds.has(projectId)
    })
  }, [events, kpiBreakdownScopedProjectIds, kpiBreakdownScopedTasks])

  const kpiRange = useMemo(() => {
    if (kpiWindow === 'today') return { start: startOfDay(kpiAnchorDate), end: endOfDay(kpiAnchorDate) }
    if (kpiWindow === 'week') return { start: startOfWeekMonday(kpiAnchorDate), end: endOfWeekSunday(kpiAnchorDate) }
    if (kpiWindow === 'month') return { start: startOfMonth(kpiAnchorDate), end: endOfMonth(kpiAnchorDate) }
    return null
  }, [kpiWindow, kpiAnchorDate])

  const handleSummaryMonthYearChange = useCallback((value: string) => {
    setSummaryMonthYear(value)
    const match = value.match(/^(\d{4})-(\d{2})$/)
    if (!match) return
    const year = Number.parseInt(match[1], 10)
    const month = Number.parseInt(match[2], 10)
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return
    const anchor = new Date(year, month - 1, 1, 12, 0, 0, 0)
    setKpiAnchorDate(anchor)
    setPeriodPreset('custom')
    setCustomStartDate(`${year}-${String(month).padStart(2, '0')}-01`)
    const monthEnd = endOfMonth(anchor)
    const endDate = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`
    setCustomEndDate(endDate)
  }, [])

  const isInKpiRange = useCallback((iso: string | null | undefined): boolean => {
    if (!kpiRange) return true
    return isIsoInRange(iso, kpiRange)
  }, [kpiRange])

  const kpiScopedProjects = useMemo(
    () =>
      kpiBreakdownScopedProjects.filter((project) => isInKpiRange(project.startDate ?? project.createdAt)),
    [kpiBreakdownScopedProjects, isInKpiRange],
  )

  const kpiHasTimeWindow = kpiRange !== null

  const kpiBreakdown = useMemo(
    () =>
      buildDashboardKpiBreakdown({
        facetScopedProjects: kpiFacetScopedProjects,
        kpiScopedProjects,
        scopedTasks: kpiBreakdownScopedTasks,
        scopedEvents: kpiBreakdownScopedEvents,
        phases,
        tasks,
        isInKpiRange,
        kpiHasTimeWindow,
      }),
    [
      kpiFacetScopedProjects,
      kpiScopedProjects,
      kpiBreakdownScopedTasks,
      kpiBreakdownScopedEvents,
      phases,
      tasks,
      isInKpiRange,
      kpiHasTimeWindow,
    ],
  )
  const kpiCards = useMemo(
    () => ({
      projectsNew: kpiBreakdown.projectsNew.length,
      projectsOngoing: kpiBreakdown.projectsOngoing.length,
      projectsDone: kpiBreakdown.projectsDone.length,
      projectsCancelled: kpiBreakdown.projectsCancelled.length,
      tasksNew: kpiBreakdown.tasksNew.length,
      tasksOngoing: kpiBreakdown.tasksOngoing.length,
      tasksDone: kpiBreakdown.tasksDone.length,
      tasksCancelled: kpiBreakdown.tasksCancelled.length,
    }),
    [kpiBreakdown],
  )
  const kpiScheduledCutoversCount = kpiBreakdown.cutoversScheduled.length
  const kpiCanceledCutoversCount = kpiBreakdown.cutoversCancelled.length

  const projectById = useMemo(() => new Map(metrics.scopedProjects.map((p) => [p.id, p])), [metrics.scopedProjects])
  const taskIdToProjectId = useMemo(() => new Map(tasks.map((t) => [t.id, t.projectId])), [tasks])

  const handleKpiDrilldownSelect = useCallback((key: DashboardKpiDrilldownKey) => {
    setKpiDrilldown(key)
    setMainTab('query')
    setQuerySubTab(dashboardKpiDrilldownSubTab(key))
    window.requestAnimationFrame(() => {
      document.getElementById('dashboard-kpi-drilldown')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  const clearKpiDrilldown = useCallback(() => setKpiDrilldown(null), [])

  const kpiDrilldownTab = kpiDrilldown ? dashboardKpiDrilldownSubTab(kpiDrilldown) : null
  const showKpiDrilldownBanner =
    mainTab === 'query' && kpiDrilldown !== null && kpiDrilldownTab === querySubTab

  const sortedKpiDrilldownList = useMemo(() => {
    if (!kpiDrilldown) return []
    const raw = dashboardKpiDrilldownList(kpiDrilldown, kpiBreakdown)
    if (kpiDrilldown.startsWith('projects')) {
      if (kpiDrilldown === 'projects_new') {
        return [...(raw as DbProject[])].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
      }
      return [...(raw as DbProject[])].sort((a, b) => a.projectName.localeCompare(b.projectName, 'pt-BR'))
    }
    if (kpiDrilldown.startsWith('tasks')) {
      if (kpiDrilldown === 'tasks_new') {
        return [...(raw as DbTask[])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      }
      if (kpiDrilldown === 'tasks_done') {
        return [...(raw as DbTask[])].sort(
          (a, b) =>
            new Date(b.completedAt ?? b.createdAt).getTime() - new Date(a.completedAt ?? a.createdAt).getTime() ||
            compareTaskCode(a.code, b.code),
        )
      }
      if (kpiDrilldown === 'tasks_cancelled') {
        // Agora retorna lista de EVENTOS cancelados (não tarefas).
        return [...(raw as DbEvent[])].sort(
          (a, b) =>
            new Date(b.endTime ?? b.startTime).getTime() - new Date(a.endTime ?? a.startTime).getTime(),
        )
      }
      return [...(raw as DbTask[])].sort((a, b) => compareTaskCode(a.code, b.code) || a.sortOrder - b.sortOrder)
    }
    const evs = [...(raw as DbEvent[])]
    if (kpiDrilldown === 'cutovers_new') {
      evs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (kpiDrilldown === 'cutovers_scheduled') {
      evs.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    } else {
      evs.sort(
        (a, b) => new Date(b.endTime ?? b.startTime).getTime() - new Date(a.endTime ?? a.startTime).getTime(),
      )
    }
    return evs
  }, [kpiDrilldown, kpiBreakdown])

  const [projectSort, setProjectSort] = useState<DashboardProjectSort>({ key: 'name', direction: 'asc' })
  const [projectLayoutLegacy, setProjectLayoutLegacy] = useState(true)
  const [ongoingProjectsExpanded, setOngoingProjectsExpanded] = useState(false)
  const [agendaLinkTab, setAgendaLinkTab] = useState<'all' | 'withLink'>('all')
  const [expandedAgendaEventId, setExpandedAgendaEventId] = useState<string | null>(null)
  const [editingAgendaEventId, setEditingAgendaEventId] = useState<string | null>(null)
  const [agendaEditTitle, setAgendaEditTitle] = useState('')
  const [agendaEditDescription, setAgendaEditDescription] = useState('')
  const [agendaEditStartDate, setAgendaEditStartDate] = useState('')
  const [agendaEditStartTime, setAgendaEditStartTime] = useState('')
  const [agendaEditEndDate, setAgendaEditEndDate] = useState('')
  const [agendaEditEndTime, setAgendaEditEndTime] = useState('')
  const [agendaEditAnalystId, setAgendaEditAnalystId] = useState('')
  const [agendaEditMeetingLink, setAgendaEditMeetingLink] = useState('')
  const [agendaEditSaving, setAgendaEditSaving] = useState(false)
  const [hoursTask, setHoursTask] = useState<DbTask | null>(null)
  const [closeEventId, setCloseEventId] = useState<string | null>(null)
  const [closeOutcome, setCloseOutcome] = useState('')
  const [closeNextStep, setCloseNextStep] = useState('')
  const [closeTaskOutcome, setCloseTaskOutcome] = useState<AgendaTaskOutcome>('keep')
  const [closeManualHours, setCloseManualHours] = useState('')
  const [closeSubmitting, setCloseSubmitting] = useState(false)

  const canViewAgenda = !!user && hasScope(user, 'agenda.view')
  const canEditAgenda = !!user && hasScope(user, 'agenda.edit')
  const me = useLiveQuery(
    async () => {
      if (!user?.id) return null
      return (await db.users.get(user.id)) ?? null
    },
    [user?.id],
  )

  const todayAgendaEvents = useMemo(() => {
    return events
      .filter((e) => isSameCalendarDay(new Date(e.startTime), now))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }, [events, now])

  const todayAgendaWithLinkCount = useMemo(
    () => todayAgendaEvents.filter((e) => (e.meetingLink ?? '').trim().length > 0).length,
    [todayAgendaEvents],
  )

  const filteredTodayAgenda = useMemo(() => {
    if (agendaLinkTab === 'withLink') {
      return todayAgendaEvents.filter((e) => (e.meetingLink ?? '').trim().length > 0)
    }
    return todayAgendaEvents
  }, [agendaLinkTab, todayAgendaEvents])
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
  const projectByIdAll = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])
  const closeEvent = useMemo(() => filteredTodayAgenda.find((ev) => ev.id === closeEventId) ?? null, [closeEventId, filteredTodayAgenda])
  const closeTask = useMemo(() => {
    if (!closeEvent?.taskId) return null
    return taskById.get(closeEvent.taskId) ?? null
  }, [closeEvent, taskById])
  const agendaOpsStats = useMemo(() => {
    const todaysLinkedTasks = todayAgendaEvents
      .map((ev) => (ev.taskId ? taskById.get(ev.taskId) ?? null : null))
      .filter((task): task is DbTask => !!task)
    const pendingTaskUpdate = todayAgendaEvents.filter((ev) => {
      if (ev.status !== 'realizado' || !ev.taskId) return false
      const task = taskById.get(ev.taskId)
      return !!task && task.status !== 'concluida'
    }).length
    const withoutHours = todaysLinkedTasks.filter((task) => Number(task.actualHours) <= 0).length
    return {
      linked: todaysLinkedTasks.length,
      pendingTaskUpdate,
      withoutHours,
    }
  }, [todayAgendaEvents, taskById])

  /** Resumo: todos os projetos ativos em andamento — independente de período/KPI da barra superior. */
  const ongoingProjectCardsSummary = useMemo(
    () =>
      buildDashboardOngoingProjectCards({
        sourceProjects: projects,
        analysts,
        phases,
        tasks,
        events,
      }),
    [analysts, events, projects, phases, tasks],
  )

  /** Aba Consulta: mesma carta, mas apenas projetos no recorte da consulta (facet + período). */
  const ongoingProjectCardsQuery = useMemo(
    () =>
      buildDashboardOngoingProjectCards({
        sourceProjects: metrics.scopedProjects,
        analysts,
        phases,
        tasks,
        events,
      }),
    [analysts, events, metrics.scopedProjects, phases, tasks],
  )

  const sortedOngoingProjectCards = useMemo(() => {
    const list = [...ongoingProjectCardsSummary]
    if (projectSort.key === 'name') {
      list.sort((a, b) =>
        projectSort.direction === 'asc'
          ? a.projectName.localeCompare(b.projectName, 'pt-BR')
          : b.projectName.localeCompare(a.projectName, 'pt-BR'),
      )
    } else {
      list.sort((a, b) =>
        projectSort.direction === 'asc' ? a.sortStartMs - b.sortStartMs : b.sortStartMs - a.sortStartMs,
      )
    }
    return list
  }, [ongoingProjectCardsSummary, projectSort])

  const visibleOngoingProjectCards = ongoingProjectsExpanded
    ? sortedOngoingProjectCards
    : sortedOngoingProjectCards.slice(0, DASHBOARD_ONGOING_PROJECTS_COLLAPSED_COUNT)
  const ongoingProjectsHasMore =
    sortedOngoingProjectCards.length > DASHBOARD_ONGOING_PROJECTS_COLLAPSED_COUNT && !ongoingProjectsExpanded
  const ongoingProjectsCanCollapse =
    ongoingProjectsExpanded && sortedOngoingProjectCards.length > DASHBOARD_ONGOING_PROJECTS_COLLAPSED_COUNT
  const ongoingProjectsFooterVisible =
    sortedOngoingProjectCards.length > DASHBOARD_ONGOING_PROJECTS_COLLAPSED_COUNT || ongoingProjectsCanCollapse

  const planOptions = useMemo(() => {
    const values = new Set<string>()
    for (const p of projects) {
      const normalized = String(p.planType ?? '').trim().toLowerCase()
      if (normalized) values.add(normalized)
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [projects])

  const clientOptions = useMemo(() => {
    const values = new Set<string>()
    for (const p of projects) {
      const name = (p.tradeName ?? p.razaoSocial ?? p.projectName).trim()
      if (name) values.add(name)
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [projects])

  const handleAgendaTimerToggle = async (task: DbTask) => {
    if (!user?.id) return
    try {
      if (runningTimer?.taskId === task.id && runningTimer.id) {
        await stopTimer(runningTimer.id, user.id)
        toast('Timer pausado nesta tarefa.')
        return
      }
      await startTimer(task.id, user.id)
      toast('Timer iniciado na tarefa vinculada.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Não foi possível atualizar o timer.')
    }
  }

  const handleAgendaEnterMeeting = (ev: DbEvent) => {
    const link = (ev.meetingLink ?? '').trim()
    if (!link) {
      toast('Este compromisso ainda não possui link de reunião.', 'warn')
      return
    }
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  const startInlineAgendaEdit = (ev: DbEvent) => {
    if (!canEditAgenda) return
    setExpandedAgendaEventId(ev.id)
    setEditingAgendaEventId(ev.id)
    setAgendaEditTitle(ev.title)
    setAgendaEditDescription(ev.description ?? '')
    setAgendaEditStartDate(toDateInputFromIso(ev.startTime))
    setAgendaEditStartTime(toTimeInputFromIso(ev.startTime))
    setAgendaEditEndDate(toDateInputFromIso(ev.endTime))
    setAgendaEditEndTime(toTimeInputFromIso(ev.endTime))
    setAgendaEditAnalystId(ev.analystId ?? '')
    setAgendaEditMeetingLink(ev.meetingLink ?? '')
  }

  const cancelInlineAgendaEdit = () => {
    if (agendaEditSaving) return
    setEditingAgendaEventId(null)
  }

  async function saveInlineAgendaEdit(ev: DbEvent, e: FormEvent) {
    e.preventDefault()
    if (!canEditAgenda || agendaEditSaving) return
    const startIso = localDateTimeInputToIso(agendaEditStartDate, agendaEditStartTime)
    const endIso = localDateTimeInputToIso(agendaEditEndDate, agendaEditEndTime)
    if (!startIso || !endIso) {
      toast('Preencha início e fim corretamente.', 'warn')
      return
    }
    setAgendaEditSaving(true)
    try {
      await updateEventValidated(ev.id, {
        title: agendaEditTitle.trim() || 'Evento',
        description: agendaEditDescription.trim(),
        startTime: startIso,
        endTime: endIso,
        status: ev.status,
        projectId: ev.projectId,
        taskId: ev.taskId,
        analystId: agendaEditAnalystId || null,
        meetingLink: agendaEditMeetingLink.trim() || null,
        executionState: ev.executionState ?? null,
        outcomeSummary: ev.outcomeSummary ?? null,
        nextStep: ev.nextStep ?? null,
        closedAt: ev.closedAt ?? null,
        loggedHours: ev.loggedHours ?? null,
      })
      setEditingAgendaEventId(null)
      toast('Evento atualizado sem sair do Dashboard.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Não foi possível salvar a edição.')
    } finally {
      setAgendaEditSaving(false)
    }
  }

  const openCloseAgendaFlow = (ev: DbEvent) => {
    const linkedTask = ev.taskId ? taskById.get(ev.taskId) ?? null : null
    setCloseEventId(ev.id)
    setCloseOutcome('')
    setCloseNextStep('')
    setCloseManualHours('')
    setCloseSubmitting(false)
    setCloseTaskOutcome(linkedTask ? 'em_andamento' : 'keep')
  }

  async function submitCloseAgendaFlow(e: FormEvent) {
    e.preventDefault()
    if (!user?.id || !closeEvent) return
    const linkedTask = closeEvent.taskId ? taskById.get(closeEvent.taskId) ?? null : null
    const parsedManualHours = Number.parseFloat((closeManualHours || '').replace(',', '.'))
    const manualHours = Number.isFinite(parsedManualHours) ? Math.max(0, parsedManualHours) : 0
    setCloseSubmitting(true)
    try {
      if (linkedTask && runningTimer?.taskId === linkedTask.id && runningTimer.id) {
        await stopTimer(runningTimer.id, user.id)
      }
      if (linkedTask && manualHours > 0) {
        await addManualTimeSession({
          taskId: linkedTask.id,
          userId: user.id,
          hours: manualHours,
          notes: 'Lançamento manual no fechamento da reunião pela agenda de hoje.',
        })
      }
      if (linkedTask && closeTaskOutcome !== 'keep') {
        await setTaskStatus(linkedTask.id, closeTaskOutcome, user.id)
      }
      const compactOutcome = closeOutcome.trim()
      const compactNext = closeNextStep.trim()
      const extraDescription = [compactOutcome ? `Resultado: ${compactOutcome}` : '', compactNext ? `Próximo passo: ${compactNext}` : '']
        .filter(Boolean)
        .join('\n')
      const nextDescription = [closeEvent.description?.trim() ?? '', extraDescription].filter(Boolean).join('\n\n')
      await updateEventValidated(closeEvent.id, {
        title: closeEvent.title,
        description: nextDescription,
        startTime: closeEvent.startTime,
        endTime: closeEvent.endTime,
        status: 'realizado',
        projectId: closeEvent.projectId,
        taskId: closeEvent.taskId,
        analystId: closeEvent.analystId,
        meetingLink: closeEvent.meetingLink,
        executionState: 'completed',
        outcomeSummary: compactOutcome || null,
        nextStep: compactNext || null,
        closedAt: new Date().toISOString(),
        loggedHours: manualHours > 0 ? manualHours : null,
      })
      setCloseEventId(null)
      toast('Reunião concluída com registro de execução.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Falha ao concluir reunião.')
    } finally {
      setCloseSubmitting(false)
    }
  }

  const renderOngoingProjectCard = (project: OngoingProjectCardData) => {
    const legacy = projectLayoutLegacy
    return (
      <article
        key={project.id}
        className={'dashboard-proj-card' + (legacy ? ' dashboard-proj-card--legacy' : ' dashboard-proj-card--dense')}
      >
        <div className="dashboard-proj-card__head">
          <Link to={project.projectLink} className="dashboard-proj-card__name dashboard-proj-card__name--link">
            {project.projectName}
          </Link>
          <span className="dashboard-proj-card__head-trail">
            {project.hasAnalyst ? (
              <span
                className="dashboard-proj-card__analyst"
                title={`Responsável: ${project.analystName}`}
                style={{ ['--analyst-color' as string]: project.analystColor }}
              >
                <AnalystAvatar
                  name={project.analystName}
                  color={project.analystColor}
                  avatarUrl={project.analystAvatarUrl}
                  size="sm"
                />
              </span>
            ) : null}
            <span className={project.planClassName} title={`Plano: ${project.planName}`}>
              {project.planName}
            </span>
          </span>
        </div>

        {legacy ? (
          <p className="dashboard-proj-card__legacy-line" aria-label="Horas e fase atual">
            <span className="dashboard-proj-card__legacy-line-strong">
              {project.usedHoursLabel} / {project.expectedHoursLabel}
            </span>
            <span className="dashboard-proj-card__legacy-line-sep"> — </span>
            <span>{project.currentPhaseName}</span>
          </p>
        ) : (
          <div className="dashboard-proj-card__snapshot" aria-label="Resumo rápido do projeto">
            <div className="dashboard-proj-card__snapshot-item">
              <strong>{project.analystName}</strong>
              <span>Responsável principal</span>
            </div>
            <div className="dashboard-proj-card__snapshot-item">
              <strong>
                {project.usedHoursLabel} / {project.expectedHoursLabel}
              </strong>
              <span>Horas realizadas / estimadas</span>
            </div>
            <div className="dashboard-proj-card__snapshot-item dashboard-proj-card__snapshot-item--compact">
              <strong>{project.currentPhaseName}</strong>
              <span>Fase atual</span>
            </div>
            <div className="dashboard-proj-card__snapshot-item dashboard-proj-card__snapshot-item--compact">
              <strong>{project.totalTaskCount > 0 ? `${project.doneTaskCount}/${project.totalTaskCount}` : '0/0'}</strong>
              <span>Tarefas concluídas</span>
            </div>
          </div>
        )}

        {!legacy ? (
          <div className="dashboard-proj-card__milestone" title={project.milestoneLabel}>
            {project.milestoneLabel}
          </div>
        ) : null}

        <PlanLabelRow
          last={project.lastLabel}
          active={project.activeLabel}
          variant="dashboard"
          resolveCodeColor={project.resolveCodeColor}
        />

        <div className="dashboard-proj-card__progress-row" aria-label={`Progresso consolidado em ${project.progressPercent}%`}>
          <div
            className="dashboard-proj-card__track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={project.progressPercent}
          >
            <div className="dashboard-proj-card__fill" style={{ width: `${project.progressPercent}%` }} />
          </div>
          <span className="dashboard-proj-card__pct">{project.progressPercent}%</span>
        </div>

        {!legacy ? (
          <div className="dashboard-proj-card__meta">
            <span className="dashboard-proj-card__hours">Escopo planejado: {project.expectedHoursLabel}</span>
            <span className="dashboard-proj-card__dot" aria-hidden>
              ·
            </span>
            <span className="dashboard-proj-card__phase">Início do projeto: {project.startDateLabel}</span>
          </div>
        ) : null}
        <div className="dashboard-proj-card__meta">
          <span className="dashboard-proj-card__phase">Atualizado em: {project.lastCheckinLabel}</span>
        </div>
      </article>
    )
  }

  return (
    <div className="page page--dashboard dashboard-cc">
      <header className="page__header dashboard__header dashboard-cc__top">
        <div>
          <h1 className="page__title">Dashboard</h1>
          <p className="page__subtitle dashboard__date">{todayTitle}</p>
        </div>
        <div className="dashboard-cc__top-controls" aria-label="Navegação e janela de indicadores">
          <DashboardMainTabs activeTab={mainTab} onChange={setMainTab} />
          {mainTab === 'summary' ? (
            <DashboardFilterBar
              kpiWindow={kpiWindow}
              onKpiWindowChange={setKpiWindow}
              monthYear={summaryMonthYear}
              onMonthYearChange={handleSummaryMonthYearChange}
            />
          ) : null}
        </div>
      </header>

      {user && runningTimer && runningTimerContext ? (
        <div className="dashboard-live-timer" role="status" aria-live="polite">
          <Link className="dashboard-live-timer__inner" to={`/projetos/${runningTimerContext.project.id}`}>
            <span className="dashboard-live-timer__ic" aria-hidden>
              <Clock3 size={22} strokeWidth={2} absoluteStrokeWidth />
            </span>
            <div className="dashboard-live-timer__text">
              <strong>Cronômetro ativo</strong>
              <span className="dashboard-live-timer__sub muted">
                {runningTimerContext.project.projectName}
                <span aria-hidden> · </span>
                {runningTimerContext.task.code} {runningTimerContext.task.title}
              </span>
            </div>
            <span className="dashboard-live-timer__hms">{formatDurationHMS(runningLiveSeconds)}</span>
          </Link>
        </div>
      ) : null}

      {mainTab === 'summary' ? (
        <DashboardSummaryTab
          kpis={kpiCards}
          cutoversNewCount={kpiBreakdown.cutoversNew.length}
          cutoversDoneCount={kpiBreakdown.cutoversRealized.length}
          scheduledCutoversCount={kpiScheduledCutoversCount}
          canceledCutoversCount={kpiCanceledCutoversCount}
          activeKpiDrilldown={kpiDrilldown}
          onKpiDrilldownSelect={handleKpiDrilldownSelect}
          kpiWindowDescription={kpiWindowDescriptionPt(kpiWindow)}
        />
      ) : (
        <>
          {showKpiDrilldownBanner && kpiDrilldown ? (
            <DashboardKpiDrilldownBanner
              drilldown={kpiDrilldown}
              kpiWindow={kpiWindow}
              itemCount={sortedKpiDrilldownList.length}
              onClear={clearKpiDrilldown}
            />
          ) : null}
          <DashboardQueryTab
            activeSubTab={querySubTab}
            onChangeSubTab={setQuerySubTab}
            projectsContent={
              <div className="dashboard-cc__query-content">
                <article className="dashboard-cc__card">
                  <h3>Busca avançada e filtros</h3>
                  <div className="dashboard-cc__query-filters">
                    <label className="field">
                      <span>Período</span>
                      <select value={periodPreset} onChange={(e) => setPeriodPreset(e.target.value as DashboardPeriodPreset)}>
                        <option value="today">Hoje</option>
                        <option value="week">7 dias</option>
                        <option value="month">Mês</option>
                        <option value="year">Ano</option>
                        <option value="custom">Personalizado</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Analista</span>
                      <select value={filterAnalystId} onChange={(e) => setFilterAnalystId(e.target.value)}>
                        <option value="all">Todos</option>
                        {analysts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Status</span>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as DashboardFilters['status'])}
                      >
                        <option value="all">Todos</option>
                        <option value="ativo">Em andamento</option>
                        <option value="inadimplente">Inadimplente</option>
                        <option value="congelado">Congelado</option>
                        <option value="finalizado">Finalizado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Plano</span>
                      <select value={filterPlanType} onChange={(e) => setFilterPlanType(e.target.value)}>
                        <option value="all">Todos</option>
                        {planOptions.map((plan) => (
                          <option key={plan} value={plan}>
                            {plan.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Cliente</span>
                      <select value={filterClientName} onChange={(e) => setFilterClientName(e.target.value)}>
                        <option value="all">Todos</option>
                        {clientOptions.map((client) => (
                          <option key={client} value={client.toLowerCase()}>
                            {client}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="field">
                      <span>&nbsp;</span>
                      <button
                        type="button"
                        className="btn btn--sm btn--ghost"
                        onClick={() => {
                          setPeriodPreset('month')
                          setCustomStartDate('')
                          setCustomEndDate('')
                          setFilterAnalystId('all')
                          setFilterStatus('all')
                          setFilterPlanType('all')
                          setFilterClientName('all')
                        }}
                      >
                        Limpar filtros
                      </button>
                    </div>
                  </div>
                  {periodPreset === 'custom' ? (
                    <div className="dashboard-cc__custom-range">
                      <label className="field">
                        <span>Início</span>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>Fim</span>
                        <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                      </label>
                    </div>
                  ) : null}
                </article>

                {kpiDrilldown?.startsWith('projects') ? (
                  <article className="dashboard-cc__card">
                    <h3>
                      {dashboardKpiDrilldownTitle(kpiDrilldown)} ({sortedKpiDrilldownList.length})
                    </h3>
                    <p className="dashboard-cc__kpi-detail-lead">
                      Mesmo recorte do KPI ({kpiWindowDescriptionPt(kpiWindow)}) e escopo desta consulta (filtros acima).
                    </p>
                    <div className="dashboard-cc__kpi-detail-stack" role="list">
                      {sortedKpiDrilldownList.length === 0 ? (
                        <p className="dashboard-empty dashboard-empty--soft">Nenhum item neste recorte.</p>
                      ) : (
                        (sortedKpiDrilldownList as DbProject[]).map((p) => (
                          <Link
                            key={p.id}
                            role="listitem"
                            to={`/projetos/${p.id}`}
                            className="dashboard-cc__kpi-detail-row dashboard-cc__kpi-detail-row--link"
                          >
                            <strong>{p.projectName}</strong>
                            <span>
                              Status: {statusLabelPt(p.status)}
                              <span aria-hidden> · </span>
                              Início: {formatDatePt(p.startDate ?? p.createdAt, 'dd/MM/yyyy')}
                            </span>
                          </Link>
                        ))
                      )}
                    </div>
                  </article>
                ) : (
                  <article className="dashboard-cc__card">
                    <h3>Projetos filtrados ({metrics.scopedProjects.length})</h3>
                    <div className="dashboard-proj-list">
                      {ongoingProjectCardsQuery.length === 0 ? (
                        <p className="dashboard-empty dashboard-empty--soft">Sem projetos ativos neste recorte.</p>
                      ) : (
                        ongoingProjectCardsQuery.map(renderOngoingProjectCard)
                      )}
                    </div>
                  </article>
                )}
              </div>
            }
            tasksContent={
              <div className="dashboard-cc__query-content">
                {kpiDrilldown?.startsWith('tasks') ? (
                  <article className="dashboard-cc__card">
                    <h3>
                      {dashboardKpiDrilldownTitle(kpiDrilldown)}
                      {` (${sortedKpiDrilldownList.length})`}
                    </h3>
                    <p className="dashboard-cc__kpi-detail-lead">
                      Mesmo recorte do KPI ({kpiWindowDescriptionPt(kpiWindow)}) e tarefas dos projetos que passam pelos filtros
                      desta consulta.
                    </p>
                    <div className="dashboard-cc__kpi-detail-stack" role="list">
                      {sortedKpiDrilldownList.length === 0 ? (
                        <p className="dashboard-empty dashboard-empty--soft">
                          {kpiDrilldown === 'tasks_cancelled'
                            ? 'Nenhuma agenda cancelada neste recorte.'
                            : 'Nenhuma tarefa neste recorte.'}
                        </p>
                      ) : kpiDrilldown === 'tasks_cancelled' ? (
                        (sortedKpiDrilldownList as DbEvent[]).map((ev) => {
                          const pid = ev.projectId ?? (ev.taskId ? taskIdToProjectId.get(ev.taskId) ?? null : null)
                          const p = pid ? projectById.get(pid) : undefined
                          const occurredIso = ev.endTime ?? ev.startTime
                          const occurredAt = new Date(occurredIso)
                          const linkTo = pid ? `/projetos/${pid}` : '#'
                          return (
                            <Link
                              key={ev.id}
                              role="listitem"
                              to={linkTo}
                              className="dashboard-cc__kpi-detail-row dashboard-cc__kpi-detail-row--link"
                            >
                              <strong>{ev.title}</strong>
                              <span>{p?.projectName ?? 'Projeto'}</span>
                              <span>
                                {occurredAt.toLocaleDateString('pt-BR')} ·{' '}
                                {Number.isFinite(ev.loggedHours) && (ev.loggedHours ?? 0) > 0
                                  ? `${ev.loggedHours}h consumidas`
                                  : 'sem consumo'}
                              </span>
                            </Link>
                          )
                        })
                      ) : (
                        (sortedKpiDrilldownList as DbTask[]).map((t) => {
                          const p = projectById.get(t.projectId)
                          return (
                            <Link
                              key={t.id}
                              role="listitem"
                              to={`/projetos/${t.projectId}`}
                              className="dashboard-cc__kpi-detail-row dashboard-cc__kpi-detail-row--link"
                            >
                              <strong>
                                {t.code} {t.title}
                              </strong>
                              <span>{p?.projectName ?? 'Projeto'}</span>
                              <span>{taskStatusLabelPt(t.status)}</span>
                            </Link>
                          )
                        })
                      )}
                    </div>
                  </article>
                ) : (
                  <article className="dashboard-cc__card">
                    <h3>Tarefas</h3>
                    <p className="dashboard-empty dashboard-empty--soft">
                      No <strong>Resumo</strong>, clique em um KPI de <strong>tarefas</strong> (agendadas, concluídas ou
                      canceladas) para abrir a listagem correspondente nesta aba.
                    </p>
                  </article>
                )}
              </div>
            }
            cutoversContent={
              kpiDrilldown?.startsWith('cutovers') ? (
                <article className="dashboard-cc__card">
                  <h3>
                    {dashboardKpiDrilldownTitle(kpiDrilldown)} ({sortedKpiDrilldownList.length})
                  </h3>
                  <p className="dashboard-cc__kpi-detail-lead">
                    Eventos no escopo desta consulta, com o mesmo recorte temporal do KPI ({kpiWindowDescriptionPt(kpiWindow)}).
                    Projeto é obtido pelo vínculo direto ou pela tarefa vinculada.
                  </p>
                  <div className="dashboard-cc__kpi-detail-stack" role="list">
                    {sortedKpiDrilldownList.length === 0 ? (
                      <p className="dashboard-empty dashboard-empty--soft">Nenhuma virada neste recorte.</p>
                    ) : (
                      (sortedKpiDrilldownList as DbEvent[]).map((ev) => {
                        const pid = ev.projectId ?? (ev.taskId ? taskIdToProjectId.get(ev.taskId) ?? null : null)
                        const p = pid ? projectById.get(pid) : undefined
                        return (
                          <div key={ev.id} className="dashboard-cc__kpi-detail-row" role="listitem">
                            <strong>{ev.title}</strong>
                            <span>
                              {formatDatePt(ev.startTime, 'dd/MM/yyyy')} · {formatDatePt(ev.startTime, 'HH:mm')} —{' '}
                              {formatDatePt(ev.endTime, 'HH:mm')}
                            </span>
                            <span>
                              {p ? (
                                <Link to={`/projetos/${p.id}`}>{p.projectName}</Link>
                              ) : (
                                <span className="muted">Sem projeto vinculado</span>
                              )}
                              {ev.taskId ? (
                                <>
                                  <span aria-hidden> · </span>
                                  Com tarefa vinculada
                                </>
                              ) : null}
                            </span>
                            <span className="dashboard-cc__kpi-detail-meta">{eventStatusPt(ev)}</span>
                          </div>
                        )
                      })
                    )}
                  </div>
                </article>
              ) : (
                <article className="dashboard-cc__card">
                  <h3>Viradas realizadas ({metrics.cutoversInSelectedPeriod.length})</h3>
                  <p className="dashboard-cc__kpi-detail-note muted">
                    Lista por <strong>período da consulta</strong> (filtros), com tag de virada concluída. Para o detalhe do KPI
                    do resumo, clique no card correspondente.
                  </p>
                  <div className="dashboard-side-stack">
                    {metrics.cutoversInSelectedPeriod.length === 0 ? (
                      <p className="dashboard-empty dashboard-empty--soft">Sem viradas no período selecionado.</p>
                    ) : (
                      metrics.cutoversInSelectedPeriod.slice(0, 20).map((cutover) => (
                        <Link key={cutover.id} to={`/projetos/${cutover.projectId}`} className="dashboard-cc__row">
                          <strong>{cutover.projectName}</strong>
                          <span>{cutover.title}</span>
                          <small>{formatDatePt(cutover.occurredAt, 'dd/MM/yyyy HH:mm')}</small>
                        </Link>
                      ))
                    )}
                  </div>
                </article>
              )
            }
          />
        </>
      )}

      {mainTab === 'summary' ? (
        <div className="dashboard-grid">
          <section className="panel dashboard-panel dashboard-panel--projects">
            <div className="dashboard-panel__head-row">
              <div className="dashboard-panel__head-copy">
                <h2 className="dashboard-panel__title">
                  <span className="dashboard-panel__title-icon">
                    <FolderKanban size={20} strokeWidth={1.75} />
                  </span>
                  Projetos em andamento
                </h2>
              </div>
              <div className="dashboard-proj-panel__toolbar" aria-label="Ferramentas da lista de projetos">
                {canViewAgenda ? (
                  <Link
                    to="/agenda"
                    className="project-sortbar__toggle"
                    title="Abrir agenda completa"
                    aria-label="Abrir agenda completa"
                  >
                    <CalendarDays size={14} strokeWidth={2} />
                  </Link>
                ) : null}
                <button
                  type="button"
                  className={'project-sortbar__toggle' + (projectLayoutLegacy ? ' is-active' : '')}
                  aria-pressed={projectLayoutLegacy}
                  title={projectLayoutLegacy ? 'Cards compactos (atual)' : 'Ativar cards compactos'}
                  onClick={() => setProjectLayoutLegacy(true)}
                >
                  <LayoutList size={14} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className={'project-sortbar__toggle' + (!projectLayoutLegacy ? ' is-active' : '')}
                  aria-pressed={!projectLayoutLegacy}
                  title={!projectLayoutLegacy ? 'Cartões detalhados (atual)' : 'Ver cartões detalhados'}
                  onClick={() => setProjectLayoutLegacy(false)}
                >
                  <LayoutGrid size={14} strokeWidth={2} />
                </button>
                <div className="project-sortbar" aria-label="Ordenação dos projetos em andamento">
                  <button
                    type="button"
                    className={'project-sortbar__toggle' + (projectSort.key === 'startDate' ? ' is-active' : '')}
                    aria-pressed={projectSort.key === 'startDate'}
                    aria-label="Ordenar por data de início"
                    title={
                      projectSort.key === 'startDate' && projectSort.direction === 'asc'
                        ? 'Mais antigos primeiro'
                        : 'Mais novos primeiro'
                    }
                    onClick={() => {
                      const nextDirection =
                        projectSort.key === 'startDate' && projectSort.direction === 'asc' ? 'desc' : 'asc'
                      setProjectSort({ key: 'startDate', direction: nextDirection })
                    }}
                  >
                    <CalendarDays size={14} strokeWidth={2} />
                    {projectSort.key === 'startDate' && projectSort.direction === 'asc' ? (
                      <ChevronUp size={14} strokeWidth={2.4} />
                    ) : (
                      <ChevronDown size={14} strokeWidth={2.4} />
                    )}
                  </button>
                  <button
                    type="button"
                    className={'project-sortbar__toggle' + (projectSort.key === 'name' ? ' is-active' : '')}
                    aria-pressed={projectSort.key === 'name'}
                    aria-label="Ordenar por nome"
                    title={projectSort.key === 'name' && projectSort.direction === 'asc' ? 'Nome A-Z' : 'Nome Z-A'}
                    onClick={() => {
                      const nextDirection =
                        projectSort.key === 'name' && projectSort.direction === 'asc' ? 'desc' : 'asc'
                      setProjectSort({ key: 'name', direction: nextDirection })
                    }}
                  >
                    <ArrowDownAZ size={14} strokeWidth={2} />
                    <span className="project-sortbar__toggle-text">
                      {projectSort.key === 'name' && projectSort.direction === 'desc' ? 'Z-A' : 'A-Z'}
                    </span>
                    {projectSort.key === 'name' && projectSort.direction === 'desc' ? (
                      <ChevronDown size={14} strokeWidth={2.4} />
                    ) : (
                      <ChevronUp size={14} strokeWidth={2.4} />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div
              id="dashboard-ongoing-projects-list"
              className={
                'dashboard-proj-list' +
                (ongoingProjectsExpanded ? ' dashboard-proj-list--expanded' : ' dashboard-proj-list--collapsed')
              }
            >
              {sortedOngoingProjectCards.length === 0 ? (
                <p className="dashboard-empty">Nenhum projeto ativo.</p>
              ) : (
                visibleOngoingProjectCards.map(renderOngoingProjectCard)
              )}
            </div>
            {ongoingProjectsFooterVisible ? (
              <div className="dashboard-proj-list__footer">
                <span className="dashboard-proj-list__count">
                  {ongoingProjectsExpanded
                    ? `Mostrando todos (${sortedOngoingProjectCards.length})`
                    : `Mostrando ${visibleOngoingProjectCards.length} de ${sortedOngoingProjectCards.length}`}
                </span>
                <div className="dashboard-proj-list__footer-actions">
                  {ongoingProjectsCanCollapse ? (
                    <button
                      type="button"
                      className="project-sortbar__toggle dashboard-proj-list__toggle"
                      aria-controls="dashboard-ongoing-projects-list"
                      aria-expanded={ongoingProjectsExpanded}
                      onClick={() => setOngoingProjectsExpanded(false)}
                    >
                      Mostrar menos
                      <ChevronUp size={14} strokeWidth={2.2} />
                    </button>
                  ) : null}
                  {ongoingProjectsHasMore ? (
                    <button
                      type="button"
                      className="project-sortbar__toggle dashboard-proj-list__toggle"
                      aria-controls="dashboard-ongoing-projects-list"
                      aria-expanded={ongoingProjectsExpanded}
                      onClick={() => setOngoingProjectsExpanded(true)}
                    >
                      Mostrar tudo ({sortedOngoingProjectCards.length - visibleOngoingProjectCards.length})
                      <ChevronDown size={14} strokeWidth={2.2} />
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>

          <div className="dashboard-col">
            <section className="panel dashboard-panel dashboard-panel--agenda-today">
              <h2 className="dashboard-panel__title">
                <span className="dashboard-panel__title-icon">
                  <CalendarDays size={20} strokeWidth={1.75} />
                </span>
                Agenda de hoje
              </h2>
              {canViewAgenda ? (
                <div className="dashboard-agenda-tabs" role="tablist" aria-label="Filtro da agenda de hoje">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={agendaLinkTab === 'all'}
                    className={'dashboard-agenda-tabs__btn' + (agendaLinkTab === 'all' ? ' is-active' : '')}
                    onClick={() => setAgendaLinkTab('all')}
                  >
                    Todos ({todayAgendaEvents.length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={agendaLinkTab === 'withLink'}
                    className={'dashboard-agenda-tabs__btn' + (agendaLinkTab === 'withLink' ? ' is-active' : '')}
                    onClick={() => setAgendaLinkTab('withLink')}
                  >
                    Com link ({todayAgendaWithLinkCount})
                  </button>
                </div>
              ) : null}
              {canViewAgenda ? (
                <div className="dashboard-agenda-insights" aria-label="Indicadores da agenda de hoje">
                  <span className="dashboard-agenda-insights__item">Com tarefa: {agendaOpsStats.linked}</span>
                  <span className="dashboard-agenda-insights__item">Sem fechamento de tarefa: {agendaOpsStats.pendingTaskUpdate}</span>
                  <span className="dashboard-agenda-insights__item">Sem horas registradas: {agendaOpsStats.withoutHours}</span>
                </div>
              ) : null}
              <div className="dashboard-side-stack">
                {!canViewAgenda ? (
                  <p className="dashboard-empty dashboard-empty--soft">Sem permissão para ver a agenda.</p>
                ) : filteredTodayAgenda.length === 0 ? (
                  <p className="dashboard-empty dashboard-empty--soft">Sem eventos neste filtro.</p>
                ) : (
                  filteredTodayAgenda.slice(0, 12).map((ev) => {
                    const st = dashboardAgendaStatus(ev, now)
                    const hasMeet = (ev.meetingLink ?? '').trim().length > 0
                    const linkedTask = ev.taskId ? taskById.get(ev.taskId) ?? null : null
                    const linkedProject = ev.projectId
                      ? projectByIdAll.get(ev.projectId) ?? null
                      : linkedTask
                        ? projectByIdAll.get(linkedTask.projectId) ?? null
                        : null
                    const isRunningThisTask = !!linkedTask && runningTimer?.taskId === linkedTask.id
                    const isExpanded = expandedAgendaEventId === ev.id
                    const isEditing = editingAgendaEventId === ev.id
                    return (
                      <article key={ev.id} className={'dashboard-event' + (isExpanded ? ' is-open' : '')}>
                        <button
                          type="button"
                          className="dashboard-event__head"
                          onClick={() => {
                            setExpandedAgendaEventId((cur) => (cur === ev.id ? null : ev.id))
                            if (editingAgendaEventId && editingAgendaEventId !== ev.id) setEditingAgendaEventId(null)
                          }}
                        >
                          <div className="dashboard-event__row-top">
                            <div className="dashboard-event__time">
                              {formatDatePt(ev.startTime, 'HH:mm')} — {formatDatePt(ev.endTime, 'HH:mm')}
                            </div>
                            <span className={'dashboard-event__status ' + st.className}>{st.label}</span>
                          </div>
                          <div className="dashboard-event__title">{ev.title}</div>
                          <div className="dashboard-event__details-mini">
                            {linkedProject ? <span className="dashboard-event__chip">{linkedProject.projectName}</span> : null}
                            {linkedTask ? (
                              <span className="dashboard-event__chip dashboard-event__chip--task">
                                {linkedTask.code} · {taskStatusLabelPt(linkedTask.status)}
                              </span>
                            ) : null}
                            {isRunningThisTask ? (
                              <span className="dashboard-event__chip dashboard-event__chip--timer">
                                <Timer size={12} strokeWidth={2} aria-hidden />
                                {formatDurationHMS(runningLiveSeconds)}
                              </span>
                            ) : null}
                          </div>
                        </button>
                        {isExpanded ? (
                          <div className="dashboard-event__details">
                            {!isEditing ? (
                              <>
                                <div className="dashboard-event__actions">
                                  <button
                                    type="button"
                                    className="btn btn--sm btn--primary"
                                    disabled={!hasMeet}
                                    onClick={() => handleAgendaEnterMeeting(ev)}
                                  >
                                    <ExternalLink size={14} strokeWidth={2.2} aria-hidden />
                                    Entrar
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn--sm btn--ghost"
                                    disabled={!canEditAgenda}
                                    onClick={() => startInlineAgendaEdit(ev)}
                                  >
                                    <Pencil size={14} strokeWidth={2.2} aria-hidden />
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn--sm btn--ghost"
                                    disabled={!linkedTask || !me}
                                    onClick={() => linkedTask && setHoursTask(linkedTask)}
                                  >
                                    <Clock3 size={14} strokeWidth={2.2} aria-hidden />
                                    Registrar
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn--sm btn--ghost"
                                    disabled={!linkedTask}
                                    onClick={() => linkedTask && void handleAgendaTimerToggle(linkedTask)}
                                  >
                                    {isRunningThisTask ? (
                                      <Pause size={14} strokeWidth={2.2} aria-hidden />
                                    ) : (
                                      <Play size={14} strokeWidth={2.2} aria-hidden />
                                    )}
                                    {isRunningThisTask ? 'Parar timer' : 'Iniciar timer'}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn--sm btn--ghost"
                                    disabled={!canEditAgenda || ev.status !== 'agendado'}
                                    onClick={() => openCloseAgendaFlow(ev)}
                                  >
                                    <Square size={14} strokeWidth={2.2} aria-hidden />
                                    Concluir
                                  </button>
                                </div>
                                <div className="dashboard-event__line">
                                  <strong>Título:</strong> {ev.title}
                                </div>
                                <div className="dashboard-event__line">
                                  <strong>Descrição:</strong> {ev.description?.trim() || 'Sem descrição'}
                                </div>
                                <div className="dashboard-event__line">
                                  <strong>Analista:</strong>{' '}
                                  {ev.analystId ? analysts.find((a) => a.id === ev.analystId)?.name ?? 'Sem responsável' : 'Sem responsável'}
                                </div>
                                <div className="dashboard-event__line">
                                  <strong>Link da reunião:</strong>{' '}
                                  {hasMeet ? (
                                    <a
                                      className="dashboard-event__link"
                                      href={ev.meetingLink ?? '#'}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {ev.meetingLink}
                                    </a>
                                  ) : (
                                    'Sem link'
                                  )}
                                </div>
                              </>
                            ) : (
                              <form className="dashboard-event__edit-form" onSubmit={(e) => void saveInlineAgendaEdit(ev, e)}>
                                <div className="dashboard-event__edit-grid">
                                  <label className="field">
                                    <span>Título</span>
                                    <input value={agendaEditTitle} onChange={(e) => setAgendaEditTitle(e.target.value)} />
                                  </label>
                                  <label className="field">
                                    <span>Analista</span>
                                    <select value={agendaEditAnalystId} onChange={(e) => setAgendaEditAnalystId(e.target.value)}>
                                      <option value="">Sem responsável</option>
                                      {analysts.map((a) => (
                                        <option key={a.id} value={a.id}>
                                          {a.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="field">
                                    <span>Data início</span>
                                    <input type="date" value={agendaEditStartDate} onChange={(e) => setAgendaEditStartDate(e.target.value)} />
                                  </label>
                                  <label className="field">
                                    <span>Hora início</span>
                                    <input type="time" value={agendaEditStartTime} onChange={(e) => setAgendaEditStartTime(e.target.value)} />
                                  </label>
                                  <label className="field">
                                    <span>Data fim</span>
                                    <input type="date" value={agendaEditEndDate} onChange={(e) => setAgendaEditEndDate(e.target.value)} />
                                  </label>
                                  <label className="field">
                                    <span>Hora fim</span>
                                    <input type="time" value={agendaEditEndTime} onChange={(e) => setAgendaEditEndTime(e.target.value)} />
                                  </label>
                                  <label className="field dashboard-event__edit-full">
                                    <span>Descrição</span>
                                    <textarea rows={2} value={agendaEditDescription} onChange={(e) => setAgendaEditDescription(e.target.value)} />
                                  </label>
                                  <label className="field dashboard-event__edit-full">
                                    <span>Link da reunião</span>
                                    <input
                                      type="url"
                                      value={agendaEditMeetingLink}
                                      onChange={(e) => setAgendaEditMeetingLink(e.target.value)}
                                      placeholder="https://..."
                                    />
                                  </label>
                                </div>
                                <div className="dashboard-event__edit-actions">
                                  <button type="button" className="btn btn--ghost btn--sm" disabled={agendaEditSaving} onClick={cancelInlineAgendaEdit}>
                                    Cancelar
                                  </button>
                                  <button type="submit" className="btn btn--primary btn--sm" disabled={agendaEditSaving}>
                                    {agendaEditSaving ? 'Salvando...' : 'Salvar'}
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        ) : null}
                      </article>
                    )
                  })
                )}
              </div>
            </section>
          </div>
        </div>
      ) : null}
      {hoursTask && me ? <RegisterHoursModal open={!!hoursTask} task={hoursTask} user={me} onClose={() => setHoursTask(null)} /> : null}
      {closeEvent ? (
        <div className="modal-backdrop modal-backdrop--agenda-close" role="presentation" onClick={() => (!closeSubmitting ? setCloseEventId(null) : undefined)}>
          <div className="modal modal--agenda-close" role="dialog" aria-modal="true" aria-labelledby="agenda-close-title" onClick={(ev) => ev.stopPropagation()}>
            <div className="modal--agenda-close__head">
              <h2 id="agenda-close-title" className="modal__title">
                Fechar execução da reunião
              </h2>
              <p className="muted">{closeEvent.title}</p>
            </div>
            <form className="modal--agenda-close__form" onSubmit={submitCloseAgendaFlow}>
              <label className="field">
                <span>Resultado da reunião</span>
                <textarea rows={2} value={closeOutcome} onChange={(ev) => setCloseOutcome(ev.target.value)} placeholder="Resumo rápido do que foi decidido." />
              </label>
              <label className="field">
                <span>Próximo passo</span>
                <input value={closeNextStep} onChange={(ev) => setCloseNextStep(ev.target.value)} placeholder="Ação, responsável ou data combinada." />
              </label>
              {closeTask ? (
                <>
                  <label className="field">
                    <span>Status da tarefa vinculada</span>
                    <select value={closeTaskOutcome} onChange={(ev) => setCloseTaskOutcome(ev.target.value as AgendaTaskOutcome)}>
                      <option value="keep">Manter status atual ({taskStatusLabelPt(closeTask.status)})</option>
                      <option value="pendente">Marcar como pendente</option>
                      <option value="em_andamento">Marcar como em andamento</option>
                      <option value="concluida">Concluir tarefa</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Registro manual de horas (opcional)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={closeManualHours}
                      onChange={(ev) => setCloseManualHours(ev.target.value)}
                      placeholder="Ex.: 1.5"
                    />
                  </label>
                </>
              ) : null}
              <div className="modal__actions">
                <button type="button" className="btn btn--ghost" disabled={closeSubmitting} onClick={() => setCloseEventId(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary" disabled={closeSubmitting}>
                  <CircleCheck size={14} strokeWidth={2.2} aria-hidden />
                  {closeSubmitting ? 'Salvando...' : 'Salvar e concluir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

