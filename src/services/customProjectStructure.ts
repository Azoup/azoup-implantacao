import { db } from '../db/database'
import { CUSTOM_PLAN_TYPE } from '../constants/customPlan'
import { uuid } from '../lib/uuid'
import { compareTaskCode } from '../lib/taskCode'
import { planPhaseAccentHex } from '../lib/planLabelDisplay'
import { syncLabelsForProject } from './labels'
import { syncProjectKanbanFromPlanState } from './kanbanPhaseSync'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import {
  enqueuePendingProjectGraphSync,
  upsertProjectGraphFromDexie,
  withDexieSupabaseSyncMuted,
} from '../sync/supabaseDexieBridge'

async function refreshCustomPlanSnapshotMeta(projectId: string): Promise<void> {
  const proj = await db.projects.get(projectId)
  if (!proj || proj.planType !== CUSTOM_PLAN_TYPE) return
  const phases = await db.phases.where('projectId').equals(projectId).toArray()
  const tasks = await db.tasks.where('projectId').equals(projectId).toArray()
  const snap = {
    ...proj.planSnapshot,
    phaseCount: phases.length,
    taskCount: tasks.length,
  }
  await db.projects.update(projectId, { planSnapshot: snap })
}

async function afterStructureChange(projectId: string): Promise<void> {
  await refreshCustomPlanSnapshotMeta(projectId)
  await syncLabelsForProject(projectId)
  await syncProjectKanbanFromPlanState(projectId)
  if (!isSupabaseConfigured()) return
  try {
    await upsertProjectGraphFromDexie(projectId)
  } catch {
    enqueuePendingProjectGraphSync(projectId)
  }
}

async function runMutedGraphTx<T>(fn: () => Promise<T>): Promise<T> {
  if (isSupabaseConfigured()) {
    return withDexieSupabaseSyncMuted(fn)
  }
  return fn()
}

export async function suggestNextProjectTaskCode(projectId: string, phaseId: string): Promise<string> {
  const phases = await db.phases.where('projectId').equals(projectId).sortBy('orderIndex')
  const ph = phases.find((p) => p.id === phaseId)
  const idx = ph ? phases.findIndex((p) => p.id === phaseId) : 0
  const prefix = idx >= 0 ? idx + 1 : 1
  const tasks = await db.tasks.where('phaseId').equals(phaseId).toArray()
  tasks.sort((a, b) => compareTaskCode(a.code, b.code) || a.sortOrder - b.sortOrder)
  const n = tasks.length + 1
  return `${prefix}.${n}`
}

export async function addProjectPhase(
  projectId: string,
  name: string,
  colorHex: string | null,
): Promise<string> {
  const proj = await db.projects.get(projectId)
  if (!proj || proj.planType !== CUSTOM_PLAN_TYPE) throw new Error('Projeto não suporta fases avulsas.')
  const id = uuid()
  await runMutedGraphTx(async () => {
    await db.transaction('rw', db.phases, async () => {
      const existing = await db.phases.where('projectId').equals(projectId).sortBy('orderIndex')
      const orderIndex = existing.length ? existing[existing.length - 1].orderIndex + 1 : 0
      const anyActive = existing.some((p) => p.status === 'ativa')
      await db.phases.add({
        id,
        projectId,
        name: name.trim(),
        orderIndex,
        status: anyActive ? 'bloqueada' : 'ativa',
        colorHex: colorHex?.trim() || planPhaseAccentHex(orderIndex),
      })
    })
  })
  await afterStructureChange(projectId)
  return id
}

export async function updateProjectPhase(phaseId: string, name: string, colorHex: string | null): Promise<void> {
  const ph = await db.phases.get(phaseId)
  if (!ph) throw new Error('Fase não encontrada')
  const proj = await db.projects.get(ph.projectId)
  if (!proj || proj.planType !== CUSTOM_PLAN_TYPE) throw new Error('Operação não permitida.')
  await runMutedGraphTx(async () => {
    await db.phases.update(phaseId, {
      name: name.trim(),
      colorHex: colorHex?.trim() || null,
    })
  })
  await afterStructureChange(ph.projectId)
}

export async function moveProjectPhase(projectId: string, phaseId: string, dir: 'up' | 'down'): Promise<void> {
  const proj = await db.projects.get(projectId)
  if (!proj || proj.planType !== CUSTOM_PLAN_TYPE) throw new Error('Operação não permitida.')
  const phases = await db.phases.where('projectId').equals(projectId).sortBy('orderIndex')
  const i = phases.findIndex((p) => p.id === phaseId)
  if (i < 0) return
  const j = dir === 'up' ? i - 1 : i + 1
  if (j < 0 || j >= phases.length) return
  const a = phases[i]
  const b = phases[j]
  await runMutedGraphTx(async () => {
    await db.transaction('rw', db.phases, async () => {
      await db.phases.update(a.id, { orderIndex: b.orderIndex })
      await db.phases.update(b.id, { orderIndex: a.orderIndex })
    })
  })
  await afterStructureChange(projectId)
}

export async function deleteProjectPhaseCascade(phaseId: string): Promise<void> {
  const ph = await db.phases.get(phaseId)
  if (!ph) return
  const projectId = ph.projectId
  const proj = await db.projects.get(projectId)
  if (!proj || proj.planType !== CUSTOM_PLAN_TYPE) throw new Error('Operação não permitida.')
  await runMutedGraphTx(async () => {
    await db.transaction('rw', db.tasks, db.phases, async () => {
      const taskIds = await db.tasks.where('phaseId').equals(phaseId).primaryKeys()
      for (const tid of taskIds) {
        await db.tasks.delete(tid as string)
      }
      await db.phases.delete(phaseId)
    })
  })
  await afterStructureChange(projectId)
}

export type ProjectTaskFormInput = {
  code: string
  title: string
  description: string
  estimatedHours: number
  isInformational: boolean
}

export async function addProjectTask(
  projectId: string,
  phaseId: string,
  data: ProjectTaskFormInput,
  defaultAssignedTo: string | null,
): Promise<string> {
  const proj = await db.projects.get(projectId)
  if (!proj || proj.planType !== CUSTOM_PLAN_TYPE) throw new Error('Operação não permitida.')
  const ph = await db.phases.get(phaseId)
  if (!ph || ph.projectId !== projectId) throw new Error('Fase inválida.')
  const id = uuid()
  const existing = await db.tasks.where('phaseId').equals(phaseId).toArray()
  const sortOrder = existing.length ? Math.max(...existing.map((t) => t.sortOrder), -1) + 1 : 0
  const now = new Date().toISOString()
  await runMutedGraphTx(async () => {
    await db.tasks.add({
      id,
      projectId,
      phaseId,
      title: data.title.trim(),
      description: data.description.trim(),
      code: data.code.trim(),
      status: 'pendente',
      priority: 'media',
      estimatedHours: data.isInformational ? 0 : Math.max(0, data.estimatedHours),
      actualHours: 0,
      assignedTo: defaultAssignedTo,
      dueDate: null,
      isInformational: data.isInformational,
      createdAt: now,
      sortOrder,
    })
  })
  await afterStructureChange(projectId)
  return id
}

export async function updateProjectTask(taskId: string, data: ProjectTaskFormInput): Promise<void> {
  const t = await db.tasks.get(taskId)
  if (!t) throw new Error('Tarefa não encontrada')
  const proj = await db.projects.get(t.projectId)
  if (!proj || proj.planType !== CUSTOM_PLAN_TYPE) throw new Error('Operação não permitida.')
  await runMutedGraphTx(async () => {
    await db.tasks.update(taskId, {
      code: data.code.trim(),
      title: data.title.trim(),
      description: data.description.trim(),
      estimatedHours: data.isInformational ? 0 : Math.max(0, data.estimatedHours),
      isInformational: data.isInformational,
    })
  })
  await afterStructureChange(t.projectId)
}

export async function deleteProjectTask(taskId: string): Promise<void> {
  const t = await db.tasks.get(taskId)
  if (!t) return
  const projectId = t.projectId
  const proj = await db.projects.get(projectId)
  if (!proj || proj.planType !== CUSTOM_PLAN_TYPE) throw new Error('Operação não permitida.')
  await runMutedGraphTx(async () => {
    await db.tasks.delete(taskId)
  })
  await afterStructureChange(projectId)
}
