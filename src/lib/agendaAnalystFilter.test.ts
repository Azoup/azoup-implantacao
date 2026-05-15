import { describe, expect, it } from 'vitest'
import type { DbEvent } from '../db/types'
import {
  ANALYST_FILTER_ALL,
  applyAnalystFilter,
  deserializeAnalystFilter,
  isAnalystSelected,
  serializeAnalystFilter,
  toggleAnalystInFilter,
} from './agendaAnalystFilter'

function ev(analystId: string | null): DbEvent {
  return {
    id: 'e1',
    title: 'Test',
    description: '',
    startTime: '2026-05-15T12:00:00.000Z',
    endTime: '2026-05-15T13:00:00.000Z',
    status: 'agendado',
    projectId: null,
    taskId: null,
    analystId,
    meetingLink: null,
    recordingLink: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('applyAnalystFilter', () => {
  const events = [ev('a1'), ev('a2'), ev(null)]

  it('all returns every event', () => {
    expect(applyAnalystFilter(events, ANALYST_FILTER_ALL)).toHaveLength(3)
  })

  it('unassigned returns only without analyst', () => {
    expect(applyAnalystFilter(events, { mode: 'unassigned' })).toEqual([ev(null)])
  })

  it('selection filters by ids', () => {
    expect(applyAnalystFilter(events, { mode: 'selection', ids: new Set(['a1']) })).toEqual([ev('a1')])
  })

  it('empty selection returns none', () => {
    expect(applyAnalystFilter(events, { mode: 'selection', ids: new Set() })).toHaveLength(0)
  })
})

describe('toggleAnalystInFilter', () => {
  it('from all selects one analyst', () => {
    const next = toggleAnalystInFilter(ANALYST_FILTER_ALL, 'a1')
    expect(next.mode).toBe('selection')
    if (next.mode === 'selection') expect([...next.ids]).toEqual(['a1'])
  })

  it('deselecting last analyst returns all', () => {
    const f = { mode: 'selection' as const, ids: new Set(['a1']) }
    const next = toggleAnalystInFilter(f, 'a1')
    expect(next).toEqual(ANALYST_FILTER_ALL)
  })
})

describe('serde', () => {
  it('round-trips selection', () => {
    const f = { mode: 'selection' as const, ids: new Set(['x', 'y']) }
    const raw = serializeAnalystFilter(f)
    const back = deserializeAnalystFilter(raw)
    expect(back.mode).toBe('selection')
    if (back.mode === 'selection') expect([...back.ids].sort()).toEqual(['x', 'y'])
  })

  it('migrates legacy single id string', () => {
    const back = deserializeAnalystFilter('legacy-id')
    expect(back.mode).toBe('selection')
    if (back.mode === 'selection') expect([...back.ids]).toEqual(['legacy-id'])
  })
})

describe('isAnalystSelected', () => {
  it('all mode selects everyone', () => {
    expect(isAnalystSelected(ANALYST_FILTER_ALL, 'any')).toBe(true)
  })
})
