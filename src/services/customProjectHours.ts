import { db } from '../db/database'
import { CUSTOM_PLAN_TYPE } from '../constants/customPlan'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { updateProjectPartialInSupabase, withDexieSupabaseSyncMuted } from '../sync/supabaseDexieBridge'

export function billableEstimatedSum(tasks: { estimatedHours: number; isInformational: boolean }[]): number {
  return tasks.filter((t) => !t.isInformational).reduce((s, t) => s + Math.max(0, Number(t.estimatedHours) || 0), 0)
}

export async function getBillableEstimatedSumForProject(projectId: string): Promise<number> {
  const tasks = await db.tasks.where('projectId').equals(projectId).toArray()
  return billableEstimatedSum(tasks)
}

/** Soma das estimativas se aplicar o patch na tarefa `taskId` (ou `null` para nova tarefa). */
export function projectedBillableSumAfterTaskChange(
  tasks: { id: string; projectId: string; estimatedHours: number; isInformational: boolean }[],
  projectId: string,
  taskId: string | null,
  nextEstimated: number,
  nextInformational: boolean,
): number {
  const mine = tasks.filter((t) => t.projectId === projectId)
  let sum = 0
  for (const t of mine) {
    if (taskId && t.id === taskId) {
      if (!nextInformational) sum += Math.max(0, nextEstimated)
      continue
    }
    if (!t.isInformational) sum += Math.max(0, Number(t.estimatedHours) || 0)
  }
  if (!taskId && !nextInformational) sum += Math.max(0, nextEstimated)
  return sum
}

export async function raiseCustomProjectContractHours(projectId: string, nextHours: number): Promise<void> {
  const proj = await db.projects.get(projectId)
  if (!proj || proj.planType !== CUSTOM_PLAN_TYPE) return
  const h = Math.max(0, nextHours)
  const snap = {
    ...proj.planSnapshot,
    hoursContracted: h,
  }
  const patch = { hoursContracted: h, planSnapshot: snap }
  if (isSupabaseConfigured()) {
    await withDexieSupabaseSyncMuted(async () => {
      await updateProjectPartialInSupabase(projectId, patch)
      await db.projects.update(projectId, patch)
    })
  } else {
    await db.projects.update(projectId, patch)
  }
}
