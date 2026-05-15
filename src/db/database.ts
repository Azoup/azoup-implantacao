import Dexie, { type EntityTable } from 'dexie'
import { defaultScopesForRole } from '../auth/permissions'
import { DEFAULT_PLAN_PRESENTATION_URLS, STATIC_PLAN_PRESENTATIONS } from '../constants/planPresentations'
import { inferPhaseColor, normalizePhaseColorHex } from '../constants/phaseProgression'
import { recalculateAllProjectHours } from '../services/hoursAccounting'
import { syncAllTaskInformationalFromPlan } from '../services/syncTaskInformationalFromPlan'
import { syncBuiltinPlanTemplates } from './builtinPlans'
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

export class ImplantacaoAzoupDB extends Dexie {
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
    // Nome interno IndexedDB legado; renomear sem migração anula dados offline.
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
    this.version(13)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name, profileId',
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
        await tx.table('analysts').toCollection().modify((a: Record<string, unknown>) => {
          if (a.profileId === undefined) a.profileId = null
        })
      })
    this.version(14)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name, profileId',
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
        for (const name of ['projects', 'phases', 'tasks'] as const) {
          await tx.table(name).toCollection().modify((row: Record<string, unknown>) => {
            if (row.remoteUpdatedAt === undefined) row.remoteUpdatedAt = null
          })
        }
      })
    this.version(15)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name, profileId',
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
        await tx.table('tasks').toCollection().modify((row: Record<string, unknown>) => {
          if (row.isAdHoc === undefined) row.isAdHoc = false
        })
      })
    this.version(16)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name, profileId',
        auditLogs: 'id, createdAt, action, entity, userId, userEmail',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj, lastManualCheckinAt',
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
        await tx.table('projects').toCollection().modify((row: Record<string, unknown>) => {
          if (row.lastManualCheckinAt === undefined) row.lastManualCheckinAt = null
          if (row.lastManualCheckinBy === undefined) row.lastManualCheckinBy = null
        })
      })
    this.version(17)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name, profileId',
        auditLogs: 'id, createdAt, action, entity, userId, userEmail',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj, lastManualCheckinAt',
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
        await tx.table('tasks').toCollection().modify((row: Record<string, unknown>) => {
          if (row.completedAt === undefined) row.completedAt = null
          if (row.cancelledAt === undefined) row.cancelledAt = null
        })
        const logs = (await tx.table('auditLogs').toArray()) as {
          entity?: string
          entityId?: string | null
          details?: string
          createdAt?: string
        }[]
        const completionByTask = new Map<string, string>()
        const cancelByTask = new Map<string, string>()
        for (const log of logs) {
          if (log.entity !== 'tarefa' || !log.entityId || !log.details || !log.createdAt) continue
          if (log.details.includes(' para concluida')) {
            const prev = completionByTask.get(log.entityId)
            if (!prev || log.createdAt > prev) completionByTask.set(log.entityId, log.createdAt)
          }
          if (log.details.includes(' para cancelado')) {
            const prev = cancelByTask.get(log.entityId)
            if (!prev || log.createdAt > prev) cancelByTask.set(log.entityId, log.createdAt)
          }
        }
        await tx.table('tasks').toCollection().modify((row: Record<string, unknown>) => {
          if (row.status === 'concluida' && !row.completedAt) {
            const fromAudit = completionByTask.get(String(row.id ?? ''))
            if (fromAudit) row.completedAt = fromAudit
          }
          if (row.status === 'cancelado' && !row.cancelledAt) {
            const fromAudit = cancelByTask.get(String(row.id ?? ''))
            if (fromAudit) row.cancelledAt = fromAudit
          }
        })
      })
    this.version(18)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name, profileId',
        auditLogs: 'id, createdAt, action, entity, userId, userEmail',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj, lastManualCheckinAt',
        projectDeletionLogs: 'id, projectId, deletedByUserId, deletedAt',
        projectContacts: 'id, projectId',
        phases: 'id, projectId, orderIndex',
        tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo,rescheduledFromTaskId,rescheduledToTaskId,cancellationReason',
        events: 'id, startTime, analystId, projectId, taskId',
        timeLogs: 'id, taskId, userId, executionDate',
        timeSessions: 'id, taskId, userId, analystId, startedAt, endedAt',
        comments: 'id, createdAt, taskId, projectId, eventId, authorId',
        labels: 'id, projectId, code',
      })
      .upgrade(async (tx) => {
        await tx.table('tasks').toCollection().modify((row: Record<string, unknown>) => {
          if (row.cancellationReason === undefined) row.cancellationReason = null
          if (row.rescheduledFromTaskId === undefined) row.rescheduledFromTaskId = null
          if (row.rescheduledToTaskId === undefined) row.rescheduledToTaskId = null
        })
      })
    this.version(19)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name, profileId',
        auditLogs: 'id, createdAt, action, entity, userId, userEmail',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj, lastManualCheckinAt',
        projectDeletionLogs: 'id, projectId, deletedByUserId, deletedAt',
        projectContacts: 'id, projectId',
        phases: 'id, projectId, orderIndex',
        tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo,rescheduledFromTaskId,rescheduledToTaskId,cancellationReason,completedManualOverride,cancelledManually',
        events: 'id, startTime, analystId, projectId, taskId, status',
        timeLogs: 'id, taskId, userId, executionDate',
        timeSessions: 'id, taskId, userId, analystId, startedAt, endedAt',
        comments: 'id, createdAt, taskId, projectId, eventId, authorId',
        labels: 'id, projectId, code',
      })
      .upgrade(async (tx) => {
        await tx.table('tasks').toCollection().modify((row: Record<string, unknown>) => {
          if (row.completedManualOverride === undefined) row.completedManualOverride = false
          if (row.completedManualOverrideReason === undefined) row.completedManualOverrideReason = null
          if (row.cancelledManually === undefined) {
            row.cancelledManually =
              row.status === 'cancelado' && !row.rescheduledToTaskId
          }
        })
      })
    this.version(20)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name, profileId',
        auditLogs: 'id, createdAt, action, entity, userId, userEmail',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj, lastManualCheckinAt',
        projectDeletionLogs: 'id, projectId, deletedByUserId, deletedAt',
        projectContacts: 'id, projectId',
        phases: 'id, projectId, orderIndex',
        tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo,rescheduledFromTaskId,rescheduledToTaskId,cancellationReason,completedManualOverride,cancelledManually',
        events: 'id, startTime, analystId, projectId, taskId, status',
        timeLogs: 'id, taskId, userId, executionDate',
        timeSessions: 'id, taskId, userId, analystId, startedAt, endedAt',
        comments: 'id, createdAt, taskId, projectId, eventId, authorId',
        labels: 'id, projectId, code',
      })
      .upgrade(async (tx) => {
        await tx.table('projects').toCollection().modify((row: Record<string, unknown>) => {
          if (row.manualAttentionNote === undefined) row.manualAttentionNote = null
          if (row.manualAttentionAt === undefined) row.manualAttentionAt = null
          if (row.manualAttentionBy === undefined) row.manualAttentionBy = null
        })
      })
    this.version(21)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name, profileId',
        auditLogs: 'id, createdAt, action, entity, userId, userEmail',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj, lastManualCheckinAt, clientType',
        projectDeletionLogs: 'id, projectId, deletedByUserId, deletedAt',
        projectContacts: 'id, projectId',
        phases: 'id, projectId, orderIndex',
        tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo,rescheduledFromTaskId,rescheduledToTaskId,cancellationReason,completedManualOverride,cancelledManually',
        events: 'id, startTime, analystId, projectId, taskId, status',
        timeLogs: 'id, taskId, userId, executionDate',
        timeSessions: 'id, taskId, userId, analystId, startedAt, endedAt',
        comments: 'id, createdAt, taskId, projectId, eventId, authorId',
        labels: 'id, projectId, code',
      })
      .upgrade(async (tx) => {
        await tx.table('projects').toCollection().modify((row: Record<string, unknown>) => {
          if (row.clientType === undefined) row.clientType = 'generico'
        })
      })

    this.version(22)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name, profileId',
        auditLogs: 'id, createdAt, action, entity, userId, userEmail',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj, lastManualCheckinAt, clientType',
        projectDeletionLogs: 'id, projectId, deletedByUserId, deletedAt',
        projectContacts: 'id, projectId',
        phases: 'id, projectId, orderIndex',
        tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo,rescheduledFromTaskId,rescheduledToTaskId,cancellationReason,completedManualOverride,cancelledManually',
        events: 'id, startTime, analystId, projectId, taskId, status',
        timeLogs: 'id, taskId, userId, executionDate',
        timeSessions: 'id, taskId, userId, analystId, startedAt, endedAt',
        comments: 'id, createdAt, taskId, projectId, eventId, authorId',
        labels: 'id, projectId, code',
      })
      .upgrade(async (tx) => {
        // Unifica o status operacional: "pausado" -> "congelado".
        await tx.table('projects').toCollection().modify((row: Record<string, unknown>) => {
          if (row.status === 'pausado') row.status = 'congelado'
        })
      })

    this.version(23)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name, profileId',
        auditLogs: 'id, createdAt, action, entity, userId, userEmail',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj, lastManualCheckinAt, clientType',
        projectDeletionLogs: 'id, projectId, deletedByUserId, deletedAt',
        projectContacts: 'id, projectId',
        phases: 'id, projectId, orderIndex',
        tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo,rescheduledFromTaskId,rescheduledToTaskId,cancellationReason,completedManualOverride,cancelledManually',
        events: 'id, startTime, analystId, projectId, taskId, status',
        timeLogs: 'id, taskId, userId, executionDate',
        timeSessions: 'id, taskId, userId, analystId, startedAt, endedAt',
        comments: 'id, createdAt, taskId, projectId, eventId, authorId',
        labels: 'id, projectId, code',
      })
      .upgrade(async (tx) => {
        await tx.table('projects').toCollection().modify((row: Record<string, unknown>) => {
          if (row.freezeTimeline === undefined) row.freezeTimeline = []
        })
      })

    this.version(24)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name, profileId',
        auditLogs: 'id, createdAt, action, entity, userId, userEmail',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj, lastManualCheckinAt, clientType',
        projectDeletionLogs: 'id, projectId, deletedByUserId, deletedAt',
        projectContacts: 'id, projectId',
        phases: 'id, projectId, orderIndex',
        tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo,rescheduledFromTaskId,rescheduledToTaskId,cancellationReason,completedManualOverride,cancelledManually',
        events: 'id, startTime, analystId, projectId, taskId, status',
        timeLogs: 'id, taskId, userId, executionDate',
        timeSessions: 'id, taskId, userId, analystId, startedAt, endedAt',
        comments: 'id, createdAt, taskId, projectId, eventId, authorId',
        labels: 'id, projectId, code',
      })
      .upgrade(async (tx) => {
        await tx.table('projects').toCollection().modify((row: Record<string, unknown>) => {
          if (row.status === 'inativo') row.status = 'cancelado'
        })
      })

    this.version(25)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name, profileId',
        auditLogs: 'id, createdAt, action, entity, userId, userEmail',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj, lastManualCheckinAt, clientType',
        projectDeletionLogs: 'id, projectId, deletedByUserId, deletedAt',
        projectContacts: 'id, projectId',
        phases: 'id, projectId, orderIndex',
        tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo,rescheduledFromTaskId,rescheduledToTaskId,cancellationReason,completedManualOverride,cancelledManually',
        events: 'id, startTime, analystId, projectId, taskId, status',
        timeLogs: 'id, taskId, userId, executionDate',
        timeSessions: 'id, taskId, userId, analystId, startedAt, endedAt',
        comments: 'id, createdAt, taskId, projectId, eventId, authorId',
        labels: 'id, projectId, code',
      })
      .upgrade(async (tx) => {
        await tx.table('projects').toCollection().modify((row: Record<string, unknown>) => {
          if (row.cancelledAt !== undefined) return
          row.cancelledAt = null
          if (row.status === 'cancelado' && row.createdAt) {
            const ca = String(row.createdAt).slice(0, 10)
            if (/^\d{4}-\d{2}-\d{2}$/.test(ca)) row.cancelledAt = `${ca}T12:00:00.000Z`
          }
        })
      })

    this.version(26)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name, profileId',
        auditLogs: 'id, createdAt, action, entity, userId, userEmail',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj, lastManualCheckinAt, clientType',
        projectDeletionLogs: 'id, projectId, deletedByUserId, deletedAt',
        projectContacts: 'id, projectId',
        phases: 'id, projectId, orderIndex',
        tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo,rescheduledFromTaskId,rescheduledToTaskId,cancellationReason,completedManualOverride,cancelledManually',
        events: 'id, startTime, analystId, projectId, taskId, status, googleEventId',
        timeLogs: 'id, taskId, userId, executionDate',
        timeSessions: 'id, taskId, userId, analystId, startedAt, endedAt',
        comments: 'id, createdAt, taskId, projectId, eventId, authorId',
        labels: 'id, projectId, code',
      })
      .upgrade(async (tx) => {
        await tx.table('events').toCollection().modify((row: Record<string, unknown>) => {
          if (row.googleEventId === undefined) row.googleEventId = null
          if (row.googleCalendarId === undefined) row.googleCalendarId = null
          if (row.googleSyncStatus === undefined) row.googleSyncStatus = null
          if (row.googleUpdatedAt === undefined) row.googleUpdatedAt = null
        })
      })

    this.version(27)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name, profileId, googleCalendarId',
        auditLogs: 'id, createdAt, action, entity, userId, userEmail',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects: 'id, status, analystId, kanbanColumn, createdAt, planType, cnpj, lastManualCheckinAt, clientType',
        projectDeletionLogs: 'id, projectId, deletedByUserId, deletedAt',
        projectContacts: 'id, projectId',
        phases: 'id, projectId, orderIndex',
        tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo,rescheduledFromTaskId,rescheduledToTaskId,cancellationReason,completedManualOverride,cancelledManually',
        events: 'id, startTime, analystId, projectId, taskId, status, googleEventId',
        timeLogs: 'id, taskId, userId, executionDate',
        timeSessions: 'id, taskId, userId, analystId, startedAt, endedAt',
        comments: 'id, createdAt, taskId, projectId, eventId, authorId',
        labels: 'id, projectId, code',
      })
      .upgrade(async (tx) => {
        await tx.table('analysts').toCollection().modify((row: Record<string, unknown>) => {
          if (row.googleCalendarId === undefined) row.googleCalendarId = null
        })
      })
    this.version(28)
      .stores({
        users: 'id, email, status, role',
        analysts: 'id, active, name, profileId, googleCalendarId',
        auditLogs: 'id, createdAt, action, entity, userId, userEmail',
        planModels: 'id, key, active',
        planPhases: 'id, planModelId, orderIndex',
        planTasks: 'id, planPhaseId, sortOrder, code',
        projects:
          'id, status, analystId, kanbanColumn, createdAt, planType, cnpj, lastManualCheckinAt, clientType, engagementKind',
        projectDeletionLogs: 'id, projectId, deletedByUserId, deletedAt',
        projectContacts: 'id, projectId',
        phases: 'id, projectId, orderIndex',
        tasks: 'id, projectId, phaseId, status, code, dueDate, assignedTo,rescheduledFromTaskId,rescheduledToTaskId,cancellationReason,completedManualOverride,cancelledManually',
        events: 'id, startTime, analystId, projectId, taskId, status, googleEventId',
        timeLogs: 'id, taskId, userId, executionDate',
        timeSessions: 'id, taskId, userId, analystId, startedAt, endedAt',
        comments: 'id, createdAt, taskId, projectId, eventId, authorId',
        labels: 'id, projectId, code',
      })
      .upgrade(async (tx) => {
        await tx.table('projects').toCollection().modify((row: Record<string, unknown>) => {
          if (row.engagementKind === undefined) row.engagementKind = 'operacao_padrao'
        })
      })
  }
}

export const db = new ImplantacaoAzoupDB()
