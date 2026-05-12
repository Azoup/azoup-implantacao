export type RuntimeDiagLevel = 'info' | 'warn' | 'error'

export type RuntimeDiagEntry = {
  id: string
  at: string
  source: string
  level: RuntimeDiagLevel
  message: string
  details?: string
}

export type BrowserCapabilitySnapshot = {
  userAgent: string
  hasLocalStorage: boolean
  hasSessionStorage: boolean
  hasIndexedDb: boolean
  hasBroadcastChannel: boolean
  hasWebSocket: boolean
}

const DIAG_KEY = 'implantacao_azoup.runtimeDiagnostics.v1'
const MAX_DIAG_ENTRIES = 120

export type RuntimeSyncSnapshot = {
  realtimeStatus: 'idle' | 'subscribing' | 'subscribed' | 'error' | 'timed_out' | 'stopped'
  realtimeAt: string | null
  realtimeError: string | null
  incrementalLastRunAt: string | null
  incrementalLastError: string | null
  incrementalLastAppliedRows: number
}

const runtimeSyncSnapshot: RuntimeSyncSnapshot = {
  realtimeStatus: 'idle',
  realtimeAt: null,
  realtimeError: null,
  incrementalLastRunAt: null,
  incrementalLastError: null,
  incrementalLastAppliedRows: 0,
}

function readEntries(): RuntimeDiagEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(DIAG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as RuntimeDiagEntry[]) : []
  } catch {
    return []
  }
}

function writeEntries(entries: RuntimeDiagEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DIAG_KEY, JSON.stringify(entries.slice(-MAX_DIAG_ENTRIES)))
  } catch {
    // ignore write errors
  }
}

export function pushRuntimeDiagnostic(entry: Omit<RuntimeDiagEntry, 'id' | 'at'>): void {
  const next: RuntimeDiagEntry = {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
    at: new Date().toISOString(),
    source: entry.source,
    level: entry.level,
    message: entry.message,
    details: entry.details,
  }
  const curr = readEntries()
  curr.push(next)
  writeEntries(curr)
}

export function listRuntimeDiagnostics(): RuntimeDiagEntry[] {
  return readEntries().sort((a, b) => b.at.localeCompare(a.at))
}

export function clearRuntimeDiagnostics(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(DIAG_KEY)
  } catch {
    // ignore
  }
}

function testStorage(kind: 'localStorage' | 'sessionStorage'): boolean {
  if (typeof window === 'undefined') return false
  try {
    const s = window[kind]
    const probe = `implantacao_azoup_probe_${kind}`
    s.setItem(probe, '1')
    s.removeItem(probe)
    return true
  } catch {
    return false
  }
}

export function getBrowserCapabilitySnapshot(): BrowserCapabilitySnapshot {
  const w = typeof window !== 'undefined' ? window : null
  return {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    hasLocalStorage: testStorage('localStorage'),
    hasSessionStorage: testStorage('sessionStorage'),
    hasIndexedDb: typeof indexedDB !== 'undefined',
    hasBroadcastChannel: typeof BroadcastChannel !== 'undefined',
    hasWebSocket: !!w && typeof w.WebSocket !== 'undefined',
  }
}

export function setRealtimeRuntimeStatus(
  status: RuntimeSyncSnapshot['realtimeStatus'],
  error?: string | null,
): void {
  runtimeSyncSnapshot.realtimeStatus = status
  runtimeSyncSnapshot.realtimeAt = new Date().toISOString()
  runtimeSyncSnapshot.realtimeError = error ?? null
}

export function setIncrementalRuntimeStatus(args: {
  lastRunAt?: string | null
  lastError?: string | null
  appliedRows?: number
}): void {
  if (args.lastRunAt !== undefined) runtimeSyncSnapshot.incrementalLastRunAt = args.lastRunAt
  if (args.lastError !== undefined) runtimeSyncSnapshot.incrementalLastError = args.lastError
  if (args.appliedRows !== undefined) runtimeSyncSnapshot.incrementalLastAppliedRows = args.appliedRows
}

export function getRuntimeSyncSnapshot(): RuntimeSyncSnapshot {
  return { ...runtimeSyncSnapshot }
}
