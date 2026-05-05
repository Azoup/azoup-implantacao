import type { DbProject, ProjectStatus } from '../db/types'

export type DashboardPeriodPreset = 'today' | 'week' | 'month' | 'year' | 'custom'
export type DashboardKpiWindow = 'today' | 'week' | 'month' | 'total'

/** Sub-abas da área Consulta do dashboard. */
export type DashboardQuerySubTab = 'projects' | 'tasks' | 'cutovers'

/**
 * Identifica qual KPI foi acionado para drilldown na Consulta.
 * As listagens usam o mesmo recorte temporal da janela KPI (Hoje / Semana / Mês / Total) e o escopo dos filtros da Consulta.
 */
export type DashboardKpiDrilldownKey =
  | 'projects_new'
  | 'projects_ongoing'
  | 'projects_done'
  | 'projects_cancelled'
  | 'tasks_new'
  | 'tasks_ongoing'
  | 'tasks_done'
  | 'tasks_cancelled'
  | 'cutovers_new'
  | 'cutovers_scheduled'
  | 'cutovers_realized'
  | 'cutovers_cancelled'

export type DashboardPeriodRange = {
  start: Date
  end: Date
}

export type DashboardFilters = {
  periodPreset: DashboardPeriodPreset
  customStart: string
  customEnd: string
  analystId: string
  status: 'all' | ProjectStatus
  planType: string
  clientName: string
}

export type DashboardStartsCounters = {
  today: number
  week: number
  month: number
  year: number
}

export type DashboardCutoverSource = 'event'

export type DashboardCutoverRow = {
  id: string
  source: DashboardCutoverSource
  projectId: string
  projectName: string
  title: string
  occurredAt: string
  analystId: string | null
}

export type DashboardActionPriority = 'alta' | 'media'

export type DashboardActionRow = {
  id: string
  projectId: string
  projectName: string
  reason: string
  ownerLabel: string
  priority: DashboardActionPriority
}

export type DashboardMetrics = {
  starts: DashboardStartsCounters
  startedInSelectedPeriod: number
  cutoversInSelectedPeriod: DashboardCutoverRow[]
  scopedProjects: DbProject[]
}
