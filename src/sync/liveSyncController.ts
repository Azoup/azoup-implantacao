import { supabase } from '../lib/supabaseClient'
import { pushRuntimeDiagnostic } from '../diagnostics/runtimeDiagnostics'
import { startCrossTabDexieSync, stopCrossTabDexieSync } from './crossTabSync'
import { startSupabaseRealtimeDomainSync, stopSupabaseRealtimeDomainSync } from './supabaseRealtimeBridge'
import { runIncrementalDomainSync } from './supabaseIncrementalPull'

function runIncrementalDomainSyncSafe(): void {
  void runIncrementalDomainSync().catch((e) => {
    pushRuntimeDiagnostic({
      source: 'live-sync',
      level: 'warn',
      message: 'Pull incremental falhou (tarefa em background).',
      details: e instanceof Error ? e.message : String(e),
    })
  })
}

const POLL_MS = 120_000

let pollTimer: number | null = null
let liveSyncStartToken = 0

function stopLiveSyncInternal(bumpToken: boolean): void {
  if (bumpToken) liveSyncStartToken++
  stopSupabaseRealtimeDomainSync()
  stopCrossTabDexieSync()
  if (pollTimer != null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

export async function startLiveSyncAfterBridgeReady(): Promise<void> {
  if (!supabase || typeof window === 'undefined') return
  const token = ++liveSyncStartToken
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (token !== liveSyncStartToken) return
  if (!session?.user) return

  stopLiveSyncInternal(false)
  if (token !== liveSyncStartToken) return

  startCrossTabDexieSync(() => {
    if (token !== liveSyncStartToken) return
    runIncrementalDomainSyncSafe()
  })
  startSupabaseRealtimeDomainSync()
  if (token !== liveSyncStartToken) return
  runIncrementalDomainSyncSafe()

  pollTimer = window.setInterval(() => {
    if (token !== liveSyncStartToken) return
    runIncrementalDomainSyncSafe()
  }, POLL_MS)
}

export function stopLiveSyncOnLogout(): void {
  stopLiveSyncInternal(true)
}
