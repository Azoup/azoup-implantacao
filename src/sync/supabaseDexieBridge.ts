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
import { inferPhaseColor, normalizePhaseColorHex } from '../constants/phaseProgression'

type BridgeDef<TLocal> = {
  localTable: keyof typeof db
  remoteTable: string
  fromRemote: (row: Record<string, unknown>) => TLocal
  toRemote: (row: TLocal) => Record<string, unknown>
}

let hooksInstalled = false
let syncingMuted = false
/** Permite refresh + salvamento explícito sem “empilhar” mute de forma incorreta. */
let syncingMuteDepth = 0
let pendingProjectGraphListenerInstalled = false

function pushSyncMute() {
  syncingMuteDepth++
  syncingMuted = true
}

function popSyncMute() {
  syncingMuteDepth = Math.max(0, syncingMuteDepth - 1)
  syncingMuted = syncingMuteDepth > 0
}
const OPTIONAL_REMOTE_TABLES = new Set(['audit_logs', 'project_deletion_logs'])

/** Tabelas de domínio: nunca substituir cache local por “vazio” vindo da API (evita apagar tudo com RLS/sessão errada). */
const TABLES_GUARD_EMPTY_REMOTE = new Set<string>([
  'projects',
  'phases',
  'tasks',
  'plan_models',
  'plan_phases',
  'plan_tasks',
  'analysts',
  'labels',
  'project_contacts',
  'comments',
  'events',
  'time_logs',
  'time_sessions',
  'audit_logs',
  'project_deletion_logs',
])

const FORCE_CACHE_REFRESH_KEY = 'vyntask_force_empty_remote_cache.v1'
const PENDING_PROJECT_GRAPH_SYNC_KEY = 'vyntask_pending_project_graph_sync.v1'

function allowReplaceCacheWithEmptyRemote(remoteTable: string): boolean {
  if (!TABLES_GUARD_EMPTY_REMOTE.has(remoteTable)) return true
  try {
    return typeof window !== 'undefined' && window.sessionStorage?.getItem(FORCE_CACHE_REFRESH_KEY) === '1'
  } catch {
    return false
  }
}

function assertSupabase() {
  if (!supabase) throw new Error('Supabase não configurado.')
  return supabase
}

function readPendingProjectGraphSyncIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(PENDING_PROJECT_GRAPH_SYNC_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function writePendingProjectGraphSyncIds(ids: string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PENDING_PROJECT_GRAPH_SYNC_KEY, JSON.stringify(ids))
  } catch {
    // ignore storage errors
  }
}

export function enqueuePendingProjectGraphSync(projectId: string): void {
  if (!projectId) return
  const ids = readPendingProjectGraphSyncIds()
  if (ids.includes(projectId)) return
  ids.push(projectId)
  writePendingProjectGraphSyncIds(ids)
}

function dequeuePendingProjectGraphSync(projectId: string): void {
  if (!projectId) return
  const ids = readPendingProjectGraphSyncIds().filter((id) => id !== projectId)
  writePendingProjectGraphSyncIds(ids)
}

function isOptionalTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { code?: string; message?: string }
  const code = String(e.code ?? '')
  if (code === '42P01' || code === '42501') return true
  // PostgREST: tabela ausente no cache do schema (não é o mesmo texto do Postgres "does not exist")
  if (code === 'PGRST205' || code === 'PGRST204') return true
  const msg = (e.message ?? '').toLowerCase()
  return (
    msg.includes('does not exist') ||
    msg.includes('permission denied') ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table')
  )
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

/** Colunas `date` no Postgres: enviar só `YYYY-MM-DD` evita deslocamento por fuso em ISO completo. */
function toPgDateOnly(isoOrYmd: string | null | undefined): string | null {
  if (isoOrYmd == null) return null
  const s = String(isoOrYmd).trim()
  if (!s) return null
  const head = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (head) return head[1]
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

const PROJECT_WRITE_TIMEOUT_MS = 60_000
const PROJECT_SYNC_RETRY_DELAY_MS = 500
const PROJECT_SYNC_MAX_ATTEMPTS = 3

type ProjectSyncOperation = 'projects' | 'phases' | 'tasks'
type ProjectSyncFailureType = 'timeout' | 'policy' | 'auth' | 'network' | 'conflict' | 'unknown'

function formatProjectSyncErrorMessage(args: {
  code: string
  operation: ProjectSyncOperation
  type: ProjectSyncFailureType
  reason: string
  action: string
}): string {
  const { code, operation, type, reason, action } = args
  return `${code}|op=${operation}|type=${type}|reason=${reason}|action=${action}`
}

function classifyProjectSyncError(err: unknown): {
  type: ProjectSyncFailureType
  reason: string
  action: string
  canRetry: boolean
} {
  const e = err as { message?: string; code?: string; status?: number; details?: string; hint?: string }
  const code = String(e?.code ?? '').toUpperCase()
  const message = String(e?.message ?? '')
  const details = String(e?.details ?? '')
  const hint = String(e?.hint ?? '')
  const status = typeof e?.status === 'number' ? e.status : null
  const body = `${message} ${details} ${hint}`.toLowerCase()

  if (message.includes('Tempo esgotado')) {
    return {
      type: 'timeout',
      reason: 'Tempo limite da operação atingido.',
      action: 'Verifique a rede e se o projeto Supabase está ativo; tente novamente.',
      canRetry: true,
    }
  }
  if (status === 401 || code === 'PGRST301' || body.includes('jwt') || body.includes('not authenticated')) {
    return {
      type: 'auth',
      reason: 'Sessão inválida ou expirada.',
      action: 'Entre novamente no sistema e repita a operação.',
      canRetry: false,
    }
  }
  if (status === 403 || code === '42501' || body.includes('policy') || body.includes('permission denied')) {
    return {
      type: 'policy',
      reason: 'Permissão negada pelas policies (RLS).',
      action: 'Confirme vínculo do usuário/analista ao projeto e regras RLS.',
      canRetry: false,
    }
  }
  if (status === 409 || code === '23505') {
    return {
      type: 'conflict',
      reason: 'Conflito de dados na escrita.',
      action: 'Atualize os dados locais e tente novamente.',
      canRetry: false,
    }
  }
  if (
    status === 429 ||
    (status !== null && status >= 500) ||
    body.includes('fetch failed') ||
    body.includes('network') ||
    body.includes('failed to fetch') ||
    body.includes('timeout')
  ) {
    return {
      type: 'network',
      reason: 'Instabilidade de rede ou indisponibilidade temporária do Supabase.',
      action: 'Aguarde alguns segundos e tente novamente.',
      canRetry: true,
    }
  }
  return {
    type: 'unknown',
    reason: 'Falha inesperada ao sincronizar com o Supabase.',
    action: 'Revise conexão, sessão e permissões; se persistir, acione suporte.',
    canRetry: false,
  }
}

function toProjectSyncError(code: string, operation: ProjectSyncOperation, err: unknown): Error {
  const info = classifyProjectSyncError(err)
  return new Error(
    formatProjectSyncErrorMessage({
      code,
      operation,
      type: info.type,
      reason: info.reason,
      action: info.action,
    }),
  )
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function retryDelayMs(attempt: number): number {
  const base = PROJECT_SYNC_RETRY_DELAY_MS * Math.pow(2, Math.max(0, attempt - 1))
  return Math.min(base, 4_000)
}

async function runProjectSyncWrite(
  operation: ProjectSyncOperation,
  projectId: string | null,
  write: () => Promise<{ error: { message: string } | null }>,
): Promise<void> {
  const startedAt = Date.now()
  let attempts = 0
  while (attempts < PROJECT_SYNC_MAX_ATTEMPTS) {
    attempts++
    try {
      const { error } = await raceProjectWrite(write(), `sincronizar ${operation} na nuvem`)
      if (!error) return
      throw error
    } catch (err) {
      const info = classifyProjectSyncError(err)
      const durationMs = Date.now() - startedAt
      console.warn('[Supabase] project sync failure', {
        operation,
        projectId,
        type: info.type,
        durationMs,
        attempts,
        maxAttempts: PROJECT_SYNC_MAX_ATTEMPTS,
        errorMessage: err instanceof Error ? err.message : String(err),
      })
      if (attempts < PROJECT_SYNC_MAX_ATTEMPTS && info.canRetry) {
        await sleep(retryDelayMs(attempts))
        continue
      }
      const codeByType: Record<ProjectSyncFailureType, string> = {
        timeout: 'PRJ_CREATE_TIMEOUT',
        policy: 'PRJ_CREATE_RLS',
        auth: 'PRJ_CREATE_AUTH',
        network: 'PRJ_CREATE_NETWORK',
        conflict: 'PRJ_CREATE_CONFLICT',
        unknown: 'PRJ_CREATE_SYNC',
      }
      throw toProjectSyncError(codeByType[info.type] ?? 'PRJ_CREATE_SYNC', operation, err)
    }
  }
}

async function raceProjectWrite<T>(promise: Promise<T>, opLabel: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new Error(
            `Tempo esgotado (${PROJECT_WRITE_TIMEOUT_MS / 1000}s) ao ${opLabel}. ` +
              'Verifique rede, se o projeto Supabase está ativo (não pausado) e se as policies RLS permitem esta alteração.',
          ),
        )
      }, PROJECT_WRITE_TIMEOUT_MS)
    })
    return await Promise.race([Promise.resolve(promise), timeoutPromise])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

/**
 * PATCH parcial: só colunas presentes em `patch` (evita reenviar `plan_snapshot` gigante a cada edição).
 */
function dbProjectPartialToSupabaseUpdate(patch: Partial<DbProject>): Record<string, unknown> {
  const o: Record<string, unknown> = {}
  const set = (k: keyof DbProject, snake: string, val: unknown) => {
    if (!Object.prototype.hasOwnProperty.call(patch, k)) return
    o[snake] = val
  }
  set('projectName', 'project_name', patch.projectName)
  set('planType', 'plan_type', patch.planType)
  set('hoursContracted', 'hours_contracted', patch.hoursContracted)
  set('hoursUsed', 'hours_used', patch.hoursUsed)
  if (Object.prototype.hasOwnProperty.call(patch, 'startDate')) {
    o.start_date = toPgDateOnly(patch.startDate ?? null)
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'dueDate')) {
    o.due_date = toPgDateOnly(patch.dueDate ?? null)
  }
  set('status', 'status', patch.status)
  set('ownerId', 'owner_id', patch.ownerId)
  set('analystId', 'analyst_id', patch.analystId)
  set('createdBy', 'created_by', patch.createdBy)
  set('createdAt', 'created_at', patch.createdAt)
  set('kanbanColumn', 'kanban_column', patch.kanbanColumn)
  set('cnpj', 'cnpj', patch.cnpj)
  set('razaoSocial', 'razao_social', patch.razaoSocial)
  set('tradeName', 'trade_name', patch.tradeName)
  set('cep', 'cep', patch.cep)
  set('addressStreet', 'address_street', patch.addressStreet)
  set('addressNumber', 'address_number', patch.addressNumber)
  set('addressComplement', 'address_complement', patch.addressComplement)
  set('addressNeighborhood', 'address_neighborhood', patch.addressNeighborhood)
  set('addressCity', 'address_city', patch.addressCity)
  set('addressState', 'address_state', patch.addressState)
  set('implantationContactName', 'implantation_contact_name', patch.implantationContactName)
  set('implantationContactPhone', 'implantation_contact_phone', patch.implantationContactPhone)
  set('corporateEmail', 'corporate_email', patch.corporateEmail)
  set('clientApiId', 'client_api_id', patch.clientApiId)
  set('internalNotes', 'internal_notes', patch.internalNotes)
  set('stateRegistration', 'state_registration', patch.stateRegistration)
  set('secondaryCnpj', 'secondary_cnpj', patch.secondaryCnpj)
  set('secondaryRazaoSocial', 'secondary_razao_social', patch.secondaryRazaoSocial)
  set('modulesDescription', 'modules_description', patch.modulesDescription)
  set('planSnapshotCapturedAt', 'plan_snapshot_captured_at', patch.planSnapshotCapturedAt)
  if (Object.prototype.hasOwnProperty.call(patch, 'planSnapshot')) {
    o.plan_snapshot = patch.planSnapshot
  }
  return o
}

/** Atualiza só as colunas informadas (PostgREST `PATCH` — payload leve, ideal para formulário de projeto). */
export async function updateProjectPartialInSupabase(projectId: string, patch: Partial<DbProject>): Promise<void> {
  const client = assertSupabase()
  const body = dbProjectPartialToSupabaseUpdate(patch)
  if (Object.keys(body).length === 0) return
  await runProjectSyncWrite('projects', projectId, async () => await client.from('projects').update(body).eq('id', projectId))
}

/** Payload REST/Postgres para `projects` (usado pelo bridge e por gravação explícita na nuvem). */
export function dbProjectToSupabaseRow(v: DbProject): Record<string, unknown> {
  return {
    id: v.id,
    project_name: v.projectName,
    plan_type: v.planType,
    hours_contracted: v.hoursContracted,
    hours_used: v.hoursUsed,
    start_date: toPgDateOnly(v.startDate),
    due_date: toPgDateOnly(v.dueDate),
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
}

export function dbPhaseToSupabaseRow(v: DbPhase): Record<string, unknown> {
  return {
    id: v.id,
    project_id: v.projectId,
    name: v.name,
    order_index: v.orderIndex,
    status: v.status,
    color_hex: v.colorHex,
  }
}

export function dbTaskToSupabaseRow(v: DbTask): Record<string, unknown> {
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
}

/** Grava um projeto inteiro no Supabase (INSERT/UPSERT — use após criação ou sync amplo; edições de formulário preferem `updateProjectPartialInSupabase`). */
export async function upsertProjectToSupabase(project: DbProject): Promise<void> {
  const client = assertSupabase()
  const payload = dbProjectToSupabaseRow(project)
  await runProjectSyncWrite('projects', project.id, async () => await client.from('projects').upsert(payload))
}

/**
 * Desliga temporariamente os hooks Dexie→Supabase para evitar upsert duplicado
 * (ex.: gravação explícita + hook no `projects.update`).
 */
export async function withDexieSupabaseSyncMuted<T>(fn: () => Promise<T>): Promise<T> {
  if (!supabase) return await fn()
  installHooks()
  pushSyncMute()
  try {
    return await fn()
  } finally {
    popSyncMute()
  }
}

export async function upsertPhasesToSupabase(phases: DbPhase[]): Promise<void> {
  if (phases.length === 0) return
  const client = assertSupabase()
  await runProjectSyncWrite(
    'phases',
    phases[0]?.projectId ?? null,
    async () => await client.from('phases').upsert(phases.map(dbPhaseToSupabaseRow)),
  )
}

export async function upsertTasksToSupabase(tasks: DbTask[]): Promise<void> {
  if (tasks.length === 0) return
  const client = assertSupabase()
  await runProjectSyncWrite(
    'tasks',
    tasks[0]?.projectId ?? null,
    async () => await client.from('tasks').upsert(tasks.map(dbTaskToSupabaseRow)),
  )
}

const RECONCILE_DELETE_CHUNK = 120

/**
 * Remove no Supabase tarefas que não existem mais no Dexie (antes de reconciliar fases).
 * O grafo só faz UPSERT — sem DELETE de órfãos, exclusões locais reaparecem após reload.
 */
async function reconcileOrphanProjectTasksInSupabase(projectId: string, localTasks: DbTask[]): Promise<void> {
  const client = assertSupabase()
  const localTaskIds = new Set(localTasks.map((t) => t.id))
  const { data: remoteTasks, error: selTasksErr } = await client.from('tasks').select('id').eq('project_id', projectId)
  if (selTasksErr) throw selTasksErr
  const orphanTaskIds = (remoteTasks ?? [])
    .map((r) => String((r as { id: unknown }).id))
    .filter((id) => !localTaskIds.has(id))

  for (let i = 0; i < orphanTaskIds.length; i += RECONCILE_DELETE_CHUNK) {
    const slice = orphanTaskIds.slice(i, i + RECONCILE_DELETE_CHUNK)
    const { error } = await client.from('tasks').delete().in('id', slice)
    if (error) throw error
  }
}

async function reconcileOrphanProjectPhasesInSupabase(projectId: string, localPhases: DbPhase[]): Promise<void> {
  const client = assertSupabase()
  const localPhaseIds = new Set(localPhases.map((ph) => ph.id))
  const { data: remotePhases, error: selPhasesErr } = await client.from('phases').select('id').eq('project_id', projectId)
  if (selPhasesErr) throw selPhasesErr
  const orphanPhaseIds = (remotePhases ?? [])
    .map((r) => String((r as { id: unknown }).id))
    .filter((id) => !localPhaseIds.has(id))

  for (let i = 0; i < orphanPhaseIds.length; i += RECONCILE_DELETE_CHUNK) {
    const slice = orphanPhaseIds.slice(i, i + RECONCILE_DELETE_CHUNK)
    const { error } = await client.from('phases').delete().in('id', slice)
    if (error) throw error
  }
}

/** Projeto + fases + tarefas do projeto (após criação ou mutação ampla em Dexie). */
export async function upsertProjectGraphFromDexie(projectId: string): Promise<void> {
  if (!supabase) return
  const p = await db.projects.get(projectId)
  if (!p) return
  const startedAt = Date.now()
  let failedOperation: ProjectSyncOperation = 'projects'
  try {
    failedOperation = 'projects'
    await runProjectSyncWrite('projects', projectId, async () => {
      const payload = dbProjectToSupabaseRow(p)
      const client = assertSupabase()
      return await client.from('projects').upsert(payload)
    })
    const phases = await db.phases.where('projectId').equals(projectId).toArray()
    const tasks = await db.tasks.where('projectId').equals(projectId).toArray()
    failedOperation = 'tasks'
    await reconcileOrphanProjectTasksInSupabase(projectId, tasks)
    failedOperation = 'phases'
    await reconcileOrphanProjectPhasesInSupabase(projectId, phases)
    await upsertPhasesToSupabase(phases)
    failedOperation = 'tasks'
    await upsertTasksToSupabase(tasks)
  } catch (err) {
    const info = classifyProjectSyncError(err)
    const codeByType: Record<ProjectSyncFailureType, string> = {
      timeout: 'PRJ_CREATE_TIMEOUT',
      policy: 'PRJ_CREATE_RLS',
      auth: 'PRJ_CREATE_AUTH',
      network: 'PRJ_CREATE_NETWORK',
      conflict: 'PRJ_CREATE_CONFLICT',
      unknown: 'PRJ_CREATE_SYNC',
    }
    const message = toProjectSyncError(
      codeByType[info.type],
      failedOperation,
      err,
    )
    console.error('[Supabase] project graph sync failed', {
      projectId,
      type: info.type,
      durationMs: Date.now() - startedAt,
    })
    enqueuePendingProjectGraphSync(projectId)
    throw message
  }
}

export async function flushPendingProjectGraphSyncQueue(): Promise<void> {
  if (!supabase) return
  const queue = readPendingProjectGraphSyncIds()
  if (queue.length === 0) return
  for (const projectId of queue) {
    try {
      await upsertProjectGraphFromDexie(projectId)
      dequeuePendingProjectGraphSync(projectId)
    } catch (err) {
      console.warn('[Supabase] pending project graph sync still failing', { projectId, err })
    }
  }
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
      profileId: toStringOrNull(r.profile_id),
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
        profile_id: v.profileId ?? null,
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
      colorHex: normalizePhaseColorHex(
        toStringOrNull(r.color_hex),
        inferPhaseColor(String(r.name ?? ''), toNumber(r.order_index)),
      ),
    }),
    toRemote: (x) => {
      const v = x as DbPlanPhase
      return { id: v.id, plan_model_id: v.planModelId, name: v.name, order_index: v.orderIndex, color_hex: v.colorHex }
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
    toRemote: (x) => dbProjectToSupabaseRow(x as DbProject),
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
      colorHex: normalizePhaseColorHex(
        toStringOrNull(r.color_hex),
        inferPhaseColor(String(r.name ?? ''), toNumber(r.order_index)),
      ),
    }),
    toRemote: (x) => dbPhaseToSupabaseRow(x as DbPhase),
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
    toRemote: (x) => dbTaskToSupabaseRow(x as DbTask),
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
    // Dexie 4: hooks creating/updating não aguardam Promise; retornar Promise quebrava o sync e a UI “salvava” só no IndexedDB.
    table.hook('creating', function (_primaryKey: unknown, obj: unknown) {
      if (syncingMuted) return
      void upsertRemote(def, obj).catch((e) => console.warn(`[Supabase] sync create ${def.remoteTable}`, e))
    })
    table.hook('updating', function (mods: Record<string, unknown>, _primaryKey: unknown, obj: Record<string, unknown>) {
      if (syncingMuted) return
      const merged = { ...obj, ...mods }
      void upsertRemote(def, merged).catch((e) => console.warn(`[Supabase] sync update ${def.remoteTable}`, e))
    })
    table.hook('deleting', function (primaryKey: unknown) {
      if (syncingMuted) return
      const client = assertSupabase()
      void client
        .from(def.remoteTable)
        .delete()
        .eq('id', String(primaryKey))
        .then(({ error }) => {
          if (error && !shouldIgnoreMissingTable(def.remoteTable, error)) {
            console.warn(`[Supabase] sync delete ${def.remoteTable}`, error)
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
  if (users.length === 0) {
    const prev = await db.users.count()
    if (prev > 0) {
      console.warn(
        '[Supabase] profiles retornou 0 linhas com usuários já em cache local; mantendo cache de usuários para não quebrar o app.',
      )
    }
    return
  }
  await db.users.clear()
  await db.users.bulkPut(users)
}

export async function refreshSupabaseDexieCache(): Promise<void> {
  if (!supabase) return
  installHooks()
  pushSyncMute()
  try {
    for (const def of defs) {
      const table = (db as Record<string, any>)[def.localTable]
      try {
        const rows = await fetchAll(def.remoteTable)
        const mapped = rows.map(def.fromRemote)
        const localCount = await table.count()
        if (
          mapped.length === 0 &&
          localCount > 0 &&
          !allowReplaceCacheWithEmptyRemote(def.remoteTable)
        ) {
          console.warn(
            `[Supabase] Pulando refresh de ${def.remoteTable}: remoto retornou 0 linhas e o cache local tem ${localCount}. ` +
              'Isso costuma ser RLS, sessão expirada ou falha de rede — não limpamos o IndexedDB para evitar perda de visão dos dados. ' +
              `Para forçar substituição por vazio, defina sessionStorage['${FORCE_CACHE_REFRESH_KEY}'] = '1' e recarregue (use com cuidado).`,
          )
          continue
        }
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
    popSyncMute()
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
  await flushPendingProjectGraphSyncQueue()
  if (!pendingProjectGraphListenerInstalled && typeof window !== 'undefined') {
    pendingProjectGraphListenerInstalled = true
    window.addEventListener('online', () => {
      void flushPendingProjectGraphSyncQueue()
    })
    window.addEventListener('focus', () => {
      void flushPendingProjectGraphSyncQueue()
    })
  }
}

