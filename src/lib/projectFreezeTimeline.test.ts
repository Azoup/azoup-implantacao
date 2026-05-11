import { describe, expect, it } from 'vitest'
import { parseFreezeTimeline } from './projectFreezeTimeline'

describe('parseFreezeTimeline', () => {
  it('returns empty for null/undefined', () => {
    expect(parseFreezeTimeline(null)).toEqual([])
    expect(parseFreezeTimeline(undefined)).toEqual([])
  })

  it('parses valid json array string', () => {
    const raw = JSON.stringify([
      { kind: 'freeze', at: '2026-05-01T10:00:00.000Z', by: 'u1', reason: 'Cliente pediu pausa.' },
    ])
    expect(parseFreezeTimeline(raw)).toHaveLength(1)
    expect(parseFreezeTimeline(raw)[0].kind).toBe('freeze')
  })

  it('filters invalid entries', () => {
    expect(
      parseFreezeTimeline([
        { kind: 'freeze', at: '2026-05-01T10:00:00.000Z', by: 'u1', reason: 'ok' },
        { kind: 'oops', at: 'x', by: 'y', reason: 'z' },
        null,
      ]),
    ).toHaveLength(1)
  })
})
