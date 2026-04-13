import { uuid } from '../lib/uuid'
import { db } from '../db/database'

export async function addProjectContact(opts: {
  projectId: string
  name: string
  phone: string
  role: string
}): Promise<void> {
  const name = opts.name.trim()
  if (!name) return
  await db.projectContacts.add({
    id: uuid(),
    projectId: opts.projectId,
    name,
    phone: opts.phone.trim(),
    role: opts.role.trim(),
  })
}

export async function deleteProjectContact(id: string): Promise<void> {
  await db.projectContacts.delete(id)
}
