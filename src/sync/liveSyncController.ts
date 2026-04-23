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

export async function startLiveSyncAfterBridgeReady(): Promise<void> {
  if (!supabase || typeof window === 'undefined') return
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return

  stopLiveSyncOnLogout()

  startCrossTabDexieSync(() => {
    runIncrementalDomainSyncSafe()
  })
  startSupabaseRealtimeDomainSync()
  runIncrementalDomainSyncSafe()

  pollTimer = window.setInterval(() => {
    runIncrementalDomainSyncSafe()
  }, POLL_MS)
}

export function stopLiveSyncOnLogout(): void {
  stopSupabaseRealtimeDomainSync()
  stopCrossTabDexieSync()
  if (pollTimer != null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}
