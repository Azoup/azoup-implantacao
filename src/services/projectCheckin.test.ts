import { describe, expect, it } from 'vitest'
import { isProjectCheckinStale } from './projectCheckin'

describe('projectCheckin', () => {
  it('considera pendente quando nunca houve check-in', () => {
    expect(
      isProjectCheckinStale(
        { lastManualCheckinAt: null, startDate: '2026-01-01T00:00:00.000Z', createdAt: '2026-01-01T00:00:00.000Z' },
        7,
        new Date('2026-01-20T00:00:00.000Z'),
      ),
    ).toBe(true)
  })

  it('considera pendente somente se estiver sem check-in por mais de staleDays', () => {
    const now = new Date('2026-05-10T00:00:00.000Z')
    expect(
      isProjectCheckinStale(
        { lastManualCheckinAt: '2026-05-03T00:00:00.000Z', startDate: null, createdAt: '2026-05-03T00:00:00.000Z' },
        7,
        now,
      ),
    ).toBe(false) // exatamente 7 dias (difMs == staleDays * DAY_MS)

    expect(
      isProjectCheckinStale(
        { lastManualCheckinAt: '2026-05-02T00:00:00.000Z', startDate: null, createdAt: '2026-05-02T00:00:00.000Z' },
        7,
        now,
      ),
    ).toBe(true)
  })
})

