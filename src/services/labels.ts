import { compareTaskCode } from '../lib/taskCode'
import { uuid } from '../lib/uuid'
import { db } from '../db/database'
import type { LabelStatus } from '../db/types'

/** Uma label por código de tarefa operacional; estado derivado das tarefas do projeto. */
export async function syncLabelsForProject(projectId: string): Promise<void> {
  const tasks = (await db.tasks.where('projectId').equals(projectId).toArray()).filter(
    (t) => !t.isInformational,
  )
  const codes = [...new Set(tasks.map((t) => t.code))].sort(compareTaskCode)

  const firstOpen = codes.find((code) => {
    const subset = tasks.filter((t) => t.code === code)
    return subset.some((t) => t.status !== 'concluida' && t.status !== 'cancelado')
  })

  const existingRows = await db.labels.where('projectId').equals(projectId).toArray()

  for (const code of codes) {
    const subset = tasks
      .filter((t) => t.code === code)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const title = subset[0]?.title ?? code

    const allDone = subset.every((t) => t.status === 'concluida' || t.status === 'cancelado')
    const anyDone = subset.some((t) => t.status === 'concluida')
    const anyProg = subset.some((t) => t.status === 'em_andamento')

    let status: LabelStatus = 'not_started'
    if (allDone && anyDone) status = 'completed'
    else if (anyProg || code === firstOpen) status = 'in_progress'

    const existing = existingRows.find((l) => l.code === code)
    if (existing) {
      await db.labels.update(existing.id, { name: title, status })
    } else {
      await db.labels.add({
        id: uuid(),
        projectId,
        code,
        name: title,
        status,
      })
    }
  }
}
