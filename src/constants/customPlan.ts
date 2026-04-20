/** Plano avulso: fases/tarefas definidas só no projeto (não vêm do catálogo de modelos). */
export const CUSTOM_PLAN_TYPE = 'custom' as const

/** Texto longo (formulários, mensagens internas). Em badges/listagens use `planSummaryLabel`. */
export const CUSTOM_PLAN_LABEL = 'Plano avulso'

/** Rótulo curto único por tipo de plano (cards, visão geral, detalhe do projeto). */
export function planSummaryLabel(planType: string | null | undefined): string {
  const k = String(planType ?? '')
    .trim()
    .toLowerCase()
  if (k === CUSTOM_PLAN_TYPE) return 'AVULSO'
  if (k === 'basic') return 'BASIC'
  if (k === 'pro') return 'PRÓ'
  if (k === 'master') return 'MASTER'
  return k ? k.toUpperCase() : '—'
}

/** Classes visuais compartilhadas (`plan-pill plan-pill--*`) para o tipo de plano. */
export function planPillClass(planType: string | null | undefined): string {
  const k = String(planType ?? '')
    .trim()
    .toLowerCase()
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
  return planType === CUSTOM_PLAN_TYPE
}
