import type { ProjectEngagementKind } from '../db/types'

export const DEFAULT_PROJECT_ENGAGEMENT_KIND: ProjectEngagementKind = 'operacao_padrao'

/** Rótulo curto na UI (cards, listas) — caixa alta, alinhado a CONFECÇÃO / GENÉRICO. */
export const PROJECT_ENGAGEMENT_KIND_LABEL_PT: Record<ProjectEngagementKind, string> = {
  operacao_padrao: 'IMPLANTAÇÃO',
  upsell: 'UPSELL',
}

/** Opções do select de edição: valor no DB inalterado; texto em caixa alta + contexto entre parênteses. */
export const PROJECT_ENGAGEMENT_KIND_SELECT_OPTIONS: { value: ProjectEngagementKind; label: string }[] = [
  { value: 'operacao_padrao', label: 'IMPLANTAÇÃO (ciclo principal)' },
  { value: 'upsell', label: 'UPSELL (expansão comercial)' },
]

const UPSELL_NAME_MARK = /\[upsell\]/i

/** Marcador legado no nome do projeto (case-insensitive). */
export function inferEngagementKindFromProjectName(name: string | null | undefined): ProjectEngagementKind {
  return UPSELL_NAME_MARK.test(String(name ?? '')) ? 'upsell' : 'operacao_padrao'
}

export function normalizeProjectEngagementKind(v: unknown): ProjectEngagementKind {
  const s = String(v ?? '').trim().toLowerCase().replace(/-/g, '_')
  return s === 'upsell' ? 'upsell' : 'operacao_padrao'
}

export function projectEngagementKindLabelPt(k: string | null | undefined): string {
  return PROJECT_ENGAGEMENT_KIND_LABEL_PT[normalizeProjectEngagementKind(k)]
}

/**
 * Texto para auditoria: só aplica o rótulo oficial quando o valor armazenado é um kind conhecido;
 * caso contrário preserva o valor bruto (evita mascarar lixo como IMPLANTAÇÃO).
 */
export function projectEngagementKindLabelForAudit(v: unknown): string {
  if (v == null || String(v).trim() === '') return '—'
  const raw = String(v).trim().toLowerCase().replace(/-/g, '_')
  if (raw === 'upsell' || raw === 'operacao_padrao') {
    return PROJECT_ENGAGEMENT_KIND_LABEL_PT[raw as ProjectEngagementKind]
  }
  return String(v)
}

export function projectEngagementKindSearchBlob(p: {
  engagementKind?: ProjectEngagementKind | string | null
}): string {
  const v = normalizeProjectEngagementKind(p.engagementKind)
  const label = projectEngagementKindLabelPt(v).toLowerCase()
  return [v, label, 'upsell', 'operação padrão', 'operacao padrao', 'implantação', 'implantacao'].join(' ')
}
