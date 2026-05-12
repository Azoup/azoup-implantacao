import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { pushRuntimeDiagnostic } from '../diagnostics/runtimeDiagnostics'

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const rawAnon = import.meta.env.VITE_SUPABASE_ANON_KEY
const rawMode = import.meta.env.VITE_DATA_MODE
const OVERRIDE_KEY = 'implantacao_azoup.dataModeOverride.v1'

function looksLikeValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Deve ser **menor** que `PROJECT_WRITE_TIMEOUT_MS` no bridge de sync de projeto,
 * para o `fetch` abortar primeiro e liberar slot HTTP do browser (evita fila longa em cascata).
 */
const SUPABASE_HTTP_TIMEOUT_MS = 55_000

/** Evita requisições penduradas indefinidamente (rede lenta / edge sem resposta). */
async function supabaseFetchWithDeadline(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), SUPABASE_HTTP_TIMEOUT_MS)
  const parent = init?.signal
  const onParentAbort = () => ctrl.abort()
  if (parent) {
    if (parent.aborted) {
      clearTimeout(timer)
      throw new DOMException('Aborted', 'AbortError')
    }
    parent.addEventListener('abort', onParentAbort)
  }
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
    parent?.removeEventListener('abort', onParentAbort)
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
  return m === 'local' ? 'local' : 'cloud'
}

const parsed = parseSupabaseEnv()
const envMode = parseMode()

function readOverrideMode(): DataMode | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(OVERRIDE_KEY)?.trim().toLowerCase()
    if (raw === 'local' || raw === 'cloud') return raw
  } catch (e) {
    pushRuntimeDiagnostic({
      source: 'supabase-client',
      level: 'warn',
      message: 'Falha ao ler override de modo em localStorage.',
      details: e instanceof Error ? e.message : String(e),
    })
  }
  return null
}

function shouldAllowRuntimeOverride(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname.toLowerCase()
  return import.meta.env.DEV || host === 'localhost' || host === '127.0.0.1'
}

const runtimeOverride = shouldAllowRuntimeOverride() ? readOverrideMode() : null
const mode: DataMode = runtimeOverride ?? envMode

if (import.meta.env.DEV) {
  const urlT = typeof rawUrl === 'string' ? rawUrl.trim() : ''
  const keyT = typeof rawAnon === 'string' ? rawAnon.trim() : ''
  if (mode === 'local') {
    const origin = runtimeOverride ? `override runtime (${runtimeOverride})` : 'VITE_DATA_MODE=local'
    console.info(`[Implantação Azoup] Modo LOCAL ativo (${origin}). Supabase desativado neste ambiente.`)
  } else if ((urlT || keyT) && !parsed) {
    console.warn(
      '[Implantação Azoup] Supabase desativado: confira VITE_SUPABASE_URL (https://…supabase.co, sem espaços) e VITE_SUPABASE_ANON_KEY no .env.local.',
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
        global: {
          fetch: supabaseFetchWithDeadline,
        },
      })
    : null

export function getDataMode(): DataMode {
  return mode
}

export function isSupabaseConfigured(): boolean {
  return mode === 'cloud' && supabase !== null
}

export function canOverrideDataModeRuntime(): boolean {
  return shouldAllowRuntimeOverride()
}

export function getDataModeOverrideRuntime(): DataMode | null {
  return runtimeOverride
}

export function setDataModeOverrideRuntime(next: DataMode | null): void {
  if (!shouldAllowRuntimeOverride() || typeof window === 'undefined') return
  try {
    if (next === null) window.localStorage.removeItem(OVERRIDE_KEY)
    else window.localStorage.setItem(OVERRIDE_KEY, next)
  } catch (e) {
    pushRuntimeDiagnostic({
      source: 'supabase-client',
      level: 'warn',
      message: 'Falha ao persistir override de modo.',
      details: e instanceof Error ? e.message : String(e),
    })
  }
}
