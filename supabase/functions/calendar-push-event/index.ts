import { calendarFunctionCors } from '../_shared/corsHeaders.ts'
import { formatGoogleCalendarTitle } from '../_shared/calendarEventTitle.ts'
import {
  deleteGoogleEvent,
  getOrgAccessToken,
  upsertGoogleEvent,
} from '../_shared/googleCalendarClient.ts'

const cors = calendarFunctionCors

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

/** Sincroniza imediatamente um evento do app ↔ Google Calendar (push ou delete). */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'unauthorized' })

    const body = (await req.json()) as { eventId?: string; addMeet?: boolean; action?: 'push' | 'delete' }
    if (!body.eventId) return json(400, { error: 'eventId_required' })
    const action = body.action === 'delete' ? 'delete' : 'push'

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.49.1')
    const userClient = createClient(supabaseUrl, supabaseAnon, { global: { headers: { Authorization: authHeader } } })
    const { data: u, error: uerr } = await userClient.auth.getUser()
    if (uerr || !u.user) return json(401, { error: 'invalid_session' })

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: ev, error: evErr } = await admin
      .from('events')
      .select(
        'id, title, description, start_time, end_time, status, analyst_id, project_id, task_id, meeting_link, google_event_id, google_calendar_id',
      )
      .eq('id', body.eventId)
      .maybeSingle()
    if (evErr) return json(500, { error: evErr.message })
    if (!ev) return json(404, { error: 'event_not_found' })

    let calendarId = ev.google_calendar_id != null ? String(ev.google_calendar_id) : null
    const analystId = ev.analyst_id != null ? String(ev.analyst_id) : null
    if (analystId) {
      const { data: analyst } = await admin.from('analysts').select('google_calendar_id').eq('id', analystId).maybeSingle()
      if (analyst?.google_calendar_id) calendarId = String(analyst.google_calendar_id)
    }

    if (action === 'delete') {
      const googleEventId = ev.google_event_id != null ? String(ev.google_event_id) : null
      if (googleEventId && calendarId) {
        const access = await getOrgAccessToken(admin)
        await deleteGoogleEvent(access, calendarId, googleEventId)
      }
      const { error: delErr } = await admin.from('events').delete().eq('id', body.eventId)
      if (delErr) return json(500, { error: delErr.message })
      await admin.from('calendar_sync_outbox').insert({
        event_id: body.eventId,
        user_id: u.user.id,
        analyst_id: analystId,
        operation: 'delete',
        payload: { googleEventId, deletedAt: new Date().toISOString() },
        processed_at: new Date().toISOString(),
      })
      return json(200, { ok: true, eventId: body.eventId, deleted: true })
    }

    if (!calendarId) {
      return json(400, {
        error: 'no_calendar_mapped',
        message: 'Defina a sub-agenda Google do analista em Analistas antes de sincronizar.',
      })
    }

    const access = await getOrgAccessToken(admin)
    const addMeet = body.addMeet !== false

    let projectRow: {
      project_name?: string | null
      trade_name?: string | null
      razao_social?: string | null
    } | null = null
    let taskRow: { code?: string | null; title?: string | null; project_id?: string | null } | null = null
    if (ev.task_id) {
      const { data: t } = await admin
        .from('tasks')
        .select('code, title, project_id')
        .eq('id', String(ev.task_id))
        .maybeSingle()
      taskRow = t
    }
    const projectIdForTitle = ev.project_id != null ? String(ev.project_id) : taskRow?.project_id != null ? String(taskRow.project_id) : null
    if (projectIdForTitle) {
      const { data: p } = await admin
        .from('projects')
        .select('project_name, trade_name, razao_social')
        .eq('id', projectIdForTitle)
        .maybeSingle()
      projectRow = p
    }
    const googleTitle = formatGoogleCalendarTitle(
      ev.title != null ? String(ev.title) : null,
      projectIdForTitle,
      projectRow,
      taskRow,
    )

    const { data: fresh } = await admin
      .from('events')
      .select('google_event_id')
      .eq('id', body.eventId)
      .maybeSingle()
    let googleEventIdForUpsert =
      fresh?.google_event_id != null
        ? String(fresh.google_event_id)
        : ev.google_event_id != null
          ? String(ev.google_event_id)
          : null

    /** Evita segundo POST no Google se o pull vinculou outra linha ao mesmo compromisso. */
    if (!googleEventIdForUpsert && analystId) {
      const startMs = new Date(String(ev.start_time)).getTime()
      const winMs = 15 * 60 * 1000
      const { data: siblingRows } = await admin
        .from('events')
        .select('google_event_id, start_time')
        .eq('analyst_id', analystId)
        .eq('title', String(ev.title ?? 'Compromisso'))
        .not('google_event_id', 'is', null)
        .neq('id', body.eventId)
        .gte('start_time', new Date(startMs - winMs).toISOString())
        .lte('start_time', new Date(startMs + winMs).toISOString())
        .limit(5)
      const sibling = (siblingRows ?? [])
        .filter((r) => r.google_event_id != null)
        .sort((a, b) => {
          const da = Math.abs(new Date(String(a.start_time)).getTime() - startMs)
          const db = Math.abs(new Date(String(b.start_time)).getTime() - startMs)
          return da - db
        })[0]
      if (sibling?.google_event_id) {
        googleEventIdForUpsert = String(sibling.google_event_id)
      }
    }

    const pushed = await upsertGoogleEvent(
      access,
      calendarId,
      googleEventIdForUpsert,
      {
        title: googleTitle,
        description: String(ev.description ?? ''),
        startTime: String(ev.start_time),
        endTime: String(ev.end_time),
        status: String(ev.status ?? 'agendado'),
        meetingLink: ev.meeting_link != null ? String(ev.meeting_link) : null,
        addMeetIfMissing: addMeet,
      },
    )

    const meetingLink = pushed.meetingLink ?? (ev.meeting_link != null ? String(ev.meeting_link) : null)
    const patch = {
      google_event_id: pushed.googleEventId,
      google_calendar_id: calendarId,
      google_sync_status: 'synced',
      google_updated_at: pushed.googleUpdatedAt,
      ...(meetingLink && !ev.meeting_link ? { meeting_link: meetingLink } : {}),
    }
    const { data: updated, error: upErr } = await admin.from('events').update(patch).eq('id', body.eventId).select('*').single()
    if (upErr) return json(500, { error: upErr.message })

    await admin.from('calendar_sync_outbox').insert({
      event_id: body.eventId,
      user_id: u.user.id,
      analyst_id: analystId,
      operation: 'push',
      payload: { googleEventId: pushed.googleEventId, syncedAt: new Date().toISOString() },
      processed_at: new Date().toISOString(),
    })

    return json(200, { ok: true, event: updated })
  } catch (e) {
    const msg = String(e)
    if (msg === 'not_connected') {
      return json(400, { error: 'not_connected', message: 'Conecte a conta Google em Configurações.' })
    }
    return json(500, { error: msg })
  }
})
