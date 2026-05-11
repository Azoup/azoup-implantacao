import type { DbAuditLog, DbComment, DbPhase, DbProject, DbTask, DbTimeSession } from '../db/types'

/** Marker em `entityId` nos logs de consolidação de cadeia de reagendamento. */
export const AUDIT_TASK_CONSOLIDATED_MARKER = '#consolidated:v1'

export type AuditProjectResolveMaps = {
  projectById: Map<string, Pick<DbProject, 'projectName'>>
  taskById: Map<string, Pick<DbTask, 'projectId'>>
  phaseById: Map<string, Pick<DbPhase, 'projectId'>>
  sessionById: Map<string, Pick<DbTimeSession, 'taskId'>>
  commentById: Map<string, Pick<DbComment, 'projectId' | 'taskId'>>
}

function shortId(id: string): string {
  return id.length <= 12 ? id : `${id.slice(0, 8)}…`
}

function labelForProjectId(maps: AuditProjectResolveMaps, projectId: string): string {
  const p = maps.projectById.get(projectId)
  if (p) return p.projectName
  return `Projeto removido (${shortId(projectId)})`
}

/**
 * Extrai nome do projeto de `details` gerados por `customProjectStructure` quando a tarefa
 * já não existe no Dexie (ex.: log escrito após exclusão).
 */
export function parseProjectNameFromTaskAuditDetails(details: string): string | null {
  const ex = details.match(/Exclusão da tarefa\s+\S+\s+\(([^)]+)\)\.\s*Título:/i)
  if (ex?.[1]) return ex[1].trim()
  const alt = details.match(/Alteração na tarefa do projeto\s+\(([^)]+)\)\./i)
  if (alt?.[1]) return alt[1].trim()
  return null
}

function uuidInDocumentationLabel(label: string): string | null {
  const m = label.match(
    /projeto\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  )
  return m?.[1] ?? null
}

function normalizedTaskId(entityId: string): string {
  return entityId.endsWith(AUDIT_TASK_CONSOLIDATED_MARKER)
    ? entityId.slice(0, -AUDIT_TASK_CONSOLIDATED_MARKER.length)
    : entityId
}

/**
 * Rótulo do projeto para exibição na tela de logs (join com dados atuais + fallbacks).
 */
export function resolveAuditLogProjectDisplay(
  log: Pick<DbAuditLog, 'entity' | 'entityId' | 'entityLabel' | 'details'>,
  maps: AuditProjectResolveMaps,
): string {
  const { entity, entityId, entityLabel, details } = log

  if (entity === 'projeto') {
    if (!entityId) return '—'
    const live = maps.projectById.get(entityId)?.projectName
    if (live) return live
    const snap = entityLabel?.trim()
    return snap && snap.length > 0 ? snap : labelForProjectId(maps, entityId)
  }

  if (entity === 'tarefa' && entityId) {
    const taskId = normalizedTaskId(entityId)
    const task = maps.taskById.get(taskId)
    if (task) return labelForProjectId(maps, task.projectId)
    const parsed = parseProjectNameFromTaskAuditDetails(details)
    return parsed ?? '—'
  }

  if (entity === 'fase' && entityId) {
    const ph = maps.phaseById.get(entityId)
    if (!ph) return '—'
    return labelForProjectId(maps, ph.projectId)
  }

  if (entity === 'timer' && entityId) {
    const session = maps.sessionById.get(entityId)
    if (!session) return '—'
    const task = maps.taskById.get(session.taskId)
    if (!task) return '—'
    return labelForProjectId(maps, task.projectId)
  }

  if (entity === 'comentario') {
    if (entityId) {
      const c = maps.commentById.get(entityId)
      if (c?.projectId) return labelForProjectId(maps, c.projectId)
      if (c?.taskId) {
        const task = maps.taskById.get(c.taskId)
        if (task) return labelForProjectId(maps, task.projectId)
      }
    }
    const uuid = uuidInDocumentationLabel(entityLabel)
    if (uuid) return labelForProjectId(maps, uuid)
    return '—'
  }

  if (entity === 'outro' && entityId) {
    if (entityLabel === 'assistente_ia' || maps.projectById.has(entityId)) {
      return labelForProjectId(maps, entityId)
    }
  }

  return '—'
}
