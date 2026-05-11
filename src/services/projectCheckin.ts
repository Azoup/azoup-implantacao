import type { DbProject } from '../db/types'

const DAY_MS = 24 * 60 * 60 * 1000

function safeParseIso(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : null
}

/**
 * "Atualizado em" usa o último check-in manual.
 * - `null` => nunca foi registrado (ou não está preenchido).
 */
export function resolveProjectCheckinSourceAt(project: Pick<DbProject, 'lastManualCheckinAt'>): string | null {
  return project.lastManualCheckinAt ?? null
}

/**
 * Pendência de check-in:
 * - `lastManualCheckinAt === null` => pendente
 * - caso contrário, pendente se estiver sem check-in por mais de `staleDays`
 */
export function isProjectCheckinStale(
  project: Pick<DbProject, 'lastManualCheckinAt' | 'startDate' | 'createdAt'>,
  staleDays: number = 7,
  now: Date = new Date(),
): boolean {
  const sourceAt = project.lastManualCheckinAt ?? project.startDate ?? project.createdAt
  const t = safeParseIso(sourceAt)
  if (t === null) return true
  const diffMs = now.getTime() - t
  return diffMs > staleDays * DAY_MS
}

export function projectCheckinUpdatedAtValue(
  project: Pick<DbProject, 'lastManualCheckinAt'>,
): string | null {
  return project.lastManualCheckinAt ?? null
}

export function projectCheckinUpdatedAtLabel(
  project: Pick<DbProject, 'lastManualCheckinAt'>,
  format: (iso: string) => string,
): string {
  const at = project.lastManualCheckinAt ?? null
  return at ? format(at) : '—'
}

