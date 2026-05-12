import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { applyRemoteRowFromSupabase } from './supabaseDexieBridge'
import { broadcastDexieSyncHint } from './crossTabSync'
import { pushRuntimeDiagnostic, setRealtimeRuntimeStatus } from '../diagnostics/runtimeDiagnostics'

let channel: RealtimeChannel | null = null
let reconnectTimer: number | null = null
const RECONNECT_DELAY_MS = 5000
const RECONNECT_WINDOW_MS = 60_000
const MAX_RECONNECTS_PER_WINDOW = 10
let reconnectTimestamps: number[] = []

function pruneReconnectWindow(now: number): void {
  reconnectTimestamps = reconnectTimestamps.filter((t) => now - t < RECONNECT_WINDOW_MS)
}

function scheduleRealtimeReconnect(): void {
  if (typeof window === 'undefined') return
  if (reconnectTimer != null) return
  const now = Date.now()
  pruneReconnectWindow(now)
  if (reconnectTimestamps.length >= MAX_RECONNECTS_PER_WINDOW) {
    pushRuntimeDiagnostic({
      source: 'realtime',
      level: 'warn',
      message: 'Muitas reconexões Realtime em sequência; aguarde ou verifique o projeto no Supabase (Realtime nas tabelas projects/phases/tasks).',
      details: `>${MAX_RECONNECTS_PER_WINDOW} tentativas em ${RECONNECT_WINDOW_MS / 1000}s`,
    })
    return
  }
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    reconnectTimestamps.push(Date.now())
    if (!supabase) return
    stopSupabaseRealtimeDomainSync()
    startSupabaseRealtimeDomainSync()
  }, RECONNECT_DELAY_MS)
}

type PgChangePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown> | null
  old: Record<string, unknown> | null
}

function handleDomain(table: 'projects' | 'phases' | 'tasks', payload: PgChangePayload): void {
  void (async () => {
    try {
      if (payload.eventType === 'DELETE') {
        await applyRemoteRowFromSupabase(table, payload.old, 'DELETE')
      } else {
        await applyRemoteRowFromSupabase(
          table,
          payload.new,
          payload.eventType === 'INSERT' ? 'INSERT' : 'UPDATE',
        )
      }
      broadcastDexieSyncHint()
    } catch (e) {
      console.warn('[Supabase] Realtime: falha ao aplicar mudança.', { table, e })
    }
  })()
}

export function startSupabaseRealtimeDomainSync(): void {
  if (!supabase || channel) return
  setRealtimeRuntimeStatus('subscribing')
  const client = supabase
  const ch = client
    .channel('implantacao-azoup-domain-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) =>
      handleDomain('projects', payload as PgChangePayload),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'phases' }, (payload) =>
      handleDomain('phases', payload as PgChangePayload),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) =>
      handleDomain('tasks', payload as PgChangePayload),
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        reconnectTimestamps = []
        setRealtimeRuntimeStatus('subscribed')
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('[Supabase] Realtime:', status, err ?? '')
        const msg = err ? String((err as { message?: string }).message ?? err) : status
        setRealtimeRuntimeStatus(status === 'TIMED_OUT' ? 'timed_out' : 'error', msg)
        pushRuntimeDiagnostic({
          source: 'realtime',
          level: 'warn',
          message: `Canal realtime em falha: ${status}`,
          details: msg,
        })
        stopSupabaseRealtimeDomainSync()
        scheduleRealtimeReconnect()
      }
    })
  channel = ch
}

export function stopSupabaseRealtimeDomainSync(): void {
  if (reconnectTimer != null && typeof window !== 'undefined') {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (!supabase || !channel) return
  void supabase.removeChannel(channel)
  channel = null
  setRealtimeRuntimeStatus('stopped')
}
