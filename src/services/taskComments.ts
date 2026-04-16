import { uuid } from '../lib/uuid'
import { db } from '../db/database'
import type { DbDocAttachment, DbDocLink, UserRole } from '../db/types'
import { getUserForAudit, writeAuditLog } from './auditLogs'

const AUDIT_TEXT_CLIP = 8000

function clipAuditText(s: string): string {
  if (s.length <= AUDIT_TEXT_CLIP) return s
  return `${s.slice(0, AUDIT_TEXT_CLIP)}\n… (texto truncado no log; total ${s.length} caracteres)`
}

export async function addTaskChecklistItem(opts: {
  taskId: string
  projectId: string
  authorId: string
  content: string
}): Promise<void> {
  const text = opts.content.trim()
  if (!text) return
  await db.comments.add({
    id: uuid(),
    content: text,
    authorId: opts.authorId,
    projectId: opts.projectId,
    taskId: opts.taskId,
    eventId: null,
    createdAt: new Date().toISOString(),
    updatedAt: null,
  })
}

/** Notas de projeto (aba Documentação): comentário só com projectId. */
export async function addProjectDocumentation(opts: {
  projectId: string
  authorId: string
  content: string
  docLinks?: DbDocLink[]
  docAttachments?: DbDocAttachment[]
}): Promise<void> {
  const text = opts.content.trim()
  const links = opts.docLinks?.filter((l) => l.url.trim()) ?? []
  const attachments = opts.docAttachments ?? []
  if (!text && links.length === 0 && attachments.length === 0) return
  await db.comments.add({
    id: uuid(),
    content: text,
    authorId: opts.authorId,
    projectId: opts.projectId,
    taskId: null,
    eventId: null,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    docLinks: links.length > 0 ? links : undefined,
    docAttachments: attachments.length > 0 ? attachments : undefined,
  })
}

function assertProjectDocComment(c: { taskId: string | null; projectId: string | null }): void {
  if (c.taskId != null) throw new Error('Somente documentação do projeto (sem tarefa) pode ser alterada por este fluxo.')
  if (!c.projectId) throw new Error('Registro de documentação inválido.')
}

/** Autor altera o texto; auditoria com antes/depois para administradores. */
export async function updateProjectDocumentationContent(opts: {
  commentId: string
  actorUserId: string
  newContent: string
}): Promise<void> {
  const c = await db.comments.get(opts.commentId)
  if (!c) throw new Error('Registro não encontrado.')
  assertProjectDocComment(c)
  if (c.authorId !== opts.actorUserId) throw new Error('Apenas o autor pode editar esta documentação.')

  const before = c.content
  const after = opts.newContent.trim()
  if (after === before) return

  await db.comments.update(opts.commentId, {
    content: after,
    updatedAt: new Date().toISOString(),
  })

  const actor = await getUserForAudit(opts.actorUserId)
  await writeAuditLog({
    action: 'alteracao',
    entity: 'comentario',
    entityId: c.id,
    entityLabel: `Documentação · projeto ${c.projectId}`,
    details: [
      `Edição de documentação do projeto (comentário ${c.id}).`,
      '--- ANTES ---',
      clipAuditText(before),
      '--- DEPOIS ---',
      clipAuditText(after),
    ].join('\n'),
    user: actor,
  })
}

/** Admin: qualquer documentação do projeto. Autor: só a própria. Exige justificativa no log. */
export async function deleteProjectDocumentation(opts: {
  commentId: string
  actorUserId: string
  actorRole: UserRole
  justification: string
}): Promise<void> {
  const c = await db.comments.get(opts.commentId)
  if (!c) throw new Error('Registro não encontrado.')
  assertProjectDocComment(c)

  const isAdmin = opts.actorRole === 'admin'
  const isAuthor = c.authorId === opts.actorUserId
  if (!isAdmin && !isAuthor) throw new Error('Sem permissão para excluir esta documentação.')

  const j = opts.justification.trim()
  if (j.length < 12) throw new Error('Informe uma justificativa com pelo menos 12 caracteres.')

  const actor = await getUserForAudit(opts.actorUserId)
  const meta = [
    `Exclusão de documentação do projeto (comentário ${c.id}).`,
    `Projeto: ${c.projectId}`,
    `Autor original do registro: ${c.authorId}`,
    `Anexos: ${c.docAttachments?.length ?? 0} · Links: ${c.docLinks?.length ?? 0}`,
    '--- Conteúdo removido ---',
    clipAuditText(c.content),
  ].join('\n')

  await writeAuditLog({
    action: 'exclusao',
    entity: 'comentario',
    entityId: c.id,
    entityLabel: `Documentação · projeto ${c.projectId}`,
    details: meta,
    justification: j,
    user: actor,
  })

  await db.comments.delete(opts.commentId)
}
