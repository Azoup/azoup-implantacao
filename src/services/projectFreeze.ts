import { db } from '../db/database'
import type { DbProject, ProjectFreezeEvent } from '../db/types'
import { parseFreezeTimeline } from '../lib/projectFreezeTimeline'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { updateProjectPartialInSupabase, withDexieSupabaseSyncMuted } from '../sync/supabaseDexieBridge'
import { getUserForAudit, writeAuditLog } from './auditLogs'
import { normalizeProjectPlacement } from './projectGovernance'

export type FreezeToggleDialogs = {
  requestConfirm: (opts: {
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
  }) => Promise<boolean | null>
  requestDestructiveWithReason: (opts: {
    title: string
    message: string
    reasonLabel: string
    reasonPlaceholder?: string
    reasonMinLength: number
    confirmLabel?: string
    cancelLabel?: string
  }) => Promise<string | null>
}

export type ApplyProjectFreezeToggleResult = 'applied' | 'cancelled' | 'ineligible'

async function persistProjectPatch(projectId: string, patch: Partial<DbProject>): Promise<void> {
  if (isSupabaseConfigured()) {
    await withDexieSupabaseSyncMuted(async () => {
      await updateProjectPartialInSupabase(projectId, patch)
      await db.projects.update(projectId, patch)
    })
    return
  }
  await db.projects.update(projectId, patch)
}

/**
 * Congelar (em andamento ou inadimplente → congelado) ou descongelar (congelado → em andamento) na grade/detalhe,
 * com justificativa e append em `freezeTimeline`.
 */
export async function applyProjectFreezeToggle(params: {
  projectId: string
  actorUserId: string
  dialogs: FreezeToggleDialogs
  /** Rótulo curto para mensagens (nome do projeto). */
  projectLabel: string
}): Promise<ApplyProjectFreezeToggleResult> {
  const cur = await db.projects.get(params.projectId)
  if (!cur) return 'cancelled'

  if (cur.status === 'finalizado' || cur.status === 'cancelado') {
    return 'ineligible'
  }

  const timeline = parseFreezeTimeline(cur.freezeTimeline)

  if (cur.status === 'congelado') {
    const ok = await params.dialogs.requestConfirm({
      title: 'Descongelar projeto',
      message: `Deseja voltar "${params.projectLabel}" para Em andamento? A situação operacional deixa de ser Congelado.`,
      confirmLabel: 'Sim, descongelar',
      cancelLabel: 'Manter congelado',
    })
    if (ok !== true) return 'cancelled'

    const reason = await params.dialogs.requestDestructiveWithReason({
      title: 'Motivo do descongelamento',
      message:
        'O motivo fica registrado no histórico do projeto (e no log de auditoria), com data e hora. Mínimo 8 caracteres.',
      reasonLabel: 'Justificativa',
      reasonPlaceholder: 'Ex.: Cliente retomou implantação; equipe liberada para avançar fases.',
      reasonMinLength: 8,
      confirmLabel: 'Registrar e ativar',
      cancelLabel: 'Voltar',
    })
    if (reason == null) return 'cancelled'

    const at = new Date().toISOString()
    const entry: ProjectFreezeEvent = {
      kind: 'unfreeze',
      at,
      by: params.actorUserId,
      reason: reason.trim(),
    }
    const placement = normalizeProjectPlacement({ status: 'ativo', kanbanColumn: cur.kanbanColumn })
    await persistProjectPatch(cur.id, {
      status: 'ativo',
      kanbanColumn: placement.kanbanColumn,
      freezeTimeline: [...timeline, entry],
    })

    const actor = await getUserForAudit(params.actorUserId)
    await writeAuditLog({
      action: 'alteracao',
      entity: 'projeto',
      entityId: cur.id,
      entityLabel: cur.projectName,
      details: `Descongelamento (grade/detalhe). Motivo: ${entry.reason}`,
      user: actor,
    })
    return 'applied'
  }

  if (cur.status !== 'ativo' && cur.status !== 'inadimplente') {
    return 'ineligible'
  }

  const reason = await params.dialogs.requestDestructiveWithReason({
    title: 'Congelar projeto',
    message: `O projeto "${params.projectLabel}" passará à situação Congelado. O motivo fica no histórico do projeto (mínimo 8 caracteres).`,
    reasonLabel: 'Motivo do congelamento',
    reasonPlaceholder: 'Ex.: Cliente pediu pausa contratual; aguardando definição de escopo.',
    reasonMinLength: 8,
    confirmLabel: 'Congelar',
    cancelLabel: 'Voltar',
  })
  if (reason == null) return 'cancelled'

  const at = new Date().toISOString()
  const entry: ProjectFreezeEvent = {
    kind: 'freeze',
    at,
    by: params.actorUserId,
    reason: reason.trim(),
  }
  const placement = normalizeProjectPlacement({ status: 'congelado', kanbanColumn: cur.kanbanColumn })
  await persistProjectPatch(cur.id, {
    status: 'congelado',
    kanbanColumn: placement.kanbanColumn,
    freezeTimeline: [...timeline, entry],
  })

  const actor = await getUserForAudit(params.actorUserId)
  await writeAuditLog({
    action: 'alteracao',
    entity: 'projeto',
    entityId: cur.id,
    entityLabel: cur.projectName,
    details: `Congelamento (grade/detalhe). Motivo: ${entry.reason}`,
    user: actor,
  })
  return 'applied'
}
