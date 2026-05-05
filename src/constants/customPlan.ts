/** Plano avulso: fases/tarefas definidas só no projeto (não vêm do catálogo de modelos). */
export const CUSTOM_PLAN_TYPE = 'custom' as const

/** Texto longo (formulários, mensagens internas). Em badges/listagens use `planSummaryLabel`. */
export const CUSTOM_PLAN_LABEL = 'Plano avulso'

export const PLAN_FILTER_OPTIONS = [
  { key: 'basic', label: 'BASIC' },
  { key: 'pro', label: 'PRÓ' },
  { key: 'master', label: 'MASTER' },
  { key: CUSTOM_PLAN_TYPE, label: 'AVULSO' },
] as const

/** Chave canônica para comparar planos em filtros e exibição. */
export function normalizePlanTypeKey(planType: string | null | undefined): string {
  const raw = String(planType ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (!raw) return ''
  if (raw === 'avulso') return CUSTOM_PLAN_TYPE
  return raw
}

/** Rótulo curto único por tipo de plano (cards, visão geral, detalhe do projeto). */
export function planSummaryLabel(planType: string | null | undefined): string {
  const k = normalizePlanTypeKey(planType)
  if (k === CUSTOM_PLAN_TYPE) return 'AVULSO'
  if (k === 'basic') return 'BASIC'
  if (k === 'pro') return 'PRÓ'
  if (k === 'master') return 'MASTER'
  return k ? k.toUpperCase() : '—'
}

/** Classes visuais compartilhadas (`plan-pill plan-pill--*`) para o tipo de plano. */
export function planPillClass(planType: string | null | undefined): string {
  const k = normalizePlanTypeKey(planType)
  const mod =
    k === CUSTOM_PLAN_TYPE
      ? 'plan-pill--avulso'
      : k === 'basic'
        ? 'plan-pill--basic'
        : k === 'pro'
          ? 'plan-pill--pro'
          : k === 'master'
            ? 'plan-pill--master'
            : 'plan-pill--unknown'
  return `plan-pill ${mod}`
}

export function isCustomPlanType(planType: string | null | undefined): boolean {
  return normalizePlanTypeKey(planType) === CUSTOM_PLAN_TYPE
}
