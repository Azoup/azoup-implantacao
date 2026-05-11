import type { DbEvent, DbTask } from '../db/types'

/**
 * UI Kanban para cadeias legadas `rescheduledFromTaskId` / `rescheduledToTaskId`.
 *
 * **Regra de cartão único:** exibimos apenas a **folha** da cadeia — a tarefa para onde
 * `rescheduledToTaskId` aponta repetidamente até não haver sucessora (última cópia / “ativa”).
 * Predecessores (que possuem `rescheduledToTaskId` preenchido) ficam **ocultos** no quadro por
 * fase, para não duplicar o mesmo código lógico (ex.: cancelada + reagendada).
 *
 * **Ciclos ou ponteiro órfão:** se detectarmos ciclo em `rescheduledToTaskId` ou `next` inexistente
 * no mapa, cada nó permanece visível (quarentena até `consolidateRescheduleChains` em Configurações).
 *
 * Horas consumidas e eventos/comentários podem ser agregados na folha para leitura única (1 Tarefa : N Eventos).
 */

export function rescheduleKanbanLeafTaskId(
  startId: string,
  taskById: ReadonlyMap<string, DbTask>,
): string {
  let id = startId
  const visited = new Set<string>()
  while (true) {
    const t = taskById.get(id)
    const next = t?.rescheduledToTaskId ?? null
    if (!next) return id
    if (!taskById.has(next)) return startId
    if (visited.has(next)) return startId
    visited.add(id)
    id = next
  }
}

export function computeRescheduleKanbanHiddenTaskIds(tasks: readonly DbTask[]): ReadonlySet<string> {
  const taskById = new Map(tasks.map((t) => [t.id, t]))
  const hidden = new Set<string>()
  for (const t of tasks) {
    const leaf = rescheduleKanbanLeafTaskId(t.id, taskById)
    if (leaf !== t.id) hidden.add(t.id)
  }
  return hidden
}

export function collectChainMemberIdsForLeaf(
  leafId: string,
  projectTasks: readonly DbTask[],
  taskById: ReadonlyMap<string, DbTask>,
): string[] {
  const ids: string[] = []
  for (const t of projectTasks) {
    if (rescheduleKanbanLeafTaskId(t.id, taskById) === leafId) ids.push(t.id)
  }
  return ids
}

export function aggregateActualHoursByLeaf(
  projectTasks: readonly DbTask[],
  taskById: ReadonlyMap<string, DbTask>,
): Map<string, number> {
  const sums = new Map<string, number>()
  for (const t of projectTasks) {
    const leaf = rescheduleKanbanLeafTaskId(t.id, taskById)
    const v = (sums.get(leaf) ?? 0) + (Number.isFinite(t.actualHours) ? t.actualHours : 0)
    sums.set(leaf, v)
  }
  return sums
}

export function mergeEventsForLeaf(
  leafId: string,
  projectTasks: readonly DbTask[],
  taskById: ReadonlyMap<string, DbTask>,
  projectEvents: readonly DbEvent[],
  projectId: string,
): DbEvent[] {
  const memberIds = new Set(collectChainMemberIdsForLeaf(leafId, projectTasks, taskById))
  const out = projectEvents.filter(
    (e) => e.projectId === projectId && e.taskId != null && memberIds.has(e.taskId),
  )
  return [...out].sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export type RescheduleKanbanProjectModel = {
  taskById: ReadonlyMap<string, DbTask>
  hiddenTaskIds: ReadonlySet<string>
  aggregateActualByLeaf: ReadonlyMap<string, number>
  mergedEventsByLeaf: ReadonlyMap<string, DbEvent[]>
  chainMemberIdsByLeaf: ReadonlyMap<string, readonly string[]>
}

export function buildRescheduleKanbanProjectModel(
  projectId: string,
  projectTasks: readonly DbTask[],
  projectEvents: readonly DbEvent[],
): RescheduleKanbanProjectModel {
  const mine = projectTasks.filter((t) => t.projectId === projectId)
  const taskById = new Map(mine.map((t) => [t.id, t]))
  const hiddenTaskIds = computeRescheduleKanbanHiddenTaskIds(mine)
  const aggregateActualByLeaf = aggregateActualHoursByLeaf(mine, taskById)

  const leafIds = new Set<string>()
  for (const t of mine) {
    leafIds.add(rescheduleKanbanLeafTaskId(t.id, taskById))
  }

  const mergedEventsByLeaf = new Map<string, DbEvent[]>()
  const chainMemberIdsByLeaf = new Map<string, readonly string[]>()
  for (const leafId of leafIds) {
    const members = collectChainMemberIdsForLeaf(leafId, mine, taskById)
    chainMemberIdsByLeaf.set(leafId, members)
    mergedEventsByLeaf.set(leafId, mergeEventsForLeaf(leafId, mine, taskById, projectEvents, projectId))
  }

  return {
    taskById,
    hiddenTaskIds,
    aggregateActualByLeaf,
    mergedEventsByLeaf,
    chainMemberIdsByLeaf,
  }
}
