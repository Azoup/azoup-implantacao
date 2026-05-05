import type { DashboardKpiDrilldownKey } from '../../types/dashboard'
import { DashboardKpiCards } from './DashboardKpiCards'

type LegacyKpis = {
  projectsNew: number
  projectsOngoing: number
  tasksNew: number
  tasksOngoing: number
  projectsDone: number
  projectsCancelled: number
  tasksDone: number
  tasksCancelled: number
}

type Props = {
  kpis: LegacyKpis
  cutoversNewCount: number
  cutoversDoneCount: number
  scheduledCutoversCount: number
  canceledCutoversCount: number
  activeKpiDrilldown: DashboardKpiDrilldownKey | null
  onKpiDrilldownSelect: (key: DashboardKpiDrilldownKey) => void
  kpiWindowDescription: string
}

export function DashboardSummaryTab(props: Props) {
  const {
    kpis,
    cutoversNewCount,
    cutoversDoneCount,
    scheduledCutoversCount,
    canceledCutoversCount,
    activeKpiDrilldown,
    onKpiDrilldownSelect,
    kpiWindowDescription,
  } = props

  return (
    <section className="dashboard-cc__summary">
      <DashboardKpiCards
        kpis={kpis}
        cutoversNewCount={cutoversNewCount}
        cutoversDoneCount={cutoversDoneCount}
        scheduledCutoversCount={scheduledCutoversCount}
        canceledCutoversCount={canceledCutoversCount}
        activeDrilldown={activeKpiDrilldown}
        onDrilldownSelect={onKpiDrilldownSelect}
        kpiWindowDescription={kpiWindowDescription}
      />
    </section>
  )
}
