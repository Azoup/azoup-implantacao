import { describe, expect, it } from 'vitest'
import type { DbEvent, DbTask } from '../db/types'
import {
  DAILY_SLOTS,
  addDaysYmd,
  generatePhaseSchedule,
  hasSlotConflict,
  isPhaseEligibleForScheduleLaunch,
  isWeekdayYmd,
  nextBusinessDayYmd,
  countBusinessDaysInclusive,
  exceedsPhaseScheduleBusinessDayLimit,
  PHASE_SCHEDULE_MAX_BUSINESS_DAYS,
  rankCandidateDays,
  slotToIso,
} from './scheduleGenerator'

function task(partial: Partial<DbTask> & Pick<DbTask, 'id' | 'code' | 'title'>): DbTask {
  return {
    description: '',
    projectId: 'p1',
    phaseId: 'ph1',
    status: 'pendente',
    priority: 'media',
    estimatedHours: 1,
    actualHours: 0,
    assignedTo: null,
    dueDate: null,
    isInformational: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    sortOrder: 0,
    ...partial,
  }
}

function event(partial: Partial<DbEvent> & Pick<DbEvent, 'startTime' | 'endTime' | 'analystId'>): DbEvent {
  return {
    id: 'e1',
    title: 'X',
    description: '',
    status: 'agendado',
    projectId: 'p1',
    taskId: null,
    meetingLink: null,
    recordingLink: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('nextBusinessDayYmd', () => {
  it('avança sábado para segunda', () => {
    expect(nextBusinessDayYmd('2026-05-16')).toBe('2026-05-18')
  })

  it('mantém segunda útil', () => {
    expect(nextBusinessDayYmd('2026-05-18')).toBe('2026-05-18')
  })
})

describe('isPhaseEligibleForScheduleLaunch', () => {
  it('basic exige fase 01+', () => {
    expect(isPhaseEligibleForScheduleLaunch(0, 'ativa', 'basic')).toBe(false)
    expect(isPhaseEligibleForScheduleLaunch(1, 'ativa', 'basic')).toBe(true)
  })

  it('avulso permite fase 00', () => {
    expect(isPhaseEligibleForScheduleLaunch(0, 'ativa', 'custom')).toBe(true)
  })

  it('fase concluída não elegível', () => {
    expect(isPhaseEligibleForScheduleLaunch(1, 'concluida', 'pro')).toBe(false)
  })
})

describe('generatePhaseSchedule', () => {
  const baseParams = {
    startDate: '2026-05-18',
    analystId: 'a1',
    projectId: 'p1',
    sessionsPerWeek: 2 as const,
  }

  it('pula tarefas informacionais e já agendadas', () => {
    const tasks = [
      task({ id: 't1', code: '1.1', title: 'A' }),
      task({ id: 't2', code: '1.2', title: 'B', isInformational: true }),
      task({ id: 't3', code: '1.3', title: 'C' }),
    ]
    const existing: DbEvent[] = [
      event({
        id: 'ev1',
        taskId: 't3',
        analystId: 'a1',
        startTime: '2026-05-20T12:00:00.000Z',
        endTime: '2026-05-20T13:30:00.000Z',
      }),
    ]
    const r = generatePhaseSchedule(tasks, existing, baseParams)
    expect(r.skippedInformational).toEqual(['t2'])
    expect(r.skippedAlreadyScheduled).toEqual(['t3'])
    expect(r.proposals.map((p) => p.taskId)).toEqual(['t1'])
  })

  it('2 sessões/semana: prioriza espaçar 1 dia (seg + qua, não seg + qui)', () => {
    const tasks = [
      task({ id: 't1', code: '1.1', title: 'A' }),
      task({ id: 't2', code: '1.2', title: 'B' }),
    ]
    const r = generatePhaseSchedule(tasks, [], baseParams)
    expect(r.proposals.map((p) => p.dateYmd)).toEqual(['2026-05-18', '2026-05-20'])
  })

  it('3 sessões/semana com agenda livre: seg, qua e sex', () => {
    const tasks = [
      task({ id: 't1', code: '1.1', title: 'A' }),
      task({ id: 't2', code: '1.2', title: 'B' }),
      task({ id: 't3', code: '1.3', title: 'C' }),
    ]
    const r = generatePhaseSchedule(tasks, [], { ...baseParams, sessionsPerWeek: 3 })
    expect(r.proposals.map((p) => p.dateYmd)).toEqual(['2026-05-18', '2026-05-20', '2026-05-22'])
  })

  it('permite dias consecutivos quando dias espaçados estão lotados', () => {
    const blockDay = (ymd: string): DbEvent[] =>
      DAILY_SLOTS.map((slot, i) => {
        const { startTime, endTime } = slotToIso(ymd, slot)
        return event({ id: `b-${ymd}-${i}`, analystId: 'a1', startTime, endTime })
      })

    const existing: DbEvent[] = [
      ...blockDay('2026-05-20'),
      ...blockDay('2026-05-21'),
      ...blockDay('2026-05-22'),
    ]
    const r = generatePhaseSchedule(
      [task({ id: 't1', code: '1.1', title: 'A' }), task({ id: 't2', code: '1.2', title: 'B' })],
      existing,
      baseParams,
    )
    expect(r.proposals.map((p) => p.dateYmd)).toEqual(['2026-05-18', '2026-05-19'])
  })

  it('usa terça quando segunda está lotada', () => {
    const existing: DbEvent[] = DAILY_SLOTS.map((slot, i) => {
      const { startTime, endTime } = slotToIso('2026-05-18', slot)
      return event({ id: `mon-${i}`, analystId: 'a1', startTime, endTime })
    })
    const r = generatePhaseSchedule([task({ id: 't1', code: '1.1', title: 'A' })], existing, baseParams)
    expect(r.proposals[0]?.dateYmd).toBe('2026-05-19')
  })

  it('pula slot em conflito para o analista', () => {
    const { startTime, endTime } = slotToIso('2026-05-18', DAILY_SLOTS[0]!)
    const existing: DbEvent[] = [
      event({ id: 'ev1', analystId: 'a1', startTime, endTime }),
    ]
    const r = generatePhaseSchedule([task({ id: 't1', code: '1.1', title: 'A' })], existing, baseParams)
    expect(r.proposals[0]?.slotKey).toBe('10:45')
  })

  it('retorna vazio quando não há tarefas elegíveis', () => {
    const r = generatePhaseSchedule(
      [task({ id: 't1', code: '1.1', title: 'A', isInformational: true })],
      [],
      baseParams,
    )
    expect(r.proposals).toHaveLength(0)
    expect(r.lastProposedDate).toBeNull()
  })
})

describe('hasSlotConflict', () => {
  it('detecta sobreposição no mesmo analista', () => {
    const { startTime, endTime } = slotToIso('2026-05-18', DAILY_SLOTS[0]!)
    expect(
      hasSlotConflict(startTime, endTime, 'a1', [
        event({ id: 'e', analystId: 'a1', startTime, endTime }),
      ]),
    ).toBe(true)
    expect(
      hasSlotConflict(startTime, endTime, 'a1', [
        event({ id: 'e', analystId: 'a2', startTime, endTime }),
      ]),
    ).toBe(false)
  })
})

describe('isWeekdayYmd', () => {
  it('identifica dias úteis', () => {
    expect(isWeekdayYmd('2026-05-18')).toBe(true)
    expect(isWeekdayYmd('2026-05-17')).toBe(false)
  })
})

describe('addDaysYmd', () => {
  it('soma dias em yyyy-MM-dd', () => {
    expect(addDaysYmd('2026-05-18', 3)).toBe('2026-05-21')
  })
})

describe('countBusinessDaysInclusive', () => {
  it('conta seg a sex inclusive', () => {
    expect(countBusinessDaysInclusive('2026-05-18', '2026-05-22')).toBe(5)
  })

  it('detecta estouro de 20 dias úteis', () => {
    const start = '2026-05-18'
    let cur = start
    while (countBusinessDaysInclusive(start, cur) <= PHASE_SCHEDULE_MAX_BUSINESS_DAYS) {
      cur = addDaysYmd(cur, 1)
    }
    const lastOk = addDaysYmd(cur, -1)
    expect(exceedsPhaseScheduleBusinessDayLimit(start, lastOk)).toBe(false)
    expect(exceedsPhaseScheduleBusinessDayLimit(start, cur)).toBe(true)
  })
})

describe('rankCandidateDays', () => {
  it('prefere dia com 1 dia útil de folga', () => {
    const ranked = rankCandidateDays(['2026-05-19', '2026-05-20', '2026-05-21'], ['2026-05-18'])
    expect(ranked[0]).toBe('2026-05-20')
  })
})
