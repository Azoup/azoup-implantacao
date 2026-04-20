import { compareTaskCode } from './taskCode'
import type { DbPhase, DbPlanPhase, DbPlanTask, DbTask, LabelStatus } from '../db/types'

export type PlanBlueprintBlock = { planPhase: DbPlanPhase; planTasks: DbPlanTask[] }

/** Primeiro código operacional ainda aberto (mesma ideia de syncLabels). */
export function firstOpenOperationalCode(tasks: DbTask[], projectId: string): string | null {
  const operational = tasks
    .filter((t) => t.projectId === projectId && !t.isInformational)
    .sort((a, b) => compareTaskCode(a.code, b.code) || a.sortOrder - b.sortOrder)
  const codes = [...new Set(operational.map((t) => t.code))].sort(compareTaskCode)
  return (
    codes.find((code) =>
      operational.some((t) => t.code === code && t.status !== 'concluida' && t.status !== 'cancelado'),
    ) ?? null
  )
}

export function deriveLabelStatusForTasks(
  code: string,
  subset: DbTask[],
  firstOpenOperational: string | null,
): LabelStatus {
  if (subset.length === 0) return 'not_started'
  const allDone = subset.every((t) => t.status === 'concluida' || t.status === 'cancelado')
  const anyDone = subset.some((t) => t.status === 'concluida')
  const anyProg = subset.some((t) => t.status === 'em_andamento')
  let status: LabelStatus = 'not_started'
  if (allDone && anyDone) status = 'completed'
  else if (anyProg || code === firstOpenOperational) status = 'in_progress'
  return status
}

export type LabelsTabRow = {
  code: string
  title: string
  displayStatus: LabelStatus
  planTask: DbPlanTask
}

export type LabelsTabSection = {
  planPhase: DbPlanPhase
  projectPhase: DbPhase | null
  orderIndex: number
  rows: LabelsTabRow[]
}

/**
 * Abas Labels: uma seção por fase do plano (inclui Fase 00 se existir no modelo),
 * com uma linha por tarefa-modelo na ordem do plano. Estado vem das tarefas do projeto.
 */
export function buildLabelsTabSections(
  blocks: PlanBlueprintBlock[],
  sortedProjectPhases: DbPhase[],
  tasks: DbTask[],
  projectId: string,
): LabelsTabSection[] {
  const byOrder = new Map(sortedProjectPhases.map((p) => [p.orderIndex, p]))
  const firstOpen = firstOpenOperationalCode(tasks, projectId)

  return blocks.map(({ planPhase, planTasks }) => {
    const projectPhase = byOrder.get(planPhase.orderIndex) ?? null
    const rows: LabelsTabRow[] = planTasks.map((pt) => {
      const subset = projectPhase
        ? tasks.filter(
            (t) => t.projectId === projectId && t.phaseId === projectPhase.id && t.code === pt.code,
          )
        : []
      const displayStatus = deriveLabelStatusForTasks(pt.code, subset, firstOpen)
      return {
        code: pt.code,
        title: pt.title,
        displayStatus,
        planTask: pt,
      }
    })
    return { planPhase, projectPhase, orderIndex: planPhase.orderIndex, rows }
  })
}

/** Plano avulso: monta blocos compatíveis com `buildLabelsTabSections` a partir das fases/tarefas reais do projeto. */
export function buildCustomPlanBlueprintBlocks(
  sortedProjectPhases: DbPhase[],
  tasks: DbTask[],
  projectId: string,
): PlanBlueprintBlock[] {
  const defaultHex = (orderIndex: number) => {
    const palette = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#eab308', '#64748b']
    return palette[orderIndex % palette.length] ?? '#64748b'
  }

  return sortedProjectPhases.map((ph) => {
    const planPhase: DbPlanPhase = {
      id: `custom:${ph.id}`,
      planModelId: 'custom',
      name: ph.name,
      orderIndex: ph.orderIndex,
      colorHex: ph.colorHex ?? defaultHex(ph.orderIndex),
    }
    const list = tasks
      .filter((t) => t.projectId === projectId && t.phaseId === ph.id)
      .sort((a, b) => compareTaskCode(a.code, b.code) || a.sortOrder - b.sortOrder)
    const planTasks: DbPlanTask[] = list.map((t) => ({
      id: `custom:${t.id}`,
      planPhaseId: planPhase.id,
      code: t.code,
      title: t.title,
      description: t.description,
      estimatedHours: t.estimatedHours,
      isInformational: t.isInformational,
      sortOrder: t.sortOrder,
    }))
    return { planPhase, planTasks }
  })
}
