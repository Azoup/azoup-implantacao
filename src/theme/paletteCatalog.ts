export type PaletteId =
  | 'neo'
  | 'blue_ops'
  | 'pulse'
  | 'growth'
  | 'minimal'

export type PaletteMeta = {
  id: PaletteId
  name: string
  tagline: string
  /** Fundo principal · superfície · destaque */
  swatch: [string, string, string]
}

export const PALETTE_PRESETS: PaletteMeta[] = [
  {
    id: 'neo',
    name: 'Azoup Neo',
    tagline: 'Identidade oficial: grafite + laranja com contraste SaaS',
    swatch: ['#0f0f0f', '#1a1a1a', '#ff8b17'],
  },
  {
    id: 'blue_ops',
    name: 'Blue Ops',
    tagline: 'Corporativo técnico com foco operacional',
    swatch: ['#0b1220', '#131c2e', '#3b82f6'],
  },
  {
    id: 'pulse',
    name: 'Pulse',
    tagline: 'Tom tecnológico com energia IA',
    swatch: ['#0f0f1a', '#18182a', '#8b5cf6'],
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'Leitura analítica com acento financeiro',
    swatch: ['#0f1412', '#18201d', '#22c55e'],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    tagline: 'Neutro monocromático para foco em conteúdo',
    swatch: ['#090909', '#141414', '#ffffff'],
  },
]

export function isPaletteId(v: string | null): v is PaletteId {
  return v === 'neo' || v === 'blue_ops' || v === 'pulse' || v === 'growth' || v === 'minimal'
}

/** Paletas antigas (v1) → novas chaves */
export const LEGACY_PALETTE_MAP: Record<string, PaletteId> = {
  ember: 'neo',
  ocean: 'blue_ops',
  aurora: 'pulse',
  rose: 'neo',
  sage: 'growth',
  slate: 'minimal',
  tech_graphite_orange: 'neo',
  implantacao_azoup_brand: 'blue_ops',
  /** @deprecated alias legado salvo em alguns ambientes */
  vyntask_brand: 'blue_ops',
  black_yellow: 'growth',
  black_orange: 'neo',
  black_blue: 'blue_ops',
  white_blue: 'blue_ops',
  white_orange: 'neo',
}
