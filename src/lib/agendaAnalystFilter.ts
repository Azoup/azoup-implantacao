import type { DbEvent } from '../db/types'

export type AnalystFilter =
  | { mode: 'all' }
  | { mode: 'unassigned' }
  | { mode: 'selection'; ids: Set<string> }

export const ANALYST_FILTER_ALL: AnalystFilter = { mode: 'all' }

export const ANALYST_FILTER_STORAGE_KEY = 'agenda_analyst_filter_v1'

export function applyAnalystFilter(events: DbEvent[], filter: AnalystFilter): DbEvent[] {
  if (filter.mode === 'all') return events
  if (filter.mode === 'unassigned') return events.filter((e) => !e.analystId)
  if (filter.ids.size === 0) return []
  return events.filter((e) => e.analystId != null && filter.ids.has(e.analystId))
}

export function isAnalystFilterAll(filter: AnalystFilter): boolean {
  return filter.mode === 'all'
}

export function isAnalystFilterUnassigned(filter: AnalystFilter): boolean {
  return filter.mode === 'unassigned'
}

export function isAnalystSelected(filter: AnalystFilter, analystId: string): boolean {
  if (filter.mode === 'all') return true
  if (filter.mode === 'unassigned') return false
  return filter.ids.has(analystId)
}

/** Um único analista selecionado (compatível com chips da página Em execução). */
export function singleSelectedAnalystId(filter: AnalystFilter): string | null {
  if (filter.mode !== 'selection' || filter.ids.size !== 1) return null
  return [...filter.ids][0] ?? null
}

export function setAnalystFilterAll(): AnalystFilter {
  return ANALYST_FILTER_ALL
}

export function setAnalystFilterUnassigned(): AnalystFilter {
  return { mode: 'unassigned' }
}

export function setAnalystFilterSingle(analystId: string): AnalystFilter {
  return { mode: 'selection', ids: new Set([analystId]) }
}

export function toggleAnalystInFilter(filter: AnalystFilter, analystId: string): AnalystFilter {
  if (filter.mode === 'all') {
    return { mode: 'selection', ids: new Set([analystId]) }
  }
  if (filter.mode === 'unassigned') {
    return { mode: 'selection', ids: new Set([analystId]) }
  }
  const next = new Set(filter.ids)
  if (next.has(analystId)) next.delete(analystId)
  else next.add(analystId)
  if (next.size === 0) return ANALYST_FILTER_ALL
  return { mode: 'selection', ids: next }
}

/** Primeiro analista selecionado para sync Google (um por vez na API atual). */
export function primaryAnalystIdForGoogleSync(filter: AnalystFilter): string | undefined {
  if (filter.mode === 'selection' && filter.ids.size === 1) {
    return [...filter.ids][0]
  }
  return undefined
}

export function serializeAnalystFilter(filter: AnalystFilter): string {
  if (filter.mode === 'all') return 'all'
  if (filter.mode === 'unassigned') return 'unassigned'
  return JSON.stringify([...filter.ids])
}

export function deserializeAnalystFilter(raw: string | null): AnalystFilter {
  if (!raw || raw === 'all') return ANALYST_FILTER_ALL
  if (raw === 'unassigned') return { mode: 'unassigned' }
  if (!raw.startsWith('[')) {
    return { mode: 'selection', ids: new Set([raw]) }
  }
  try {
    const ids = JSON.parse(raw) as unknown
    if (!Array.isArray(ids)) return ANALYST_FILTER_ALL
    return { mode: 'selection', ids: new Set(ids.filter((id): id is string => typeof id === 'string')) }
  } catch {
    return ANALYST_FILTER_ALL
  }
}

export function loadAnalystFilterFromStorage(): AnalystFilter {
  try {
    return deserializeAnalystFilter(localStorage.getItem(ANALYST_FILTER_STORAGE_KEY))
  } catch {
    return ANALYST_FILTER_ALL
  }
}

export function persistAnalystFilter(filter: AnalystFilter): void {
  try {
    localStorage.setItem(ANALYST_FILTER_STORAGE_KEY, serializeAnalystFilter(filter))
  } catch {
    /* quota / private mode */
  }
}
