import type { DbProject } from '../db/types'
import { parseAppDate } from './dates'

export type ProjectSortKey = 'startDate' | 'name'
export type ProjectSortDirection = 'asc' | 'desc'
export type ProjectSortConfig = { key: ProjectSortKey; direction: ProjectSortDirection }

const STORAGE_KEY = 'vyntask:projectSortConfig'

function startMs(p: Pick<DbProject, 'startDate'>, nullSentinel: 'min' | 'max'): number {
  const raw = p.startDate?.trim()
  if (!raw) return nullSentinel === 'min' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY
  const t = parseAppDate(raw).getTime()
  if (!Number.isFinite(t)) return nullSentinel === 'min' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY
  return t
}

function nameCmp(a: Pick<DbProject, 'projectName'>, b: Pick<DbProject, 'projectName'>): number {
  return a.projectName.localeCompare(b.projectName, 'pt-BR', { sensitivity: 'base' })
}

export function sortProjects<T extends Pick<DbProject, 'projectName' | 'startDate'>>(
  projects: T[],
  config: ProjectSortConfig,
): T[] {
  return [...projects].sort((a, b) => {
    const base = (() => {
      if (config.key === 'name') {
        const cmp = nameCmp(a, b)
        return config.direction === 'asc' ? cmp : -cmp
      }
      return config.direction === 'desc'
        ? startMs(b, 'min') - startMs(a, 'min')
        : startMs(a, 'max') - startMs(b, 'max')
    })()
    if (base !== 0) return base
    return nameCmp(a, b)
  })
}

export function readProjectSortConfig(): ProjectSortConfig {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v) {
      const parsed = JSON.parse(v) as Partial<ProjectSortConfig>
      const key = parsed.key === 'name' ? 'name' : 'startDate'
      const direction = parsed.direction === 'asc' ? 'asc' : 'desc'
      return { key, direction }
    }
  } catch {
    /* ignore */
  }
  return { key: 'startDate', direction: 'desc' }
}

export function writeProjectSortConfig(config: ProjectSortConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    /* ignore */
  }
}
