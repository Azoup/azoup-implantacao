/** Mantém apenas dígitos. */
export function digitsOnly(s: string): string {
  return s.replace(/\D/g, '')
}

/** 00.000.000/0000-00 */
export function formatCnpjDisplay(digits: string): string {
  const d = digitsOnly(digits).slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

/** 00000-000 */
export function formatCepDisplay(digits: string): string {
  const d = digitsOnly(digits).slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

/** (00) 00000-0000 ou (00) 0000-0000 */
export function formatPhoneBrDisplay(digits: string): string {
  const d = digitsOnly(digits).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function dateInputToIsoNoon(dateYmd: string | null | undefined): string | null {
  const t = dateYmd?.trim()
  if (!t) return null
  const d = new Date(`${t}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
