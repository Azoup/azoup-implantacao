import type { LucideIcon } from 'lucide-react'
import { Check, FolderClosed, KeyRound, Layers3, ListChecks, ListTodo, Plus, Timer, X } from 'lucide-react'
import type { DashboardKpiDrilldownKey } from '../../types/dashboard'

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
  activeDrilldown: DashboardKpiDrilldownKey | null
  onDrilldownSelect: (key: DashboardKpiDrilldownKey) => void
  kpiWindowDescription: string
}

type KpiCardProps = {
  count: number
  label: string
  toneClassName: 'is-info' | 'is-warning' | 'is-success' | 'is-danger'
  drilldownKey: DashboardKpiDrilldownKey
  activeDrilldown: DashboardKpiDrilldownKey | null
  onDrilldownSelect: (key: DashboardKpiDrilldownKey) => void
  kpiWindowDescription: string
  iconMain: LucideIcon
  iconMark: LucideIcon
}

function KpiCompositeIcon({ Main, Mark }: { Main: LucideIcon; Mark: LucideIcon }) {
  return (
    <span className="dashboard-cc__hero-icon dashboard-cc__hero-icon--stacked">
      <Main size={20} strokeWidth={2} aria-hidden />
      <span className="dashboard-cc__hero-icon-badge" aria-hidden>
        <Mark size={11} strokeWidth={2.6} />
      </span>
    </span>
  )
}

function DashboardKpiCard({
  count,
  label,
  toneClassName,
  drilldownKey,
  activeDrilldown,
  onDrilldownSelect,
  kpiWindowDescription,
  iconMain: IconMain,
  iconMark: IconMark,
}: KpiCardProps) {
  const isActive = activeDrilldown === drilldownKey

  return (
    <button
      type="button"
      className={
        'dashboard-cc__hero-card dashboard-cc__hero-card--clickable ' + toneClassName + (isActive ? ' is-drilldown-active' : '')
      }
      aria-pressed={isActive}
      aria-label={`${label}: ${count}. ${kpiWindowDescription}. Abrir listagem detalhada.`}
      onClick={() => onDrilldownSelect(drilldownKey)}
    >
      <KpiCompositeIcon Main={IconMain} Mark={IconMark} />
      <div className="dashboard-cc__hero-copy">
        <strong>{count}</strong>
        <span>{label}</span>
      </div>
    </button>
  )
}

export function DashboardKpiCards({
  kpis,
  cutoversNewCount,
  cutoversDoneCount,
  scheduledCutoversCount,
  canceledCutoversCount,
  activeDrilldown,
  onDrilldownSelect,
  kpiWindowDescription,
}: Props) {
  return (
    <div className="dashboard-cc__hero-groups">
      <section className="dashboard-cc__hero-group" aria-label="KPIs de projetos">
        <header className="dashboard-cc__hero-group-title">
          <Layers3 size={14} aria-hidden />
          <span>Projetos</span>
        </header>
        <div className="dashboard-cc__hero-grid">
          <DashboardKpiCard
            count={kpis.projectsNew}
            label="Projetos novos"
            toneClassName="is-info"
            drilldownKey="projects_new"
            activeDrilldown={activeDrilldown}
            onDrilldownSelect={onDrilldownSelect}
            kpiWindowDescription={kpiWindowDescription}
            iconMain={FolderClosed}
            iconMark={Plus}
          />
          <DashboardKpiCard
            count={kpis.projectsOngoing}
            label="Projetos em andamento"
            toneClassName="is-warning"
            drilldownKey="projects_ongoing"
            activeDrilldown={activeDrilldown}
            onDrilldownSelect={onDrilldownSelect}
            kpiWindowDescription={kpiWindowDescription}
            iconMain={FolderClosed}
            iconMark={Timer}
          />
          <DashboardKpiCard
            count={kpis.projectsDone}
            label="Projetos concluidos"
            toneClassName="is-success"
            drilldownKey="projects_done"
            activeDrilldown={activeDrilldown}
            onDrilldownSelect={onDrilldownSelect}
            kpiWindowDescription={kpiWindowDescription}
            iconMain={FolderClosed}
            iconMark={Check}
          />
          <DashboardKpiCard
            count={kpis.projectsCancelled}
            label="Projetos cancelados"
            toneClassName="is-danger"
            drilldownKey="projects_cancelled"
            activeDrilldown={activeDrilldown}
            onDrilldownSelect={onDrilldownSelect}
            kpiWindowDescription={kpiWindowDescription}
            iconMain={FolderClosed}
            iconMark={X}
          />
        </div>
      </section>

      <section className="dashboard-cc__hero-group" aria-label="KPIs de tarefas">
        <header className="dashboard-cc__hero-group-title">
          <ListChecks size={14} aria-hidden />
          <span>Tarefas</span>
        </header>
        <div className="dashboard-cc__hero-grid">
          <DashboardKpiCard
            count={kpis.tasksNew}
            label="Tarefas novas"
            toneClassName="is-info"
            drilldownKey="tasks_new"
            activeDrilldown={activeDrilldown}
            onDrilldownSelect={onDrilldownSelect}
            kpiWindowDescription={kpiWindowDescription}
            iconMain={ListTodo}
            iconMark={Plus}
          />
          <DashboardKpiCard
            count={kpis.tasksOngoing}
            label="Tarefas agendadas"
            toneClassName="is-warning"
            drilldownKey="tasks_ongoing"
            activeDrilldown={activeDrilldown}
            onDrilldownSelect={onDrilldownSelect}
            kpiWindowDescription={kpiWindowDescription}
            iconMain={ListTodo}
            iconMark={Timer}
          />
          <DashboardKpiCard
            count={kpis.tasksDone}
            label="Tarefas concluidas"
            toneClassName="is-success"
            drilldownKey="tasks_done"
            activeDrilldown={activeDrilldown}
            onDrilldownSelect={onDrilldownSelect}
            kpiWindowDescription={kpiWindowDescription}
            iconMain={ListTodo}
            iconMark={Check}
          />
          <DashboardKpiCard
            count={kpis.tasksCancelled}
            label="Tarefas canceladas"
            toneClassName="is-danger"
            drilldownKey="tasks_cancelled"
            activeDrilldown={activeDrilldown}
            onDrilldownSelect={onDrilldownSelect}
            kpiWindowDescription={kpiWindowDescription}
            iconMain={ListTodo}
            iconMark={X}
          />
        </div>
      </section>

      <section className="dashboard-cc__hero-group" aria-label="KPIs de viradas">
        <header className="dashboard-cc__hero-group-title">
          <KeyRound size={14} aria-hidden />
          <span>Viradas</span>
        </header>
        <div className="dashboard-cc__hero-grid">
          <DashboardKpiCard
            count={cutoversNewCount}
            label="Viradas novas"
            toneClassName="is-info"
            drilldownKey="cutovers_new"
            activeDrilldown={activeDrilldown}
            onDrilldownSelect={onDrilldownSelect}
            kpiWindowDescription={kpiWindowDescription}
            iconMain={KeyRound}
            iconMark={Plus}
          />
          <DashboardKpiCard
            count={scheduledCutoversCount}
            label="Viradas agendadas"
            toneClassName="is-warning"
            drilldownKey="cutovers_scheduled"
            activeDrilldown={activeDrilldown}
            onDrilldownSelect={onDrilldownSelect}
            kpiWindowDescription={kpiWindowDescription}
            iconMain={KeyRound}
            iconMark={Timer}
          />
          <DashboardKpiCard
            count={cutoversDoneCount}
            label="Viradas concluidas"
            toneClassName="is-success"
            drilldownKey="cutovers_realized"
            activeDrilldown={activeDrilldown}
            onDrilldownSelect={onDrilldownSelect}
            kpiWindowDescription={kpiWindowDescription}
            iconMain={KeyRound}
            iconMark={Check}
          />
          <DashboardKpiCard
            count={canceledCutoversCount}
            label="Viradas canceladas"
            toneClassName="is-danger"
            drilldownKey="cutovers_cancelled"
            activeDrilldown={activeDrilldown}
            onDrilldownSelect={onDrilldownSelect}
            kpiWindowDescription={kpiWindowDescription}
            iconMain={KeyRound}
            iconMark={X}
          />
        </div>
      </section>
    </div>
  )
}
