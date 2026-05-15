import { calendarFunctionCors } from '../_shared/corsHeaders.ts'
import { deleteGoogleEvent, getOrgAccessToken } from '../_shared/googleCalendarClient.ts'

const cors = calendarFunctionCors

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

/** Exclui evento do app na nuvem e remove o compromisso correspondente no Google Calendar. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'unauthorized' })

    const body = (await req.json()) as { eventId?: string }
    if (!body.eventId) return json(400, { error: 'eventId_required' })

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
      .select('id, google_event_id, google_calendar_id, analyst_id')
      .eq('id', body.eventId)
      .maybeSingle()
    if (evErr) return json(500, { error: evErr.message })
    if (!ev) return json(404, { error: 'event_not_found' })

    let calendarId = ev.google_calendar_id != null ? String(ev.google_calendar_id) : null
    const googleEventId = ev.google_event_id != null ? String(ev.google_event_id) : null
    const analystId = ev.analyst_id != null ? String(ev.analyst_id) : null
    if (analystId) {
      const { data: analyst } = await admin.from('analysts').select('google_calendar_id').eq('id', analystId).maybeSingle()
      if (analyst?.google_calendar_id) calendarId = String(analyst.google_calendar_id)
    }

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

    return json(200, { ok: true, eventId: body.eventId })
  } catch (e) {
    const msg = String(e)
    if (msg === 'not_connected') {
      return json(400, { error: 'not_connected', message: 'Conecte a conta Google em Configurações.' })
    }
    return json(500, { error: msg })
  }
})
