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

async function decryptRefresh(stored: string, cipher: string | undefined): Promise<string> {
  if (!cipher?.trim()) {
    return atob(stored)
  }
  const raw = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0))
  if (raw.length < 13) throw new Error('bad_cipher_blob')
  const iv = raw.slice(0, 12)
  const ct = raw.slice(12)
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(cipher.padEnd(32, '0').slice(0, 32)), { name: 'AES-GCM' }, false, [
    'decrypt',
  ])
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(plain)
}

async function getAccessTokenFromRefresh(refreshPlain: string): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!
  const res = await fetch('https://oauth2.googleapis.com/token', {
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
  return String(j.access_token ?? '')
}

/** Lista sub-agendas da conta Google corporativa (calendarList). Só usuários internos ativos. */
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
      return json(403, { error: 'forbidden_client', message: 'Indisponível para contas de portal.' })
    }

    const { data: row, error: rowErr } = await admin.from('google_calendar_org_account').select('refresh_token_enc').eq('id', 1).maybeSingle()
    if (rowErr) return json(500, { error: rowErr.message })
    if (!row?.refresh_token_enc) {
      return json(400, { error: 'not_connected', message: 'Conta Google corporativa ainda não conectada (Configurações).' })
    }

    const cipher = Deno.env.get('GOOGLE_TOKEN_CIPHER_KEY')
    const refreshPlain = await decryptRefresh(String(row.refresh_token_enc), cipher ?? undefined)
    const access = await getAccessTokenFromRefresh(refreshPlain)

    const listRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250', {
      headers: { Authorization: `Bearer ${access}` },
    })
    const listJson = (await listRes.json()) as { items?: Array<{ id?: string; summary?: string; primary?: boolean }> }
    if (!listRes.ok) {
      return json(502, { error: 'google_calendar_list', detail: listJson })
    }
    const calendars = (listJson.items ?? [])
      .filter((x) => x.id)
      .map((x) => ({ id: String(x.id), summary: String(x.summary ?? x.id), primary: Boolean(x.primary) }))
    return json(200, { calendars })
  } catch (e) {
    return json(500, { error: String(e) })
  }
})
