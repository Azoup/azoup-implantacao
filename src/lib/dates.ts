import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'

export const APP_TZ = 'America/Sao_Paulo'

const locale = { locale: ptBR }

export function formatDatePt(iso: string | Date, pattern = "dd/MM/yyyy"): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return formatInTimeZone(d, APP_TZ, pattern, locale)
}

export function formatDateTimePt(iso: string | Date): string {
  return formatInTimeZone(
    typeof iso === 'string' ? new Date(iso) : iso,
    APP_TZ,
    'dd/MM/yyyy HH:mm',
    locale,
  )
}

export function weekdayTitlePt(date: Date): string {
  return formatInTimeZone(date, APP_TZ, "EEEE, d 'de' MMMM", locale)
}
