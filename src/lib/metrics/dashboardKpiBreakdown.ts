import type { DbEvent, DbPhase, DbProject, DbTask } from '../../db/types'
import { deriveKanbanColumnFromPlanState } from '../../services/kanbanPhaseSync'
import type { DashboardKpiDrilldownKey } from '../../types/dashboard'
import { isCutoverEvent } from './cutoverClassifier'

export type DashboardKpiBreakdown = {
  projectsNew: DbProject[]
  projectsOngoing: DbProject[]
  projectsDone: DbProject[]
  projectsCancelled: DbProject[]
  tasksNew: DbTask[]
  tasksOngoing: DbTask[]
  tasksDone: DbTask[]
  tasksCancelled: DbTask[]
  cutoversNew: DbEvent[]
  cutoversScheduled: DbEvent[]
  cutoversRealized: DbEvent[]
  cutoversCancelled: DbEvent[]
}

/** Same semantics as summary KPI counters (KPI window + already scoped filters). */
export function buildDashboardKpiBreakdown(params: {
  scopedProjects: DbProject[]
  kpiScopedProjects: DbProject[]
  kpiScopedTasks: DbTask[]
  scopedEvents: DbEvent[]
  phases: DbPhase[]
  tasks: DbTask[]
  isInKpiRange: (iso: string | null | undefined) => boolean
}): DashboardKpiBreakdown {
  const { scopedProjects, kpiScopedProjects, kpiScopedTasks, scopedEvents, phases, tasks, isInKpiRange } = params

  const colOf = (p: DbProject) => deriveKanbanColumnFromPlanState(p, phases, tasks)
  const taskById = new Map(tasks.map((task) => [task.id, task]))
  const kpiScopedTaskById = new Map(kpiScopedTasks.map((task) => [task.id, task]))
  const projectsNew: DbProject[] = []
  const projectsOngoing: DbProject[] = []
  const projectsDone: DbProject[] = []
  const projectsCancelled: DbProject[] = []
  const tasksNew: DbTask[] = []
  const tasksOngoing: DbTask[] = []
  const tasksDone: DbTask[] = []
  const cutoversNew: DbEvent[] = []
  const cutoversScheduled: DbEvent[] = []
  const cutoversRealized: DbEvent[] = []
  const cutoversCancelled: DbEvent[] = []
  const cancelledTaskIds = new Set<string>()

  for (const project of scopedProjects) {
    const col = colOf(project)
    if (project.status === 'finalizado' || col === 'finalizados') continue
    if (project.status === 'cancelado' || col === 'cancelados') continue
    projectsOngoing.push(project)
  }

  for (const project of kpiScopedProjects) {
    if (isInKpiRange(project.createdAt)) projectsNew.push(project)
    const col = colOf(project)
    if (project.status === 'finalizado' || col === 'finalizados') {
      projectsDone.push(project)
      continue
    }
    if (project.status === 'cancelado' || col === 'cancelados') {
      projectsCancelled.push(project)
      continue
    }
  }

  for (const task of kpiScopedTasks) {
    if (isInKpiRange(task.createdAt)) tasksNew.push(task)
    if (task.status === 'pendente') tasksOngoing.push(task)
    if (task.status === 'concluida') tasksDone.push(task)
    if (task.status === 'cancelado') cancelledTaskIds.add(task.id)
  }

  for (const ev of scopedEvents) {
    if (ev.status === 'cancelado' && ev.taskId && kpiScopedTaskById.has(ev.taskId)) {
      cancelledTaskIds.add(ev.taskId)
    }
    if (!isCutoverEvent(ev, taskById)) continue
    if (isInKpiRange(ev.createdAt)) cutoversNew.push(ev)
    if (ev.status === 'agendado' && isInKpiRange(ev.startTime)) cutoversScheduled.push(ev)
    if (ev.status === 'realizado' && isInKpiRange(ev.endTime ?? ev.startTime)) cutoversRealized.push(ev)
    if (ev.status === 'cancelado' && isInKpiRange(ev.endTime ?? ev.startTime)) cutoversCancelled.push(ev)
  }

  const tasksCancelled = kpiScopedTasks.filter((t) => cancelledTaskIds.has(t.id))

  return {
    projectsNew,
    projectsOngoing,
    projectsDone,
    projectsCancelled,
    tasksNew,
    tasksOngoing,
    tasksDone,
    tasksCancelled,
    cutoversNew,
    cutoversScheduled,
    cutoversRealized,
    cutoversCancelled,
  }
}

export function dashboardKpiDrilldownSubTab(key: DashboardKpiDrilldownKey): 'projects' | 'tasks' | 'cutovers' {
  if (key.startsWith('projects_')) return 'projects'
  if (key.startsWith('tasks_')) return 'tasks'
  return 'cutovers'
}

export function dashboardKpiDrilldownList(
  key: DashboardKpiDrilldownKey,
  b: DashboardKpiBreakdown,
): DbProject[] | DbTask[] | DbEvent[] {
  switch (key) {
    case 'projects_new':
      return b.projectsNew
    case 'projects_ongoing':
      return b.projectsOngoing
    case 'projects_done':
      return b.projectsDone
    case 'projects_cancelled':
      return b.projectsCancelled
    case 'tasks_new':
      return b.tasksNew
    case 'tasks_ongoing':
      return b.tasksOngoing
    case 'tasks_done':
      return b.tasksDone
    case 'tasks_cancelled':
      return b.tasksCancelled
    case 'cutovers_new':
      return b.cutoversNew
    case 'cutovers_scheduled':
      return b.cutoversScheduled
    case 'cutovers_realized':
      return b.cutoversRealized
    case 'cutovers_cancelled':
      return b.cutoversCancelled
  }
}

export function dashboardKpiDrilldownTitle(key: DashboardKpiDrilldownKey): string {
  switch (key) {
    case 'projects_new':
      return 'Projetos novos no periodo'
    case 'projects_ongoing':
      return 'Projetos em andamento'
    case 'projects_done':
      return 'Projetos concluidos'
    case 'projects_cancelled':
      return 'Projetos cancelados'
    case 'tasks_new':
      return 'Tarefas novas no periodo'
    case 'tasks_ongoing':
      return 'Tarefas agendadas'
    case 'tasks_done':
      return 'Tarefas concluidas'
    case 'tasks_cancelled':
      return 'Tarefas canceladas'
    case 'cutovers_new':
      return 'Viradas novas no periodo'
    case 'cutovers_scheduled':
      return 'Viradas agendadas'
    case 'cutovers_realized':
      return 'Viradas realizadas'
    case 'cutovers_cancelled':
      return 'Viradas canceladas'
  }
}
