/**
 * Abre o fluxo "Adicionar ao Google Calendar" em nova aba (sem OAuth).
 * Para sincronização bidirecional automática é necessário backend + Google Calendar API.
 */
export function buildGoogleCalendarTemplateUrl(opts: {
  title: string
  startIso: string
  endIso: string
  details?: string
  location?: string
}): string {
  const dates = formatGoogleCalendarDates(opts.startIso, opts.endIso)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates,
  })
  if (opts.details?.trim()) params.set('details', opts.details.trim())
  if (opts.location?.trim()) params.set('location', opts.location.trim())
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function formatGoogleCalendarDates(startIso: string, endIso: string): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const toG = (d: Date) => {
    const y = d.getUTCFullYear()
    const m = pad(d.getUTCMonth() + 1)
    const day = pad(d.getUTCDate())
    const h = pad(d.getUTCHours())
    const min = pad(d.getUTCMinutes())
    const s = pad(d.getUTCSeconds())
    return `${y}${m}${day}T${h}${min}${s}Z`
  }
  return `${toG(new Date(startIso))}/${toG(new Date(endIso))}`
}
