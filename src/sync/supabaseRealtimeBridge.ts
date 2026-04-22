import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { applyRemoteRowFromSupabase } from './supabaseDexieBridge'
import { broadcastDexieSyncHint } from './crossTabSync'
import { pushRuntimeDiagnostic, setRealtimeRuntimeStatus } from '../diagnostics/runtimeDiagnostics'

let channel: RealtimeChannel | null = null

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
    .channel('vyntask-domain-realtime')
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
      }
    })
  channel = ch
}

export function stopSupabaseRealtimeDomainSync(): void {
  if (!supabase || !channel) return
  void supabase.removeChannel(channel)
  channel = null
  setRealtimeRuntimeStatus('stopped')
}
