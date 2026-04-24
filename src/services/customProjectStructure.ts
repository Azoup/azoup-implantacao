import { db } from '../db/database'
import type { DbProject, DbTask } from '../db/types'
import { CUSTOM_PLAN_TYPE } from '../constants/customPlan'
import { uuid } from '../lib/uuid'
import { compareTaskCode } from '../lib/taskCode'
import { planPhaseAccentHex } from '../lib/planLabelDisplay'
import { syncLabelsForProject } from './labels'
import { syncProjectKanbanFromPlanState } from './kanbanPhaseSync'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { getUserForAudit, writeAuditLog } from './auditLogs'
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
  /**
   * Sync do grafo completo na nuvem não deve bloquear a gravação no Dexie (timeouts/retries de até ~60s por etapa).
   * O dado já está local; falhas entram na fila e são retentadas ao focar a aba / voltar online.
   */
  void (async () => {
    try {
      await upsertProjectGraphFromDexie(projectId)
    } catch {
      enqueuePendingProjectGraphSync(projectId)
    }
  })()
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
  /** Alinha ao catálogo (Fase 00 → 0.x, Fase 01 → 1.x…): usa `orderIndex`, não posição no array. */
  const prefix = ph ? ph.orderIndex : 0
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

export type ProjectTaskAuditInput = {
  actorUserId: string
  justification: string
}

function taskToFormSnapshot(t: DbTask, proj: DbProject): ProjectTaskFormInput {
  const isCustom = proj.planType === CUSTOM_PLAN_TYPE
  if (isCustom) {
    return {
      code: t.code,
      title: t.title,
      description: t.description,
      estimatedHours: t.estimatedHours,
      isInformational: t.isInformational,
    }
  }
  return {
    code: t.code,
    title: t.title,
    description: t.description,
    estimatedHours: 0,
    isInformational: false,
  }
}

function describeProjectTaskFormDiff(before: ProjectTaskFormInput, after: ProjectTaskFormInput): string {
  const bits: string[] = []
  if (before.code !== after.code) bits.push(`Código: "${before.code}" → "${after.code}"`)
  if (before.title !== after.title) bits.push(`Título: "${before.title}" → "${after.title}"`)
  if (before.description !== after.description) bits.push('Descrição alterada.')
  if (before.estimatedHours !== after.estimatedHours)
    bits.push(`Estimativa: ${before.estimatedHours}h → ${after.estimatedHours}h`)
  if (before.isInformational !== after.isInformational)
    bits.push(`Informativa: ${before.isInformational ? 'sim' : 'não'} → ${after.isInformational ? 'sim' : 'não'}`)
  return bits.join(' · ') || 'Campos sem diferença detectável.'
}

export type AddProjectTaskOptions = {
  /**
   * Projeto com plano de catálogo: tarefa extra na fase. Estimativa fixa em 0;
   * não altera a baseline de previsão do plano — só horas reais (timesheet / logs).
   */
  catalogAdHoc?: boolean
}

export async function addProjectTask(
  projectId: string,
  phaseId: string,
  data: ProjectTaskFormInput,
  defaultAssignedTo: string | null,
  opts?: AddProjectTaskOptions,
): Promise<string> {
  const proj = await db.projects.get(projectId)
  if (!proj) throw new Error('Projeto não encontrado.')
  const catalogAdHoc = Boolean(opts?.catalogAdHoc)
  if (catalogAdHoc) {
    if (proj.planType === CUSTOM_PLAN_TYPE) {
      throw new Error('Em plano avulso use a criação normal de tarefas (com estimativa).')
    }
  } else if (proj.planType !== CUSTOM_PLAN_TYPE) {
    throw new Error('Operação não permitida.')
  }
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
      estimatedHours: catalogAdHoc ? 0 : data.isInformational ? 0 : Math.max(0, data.estimatedHours),
      actualHours: 0,
      assignedTo: defaultAssignedTo,
      dueDate: null,
      isInformational: catalogAdHoc ? false : data.isInformational,
      isAdHoc: catalogAdHoc,
      createdAt: now,
      sortOrder,
    })
  })
  await afterStructureChange(projectId)
  return id
}

export async function updateProjectTask(
  taskId: string,
  data: ProjectTaskFormInput,
  audit?: ProjectTaskAuditInput,
): Promise<void> {
  const t = await db.tasks.get(taskId)
  if (!t) throw new Error('Tarefa não encontrada')
  const proj = await db.projects.get(t.projectId)
  if (!proj) throw new Error('Projeto não encontrado.')
  const isCustom = proj.planType === CUSTOM_PLAN_TYPE
  if (!isCustom && t.isAdHoc !== true) throw new Error('Operação não permitida.')
  const beforeSnap = taskToFormSnapshot(t, proj)
  const next: ProjectTaskFormInput = isCustom
    ? {
        code: data.code.trim(),
        title: data.title.trim(),
        description: data.description.trim(),
        estimatedHours: data.isInformational ? 0 : Math.max(0, data.estimatedHours),
        isInformational: data.isInformational,
      }
    : {
        code: data.code.trim(),
        title: data.title.trim(),
        description: data.description.trim(),
        estimatedHours: 0,
        isInformational: false,
      }
  await runMutedGraphTx(async () => {
    if (isCustom) {
      await db.tasks.update(taskId, {
        code: next.code,
        title: next.title,
        description: next.description,
        estimatedHours: next.estimatedHours,
        isInformational: next.isInformational,
      })
    } else {
      await db.tasks.update(taskId, {
        code: next.code,
        title: next.title,
        description: next.description,
        estimatedHours: 0,
        isInformational: false,
      })
    }
  })
  if (audit) {
    const diff = describeProjectTaskFormDiff(beforeSnap, next)
    const user = await getUserForAudit(audit.actorUserId)
    await writeAuditLog({
      action: 'alteracao',
      entity: 'tarefa',
      entityId: taskId,
      entityLabel: `${next.code} ${next.title}`,
      details: `Alteração na tarefa do projeto (${proj.projectName}). ${diff}`,
      justification: audit.justification.trim(),
      user,
    })
  }
  await afterStructureChange(t.projectId)
}

export async function deleteProjectTask(taskId: string, audit?: ProjectTaskAuditInput): Promise<void> {
  const t = await db.tasks.get(taskId)
  if (!t) return
  const projectId = t.projectId
  const proj = await db.projects.get(projectId)
  if (!proj) return
  const isCustom = proj.planType === CUSTOM_PLAN_TYPE
  if (!isCustom && t.isAdHoc !== true) throw new Error('Operação não permitida.')
  const label = `${t.code} ${t.title}`
  const details = `Exclusão da tarefa ${t.code} (${proj.projectName}). Título: ${t.title}.`
  await runMutedGraphTx(async () => {
    await db.tasks.delete(taskId)
  })
  if (audit) {
    const user = await getUserForAudit(audit.actorUserId)
    await writeAuditLog({
      action: 'exclusao',
      entity: 'tarefa',
      entityId: taskId,
      entityLabel: label,
      details,
      justification: audit.justification.trim(),
      user,
    })
  }
  await afterStructureChange(projectId)
}
