export type PhaseColorPreset = {
  key: 'preparativos' | 'vendas' | 'financeiro' | 'producao' | 'gerencial' | 'extra'
  label: string
  hex: string
}

/**
 * Paleta oficial de fases (conforme guia visual do produto).
 * A ordem segue a progressão operacional; o usuário pode sobrescrever no cadastro da fase.
 */
export const PHASE_COLOR_PRESETS: readonly PhaseColorPreset[] = [
  { key: 'preparativos', label: 'Preparativos (mostarda)', hex: '#b89a2b' },
  { key: 'vendas', label: 'Vendas (laranja)', hex: '#e26b2f' },
  { key: 'financeiro', label: 'Financeiro (verde)', hex: '#35a36f' },
  { key: 'producao', label: 'Produção (azul)', hex: '#3f7fc8' },
  { key: 'gerencial', label: 'Gerencial (roxo)', hex: '#7757cc' },
  { key: 'extra', label: 'Extra', hex: '#b85c8c' },
] as const

const FALLBACK = '#64748b'

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function hasAny(text: string, words: readonly string[]): boolean {
  return words.some((w) => text.includes(w))
}

export function inferPhaseColor(name: string, orderIndex: number): string {
  const n = normalize(name)
  if (hasAny(n, ['onboarding', 'prepar', 'kickoff', 'inicio', 'inicial'])) return PHASE_COLOR_PRESETS[0].hex
  if (hasAny(n, ['venda', 'comercial'])) return PHASE_COLOR_PRESETS[1].hex
  if (hasAny(n, ['finance', 'fiscal', 'tesouraria', 'boleto'])) return PHASE_COLOR_PRESETS[2].hex
  if (hasAny(n, ['produc', 'pcp', 'faccao', 'ordem'])) return PHASE_COLOR_PRESETS[3].hex
  if (hasAny(n, ['gerenc', 'gest', 'relatorio', 'bi', 'diretoria'])) return PHASE_COLOR_PRESETS[4].hex
  return phaseProgressionAccent(orderIndex)
}

export function normalizePhaseColorHex(hex: string | null | undefined, fallback: string): string {
  const raw = (hex ?? '').trim()
  if (!raw) return fallback
  const normalized = raw.startsWith('#') ? raw : `#${raw}`
  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) return fallback
  return normalized.toLowerCase()
}

export function phaseProgressionAccent(planOrderIndex: number): string {
  if (!Number.isFinite(planOrderIndex) || planOrderIndex < 0) return FALLBACK
  const i = Math.min(Math.floor(planOrderIndex), PHASE_COLOR_PRESETS.length - 1)
  return PHASE_COLOR_PRESETS[i]?.hex ?? FALLBACK
}
