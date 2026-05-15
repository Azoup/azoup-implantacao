import { parseISO } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import type { ReleaseNoteBundle, ReleaseNoteCategory } from '../constants/releaseNotes'

export const RELEASE_NOTE_CATEGORIES: ReleaseNoteCategory[] = [
  'BUG_FIX',
  'MELHORIA',
  'NOVA_FUNCAO',
  'DOCUMENTACAO',
  'SEGURANCA',
  'INFRA',
]

export type ReleaseNotesViewFilters = {
  search: string
  /** Etiqueta exata (ex.: `v1.1.0`) ou vazio = todas. */
  tag: string
  /** `yyyy-MM-dd` no calendário de `tz`, ou vazio. */
  dateFrom: string
  dateTo: string
  /** Vazio = todos os tipos. */
  categories: ReleaseNoteCategory[]
}

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function norm(s: string): string {
  return stripDiacritics(s).toLowerCase()
}

export function bundleBrDateKey(releasedAt: string, tz: string): string {
  return formatInTimeZone(releasedAt, tz, 'yyyy-MM-dd')
}

export function matchesSearch(bundle: ReleaseNoteBundle, q: string): boolean {
  const n = norm(q.trim())
  if (!n) return true
  if (norm(bundle.tag).includes(n) || norm(bundle.versionDisplay).includes(n)) return true
  return bundle.items.some((item) => norm(item.text).includes(n))
}

export function filterReleaseNoteBundles(
  bundles: ReleaseNoteBundle[],
  filters: ReleaseNotesViewFilters,
  tz: string,
): ReleaseNoteBundle[] {
  const catSet = new Set(filters.categories)
  const useCat = filters.categories.length > 0
  const from = filters.dateFrom.trim()
  const to = filters.dateTo.trim()
  const tag = filters.tag.trim()

  return bundles
    .filter((bundle) => {
      if (tag && bundle.tag !== tag) return false
      const day = bundleBrDateKey(bundle.releasedAt, tz)
      if (from && day < from) return false
      if (to && day > to) return false
      if (!matchesSearch(bundle, filters.search)) return false
      return true
    })
    .map((bundle) => {
      if (!useCat) return bundle
      const items = bundle.items.filter((i) => catSet.has(i.category))
      if (items.length === 0) return null
      return { ...bundle, items }
    })
    .filter((b): b is ReleaseNoteBundle => b != null)
}

export function sortBundlesNewestFirst(bundles: ReleaseNoteBundle[]): ReleaseNoteBundle[] {
  return [...bundles].sort((a, b) => +parseISO(b.releasedAt) - +parseISO(a.releasedAt))
}

/** Agrupa releases pelo dia no calendário de `tz` (yyyy-MM-dd). Preserva a ordem dos bundles dentro de cada dia. */
export type ReleaseNotesDayGroup = {
  dateKey: string
  bundles: ReleaseNoteBundle[]
}

export function groupBundlesByBrDay(bundles: ReleaseNoteBundle[], tz: string): ReleaseNotesDayGroup[] {
  const map = new Map<string, ReleaseNoteBundle[]>()
  for (const b of bundles) {
    const k = bundleBrDateKey(b.releasedAt, tz)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(b)
  }
  const keys = [...map.keys()].sort((a, b) => b.localeCompare(a))
  return keys.map((dateKey) => ({ dateKey, bundles: map.get(dateKey)! }))
}
