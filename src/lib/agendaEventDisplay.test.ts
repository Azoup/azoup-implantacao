import { describe, expect, it } from 'vitest'
import type { DbEvent } from '../db/types'
import {
  buildAllDayStripPlacements,
  isAllDayOrMultiDayBlock,
  isMonthStripEvent,
} from './agendaEventDisplay'
import { buildMonthWeekBundles } from './calendarMonthGrid'

function ev(partial: Partial<DbEvent> & Pick<DbEvent, 'id' | 'startTime' | 'endTime'>): DbEvent {
  return {
    title: 'Test',
    description: '',
    status: 'agendado',
    projectId: null,
    taskId: null,
    analystId: null,
    meetingLink: null,
    recordingLink: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('isAllDayOrMultiDayBlock', () => {
  it('detects multi-day vacation block', () => {
    const e = ev({
      id: '1',
      startTime: '2026-05-05T03:00:00.000Z',
      endTime: '2026-05-10T03:00:00.000Z',
      googleEventId: 'g1',
    })
    expect(isAllDayOrMultiDayBlock(e)).toBe(true)
  })

  it('detects legacy google 1h noon import', () => {
    const e = ev({
      id: '2',
      startTime: '2026-05-05T15:00:00.000Z',
      endTime: '2026-05-05T16:00:00.000Z',
      googleEventId: 'g2',
    })
    expect(isAllDayOrMultiDayBlock(e)).toBe(true)
  })

  it('does not treat short timed meeting as all-day', () => {
    const e = ev({
      id: '3',
      startTime: '2026-05-05T14:00:00.000Z',
      endTime: '2026-05-05T15:30:00.000Z',
    })
    expect(isAllDayOrMultiDayBlock(e)).toBe(false)
  })
})

describe('isMonthStripEvent', () => {
  it('includes multi-day blocks for month strips', () => {
    const e = ev({
      id: 'vac',
      startTime: '2026-05-25T03:00:00.000Z',
      endTime: '2026-06-07T03:00:00.000Z',
      googleEventId: 'g',
      title: 'FERIAS',
    })
    expect(isMonthStripEvent(e)).toBe(true)
  })
})

describe('buildMonthWeekBundles', () => {
  it('places strip across week row and excludes from day chips', () => {
    const anchor = new Date('2026-05-15T12:00:00')
    const vacation = ev({
      id: 'vac',
      startTime: '2026-05-25T03:00:00.000Z',
      endTime: '2026-06-07T03:00:00.000Z',
      googleEventId: 'g',
      title: 'FERIAS',
    })
    const meeting = ev({
      id: 'm1',
      startTime: '2026-05-26T14:00:00.000Z',
      endTime: '2026-05-26T15:00:00.000Z',
      title: 'Reunião',
    })
    const bundles = buildMonthWeekBundles(anchor, [vacation, meeting], '2026-05-15')
    const weekWithVacation = bundles.find((b) =>
      b.stripPlacements.some((p) => p.eventId === 'vac'),
    )
    expect(weekWithVacation).toBeDefined()
    const pl = weekWithVacation!.stripPlacements.find((p) => p.eventId === 'vac')!
    expect(pl.startCol).toBeGreaterThanOrEqual(0)
    expect(pl.endCol).toBe(6)
    const tue = weekWithVacation!.cells.find((c) => c.dayKey === '2026-05-26')
    expect(tue?.events.some((e) => e.id === 'vac')).toBe(false)
    expect(tue?.events.some((e) => e.id === 'm1')).toBe(true)
  })
})

describe('buildAllDayStripPlacements', () => {
  it('spans columns Mon–Wed in week view', () => {
    const week = ['2026-05-05', '2026-05-06', '2026-05-07', '2026-05-08', '2026-05-09']
    const e = ev({
      id: 'vac',
      startTime: '2026-05-05T03:00:00.000Z',
      endTime: '2026-05-08T03:00:00.000Z',
      googleEventId: 'g',
      title: 'FERIAS',
    })
    const pl = buildAllDayStripPlacements([e], week)
    expect(pl).toHaveLength(1)
    expect(pl[0]!.startCol).toBe(0)
    expect(pl[0]!.endCol).toBe(2)
  })
})
