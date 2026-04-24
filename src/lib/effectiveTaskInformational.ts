import type { DbPhase, DbTask } from '../db/types'
import type { PlanBlueprintBlock } from './labelsTabFromPlan'

/**
 * Tarefas criadas antes do flag `isInformational` no projeto podem ficar desalinhadas do modelo.
 * Usa fase (orderIndex) + código da tarefa para espelhar o plano.
 */
export function effectiveTaskIsInformational(
  task: DbTask,
  phase: DbPhase | undefined,
  blocks: PlanBlueprintBlock[] | null | undefined,
): boolean {
  if (task.isAdHoc === true) return task.isInformational === true
  if (task.isInformational === true) return true
  if (!phase || !blocks?.length) return false
  const block = blocks.find((b) => b.planPhase.orderIndex === phase.orderIndex)
  const pt = block?.planTasks.find((p) => p.code === task.code)
  return pt?.isInformational === true
}
