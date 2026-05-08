import type { DbEvent, DbPhase, DbProject, DbTask } from '../db/types'
import { formatDatePt, formatDateTimePt, parseAppDate } from './dates'
import { deriveKanbanColumnFromPlanState } from '../services/kanbanPhaseSync'

export type DashboardAlertKind = 'overdue_due' | 'agenda_no_hours' | 'schedule_gap'

export type DashboardAlertRow = {
  id: string
  kind: DashboardAlertKind
  projectId: string
  projectName: string
  taskId: string | null
  /** Ordenação: mais urgente primeiro (valor menor = maior prioridade). */
  sortRank: number
  primaryLine: string
  secondaryLine: string | null
}

const MIN_LOGGED_HOURS = 0.01

function isOngoingProject(p: DbProject, phases: DbPhase[], tasks: DbTask[]): boolean {
  if (p.status !== 'ativo') return false
  const col = deriveKanbanColumnFromPlanState(p, phases, tasks)
  return col !== 'finalizados' && col !== 'cancelados'
}

function isOverdueByDueDate(t: DbTask, now: Date): boolean {
  if (!t.dueDate) return false
  if (t.status === 'concluida' || t.status === 'cancelado') return false
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  return parseAppDate(t.dueDate) < end
}

function openTask(t: DbTask): boolean {
  return t.status !== 'concluida' && t.status !== 'cancelado'
}

export function buildDashboardAlerts(opts: {
  now: Date
  projects: DbProject[]
  phases: DbPhase[]
  tasks: DbTask[]
  events: DbEvent[]
  runningTaskId: string | null
  maxTotal?: number
}): DashboardAlertRow[] {
  const { now, projects, phases, tasks, events, runningTaskId } = opts
  const maxTotal = opts.maxTotal ?? 20
  const projectById = new Map(projects.map((p) => [p.id, p]))

  const dueRows: DashboardAlertRow[] = []
  for (const t of tasks) {
    if (!isOverdueByDueDate(t, now)) continue
    const proj = projectById.get(t.projectId)
    if (!proj || !isOngoingProject(proj, phases, tasks)) continue
    const dueMs = t.dueDate ? parseAppDate(t.dueDate).getTime() : 0
    dueRows.push({
      id: `due-${t.id}`,
      kind: 'overdue_due',
      projectId: t.projectId,
      projectName: proj.projectName,
      taskId: t.id,
      sortRank: dueMs,
      primaryLine: `Tarefa «${t.title}» com prazo vencido`,
      secondaryLine: `${proj.projectName} · prazo ${t.dueDate ? formatDatePt(t.dueDate) : '—'}`,
    })
  }
  dueRows.sort((a, b) => a.sortRank - b.sortRank)

  const agendaRows: DashboardAlertRow[] = []
  const bestEventByTask = new Map<string, { startMs: number; ev: DbEvent; task: DbTask; project: DbProject }>()
  const nowMs = now.getTime()

  for (const ev of events) {
    if (ev.status !== 'agendado' || !ev.taskId) continue
    const startMs = new Date(ev.startTime).getTime()
    const endMs = new Date(ev.endTime).getTime()
    if (endMs > nowMs) continue

    const task = tasks.find((x) => x.id === ev.taskId)
    if (!task || !openTask(task) || task.isInformational) continue
    if (task.actualHours >= MIN_LOGGED_HOURS) continue
    if (runningTaskId && task.id === runningTaskId) continue

    const projId = ev.projectId ?? task.projectId
    const project = projectById.get(projId)
    if (!project) continue
    if (!isOngoingProject(project, phases, tasks)) continue

    const prev = bestEventByTask.get(task.id)
    if (!prev || startMs > prev.startMs) {
      bestEventByTask.set(task.id, { startMs, ev, task, project })
    }
  }

  for (const { startMs, ev, task, project } of bestEventByTask.values()) {
    agendaRows.push({
      id: `agenda-${task.id}`,
      kind: 'agenda_no_hours',
      projectId: project.id,
      projectName: project.projectName,
      taskId: task.id,
      sortRank: startMs,
      primaryLine: `Compromisso encerrado sem horas registradas na tarefa «${task.title}»`,
      secondaryLine: `${project.projectName} · ${formatDateTimePt(ev.startTime)}`,
    })
  }
  agendaRows.sort((a, b) => a.sortRank - b.sortRank)

  const scheduleRows: DashboardAlertRow[] = []
  for (const p of projects) {
    if (!isOngoingProject(p, phases, tasks)) continue
    const activePhase = phases.find((ph) => ph.projectId === p.id && ph.status === 'ativa')
    if (!activePhase) continue

    const phaseTasks = tasks.filter(
      (t) =>
        t.projectId === p.id &&
        t.phaseId === activePhase.id &&
        openTask(t) &&
        !t.isInformational,
    )
    if (phaseTasks.length === 0) continue

    const taskIds = new Set(phaseTasks.map((t) => t.id))
    const hasUpcoming = events.some(
      (e) =>
        e.status === 'agendado' &&
        e.taskId &&
        taskIds.has(e.taskId) &&
        new Date(e.startTime).getTime() >= nowMs,
    )
    if (hasUpcoming) continue

    scheduleRows.push({
      id: `schedule-${p.id}`,
      kind: 'schedule_gap',
      projectId: p.id,
      projectName: p.projectName,
      taskId: null,
      sortRank: 0,
      primaryLine: `Cronograma pendente na fase «${activePhase.name}»`,
      secondaryLine: 'Nenhuma agenda futura nas tarefas em aberto desta fase',
    })
  }
  scheduleRows.sort((a, b) => a.projectName.localeCompare(b.projectName, 'pt-BR'))

  const merged: DashboardAlertRow[] = [...dueRows, ...agendaRows, ...scheduleRows]
  return merged.slice(0, maxTotal)
}
