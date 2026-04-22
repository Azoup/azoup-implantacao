import { pushRuntimeDiagnostic } from '../diagnostics/runtimeDiagnostics'
const PREFIX = 'vyntask.syncCursor.v1.'

const INCREMENTAL_TABLES = new Set(['projects', 'phases', 'tasks'])

export function isIncrementalRemoteTable(table: string): boolean {
  return INCREMENTAL_TABLES.has(table)
}

export function getSyncCursor(remoteTable: string): string | null {
  if (!isIncrementalRemoteTable(remoteTable)) return null
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(PREFIX + remoteTable) : null
  } catch (e) {
    pushRuntimeDiagnostic({
      source: 'sync-cursors',
      level: 'warn',
      message: `Falha ao ler cursor de sync (${remoteTable}).`,
      details: e instanceof Error ? e.message : String(e),
    })
    return null
  }
}

export function setSyncCursor(remoteTable: string, iso: string | null): void {
  if (!isIncrementalRemoteTable(remoteTable)) return
  if (typeof window === 'undefined') return
  try {
    if (iso == null || iso === '') window.localStorage.removeItem(PREFIX + remoteTable)
    else window.localStorage.setItem(PREFIX + remoteTable, iso)
  } catch (e) {
    pushRuntimeDiagnostic({
      source: 'sync-cursors',
      level: 'warn',
      message: `Falha ao gravar cursor de sync (${remoteTable}).`,
      details: e instanceof Error ? e.message : String(e),
    })
  }
}

/** Atualiza o cursor se `iso` for mais recente que o valor atual (comparação lexicográfica em ISO-8601). */
export function bumpSyncCursor(remoteTable: string, iso: string | null): void {
  if (!iso) return
  const prev = getSyncCursor(remoteTable)
  if (!prev || iso > prev) setSyncCursor(remoteTable, iso)
}
