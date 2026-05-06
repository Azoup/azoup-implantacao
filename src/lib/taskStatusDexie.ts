import type { DbTask, TaskStatus } from '../db/types'

export type TaskStatusDexiePatch = Partial<Pick<DbTask, 'completedAt' | 'cancelledAt'>> & { status: TaskStatus }

/** Metadados de término para Dexie alinhados ao status (KPIs do dashboard usam essas datas). */
export function taskStatusDexiePatch(prev: TaskStatus, next: TaskStatus, nowIso: string): TaskStatusDexiePatch {
  const patch: TaskStatusDexiePatch = { status: next }
  if (next === 'concluida') {
    patch.completedAt = nowIso
    patch.cancelledAt = null
  } else if (next === 'cancelado') {
    patch.cancelledAt = nowIso
    patch.completedAt = null
  } else {
    if (prev === 'concluida') patch.completedAt = null
    if (prev === 'cancelado') patch.cancelledAt = null
  }
  return patch
}
