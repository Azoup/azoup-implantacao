import { db } from '../db/database'
import type { DbProject, KanbanColumn, PlanTypeKey } from '../db/types'
import { CUSTOM_PLAN_LABEL, CUSTOM_PLAN_TYPE } from '../constants/customPlan'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import {
  enqueuePendingProjectGraphSync,
  upsertProjectGraphFromDexie,
  withDexieSupabaseSyncMuted,
} from '../sync/supabaseDexieBridge'
import { uuid } from '../lib/uuid'
import { syncLabelsForProject } from './labels'
import { normalizeProjectPlacement } from './projectGovernance'

export type CreateProjectPayload = Pick<
  DbProject,
  | 'projectName'
  | 'analystId'
  | 'cnpj'
  | 'razaoSocial'
  | 'tradeName'
  | 'cep'
  | 'addressStreet'
  | 'addressNumber'
  | 'addressComplement'
  | 'addressNeighborhood'
  | 'addressCity'
  | 'addressState'
  | 'implantationContactName'
  | 'implantationContactPhone'
  | 'corporateEmail'
  | 'clientApiId'
  | 'internalNotes'
  | 'stateRegistration'
  | 'secondaryCnpj'
  | 'secondaryRazaoSocial'
  | 'modulesDescription'
  | 'startDate'
  | 'dueDate'
> & {
  planKey: PlanTypeKey
  ownerId: string
  createdBy: string
  kanbanColumn?: KanbanColumn
}

export type CreateCustomProjectPayload = Omit<CreateProjectPayload, 'planKey'> & {
  /** Teto inicial de horas (política híbrida B); pode ser elevado depois com confirmação. */
  hoursContracted: number
}

export async function createCustomProject(opts: CreateCustomProjectPayload): Promise<string> {
  const projectId = uuid()
  const startDate = opts.startDate ?? new Date().toISOString()
  const placement = normalizeProjectPlacement({
    status: 'ativo',
    kanbanColumn: opts.kanbanColumn ?? 'novos',
  })
  const now = new Date().toISOString()
  const hrs = Math.max(0, Number(opts.hoursContracted) || 0)
  const row: DbProject = {
    id: projectId,
    projectName: opts.projectName.trim(),
    planType: CUSTOM_PLAN_TYPE,
    hoursContracted: hrs,
    hoursUsed: 0,
    startDate,
    dueDate: opts.dueDate,
    status: placement.status,
    ownerId: opts.ownerId,
    analystId: opts.analystId,
    createdBy: opts.createdBy,
    createdAt: now,
    kanbanColumn: placement.kanbanColumn,
    cnpj: opts.cnpj,
    razaoSocial: opts.razaoSocial,
    tradeName: opts.tradeName,
    cep: opts.cep,
    addressStreet: opts.addressStreet,
    addressNumber: opts.addressNumber,
    addressComplement: opts.addressComplement,
    addressNeighborhood: opts.addressNeighborhood,
    addressCity: opts.addressCity,
    addressState: opts.addressState,
    implantationContactName: opts.implantationContactName,
    implantationContactPhone: opts.implantationContactPhone,
    corporateEmail: opts.corporateEmail,
    clientApiId: opts.clientApiId,
    internalNotes: opts.internalNotes,
    stateRegistration: opts.stateRegistration,
    secondaryCnpj: opts.secondaryCnpj,
    secondaryRazaoSocial: opts.secondaryRazaoSocial,
    modulesDescription: opts.modulesDescription,
    planSnapshotCapturedAt: now,
    planSnapshot: {
      mode: 'custom',
      modelId: null,
      key: 'custom',
      name: CUSTOM_PLAN_LABEL,
      hoursContracted: hrs,
      phaseCount: 0,
      taskCount: 0,
    },
  }

  const build = async () => {
    await db.projects.add(row)
  }

  if (isSupabaseConfigured()) {
    try {
      await withDexieSupabaseSyncMuted(async () => {
        await build()
        await upsertProjectGraphFromDexie(projectId)
      })
    } catch (e) {
      const detail = e instanceof Error ? e.message : 'Falha desconhecida'
      enqueuePendingProjectGraphSync(projectId)
      console.warn('[Supabase] projeto avulso enfileirado para re-sync', { projectId, detail })
    }
  } else {
    await build()
  }

  await syncLabelsForProject(projectId)
  return projectId
}

export async function createProjectFromPlan(opts: CreateProjectPayload): Promise<string> {
  const plan = await db.planModels.where('key').equals(opts.planKey).first()
  if (!plan) throw new Error('Plano não encontrado')

  const planPhases = await db.planPhases.where('planModelId').equals(plan.id).sortBy('orderIndex')
  let planTaskCount = 0
  for (const ph of planPhases) {
    planTaskCount += await db.planTasks.where('planPhaseId').equals(ph.id).count()
  }
  const projectId = uuid()

  const startDate = opts.startDate ?? new Date().toISOString()
  const placement = normalizeProjectPlacement({
    status: 'ativo',
    /** Padrão Fase 00 do plano (tarefas 0.x); demais colunas seguem o avanço das fases. */
    kanbanColumn: opts.kanbanColumn ?? 'novos',
  })
  const now = new Date().toISOString()
  const row: DbProject = {
    id: projectId,
    projectName: opts.projectName.trim(),
    planType: opts.planKey,
    hoursContracted: plan.hoursContracted,
    hoursUsed: 0,
    startDate,
    dueDate: opts.dueDate,
    status: placement.status,
    ownerId: opts.ownerId,
    analystId: opts.analystId,
    createdBy: opts.createdBy,
    createdAt: now,
    kanbanColumn: placement.kanbanColumn,
    cnpj: opts.cnpj,
    razaoSocial: opts.razaoSocial,
    tradeName: opts.tradeName,
    cep: opts.cep,
    addressStreet: opts.addressStreet,
    addressNumber: opts.addressNumber,
    addressComplement: opts.addressComplement,
    addressNeighborhood: opts.addressNeighborhood,
    addressCity: opts.addressCity,
    addressState: opts.addressState,
    implantationContactName: opts.implantationContactName,
    implantationContactPhone: opts.implantationContactPhone,
    corporateEmail: opts.corporateEmail,
    clientApiId: opts.clientApiId,
    internalNotes: opts.internalNotes,
    stateRegistration: opts.stateRegistration,
    secondaryCnpj: opts.secondaryCnpj,
    secondaryRazaoSocial: opts.secondaryRazaoSocial,
    modulesDescription: opts.modulesDescription,
    planSnapshotCapturedAt: now,
    planSnapshot: {
      modelId: plan.id,
      key: plan.key,
      name: plan.name,
      hoursContracted: plan.hoursContracted,
      phaseCount: plan.phaseCount,
      taskCount: planTaskCount,
    },
  }

  const buildGraphInDexie = async () => {
    await db.transaction('rw', db.projects, db.phases, db.tasks, db.planTasks, async () => {
      await db.projects.add(row)

      let idx = 0
      for (const pp of planPhases) {
        const phaseId = uuid()
        await db.phases.add({
          id: phaseId,
          projectId,
          name: pp.name,
          orderIndex: pp.orderIndex,
          status: idx++ === 0 ? 'ativa' : 'bloqueada',
          colorHex: pp.colorHex ?? null,
        })

        const planTasks = await db.planTasks.where('planPhaseId').equals(pp.id).sortBy('sortOrder')
        let so = 0
        for (const pt of planTasks) {
          await db.tasks.add({
            id: uuid(),
            title: pt.title,
            description: pt.description,
            projectId,
            phaseId,
            status: 'pendente',
            priority: 'media',
            estimatedHours: pt.estimatedHours,
            actualHours: 0,
            assignedTo: opts.analystId,
            dueDate: null,
            isInformational: pt.isInformational,
            isAdHoc: false,
            createdAt: new Date().toISOString(),
            code: pt.code,
            sortOrder: so++,
          })
        }
      }
    })
  }

  if (isSupabaseConfigured()) {
    // Evita tempestade de requests (hooks por linha + sync explícito do grafo).
    try {
      await withDexieSupabaseSyncMuted(async () => {
        await buildGraphInDexie()
        await upsertProjectGraphFromDexie(projectId)
      })
    } catch (e) {
      const detail = e instanceof Error ? e.message : 'Falha desconhecida'
      enqueuePendingProjectGraphSync(projectId)
      // Mantém a UX responsiva: salva local e agenda reenvio automático da estrutura na nuvem.
      console.warn('[Supabase] projeto enfileirado para re-sync em background', { projectId, detail })
    }
  } else {
    await buildGraphInDexie()
  }

  await syncLabelsForProject(projectId)
  return projectId
}
