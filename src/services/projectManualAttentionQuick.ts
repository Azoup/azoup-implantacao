import { db } from '../db/database'
import type { DbAnalyst, DbProject } from '../db/types'
import { describeProjectPersistPatchDiff } from '../lib/projectEditAuditDiff'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { getUserForAudit, writeAuditLog } from './auditLogs'
import {
  enqueuePendingProjectGraphSync,
  updateProjectPartialInSupabase,
  withDexieSupabaseSyncMuted,
} from '../sync/supabaseDexieBridge'
import { dispatchSyncFailure } from '../sync/syncFailure'

function handlePartialSyncFailure(projectId: string, opId: string, syncErr: unknown): never {
  const msg = syncErr instanceof Error ? syncErr.message : String(syncErr)
  const code = msg.match(/PRJ_CREATE_[A-Z_]+/)?.[0] ?? 'PRJ_CREATE_SYNC'
  enqueuePendingProjectGraphSync(projectId, {
    opId,
    lastErrorCode: code,
    lastErrorMessage: msg,
  })
  dispatchSyncFailure({
    table: 'projects',
    operation: 'upsert',
    message: `Falha ao gravar na nuvem após salvar localmente. ${msg}`,
  })
  console.warn('[Supabase] alerta manual (atalho) não confirmado na nuvem', {
    projectId,
    opId,
    error: msg,
  })
  throw syncErr instanceof Error ? syncErr : new Error(msg)
}

/**
 * Atualiza só alerta operacional manual (Dexie + PATCH Supabase + auditoria),
 * mesmo fluxo conceitual do modal de edição, para atalho na grade Projetos.
 */
export async function applyManualAttentionOnlyPatch(
  project: DbProject,
  userId: string,
  noteRaw: string,
  analysts: Pick<DbAnalyst, 'id' | 'name'>[],
): Promise<void> {
  const noteTrim = noteRaw.trim()
  if (noteTrim.length > 0 && noteTrim.length < 12) {
    throw new Error('Alerta operacional: use pelo menos 12 caracteres ou deixe em branco.')
  }
  const prevNote = (project.manualAttentionNote ?? '').trim()
  let manualAttentionAt = project.manualAttentionAt
  let manualAttentionBy = project.manualAttentionBy
  if (noteTrim !== prevNote) {
    if (noteTrim.length > 0) {
      manualAttentionAt = new Date().toISOString()
      manualAttentionBy = userId
    } else {
      manualAttentionAt = null
      manualAttentionBy = null
    }
  }
  const patch: Record<string, unknown> = {
    manualAttentionNote: noteTrim.length > 0 ? noteTrim : null,
    manualAttentionAt,
    manualAttentionBy,
  }
  const auditDetails = describeProjectPersistPatchDiff(project, patch, {
    analystNameById: new Map(analysts.map((a) => [a.id, a.name])),
  })
  const opId = crypto.randomUUID()
  await withDexieSupabaseSyncMuted(async () => {
    await db.projects.update(project.id, patch as Partial<DbProject>)
  })
  if (isSupabaseConfigured()) {
    try {
      await updateProjectPartialInSupabase(project.id, patch as Partial<DbProject>, opId)
    } catch (syncErr) {
      handlePartialSyncFailure(project.id, opId, syncErr)
    }
  }
  if (auditDetails) {
    const actor = await getUserForAudit(userId)
    await writeAuditLog({
      action: 'alteracao',
      entity: 'projeto',
      entityId: project.id,
      entityLabel: project.projectName.trim(),
      details: auditDetails,
      user: actor,
    })
  }
}
