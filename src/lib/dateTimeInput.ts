import { fromZonedTime } from 'date-fns-tz'
import { CAL_TZ } from './calendarGrid'

export function normalizeBrDateInput(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export function normalizeTimeInput(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

export function brDateTimeToIso(dateBr: string, time: string): string | null {
  const m = dateBr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const tm = time.match(/^(\d{2}):(\d{2})$/)
  if (!tm) return null
  const dd = Number(m[1])
  const mm = Number(m[2])
  const yyyy = Number(m[3])
  const hh = Number(tm[1])
  const mi = Number(tm[2])
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || hh > 23 || mi > 59) return null
  const wall = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}T${String(hh).padStart(2, '0')}:${String(mi).padStart(2, '0')}:00`
  const dt = fromZonedTime(wall, CAL_TZ)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toISOString()
}
