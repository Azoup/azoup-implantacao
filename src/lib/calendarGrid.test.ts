import { describe, expect, it } from 'vitest'
import {
  GRID_END_HOUR,
  GRID_START_HOUR,
  layoutInGrid,
  minutesFromMidnightInTz,
  parseEventInstant,
} from './calendarGrid'

describe('calendarGrid', () => {
  it('minutesFromMidnightInTz uses America/Sao_Paulo for Z-suffixed ISO', () => {
    expect(minutesFromMidnightInTz('2026-05-15T17:00:00.000Z')).toBe(14 * 60)
    expect(minutesFromMidnightInTz('2026-05-15T21:00:00.000Z')).toBe(18 * 60)
  })

  it('parseEventInstant treats naive ISO as wall clock in CAL_TZ', () => {
    const d = parseEventInstant('2026-05-15T14:00:00')
    expect(d.toISOString()).toBe('2026-05-15T17:00:00.000Z')
    expect(minutesFromMidnightInTz('2026-05-15T14:00:00')).toBe(14 * 60)
  })

  it('layoutInGrid places 14:00–18:00 at correct top within 7h–22h grid', () => {
    const start = '2026-05-15T17:00:00.000Z'
    const end = '2026-05-15T21:00:00.000Z'
    const { topPct, heightPct } = layoutInGrid(start, end)
    const gridSpanMin = (GRID_END_HOUR - GRID_START_HOUR) * 60
    const expectedTop = ((14 * 60 - GRID_START_HOUR * 60) / gridSpanMin) * 100
    const expectedHeight = ((4 * 60) / gridSpanMin) * 100
    expect(topPct).toBeCloseTo(expectedTop, 1)
    expect(heightPct).toBeCloseTo(expectedHeight, 1)
  })
})
