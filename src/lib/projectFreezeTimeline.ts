import type { ProjectFreezeEvent } from '../db/types'

function isValidFreezeEvent(x: unknown): x is ProjectFreezeEvent {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    (o.kind === 'freeze' || o.kind === 'unfreeze') &&
    typeof o.at === 'string' &&
    typeof o.by === 'string' &&
    typeof o.reason === 'string'
  )
}

/** Normaliza leitura de `freeze_timeline` (Postgres jsonb, Dexie array ou JSON string). */
export function parseFreezeTimeline(raw: unknown): ProjectFreezeEvent[] {
  if (raw == null) return []
  let arr: unknown = raw
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw) as unknown
    } catch {
      return []
    }
  }
  if (!Array.isArray(arr)) return []
  return arr.filter(isValidFreezeEvent)
}
