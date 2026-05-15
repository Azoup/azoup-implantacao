import { describe, expect, it } from 'vitest'
import type { DbEvent, DbProject, DbTask } from '../db/types'
import { resolveAiProjectAssistant } from './aiProjectStatus'

function mkProject(partial: Partial<DbProject>): DbProject {
  return {
    id: partial.id ?? crypto.randomUUID(),
    projectName: partial.projectName ?? 'Projeto Teste',
    clientType: partial.clientType ?? 'generico',
    engagementKind: partial.engagementKind ?? 'operacao_padrao',
    planType: 'basic',
    hoursContracted: partial.hoursContracted ?? 100,
    hoursUsed: partial.hoursUsed ?? 20,
    startDate: null,
    dueDate: null,
    cancelledAt: null,
    status: 'ativo',
    ownerId: 'owner-1',
    analystId: null,
    createdBy: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    kanbanColumn: 'fase_01',
    cnpj: null,
    razaoSocial: partial.razaoSocial ?? null,
    tradeName: partial.tradeName ?? null,
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
    planSnapshotCapturedAt: '2026-01-01T00:00:00.000Z',
    planSnapshot: { key: 'basic', modelId: 'basic', name: 'Basic', hoursContracted: 100, phaseCount: 1, taskCount: 1 },
    lastManualCheckinAt: partial.lastManualCheckinAt ?? null,
    lastManualCheckinBy: null,
    manualAttentionNote: partial.manualAttentionNote ?? null,
    manualAttentionAt: partial.manualAttentionAt ?? null,
    manualAttentionBy: partial.manualAttentionBy ?? null,
    freezeTimeline: partial.freezeTimeline ?? [],
  }
}

function mkTask(partial: Partial<DbTask>): DbTask {
  return {
    id: partial.id ?? crypto.randomUUID(),
    title: partial.title ?? 'Tarefa',
    description: '',
    projectId: partial.projectId ?? 'p1',
    phaseId: 'ph-1',
    status: partial.status ?? 'pendente',
    priority: 'media',
    estimatedHours: 2,
    actualHours: 0,
    assignedTo: null,
    dueDate: partial.dueDate ?? null,
    isInformational: false,
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
    code: 'T-1',
    sortOrder: 1,
    completedAt: partial.completedAt ?? null,
    cancelledAt: null,
    cancellationReason: null,
    rescheduledFromTaskId: null,
    rescheduledToTaskId: null,
  }
}

function mkEvent(partial: Partial<DbEvent>): DbEvent {
  return {
    id: partial.id ?? crypto.randomUUID(),
    title: 'Evento',
    description: '',
    startTime: partial.startTime ?? '2026-05-08T10:00:00.000Z',
    endTime: partial.endTime ?? '2026-05-08T11:00:00.000Z',
    status: partial.status ?? 'agendado',
    projectId: partial.projectId ?? 'p1',
    taskId: partial.taskId ?? 't1',
    analystId: null,
    meetingLink: null,
    recordingLink: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('resolveAiProjectAssistant', () => {
  it('retorna resultado ok com snapshot executivo', async () => {
    const project = mkProject({ id: 'p1', projectName: 'INNOVARE' })
    const tasks = [
      mkTask({ id: 't1', projectId: 'p1', title: 'Kickoff', status: 'pendente' }),
      mkTask({ id: 't2', projectId: 'p1', title: 'Configuração concluída', status: 'concluida', completedAt: '2026-05-01T10:00:00.000Z' }),
    ]
    const events = [mkEvent({ projectId: 'p1', taskId: 't1' })]
    const result = await resolveAiProjectAssistant({
      question: 'como q ta o projeto da innovare?',
      projects: [project],
      tasks,
      events,
    })
    expect(result.kind).toBe('ok')
    if (result.kind !== 'ok') return
    expect(result.snapshot.projectName).toBe('INNOVARE')
    expect(result.snapshot.progressoPct).toBe(50)
    expect(result.snapshot.proximaTarefa?.titulo).toBe('Kickoff')
    expect(result.summary.length).toBeGreaterThan(10)
  })

  it('retorna ambiguo quando candidatos possuem score semelhante', async () => {
    const projects = [mkProject({ id: 'p1', projectName: 'INNOVA' }), mkProject({ id: 'p2', projectName: 'INNOVA' })]
    const result = await resolveAiProjectAssistant({
      question: 'status do projeto innova',
      projects,
      tasks: [],
      events: [],
    })
    expect(result.kind).toBe('ambiguous')
  })
})
