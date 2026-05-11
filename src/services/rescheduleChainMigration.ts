import { db } from '../db/database'
import type { DbAuditLog, DbComment, DbEvent, DbTask, DbTimeLog, DbTimeSession } from '../db/types'
import { enqueuePendingProjectGraphSync } from '../sync/supabaseDexieBridge'
import { recomputeTaskStatus } from './tasks'
import { writeAuditLog, getUserForAudit } from './auditLogs'

/**
 * Migração consolidadora de cadeias rescheduledFromTaskId/rescheduledToTaskId.
 *
 * Modelo legado: cancelar+reagendar criava uma tarefa-cópia, conectada via rescheduled*TaskId.
 * Modelo novo: 1 Tarefa : N Eventos. Esta migração consolida cadeias antigas em uma única tarefa-raiz,
 * mesclando eventos, comentários, timeLogs e timeSessions de todas as filhas no target (raiz).
 *
 * Operação em três estágios (acionada por UI admin):
 *  1) diagnoseRescheduleChains()  — read-only; produz relatório.
 *  2) snapshotForMigration()      — gera JSON com cópia de todos os registros afetados.
 *  3) consolidateRescheduleChains() — transação Dexie por cadeia + sync remoto via enqueuePendingProjectGraphSync.
 *
 * Marca cada execução em auditLogs com entityId='${targetId}#consolidated:v1' (idempotência).
 */

const CONSOLIDATION_MARKER_SUFFIX = '#consolidated:v1'
const RESCHEDULED_TITLE_SUFFIX_RE = /\s*\(reagendada\)\s*$/iu

export type RescheduleChainNode = {
  taskId: string
  /** Ordem na cadeia: 0 = raiz, n-1 = última. */
  depth: number
  title: string
  status: DbTask['status']
  rescheduledToTaskId: string | null
}

export type RescheduleChain = {
  rootTaskId: string
  projectId: string
  /** Nodes ordered root → leaf. */
  nodes: RescheduleChainNode[]
  /** True se cadeia tem ciclo (rescheduledToTaskId leva de volta a um nó já visitado). */
  hasCycle: boolean
  /** True se há bifurcação (≥2 tarefas com rescheduledFromTaskId === mesma raiz/intermediária). */
  hasBranch: boolean
  /** True se já foi consolidada anteriormente (marker presente). */
  alreadyConsolidated: boolean
}

export type RescheduleChainDiagnosis = {
  /** Cadeias bem-formadas (sem ciclo, sem bifurcação) prontas para consolidação. */
  cleanChains: RescheduleChain[]
  /** Cadeias com ciclo ou bifurcação — ficam em quarentena, exigem investigação manual. */
  quarantineChains: RescheduleChain[]
  /** Tarefas com rescheduledFromTaskId apontando para tarefa inexistente. */
  orphanTaskIds: string[]
  /** Cadeias já consolidadas anteriormente (idempotência). */
  alreadyConsolidatedChains: RescheduleChain[]
  totals: {
    affectedTasks: number
    longestChain: number
    eventsAffected: number
    commentsAffected: number
    timeLogsAffected: number
    timeSessionsAffected: number
  }
}

async function isAlreadyConsolidated(targetId: string): Promise<boolean> {
  const marker = `${targetId}${CONSOLIDATION_MARKER_SUFFIX}`
  const found = await db.auditLogs.filter((l) => l.entityId === marker).first()
  return !!found
}

/**
 * Mapeia toda a base e classifica cadeias.
 * Read-only — não escreve no Dexie.
 */
export async function diagnoseRescheduleChains(): Promise<RescheduleChainDiagnosis> {
  const tasks = await db.tasks.toArray()
  const taskById = new Map(tasks.map((t) => [t.id, t]))

  const roots = tasks.filter((t) => (t.rescheduledToTaskId != null && (!t.rescheduledFromTaskId)) || (t.rescheduledFromTaskId == null && t.rescheduledToTaskId != null))
  // Inbound map: para cada task, quem aponta com rescheduledToTaskId
  const inboundFromMap = new Map<string, string[]>()
  for (const t of tasks) {
    if (t.rescheduledToTaskId) {
      const arr = inboundFromMap.get(t.rescheduledToTaskId) ?? []
      arr.push(t.id)
      inboundFromMap.set(t.rescheduledToTaskId, arr)
    }
  }

  const cleanChains: RescheduleChain[] = []
  const quarantineChains: RescheduleChain[] = []
  const alreadyConsolidatedChains: RescheduleChain[] = []
  const orphanTaskIds: string[] = []
  const seen = new Set<string>()

  // Detecta órfãos: rescheduledFromTaskId aponta para tarefa que não existe
  for (const t of tasks) {
    if (t.rescheduledFromTaskId && !taskById.has(t.rescheduledFromTaskId)) {
      orphanTaskIds.push(t.id)
    }
  }

  let eventsAffected = 0
  let commentsAffected = 0
  let timeLogsAffected = 0
  let timeSessionsAffected = 0

  for (const root of roots) {
    if (seen.has(root.id)) continue

    const nodes: RescheduleChainNode[] = []
    const localSeen = new Set<string>()
    let cursor: DbTask | null = root
    let hasCycle = false
    let hasBranch = false
    let depth = 0

    while (cursor) {
      if (localSeen.has(cursor.id)) {
        hasCycle = true
        break
      }
      localSeen.add(cursor.id)
      seen.add(cursor.id)
      nodes.push({
        taskId: cursor.id,
        depth,
        title: cursor.title,
        status: cursor.status,
        rescheduledToTaskId: cursor.rescheduledToTaskId ?? null,
      })

      // Bifurcação se múltiplos cursores apontam ao mesmo target (já cadastrados via rescheduledToTaskId)
      const inbound = inboundFromMap.get(cursor.id) ?? []
      if (inbound.length > 1) hasBranch = true

      if (!cursor.rescheduledToTaskId) break
      const nextTask: DbTask | undefined = taskById.get(cursor.rescheduledToTaskId)
      if (!nextTask) {
        orphanTaskIds.push(cursor.id)
        break
      }
      cursor = nextTask
      depth += 1
    }

    if (nodes.length < 2) continue // não é cadeia

    const taskIdsInChain = nodes.map((n) => n.taskId)
    eventsAffected += await db.events.where('taskId').anyOf(taskIdsInChain.slice(1)).count()
    commentsAffected += await db.comments.where('taskId').anyOf(taskIdsInChain.slice(1)).count()
    timeLogsAffected += await db.timeLogs.where('taskId').anyOf(taskIdsInChain.slice(1)).count()
    timeSessionsAffected += await db.timeSessions.where('taskId').anyOf(taskIdsInChain.slice(1)).count()

    const alreadyDone = await isAlreadyConsolidated(root.id)
    const chain: RescheduleChain = {
      rootTaskId: root.id,
      projectId: root.projectId,
      nodes,
      hasCycle,
      hasBranch,
      alreadyConsolidated: alreadyDone,
    }
    if (alreadyDone) alreadyConsolidatedChains.push(chain)
    else if (hasCycle || hasBranch) quarantineChains.push(chain)
    else cleanChains.push(chain)
  }

  const longestChain = [...cleanChains, ...quarantineChains].reduce(
    (max, c) => Math.max(max, c.nodes.length),
    0,
  )
  const affectedTasks =
    cleanChains.reduce((sum, c) => sum + c.nodes.length, 0) +
    quarantineChains.reduce((sum, c) => sum + c.nodes.length, 0)

  return {
    cleanChains,
    quarantineChains,
    alreadyConsolidatedChains,
    orphanTaskIds: [...new Set(orphanTaskIds)],
    totals: {
      affectedTasks,
      longestChain,
      eventsAffected,
      commentsAffected,
      timeLogsAffected,
      timeSessionsAffected,
    },
  }
}

export type MigrationSnapshot = {
  capturedAt: string
  tasks: DbTask[]
  events: DbEvent[]
  comments: DbComment[]
  timeLogs: DbTimeLog[]
  timeSessions: DbTimeSession[]
  auditLogs: Pick<DbAuditLog, 'id' | 'createdAt' | 'entityId' | 'entity' | 'details'>[]
}

/**
 * Snapshot completo dos registros que serão tocados na consolidação.
 * Pode ser baixado/exportado como JSON pelo admin antes de executar.
 */
export async function snapshotForMigration(diagnosis: RescheduleChainDiagnosis): Promise<MigrationSnapshot> {
  const chainTaskIds = new Set<string>()
  for (const c of [...diagnosis.cleanChains, ...diagnosis.quarantineChains]) {
    for (const node of c.nodes) chainTaskIds.add(node.taskId)
  }
  const ids = Array.from(chainTaskIds)
  const tasks = await db.tasks.where('id').anyOf(ids).toArray()
  const events = await db.events.where('taskId').anyOf(ids).toArray()
  const comments = await db.comments.where('taskId').anyOf(ids).toArray()
  const timeLogs = await db.timeLogs.where('taskId').anyOf(ids).toArray()
  const timeSessions = await db.timeSessions.where('taskId').anyOf(ids).toArray()

  return {
    capturedAt: new Date().toISOString(),
    tasks,
    events,
    comments,
    timeLogs,
    timeSessions,
    auditLogs: [],
  }
}

export type ConsolidationOutcome = {
  consolidatedCount: number
  skippedCount: number
  errors: { rootTaskId: string; message: string }[]
}

/**
 * Consolida cada cadeia em uma única transação Dexie.
 * - target = raiz da cadeia (depth 0)
 * - drops = todos os demais
 * - re-aponta events/comments/timeLogs/timeSessions para o target
 * - soma actualHours; preserva o título da raiz limpo de "(reagendada)"
 * - chama recomputeTaskStatus(target) para deixar status canônico
 * - dispara enqueuePendingProjectGraphSync(projectId) ao final
 */
export async function consolidateRescheduleChains(
  diagnosis: RescheduleChainDiagnosis,
  actorUserId?: string,
): Promise<ConsolidationOutcome> {
  const outcome: ConsolidationOutcome = { consolidatedCount: 0, skippedCount: 0, errors: [] }

  for (const chain of diagnosis.cleanChains) {
    if (chain.alreadyConsolidated) {
      outcome.skippedCount += 1
      continue
    }
    try {
      await db.transaction('rw', [db.tasks, db.events, db.comments, db.timeLogs, db.timeSessions], async () => {
        const targetId = chain.rootTaskId
        const target = await db.tasks.get(targetId)
        if (!target) throw new Error('Tarefa raiz não encontrada.')

        const dropIds = chain.nodes.slice(1).map((n) => n.taskId)
        if (dropIds.length === 0) return

        const droppedTasks = await db.tasks.where('id').anyOf(dropIds).toArray()
        const totalExtraHours = droppedTasks.reduce(
          (sum, t) => sum + (Number.isFinite(t.actualHours) ? t.actualHours : 0),
          0,
        )

        await db.events.where('taskId').anyOf(dropIds).modify({ taskId: targetId })
        await db.comments.where('taskId').anyOf(dropIds).modify({ taskId: targetId })
        await db.timeLogs.where('taskId').anyOf(dropIds).modify({ taskId: targetId })
        await db.timeSessions.where('taskId').anyOf(dropIds).modify({ taskId: targetId })

        const cleanTitle = target.title.replace(RESCHEDULED_TITLE_SUFFIX_RE, '').trim()
        await db.tasks.update(targetId, {
          actualHours: (Number.isFinite(target.actualHours) ? target.actualHours : 0) + totalExtraHours,
          title: cleanTitle.length > 0 ? cleanTitle : target.title,
          rescheduledFromTaskId: null,
          rescheduledToTaskId: null,
          cancellationReason: null,
          cancelledManually: false,
        })

        await db.tasks.bulkDelete(dropIds)
      })

      await recomputeTaskStatus(chain.rootTaskId, actorUserId)

      if (actorUserId) {
        const actor = await getUserForAudit(actorUserId)
        await writeAuditLog({
          action: 'alteracao',
          entity: 'tarefa',
          entityId: `${chain.rootTaskId}${CONSOLIDATION_MARKER_SUFFIX}`,
          entityLabel: chain.nodes[0]?.title ?? chain.rootTaskId,
          details: `Cadeia de reagendamento consolidada (${chain.nodes.length} tarefas → 1).`,
          user: actor,
        })
      }

      enqueuePendingProjectGraphSync(chain.projectId, {
        lastErrorCode: null,
        lastErrorMessage: null,
        opId: crypto.randomUUID(),
      })

      outcome.consolidatedCount += 1
    } catch (e) {
      outcome.errors.push({
        rootTaskId: chain.rootTaskId,
        message: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return outcome
}
