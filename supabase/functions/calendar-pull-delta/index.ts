import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  extractMeetLink,
  getOrgAccessToken,
  googleEventEndIso,
  googleEventStartIso,
  listGoogleEvents,
} from '../_shared/googleCalendarClient.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

async function resolveAnalystIds(
  admin: SupabaseClient,
  userId: string,
  role: string,
  userType: string | null | undefined,
  analystIdBody: string | null,
): Promise<{ analystIds: string[] } | Response> {
  if ((userType ?? 'internal') === 'client') {
    return json(403, { error: 'forbidden_client', message: 'Indisponível para contas de portal.' })
  }
  if (analystIdBody) {
    const { data: row, error } = await admin.from('analysts').select('id, profile_id').eq('id', analystIdBody).maybeSingle()
    if (error) return json(500, { error: error.message })
    if (!row) return json(404, { error: 'analyst_not_found' })
    if (role === 'admin' || row.profile_id === userId) return { analystIds: [row.id as string] }
    return json(403, { error: 'forbidden' })
  }
  if (role === 'admin') {
    const { data: rows, error } = await admin
      .from('analysts')
      .select('id')
      .not('google_calendar_id', 'is', null)
      .eq('active', true)
    if (error) return json(500, { error: error.message })
    return { analystIds: (rows ?? []).map((r) => String(r.id)) }
  }
  const { data: rows, error: e2 } = await admin.from('analysts').select('id').eq('profile_id', userId)
  if (e2) return json(500, { error: e2.message })
  if (!rows?.length) return json(400, { error: 'no_analyst_profile_link' })
  if (rows.length > 1) return json(400, { error: 'ambiguous_analyst' })
  return { analystIds: [rows[0]!.id as string] }
}

function defaultWindow(): { timeMin: string; timeMax: string } {
  const now = new Date()
  const min = new Date(now)
  min.setDate(min.getDate() - 30)
  const max = new Date(now)
  max.setDate(max.getDate() + 120)
  return { timeMin: min.toISOString(), timeMax: max.toISOString() }
}

/** Importa eventos Google → tabela `events` (por sub-agenda do analista). */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'unauthorized' })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.49.1')
    const userClient = createClient(supabaseUrl, supabaseAnon, { global: { headers: { Authorization: authHeader } } })
    const { data: u, error: uerr } = await userClient.auth.getUser()
    if (uerr || !u.user) return json(401, { error: 'invalid_session' })

    let analystIdBody: string | null = null
    let timeMin: string | undefined
    let timeMax: string | undefined
    try {
      const j = (await req.json()) as { analystId?: string; timeMin?: string; timeMax?: string }
      analystIdBody = j.analystId ?? null
      timeMin = j.timeMin
      timeMax = j.timeMax
    } catch {
      analystIdBody = null
    }
    const win = defaultWindow()
    const rangeMin = timeMin ?? win.timeMin
    const rangeMax = timeMax ?? win.timeMax

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: prof, error: perr } = await admin.from('profiles').select('role, user_type').eq('id', u.user.id).maybeSingle()
    if (perr) return json(500, { error: perr.message })
    const role = String(prof?.role ?? 'user')
    const resolved = await resolveAnalystIds(admin, u.user.id, role, prof?.user_type as string | null | undefined, analystIdBody)
    if (resolved instanceof Response) return resolved
    const { analystIds } = resolved

    if (analystIds.length === 0) {
      return json(200, { ok: true, imported: 0, updated: 0, message: 'Nenhum analista com sub-agenda Google configurada.' })
    }

    const access = await getOrgAccessToken(admin)
    let imported = 0
    let updated = 0
    const eventIds: string[] = []

    for (const analystId of analystIds) {
      const { data: analyst, error: aErr } = await admin
        .from('analysts')
        .select('google_calendar_id')
        .eq('id', analystId)
        .maybeSingle()
      if (aErr) return json(500, { error: aErr.message })
      const calendarId = analyst?.google_calendar_id != null ? String(analyst.google_calendar_id) : null
      if (!calendarId) continue

      const googleItems = await listGoogleEvents(access, calendarId, rangeMin, rangeMax)
      for (const g of googleItems) {
        const googleEventId = String(g.id)
        const startIso = googleEventStartIso(g)
        const endIso = googleEventEndIso(g)
        if (!startIso || !endIso) continue

        const meetLink = extractMeetLink(g)
        const title = String(g.summary ?? 'Compromisso Google').trim() || 'Compromisso Google'
        const description = String(g.description ?? '').trim()
        const driveMatch = description.match(/https:\/\/drive\.google\.com\/[^\s)>\]"']+/i)
        const recordingFromDesc = driveMatch ? driveMatch[0].replace(/[.,;]+$/, '') : null
        const googleUpdatedAt = g.updated ?? new Date().toISOString()

        const { data: existing } = await admin
          .from('events')
          .select('id, google_updated_at, title, description, meeting_link, recording_link, status')
          .eq('google_event_id', googleEventId)
          .maybeSingle()

        if (existing?.id) {
          const remoteMs = existing.google_updated_at ? new Date(String(existing.google_updated_at)).getTime() : 0
          const googleMs = new Date(googleUpdatedAt).getTime()
          if (googleMs > remoteMs) {
            await admin
              .from('events')
              .update({
                title,
                description,
                start_time: startIso,
                end_time: endIso,
                meeting_link: meetLink ?? existing.meeting_link,
                recording_link: recordingFromDesc ?? existing.recording_link,
                google_calendar_id: calendarId,
                google_sync_status: 'synced',
                google_updated_at: googleUpdatedAt,
              })
              .eq('id', existing.id)
            updated += 1
          }
          eventIds.push(String(existing.id))
          continue
        }

        const startMs = new Date(startIso).getTime()
        const windowMs = 15 * 60 * 1000
        const { data: fingerprintMatches } = await admin
          .from('events')
          .select('id, google_event_id, google_updated_at, title, description, meeting_link, recording_link, start_time')
          .eq('analyst_id', analystId)
          .eq('title', title)
          .gte('start_time', new Date(startMs - windowMs).toISOString())
          .lte('start_time', new Date(startMs + windowMs).toISOString())
          .limit(10)

        const eligible =
          fingerprintMatches?.filter(
            (row) => row.google_event_id == null || String(row.google_event_id) === googleEventId,
          ) ?? []

        const fingerprintRow =
          eligible.length === 0
            ? null
            : eligible.reduce((best, row) => {
                const rowMs = new Date(String(row.start_time)).getTime()
                const bestMs = new Date(String(best.start_time)).getTime()
                return Math.abs(rowMs - startMs) < Math.abs(bestMs - startMs) ? row : best
              })

        if (fingerprintRow?.id) {
          await admin
            .from('events')
            .update({
              google_event_id: googleEventId,
              google_calendar_id: calendarId,
              google_sync_status: 'synced',
              google_updated_at: googleUpdatedAt,
              start_time: startIso,
              end_time: endIso,
              meeting_link: meetLink ?? fingerprintRow.meeting_link,
              recording_link: recordingFromDesc ?? fingerprintRow.recording_link,
            })
            .eq('id', fingerprintRow.id)
          updated += 1
          eventIds.push(String(fingerprintRow.id))
          continue
        }

        const { data: idTaken } = await admin
          .from('events')
          .select('id')
          .eq('google_event_id', googleEventId)
          .maybeSingle()
        if (idTaken?.id) {
          eventIds.push(String(idTaken.id))
          continue
        }

        const newId = crypto.randomUUID()
        const { error: insErr } = await admin.from('events').insert({
          id: newId,
          title,
          description,
          start_time: startIso,
          end_time: endIso,
          status: 'agendado',
          project_id: null,
          task_id: null,
          analyst_id: analystId,
          meeting_link: meetLink,
          recording_link: recordingFromDesc,
          google_event_id: googleEventId,
          google_calendar_id: calendarId,
          google_sync_status: 'synced',
          google_updated_at: googleUpdatedAt,
          created_at: new Date().toISOString(),
        })
        if (insErr) {
          if (insErr.code === '23505') continue
          return json(500, { error: insErr.message })
        }
        imported += 1
        eventIds.push(newId)
      }
    }

    await admin.from('calendar_sync_outbox').insert({
      event_id: null,
      user_id: u.user.id,
      analyst_id: analystIds[0] ?? null,
      operation: 'pull_hint',
      payload: { imported, updated, timeMin: rangeMin, timeMax: rangeMax, eventIds },
      processed_at: new Date().toISOString(),
    })

    return json(200, { ok: true, imported, updated, eventIds, timeMin: rangeMin, timeMax: rangeMax })
  } catch (e) {
    const msg = String(e)
    if (msg === 'not_connected') {
      return json(400, { error: 'not_connected', message: 'Conecte a conta Google em Configurações.' })
    }
    return json(500, { error: msg })
  }
})
