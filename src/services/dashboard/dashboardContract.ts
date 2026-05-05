import type { DashboardFilters, DashboardMetrics } from '../../types/dashboard'

/**
 * Contrato alvo para futura agregação backend/RPC do dashboard.
 * Não bloqueia o cálculo local atual; serve para convergir frontend e backend.
 */
export type DashboardExecutiveRequest = {
  timezone: string
  filters: DashboardFilters
}

export type DashboardExecutiveResponse = {
  generatedAt: string
  filtersApplied: DashboardFilters
  metrics: DashboardMetrics & {
    actionRows: Array<{
      id: string
      projectId: string
      projectName: string
      reason: string
      ownerLabel: string
      priority: 'alta' | 'media'
    }>
  }
}
