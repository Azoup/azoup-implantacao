import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { applyRemoteRowFromSupabase } from './supabaseDexieBridge'
import { broadcastDexieSyncHint } from './crossTabSync'

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
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('[Supabase] Realtime:', status, err ?? '')
      }
    })
  channel = ch
}

export function stopSupabaseRealtimeDomainSync(): void {
  if (!supabase || !channel) return
  void supabase.removeChannel(channel)
  channel = null
}
