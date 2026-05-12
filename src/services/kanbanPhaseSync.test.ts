import { describe, expect, it } from 'vitest'
import { deriveKanbanColumnFromPlanState } from './kanbanPhaseSync'
import type { DbPhase, DbProject, DbTask } from '../db/types'

function proj(over: Partial<DbProject> & Pick<DbProject, 'id' | 'status'>): DbProject {
  return {
    projectName: 'T',
    clientType: 'generico',
    planType: 'basic',
    hoursContracted: 10,
    hoursUsed: 0,
    startDate: null,
    dueDate: null,
    cancelledAt: null,
    ownerId: 'o',
    analystId: null,
    createdBy: 'o',
    createdAt: new Date().toISOString(),
    kanbanColumn: 'novos',
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
    planSnapshotCapturedAt: new Date().toISOString(),
    planSnapshot: { mode: 'catalog', modelId: 'm', key: 'k', name: 'n', hoursContracted: 10, phaseCount: 1, taskCount: 1 },
    lastManualCheckinAt: null,
    lastManualCheckinBy: null,
    manualAttentionNote: null,
    manualAttentionAt: null,
    manualAttentionBy: null,
    freezeTimeline: [],
    ...over,
  }
}

describe('deriveKanbanColumnFromPlanState', () => {
  it('cancelado e finalizado têm prioridade', () => {
    expect(deriveKanbanColumnFromPlanState(proj({ id: 'a', status: 'cancelado' }), [], [])).toBe('cancelados')
    expect(deriveKanbanColumnFromPlanState(proj({ id: 'b', status: 'finalizado' }), [], [])).toBe('finalizados')
  })

  it('congelado → coluna congelados', () => {
    expect(deriveKanbanColumnFromPlanState(proj({ id: 'c', status: 'congelado' }), [], [])).toBe('congelados')
  })

  it('inadimplente → coluna inadimplentes', () => {
    expect(deriveKanbanColumnFromPlanState(proj({ id: 'i', status: 'inadimplente' }), [], [])).toBe('inadimplentes')
  })

  it('ativo segue fase incompleta do plano', () => {
    const project = proj({ id: 'p', status: 'ativo' })
    const ph0: DbPhase = {
      id: 'ph0',
      projectId: 'p',
      name: 'F0',
      orderIndex: 0,
      status: 'ativa',
      colorHex: '#000000',
    }
    const ph1: DbPhase = {
      id: 'ph1',
      projectId: 'p',
      name: 'F1',
      orderIndex: 1,
      status: 'bloqueada',
      colorHex: '#000000',
    }
    const t: DbTask = {
      id: 't',
      projectId: 'p',
      phaseId: 'ph0',
      code: '0.1',
      title: 'x',
      description: '',
      status: 'pendente',
      priority: 'media',
      estimatedHours: 1,
      actualHours: 0,
      assignedTo: null,
      dueDate: null,
      isInformational: false,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
      cancelledManually: false,
    }
    expect(deriveKanbanColumnFromPlanState(project, [ph0, ph1], [t])).toBe('novos')
  })
})
