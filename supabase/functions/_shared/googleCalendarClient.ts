import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3'
export const GOOGLE_CALENDAR_TIMEZONE = 'America/Sao_Paulo'

export type GoogleApiEvent = {
  id?: string
  status?: string
  summary?: string
  description?: string
  start?: { dateTime?: string; date?: string; timeZone?: string }
  end?: { dateTime?: string; date?: string; timeZone?: string }
  hangoutLink?: string
  conferenceData?: {
    entryPoints?: Array<{ entryPointType?: string; uri?: string }>
  }
  updated?: string
}

export async function decryptRefresh(stored: string, cipher: string | undefined): Promise<string> {
  if (!cipher?.trim()) return atob(stored)
  const raw = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0))
  if (raw.length < 13) throw new Error('bad_cipher_blob')
  const iv = raw.slice(0, 12)
  const ct = raw.slice(12)
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(cipher.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  )
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(plain)
}

export async function getOrgAccessToken(admin: SupabaseClient): Promise<string> {
  const { data: row, error } = await admin
    .from('google_calendar_org_account')
    .select('refresh_token_enc')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!row?.refresh_token_enc) {
    throw new Error('not_connected')
  }
  const cipher = Deno.env.get('GOOGLE_TOKEN_CIPHER_KEY')
  const refreshPlain = await decryptRefresh(String(row.refresh_token_enc), cipher ?? undefined)
  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshPlain,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })
  const j = (await res.json()) as Record<string, unknown>
  if (!res.ok) throw new Error(`token_refresh: ${JSON.stringify(j)}`)
  const access = String(j.access_token ?? '')
  if (!access) throw new Error('token_refresh: missing access_token')
  return access
}

export function extractMeetLink(ev: GoogleApiEvent): string | null {
  if (ev.hangoutLink?.trim()) return ev.hangoutLink.trim()
  const video = ev.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')
  return video?.uri?.trim() ? video.uri.trim() : null
}

/** Meia-noite em America/Sao_Paulo (UTC−3, sem horário de verão). */
function midnightSaoPauloIso(ymd: string): string {
  return `${ymd}T03:00:00.000Z`
}

export function googleEventStartIso(ev: GoogleApiEvent): string | null {
  if (ev.start?.dateTime) {
    const d = new Date(ev.start.dateTime)
    return Number.isFinite(d.getTime()) ? d.toISOString() : null
  }
  if (ev.start?.date) return midnightSaoPauloIso(ev.start.date)
  return null
}

/** Para dia inteiro, `end.date` do Google é exclusivo (início do dia seguinte ao último dia). */
export function googleEventEndIso(ev: GoogleApiEvent): string | null {
  if (ev.end?.dateTime) {
    const d = new Date(ev.end.dateTime)
    return Number.isFinite(d.getTime()) ? d.toISOString() : null
  }
  if (ev.end?.date) return midnightSaoPauloIso(ev.end.date)
  return null
}

export async function listGoogleEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<GoogleApiEvent[]> {
  const out: GoogleApiEvent[] = []
  let pageToken: string | undefined
  do {
    const url = new URL(`${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events`)
    url.searchParams.set('timeMin', timeMin)
    url.searchParams.set('timeMax', timeMax)
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('orderBy', 'startTime')
    url.searchParams.set('maxResults', '250')
    url.searchParams.set('showDeleted', 'false')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } })
    const json = (await res.json()) as { items?: GoogleApiEvent[]; nextPageToken?: string; error?: unknown }
    if (!res.ok) throw new Error(`google_events_list: ${JSON.stringify(json)}`)
    out.push(...(json.items ?? []).filter((x) => x.id && x.status !== 'cancelled'))
    pageToken = json.nextPageToken
  } while (pageToken)
  return out
}

export type PushEventPayload = {
  title: string
  description: string
  startTime: string
  endTime: string
  status: string
  meetingLink: string | null
  addMeetIfMissing: boolean
}

export async function upsertGoogleEvent(
  accessToken: string,
  calendarId: string,
  googleEventId: string | null,
  payload: PushEventPayload,
): Promise<{ googleEventId: string; meetingLink: string | null; googleUpdatedAt: string }> {
  const body: Record<string, unknown> = {
    summary: payload.title,
    description: payload.description || '',
    start: { dateTime: payload.startTime, timeZone: GOOGLE_CALENDAR_TIMEZONE },
    end: { dateTime: payload.endTime, timeZone: GOOGLE_CALENDAR_TIMEZONE },
  }
  if (payload.status === 'cancelado') {
    body.status = 'cancelled'
  }

  const meetUrl = payload.meetingLink?.trim() || null
  if (meetUrl) {
    body.description = `${payload.description || ''}\n\nLink: ${meetUrl}`.trim()
  } else if (payload.addMeetIfMissing && payload.status !== 'cancelado') {
    body.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    }
  }

  if (googleEventId) {
    const url = new URL(
      `${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    )
    if (payload.addMeetIfMissing && !meetUrl && payload.status !== 'cancelado') {
      url.searchParams.set('conferenceDataVersion', '1')
    }
    const res = await fetch(url.toString(), {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const json = (await res.json()) as GoogleApiEvent & { error?: unknown }
    if (!res.ok) throw new Error(`google_event_patch: ${JSON.stringify(json)}`)
    return {
      googleEventId: String(json.id ?? googleEventId),
      meetingLink: meetUrl ?? extractMeetLink(json),
      googleUpdatedAt: json.updated ?? new Date().toISOString(),
    }
  }

  const insertUrl = new URL(`${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events`)
  if (payload.addMeetIfMissing && !meetUrl && payload.status !== 'cancelado') {
    insertUrl.searchParams.set('conferenceDataVersion', '1')
  }
  const res = await fetch(insertUrl.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as GoogleApiEvent & { error?: unknown }
  if (!res.ok) throw new Error(`google_event_insert: ${JSON.stringify(json)}`)
  if (!json.id) throw new Error('google_event_insert: missing id')
  return {
    googleEventId: String(json.id),
    meetingLink: meetUrl ?? extractMeetLink(json),
    googleUpdatedAt: json.updated ?? new Date().toISOString(),
  }
}

/** Remove o compromisso na sub-agenda Google (idempotente se já excluído). */
export async function deleteGoogleEvent(
  accessToken: string,
  calendarId: string,
  googleEventId: string,
): Promise<void> {
  const url = `${GOOGLE_CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (res.status === 404 || res.status === 410) return
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`google_event_delete: ${res.status} ${text}`)
  }
}
