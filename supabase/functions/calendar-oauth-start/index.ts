import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { encodeCalendarOAuthState } from '../_shared/calendarOAuthState.ts'

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

/**
 * OAuth da conta Google **corporativa única** (ex.: CS Azoup).
 * Só `role=admin`; contas portal (client) não iniciam.
 * Query obrigatória: `?mode=org`
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const urlObj = new URL(req.url)
    if (urlObj.searchParams.get('mode') !== 'org') {
      return json(400, {
        error: 'mode_required',
        message: 'Use ?mode=org para conectar a conta Google corporativa (Configurações → Google Agenda).',
      })
    }

    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')
    const redirectUri = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI')
    if (!clientId || !redirectUri) {
      return json(503, {
        error: 'missing_env',
        message: 'Configure GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_REDIRECT_URI.',
      })
    }
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json(401, { error: 'unauthorized' })
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.49.1')
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      return json(401, { error: 'invalid_session' })
    }
    const admin = createClient(supabaseUrl, serviceKey) as SupabaseClient
    const { data: prof, error: perr } = await admin
      .from('profiles')
      .select('role, user_type, status')
      .eq('id', data.user.id)
      .maybeSingle()
    if (perr) return json(500, { error: 'db', message: perr.message })
    if (String(prof?.status ?? '') !== 'active') {
      return json(403, { error: 'inactive', message: 'Perfil inativo.' })
    }
    if ((prof?.user_type ?? 'internal') === 'client') {
      return json(403, {
        error: 'forbidden_client',
        message: 'Contas de portal não conectam a conta Google da operação.',
      })
    }
    if (String(prof?.role ?? '') !== 'admin') {
      return json(403, {
        error: 'forbidden',
        message: 'Apenas administradores podem conectar a conta Google corporativa.',
      })
    }

    const stateSecret = Deno.env.get('CALENDAR_OAUTH_STATE_SECRET')
    const state = await encodeCalendarOAuthState(
      { v: 1, uid: data.user.id, exp: Date.now() + 600_000, mode: 'org' },
      stateSecret ?? undefined,
    )
    const scope = encodeURIComponent(
      [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.readonly',
      ].join(' '),
    )
    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      '&response_type=code' +
      `&scope=${scope}` +
      '&access_type=offline&prompt=consent' +
      `&state=${encodeURIComponent(state)}`
    return new Response(JSON.stringify({ url: googleAuthUrl }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return json(500, { error: String(e) })
  }
})
