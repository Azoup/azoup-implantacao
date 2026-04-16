/**
 * Cor “chefe” por ordem da fase no plano (0 = Fase 00, 1 = Fase 01, …).
 * Cinco matizes bem separados no círculo cromático (ouro ≠ coral ≠ jade ≠ ciano ≠ violeta),
 * com saturação moderada para destacar no fundo escuro sem “neon”.
 * Timeline, labels, fases e kanban usam a mesma sequência.
 */
export const PHASE_PROGRESSION_ACCENTS = [
  '#c9a227', // 0 — ouro / preparação
  '#e0573a', // 1 — coral-laranja / vendas
  '#2f9d6e', // 2 — jade / financeiro
  '#2d93b0', // 3 — ciano / produção
  '#6f5bd4', // 4 — violeta / gerencial · fechamento
  '#b85c8c', // 5 — magenta-rosado (fase extra)
] as const

const FALLBACK = '#64748b'

export function phaseProgressionAccent(planOrderIndex: number): string {
  if (!Number.isFinite(planOrderIndex) || planOrderIndex < 0) return FALLBACK
  const i = Math.min(Math.floor(planOrderIndex), PHASE_PROGRESSION_ACCENTS.length - 1)
  return PHASE_PROGRESSION_ACCENTS[i] ?? FALLBACK
}
