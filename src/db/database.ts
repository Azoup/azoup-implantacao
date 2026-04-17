import Dexie, { type EntityTable } from 'dexie'
import { DEFAULT_PLAN_PRESENTATION_URLS, STATIC_PLAN_PRESENTATIONS } from '../constants/planPresentations'
import { inferPhaseColor, normalizePhaseColorHex } from '../constants/phaseProgression'
import type {
  DbAnalyst,
  DbAuditLog,
  DbComment,
  DbEvent,
  DbLabel,
  DbPhase,
  DbPlanModel,
  DbPlanPhase,
  DbPlanTask,
  DbProject,
  DbProjectDeletionLog,
  DbProjectContact,
  DbTask,
  DbTimeLog,
  DbTimeSession,
  DbUser,
} from './types'

export class VyntaskDB extends Dexie {
  users!: EntityTable<DbUser, 'id'>
  analysts!: EntityTable<DbAnalyst, 'id'>
  auditLogs!: EntityTable<DbAuditLog, 'id'>
  planModels!: EntityTable<DbPlanModel, 'id'>
  planPhases!: EntityTable<DbPlanPhase, 'id'>
  planTasks!: EntityTable<DbPlanTask, 'id'>
  projects!: EntityTable<DbProject, 'id'>
  projectDeletionLogs!: EntityTable<DbProjectDeletionLog, 'id'>
  projectContacts!: EntityTable<DbProjectContact, 'id'>
  phases!: EntityTable<DbPhase, 'id'>
  tasks!: EntityTable<DbTask, 'id'>
  events!: EntityTable<DbEvent, 'id'>
  timeLogs!: EntityTable<DbTimeLog, 'id'>
  timeSessions!: EntityTable<DbTimeSession, 'id'>
  comments!: EntityTable<DbComment, 'id'>
  labels!: EntityTable<DbLabel, 'id'>

  constructor() {
    super('vyntask_db')
    this.version(1).stores({
      users: 'id, email, status, role',
      analysts: 'id, active, name',
      planModels: 'id, key, active',
      planPhases: 'id, planModelId, orderIndex',
      planTasks: 'id, planPhaseId, sortOrder, code',
      projects: 'id, status, analystId, kanbanColumn, createdAt, planType',
      projectContacts: 'id, projectId',
      phases: 'id, projectId, orderIndex',
      tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo',
      events: 'id, startTime, analystId, projectId, taskId',
      timeLogs: 'id, taskId, userId, executionDate',
      comments: 'id, createdAt, taskId, projectId, eventId, authorId',
      labels: 'id, projectId, code',
    })
    this.version(2)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType',
        projectContacts: 'id, projectId',
        phases: 'id, projectId, orderIndex',
        tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo',
        events: 'id, startTime, analystId, projectId, taskId',
        timeLogs: 'id, taskId, userId, executionDate',
        comments: 'id, createdAt, taskId, projectId, eventId, authorId',
        labels: 'id, projectId, code',
      })
      .upgrade(async (tx) => {
        const rows = await tx.table('planModels').toArray()
        for (const m of rows as { id: string; key: string; presentationUrl?: string | null }[]) {
          const fromKey = DEFAULT_PLAN_PRESENTATION_URLS[m.key]
          const presentationUrl = m.presentationUrl ?? fromKey ?? null
          const clientDescription = STATIC_PLAN_PRESENTATIONS.find((s) => s.key === m.key)?.blurb ?? null
          await tx.table('planModels').update(m.id, {
            presentationUrl,
            clientDescription,
          })
        }
      })
    this.version(3)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj',
        projectContacts: 'id, projectId',
        phases: 'id, projectId, orderIndex',
        tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo',
        events: 'id, startTime, analystId, projectId, taskId',
        timeLogs: 'id, taskId, userId, executionDate',
        comments: 'id, createdAt, taskId, projectId, eventId, authorId',
        labels: 'id, projectId, code',
      })
      .upgrade(async (tx) => {
        await tx.table('projects').toCollection().modify((p: Record<string, unknown>) => {
          p.cnpj = p.cnpj ?? null
          p.razaoSocial = p.razaoSocial ?? null
          p.tradeName = p.tradeName ?? null
          p.cep = p.cep ?? null
          p.addressStreet = p.addressStreet ?? null
          p.addressNumber = p.addressNumber ?? null
          p.addressComplement = p.addressComplement ?? null
          p.addressNeighborhood = p.addressNeighborhood ?? null
          p.addressCity = p.addressCity ?? null
          p.addressState = p.addressState ?? null
          p.implantationContactName = p.implantationContactName ?? null
          p.implantationContactPhone = p.implantationContactPhone ?? null
          p.corporateEmail = p.corporateEmail ?? null
          p.clientApiId = p.clientApiId ?? null
          p.internalNotes = p.internalNotes ?? null
        })
      })
    this.version(4)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj',
        projectContacts: 'id, projectId',
        phases: 'id, projectId, orderIndex',
        tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo',
        events: 'id, startTime, analystId, projectId, taskId',
        timeLogs: 'id, taskId, userId, executionDate',
        comments: 'id, createdAt, taskId, projectId, eventId, authorId',
        labels: 'id, projectId, code',
      })
      .upgrade(async (tx) => {
        await tx.table('projects').toCollection().modify((p: Record<string, unknown>) => {
          p.stateRegistration = p.stateRegistration ?? null
          p.secondaryCnpj = p.secondaryCnpj ?? null
          p.secondaryRazaoSocial = p.secondaryRazaoSocial ?? null
          p.modulesDescription = p.modulesDescription ?? null
        })
      })
    this.version(5)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj',
        projectContacts: 'id, projectId',
        phases: 'id, projectId, orderIndex',
        tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo',
        events: 'id, startTime, analystId, projectId, taskId',
        timeLogs: 'id, taskId, userId, executionDate',
        comments: 'id, createdAt, taskId, projectId, eventId, authorId',
        labels: 'id, projectId, code',
      })
      .upgrade(async () => {
        const { syncBuiltinPlanTemplates } = await import('./builtinPlans')
        await syncBuiltinPlanTemplates()
      })
    this.version(6)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj',
        projectContacts: 'id, projectId',
        phases: 'id, projectId, orderIndex',
        tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo',
        events: 'id, startTime, analystId, projectId, taskId',
        timeLogs: 'id, taskId, userId, executionDate',
        timeSessions: 'id, taskId, userId, analystId, startedAt, endedAt',
        comments: 'id, createdAt, taskId, projectId, eventId, authorId',
        labels: 'id, projectId, code',
      })
      .upgrade(async () => {
        const { recalculateAllProjectHours } = await import('../services/hoursAccounting')
        await recalculateAllProjectHours()
      })
    this.version(7)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj',
        projectContacts: 'id, projectId',
        phases: 'id, projectId, orderIndex',
        tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo',
        events: 'id, startTime, analystId, projectId, taskId',
        timeLogs: 'id, taskId, userId, executionDate',
        timeSessions: 'id, taskId, userId, analystId, startedAt, endedAt',
        comments: 'id, createdAt, taskId, projectId, eventId, authorId',
        labels: 'id, projectId, code',
      })
      .upgrade(async () => {
        const { syncAllTaskInformationalFromPlan } = await import('../services/syncTaskInformationalFromPlan')
        await syncAllTaskInformationalFromPlan()
      })
    this.version(8)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj',
        projectContacts: 'id, projectId',
        phases: 'id, projectId, orderIndex',
        tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo',
        events: 'id, startTime, analystId, projectId, taskId',
        timeLogs: 'id, taskId, userId, executionDate',
        timeSessions: 'id, taskId, userId, analystId, startedAt, endedAt',
        comments: 'id, createdAt, taskId, projectId, eventId, authorId',
        labels: 'id, projectId, code',
      })
      .upgrade(async (tx) => {
        await tx.table('projects').toCollection().modify((p: Record<string, unknown>) => {
          const key = String(p.planType ?? '')
          const hours = Number(p.hoursContracted ?? 0)
          p.planSnapshotCapturedAt = typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString()
          p.planSnapshot = p.planSnapshot ?? {
            modelId: key,
            key,
            name: key,
            hoursContracted: Number.isFinite(hours) ? hours : 0,
            phaseCount: 0,
            taskCount: 0,
          }
        })
      })
    this.version(9)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj',
        projectContacts: 'id, projectId',
        phases: 'id, projectId, orderIndex',
        tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo',
        events: 'id, startTime, analystId, projectId, taskId',
        timeLogs: 'id, taskId, userId, executionDate',
        timeSessions: 'id, taskId, userId, analystId, startedAt, endedAt',
        comments: 'id, createdAt, taskId, projectId, eventId, authorId',
        labels: 'id, projectId, code',
      })
      .upgrade(async (tx) => {
        const { defaultScopesForRole } = await import('../auth/permissions')
        await tx.table('users').toCollection().modify((u: Record<string, unknown>) => {
          const role = String(u.role ?? 'user') === 'admin' ? 'admin' : 'user'
          const perms = Array.isArray(u.permissions) ? u.permissions : []
          u.permissions = perms.length > 0 ? perms : defaultScopesForRole(role)
        })
      })
    this.version(10).stores({
      users: 'id, email, status, role',
      analysts: 'id, active, name',
      planModels: 'id, key, active',
      planPhases: 'id, planModelId, orderIndex',
      planTasks: 'id, planPhaseId, sortOrder, code',
      projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj',
      projectDeletionLogs: 'id, projectId, deletedByUserId, deletedAt',
      projectContacts: 'id, projectId',
      phases: 'id, projectId, orderIndex',
      tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo',
      events: 'id, startTime, analystId, projectId, taskId',
      timeLogs: 'id, taskId, userId, executionDate',
      timeSessions: 'id, taskId, userId, analystId, startedAt, endedAt',
      comments: 'id, createdAt, taskId, projectId, eventId, authorId',
      labels: 'id, projectId, code',
    })
    this.version(11).stores({
      users: 'id, email, status, role',
      analysts: 'id, active, name',
      auditLogs: 'id, createdAt, action, entity, userId, userEmail',
      planModels: 'id, key, active',
      planPhases: 'id, planModelId, orderIndex',
      planTasks: 'id, planPhaseId, sortOrder, code',
      projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj',
      projectDeletionLogs: 'id, projectId, deletedByUserId, deletedAt',
      projectContacts: 'id, projectId',
      phases: 'id, projectId, orderIndex',
      tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo',
      events: 'id, startTime, analystId, projectId, taskId',
      timeLogs: 'id, taskId, userId, executionDate',
      timeSessions: 'id, taskId, userId, analystId, startedAt, endedAt',
      comments: 'id, createdAt, taskId, projectId, eventId, authorId',
      labels: 'id, projectId, code',
    })
    this.version(12)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name',
        auditLogs: 'id, createdAt, action, entity, userId, userEmail',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj',
        projectDeletionLogs: 'id, projectId, deletedByUserId, deletedAt',
        projectContacts: 'id, projectId',
        phases: 'id, projectId, orderIndex',
        tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo',
        events: 'id, startTime, analystId, projectId, taskId',
        timeLogs: 'id, taskId, userId, executionDate',
        timeSessions: 'id, taskId, userId, analystId, startedAt, endedAt',
        comments: 'id, createdAt, taskId, projectId, eventId, authorId',
        labels: 'id, projectId, code',
      })
      .upgrade(async (tx) => {
        const models = (await tx.table('planModels').toArray()) as { id: string; key: string }[]
        const projects = (await tx.table('projects').toArray()) as { id: string; planType: string }[]
        const phases = (await tx.table('planPhases').toArray()) as {
          id: string
          planModelId: string
          name: string
          orderIndex: number
          colorHex?: string | null
        }[]

        const planKeyByModelId = new Map(models.map((m) => [m.id, m.key]))
        const projectPlanKeyById = new Map(projects.map((p) => [p.id, p.planType]))
        const planColorByKeyOrder = new Map<string, string>()

        for (const ph of phases) {
          const fallback = inferPhaseColor(ph.name ?? '', Number(ph.orderIndex ?? 0))
          const colorHex = normalizePhaseColorHex(ph.colorHex, fallback)
          await tx.table('planPhases').update(ph.id, { colorHex })
          const planKey = planKeyByModelId.get(ph.planModelId)
          if (planKey) planColorByKeyOrder.set(`${planKey}:${ph.orderIndex}`, colorHex)
        }

        await tx.table('phases').toCollection().modify((ph: Record<string, unknown>) => {
          const projectId = String(ph.projectId ?? '')
          const orderIndex = Number(ph.orderIndex ?? 0)
          const name = String(ph.name ?? '')
          const planKey = projectPlanKeyById.get(projectId)
          const fromPlan = planKey ? planColorByKeyOrder.get(`${planKey}:${orderIndex}`) : null
          ph.colorHex = normalizePhaseColorHex(
            (ph.colorHex as string | null | undefined) ?? fromPlan ?? null,
            inferPhaseColor(name, orderIndex),
          )
        })
      })
  }
}

export const db = new VyntaskDB()
