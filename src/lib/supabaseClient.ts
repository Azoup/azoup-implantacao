import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const rawAnon = import.meta.env.VITE_SUPABASE_ANON_KEY
const rawMode = import.meta.env.VITE_DATA_MODE

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

export type DataMode = 'local' | 'cloud'

function parseMode(): DataMode {
  const m = typeof rawMode === 'string' ? rawMode.trim().toLowerCase() : ''
  return m === 'cloud' ? 'cloud' : 'local'
}

const parsed = parseSupabaseEnv()
const mode = parseMode()

if (import.meta.env.DEV) {
  const urlT = typeof rawUrl === 'string' ? rawUrl.trim() : ''
  const keyT = typeof rawAnon === 'string' ? rawAnon.trim() : ''
  if (mode === 'local') {
    console.info('[VynTask] Modo LOCAL ativo (VITE_DATA_MODE=local). Supabase desativado neste ambiente.')
  } else if ((urlT || keyT) && !parsed) {
    console.warn(
      '[VynTask] Supabase desativado: confira VITE_SUPABASE_URL (https://…supabase.co, sem espaços) e VITE_SUPABASE_ANON_KEY no .env.local.',
    )
  }
}

/**
 * Cliente Supabase (null em modo local, ou se variáveis ausentes/inválidas).
 */
export const supabase: SupabaseClient | null =
  mode === 'cloud' && parsed
    ? createClient(parsed.url, parsed.anonKey, {
        auth: {
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null

export function getDataMode(): DataMode {
  return mode
}

export function isSupabaseConfigured(): boolean {
  return mode === 'cloud' && supabase !== null
}
