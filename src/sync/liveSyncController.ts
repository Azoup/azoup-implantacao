import { supabase } from '../lib/supabaseClient'
import { startCrossTabDexieSync, stopCrossTabDexieSync } from './crossTabSync'
import { startSupabaseRealtimeDomainSync, stopSupabaseRealtimeDomainSync } from './supabaseRealtimeBridge'
import { runIncrementalDomainSync } from './supabaseIncrementalPull'

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
    void runIncrementalDomainSync()
  })
  startSupabaseRealtimeDomainSync()
  void runIncrementalDomainSync()

  pollTimer = window.setInterval(() => {
    void runIncrementalDomainSync()
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
