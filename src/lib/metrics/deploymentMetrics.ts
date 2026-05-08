import type { DbAnalyst, DbEvent, DbPhase, DbProject, DbTask } from '../../db/types'
import type {
  DashboardActionRow,
  DashboardCutoverRow,
  DashboardFilters,
  DashboardMetrics,
  DashboardPeriodRange,
  DashboardStartsCounters,
} from '../../types/dashboard'
import { buildDashboardAlerts, type DashboardAlertRow } from '../dashboardAlerts'
import {
  endOfDay,
  endOfMonth,
  endOfWeekSunday,
  endOfYear,
  isIsoInRange,
  startOfDay,
  startOfMonth,
  startOfWeekMonday,
  startOfYear,
} from './timeMetrics'
import { isCutoverEvent } from './cutoverClassifier'

function projectMatchesFilters(project: DbProject, filters: DashboardFilters): boolean {
  if (filters.analystId !== 'all' && project.analystId !== filters.analystId) return false
  if (filters.status !== 'all' && project.status !== filters.status) return false
  if (filters.planType !== 'all' && String(project.planType).trim().toLowerCase() !== filters.planType) return false
  if (filters.clientName !== 'all') {
    const candidate = (project.tradeName ?? project.razaoSocial ?? project.projectName).trim().toLowerCase()
    if (candidate !== filters.clientName) return false
  }
  return true
}

function projectMatchesPeriod(project: DbProject, range: DashboardPeriodRange): boolean {
  return isIsoInRange(project.startDate ?? project.createdAt, range)
}

export function buildStartsCounters(projects: DbProject[], now: Date): DashboardStartsCounters {
  const todayRange = { start: startOfDay(now), end: endOfDay(now) }
  const weekRange = { start: startOfWeekMonday(now), end: endOfWeekSunday(now) }
  const monthRange = { start: startOfMonth(now), end: endOfMonth(now) }
  const yearRange = { start: startOfYear(now), end: endOfYear(now) }

  return {
    today: projects.filter((p) => isIsoInRange(p.startDate, todayRange)).length,
    week: projects.filter((p) => isIsoInRange(p.startDate, weekRange)).length,
    month: projects.filter((p) => isIsoInRange(p.startDate, monthRange)).length,
    year: projects.filter((p) => isIsoInRange(p.startDate, yearRange)).length,
  }
}

export function buildCutoverRows(
  events: DbEvent[],
  projectById: Map<string, DbProject>,
  taskProjectById: Map<string, string>,
  taskById: Map<string, DbTask>,
  range: DashboardPeriodRange,
): DashboardCutoverRow[] {
  const rows = events
    .filter((ev) => ev.status === 'realizado')
    .filter((ev) => isCutoverEvent(ev, taskById))
    .filter((ev) => isIsoInRange(ev.endTime ?? ev.startTime, range))
    .map((ev) => {
      const resolvedProjectId = ev.projectId ?? (ev.taskId ? taskProjectById.get(ev.taskId) ?? null : null)
      const project = resolvedProjectId ? projectById.get(resolvedProjectId) : null
      return {
        id: ev.id,
        source: 'event' as const,
        projectId: project?.id ?? '',
        projectName: project?.projectName ?? 'Projeto nao vinculado',
        title: ev.title,
        occurredAt: ev.endTime ?? ev.startTime,
        analystId: ev.analystId,
      }
    })
    .filter((row) => !!row.projectId)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
  return rows
}

function actionRowFromAlert(alert: DashboardAlertRow, analystsByProjectId: Map<string, string>): DashboardActionRow {
  const ownerLabel = analystsByProjectId.get(alert.projectId) ?? 'Sem analista definido'
  const priority = alert.kind === 'overdue_due' ? 'alta' : 'media'
  return {
    id: alert.id,
    projectId: alert.projectId,
    projectName: alert.projectName,
    reason: alert.primaryLine,
    ownerLabel,
    priority,
  }
}

export function buildDashboardMetrics(params: {
  now: Date
  filters: DashboardFilters
  periodRange: DashboardPeriodRange
  projects: DbProject[]
  phases: DbPhase[]
  tasks: DbTask[]
  events: DbEvent[]
  analysts: DbAnalyst[]
}): DashboardMetrics & { actionRows: DashboardActionRow[] } {
  const { now, filters, periodRange, projects, phases, tasks, events, analysts } = params
  const projectsByFacet = projects.filter((p) => projectMatchesFilters(p, filters))
  const scopedProjects = projectsByFacet.filter((p) => projectMatchesPeriod(p, periodRange))
  const scopedIds = new Set(scopedProjects.map((p) => p.id))
  const scopedTasks = tasks.filter((t) => scopedIds.has(t.projectId))
  const taskById = new Map(scopedTasks.map((task) => [task.id, task]))
  const taskProjectById = new Map(scopedTasks.map((task) => [task.id, task.projectId]))
  const scopedEvents = events.filter((ev) => {
    const projectId = ev.projectId ?? (ev.taskId ? taskProjectById.get(ev.taskId) ?? null : null)
    return !!projectId && scopedIds.has(projectId)
  })

  const startedInSelectedPeriod = scopedProjects.length
  const starts = buildStartsCounters(projectsByFacet, now)

  const projectById = new Map(scopedProjects.map((p) => [p.id, p]))
  const cutoversInSelectedPeriod = buildCutoverRows(scopedEvents, projectById, taskProjectById, taskById, periodRange)

  const alerts = buildDashboardAlerts({
    now,
    projects: scopedProjects,
    phases: phases.filter((p) => scopedIds.has(p.projectId)),
    tasks: scopedTasks,
    events: scopedEvents,
    runningTaskId: null,
    maxTotal: 50,
  })

  const analystsByProjectId = new Map<string, string>()
  for (const project of scopedProjects) {
    const analyst = analysts.find((a) => a.id === project.analystId)
    analystsByProjectId.set(project.id, analyst?.name ?? 'Sem analista definido')
  }
  const actionRows = alerts.slice(0, 10).map((alert) => actionRowFromAlert(alert, analystsByProjectId))

  return {
    starts,
    startedInSelectedPeriod,
    cutoversInSelectedPeriod,
    scopedProjects,
    actionRows,
  }
}
