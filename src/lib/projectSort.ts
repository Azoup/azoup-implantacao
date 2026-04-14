import type { DbProject } from '../db/types'

export type ProjectStartDateSortOrder = 'desc' | 'asc'

const STORAGE_KEY = 'vyntask:projectStartSortOrder'

function startMs(p: Pick<DbProject, 'startDate'>, nullSentinel: 'min' | 'max'): number {
  const raw = p.startDate?.trim()
  if (!raw) return nullSentinel === 'min' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY
  const t = new Date(raw).getTime()
  if (!Number.isFinite(t)) return nullSentinel === 'min' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY
  return t
}

/** Ordena por data de início. `desc` = mais novas primeiro; `asc` = mais antigas primeiro. Sem data vai para o fim. */
export function sortProjectsByStartDate<T extends Pick<DbProject, 'startDate'>>(projects: T[], order: ProjectStartDateSortOrder): T[] {
  return [...projects].sort((a, b) => {
    if (order === 'desc') {
      return startMs(b, 'min') - startMs(a, 'min')
    }
    return startMs(a, 'max') - startMs(b, 'max')
  })
}

export function readProjectStartDateSortOrder(): ProjectStartDateSortOrder {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'asc' || v === 'desc') return v
  } catch {
    /* ignore */
  }
  return 'desc'
}

export function writeProjectStartDateSortOrder(order: ProjectStartDateSortOrder): void {
  try {
    localStorage.setItem(STORAGE_KEY, order)
  } catch {
    /* ignore */
  }
}
