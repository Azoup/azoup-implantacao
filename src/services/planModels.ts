import { db } from '../db/database'
import type { DbPlanModel } from '../db/types'
import { uuid } from '../lib/uuid'
import { compareTaskCode } from '../lib/taskCode'

export async function ensureUniquePlanKey(base: string): Promise<string> {
  let k = base
  let n = 2
  while (await db.planModels.where('key').equals(k).first()) {
    k = `${base}-${n++}`
  }
  return k
}

export async function duplicatePlanModel(opts: {
  sourcePlanId: string
  name: string
  key: string
  hoursContracted: number
  presentationUrl: string | null
}): Promise<string> {
  const source = await db.planModels.get(opts.sourcePlanId)
  if (!source) throw new Error('Modelo de origem não encontrado')

  const phases = await db.planPhases.where('planModelId').equals(opts.sourcePlanId).sortBy('orderIndex')
  const newPlanId = uuid()

  await db.transaction('rw', db.planModels, db.planPhases, db.planTasks, async () => {
    await db.planModels.add({
      id: newPlanId,
      key: opts.key,
      name: opts.name.trim(),
      hoursContracted: opts.hoursContracted,
      phaseCount: phases.length,
      active: true,
      presentationUrl: opts.presentationUrl,
      clientDescription: null,
    })

    for (const ph of phases) {
      const newPhaseId = uuid()
      const tasks = await db.planTasks.where('planPhaseId').equals(ph.id).toArray()
      tasks.sort((a, b) => a.sortOrder - b.sortOrder || compareTaskCode(a.code, b.code))

      await db.planPhases.add({
        id: newPhaseId,
        planModelId: newPlanId,
        name: ph.name,
        orderIndex: ph.orderIndex,
      })
      for (const t of tasks) {
        await db.planTasks.add({
          id: uuid(),
          planPhaseId: newPhaseId,
          code: t.code,
          title: t.title,
          description: t.description,
          estimatedHours: t.estimatedHours,
          isInformational: t.isInformational,
          sortOrder: t.sortOrder,
        })
      }
    }
  })

  return newPlanId
}

/** Plano sem fases — para montar estrutura manualmente na tela de modelos. */
export async function createBlankPlanModel(opts: {
  name: string
  key: string
  hoursContracted: number
  presentationUrl: string | null
}): Promise<string> {
  const id = uuid()
  await db.planModels.add({
    id,
    key: opts.key,
    name: opts.name.trim(),
    hoursContracted: Math.max(1, Math.round(opts.hoursContracted)),
    phaseCount: 0,
    active: true,
    presentationUrl: opts.presentationUrl,
    clientDescription: null,
  })
  return id
}

export async function updatePlanModel(
  id: string,
  patch: Partial<Pick<DbPlanModel, 'name' | 'hoursContracted' | 'presentationUrl' | 'active' | 'clientDescription'>>,
): Promise<void> {
  const cur = await db.planModels.get(id)
  if (!cur) throw new Error('Plano não encontrado')
  await db.planModels.update(id, patch)
}

export async function countProjectsUsingPlanKey(key: string): Promise<number> {
  return db.projects.where('planType').equals(key).count()
}

export async function deletePlanModel(id: string): Promise<void> {
  const m = await db.planModels.get(id)
  if (!m) return
  if (m.key === 'basic' || m.key === 'pro' || m.key === 'master') {
    throw new Error('Não é possível excluir os planos Basic, Pró e Master.')
  }
  const n = await countProjectsUsingPlanKey(m.key)
  if (n > 0) throw new Error(`Há ${n} projeto(s) usando este plano. Altere-os antes de excluir.`)

  const phases = await db.planPhases.where('planModelId').equals(id).toArray()
  await db.transaction('rw', db.planModels, db.planPhases, db.planTasks, async () => {
    for (const ph of phases) {
      await db.planTasks.where('planPhaseId').equals(ph.id).delete()
    }
    await db.planPhases.where('planModelId').equals(id).delete()
    await db.planModels.delete(id)
  })
}
