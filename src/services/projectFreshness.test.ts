import { describe, expect, it } from 'vitest'
import { deriveProjectFreshnessBySla, resolveProjectFreshnessSourceAt } from './projectFreshness'

describe('projectFreshness', () => {
  it('uses manual check-in date as freshness source', () => {
    const sourceAt = resolveProjectFreshnessSourceAt({
      lastManualCheckinAt: '2026-05-04T00:00:00.000Z',
    })
    expect(sourceAt).toBe('2026-05-04T00:00:00.000Z')
  })

  it('returns neutral when no manual check-in exists', () => {
    const now = new Date('2026-05-08T00:00:00.000Z')
    const snapshot = deriveProjectFreshnessBySla(
      {
        lastManualCheckinAt: null,
      },
      { now },
    )
    expect(snapshot.elapsedDays).toBeNull()
    expect(snapshot.consumedPct).toBeNull()
    expect(snapshot.status).toBe('neutro')
  })

  it('classifies freshness using default thresholds 80/100/200', () => {
    const base = {
      lastManualCheckinAt: '2026-05-01T00:00:00.000Z',
    }

    expect(deriveProjectFreshnessBySla(base, { now: new Date('2026-05-06T00:00:00.000Z') }).status).toBe('em_dia')
    expect(deriveProjectFreshnessBySla(base, { now: new Date('2026-05-07T00:00:00.000Z') }).status).toBe('atencao')
    expect(deriveProjectFreshnessBySla(base, { now: new Date('2026-05-10T00:00:00.000Z') }).status).toBe('atrasado')
    expect(deriveProjectFreshnessBySla(base, { now: new Date('2026-05-20T00:00:00.000Z') }).status).toBe('critico')
  })
})
