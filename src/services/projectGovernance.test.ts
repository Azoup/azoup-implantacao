import { describe, expect, it } from 'vitest'
import { normalizeProjectPlacement } from './projectGovernance'

describe('normalizeProjectPlacement', () => {
  it('prioriza ativo sobre coluna cancelados (reabrir após edição)', () => {
    expect(normalizeProjectPlacement({ status: 'ativo', kanbanColumn: 'cancelados' })).toEqual({
      status: 'ativo',
      kanbanColumn: 'novos',
    })
  })

  it('prioriza congelado sobre coluna cancelados', () => {
    expect(normalizeProjectPlacement({ status: 'congelado', kanbanColumn: 'cancelados' })).toEqual({
      status: 'congelado',
      kanbanColumn: 'novos',
    })
  })

  it('mantém ativo e coluna de fase quando não terminal', () => {
    expect(normalizeProjectPlacement({ status: 'ativo', kanbanColumn: 'fase_01' })).toEqual({
      status: 'ativo',
      kanbanColumn: 'fase_01',
    })
  })

  it('inadimplente com coluna cancelados realinha para novos', () => {
    expect(normalizeProjectPlacement({ status: 'inadimplente', kanbanColumn: 'cancelados' })).toEqual({
      status: 'inadimplente',
      kanbanColumn: 'novos',
    })
  })

  it('alinha cancelado explícito à coluna cancelados', () => {
    expect(normalizeProjectPlacement({ status: 'cancelado', kanbanColumn: 'novos' })).toEqual({
      status: 'cancelado',
      kanbanColumn: 'cancelados',
    })
  })

  it('alinha finalizado explícito à coluna finalizados', () => {
    expect(normalizeProjectPlacement({ status: 'finalizado', kanbanColumn: 'novos' })).toEqual({
      status: 'finalizado',
      kanbanColumn: 'finalizados',
    })
  })

  it('ativo com coluna finalizados inconsistente realinha kanban para novos', () => {
    expect(normalizeProjectPlacement({ status: 'ativo', kanbanColumn: 'finalizados' })).toEqual({
      status: 'ativo',
      kanbanColumn: 'novos',
    })
  })
})
