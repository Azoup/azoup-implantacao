import { db } from '../db/database'
import { supabase } from '../lib/supabaseClient'
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
  PermissionScope,
} from '../db/types'
import { ALL_PERMISSION_SCOPES } from '../auth/permissions'

type BridgeDef<TLocal> = {
  localTable: keyof typeof db
  remoteTable: string
  fromRemote: (row: Record<string, unknown>) => TLocal
  toRemote: (row: TLocal) => Record<string, unknown>
}

let hooksInstalled = false
let syncingMuted = false
const OPTIONAL_REMOTE_TABLES = new Set(['audit_logs', 'project_deletion_logs'])

function assertSupabase() {
  if (!supabase) throw new Error('Supabase não configurado.')
  return supabase
}

function isOptionalTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { code?: string; message?: string }
  if (e.code === '42P01') return true
  if (e.code === '42501') return true
  const msg = (e.message ?? '').toLowerCase()
  return msg.includes('does not exist') || msg.includes('permission denied')
}

function shouldIgnoreMissingTable(table: string, err: unknown): boolean {
  return OPTIONAL_REMOTE_TABLES.has(table) && isOptionalTableError(err)
}

async function fetchAll(table: string): Promise<Record<string, unknown>[]> {
  const client = assertSupabase()
  const pageSize = 1000
  const rows: Record<string, unknown>[] = []
  let from = 0
  while (true) {
    const { data, error } = await client.from(table).select('*').range(from, from + pageSize - 1)
    if (error) {
      if (shouldIgnoreMissingTable(table, error)) break
      throw new Error(`[Supabase] ${table}: ${error.message}`)
    }
    const page = (data ?? []) as Record<string, unknown>[]
    rows.push(...page)
    if (page.length < pageSize) break
    from += pageSize
  }
  return rows
}

function toStringOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function toBool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function toStringArrayOrNull(v: unknown): string[] | null {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : null
}

const defs: BridgeDef<unknown>[] = [
  {
    localTable: 'analysts',
    remoteTable: 'analysts',
    fromRemote: (r): DbAnalyst => ({
      id: String(r.id),
      name: String(r.name ?? ''),
      avatarUrl: toStringOrNull(r.avatar_url),
      color: String(r.color ?? '#6366f1'),
      active: toBool(r.active, true),
      createdAt: String(r.created_at ?? new Date().toISOString()),
    }),
    toRemote: (x) => {
      const v = x as DbAnalyst
      return {
        id: v.id,
        name: v.name,
        avatar_url: v.avatarUrl,
        color: v.color,
        active: v.active,
        created_at: v.createdAt,
      }
    },
  },
  {
    localTable: 'planModels',
    remoteTable: 'plan_models',
    fromRemote: (r): DbPlanModel => ({
      id: String(r.id),
      key: String(r.key ?? ''),
      name: String(r.name ?? ''),
      hoursContracted: toNumber(r.hours_contracted),
      phaseCount: toNumber(r.phase_count),
      active: toBool(r.active, true),
      presentationUrl: toStringOrNull(r.presentation_url),
      clientDescription: toStringOrNull(r.client_description),
    }),
    toRemote: (x) => {
      const v = x as DbPlanModel
      return {
        id: v.id,
        key: v.key,
        name: v.name,
        hours_contracted: v.hoursContracted,
        phase_count: v.phaseCount,
        active: v.active,
        presentation_url: v.presentationUrl,
        client_description: v.clientDescription,
      }
    },
  },
  {
    localTable: 'planPhases',
    remoteTable: 'plan_phases',
    fromRemote: (r): DbPlanPhase => ({
      id: String(r.id),
      planModelId: String(r.plan_model_id),
      name: String(r.name ?? ''),
      orderIndex: toNumber(r.order_index),
    }),
    toRemote: (x) => {
      const v = x as DbPlanPhase
      return { id: v.id, plan_model_id: v.planModelId, name: v.name, order_index: v.orderIndex }
    },
  },
  {
    localTable: 'planTasks',
    remoteTable: 'plan_tasks',
    fromRemote: (r): DbPlanTask => ({
      id: String(r.id),
      planPhaseId: String(r.plan_phase_id),
      code: String(r.code ?? ''),
      title: String(r.title ?? ''),
      description: String(r.description ?? ''),
      estimatedHours: toNumber(r.estimated_hours),
      isInformational: toBool(r.is_informational, false),
      sortOrder: toNumber(r.sort_order),
    }),
    toRemote: (x) => {
      const v = x as DbPlanTask
      return {
        id: v.id,
        plan_phase_id: v.planPhaseId,
        code: v.code,
        title: v.title,
        description: v.description,
        estimated_hours: v.estimatedHours,
        is_informational: v.isInformational,
        sort_order: v.sortOrder,
      }
    },
  },
  {
    localTable: 'projects',
    remoteTable: 'projects',
    fromRemote: (r): DbProject => ({
      id: String(r.id),
      projectName: String(r.project_name ?? ''),
      planType: String(r.plan_type ?? ''),
      hoursContracted: toNumber(r.hours_contracted),
      hoursUsed: toNumber(r.hours_used),
      startDate: toStringOrNull(r.start_date),
      dueDate: toStringOrNull(r.due_date),
      status: String(r.status ?? 'ativo') as DbProject['status'],
      ownerId: String(r.owner_id ?? ''),
      analystId: toStringOrNull(r.analyst_id),
      createdBy: String(r.created_by ?? ''),
      createdAt: String(r.created_at ?? new Date().toISOString()),
      kanbanColumn: String(r.kanban_column ?? 'novos') as DbProject['kanbanColumn'],
      cnpj: toStringOrNull(r.cnpj),
      razaoSocial: toStringOrNull(r.razao_social),
      tradeName: toStringOrNull(r.trade_name),
      cep: toStringOrNull(r.cep),
      addressStreet: toStringOrNull(r.address_street),
      addressNumber: toStringOrNull(r.address_number),
      addressComplement: toStringOrNull(r.address_complement),
      addressNeighborhood: toStringOrNull(r.address_neighborhood),
      addressCity: toStringOrNull(r.address_city),
      addressState: toStringOrNull(r.address_state),
      implantationContactName: toStringOrNull(r.implantation_contact_name),
      implantationContactPhone: toStringOrNull(r.implantation_contact_phone),
      corporateEmail: toStringOrNull(r.corporate_email),
      clientApiId: toStringOrNull(r.client_api_id),
      internalNotes: toStringOrNull(r.internal_notes),
      stateRegistration: toStringOrNull(r.state_registration),
      secondaryCnpj: toStringOrNull(r.secondary_cnpj),
      secondaryRazaoSocial: toStringOrNull(r.secondary_razao_social),
      modulesDescription: toStringOrNull(r.modules_description),
      planSnapshotCapturedAt: String(r.plan_snapshot_captured_at ?? new Date().toISOString()),
      planSnapshot:
        (r.plan_snapshot as DbProject['planSnapshot'] | null) ??
        ({
          modelId: String(r.plan_type ?? ''),
          key: String(r.plan_type ?? ''),
          name: String(r.plan_type ?? ''),
          hoursContracted: toNumber(r.hours_contracted),
          phaseCount: 0,
          taskCount: 0,
        } as DbProject['planSnapshot']),
    }),
    toRemote: (x) => {
      const v = x as DbProject
      return {
        id: v.id,
        project_name: v.projectName,
        plan_type: v.planType,
        hours_contracted: v.hoursContracted,
        hours_used: v.hoursUsed,
        start_date: v.startDate,
        due_date: v.dueDate,
        status: v.status,
        owner_id: v.ownerId,
        analyst_id: v.analystId,
        created_by: v.createdBy,
        created_at: v.createdAt,
        kanban_column: v.kanbanColumn,
        cnpj: v.cnpj,
        razao_social: v.razaoSocial,
        trade_name: v.tradeName,
        cep: v.cep,
        address_street: v.addressStreet,
        address_number: v.addressNumber,
        address_complement: v.addressComplement,
        address_neighborhood: v.addressNeighborhood,
        address_city: v.addressCity,
        address_state: v.addressState,
        implantation_contact_name: v.implantationContactName,
        implantation_contact_phone: v.implantationContactPhone,
        corporate_email: v.corporateEmail,
        client_api_id: v.clientApiId,
        internal_notes: v.internalNotes,
        state_registration: v.stateRegistration,
        secondary_cnpj: v.secondaryCnpj,
        secondary_razao_social: v.secondaryRazaoSocial,
        modules_description: v.modulesDescription,
        plan_snapshot_captured_at: v.planSnapshotCapturedAt,
        plan_snapshot: v.planSnapshot,
      }
    },
  },
  {
    localTable: 'projectContacts',
    remoteTable: 'project_contacts',
    fromRemote: (r): DbProjectContact => ({
      id: String(r.id),
      projectId: String(r.project_id),
      name: String(r.name ?? ''),
      phone: String(r.phone ?? ''),
      role: String(r.role ?? ''),
    }),
    toRemote: (x) => {
      const v = x as DbProjectContact
      return { id: v.id, project_id: v.projectId, name: v.name, phone: v.phone, role: v.role }
    },
  },
  {
    localTable: 'phases',
    remoteTable: 'phases',
    fromRemote: (r): DbPhase => ({
      id: String(r.id),
      projectId: String(r.project_id),
      name: String(r.name ?? ''),
      orderIndex: toNumber(r.order_index),
      status: String(r.status ?? 'bloqueada') as DbPhase['status'],
    }),
    toRemote: (x) => {
      const v = x as DbPhase
      return { id: v.id, project_id: v.projectId, name: v.name, order_index: v.orderIndex, status: v.status }
    },
  },
  {
    localTable: 'tasks',
    remoteTable: 'tasks',
    fromRemote: (r): DbTask => ({
      id: String(r.id),
      title: String(r.title ?? ''),
      description: String(r.description ?? ''),
      projectId: String(r.project_id),
      phaseId: String(r.phase_id),
      status: String(r.status ?? 'pendente') as DbTask['status'],
      priority: String(r.priority ?? 'media') as DbTask['priority'],
      estimatedHours: toNumber(r.estimated_hours),
      actualHours: toNumber(r.actual_hours),
      assignedTo: toStringOrNull(r.assigned_to),
      dueDate: toStringOrNull(r.due_date),
      isInformational: toBool(r.is_informational, false),
      createdAt: String(r.created_at ?? new Date().toISOString()),
      code: String(r.code ?? ''),
      sortOrder: toNumber(r.sort_order),
    }),
    toRemote: (x) => {
      const v = x as DbTask
      return {
        id: v.id,
        title: v.title,
        description: v.description,
        project_id: v.projectId,
        phase_id: v.phaseId,
        status: v.status,
        priority: v.priority,
        estimated_hours: v.estimatedHours,
        actual_hours: v.actualHours,
        assigned_to: v.assignedTo,
        due_date: v.dueDate,
        is_informational: v.isInformational,
        created_at: v.createdAt,
        code: v.code,
        sort_order: v.sortOrder,
      }
    },
  },
  {
    localTable: 'events',
    remoteTable: 'events',
    fromRemote: (r): DbEvent => ({
      id: String(r.id),
      title: String(r.title ?? ''),
      description: String(r.description ?? ''),
      startTime: String(r.start_time ?? new Date().toISOString()),
      endTime: String(r.end_time ?? new Date().toISOString()),
      status: String(r.status ?? 'agendado') as DbEvent['status'],
      projectId: toStringOrNull(r.project_id),
      taskId: toStringOrNull(r.task_id),
      analystId: toStringOrNull(r.analyst_id),
      meetingLink: toStringOrNull(r.meeting_link),
      recordingLink: toStringOrNull(r.recording_link),
      createdAt: String(r.created_at ?? new Date().toISOString()),
    }),
    toRemote: (x) => {
      const v = x as DbEvent
      return {
        id: v.id,
        title: v.title,
        description: v.description,
        start_time: v.startTime,
        end_time: v.endTime,
        status: v.status,
        project_id: v.projectId,
        task_id: v.taskId,
        analyst_id: v.analystId,
        meeting_link: v.meetingLink,
        recording_link: v.recordingLink,
        created_at: v.createdAt,
      }
    },
  },
  {
    localTable: 'timeLogs',
    remoteTable: 'time_logs',
    fromRemote: (r): DbTimeLog => ({
      id: String(r.id),
      taskId: String(r.task_id),
      userId: String(r.user_id),
      hours: toNumber(r.hours),
      logType: String(r.log_type ?? 'executado') as DbTimeLog['logType'],
      notes: String(r.notes ?? ''),
      executionDate: String(r.execution_date ?? new Date().toISOString().slice(0, 10)),
      isLocked: toBool(r.is_locked, false),
    }),
    toRemote: (x) => {
      const v = x as DbTimeLog
      return {
        id: v.id,
        task_id: v.taskId,
        user_id: v.userId,
        hours: v.hours,
        log_type: v.logType,
        notes: v.notes,
        execution_date: v.executionDate,
        is_locked: v.isLocked,
      }
    },
  },
  {
    localTable: 'timeSessions',
    remoteTable: 'time_sessions',
    fromRemote: (r): DbTimeSession => ({
      id: String(r.id),
      taskId: String(r.task_id),
      userId: String(r.user_id),
      analystId: toStringOrNull(r.analyst_id),
      startedAt: String(r.started_at ?? new Date().toISOString()),
      endedAt: toStringOrNull(r.ended_at),
      durationSeconds: typeof r.duration_seconds === 'number' ? r.duration_seconds : null,
      source: String(r.source ?? 'timer') as DbTimeSession['source'],
      notes: String(r.notes ?? ''),
      createdAt: String(r.created_at ?? new Date().toISOString()),
    }),
    toRemote: (x) => {
      const v = x as DbTimeSession
      return {
        id: v.id,
        task_id: v.taskId,
        user_id: v.userId,
        analyst_id: v.analystId,
        started_at: v.startedAt,
        ended_at: v.endedAt,
        duration_seconds: v.durationSeconds,
        source: v.source,
        notes: v.notes,
        created_at: v.createdAt,
      }
    },
  },
  {
    localTable: 'comments',
    remoteTable: 'comments',
    fromRemote: (r): DbComment => ({
      id: String(r.id),
      content: String(r.content ?? ''),
      authorId: String(r.author_id),
      projectId: toStringOrNull(r.project_id),
      taskId: toStringOrNull(r.task_id),
      eventId: toStringOrNull(r.event_id),
      createdAt: String(r.created_at ?? new Date().toISOString()),
      updatedAt: toStringOrNull(r.updated_at),
      docLinks: Array.isArray(r.doc_links) ? (r.doc_links as DbComment['docLinks']) : null,
      // Blob binário não vem do Postgres; anexos persistentes vão por Storage.
      docAttachments: null,
    }),
    toRemote: (x) => {
      const v = x as DbComment
      return {
        id: v.id,
        content: v.content,
        author_id: v.authorId,
        project_id: v.projectId,
        task_id: v.taskId,
        event_id: v.eventId,
        created_at: v.createdAt,
        updated_at: v.updatedAt,
        doc_links: v.docLinks ?? [],
        doc_attachments: (v.docAttachments ?? []).map((a) => ({
          id: a.id,
          fileName: a.fileName,
          mimeType: a.mimeType,
        })),
      }
    },
  },
  {
    localTable: 'auditLogs',
    remoteTable: 'audit_logs',
    fromRemote: (r): DbAuditLog => ({
      id: String(r.id),
      action: String(r.action ?? 'alteracao') as DbAuditLog['action'],
      entity: String(r.entity ?? 'outro') as DbAuditLog['entity'],
      entityId: toStringOrNull(r.entity_id),
      entityLabel: String(r.entity_label ?? ''),
      userId: String(r.user_id ?? ''),
      userName: String(r.user_name ?? ''),
      userEmail: String(r.user_email ?? ''),
      justification: toStringOrNull(r.justification),
      details: String(r.details ?? ''),
      createdAt: String(r.created_at ?? new Date().toISOString()),
    }),
    toRemote: (x) => {
      const v = x as DbAuditLog
      return {
        id: v.id,
        action: v.action,
        entity: v.entity,
        entity_id: v.entityId,
        entity_label: v.entityLabel,
        user_id: v.userId,
        user_name: v.userName,
        user_email: v.userEmail,
        justification: v.justification,
        details: v.details,
        created_at: v.createdAt,
      }
    },
  },
  {
    localTable: 'projectDeletionLogs',
    remoteTable: 'project_deletion_logs',
    fromRemote: (r): DbProjectDeletionLog => ({
      id: String(r.id),
      projectId: String(r.project_id ?? ''),
      projectName: String(r.project_name ?? ''),
      deletedByUserId: String(r.deleted_by_user_id ?? ''),
      deletedByUserName: String(r.deleted_by_user_name ?? ''),
      deletedByUserEmail: String(r.deleted_by_user_email ?? ''),
      justification: String(r.justification ?? ''),
      deletedAt: String(r.deleted_at ?? new Date().toISOString()),
    }),
    toRemote: (x) => {
      const v = x as DbProjectDeletionLog
      return {
        id: v.id,
        project_id: v.projectId,
        project_name: v.projectName,
        deleted_by_user_id: v.deletedByUserId,
        deleted_by_user_name: v.deletedByUserName,
        deleted_by_user_email: v.deletedByUserEmail,
        justification: v.justification,
        deleted_at: v.deletedAt,
      }
    },
  },
  {
    localTable: 'labels',
    remoteTable: 'labels',
    fromRemote: (r): DbLabel => ({
      id: String(r.id),
      projectId: String(r.project_id),
      code: String(r.code ?? ''),
      name: String(r.name ?? ''),
      status: String(r.status ?? 'not_started') as DbLabel['status'],
    }),
    toRemote: (x) => {
      const v = x as DbLabel
      return { id: v.id, project_id: v.projectId, code: v.code, name: v.name, status: v.status }
    },
  },
]

async function upsertRemote(def: BridgeDef<unknown>, localRow: unknown): Promise<void> {
  const client = assertSupabase()
  const payload = def.toRemote(localRow)
  const { error } = await client.from(def.remoteTable).upsert(payload)
  if (error) {
    if (shouldIgnoreMissingTable(def.remoteTable, error)) return
    throw new Error(`[Supabase] ${def.remoteTable} upsert: ${error.message}`)
  }
}

function installHooks() {
  if (hooksInstalled || !supabase) return
  hooksInstalled = true

  for (const def of defs) {
    const table = (db as Record<string, any>)[def.localTable]
    table.hook('creating', function (_primaryKey: unknown, obj: unknown) {
      if (syncingMuted) return
      return upsertRemote(def, obj)
    })
    table.hook('updating', function (mods: Record<string, unknown>, _primaryKey: unknown, obj: Record<string, unknown>) {
      if (syncingMuted) return
      const merged = { ...obj, ...mods }
      return upsertRemote(def, merged)
    })
    table.hook('deleting', function (primaryKey: unknown) {
      if (syncingMuted) return
      const client = assertSupabase()
      return client
        .from(def.remoteTable)
        .delete()
        .eq('id', String(primaryKey))
        .then(({ error }) => {
          if (error) {
            if (shouldIgnoreMissingTable(def.remoteTable, error)) return
            throw new Error(`[Supabase] ${def.remoteTable} delete: ${error.message}`)
          }
        })
    })
  }
}

async function hydrateUsersFromProfiles() {
  const rows = await fetchAll('profiles')
  const validScopes = new Set<string>(ALL_PERMISSION_SCOPES as string[])
  const users: DbUser[] = rows.map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ''),
    email: String(r.email ?? ''),
    role: String(r.role ?? 'user') === 'admin' ? 'admin' : 'user',
    permissions:
      toStringArrayOrNull(r.permissions)?.filter((s): s is PermissionScope => validScopes.has(s)) ?? null,
    status: String(r.status ?? 'active') === 'inactive' ? 'inactive' : 'active',
    createdAt: String(r.created_at ?? new Date().toISOString()),
    lastLogin: toStringOrNull(r.last_login_at),
  }))
  await db.users.clear()
  if (users.length > 0) await db.users.bulkPut(users)
}

export async function refreshSupabaseDexieCache(): Promise<void> {
  if (!supabase) return
  installHooks()
  syncingMuted = true
  try {
    for (const def of defs) {
      const table = (db as Record<string, any>)[def.localTable]
      try {
        const rows = await fetchAll(def.remoteTable)
        const mapped = rows.map(def.fromRemote)
        await table.clear()
        if (mapped.length > 0) await table.bulkPut(mapped)
      } catch (err) {
        console.warn(`[Supabase] Falha ao sincronizar tabela ${def.remoteTable}. Mantendo cache local anterior.`, err)
      }
    }
    try {
      await hydrateUsersFromProfiles()
    } catch (err) {
      console.warn('[Supabase] Falha ao hidratar usuários do profiles. Mantendo cache local anterior.', err)
    }
  } finally {
    syncingMuted = false
  }
}

export async function initializeSupabaseDexieBridge(): Promise<void> {
  if (!supabase) return
  installHooks()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return
  await refreshSupabaseDexieCache()
}

