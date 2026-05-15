import { describe, expect, it } from 'vitest'
import type { DbEvent } from '../db/types'
import {
  agendaEventTitlesAreSimilar,
  extractDedupeSubject,
  filterHiddenGoogleTwinDuplicates,
  normalizeEventTitleForDedupe,
} from './agendaEventDedupe'

function ev(partial: Partial<DbEvent> & Pick<DbEvent, 'id' | 'startTime' | 'title'>): DbEvent {
  return {
    description: '',
    endTime: partial.endTime ?? '2026-05-10T18:45:00.000Z',
    status: 'agendado',
    projectId: null,
    taskId: null,
    analystId: 'analyst-1',
    meetingLink: null,
    recordingLink: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('normalizeEventTitleForDedupe', () => {
  it('strips plan code and parenthetical suffix', () => {
    expect(normalizeEventTitleForDedupe('2.1 Controle Financeiro (reagendada)')).toBe(
      'CONTROLE FINANCEIRO',
    )
  })

  it('extracts subject after empresa dash', () => {
    expect(extractDedupeSubject('PIRATERNOS - CONTROLE FINANCEIRO')).toBe('CONTROLE FINANCEIRO')
  })
})

describe('agendaEventTitlesAreSimilar', () => {
  it('matches app avulso title with google formatted title', () => {
    expect(
      agendaEventTitlesAreSimilar(
        '2.1 Controle Financeiro (reagendada)',
        'PIRATERNOS - CONTROLE FINANCEIRO',
      ),
    ).toBe(true)
  })

  it('does not match unrelated titles', () => {
    expect(agendaEventTitlesAreSimilar('Kickoff', 'PIRATERNOS - CONTROLE FINANCEIRO')).toBe(false)
  })
})

describe('filterHiddenGoogleTwinDuplicates', () => {
  const historicalCutoff = '2026-05-16T03:00:00.000Z'

  it('hides historical app-only twin when google event exists', () => {
    const start = '2026-05-10T17:15:00.000Z'
    const app = ev({
      id: 'app',
      title: '2.1 Controle Financeiro (reagendada)',
      startTime: start,
      googleEventId: null,
    })
    const google = ev({
      id: 'google',
      title: 'PIRATERNOS - CONTROLE FINANCEIRO',
      startTime: start,
      googleEventId: 'g-123',
    })
    const out = filterHiddenGoogleTwinDuplicates([app, google], {
      historicalBeforeIso: historicalCutoff,
    })
    expect(out.map((e) => e.id)).toEqual(['google'])
  })

  it('keeps future app-only events even with a google twin', () => {
    const start = '2026-05-20T17:15:00.000Z'
    const app = ev({
      id: 'app-future',
      title: '2.1 Controle Financeiro (reagendada)',
      startTime: start,
      googleEventId: null,
    })
    const google = ev({
      id: 'google-future',
      title: 'PIRATERNOS - CONTROLE FINANCEIRO',
      startTime: start,
      googleEventId: 'g-fut',
    })
    const out = filterHiddenGoogleTwinDuplicates([app, google], {
      historicalBeforeIso: historicalCutoff,
    })
    expect(out.map((e) => e.id).sort()).toEqual(['app-future', 'google-future'])
  })

  it('keeps app-only when no google twin', () => {
    const app = ev({
      id: 'solo',
      title: 'Reunião interna',
      startTime: '2026-05-08T14:00:00.000Z',
    })
    const out = filterHiddenGoogleTwinDuplicates([app], { historicalBeforeIso: historicalCutoff })
    expect(out).toHaveLength(1)
  })
})
