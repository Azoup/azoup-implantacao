import { describe, expect, it } from 'vitest'
import type { DbProject } from '../db/types'
import { describeProjectPersistPatchDiff } from './projectEditAuditDiff'

const baseProject = (): DbProject => ({
  id: 'p1',
  projectName: 'INNOVARE',
  clientType: 'generico',
  planType: 'master',
  hoursContracted: 70,
  hoursUsed: 0,
  startDate: '2026-03-26T12:00:00.000Z',
  dueDate: '2026-07-03T12:00:00.000Z',
  cancelledAt: null,
  status: 'ativo',
  ownerId: 'u1',
  analystId: 'a1',
  createdBy: 'u1',
  createdAt: '2026-01-01T12:00:00.000Z',
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
  planSnapshotCapturedAt: '2026-01-01T12:00:00.000Z',
  planSnapshot: {
    mode: 'catalog',
    modelId: 'm1',
    key: 'master',
    name: 'Master',
    hoursContracted: 70,
    phaseCount: 5,
    taskCount: 26,
  },
  lastManualCheckinAt: null,
  lastManualCheckinBy: null,
  manualAttentionNote: null,
  manualAttentionAt: null,
  manualAttentionBy: null,
  freezeTimeline: [],
})

describe('describeProjectPersistPatchDiff', () => {
  it('returns null when patch matches before', () => {
    const b = baseProject()
    const patch = {
      projectName: b.projectName,
      clientType: b.clientType,
      analystId: b.analystId,
      startDate: b.startDate,
      dueDate: b.dueDate,
      status: b.status,
      kanbanColumn: b.kanbanColumn,
    }
    expect(describeProjectPersistPatchDiff(b, patch)).toBeNull()
  })

  it('detects start date change (different calendar day)', () => {
    const b = baseProject()
    const patch = {
      projectName: b.projectName,
      startDate: '2026-03-27T12:00:00.000Z',
    }
    const d = describeProjectPersistPatchDiff(b, patch)
    expect(d).toContain('Data de início')
    expect(d).toContain('26/03/2026')
    expect(d).toContain('27/03/2026')
  })

  it('ignores same calendar day with different time', () => {
    const b = baseProject()
    const patch = {
      startDate: '2026-03-26T15:00:00.000Z',
    }
    expect(describeProjectPersistPatchDiff(b, patch)).toBeNull()
  })

  it('detects manual alert note change', () => {
    const b = baseProject()
    const patch = { manualAttentionNote: 'Cliente sem retorno ha duas semanas.' }
    const d = describeProjectPersistPatchDiff(b, patch)
    expect(d).toContain('Alerta operacional')
    expect(d).toContain('Cliente sem retorno')
  })

  it('resolves analyst names when map provided', () => {
    const b = baseProject()
    const patch = { analystId: 'a2' }
    const d = describeProjectPersistPatchDiff(b, patch, {
      analystNameById: new Map([
        ['a1', 'Anderson'],
        ['a2', 'Maria'],
      ]),
    })
    expect(d).toContain('Anderson')
    expect(d).toContain('Maria')
  })
})
