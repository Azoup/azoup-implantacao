import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'

export const APP_TZ = 'America/Sao_Paulo'

const locale = { locale: ptBR }
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseAppDate(value: string | Date): Date {
  if (value instanceof Date) return value
  const match = value.match(DATE_ONLY_RE)
  if (match) {
    const year = Number.parseInt(match[1], 10)
    const month = Number.parseInt(match[2], 10)
    const day = Number.parseInt(match[3], 10)
    return new Date(year, month - 1, day, 12, 0, 0, 0)
  }
  return new Date(value)
}

export function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') {
    const match = value.match(DATE_ONLY_RE)
    if (match) return match[0]
  }
  return formatInTimeZone(parseAppDate(value), APP_TZ, 'yyyy-MM-dd', locale)
}

export function formatDatePt(iso: string | Date, pattern = "dd/MM/yyyy"): string {
  const d = parseAppDate(iso)
  return formatInTimeZone(d, APP_TZ, pattern, locale)
}

export function formatDateTimePt(iso: string | Date): string {
  return formatInTimeZone(parseAppDate(iso), APP_TZ, 'dd/MM/yyyy HH:mm', locale)
}

export function weekdayTitlePt(date: Date): string {
  return formatInTimeZone(date, APP_TZ, "EEEE, d 'de' MMMM", locale)
}
