/**
 * Estilo de blocos de agenda: cor do analista = borda + fundo suave (estilo Google Calendar).
 */
export function eventColorsFromAnalyst(analystColor: string | undefined, cancelled: boolean) {
  if (cancelled) {
    return {
      accent: '#e5484d',
      bg: 'color-mix(in srgb, #e5484d 22%, var(--agenda-event-bg, var(--surface)))',
    }
  }
  const hex = analystColor?.trim()
  if (!hex || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) {
    return {
      accent: 'var(--accent)',
      bg: 'var(--cal-event-default)',
    }
  }
  const full = hex.length === 4 ? expandShortHex(hex) : hex
  return {
    accent: full,
    bg: `color-mix(in srgb, ${full} 26%, var(--agenda-event-bg, var(--surface)))`,
  }
}

function expandShortHex(h: string): string {
  const x = h.slice(1)
  if (x.length !== 3) return h
  return `#${x[0]}${x[0]}${x[1]}${x[1]}${x[2]}${x[2]}`
}
