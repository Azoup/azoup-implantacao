import type { DbTask } from '../db/types'

export function projectProgressPercent(tasks: DbTask[], projectId: string): number {
  const mine = tasks.filter((t) => t.projectId === projectId)
  if (!mine.length) return 0
  const done = mine.filter((t) => t.status === 'concluida').length
  return Math.round((done / mine.length) * 100)
}
