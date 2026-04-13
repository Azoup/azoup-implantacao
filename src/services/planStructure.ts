import { db } from '../db/database'
import { uuid } from '../lib/uuid'
import { compareTaskCode } from '../lib/taskCode'

export async function addPlanPhase(planModelId: string, name: string): Promise<string> {
  const phases = await db.planPhases.where('planModelId').equals(planModelId).sortBy('orderIndex')
  const orderIndex = phases.length ? phases[phases.length - 1].orderIndex + 1 : 0
  const id = uuid()
  await db.transaction('rw', db.planPhases, db.planModels, async () => {
    await db.planPhases.add({ id, planModelId, name: name.trim(), orderIndex })
    const n = await db.planPhases.where('planModelId').equals(planModelId).count()
    await db.planModels.update(planModelId, { phaseCount: n })
  })
  return id
}

export async function updatePlanPhase(phaseId: string, name: string): Promise<void> {
  const ph = await db.planPhases.get(phaseId)
  if (!ph) throw new Error('Fase não encontrada')
  await db.planPhases.update(phaseId, { name: name.trim() })
}

export async function deletePlanPhase(phaseId: string): Promise<void> {
  const ph = await db.planPhases.get(phaseId)
  if (!ph) return
  const planModelId = ph.planModelId
  await db.transaction('rw', db.planTasks, db.planPhases, db.planModels, async () => {
    await db.planTasks.where('planPhaseId').equals(phaseId).delete()
    await db.planPhases.delete(phaseId)
    const n = await db.planPhases.where('planModelId').equals(planModelId).count()
    await db.planModels.update(planModelId, { phaseCount: n })
  })
}

export async function movePlanPhase(planModelId: string, phaseId: string, dir: 'up' | 'down'): Promise<void> {
  const phases = await db.planPhases.where('planModelId').equals(planModelId).sortBy('orderIndex')
  const i = phases.findIndex((p) => p.id === phaseId)
  if (i < 0) return
  const j = dir === 'up' ? i - 1 : i + 1
  if (j < 0 || j >= phases.length) return
  const a = phases[i]
  const b = phases[j]
  await db.transaction('rw', db.planPhases, async () => {
    await db.planPhases.update(a.id, { orderIndex: b.orderIndex })
    await db.planPhases.update(b.id, { orderIndex: a.orderIndex })
  })
}

/** Próximo código sugerido ex.: 1.1, 2.3 — baseado na posição da fase e na quantidade de tarefas. */
export async function suggestNextTaskCode(planModelId: string, phaseId: string): Promise<string> {
  const phases = await db.planPhases.where('planModelId').equals(planModelId).sortBy('orderIndex')
  const idx = phases.findIndex((p) => p.id === phaseId)
  const prefix = idx >= 0 ? idx + 1 : 1
  const tasks = await db.planTasks.where('planPhaseId').equals(phaseId).toArray()
  tasks.sort((a, b) => compareTaskCode(a.code, b.code) || a.sortOrder - b.sortOrder)
  const n = tasks.length + 1
  return `${prefix}.${n}`
}

export async function addPlanTask(
  planPhaseId: string,
  data: {
    code: string
    title: string
    description: string
    estimatedHours: number
    isInformational: boolean
  },
): Promise<string> {
  const ph = await db.planPhases.get(planPhaseId)
  if (!ph) throw new Error('Fase não encontrada')
  const existing = await db.planTasks.where('planPhaseId').equals(planPhaseId).toArray()
  const sortOrder = existing.length ? Math.max(...existing.map((t) => t.sortOrder), -1) + 1 : 0
  const id = uuid()
  await db.planTasks.add({
    id,
    planPhaseId,
    code: data.code.trim(),
    title: data.title.trim(),
    description: data.description.trim(),
    estimatedHours: data.isInformational ? 0 : Math.max(0, data.estimatedHours),
    isInformational: data.isInformational,
    sortOrder,
  })
  return id
}

export async function updatePlanTask(
  taskId: string,
  data: {
    code: string
    title: string
    description: string
    estimatedHours: number
    isInformational: boolean
  },
): Promise<void> {
  const t = await db.planTasks.get(taskId)
  if (!t) throw new Error('Tarefa não encontrada')
  await db.planTasks.update(taskId, {
    code: data.code.trim(),
    title: data.title.trim(),
    description: data.description.trim(),
    estimatedHours: data.isInformational ? 0 : Math.max(0, data.estimatedHours),
    isInformational: data.isInformational,
  })
}

export async function deletePlanTask(taskId: string): Promise<void> {
  await db.planTasks.delete(taskId)
}
