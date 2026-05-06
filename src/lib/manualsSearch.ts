import type { ManualDef } from '../constants/manualsCatalog'

/** Remove acentos e caixa para busca tolerante. */
export function normalizeManualSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

export function manualMatchesQuery(manual: ManualDef, rawQuery: string): boolean {
  const q = normalizeManualSearch(rawQuery)
  if (!q) return true
  const parts = [manual.title, manual.description, manual.id, ...(manual.keywords ?? [])].map(normalizeManualSearch)
  return parts.some((p) => p.includes(q))
}
