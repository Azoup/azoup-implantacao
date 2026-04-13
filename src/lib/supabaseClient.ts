import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Cliente Supabase (null se variáveis não estiverem definidas).
 * O app continua usando Dexie até a migração; isso só prepara a conexão.
 */
export const supabase: SupabaseClient | null =
  typeof url === 'string' && url.length > 0 && typeof anonKey === 'string' && anonKey.length > 0
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null

export function isSupabaseConfigured(): boolean {
  return supabase !== null
}
