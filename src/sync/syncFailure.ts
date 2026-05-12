export const SYNC_FAILURE_EVENT = 'implantacao-azoup-sync-failure'

export type SyncFailureDetail = {
  table: string
  operation: 'upsert' | 'delete'
  message: string
}

export function dispatchSyncFailure(detail: SyncFailureDetail): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<SyncFailureDetail>(SYNC_FAILURE_EVENT, { detail }))
}
