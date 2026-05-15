import { describe, expect, it } from 'vitest'
import {
  isDashboardOperationalStatus,
  isProjectEligibleForScheduling,
  normalizeRemoteProjectStatus,
} from './projectStatus'

describe('normalizeRemoteProjectStatus', () => {
  it('mapeia pausado e inativo', () => {
    expect(normalizeRemoteProjectStatus('pausado')).toBe('congelado')
    expect(normalizeRemoteProjectStatus('inativo')).toBe('cancelado')
  })
  it('aceita inadimplente', () => {
    expect(normalizeRemoteProjectStatus('inadimplente')).toBe('inadimplente')
  })
})

describe('isDashboardOperationalStatus', () => {
  it('inclui ativo e inadimplente', () => {
    expect(isDashboardOperationalStatus('ativo')).toBe(true)
    expect(isDashboardOperationalStatus('inadimplente')).toBe(true)
    expect(isDashboardOperationalStatus('cancelado')).toBe(false)
  })
})

describe('isProjectEligibleForScheduling', () => {
  it('permite ativo e inadimplente', () => {
    expect(isProjectEligibleForScheduling('ativo')).toBe(true)
    expect(isProjectEligibleForScheduling('inadimplente')).toBe(true)
  })
  it('bloqueia finalizado, cancelado e congelado', () => {
    expect(isProjectEligibleForScheduling('finalizado')).toBe(false)
    expect(isProjectEligibleForScheduling('cancelado')).toBe(false)
    expect(isProjectEligibleForScheduling('congelado')).toBe(false)
  })
})
