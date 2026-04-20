/** Plano avulso: fases/tarefas definidas só no projeto (não vêm do catálogo de modelos). */
export const CUSTOM_PLAN_TYPE = 'custom' as const

export const CUSTOM_PLAN_LABEL = 'Plano avulso'

export function isCustomPlanType(planType: string | null | undefined): boolean {
  return planType === CUSTOM_PLAN_TYPE
}
