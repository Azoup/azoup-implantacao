import { supabase } from '../lib/supabaseClient'
import { applyRemoteRowFromSupabase } from './supabaseDexieBridge'
import { bumpSyncCursor, getSyncCursor } from './syncCursors'
import { broadcastDexieSyncHint } from './crossTabSync'

const DOMAIN_TABLES = ['projects', 'phases', 'tasks'] as const

function isMissingUpdatedAtError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? '').toLowerCase()
  const code = String((err as { code?: string })?.code ?? '')
  return code === '42703' || (msg.includes('column') && msg.includes('updated_at')) || msg.includes('updated_at')
}

export async function runIncrementalDomainSync(): Promise<void> {
  if (!supabase) return
  const client = supabase
  const {
    data: { session },
  } = await client.auth.getSession()
  if (!session?.user) return

  let appliedAny = false

  for (const table of DOMAIN_TABLES) {
    const cursor = getSyncCursor(table)
    if (!cursor) continue
    try {
      const pageSize = 500
      let from = 0
      let maxSeen = cursor
      while (true) {
        const { data, error } = await client
          .from(table)
          .select('*')
          .gt('updated_at', cursor)
          .order('updated_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, from + pageSize - 1)
        if (error) {
          if (isMissingUpdatedAtError(error)) {
            console.warn(
              '[Supabase] Pull incremental ignorado: coluna updated_at ausente em',
              table,
              '(aplique supabase/sql/optional/D_domain_row_versioning_updated_at.sql).',
            )
            break
          }
          throw error
        }
        const rows = (data ?? []) as Record<string, unknown>[]
        if (rows.length === 0) break
        for (const r of rows) {
          await applyRemoteRowFromSupabase(table, r, 'UPDATE')
          appliedAny = true
          const u = typeof r.updated_at === 'string' ? r.updated_at : null
          if (u && u > maxSeen) maxSeen = u
        }
        if (rows.length < pageSize) break
        from += pageSize
      }
      if (maxSeen > cursor) bumpSyncCursor(table, maxSeen)
    } catch (e) {
      console.warn('[Supabase] Falha no pull incremental.', { table, e })
    }
  }

  if (appliedAny) broadcastDexieSyncHint()
}
