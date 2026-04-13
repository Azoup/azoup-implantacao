import { db } from '../db/database'
import { recalculateProjectHoursUsed } from './hoursAccounting'

/** Alinha `tasks.isInformational` ao catálogo do plano (fase por orderIndex + código). */
export async function syncAllTaskInformationalFromPlan(): Promise<void> {
  const projects = await db.projects.toArray()
  for (const pr of projects) {
    const model = await db.planModels.where('key').equals(pr.planType).first()
    if (!model) continue
    const pps = await db.planPhases.where('planModelId').equals(model.id).sortBy('orderIndex')
    const planByOrder = new Map<number, { code: string; isInformational: boolean }[]>()
    for (const pp of pps) {
      const pts = await db.planTasks.where('planPhaseId').equals(pp.id).sortBy('sortOrder')
      planByOrder.set(
        pp.orderIndex,
        pts.map((t) => ({ code: t.code, isInformational: t.isInformational })),
      )
    }
    const projPhases = await db.phases.where('projectId').equals(pr.id).toArray()
    const orderByPhaseId = new Map(projPhases.map((ph) => [ph.id, ph.orderIndex]))
    const tasks = await db.tasks.where('projectId').equals(pr.id).toArray()
    for (const t of tasks) {
      const oi = orderByPhaseId.get(t.phaseId)
      if (oi === undefined) continue
      const rows = planByOrder.get(oi)
      const row = rows?.find((r) => r.code === t.code)
      if (row && t.isInformational !== row.isInformational) {
        await db.tasks.update(t.id, { isInformational: row.isInformational })
      }
    }
    await recalculateProjectHoursUsed(pr.id)
  }
}
