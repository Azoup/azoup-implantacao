import type { DbPhase, KanbanColumn } from '../db/types'

/**
 * Plano vinculado ao projeto (builtinPlans): Fase 00 = preparativos/onboarding (tarefas 0.x),
 * Fase 01+ = tarefas 1.x, 2.x… Colunas do kanban seguem esse `orderIndex`.
 */
export function planOrderIndexToKanbanColumn(orderIndex: number): KanbanColumn {
  if (orderIndex <= 0) return 'novos'
  if (orderIndex === 1) return 'fase_01'
  if (orderIndex === 2) return 'fase_02'
  if (orderIndex === 3) return 'fase_03'
  return 'fase_04'
}

/** Meta da coluna do kanban → `orderIndex` da fase do plano que deve ficar ativa. */
export function kanbanColumnToTargetPlanOrderIndex(col: KanbanColumn): number | null {
  switch (col) {
    case 'novos':
      return 0
    case 'fase_01':
      return 1
    case 'fase_02':
      return 2
    case 'fase_03':
      return 3
    case 'fase_04':
      return 4
    default:
      return null
  }
}

/**
 * Índice no array de fases ordenadas onde `phase.orderIndex` corresponde à meta
 * (planos com orderIndex contíguo 0..n como nos modelos builtin).
 */
export function targetPhaseArrayIndex(sorted: DbPhase[], targetPlanOrder: number): number {
  if (sorted.length === 0) return 0
  const exact = sorted.findIndex((p) => p.orderIndex === targetPlanOrder)
  if (exact >= 0) return exact
  let best = 0
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].orderIndex <= targetPlanOrder) best = i
  }
  return best
}

/** Primeiro segmento numérico do código (1.2 → 1, 0.3 → 0), alinhado às fases do plano. */
export function taskCodeMajorSegment(code: string): number | null {
  const m = String(code).trim().match(/^(\d+)/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isNaN(n) ? null : n
}
