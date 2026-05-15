/**
 * Esconde duplicatas históricas: evento avulso (sem `googleEventId`) quando já existe
 * par importado do Google no mesmo slot (analista, horário, título parecido).
 */
import { addDays } from 'date-fns'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'
import type { DbEvent } from '../db/types'
import { stripTaskCodePrefix } from './calendarEventTitle'
import { CAL_TZ } from './calendarGrid'

/** Tolerância no início do compromisso (min). */
export const GOOGLE_TWIN_START_TOLERANCE_MS = 15 * 60 * 1000

const PAREN_SUFFIX_RE = /\s*\([^)]*\)\s*/g
const EMPRESA_DASH_RE = /\s+-\s+/
const NON_ALNUM_RE = /[^a-z0-9\s]/gi

function stripTitleForDedupe(title: string): string {
  const s = stripTaskCodePrefix(String(title ?? '').trim())
  return s.replace(PAREN_SUFFIX_RE, ' ').trim()
}

function normalizeTitleCore(s: string): string {
  const t = s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(NON_ALNUM_RE, ' ')
  return t.replace(/\s+/g, ' ').trim()
}

/** Remove acentos e normaliza para comparação de títulos. */
export function normalizeEventTitleForDedupe(title: string): string {
  return normalizeTitleCore(stripTitleForDedupe(title))
}

/** Assunto após prefixo `EMPRESA -` (padrão Google), antes de remover pontuação. */
export function extractDedupeSubject(title: string): string {
  let s = stripTitleForDedupe(title)
  const dash = s.match(EMPRESA_DASH_RE)
  if (dash?.index != null) {
    s = s.slice(dash.index + dash[0].length).trim()
  }
  return normalizeTitleCore(s)
}

const MIN_SUBJECT_LEN_FOR_CONTAINS = 6

/** Títulos equivalentes para dedupe (código de plano, reagendada, prefixo empresa). */
export function agendaEventTitlesAreSimilar(a: string, b: string): boolean {
  const na = normalizeEventTitleForDedupe(a)
  const nb = normalizeEventTitleForDedupe(b)
  if (!na || !nb) return false
  if (na === nb) return true

  const sa = extractDedupeSubject(a)
  const sb = extractDedupeSubject(b)
  if (sa && sb && sa === sb) return true

  const shorter = sa.length <= sb.length ? sa : sb
  const longer = sa.length > sb.length ? sa : sb
  if (shorter.length >= MIN_SUBJECT_LEN_FOR_CONTAINS && longer.includes(shorter)) return true

  if (na.length >= MIN_SUBJECT_LEN_FOR_CONTAINS && nb.includes(na)) return true
  if (nb.length >= MIN_SUBJECT_LEN_FOR_CONTAINS && na.includes(nb)) return true

  return false
}

export function analystsMatchForDedupe(a: DbEvent, b: DbEvent): boolean {
  const aa = a.analystId ?? null
  const ab = b.analystId ?? null
  return aa === ab
}

export function eventStartsWithinTolerance(
  a: DbEvent,
  b: DbEvent,
  toleranceMs = GOOGLE_TWIN_START_TOLERANCE_MS,
): boolean {
  const da = new Date(a.startTime).getTime()
  const db = new Date(b.startTime).getTime()
  if (!Number.isFinite(da) || !Number.isFinite(db)) return false
  return Math.abs(da - db) <= toleranceMs
}

/** Início do dia civil seguinte em America/Sao_Paulo (eventos antes = histórico, inclui hoje). */
export function startOfTomorrowCalTzIso(now = new Date()): string {
  const z = toZonedTime(now, CAL_TZ)
  const tomorrow = addDays(z, 1)
  const dayKey = formatInTimeZone(tomorrow, CAL_TZ, 'yyyy-MM-dd')
  return fromZonedTime(`${dayKey}T00:00:00`, CAL_TZ).toISOString()
}

export function isHistoricalAgendaEvent(ev: DbEvent, cutoffIso = startOfTomorrowCalTzIso()): boolean {
  return ev.startTime < cutoffIso
}

export type GoogleTwinDedupeOptions = {
  /** Só oculta avulsos com início antes deste instante (padrão: amanhã 00:00 SP). */
  historicalBeforeIso?: string
}

/**
 * Remove da lista eventos avulsos que têm “gêmeo” Google (mesmo analista, horário ±15 min, título).
 * Por padrão aplica só ao histórico (hoje e anteriores); compromissos futuros avulsos permanecem.
 */
export function filterHiddenGoogleTwinDuplicates(
  events: DbEvent[],
  options?: GoogleTwinDedupeOptions,
): DbEvent[] {
  const historicalBeforeIso = options?.historicalBeforeIso ?? startOfTomorrowCalTzIso()
  const googleEvents = events.filter((e) => Boolean(e.googleEventId?.trim()))
  if (googleEvents.length === 0) return events

  const hideIds = new Set<string>()

  for (const ev of events) {
    if (ev.googleEventId?.trim()) continue
    if (!isHistoricalAgendaEvent(ev, historicalBeforeIso)) continue

    for (const g of googleEvents) {
      if (g.id === ev.id) continue
      if (!analystsMatchForDedupe(ev, g)) continue
      if (!eventStartsWithinTolerance(ev, g)) continue
      if (!agendaEventTitlesAreSimilar(ev.title, g.title)) continue
      hideIds.add(ev.id)
      break
    }
  }

  if (hideIds.size === 0) return events
  return events.filter((e) => !hideIds.has(e.id))
}
