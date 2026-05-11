import type { DbEvent, DbPhase, DbProject, DbTask } from '../../db/types'
import { deriveKanbanColumnFromPlanState } from '../../services/kanbanPhaseSync'
import type { DashboardKpiDrilldownKey } from '../../types/dashboard'
import { isCutoverEvent } from './cutoverClassifier'

/** Projetos operacionais em curso: somente `ativo`, coluna derivada do plano ≠ finalizados/cancelados (alinhado ao board do dashboard). */
export function isProjectOperationalOngoing(project: DbProject, phases: DbPhase[], tasks: DbTask[]): boolean {
  if (project.status !== 'ativo') return false
  const col = deriveKanbanColumnFromPlanState(project, phases, tasks)
  return col !== 'finalizados' && col !== 'cancelados'
}

export type DashboardKpiBreakdown = {
  projectsNew: DbProject[]
  projectsOngoing: DbProject[]
  projectsDone: DbProject[]
  projectsCancelled: DbProject[]
  tasksNew: DbTask[]
  /** Tarefas com ≥1 evento agendado no recorte (não confundir com status interno). */
  tasksOngoing: DbTask[]
  tasksDone: DbTask[]
  /** Eventos (agendas) cancelados no recorte — pode haver múltiplos por tarefa. */
  tasksCancelled: DbEvent[]
  cutoversNew: DbEvent[]
  cutoversScheduled: DbEvent[]
  cutoversRealized: DbEvent[]
  cutoversCancelled: DbEvent[]
}

/**
 * KPI breakdown alinhado ao novo modelo 1 Tarefa : N Eventos.
 *
 * Regras críticas:
 *  - `tasksOngoing` = tarefas DISTINCT com ≥1 DbEvent (status='agendado', startTime ∈ janela). Sem janela = sem filtro temporal.
 *  - `tasksDone` = tarefas com ≥1 evento realizado (endTime ∈ janela) OU override manual (completedAt ∈ janela).
 *  - `tasksCancelled` = lista de EVENTOS cancelados no recorte (não tarefas). 1 tarefa pode contar N vezes.
 */
export function buildDashboardKpiBreakdown(params: {
  /**
   * Escopo só por filtros de facet (analista, status, plano, cliente).
   * Usado em **Projetos em andamento** — snapshot operacional, sem recorte pelo período da consulta nem pela janela KPI.
   */
  facetScopedProjects: DbProject[]
  /** Escopo temporal dos KPIs de projeto que dependem de datas (novos / concluídos / cancelados no recorte). */
  kpiScopedProjects: DbProject[]
  scopedTasks: DbTask[]
  scopedEvents: DbEvent[]
  phases: DbPhase[]
  tasks: DbTask[]
  isInKpiRange: (iso: string | null | undefined) => boolean
  /** `false` quando não há janela KPI (ex.: chip Total): não filtra conclusões por data; o caller deve passar escopo sem recorte de período da consulta. */
  kpiHasTimeWindow: boolean
}): DashboardKpiBreakdown {
  const {
    facetScopedProjects,
    kpiScopedProjects,
    scopedTasks,
    scopedEvents,
    phases,
    tasks,
    isInKpiRange,
    kpiHasTimeWindow,
  } = params

  const colOf = (p: DbProject) => deriveKanbanColumnFromPlanState(p, phases, tasks)
  const taskById = new Map(tasks.map((task) => [task.id, task]))
  const scopedTaskIds = new Set(scopedTasks.map((t) => t.id))

  const projectsNew: DbProject[] = []
  const projectsOngoing: DbProject[] = []
  const projectsDone: DbProject[] = []
  const projectsCancelled: DbProject[] = []
  const tasksNew: DbTask[] = []
  const tasksOngoingIds = new Set<string>()
  const tasksDoneIds = new Set<string>()
  const cutoversNew: DbEvent[] = []
  const cutoversScheduled: DbEvent[] = []
  const cutoversRealized: DbEvent[] = []
  const cutoversCancelled: DbEvent[] = []
  const cancelledEventsInWindow: DbEvent[] = []

  for (const project of facetScopedProjects) {
    if (!isProjectOperationalOngoing(project, phases, tasks)) continue
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

  for (const task of scopedTasks) {
    if (isInKpiRange(task.createdAt)) tasksNew.push(task)
    // Override manual conta como concluída quando a data de conclusão cai na janela
    if (task.completedManualOverride && task.status === 'concluida') {
      const inDoneWindow = !kpiHasTimeWindow || isInKpiRange(task.completedAt ?? null)
      if (inDoneWindow) tasksDoneIds.add(task.id)
    }
  }

  for (const ev of scopedEvents) {
    if (!ev.taskId || !scopedTaskIds.has(ev.taskId)) {
      // Ainda processa cutovers de eventos sem taskId
    } else {
      if (ev.status === 'agendado' && isInKpiRange(ev.startTime)) {
        tasksOngoingIds.add(ev.taskId)
      }
      if (ev.status === 'realizado') {
        const inDoneWindow = !kpiHasTimeWindow || isInKpiRange(ev.endTime ?? ev.startTime)
        if (inDoneWindow) tasksDoneIds.add(ev.taskId)
      }
      if (ev.status === 'cancelado' && isInKpiRange(ev.endTime ?? ev.startTime)) {
        cancelledEventsInWindow.push(ev)
      }
    }

    if (!isCutoverEvent(ev, taskById)) continue
    if (isInKpiRange(ev.createdAt)) cutoversNew.push(ev)
    if (ev.status === 'agendado' && isInKpiRange(ev.startTime)) cutoversScheduled.push(ev)
    if (ev.status === 'realizado' && isInKpiRange(ev.endTime ?? ev.startTime)) cutoversRealized.push(ev)
    if (ev.status === 'cancelado' && isInKpiRange(ev.endTime ?? ev.startTime)) cutoversCancelled.push(ev)
  }

  const tasksOngoing: DbTask[] = scopedTasks.filter((t) => tasksOngoingIds.has(t.id))
  const tasksDone: DbTask[] = scopedTasks.filter((t) => tasksDoneIds.has(t.id))

  return {
    projectsNew,
    projectsOngoing,
    projectsDone,
    projectsCancelled,
    tasksNew,
    tasksOngoing,
    tasksDone,
    tasksCancelled: cancelledEventsInWindow,
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
      return 'Agendas canceladas'
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
