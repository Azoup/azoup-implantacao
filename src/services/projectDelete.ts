import { db } from '../db/database'

export async function deleteProjectCascade(projectId: string): Promise<void> {
  const taskIds = await db.tasks.where('projectId').equals(projectId).primaryKeys()
  for (const tid of taskIds) {
    await db.timeLogs.where('taskId').equals(tid).delete()
    await db.timeSessions.where('taskId').equals(tid).delete()
    await db.comments.where('taskId').equals(tid).delete()
  }
  await db.comments.where('projectId').equals(projectId).delete()
  await db.events.where('projectId').equals(projectId).delete()
  await db.labels.where('projectId').equals(projectId).delete()
  await db.tasks.where('projectId').equals(projectId).delete()
  await db.phases.where('projectId').equals(projectId).delete()
  await db.projectContacts.where('projectId').equals(projectId).delete()
  await db.projects.delete(projectId)
}
