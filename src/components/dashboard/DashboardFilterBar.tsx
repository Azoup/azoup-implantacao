import type { DashboardKpiWindow } from '../../types/dashboard'

type Props = {
  kpiWindow: DashboardKpiWindow
  onKpiWindowChange: (window: DashboardKpiWindow) => void
  monthYear: string
  onMonthYearChange: (value: string) => void
}

const KPI_WINDOW_LABEL: Record<DashboardKpiWindow, string> = {
  today: 'Hoje',
  week: 'Essa semana',
  month: 'Esse mês',
  total: 'Total',
}

export function DashboardFilterBar(props: Props) {
  const { kpiWindow, onKpiWindowChange, monthYear, onMonthYearChange } = props

  return (
    <div className="dashboard-cc__filterbar" aria-label="Filtro temporal dos indicadores">
      <div className="dashboard-cc__kpi-toolbar">
        <div className="dashboard-cc__kpi-filter" role="group" aria-label="Filtro global dos cards">
          {(Object.keys(KPI_WINDOW_LABEL) as DashboardKpiWindow[]).map((window) => (
            <button
              key={window}
              type="button"
              className={
                'dashboard-cc__chip dashboard-cc__chip--kpi dashboard-cc__kpi-btn' + (kpiWindow === window ? ' is-active' : '')
              }
              aria-pressed={kpiWindow === window}
              onClick={() => onKpiWindowChange(window)}
            >
              {KPI_WINDOW_LABEL[window]}
            </button>
          ))}
        </div>
        <label className="dashboard-cc__month-year" aria-label="Filtro personalizado por mês e ano">
          <span>Mês/Ano</span>
          <input type="month" value={monthYear} onChange={(event) => onMonthYearChange(event.target.value)} />
        </label>
      </div>
    </div>
  )
}
