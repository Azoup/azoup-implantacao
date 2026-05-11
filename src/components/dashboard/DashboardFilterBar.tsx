import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
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
  month: 'Mês',
  total: 'Total',
}

const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

function shiftMonthYear(value: string, delta: number): string {
  const match = value.match(/^(\d{4})-(\d{2})$/)
  const now = new Date()
  let year = match ? Number.parseInt(match[1], 10) : now.getFullYear()
  let month = match ? Number.parseInt(match[2], 10) : now.getMonth() + 1
  month += delta
  while (month < 1) {
    month += 12
    year -= 1
  }
  while (month > 12) {
    month -= 12
    year += 1
  }
  return `${year}-${String(month).padStart(2, '0')}`
}

function describeMonthYear(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})$/)
  if (!match) return 'Selecionar mês'
  const month = Number.parseInt(match[2], 10) - 1
  const year = match[1]
  if (month < 0 || month > 11) return 'Selecionar mês'
  return `${MONTH_NAMES_PT[month]} ${year}`
}

export function DashboardFilterBar(props: Props) {
  const { kpiWindow, onKpiWindowChange, monthYear, onMonthYearChange } = props
  const isMonth = kpiWindow === 'month'

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
        {isMonth ? (
          <div className="dashboard-cc__month-nav" role="group" aria-label="Selecionar mês e ano">
            <div className="dashboard-cc__month-nav-track">
              <button
                type="button"
                className="dashboard-cc__month-nav-btn"
                aria-label="Mês anterior"
                onClick={() => onMonthYearChange(shiftMonthYear(monthYear, -1))}
              >
                <ChevronLeft size={16} aria-hidden strokeWidth={2.25} />
              </button>
              <label className="dashboard-cc__month-nav-label">
                <CalendarDays className="dashboard-cc__month-nav-icon" size={16} aria-hidden strokeWidth={2} />
                <span className="dashboard-cc__month-nav-text">{describeMonthYear(monthYear)}</span>
                <input
                  type="month"
                  value={monthYear}
                  onChange={(event) => onMonthYearChange(event.target.value)}
                  aria-label="Selecionar mês e ano"
                />
              </label>
              <button
                type="button"
                className="dashboard-cc__month-nav-btn"
                aria-label="Próximo mês"
                onClick={() => onMonthYearChange(shiftMonthYear(monthYear, 1))}
              >
                <ChevronRight size={16} aria-hidden strokeWidth={2.25} />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
