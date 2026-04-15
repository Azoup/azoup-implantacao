import { db } from '../db/database'
import { supabase } from '../lib/supabaseClient'
import type { DbUser } from '../db/types'
import { writeAuditLog } from './auditLogs'

type DeleteProjectAuditInput = {
  projectId: string
  projectName: string
  user: DbUser
  justification: string
}

async function deleteRemoteByProject(projectId: string): Promise<void> {
  if (!supabase) return
  const direct = await supabase.from('projects').delete().eq('id', projectId)
  if (!direct.error) return

  const directMsg = (direct.error.message ?? '').toLowerCase()
  const mustManualCascade = directMsg.includes('foreign key') || directMsg.includes('violates')
  if (!mustManualCascade) {
    throw new Error(`Falha ao excluir projeto remoto: ${direct.error.message}`)
  }

  const taskRows = await supabase.from('tasks').select('id').eq('project_id', projectId)
  if (taskRows.error) throw new Error(`Falha ao consultar tarefas remotas: ${taskRows.error.message}`)
  const taskIds = (taskRows.data ?? [])
    .map((x) => (typeof x.id === 'string' ? x.id : null))
    .filter((x): x is string => !!x)

  if (taskIds.length > 0) {
    const [timeLogsRes, timeSessionsRes, taskCommentsRes] = await Promise.all([
      supabase.from('time_logs').delete().in('task_id', taskIds),
      supabase.from('time_sessions').delete().in('task_id', taskIds),
      supabase.from('comments').delete().in('task_id', taskIds),
    ])
    if (timeLogsRes.error) throw new Error(`Falha ao excluir time_logs remotos: ${timeLogsRes.error.message}`)
    if (timeSessionsRes.error) throw new Error(`Falha ao excluir time_sessions remotos: ${timeSessionsRes.error.message}`)
    if (taskCommentsRes.error) throw new Error(`Falha ao excluir comentários remotos: ${taskCommentsRes.error.message}`)
  }

  const [projectCommentsRes, eventsRes, labelsRes, tasksRes, phasesRes, contactsRes] = await Promise.all([
    supabase.from('comments').delete().eq('project_id', projectId),
    supabase.from('events').delete().eq('project_id', projectId),
    supabase.from('labels').delete().eq('project_id', projectId),
    supabase.from('tasks').delete().eq('project_id', projectId),
    supabase.from('phases').delete().eq('project_id', projectId),
    supabase.from('project_contacts').delete().eq('project_id', projectId),
  ])
  if (projectCommentsRes.error) throw new Error(`Falha ao excluir comentários do projeto: ${projectCommentsRes.error.message}`)
  if (eventsRes.error) throw new Error(`Falha ao excluir eventos remotos: ${eventsRes.error.message}`)
  if (labelsRes.error) throw new Error(`Falha ao excluir labels remotas: ${labelsRes.error.message}`)
  if (tasksRes.error) throw new Error(`Falha ao excluir tarefas remotas: ${tasksRes.error.message}`)
  if (phasesRes.error) throw new Error(`Falha ao excluir fases remotas: ${phasesRes.error.message}`)
  if (contactsRes.error) throw new Error(`Falha ao excluir contatos remotos: ${contactsRes.error.message}`)

  const projectRes = await supabase.from('projects').delete().eq('id', projectId)
  if (projectRes.error) throw new Error(`Falha ao excluir projeto remoto: ${projectRes.error.message}`)
}

async function deleteLocalCascade(projectId: string): Promise<void> {
  const taskIds = (await db.tasks.where('projectId').equals(projectId).primaryKeys()).map(String)
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

export async function recordProjectDeletionLog(input: DeleteProjectAuditInput): Promise<void> {
  const nowIso = new Date().toISOString()
  await db.projectDeletionLogs.put({
    id: crypto.randomUUID(),
    projectId: input.projectId,
    projectName: input.projectName,
    deletedByUserId: input.user.id,
    deletedByUserName: input.user.name,
    deletedByUserEmail: input.user.email,
    justification: input.justification.trim(),
    deletedAt: nowIso,
  })
  await writeAuditLog({
    action: 'exclusao',
    entity: 'projeto',
    entityId: input.projectId,
    entityLabel: input.projectName,
    details: `Projeto excluído com limpeza em cascata de fases, tarefas, agenda e apontamentos.`,
    justification: input.justification,
    user: input.user,
  })
}

export async function deleteProjectCascade(projectId: string): Promise<void> {
  await deleteRemoteByProject(projectId)
  await deleteLocalCascade(projectId)
}
