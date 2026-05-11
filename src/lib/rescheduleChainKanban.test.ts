import { describe, expect, it } from 'vitest'
import type { DbTask } from '../db/types'
import {
  aggregateActualHoursByLeaf,
  buildRescheduleKanbanProjectModel,
  computeRescheduleKanbanHiddenTaskIds,
  rescheduleKanbanLeafTaskId,
} from './rescheduleChainKanban'

function task(partial: Partial<DbTask> & Pick<DbTask, 'id' | 'projectId' | 'phaseId'>): DbTask {
  return {
    title: 't',
    description: '',
    code: '1.1',
    status: 'pendente',
    priority: 'media',
    estimatedHours: 0,
    actualHours: 0,
    assignedTo: null,
    dueDate: null,
    isInformational: false,
    createdAt: '2026-01-01T00:00:00',
    sortOrder: 0,
    ...partial,
  }
}

describe('rescheduleKanbanLeafTaskId', () => {
  it('follows rescheduledToTaskId to the leaf', () => {
    const tasks = [
      task({ id: 'a', projectId: 'p', phaseId: 'f', rescheduledToTaskId: 'b', actualHours: 1 }),
      task({ id: 'b', projectId: 'p', phaseId: 'f', rescheduledFromTaskId: 'a', rescheduledToTaskId: 'c', actualHours: 2 }),
      task({ id: 'c', projectId: 'p', phaseId: 'f', rescheduledFromTaskId: 'b', actualHours: 3 }),
    ]
    const map = new Map(tasks.map((t) => [t.id, t]))
    expect(rescheduleKanbanLeafTaskId('a', map)).toBe('c')
    expect(rescheduleKanbanLeafTaskId('b', map)).toBe('c')
    expect(rescheduleKanbanLeafTaskId('c', map)).toBe('c')
  })

  it('returns start id on cycle so rows stay visible', () => {
    const tasks = [
      task({ id: 'a', projectId: 'p', phaseId: 'f', rescheduledToTaskId: 'b' }),
      task({ id: 'b', projectId: 'p', phaseId: 'f', rescheduledToTaskId: 'a' }),
    ]
    const map = new Map(tasks.map((t) => [t.id, t]))
    expect(rescheduleKanbanLeafTaskId('a', map)).toBe('a')
    expect(rescheduleKanbanLeafTaskId('b', map)).toBe('b')
  })
})

describe('computeRescheduleKanbanHiddenTaskIds', () => {
  it('hides non-leaf chain members only', () => {
    const tasks = [
      task({ id: 'a', projectId: 'p', phaseId: 'f', rescheduledToTaskId: 'b' }),
      task({ id: 'b', projectId: 'p', phaseId: 'f', rescheduledFromTaskId: 'a' }),
    ]
    const hidden = computeRescheduleKanbanHiddenTaskIds(tasks)
    expect(hidden.has('a')).toBe(true)
    expect(hidden.has('b')).toBe(false)
  })
})

describe('aggregateActualHoursByLeaf', () => {
  it('sums actual hours across chain onto leaf', () => {
    const tasks = [
      task({ id: 'a', projectId: 'p', phaseId: 'f', rescheduledToTaskId: 'b', actualHours: 2 }),
      task({ id: 'b', projectId: 'p', phaseId: 'f', rescheduledFromTaskId: 'a', actualHours: 1 }),
    ]
    const map = new Map(tasks.map((t) => [t.id, t]))
    const agg = aggregateActualHoursByLeaf(tasks, map)
    expect(agg.get('b')).toBe(3)
  })
})

describe('buildRescheduleKanbanProjectModel', () => {
  it('scopes merged events by chain members', () => {
    const tasks = [
      task({ id: 'a', projectId: 'p', phaseId: 'f', rescheduledToTaskId: 'b' }),
      task({ id: 'b', projectId: 'p', phaseId: 'f', rescheduledFromTaskId: 'a' }),
    ]
    const events = [
      {
        id: 'e1',
        title: '',
        description: '',
        startTime: '2026-01-02T10:00:00',
        endTime: '2026-01-02T11:00:00',
        status: 'agendado' as const,
        projectId: 'p',
        taskId: 'a',
        analystId: null,
        meetingLink: null,
        recordingLink: null,
        createdAt: '2026-01-01',
      },
    ]
    const m = buildRescheduleKanbanProjectModel('p', tasks, events)
    expect(m.mergedEventsByLeaf.get('b')?.length).toBe(1)
    expect(m.hiddenTaskIds.has('a')).toBe(true)
  })
})
