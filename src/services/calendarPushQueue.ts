import { db } from '../db/database'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { applyRemoteRowFromSupabase, refreshEventsFromSupabase } from '../sync/supabaseDexieBridge'
import { broadcastDexieSyncHint } from '../sync/crossTabSync'

/**
 * Google Agenda ativo quando há Supabase (produção Vercel + cloud local).
 * `VITE_GOOGLE_CALENDAR_SYNC=false` desliga explicitamente.
 * `true` mantém compatibilidade com `.env.local` antigo.
 */
export function isGoogleCalendarSyncEnabled(): boolean {
  if (!isSupabaseConfigured()) return false
  const raw = import.meta.env.VITE_GOOGLE_CALENDAR_SYNC
  if (raw === 'false' || raw === '0') return false
  if (raw === 'true' || raw === '1') return true
  return true
}

export type GoogleCalendarListItem = { id: string; summary: string; primary?: boolean }

type EdgeAuth = { base: string; token: string; anon: string }

async function getEdgeAuth(): Promise<EdgeAuth | null> {
  if (!isGoogleCalendarSyncEnabled() || !isSupabaseConfigured() || !supabase) return null
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return null
  return {
    base: import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, ''),
    token,
    anon: import.meta.env.VITE_SUPABASE_ANON_KEY,
  }
}

/** App → Google: remove compromisso na sub-agenda e exclui a linha em `events` (service role). */
export async function deleteEventFromGoogleCalendar(eventId: string): Promise<void> {
  const auth = await getEdgeAuth()
  if (!auth) return
  const payload = JSON.stringify({ eventId, action: 'delete' as const })
  const headers = {
    Authorization: `Bearer ${auth.token}`,
    apikey: auth.anon,
    'Content-Type': 'application/json',
  }

  let res = await fetch(`${auth.base}/functions/v1/calendar-push-event`, {
    method: 'POST',
    headers,
    body: payload,
  })

  if (res.status === 404) {
    res = await fetch(`${auth.base}/functions/v1/calendar-delete-event`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ eventId }),
    })
  }

  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string }
  if (!res.ok) {
    throw new Error(body.message || body.error || `Falha ao excluir no Google (${res.status}).`)
  }
}

/** Evita push duplicado em paralelo para o mesmo evento (modal + events.ts, race no INSERT). */
const pushInFlight = new Map<string, Promise<void>>()

/** Após push local, adia pull automático para não importar o mesmo compromisso como linha nova. */
const PULL_COOLDOWN_MS = 30_000
let lastGooglePushCompletedAt = 0
let googlePushInFlightCount = 0

export function isGoogleCalendarPullDeferred(): boolean {
  return googlePushInFlightCount > 0 || Date.now() - lastGooglePushCompletedAt < PULL_COOLDOWN_MS
}

function noteGooglePushCompleted(): void {
  lastGooglePushCompletedAt = Date.now()
}

/** Grava `google_event_id` no Dexie antes do pull/refresh (evita corrida push↔pull). */
async function patchLocalEventFromPushResponse(remote: Record<string, unknown>): Promise<void> {
  const id = remote.id != null ? String(remote.id) : null
  if (!id) return
  const patch: Record<string, string | null> = {}
  if (remote.google_event_id != null) patch.googleEventId = String(remote.google_event_id)
  if (remote.google_calendar_id != null) patch.googleCalendarId = String(remote.google_calendar_id)
  if (remote.google_sync_status != null) patch.googleSyncStatus = String(remote.google_sync_status)
  if (remote.google_updated_at != null) patch.googleUpdatedAt = String(remote.google_updated_at)
  if (remote.meeting_link != null && String(remote.meeting_link).trim()) {
    patch.meetingLink = String(remote.meeting_link).trim()
  }
  if (Object.keys(patch).length > 0) {
    await db.events.update(id, patch)
  }
}

/** App → Google: sincroniza um evento e atualiza Dexie com a linha da nuvem. */
export async function syncEventToGoogleCalendar(
  eventId: string,
  opts?: { addMeet?: boolean },
): Promise<void> {
  const existing = pushInFlight.get(eventId)
  if (existing) return existing

  const work = (async () => {
    googlePushInFlightCount += 1
    try {
      const auth = await getEdgeAuth()
      if (!auth) return
      const res = await fetch(`${auth.base}/functions/v1/calendar-push-event`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          apikey: auth.anon,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId, addMeet: opts?.addMeet !== false }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        event?: Record<string, unknown>
        message?: string
        error?: string
      }
      if (!res.ok) {
        throw new Error(body.message || body.error || `Falha ao enviar para Google (${res.status}).`)
      }
      if (body.event) {
        await patchLocalEventFromPushResponse(body.event)
        await applyRemoteRowFromSupabase('events', body.event, 'UPDATE')
        broadcastDexieSyncHint()
        noteGooglePushCompleted()
      }
    } finally {
      googlePushInFlightCount = Math.max(0, googlePushInFlightCount - 1)
    }
  })()

  pushInFlight.set(eventId, work)
  try {
    await work
  } finally {
    if (pushInFlight.get(eventId) === work) pushInFlight.delete(eventId)
  }
}

type PullDeltaResponse = {
  ok?: boolean
  imported?: number
  updated?: number
  eventIds?: string[]
  timeMin?: string
  timeMax?: string
  message?: string
  error?: string
}

async function pullGoogleCalendarOnce(
  auth: EdgeAuth,
  body: { analystId?: string; timeMin?: string; timeMax?: string },
): Promise<PullDeltaResponse> {
  const res = await fetch(`${auth.base}/functions/v1/calendar-pull-delta`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      apikey: auth.anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const parsed = (await res.json().catch(() => ({}))) as PullDeltaResponse
  if (!res.ok) {
    throw new Error(parsed.message || parsed.error || `Falha ao buscar Google Agenda (${res.status}).`)
  }
  return parsed
}

async function resolvePullTargetAnalystIds(explicitId?: string): Promise<string[]> {
  if (explicitId) return [explicitId]
  const rows = await db.analysts
    .filter((a) => a.active && Boolean(a.googleCalendarId?.trim()))
    .toArray()
  return rows.map((a) => a.id)
}

/** Google → app: importa compromissos das sub-agendas mapeadas e recarrega o Dexie. */
export async function pullGoogleCalendarEvents(opts?: {
  analystId?: string
  timeMin?: string
  timeMax?: string
  /** Ignora cooldown (ex.: botão “Sincronizar” explícito). */
  force?: boolean
}): Promise<{ imported: number; updated: number; deferred?: boolean }> {
  if (!opts?.force && isGoogleCalendarPullDeferred()) {
    return { imported: 0, updated: 0, deferred: true }
  }

  const auth = await getEdgeAuth()
  if (!auth) return { imported: 0, updated: 0 }

  const targets = await resolvePullTargetAnalystIds(opts?.analystId)
  let imported = 0
  let updated = 0
  const eventIds = new Set<string>()
  let timeMin = opts?.timeMin
  let timeMax = opts?.timeMax

  if (targets.length === 0) {
    const bulk = await pullGoogleCalendarOnce(auth, { timeMin: opts?.timeMin, timeMax: opts?.timeMax })
    imported += bulk.imported ?? 0
    updated += bulk.updated ?? 0
    timeMin = bulk.timeMin ?? timeMin
    timeMax = bulk.timeMax ?? timeMax
    for (const id of bulk.eventIds ?? []) eventIds.add(id)
  } else {
    for (const analystId of targets) {
      const part = await pullGoogleCalendarOnce(auth, {
        analystId,
        timeMin: opts?.timeMin,
        timeMax: opts?.timeMax,
      })
      imported += part.imported ?? 0
      updated += part.updated ?? 0
      timeMin = part.timeMin ?? timeMin
      timeMax = part.timeMax ?? timeMax
      for (const id of part.eventIds ?? []) eventIds.add(id)
    }
  }

  if (eventIds.size > 0) {
    await refreshEventsFromSupabase({ ids: [...eventIds] })
  } else if (timeMin && timeMax) {
    await refreshEventsFromSupabase({ timeMin, timeMax })
  }

  return { imported, updated }
}

/** Dispara push Google após o evento já estar na nuvem (não propaga erro). */
export async function maybeEnqueueGoogleCalendarPush(eventId: string): Promise<void> {
  if (!isGoogleCalendarSyncEnabled()) return
  try {
    await syncEventToGoogleCalendar(eventId)
  } catch (err) {
    console.warn('[google-calendar] Falha ao sincronizar evento com Google.', { eventId, err })
  }
}

/** Conta Google corporativa já conectada? (Edge lê token no servidor.) */
export async function fetchGoogleOrgCalendarStatus(): Promise<{ connected: boolean; googleEmail: string | null }> {
  if (!isGoogleCalendarSyncEnabled() || !isSupabaseConfigured() || !supabase) {
    return { connected: false, googleEmail: null }
  }
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { connected: false, googleEmail: null }
  const base = import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '')
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  const res = await fetch(`${base}/functions/v1/calendar-org-status`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, apikey: anon },
  })
  const body = (await res.json().catch(() => ({}))) as { connected?: boolean; google_email?: string | null }
  if (!res.ok) return { connected: false, googleEmail: null }
  return {
    connected: Boolean(body.connected),
    googleEmail: body.google_email ?? null,
  }
}

/** Sub-agendas da conta corporativa (para mapear por analista). */
export async function fetchGoogleCalendarList(): Promise<GoogleCalendarListItem[]> {
  if (!isGoogleCalendarSyncEnabled() || !isSupabaseConfigured() || !supabase) return []
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Faça login para listar as agendas.')
  const base = import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '')
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  const res = await fetch(`${base}/functions/v1/calendar-list-calendars`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, apikey: anon },
  })
  const body = (await res.json().catch(() => ({}))) as {
    calendars?: GoogleCalendarListItem[]
    message?: string
    error?: string
  }
  if (!res.ok) {
    throw new Error(body.message || body.error || `Falha ao listar agendas (${res.status}).`)
  }
  return body.calendars ?? []
}

/**
 * Conecta a **única** conta Google da operação (ex.: CS Azoup).
 * Apenas admin; depois vincule em Analistas qual sub-agenda (`calendarList.id`) cada analista usa.
 */
export async function startGoogleCalendarOAuthConnect(): Promise<void> {
  if (!isGoogleCalendarSyncEnabled()) {
    throw new Error('Sincronização com Google Agenda não está ativa neste ambiente.')
  }
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase não configurado.')
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Faça login para conectar a Google Agenda.')
  const base = import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '')
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  const res = await fetch(`${base}/functions/v1/calendar-oauth-start?mode=org`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anon,
    },
  })
  const body = (await res.json().catch(() => ({}))) as { url?: string; message?: string; error?: string }
  if (!res.ok) {
    throw new Error(body.message || body.error || `Falha ao iniciar OAuth (${res.status}).`)
  }
  if (!body.url) throw new Error('Resposta inválida do servidor.')
  window.location.assign(body.url)
}
