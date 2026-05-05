import type { DashboardPeriodPreset, DashboardPeriodRange } from '../../types/dashboard'

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

export function startOfWeekMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff))
}

export function endOfWeekSunday(d: Date): Date {
  const start = startOfWeekMonday(d)
  return endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6))
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0)
}

export function endOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999)
}

export function parseDateInput(value: string): Date | null {
  const normalized = value?.trim()
  if (!normalized) return null

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  const day = Number.parseInt(match[3], 10)
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0)
  if (!Number.isFinite(parsed.getTime())) return null
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null
  return parsed
}

function parseIsoLike(value: string): Date | null {
  const trimmed = value.trim()
  const dateOnly = parseDateInput(trimmed)
  if (dateOnly) return dateOnly
  const parsed = new Date(trimmed)
  if (!Number.isFinite(parsed.getTime())) return null
  return parsed
}

export function getPeriodRange(preset: DashboardPeriodPreset, now: Date, customStart: string, customEnd: string): DashboardPeriodRange {
  if (preset === 'today') return { start: startOfDay(now), end: endOfDay(now) }
  if (preset === 'week') return { start: startOfWeekMonday(now), end: endOfWeekSunday(now) }
  if (preset === 'month') return { start: startOfMonth(now), end: endOfMonth(now) }
  if (preset === 'year') return { start: startOfYear(now), end: endOfYear(now) }

  const start = parseDateInput(customStart)
  const end = parseDateInput(customEnd)
  const safeStart = start ? startOfDay(start) : startOfMonth(now)
  const safeEnd = end ? endOfDay(end) : endOfDay(now)
  if (safeStart.getTime() > safeEnd.getTime()) {
    return { start: startOfDay(safeEnd), end: endOfDay(safeStart) }
  }
  return {
    start: safeStart,
    end: safeEnd,
  }
}

export function isIsoInRange(iso: string | null | undefined, range: DashboardPeriodRange): boolean {
  if (!iso) return false
  const parsed = parseIsoLike(iso)
  if (!parsed) return false
  const ts = parsed.getTime()
  return ts >= range.start.getTime() && ts <= range.end.getTime()
}
