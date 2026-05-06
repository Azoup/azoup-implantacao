import { describe, expect, it } from 'vitest'
import type { DbEvent, DbPhase, DbProject, DbTask } from '../../db/types'
import { buildDashboardKpiBreakdown } from './dashboardKpiBreakdown'

const baseTask = (overrides: Partial<DbTask>): DbTask => ({
  id: 't1',
  title: 'Teste',
  description: '',
  projectId: 'p1',
  phaseId: 'ph1',
  status: 'pendente',
  priority: 'media',
  estimatedHours: 0,
  actualHours: 0,
  assignedTo: null,
  dueDate: null,
  isInformational: true,
  createdAt: '2026-05-01T10:00:00.000Z',
  code: '0.1',
  sortOrder: 0,
  ...overrides,
})

describe('buildDashboardKpiBreakdown', () => {
  const emptyBreakdownParams = {
    scopedProjects: [] as DbProject[],
    kpiScopedProjects: [] as DbProject[],
    scopedEvents: [] as DbEvent[],
    phases: [] as DbPhase[],
  }

  it('inclui concluídas na janela pela data de conclusão, não pela criação da tarefa', () => {
    const task = baseTask({
      status: 'concluida',
      createdAt: '2026-05-01T10:00:00.000Z',
      completedAt: '2026-05-05T16:00:00.000Z',
    })
    const b = buildDashboardKpiBreakdown({
      ...emptyBreakdownParams,
      scopedTasks: [task],
      tasks: [task],
      isInKpiRange: (iso) => Boolean(iso?.startsWith('2026-05-05')),
      kpiHasTimeWindow: true,
    })
    expect(b.tasksDone).toHaveLength(1)
    expect(b.tasksDone[0]?.id).toBe('t1')
  })

  it('exclui concluída na janela quando falta completedAt (sem como datar a conclusão)', () => {
    const task = baseTask({
      status: 'concluida',
      createdAt: '2026-05-01T10:00:00.000Z',
      completedAt: null,
    })
    const b = buildDashboardKpiBreakdown({
      ...emptyBreakdownParams,
      scopedTasks: [task],
      tasks: [task],
      isInKpiRange: (iso) => Boolean(iso?.startsWith('2026-05-05')),
      kpiHasTimeWindow: true,
    })
    expect(b.tasksDone).toHaveLength(0)
  })

  it('no resumo total, conta todas as concluídas do escopo mesmo sem completedAt', () => {
    const task = baseTask({
      status: 'concluida',
      completedAt: null,
    })
    const b = buildDashboardKpiBreakdown({
      ...emptyBreakdownParams,
      scopedTasks: [task],
      tasks: [task],
      isInKpiRange: () => true,
      kpiHasTimeWindow: false,
    })
    expect(b.tasksDone).toHaveLength(1)
  })

  it('conta tarefas ativas (pendente e em_andamento) independentemente da data de criação', () => {
    const pendingOld = baseTask({
      id: 't-pending',
      status: 'pendente',
      createdAt: '2026-04-20T10:00:00.000Z',
    })
    const inProgressOld = baseTask({
      id: 't-progress',
      status: 'em_andamento',
      createdAt: '2026-04-20T11:00:00.000Z',
    })
    const doneToday = baseTask({
      id: 't-done',
      status: 'concluida',
      createdAt: '2026-05-05T09:00:00.000Z',
      completedAt: '2026-05-05T10:00:00.000Z',
    })
    const b = buildDashboardKpiBreakdown({
      ...emptyBreakdownParams,
      scopedTasks: [pendingOld, inProgressOld, doneToday],
      tasks: [pendingOld, inProgressOld, doneToday],
      isInKpiRange: (iso) => Boolean(iso?.startsWith('2026-05-05')),
      kpiHasTimeWindow: true,
    })
    expect(b.tasksOngoing.map((task) => task.id).sort()).toEqual(['t-pending', 't-progress'])
  })

  it('usa cancelledAt para canceladas no período', () => {
    const cancelledYesterday = baseTask({
      id: 't-cancelled-yesterday',
      status: 'cancelado',
      createdAt: '2026-05-01T10:00:00.000Z',
      cancelledAt: '2026-05-04T16:00:00.000Z',
    })
    const cancelledToday = baseTask({
      id: 't-cancelled-today',
      status: 'cancelado',
      createdAt: '2026-05-01T12:00:00.000Z',
      cancelledAt: '2026-05-05T09:30:00.000Z',
    })
    const b = buildDashboardKpiBreakdown({
      ...emptyBreakdownParams,
      scopedTasks: [cancelledYesterday, cancelledToday],
      tasks: [cancelledYesterday, cancelledToday],
      isInKpiRange: (iso) => Boolean(iso?.startsWith('2026-05-05')),
      kpiHasTimeWindow: true,
    })
    expect(b.tasksCancelled).toHaveLength(1)
    expect(b.tasksCancelled[0]?.id).toBe('t-cancelled-today')
  })

  it('conta no-show reagendado no KPI de canceladas', () => {
    const noShowRebooked = baseTask({
      id: 't-no-show',
      status: 'cancelado',
      cancelledAt: '2026-05-05T10:00:00.000Z',
      cancellationReason: 'client_no_show',
      rescheduledToTaskId: 't-next',
    })
    const cancelledDefinitive = baseTask({
      id: 't-cancelled-definitive',
      status: 'cancelado',
      cancelledAt: '2026-05-05T11:00:00.000Z',
      cancellationReason: 'other',
      rescheduledToTaskId: null,
    })
    const b = buildDashboardKpiBreakdown({
      ...emptyBreakdownParams,
      scopedTasks: [noShowRebooked, cancelledDefinitive],
      tasks: [noShowRebooked, cancelledDefinitive],
      isInKpiRange: (iso) => Boolean(iso?.startsWith('2026-05-05')),
      kpiHasTimeWindow: true,
    })
    expect(b.tasksCancelled).toHaveLength(2)
    expect(b.tasksCancelled.map((task) => task.id).sort()).toEqual(['t-cancelled-definitive', 't-no-show'])
  })
})
