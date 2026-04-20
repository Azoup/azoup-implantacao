/**
 * Estilo de blocos de agenda: cor do analista = borda + fundo suave (estilo Google Calendar).
 */
export function eventColorsFromAnalyst(analystColor: string | undefined, cancelled: boolean) {
  if (cancelled) {
    return {
      accent: 'var(--danger)',
      bg: 'color-mix(in srgb, var(--danger) 22%, var(--agenda-event-bg, var(--surface)))',
      text: 'var(--text)',
    }
  }
  const hex = analystColor?.trim()
  if (!hex || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) {
    return {
      accent: 'var(--accent)',
      bg: 'var(--cal-event-default)',
      text: 'var(--text)',
    }
  }
  const full = hex.length === 4 ? expandShortHex(hex) : hex
  const text = pickReadableText(full)
  return {
    accent: full,
    bg: `color-mix(in srgb, ${full} 26%, var(--agenda-event-bg, var(--surface)))`,
    text,
  }
}

export function pickReadableText(colorHex: string): string {
  const rgb = hexToRgb(colorHex)
  if (!rgb) return 'var(--text)'
  const lum = relativeLuminance(rgb.r, rgb.g, rgb.b)
  return lum > 0.56 ? 'rgba(15, 23, 42, 0.9)' : '#f8fafc'
}

function expandShortHex(h: string): string {
  const x = h.slice(1)
  if (x.length !== 3) return h
  return `#${x[0]}${x[0]}${x[1]}${x[1]}${x[2]}${x[2]}`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const t = hex.trim()
  if (!/^#([0-9a-f]{6})$/i.test(t)) return null
  const n = t.slice(1)
  return {
    r: Number.parseInt(n.slice(0, 2), 16),
    g: Number.parseInt(n.slice(2, 4), 16),
    b: Number.parseInt(n.slice(4, 6), 16),
  }
}

function relativeLuminance(r: number, g: number, b: number): number {
  const conv = (v: number) => {
    const x = v / 255
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  }
  const R = conv(r)
  const G = conv(g)
  const B = conv(b)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}
