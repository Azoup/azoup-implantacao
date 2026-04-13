import { db } from '../db/database'

export async function reassignAnalystReferences(oldAnalystId: string, nextAnalystId: string | null): Promise<void> {
  await db.transaction('rw', db.projects, db.tasks, db.events, db.timeSessions, async () => {
    await db.projects.where('analystId').equals(oldAnalystId).modify({ analystId: nextAnalystId })
    await db.tasks.where('assignedTo').equals(oldAnalystId).modify({ assignedTo: nextAnalystId })
    await db.events.where('analystId').equals(oldAnalystId).modify({ analystId: nextAnalystId })
    await db.timeSessions.where('analystId').equals(oldAnalystId).modify({ analystId: nextAnalystId })
  })
}

