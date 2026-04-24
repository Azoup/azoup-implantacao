/**
 * Formatação humana de duração para UI:
 * - Detalhe / histórico: `0h0m0s` (segundos visíveis)
 * - Relatórios e resumos: `0h0m` (minutos truncados, sem segundos)
 *
 * Valores vêm de horas decimais (ex.: actualHours) ou segundos inteiros (sessões).
 */

function nonNegativeSecondsFromDecimalHours(decimalHours: number): number {
  if (!Number.isFinite(decimalHours) || decimalHours <= 0) return 0
  return Math.round(decimalHours * 3600)
}

function nonNegativeIntSeconds(totalSeconds: number): number {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return 0
  return Math.floor(totalSeconds)
}

/** Relógio 00:00:00 — útil em inputs e timers. */
export function formatClockHmsFromSeconds(totalSeconds: number): string {
  const s = nonNegativeIntSeconds(totalSeconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':')
}

export function formatClockHmsFromHours(decimalHours: number): string {
  return formatClockHmsFromSeconds(nonNegativeSecondsFromDecimalHours(decimalHours))
}

/** Histórico e controle fino: `1h30m45s`. */
export function formatDurationHmsFromSeconds(totalSeconds: number): string {
  const s = nonNegativeIntSeconds(totalSeconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}h${m}m${sec}s`
}

export function formatDurationHmsFromHours(decimalHours: number): string {
  return formatDurationHmsFromSeconds(nonNegativeSecondsFromDecimalHours(decimalHours))
}

/** Resumos e relatórios: `1h30m` (trunca abaixo do minuto). */
export function formatDurationHmFromSeconds(totalSeconds: number): string {
  const s = nonNegativeIntSeconds(totalSeconds)
  const wholeMinutes = Math.floor(s / 60)
  const h = Math.floor(wholeMinutes / 60)
  const m = wholeMinutes % 60
  return `${h}h${m}m`
}

export function formatDurationHmFromHours(decimalHours: number): string {
  return formatDurationHmFromSeconds(nonNegativeSecondsFromDecimalHours(decimalHours))
}

/** Resumo ultra compacto: `12h` (sem minutos). */
export function formatDurationHFromHours(decimalHours: number): string {
  if (!Number.isFinite(decimalHours) || decimalHours <= 0) return '0h'
  return `${Math.round(decimalHours)}h`
}

/**
 * Converte texto do usuário em horas decimais: `hh:mm:ss`, `mm:ss`, ou decimal `1,5`.
 */
/** Exibe horas decimais no padrão BR para inputs (ex.: 1,5). */
export function formatDecimalHoursForBrInput(h: number): string {
  if (!Number.isFinite(h)) return ''
  if (h === 0) return '0'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(h)
}

export function parseDurationFlexibleToHours(raw: string): number {
  const t = raw.trim()
  if (!t) return NaN
  const compact = t.replace(/\s/g, '').toLowerCase()
  if (/[hms]/.test(compact)) {
    const normalized = compact.replace(',', '.')
    const hMatch = normalized.match(/(-?\d+(?:\.\d+)?)h/)
    const mMatch = normalized.match(/(-?\d+(?:\.\d+)?)m/)
    const sMatch = normalized.match(/(-?\d+(?:\.\d+)?)s/)
    if (!hMatch && !mMatch && !sMatch) return NaN
    const h = hMatch ? Number(hMatch[1]) : 0
    const m = mMatch ? Number(mMatch[1]) : 0
    const sec = sMatch ? Number(sMatch[1]) : 0
    if (![h, m, sec].every((n) => Number.isFinite(n))) return NaN
    if (h < 0 || m < 0 || sec < 0 || m >= 60 || sec >= 60) return NaN
    return (h * 3600 + m * 60 + sec) / 3600
  }
  if (t.includes(':')) {
    const segs = t.split(':').map((s) => s.trim())
    if (segs.length < 2 || segs.length > 3) return NaN
    const nums = segs.map((s) => {
      const n = Number(s.replace(/\s/g, '').replace(',', '.'))
      return Number.isFinite(n) ? n : NaN
    })
    if (nums.some((n) => !Number.isFinite(n))) return NaN
    let h = 0
    let m = 0
    let sec = 0
    if (segs.length === 3) {
      h = nums[0]!
      m = nums[1]!
      sec = nums[2]!
    } else {
      m = nums[0]!
      sec = nums[1]!
    }
    if (h < 0 || m < 0 || sec < 0 || m >= 60 || sec >= 60) return NaN
    return (h * 3600 + m * 60 + sec) / 3600
  }
  const dec = parseFloat(t.replace(',', '.'))
  return Number.isFinite(dec) ? dec : NaN
}
