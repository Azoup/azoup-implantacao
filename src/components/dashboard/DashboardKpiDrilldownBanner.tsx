import type { DashboardKpiDrilldownKey, DashboardKpiWindow } from '../../types/dashboard'
import { dashboardKpiDrilldownTitle } from '../../lib/metrics/dashboardKpiBreakdown'

function kpiWindowLabel(w: DashboardKpiWindow): string {
  if (w === 'today') return 'Hoje'
  if (w === 'week') return 'Essa semana'
  if (w === 'month') return 'Esse mês'
  return 'Total'
}

type Props = {
  drilldown: DashboardKpiDrilldownKey
  kpiWindow: DashboardKpiWindow
  itemCount: number
  onClear: () => void
}

export function DashboardKpiDrilldownBanner({ drilldown, kpiWindow, itemCount, onClear }: Props) {
  const title = dashboardKpiDrilldownTitle(drilldown)
  return (
    <div className="dashboard-cc__drilldown-banner" id="dashboard-kpi-drilldown" role="region" aria-label="Detalhe do KPI">
      <div className="dashboard-cc__drilldown-banner__text">
        <strong>{title}</strong>
        <span className="dashboard-cc__drilldown-banner__meta">
          {itemCount} {itemCount === 1 ? 'item' : 'itens'} · {kpiWindowLabel(kpiWindow)} · Filtros da consulta aplicados
        </span>
      </div>
      <button type="button" className="btn btn--sm btn--ghost" onClick={onClear}>
        Fechar detalhe
      </button>
    </div>
  )
}
