import type { DbProject } from '../db/types'

export type ProjectFreshnessStatus = 'neutro' | 'em_dia' | 'atencao' | 'atrasado' | 'critico'

export type ProjectFreshnessConfig = {
  slaDays?: number
  attentionThresholdPct?: number
  overdueThresholdPct?: number
  criticalThresholdPct?: number
  now?: Date
}

export type ProjectFreshnessSnapshot = {
  status: ProjectFreshnessStatus
  slaDays: number
  elapsedDays: number | null
  consumedPct: number | null
  sourceAt: string | null
}

const DEFAULT_SLA_DAYS = 7
const DEFAULT_ATTENTION_THRESHOLD = 80
const DEFAULT_OVERDUE_THRESHOLD = 100
const DEFAULT_CRITICAL_THRESHOLD = 200
const DAY_MS = 24 * 60 * 60 * 1000

function toPositiveNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback
  return value
}

function elapsedDaysBetween(olderIso: string, now: Date): number {
  const olderMs = Date.parse(olderIso)
  if (!Number.isFinite(olderMs)) return 0
  return Math.max(0, Math.floor((now.getTime() - olderMs) / DAY_MS))
}

export function resolveProjectFreshnessSourceAt(
  project: Pick<DbProject, 'lastManualCheckinAt'>,
): string | null {
  return project.lastManualCheckinAt ?? null
}

export function deriveProjectFreshnessBySla(
  project: Pick<DbProject, 'lastManualCheckinAt'>,
  config: ProjectFreshnessConfig = {},
): ProjectFreshnessSnapshot {
  const now = config.now ?? new Date()
  const slaDays = toPositiveNumber(config.slaDays, DEFAULT_SLA_DAYS)
  const attentionThresholdPct = toPositiveNumber(config.attentionThresholdPct, DEFAULT_ATTENTION_THRESHOLD)
  const overdueThresholdPct = toPositiveNumber(config.overdueThresholdPct, DEFAULT_OVERDUE_THRESHOLD)
  const criticalThresholdPct = toPositiveNumber(config.criticalThresholdPct, DEFAULT_CRITICAL_THRESHOLD)
  const sourceAt = resolveProjectFreshnessSourceAt(project)
  if (!sourceAt) {
    return {
      status: 'neutro',
      slaDays,
      elapsedDays: null,
      consumedPct: null,
      sourceAt: null,
    }
  }
  const elapsedDays = elapsedDaysBetween(sourceAt, now)
  const consumedPct = Math.round((elapsedDays / slaDays) * 100)

  let status: ProjectFreshnessStatus = 'critico'
  if (consumedPct < attentionThresholdPct) status = 'em_dia'
  else if (consumedPct < overdueThresholdPct) status = 'atencao'
  else if (consumedPct < criticalThresholdPct) status = 'atrasado'

  return {
    status,
    slaDays,
    elapsedDays,
    consumedPct,
    sourceAt,
  }
}

export function projectFreshnessLabel(status: ProjectFreshnessStatus): string {
  if (status === 'em_dia') return 'Em dia'
  if (status === 'atencao') return 'Atenção'
  if (status === 'atrasado') return 'Atrasado'
  if (status === 'critico') return 'Crítico'
  return 'Neutro'
}
