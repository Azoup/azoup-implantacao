import { describe, expect, it } from 'vitest'
import type { ReleaseNoteBundle } from '../constants/releaseNotes'
import {
  bundleBrDateKey,
  filterReleaseNoteBundles,
  matchesSearch,
  sortBundlesNewestFirst,
} from './releaseNotesFilter'

const TZ = 'America/Sao_Paulo'

const sample: ReleaseNoteBundle[] = [
  {
    versionDisplay: 'v2.0.0',
    tag: 'v2.0.0',
    releasedAt: '2026-06-01T15:00:00.000Z',
    items: [{ category: 'MELHORIA', text: 'Alpha bravo' }],
  },
  {
    versionDisplay: 'v1.0.0',
    tag: 'v1.0.0',
    releasedAt: '2026-05-12T15:00:00.000Z',
    items: [{ category: 'BUG_FIX', text: 'Correção crítica' }],
  },
]

describe('releaseNotesFilter', () => {
  it('bundleBrDateKey uses Brasília calendar day', () => {
    expect(bundleBrDateKey('2026-05-12T02:59:00.000Z', TZ)).toBe('2026-05-11')
    expect(bundleBrDateKey('2026-05-12T03:00:00.000Z', TZ)).toBe('2026-05-12')
    expect(bundleBrDateKey('2026-05-12T12:00:00.000Z', TZ)).toBe('2026-05-12')
  })

  it('sortBundlesNewestFirst', () => {
    const s = sortBundlesNewestFirst([sample[1], sample[0]])
    expect(s.map((b) => b.tag)).toEqual(['v2.0.0', 'v1.0.0'])
  })

  it('matchesSearch is accent-insensitive', () => {
    expect(matchesSearch(sample[1], 'critica')).toBe(true)
  })

  it('filterReleaseNoteBundles by tag and category', () => {
    const out = filterReleaseNoteBundles(
      sample,
      { search: '', tag: 'v1.0.0', dateFrom: '', dateTo: '', categories: ['BUG_FIX'] },
      TZ,
    )
    expect(out).toHaveLength(1)
    expect(out[0].items).toHaveLength(1)
  })

  it('filterReleaseNoteBundles by date range in Brasília', () => {
    const out = filterReleaseNoteBundles(
      sample,
      { search: '', tag: '', dateFrom: '2026-05-12', dateTo: '2026-05-12', categories: [] },
      TZ,
    )
    expect(out.map((b) => b.tag)).toEqual(['v1.0.0'])
  })
})
