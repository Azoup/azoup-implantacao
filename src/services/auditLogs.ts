import { db } from '../db/database'
import type { AuditAction, AuditEntity, DbUser } from '../db/types'

type WriteAuditLogInput = {
  action: AuditAction
  entity: AuditEntity
  entityId?: string | null
  entityLabel: string
  details: string
  justification?: string | null
  user: Pick<DbUser, 'id' | 'name' | 'email'>
}

export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  await db.auditLogs.put({
    id: crypto.randomUUID(),
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? null,
    entityLabel: input.entityLabel,
    userId: input.user.id,
    userName: input.user.name,
    userEmail: input.user.email,
    justification: input.justification?.trim() || null,
    details: input.details,
    createdAt: new Date().toISOString(),
  })
}

export async function getUserForAudit(userId: string): Promise<Pick<DbUser, 'id' | 'name' | 'email'>> {
  const u = await db.users.get(userId)
  if (u) return { id: u.id, name: u.name, email: u.email }
  return { id: userId, name: 'Usuário', email: 'desconhecido@local' }
}
