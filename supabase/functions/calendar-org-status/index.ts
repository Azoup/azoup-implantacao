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

/** Indica se a conta Google corporativa já tem refresh token salvo. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: cors })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json(401, { error: 'unauthorized' })
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.49.1')
    const userClient = createClient(supabaseUrl, supabaseAnon, { global: { headers: { Authorization: authHeader } } })
    const { data: u, error: uerr } = await userClient.auth.getUser()
    if (uerr || !u.user) return json(401, { error: 'invalid_session' })

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: prof, error: perr } = await admin
      .from('profiles')
      .select('status, user_type')
      .eq('id', u.user.id)
      .maybeSingle()
    if (perr) return json(500, { error: perr.message })
    if (String(prof?.status ?? '') !== 'active') return json(403, { error: 'inactive' })
    if ((prof?.user_type ?? 'internal') === 'client') {
      return json(403, { error: 'forbidden_client' })
    }

    const { data: row } = await admin.from('google_calendar_org_account').select('google_email').eq('id', 1).maybeSingle()
    return json(200, {
      connected: row != null,
      google_email: row?.google_email ?? null,
    })
  } catch (e) {
    return json(500, { error: String(e) })
  }
})
