import { describe, expect, it } from 'vitest'
import { normalizeProjectPlacement } from './projectGovernance'

describe('normalizeProjectPlacement', () => {
  it('prioriza ativo sobre coluna cancelados (reabrir após edição)', () => {
    expect(normalizeProjectPlacement({ status: 'ativo', kanbanColumn: 'cancelados' })).toEqual({
      status: 'ativo',
      kanbanColumn: 'novos',
    })
  })

  it('congelado alinha sempre à coluna Congelados', () => {
    expect(normalizeProjectPlacement({ status: 'congelado', kanbanColumn: 'cancelados' })).toEqual({
      status: 'congelado',
      kanbanColumn: 'congelados',
    })
    expect(normalizeProjectPlacement({ status: 'congelado', kanbanColumn: 'fase_02' })).toEqual({
      status: 'congelado',
      kanbanColumn: 'congelados',
    })
  })

  it('mantém ativo e coluna de fase quando não terminal', () => {
    expect(normalizeProjectPlacement({ status: 'ativo', kanbanColumn: 'fase_01' })).toEqual({
      status: 'ativo',
      kanbanColumn: 'fase_01',
    })
  })

  it('inadimplente alinha sempre à coluna Inadimplentes', () => {
    expect(normalizeProjectPlacement({ status: 'inadimplente', kanbanColumn: 'cancelados' })).toEqual({
      status: 'inadimplente',
      kanbanColumn: 'inadimplentes',
    })
    expect(normalizeProjectPlacement({ status: 'inadimplente', kanbanColumn: 'fase_03' })).toEqual({
      status: 'inadimplente',
      kanbanColumn: 'inadimplentes',
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

  it('ativo com colunas congelados/inadimplentes inconsistentes realinha para novos', () => {
    expect(normalizeProjectPlacement({ status: 'ativo', kanbanColumn: 'congelados' })).toEqual({
      status: 'ativo',
      kanbanColumn: 'novos',
    })
    expect(normalizeProjectPlacement({ status: 'ativo', kanbanColumn: 'inadimplentes' })).toEqual({
      status: 'ativo',
      kanbanColumn: 'novos',
    })
  })
})
