import { describe, expect, it } from 'vitest'
import type { DbEvent, DbPhase, DbProject, DbTask } from '../../db/types'
import { buildDashboardKpiBreakdown, isProjectOperationalOngoing } from './dashboardKpiBreakdown'

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
  isInformational: false,
  createdAt: '2026-05-01T10:00:00.000Z',
  code: '0.1',
  sortOrder: 0,
  ...overrides,
})

const baseProject = (overrides: Partial<DbProject>): DbProject => ({
  id: 'p1',
  projectName: 'P1',
  clientType: 'generico',
  engagementKind: 'operacao_padrao',
  planType: 'basic',
  hoursContracted: 10,
  hoursUsed: 0,
  startDate: '2025-01-15T00:00:00.000Z',
  dueDate: null,
  cancelledAt: null,
  status: 'ativo',
  ownerId: 'u1',
  analystId: 'a1',
  createdBy: 'u1',
  createdAt: '2025-01-10T00:00:00.000Z',
  kanbanColumn: 'fase_01',
  cnpj: null,
  razaoSocial: null,
  tradeName: null,
  cep: null,
  addressStreet: null,
  addressNumber: null,
  addressComplement: null,
  addressNeighborhood: null,
  addressCity: null,
  addressState: null,
  implantationContactName: null,
  implantationContactPhone: null,
  corporateEmail: null,
  clientApiId: null,
  internalNotes: null,
  stateRegistration: null,
  secondaryCnpj: null,
  secondaryRazaoSocial: null,
  modulesDescription: null,
  planSnapshotCapturedAt: '2025-01-10T00:00:00.000Z',
  planSnapshot: { mode: 'custom', modelId: null, key: 'custom', name: 'X', hoursContracted: 10, phaseCount: 1, taskCount: 1 },
  lastManualCheckinAt: null,
  lastManualCheckinBy: null,
  manualAttentionNote: null,
  manualAttentionAt: null,
  manualAttentionBy: null,
  freezeTimeline: [],
  ...overrides,
})

const basePhase = (overrides: Partial<DbPhase>): DbPhase => ({
  id: 'ph1',
  projectId: 'p1',
  name: 'F1',
  orderIndex: 0,
  status: 'ativa',
  colorHex: '#000',
  ...overrides,
})

const baseEvent = (overrides: Partial<DbEvent>): DbEvent => ({
  id: 'e1',
  title: 'Reunião',
  description: '',
  startTime: '2026-05-05T10:00:00.000Z',
  endTime: '2026-05-05T11:00:00.000Z',
  status: 'agendado',
  projectId: 'p1',
  taskId: 't1',
  analystId: null,
  meetingLink: null,
  recordingLink: null,
  createdAt: '2026-05-01T10:00:00.000Z',
  ...overrides,
})

describe('buildDashboardKpiBreakdown — modelo 1 Tarefa : N Eventos', () => {
  const emptyBreakdownParams = {
    facetScopedProjects: [] as DbProject[],
    kpiScopedProjects: [] as DbProject[],
    phases: [] as DbPhase[],
  }

  it('NÃO conta tarefa como agendada quando não tem evento (corrige bug "agendada sem agenda")', () => {
    const task = baseTask({ status: 'em_andamento' })
    const b = buildDashboardKpiBreakdown({
      ...emptyBreakdownParams,
      scopedTasks: [task],
      tasks: [task],
      scopedEvents: [],
      isInKpiRange: () => true,
      kpiHasTimeWindow: false,
    })
    expect(b.tasksOngoing).toHaveLength(0)
  })

  it('conta tarefa como agendada quando tem evento agendado no recorte', () => {
    const task = baseTask({ status: 'pendente' })
    const event = baseEvent({ startTime: '2026-05-05T10:00:00.000Z' })
    const b = buildDashboardKpiBreakdown({
      ...emptyBreakdownParams,
      scopedTasks: [task],
      tasks: [task],
      scopedEvents: [event],
      isInKpiRange: (iso) => Boolean(iso?.startsWith('2026-05-05')),
      kpiHasTimeWindow: true,
    })
    expect(b.tasksOngoing.map((t) => t.id)).toEqual(['t1'])
  })

  it('conta tarefa como concluída por evento realizado no recorte', () => {
    const task = baseTask({ status: 'concluida' })
    const event = baseEvent({
      status: 'realizado',
      endTime: '2026-05-05T11:00:00.000Z',
    })
    const b = buildDashboardKpiBreakdown({
      ...emptyBreakdownParams,
      scopedTasks: [task],
      tasks: [task],
      scopedEvents: [event],
      isInKpiRange: (iso) => Boolean(iso?.startsWith('2026-05-05')),
      kpiHasTimeWindow: true,
    })
    expect(b.tasksDone.map((t) => t.id)).toEqual(['t1'])
  })

  it('conta override manual de conclusão na janela', () => {
    const task = baseTask({
      status: 'concluida',
      completedManualOverride: true,
      completedAt: '2026-05-05T16:00:00.000Z',
    })
    const b = buildDashboardKpiBreakdown({
      ...emptyBreakdownParams,
      scopedTasks: [task],
      tasks: [task],
      scopedEvents: [],
      isInKpiRange: (iso) => Boolean(iso?.startsWith('2026-05-05')),
      kpiHasTimeWindow: true,
    })
    expect(b.tasksDone.map((t) => t.id)).toEqual(['t1'])
  })

  it('cancelamento de evento aparece em tasksCancelled (lista de eventos) e tarefa segue aberta', () => {
    const task = baseTask({ status: 'pendente' })
    const cancelledEvent = baseEvent({
      id: 'e-cancel',
      status: 'cancelado',
      endTime: '2026-05-05T09:00:00.000Z',
    })
    const scheduledEvent = baseEvent({
      id: 'e-future',
      status: 'agendado',
      startTime: '2026-05-05T14:00:00.000Z',
    })
    const b = buildDashboardKpiBreakdown({
      ...emptyBreakdownParams,
      scopedTasks: [task],
      tasks: [task],
      scopedEvents: [cancelledEvent, scheduledEvent],
      isInKpiRange: (iso) => Boolean(iso?.startsWith('2026-05-05')),
      kpiHasTimeWindow: true,
    })
    expect(b.tasksCancelled.map((e) => e.id)).toEqual(['e-cancel'])
    expect(b.tasksOngoing.map((t) => t.id)).toEqual(['t1'])
  })

  it('múltiplos cancelamentos da mesma tarefa contam separadamente', () => {
    const task = baseTask({ status: 'pendente' })
    const c1 = baseEvent({ id: 'e-c1', status: 'cancelado', endTime: '2026-05-05T09:00:00.000Z' })
    const c2 = baseEvent({ id: 'e-c2', status: 'cancelado', endTime: '2026-05-05T15:00:00.000Z' })
    const b = buildDashboardKpiBreakdown({
      ...emptyBreakdownParams,
      scopedTasks: [task],
      tasks: [task],
      scopedEvents: [c1, c2],
      isInKpiRange: (iso) => Boolean(iso?.startsWith('2026-05-05')),
      kpiHasTimeWindow: true,
    })
    expect(b.tasksCancelled).toHaveLength(2)
  })

  it('inclui concluídas na janela pela data de conclusão do override manual', () => {
    const task = baseTask({
      status: 'concluida',
      completedManualOverride: true,
      createdAt: '2026-05-01T10:00:00.000Z',
      completedAt: '2026-05-05T16:00:00.000Z',
    })
    const b = buildDashboardKpiBreakdown({
      ...emptyBreakdownParams,
      scopedTasks: [task],
      tasks: [task],
      scopedEvents: [],
      isInKpiRange: (iso) => Boolean(iso?.startsWith('2026-05-05')),
      kpiHasTimeWindow: true,
    })
    expect(b.tasksDone).toHaveLength(1)
  })

  it('viradas agendadas no recorte usam data do evento, não a data de início do projeto', () => {
    const proj = baseProject({
      id: 'p-old',
      startDate: '2020-01-01T00:00:00.000Z',
      createdAt: '2020-01-05T00:00:00.000Z',
    })
    const task = baseTask({
      projectId: 'p-old',
      title: 'Virada loja',
      description: 'go live produção',
    })
    const ev = baseEvent({
      projectId: 'p-old',
      title: 'Go live',
      status: 'agendado',
      startTime: '2026-05-10T14:00:00.000Z',
    })
    const phase = basePhase({ projectId: 'p-old' })
    const b = buildDashboardKpiBreakdown({
      facetScopedProjects: [proj],
      kpiScopedProjects: [],
      scopedTasks: [task],
      tasks: [task],
      scopedEvents: [ev],
      phases: [phase],
      isInKpiRange: (iso) => Boolean(iso?.startsWith('2026-05-10')),
      kpiHasTimeWindow: true,
    })
    expect(b.cutoversScheduled.map((e) => e.id)).toEqual(['e1'])
  })

  it('no resumo total, conta todas as concluídas (override) mesmo sem completedAt', () => {
    const task = baseTask({
      status: 'concluida',
      completedManualOverride: true,
      completedAt: null,
    })
    const b = buildDashboardKpiBreakdown({
      ...emptyBreakdownParams,
      scopedTasks: [task],
      tasks: [task],
      scopedEvents: [],
      isInKpiRange: () => true,
      kpiHasTimeWindow: false,
    })
    expect(b.tasksDone).toHaveLength(1)
  })
})

describe('buildDashboardKpiBreakdown — Projetos em andamento', () => {
  const emptyBreakdownParams = {
    facetScopedProjects: [] as DbProject[],
    kpiScopedProjects: [] as DbProject[],
    phases: [] as DbPhase[],
  }

  it('conta em andamento e inadimplente com fase incompleta; exclui congelado e finalizado', () => {
    const projAtivo = baseProject({ id: 'pa', status: 'ativo' })
    const projIna = baseProject({ id: 'pi', status: 'inadimplente' })
    const projCongelado = baseProject({ id: 'pp', status: 'congelado' })
    const projFin = baseProject({ id: 'pf', status: 'finalizado' })
    const phaseA = basePhase({ id: 'ph1', projectId: 'pa', orderIndex: 0 })
    const phaseI = basePhase({ id: 'phi', projectId: 'pi', orderIndex: 0 })
    const taskOpenA = baseTask({ id: 't-open', projectId: 'pa', phaseId: 'ph1', status: 'pendente' })
    const taskOpenI = baseTask({ id: 't-in', projectId: 'pi', phaseId: 'phi', status: 'pendente' })

    const b = buildDashboardKpiBreakdown({
      ...emptyBreakdownParams,
      facetScopedProjects: [projAtivo, projIna, projCongelado, projFin],
      kpiScopedProjects: [],
      scopedTasks: [taskOpenA, taskOpenI],
      tasks: [taskOpenA, taskOpenI],
      scopedEvents: [],
      phases: [phaseA, phaseI],
      isInKpiRange: () => true,
      kpiHasTimeWindow: false,
    })
    expect(b.projectsOngoing.map((p) => p.id).sort()).toEqual(['pa', 'pi'])
  })

  it('exclui ativo cuja coluna derivada é finalizados (plano todo concluído)', () => {
    const proj = baseProject({ id: 'p-all-done', status: 'ativo' })
    const phase = basePhase({ id: 'ph1', projectId: 'p-all-done', orderIndex: 0, status: 'concluida' })
    const taskDone = baseTask({
      id: 't1',
      projectId: 'p-all-done',
      phaseId: 'ph1',
      status: 'concluida',
    })

    const b = buildDashboardKpiBreakdown({
      ...emptyBreakdownParams,
      facetScopedProjects: [proj],
      kpiScopedProjects: [],
      scopedTasks: [taskDone],
      tasks: [taskDone],
      scopedEvents: [],
      phases: [phase],
      isInKpiRange: () => true,
      kpiHasTimeWindow: false,
    })
    expect(b.projectsOngoing).toHaveLength(0)
  })

  it('não esvazia “em andamento” quando nenhum projeto cai na janela de datas dos KPIs de período', () => {
    const proj = baseProject({
      id: 'p-old',
      status: 'ativo',
      startDate: '2020-01-01T00:00:00.000Z',
    })
    const phase = basePhase({ projectId: 'p-old', orderIndex: 0 })
    const taskOpen = baseTask({ id: 't1', projectId: 'p-old', phaseId: 'ph1', status: 'pendente' })

    const b = buildDashboardKpiBreakdown({
      ...emptyBreakdownParams,
      facetScopedProjects: [proj],
      kpiScopedProjects: [],
      scopedTasks: [taskOpen],
      tasks: [taskOpen],
      scopedEvents: [],
      phases: [phase],
      isInKpiRange: (iso) => Boolean(iso?.startsWith('2026-05')),
      kpiHasTimeWindow: true,
    })
    expect(b.projectsOngoing.map((p) => p.id)).toEqual(['p-old'])
    expect(b.projectsNew).toHaveLength(0)
  })
})

describe('isProjectOperationalOngoing', () => {
  it('retorna false para congelado mesmo com tarefas abertas', () => {
    const proj = baseProject({ status: 'congelado' })
    const phase = basePhase({ orderIndex: 0 })
    const task = baseTask({ status: 'pendente' })
    expect(isProjectOperationalOngoing(proj, [phase], [task])).toBe(false)
  })

  it('retorna true para inadimplente com tarefas abertas', () => {
    const proj = baseProject({ id: 'pi', status: 'inadimplente' })
    const phase = basePhase({ projectId: 'pi', orderIndex: 0 })
    const task = baseTask({ projectId: 'pi', phaseId: 'ph1', status: 'pendente' })
    expect(isProjectOperationalOngoing(proj, [phase], [task])).toBe(true)
  })
})
