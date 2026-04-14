import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const rawAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

function looksLikeValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function parseSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = typeof rawUrl === 'string' ? rawUrl.trim() : ''
  const anonKey = typeof rawAnon === 'string' ? rawAnon.trim() : ''
  if (!url || !anonKey) return null
  if (!looksLikeValidHttpUrl(url)) return null
  return { url, anonKey }
}

const parsed = parseSupabaseEnv()

if (import.meta.env.DEV) {
  const urlT = typeof rawUrl === 'string' ? rawUrl.trim() : ''
  const keyT = typeof rawAnon === 'string' ? rawAnon.trim() : ''
  if ((urlT || keyT) && !parsed) {
    console.warn(
      '[VynTask] Supabase desativado: confira VITE_SUPABASE_URL (https://…supabase.co, sem espaços) e VITE_SUPABASE_ANON_KEY no .env.local.',
    )
  }
}

/**
 * Cliente Supabase (null se variáveis ausentes ou URL/chave inválidas).
 * Evita createClient com placeholder — senão o bundle quebra antes do React.
 */
export const supabase: SupabaseClient | null = parsed
  ? createClient(parsed.url, parsed.anonKey, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null

export function isSupabaseConfigured(): boolean {
  return supabase !== null
}
