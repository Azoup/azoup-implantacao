export type PaletteId =
  | 'tech_graphite_orange'
  | 'vyntask_brand'
  | 'black_yellow'
  | 'black_orange'
  | 'black_blue'
  | 'white_blue'
  | 'white_orange'

export type PaletteMeta = {
  id: PaletteId
  name: string
  tagline: string
  /** Fundo principal · superfície · destaque */
  swatch: [string, string, string]
}

export const PALETTE_PRESETS: PaletteMeta[] = [
  {
    id: 'tech_graphite_orange',
    name: 'VynTask Neo (grafite + laranja)',
    tagline: 'Estética tecnológica com preto reforçado e destaque laranja premium',
    swatch: ['#0c0c0c', '#141414', '#ff9f43'],
  },
  {
    id: 'black_orange',
    name: 'VynTask apresentação',
    tagline: 'Visual escuro com destaque laranja, igual à vitrine de planos',
    swatch: ['#10151c', '#1e2532', '#ff9f43'],
  },
  {
    id: 'vyntask_brand',
    name: 'VynTask original (azul + laranja)',
    tagline: 'Paleta anterior com azul profundo e destaques em laranja',
    swatch: ['#030329', '#0b1f8f', '#ff8b17'],
  },
  {
    id: 'black_yellow',
    name: 'Preto + amarelo',
    tagline: 'Barra lateral preta e ouro âmbar — alto contraste no conteúdo',
    swatch: ['#fafaf9', '#ffffff', '#ca8a04'],
  },
  {
    id: 'black_blue',
    name: 'Preto + azul',
    tagline: 'Navegação preta e azul royal — foco corporativo',
    swatch: ['#f8fafc', '#ffffff', '#1d4ed8'],
  },
  {
    id: 'white_blue',
    name: 'Branco + azul',
    tagline: 'Interface clara e sidebar suave — clássico SaaS',
    swatch: ['#f8fafc', '#ffffff', '#2563eb'],
  },
  {
    id: 'white_orange',
    name: 'Branco + laranja',
    tagline: 'Área principal branca com laranja só nos destaques',
    swatch: ['#f4f6fa', '#ffffff', '#ea580c'],
  },
]

export function isPaletteId(v: string | null): v is PaletteId {
  return (
    v === 'tech_graphite_orange' ||
    v === 'vyntask_brand' ||
    v === 'black_yellow' ||
    v === 'black_orange' ||
    v === 'black_blue' ||
    v === 'white_blue' ||
    v === 'white_orange'
  )
}

/** Paletas antigas (v1) → novas chaves */
export const LEGACY_PALETTE_MAP: Record<string, PaletteId> = {
  ember: 'white_orange',
  ocean: 'white_blue',
  aurora: 'black_blue',
  rose: 'black_orange',
  sage: 'white_blue',
  slate: 'black_blue',
}
