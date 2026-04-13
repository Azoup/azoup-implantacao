import { uuid } from '../lib/uuid'
import { db } from '../db/database'
import type { DbDocAttachment, DbDocLink } from '../db/types'

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
