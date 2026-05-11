import { describe, expect, it } from 'vitest'
import { statusLabelPt } from './projectPhaseUi'

describe('statusLabelPt', () => {
  it('labels congelado', () => {
    expect(statusLabelPt('congelado')).toBe('Congelado')
  })
  it('usa Em andamento para ativo', () => {
    expect(statusLabelPt('ativo')).toBe('Em andamento')
  })
  it('labels inadimplente', () => {
    expect(statusLabelPt('inadimplente')).toBe('Inadimplente')
  })
})
