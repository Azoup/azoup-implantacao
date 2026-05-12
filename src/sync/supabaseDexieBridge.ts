import type { Table } from 'dexie'
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
import { normalizeProjectClientType } from '../lib/projectClientType'
import { normalizeRemoteProjectStatus } from '../lib/projectStatus'
import { parseFreezeTimeline } from '../lib/projectFreezeTimeline'
import { broadcastDexieSyncHint } from './crossTabSync'
import { dispatchSyncFailure } from './syncFailure'
import { bumpSyncCursor, isIncrementalRemoteTable, setSyncCursor } from './syncCursors'
import { pushRuntimeDiagnostic } from '../diagnostics/runtimeDiagnostics'

type BridgeDef<TLocal> = {
  localTable: keyof typeof db
  remoteTable: string
  fromRemote: (row: Record<string, unknown>) => TLocal
  toRemote: (row: TLocal) => Record<string, unknown>
}

/** Tabela Dexie acessada por nome dinâmico; tipos de `hook()` não unificam entre eventos. */
type DexieTableForSyncHooks = {
  hook(type: 'creating', fn: (_pk: unknown, obj: unknown) => void): void
  hook(
    type: 'updating',
    fn: (mods: Record<string, unknown>, _pk: unknown, obj: Record<string, unknown>) => void,
  ): void
  hook(type: 'deleting', fn: (pk: unknown) => void): void
  count(): Promise<number>
  clear(): Promise<void>
  bulkPut(items: unknown[]): Promise<unknown>
}

let hooksInstalled = false
let syncingMuted = false
/** Permite refresh + salvamento explícito sem “empilhar” mute de forma incorreta. */
let syncingMuteDepth = 0
let pendingProjectGraphListenerInstalled = false
const inFlightProjectGraphSync = new Set<string>()

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

const FORCE_CACHE_REFRESH_KEY = 'implantacao_azoup_force_empty_remote_cache.v1'

/** Coalesce chamadas concorrentes a um único refresh (evita rajadas de GET /labels etc.). */
let refreshSupabaseDexieCacheInFlight: Promise<void> | null = null
const PENDING_PROJECT_GRAPH_SYNC_KEY = 'implantacao_azoup_pending_project_graph_sync.v1'
/** Evita loop agressivo de retry no focus/online quando a nuvem está instável. */
const PENDING_PROJECT_SYNC_COOLDOWN_MS = 90_000

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

type PendingProjectSyncItem = {
  projectId: string
  attempts: number
  enqueuedAt: string
  lastAttemptAt: string | null
  lastErrorCode: string | null
  lastErrorMessage: string | null
  lastOpId: string | null
}

type ProjectCloudSyncMeta = {
  state: 'synced' | 'pending' | 'failed'
  attempts: number
  enqueuedAt: string | null
  lastAttemptAt: string | null
  lastErrorCode: string | null
  lastErrorMessage: string | null
  lastOpId: string | null
}

function readPendingProjectGraphSyncItems(): PendingProjectSyncItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(PENDING_PROJECT_GRAPH_SYNC_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    if (parsed.every((x) => typeof x === 'string')) {
      return parsed.map((projectId) => ({
        projectId,
        attempts: 0,
        enqueuedAt: new Date().toISOString(),
        lastAttemptAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        lastOpId: null,
      }))
    }
    return parsed
      .map((x) => x as Partial<PendingProjectSyncItem>)
      .filter((x) => typeof x.projectId === 'string' && x.projectId.trim().length > 0)
      .map((x) => ({
        projectId: String(x.projectId),
        attempts: Number.isFinite(x.attempts) ? Math.max(0, Number(x.attempts)) : 0,
        enqueuedAt: typeof x.enqueuedAt === 'string' ? x.enqueuedAt : new Date().toISOString(),
        lastAttemptAt: typeof x.lastAttemptAt === 'string' ? x.lastAttemptAt : null,
        lastErrorCode: typeof x.lastErrorCode === 'string' ? x.lastErrorCode : null,
        lastErrorMessage: typeof x.lastErrorMessage === 'string' ? x.lastErrorMessage : null,
        lastOpId: typeof x.lastOpId === 'string' ? x.lastOpId : null,
      }))
  } catch {
    return []
  }
}

function writePendingProjectGraphSyncItems(items: PendingProjectSyncItem[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PENDING_PROJECT_GRAPH_SYNC_KEY, JSON.stringify(items))
  } catch {
    // ignore storage errors
  }
}

export function getPendingProjectGraphSyncIds(): string[] {
  return readPendingProjectGraphSyncItems().map((x) => x.projectId)
}

export function getProjectCloudSyncMeta(projectId: string): ProjectCloudSyncMeta {
  const row = readPendingProjectGraphSyncItems().find((x) => x.projectId === projectId)
  if (!row) {
    return {
      state: 'synced',
      attempts: 0,
      enqueuedAt: null,
      lastAttemptAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      lastOpId: null,
    }
  }
  return {
    state: row.lastErrorCode ? 'failed' : 'pending',
    attempts: row.attempts,
    enqueuedAt: row.enqueuedAt,
    lastAttemptAt: row.lastAttemptAt,
    lastErrorCode: row.lastErrorCode,
    lastErrorMessage: row.lastErrorMessage,
    lastOpId: row.lastOpId,
  }
}

export function enqueuePendingProjectGraphSync(
  projectId: string,
  opts?: { lastErrorCode?: string | null; lastErrorMessage?: string | null; opId?: string | null },
): void {
  if (!projectId) return
  const items = readPendingProjectGraphSyncItems()
  const idx = items.findIndex((x) => x.projectId === projectId)
  if (idx >= 0) {
    items[idx] = {
      ...items[idx],
      lastErrorCode: opts?.lastErrorCode ?? items[idx].lastErrorCode,
      lastErrorMessage: opts?.lastErrorMessage ?? items[idx].lastErrorMessage,
      lastOpId: opts?.opId ?? items[idx].lastOpId,
    }
    writePendingProjectGraphSyncItems(items)
    return
  }
  items.push({
    projectId,
    attempts: 0,
    enqueuedAt: new Date().toISOString(),
    lastAttemptAt: null,
    lastErrorCode: opts?.lastErrorCode ?? null,
    lastErrorMessage: opts?.lastErrorMessage ?? null,
    lastOpId: opts?.opId ?? null,
  })
  writePendingProjectGraphSyncItems(items)
}

function updatePendingProjectGraphSyncAttempt(projectId: string): void {
  const items = readPendingProjectGraphSyncItems()
  const idx = items.findIndex((x) => x.projectId === projectId)
  if (idx < 0) return
  items[idx] = {
    ...items[idx],
    attempts: items[idx].attempts + 1,
    lastAttemptAt: new Date().toISOString(),
  }
  writePendingProjectGraphSyncItems(items)
}

function dequeuePendingProjectGraphSync(projectId: string): void {
  if (!projectId) return
  const items = readPendingProjectGraphSyncItems().filter((x) => x.projectId !== projectId)
  writePendingProjectGraphSyncItems(items)
}

/** Remove o projeto da fila local de reenvio ao Supabase, sem nova tentativa (útil após RLS/403 ou quando já corrigiu fora do app). */
export function discardPendingProjectGraphSync(projectId: string): void {
  dequeuePendingProjectGraphSync(projectId)
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

function shouldSyncProjectManualCheckinToSupabase(): boolean {
  const v = import.meta.env.VITE_SYNC_PROJECT_MANUAL_CHECKIN
  return v === '1' || v === 'true'
}

/** Um pouco acima do abort do `fetch` global (`supabaseClient`) para o erro vir como Abort/rede, não só “race”. */
const PROJECT_WRITE_TIMEOUT_MS = 58_000
const PROJECT_SYNC_RETRY_DELAY_MS = 500
const PROJECT_SYNC_MAX_ATTEMPTS = 3

type ProjectSyncOperation = 'projects' | 'phases' | 'tasks'
type ProjectSyncFailureType = 'timeout' | 'policy' | 'auth' | 'network' | 'conflict' | 'ambiguous' | 'unknown'

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

/** PostgREST às vezes devolve `message` como objeto; evita `[object Object]` em logs e classificação. */
function syncErrPart(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (v instanceof Error) return v.message
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v)
    } catch {
      return String(v)
    }
  }
  return String(v)
}

function syncErrFingerprint(err: unknown): string {
  if (err == null) return ''
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (typeof err === 'object') {
    const o = err as Record<string, unknown>
    const code = syncErrPart(o.code)
    const message = syncErrPart(o.message)
    const details = syncErrPart(o.details)
    const hint = syncErrPart(o.hint)
    const status = typeof o.status === 'number' ? `http=${o.status}` : ''
    const joined = [code, message, details, hint, status].filter(Boolean).join(' | ')
    if (joined) return joined
    try {
      return JSON.stringify(err)
    } catch {
      return String(err)
    }
  }
  return String(err)
}

function classifyProjectSyncError(err: unknown): {
  type: ProjectSyncFailureType
  reason: string
  action: string
  canRetry: boolean
} {
  const e = err as { message?: string; code?: string; status?: number; details?: string; hint?: string }
  const code = String(e?.code ?? '').toUpperCase()
  const message = syncErrPart(e?.message)
  const details = syncErrPart(e?.details)
  const hint = syncErrPart(e?.hint)
  const status = typeof e?.status === 'number' ? e.status : null
  const body = `${message} ${details} ${hint}`.toLowerCase()
  const errName = String((e as { name?: unknown }).name ?? '')

  if (errName === 'AbortError' || body.includes('the user aborted') || body.includes('operation was aborted')) {
    return {
      type: 'timeout',
      reason: 'Requisição interrompida por limite de tempo (rede ou servidor sem resposta).',
      action: 'Confira conexão e painel do Supabase; tente de novo em instantes.',
      canRetry: true,
    }
  }

  if (message.includes('Tempo esgotado')) {
    return {
      type: 'timeout',
      reason: 'Tempo limite da operação atingido.',
      action: 'Verifique a rede e se o projeto Supabase está ativo; tente novamente.',
      /** Repetir o mesmo POST costuma só somar minutos na UI; fila de re-sync cuida do retry. */
      canRetry: true,
    }
  }
  if (message.startsWith('PRJ_CREATE_AMBIGUOUS') || message.includes('|type=ambiguous|')) {
    return {
      type: 'ambiguous',
      reason: 'Sem confirmação material da escrita remota (nenhuma linha retornada).',
      action: 'Mantenha em pendência e tente sincronizar novamente.',
      canRetry: true,
    }
  }
  /** Erros já normalizados por `toProjectSyncError` — não confundir com "network" só por conter "timeout". */
  if (message.startsWith('PRJ_CREATE_TIMEOUT') || message.includes('|type=timeout|')) {
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
  /** 400 comum: coluna ausente (`freeze_timeline`) ou CHECK de `status` desatualizado no remoto. */
  if (status === 400 || code === '23514' || code === '42703' || code === 'PGRST204') {
    const summary = `${message} ${details} ${hint}`.trim().slice(0, 420)
    const isCheck =
      code === '23514' ||
      body.includes('check constraint') ||
      body.includes('projects_status_check') ||
      body.includes('violates check constraint')
    const isMissingColumn =
      code === '42703' ||
      code === 'PGRST204' ||
      body.includes('freeze_timeline') ||
      body.includes('schema cache') ||
      (body.includes('column') && (body.includes('does not exist') || body.includes('unknown'))) ||
      body.includes('could not find') ||
      body.includes('unrecognized')
    if (isMissingColumn) {
      return {
        type: 'unknown',
        reason: summary || 'Requisição inválida (400): possível coluna ausente ou schema cache desatualizado.',
        action:
          'No Supabase → SQL Editor: execute `023_projects_freeze_timeline.sql` (coluna `freeze_timeline`). ' +
          'Se ainda falhar, confira migrations `019`–`022` e `024` em `supabase/sql` do repositório.',
        canRetry: false,
      }
    }
    if (isCheck) {
      return {
        type: 'unknown',
        reason: summary || 'Violação de CHECK no campo status (ou tipo incompatível).',
        action:
          'No SQL Editor: alinhe o CHECK de `projects.status` com o app — em ordem típica `019`, `022` e `024_projects_status_inadimplente.sql`.',
        canRetry: false,
      }
    }
    return {
      type: 'unknown',
      reason: summary || 'Bad Request (400) do PostgREST.',
      action:
        'Inspecione o corpo JSON do erro na aba Network do navegador; compare com as migrations em `supabase/sql`.',
      canRetry: false,
    }
  }
  if (
    status === 429 ||
    (status !== null && status >= 500) ||
    body.includes('fetch failed') ||
    body.includes('network') ||
    body.includes('failed to fetch')
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
  write: () => Promise<{ error: { message: string } | null; data?: unknown }>,
  opId?: string | null,
  ensureApplied?: (res: { error: { message: string } | null; data?: unknown }) => boolean,
): Promise<void> {
  const startedAt = Date.now()
  let attempts = 0
  while (attempts < PROJECT_SYNC_MAX_ATTEMPTS) {
    attempts++
    try {
      const res = await raceProjectWrite(write(), `sincronizar ${operation} na nuvem`)
      const { error } = res
      if (!error && ensureApplied && !ensureApplied(res)) {
        throw new Error(
          formatProjectSyncErrorMessage({
            code: 'PRJ_CREATE_AMBIGUOUS',
            operation,
            type: 'ambiguous',
            reason: 'Sem confirmação de escrita no retorno da API.',
            action: 'Mantenha pendente e tente sincronizar novamente.',
          }),
        )
      }
      if (!error) return
      throw error
    } catch (err) {
      const info = classifyProjectSyncError(err)
      const durationMs = Date.now() - startedAt
      console.warn('[Supabase] project sync failure', {
        operation,
        projectId,
        opId: opId ?? null,
        type: info.type,
        durationMs,
        attempts,
        maxAttempts: PROJECT_SYNC_MAX_ATTEMPTS,
        errorMessage: syncErrFingerprint(err),
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
        ambiguous: 'PRJ_CREATE_AMBIGUOUS',
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
              'Verifique rede, se o projeto Supabase está ativo (não congelado) e se as policies RLS permitem esta alteração.',
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
  if (Object.prototype.hasOwnProperty.call(patch, 'cancelledAt')) {
    o.cancelled_at = toPgDateOnly(patch.cancelledAt ?? null)
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
  /** `registerProjectManualCheckin` manda só check-in: precisa ir ao PostgREST mesmo sem `VITE_SYNC_PROJECT_MANUAL_CHECKIN`, senão o pull sobrescreve o Dexie com null. */
  const patchTouchesManualCheckin =
    Object.prototype.hasOwnProperty.call(patch, 'lastManualCheckinAt') ||
    Object.prototype.hasOwnProperty.call(patch, 'lastManualCheckinBy')
  if (shouldSyncProjectManualCheckinToSupabase() || patchTouchesManualCheckin) {
    set('lastManualCheckinAt', 'last_manual_checkin_at', patch.lastManualCheckinAt)
    set('lastManualCheckinBy', 'last_manual_checkin_by', patch.lastManualCheckinBy)
  }
  set('manualAttentionNote', 'manual_attention_note', patch.manualAttentionNote)
  set('manualAttentionAt', 'manual_attention_at', patch.manualAttentionAt)
  set('manualAttentionBy', 'manual_attention_by', patch.manualAttentionBy)
  set('clientType', 'client_type', patch.clientType)
  if (Object.prototype.hasOwnProperty.call(patch, 'freezeTimeline')) {
    o.freeze_timeline = patch.freezeTimeline
  }
  return o
}

/** Atualiza só as colunas informadas (PostgREST `PATCH` — payload leve, ideal para formulário de projeto). */
export async function updateProjectPartialInSupabase(
  projectId: string,
  patch: Partial<DbProject>,
  opId?: string | null,
): Promise<void> {
  const client = assertSupabase()
  const body = dbProjectPartialToSupabaseUpdate(patch)
  if (Object.keys(body).length === 0) return
  await runProjectSyncWrite(
    'projects',
    projectId,
    async () => await client.from('projects').update(body).eq('id', projectId).select('id').maybeSingle(),
    opId,
    (res) => {
      const data = res.data as { id?: string } | null | undefined
      return Boolean(data?.id)
    },
  )
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
    cancelled_at: toPgDateOnly(v.cancelledAt ?? null),
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
    ...(shouldSyncProjectManualCheckinToSupabase()
      ? {
          last_manual_checkin_at: v.lastManualCheckinAt,
          last_manual_checkin_by: v.lastManualCheckinBy,
        }
      : {}),
    manual_attention_note: v.manualAttentionNote,
    manual_attention_at: v.manualAttentionAt,
    manual_attention_by: v.manualAttentionBy,
    client_type: v.clientType,
    freeze_timeline: v.freezeTimeline ?? [],
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

function shouldSyncTaskIsAdHocToSupabase(): boolean {
  const v = import.meta.env.VITE_SYNC_TASK_IS_AD_HOC
  return v === '1' || v === 'true'
}

function shouldSyncTaskNoShowFieldsToSupabase(): boolean {
  const v = import.meta.env.VITE_SYNC_TASK_NO_SHOW_FIELDS
  return v === '1' || v === 'true'
}

export function dbTaskToSupabaseRow(v: DbTask): Record<string, unknown> {
  const row: Record<string, unknown> = {
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
    completed_at: v.completedAt ?? null,
    cancelled_at: v.cancelledAt ?? null,
  }
  if (shouldSyncTaskNoShowFieldsToSupabase()) {
    row.cancel_reason = v.cancellationReason ?? null
    row.rescheduled_from_task_id = v.rescheduledFromTaskId ?? null
    row.rescheduled_to_task_id = v.rescheduledToTaskId ?? null
  }
  /**
   * Coluna `is_ad_hoc` só existe após `009_tasks_is_ad_hoc.sql`. Enviar sem a coluna quebra o upsert (PGRST).
   * Ative `VITE_SYNC_TASK_IS_AD_HOC=1` no .env depois de aplicar a migration em todos os ambientes.
   */
  if (shouldSyncTaskIsAdHocToSupabase() && v.isAdHoc === true) row.is_ad_hoc = true
  return row
}

/** Grava um projeto inteiro no Supabase (INSERT/UPSERT — use após criação ou sync amplo; edições de formulário preferem `updateProjectPartialInSupabase`). */
export async function upsertProjectToSupabase(project: DbProject): Promise<void> {
  const client = assertSupabase()
  const payload = dbProjectToSupabaseRow(project)
  await runProjectSyncWrite(
    'projects',
    project.id,
    async () => await client.from('projects').upsert(payload).select('id').maybeSingle(),
    undefined,
    (res) => {
      const data = res.data as { id?: string } | null | undefined
      return Boolean(data?.id)
    },
  )
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
    async () => await client.from('phases').upsert(phases.map(dbPhaseToSupabaseRow)).select('id'),
    undefined,
    (res) => Array.isArray(res.data) && res.data.length > 0,
  )
}

export async function upsertTasksToSupabase(tasks: DbTask[]): Promise<void> {
  if (tasks.length === 0) return
  const client = assertSupabase()
  await runProjectSyncWrite(
    'tasks',
    tasks[0]?.projectId ?? null,
    async () => await client.from('tasks').upsert(tasks.map(dbTaskToSupabaseRow)).select('id'),
    undefined,
    (res) => Array.isArray(res.data) && res.data.length > 0,
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
export async function upsertProjectGraphFromDexie(projectId: string): Promise<boolean> {
  if (!supabase) return false
  if (inFlightProjectGraphSync.has(projectId)) return false
  inFlightProjectGraphSync.add(projectId)
  const p = await db.projects.get(projectId)
  if (!p) {
    inFlightProjectGraphSync.delete(projectId)
    return false
  }
  const opId = crypto.randomUUID()
  const startedAt = Date.now()
  let failedOperation: ProjectSyncOperation = 'projects'
  try {
    failedOperation = 'projects'
    await runProjectSyncWrite('projects', projectId, async () => {
      const payload = dbProjectToSupabaseRow(p)
      const client = assertSupabase()
      return await client.from('projects').upsert(payload).select('id').maybeSingle()
    }, opId, (res) => {
      const data = res.data as { id?: string } | null | undefined
      return Boolean(data?.id)
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
    return true
  } catch (err) {
    const info = classifyProjectSyncError(err)
    const codeByType: Record<ProjectSyncFailureType, string> = {
      timeout: 'PRJ_CREATE_TIMEOUT',
      policy: 'PRJ_CREATE_RLS',
      auth: 'PRJ_CREATE_AUTH',
      network: 'PRJ_CREATE_NETWORK',
      conflict: 'PRJ_CREATE_CONFLICT',
      ambiguous: 'PRJ_CREATE_AMBIGUOUS',
      unknown: 'PRJ_CREATE_SYNC',
    }
    const code = codeByType[info.type]
    const message = toProjectSyncError(
      codeByType[info.type],
      failedOperation,
      err,
    )
    console.error('[Supabase] project graph sync failed', {
      projectId,
      opId,
      type: info.type,
      durationMs: Date.now() - startedAt,
    })
    enqueuePendingProjectGraphSync(projectId, {
      opId,
      lastErrorCode: code,
      lastErrorMessage: message.message,
    })
    throw message
  } finally {
    inFlightProjectGraphSync.delete(projectId)
  }
}

export async function flushPendingProjectGraphSyncQueue(): Promise<void> {
  if (!supabase) return
  const queue = readPendingProjectGraphSyncItems()
  if (queue.length === 0) return
  const now = Date.now()
  for (const item of queue) {
    const projectId = item.projectId
    const lastAttemptMs = item.lastAttemptAt ? Date.parse(item.lastAttemptAt) : Number.NaN
    const inCooldown =
      Number.isFinite(lastAttemptMs) && now - lastAttemptMs < PENDING_PROJECT_SYNC_COOLDOWN_MS
    if (inCooldown) continue
    try {
      updatePendingProjectGraphSyncAttempt(projectId)
      const synced = await upsertProjectGraphFromDexie(projectId)
      if (synced) dequeuePendingProjectGraphSync(projectId)
    } catch (err) {
      console.warn('[Supabase] pending project graph sync still failing', { projectId, err })
    }
  }
}

export async function flushPendingProjectGraphSyncByProject(projectId: string): Promise<void> {
  if (!supabase || !projectId) return
  updatePendingProjectGraphSyncAttempt(projectId)
  const synced = await upsertProjectGraphFromDexie(projectId)
  if (synced) dequeuePendingProjectGraphSync(projectId)
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
      clientType: normalizeProjectClientType((r as { client_type?: unknown }).client_type),
      planType: String(r.plan_type ?? ''),
      hoursContracted: toNumber(r.hours_contracted),
      hoursUsed: toNumber(r.hours_used),
      startDate: toStringOrNull(r.start_date),
      dueDate: toStringOrNull(r.due_date),
      cancelledAt: toStringOrNull((r as { cancelled_at?: unknown }).cancelled_at),
      status: normalizeRemoteProjectStatus(String(r.status ?? 'ativo')),
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
      remoteUpdatedAt: toStringOrNull(r.updated_at),
      lastManualCheckinAt: toStringOrNull((r as { last_manual_checkin_at?: unknown }).last_manual_checkin_at),
      lastManualCheckinBy: toStringOrNull((r as { last_manual_checkin_by?: unknown }).last_manual_checkin_by),
      manualAttentionNote: toStringOrNull((r as { manual_attention_note?: unknown }).manual_attention_note),
      manualAttentionAt: toStringOrNull((r as { manual_attention_at?: unknown }).manual_attention_at),
      manualAttentionBy: toStringOrNull((r as { manual_attention_by?: unknown }).manual_attention_by),
      freezeTimeline: parseFreezeTimeline((r as { freeze_timeline?: unknown }).freeze_timeline),
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
      remoteUpdatedAt: toStringOrNull(r.updated_at),
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
      isAdHoc: toBool((r as { is_ad_hoc?: unknown }).is_ad_hoc, false),
      createdAt: String(r.created_at ?? new Date().toISOString()),
      code: String(r.code ?? ''),
      sortOrder: toNumber(r.sort_order),
      completedAt: toStringOrNull((r as { completed_at?: unknown }).completed_at),
      cancelledAt: toStringOrNull((r as { cancelled_at?: unknown }).cancelled_at),
      cancellationReason: toStringOrNull((r as { cancel_reason?: unknown }).cancel_reason) as DbTask['cancellationReason'],
      rescheduledFromTaskId: toStringOrNull(
        (r as { rescheduled_from_task_id?: unknown }).rescheduled_from_task_id,
      ),
      rescheduledToTaskId: toStringOrNull((r as { rescheduled_to_task_id?: unknown }).rescheduled_to_task_id),
      remoteUpdatedAt: toStringOrNull(r.updated_at),
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

const defByRemoteTable = new Map<string, BridgeDef<unknown>>(defs.map((d) => [d.remoteTable, d]))

function remoteVersionMs(row: unknown): number {
  if (!row || typeof row !== 'object') return 0
  const s = (row as { remoteUpdatedAt?: string | null }).remoteUpdatedAt
  if (typeof s !== 'string' || !s.trim()) return 0
  const t = Date.parse(s)
  return Number.isFinite(t) ? t : 0
}

export async function applyRemoteRowFromSupabase(
  remoteTable: string,
  row: Record<string, unknown> | null,
  event: 'INSERT' | 'UPDATE' | 'DELETE',
): Promise<void> {
  const def = defByRemoteTable.get(remoteTable)
  if (!def) return

  if (event === 'DELETE') {
    const id = row?.id != null ? String(row.id) : null
    if (!id) return
    pushSyncMute()
    try {
      await (db as unknown as Record<string, { delete: (k: string) => Promise<unknown> }>)[String(def.localTable)].delete(
        id,
      )
    } finally {
      popSyncMute()
    }
    return
  }

  if (!row) return
  const mapped = def.fromRemote(row)
  const id = (mapped as { id?: unknown }).id != null ? String((mapped as { id: unknown }).id) : null
  if (!id) return

  const table = (db as unknown as Record<string, { get: (k: string) => Promise<unknown> }>)[String(def.localTable)]
  const existing = await table.get(id)
  if (existing && remoteVersionMs(existing) > remoteVersionMs(mapped)) return

  pushSyncMute()
  try {
    await (db as unknown as Record<string, { put: (x: unknown) => Promise<unknown> }>)[String(def.localTable)].put(
      mapped,
    )
  } finally {
    popSyncMute()
  }

  if (isIncrementalRemoteTable(remoteTable) && typeof row.updated_at === 'string') {
    bumpSyncCursor(remoteTable, row.updated_at)
  }
}

/** @returns true se gravou (ou tabela opcional ausente); false após esgotar tentativas. */
async function upsertRemoteWithRetry(def: BridgeDef<unknown>, localRow: unknown): Promise<boolean> {
  const payload = def.toRemote(localRow)
  let lastMsg = 'Falha desconhecida ao sincronizar.'
  for (let attempt = 1; attempt <= PROJECT_SYNC_MAX_ATTEMPTS; attempt++) {
    let error: { message?: string } | null = null
    try {
      const client = assertSupabase()
      const res = await client.from(def.remoteTable).upsert(payload)
      error = res.error
    } catch (err) {
      error = {
        message: err instanceof Error ? err.message : String(err),
      }
    }
    if (!error) {
      broadcastDexieSyncHint()
      return true
    }
    if (shouldIgnoreMissingTable(def.remoteTable, error)) return true
    lastMsg = error.message ?? lastMsg
    if (attempt < PROJECT_SYNC_MAX_ATTEMPTS) await sleep(retryDelayMs(attempt))
  }
  dispatchSyncFailure({ table: def.remoteTable, operation: 'upsert', message: lastMsg })
  pushRuntimeDiagnostic({
    source: 'dexie-bridge',
    level: 'warn',
    message: `Falha em upsert remoto (${def.remoteTable}).`,
    details: lastMsg,
  })
  const syncInfo = classifyProjectSyncError({ message: lastMsg })
  if (def.remoteTable === 'projects') {
    try {
      const client = assertSupabase()
      const { data: userData } = await client.auth.getUser()
      const uid = userData.user?.id ?? null
      let profileRole: string | null = null
      let profileStatus: string | null = null
      let profileErr: string | null = null
      if (uid) {
        const { data: profile, error: pErr } = await client
          .from('profiles')
          .select('role,status')
          .eq('id', uid)
          .maybeSingle()
        if (pErr) profileErr = pErr.message
        profileRole = (profile as { role?: string } | null)?.role ?? null
        profileStatus = (profile as { status?: string } | null)?.status ?? null
      }
      pushRuntimeDiagnostic({
        source: 'dexie-bridge',
        level: 'warn',
        message: 'Falha em upsert remoto (projects) com contexto de perfil.',
        details: `uid=${uid ?? 'null'} role=${profileRole ?? 'null'} status=${profileStatus ?? 'null'} err=${profileErr ?? 'none'} msg=${lastMsg}`,
      })
    } catch {
      // ignore debug-only probe failures
    }
  }
  if (
    (def.remoteTable === 'projects' || def.remoteTable === 'phases' || def.remoteTable === 'tasks') &&
    localRow &&
    typeof localRow === 'object'
  ) {
    const src = localRow as { id?: unknown; projectId?: unknown }
    const projectId =
      def.remoteTable === 'projects'
        ? typeof src.id === 'string'
          ? src.id
          : null
        : typeof src.projectId === 'string'
          ? src.projectId
          : null
    if (projectId && syncInfo.type !== 'policy') {
      enqueuePendingProjectGraphSync(projectId, {
        lastErrorCode: 'PRJ_BG_SYNC',
        lastErrorMessage: lastMsg,
      })
    }
  }
  return false
}

const eventBridgeDef = defs.find((d) => d.localTable === 'events')

/** Upsert explícito na nuvem (hooks Dexie não aguardam Promise; use após gravar local com sync mutado). */
export async function syncEventRowToSupabase(ev: DbEvent): Promise<void> {
  if (!supabase || !eventBridgeDef) return
  const ok = await upsertRemoteWithRetry(eventBridgeDef, ev)
  if (!ok) {
    throw new Error(
      'O evento foi salvo localmente, mas não na nuvem. Verifique conexão, sessão e permissões; tente salvar de novo.',
    )
  }
}

async function deleteRemoteWithRetry(def: BridgeDef<unknown>, id: string): Promise<void> {
  let lastMsg = 'Falha desconhecida ao excluir na nuvem.'
  for (let attempt = 1; attempt <= PROJECT_SYNC_MAX_ATTEMPTS; attempt++) {
    let error: { message?: string } | null = null
    try {
      const client = assertSupabase()
      const res = await client.from(def.remoteTable).delete().eq('id', id)
      error = res.error
    } catch (err) {
      error = {
        message: err instanceof Error ? err.message : String(err),
      }
    }
    if (!error) {
      broadcastDexieSyncHint()
      return
    }
    if (shouldIgnoreMissingTable(def.remoteTable, error)) return
    lastMsg = error.message ?? lastMsg
    if (attempt < PROJECT_SYNC_MAX_ATTEMPTS) await sleep(retryDelayMs(attempt))
  }
  dispatchSyncFailure({ table: def.remoteTable, operation: 'delete', message: lastMsg })
  pushRuntimeDiagnostic({
    source: 'dexie-bridge',
    level: 'warn',
    message: `Falha em delete remoto (${def.remoteTable}).`,
    details: lastMsg,
  })
}

function installHooks() {
  if (hooksInstalled || !supabase) return
  hooksInstalled = true

  for (const def of defs) {
    const table = db.table(def.localTable as string) as unknown as DexieTableForSyncHooks
    // Dexie 4: hooks creating/updating não aguardam Promise; retornar Promise quebrava o sync e a UI “salvava” só no IndexedDB.
    table.hook('creating', function (_primaryKey: unknown, obj: unknown) {
      if (syncingMuted) return
      void upsertRemoteWithRetry(def, obj).catch((err) => {
        console.warn('[Supabase] Unhandled creating hook sync error (captured).', {
          table: def.remoteTable,
          err,
        })
      })
    })
    table.hook('updating', function (mods: Record<string, unknown>, _primaryKey: unknown, obj: Record<string, unknown>) {
      if (syncingMuted) return
      const merged = { ...obj, ...mods }
      void upsertRemoteWithRetry(def, merged).catch((err) => {
        console.warn('[Supabase] Unhandled updating hook sync error (captured).', {
          table: def.remoteTable,
          err,
        })
      })
    })
    table.hook('deleting', function (primaryKey: unknown) {
      if (syncingMuted) return
      void deleteRemoteWithRetry(def, String(primaryKey)).catch((err) => {
        console.warn('[Supabase] Unhandled deleting hook sync error (captured).', {
          table: def.remoteTable,
          err,
        })
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
    userType: String(r.user_type ?? 'internal') === 'client' ? 'client' : 'internal',
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
  await db.transaction('rw', db.users, async () => {
    await db.users.clear()
    await db.users.bulkPut(users)
  })
}

async function executeRefreshSupabaseDexieCache(): Promise<void> {
  installHooks()
  pushSyncMute()
  try {
    for (const def of defs) {
      const table = db.table(def.localTable as string) as unknown as DexieTableForSyncHooks
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
        const store = db[def.localTable] as Table
        await db.transaction('rw', store, async () => {
          await table.clear()
          if (mapped.length > 0) await table.bulkPut(mapped)
        })
        if (mapped.length > 0 && isIncrementalRemoteTable(def.remoteTable)) {
          let maxIso: string | null = null
          for (const r of rows) {
            const u = typeof (r as { updated_at?: unknown }).updated_at === 'string' ? (r as { updated_at: string }).updated_at : null
            if (u && (!maxIso || u > maxIso)) maxIso = u
          }
          if (maxIso) setSyncCursor(def.remoteTable, maxIso)
        }
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

/** Sincroniza o IndexedDB com o Postgres; exige sessão (evita 403 em papéis sem privilégio na API). */
export async function refreshSupabaseDexieCache(): Promise<void> {
  const client = supabase
  if (!client) return
  const {
    data: { session },
  } = await client.auth.getSession()
  if (!session?.user) return

  if (refreshSupabaseDexieCacheInFlight) return refreshSupabaseDexieCacheInFlight

  const flightBox: { current: Promise<void> | null } = { current: null }
  const run = (async () => {
    try {
      await executeRefreshSupabaseDexieCache()
    } finally {
      if (refreshSupabaseDexieCacheInFlight === flightBox.current) refreshSupabaseDexieCacheInFlight = null
    }
  })()
  flightBox.current = run
  refreshSupabaseDexieCacheInFlight = run
  return run
}

export async function initializeSupabaseDexieBridge(): Promise<void> {
  if (!supabase) return
  installHooks()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return
  // Refresh completo fica a cargo do AuthContext após validar perfil ativo (evita refresh duplicado e GET sem JWT estável).
  await flushPendingProjectGraphSyncQueue()
  if (!pendingProjectGraphListenerInstalled && typeof window !== 'undefined') {
    pendingProjectGraphListenerInstalled = true
    window.addEventListener('online', () => {
      void flushPendingProjectGraphSyncQueue().catch((err) => {
        console.warn('[Supabase] Falha ao drenar fila pendente (online).', err)
      })
    })
    window.addEventListener('focus', () => {
      void flushPendingProjectGraphSyncQueue().catch((err) => {
        console.warn('[Supabase] Falha ao drenar fila pendente (focus).', err)
      })
    })
  }
}

