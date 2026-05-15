import { decodeCalendarOAuthState } from '../_shared/calendarOAuthState.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Troca o code por tokens e grava refresh na conta corporativa única (`google_calendar_org_account`). */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const stateParam = url.searchParams.get('state')
    if (!code || !stateParam) {
      return new Response('Parâmetros code/state ausentes.', { status: 400, headers: cors })
    }
    const stateSecret = Deno.env.get('CALENDAR_OAUTH_STATE_SECRET')
    const decoded = await decodeCalendarOAuthState(stateParam, stateSecret ?? undefined)
    if (!decoded.ok) {
      return new Response(`State inválido (${decoded.reason}).`, { status: 400, headers: cors })
    }
    if (decoded.payload.mode !== 'org') {
      return new Response(
        'Fluxo OAuth antigo (por analista) não é mais suportado. Conecte de novo em Configurações → Google Agenda.',
        { status: 400, headers: cors },
      )
    }
    const { uid } = decoded.payload

    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')
    const redirectUri = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    if (!clientId || !clientSecret || !redirectUri || !serviceKey || !supabaseUrl) {
      return new Response('Secrets incompletos no servidor.', { status: 503, headers: cors })
    }
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const tokenJson = (await tokenRes.json()) as Record<string, unknown>
    if (!tokenRes.ok) {
      return new Response(`Falha token Google: ${JSON.stringify(tokenJson)}`, { status: 400, headers: cors })
    }
    const refresh = String(tokenJson.refresh_token ?? '')
    if (!refresh) {
      return new Response('Google não devolveu refresh_token; revogue o acesso e reconecte com prompt=consent.', {
        status: 400,
        headers: cors,
      })
    }
    const cipher = Deno.env.get('GOOGLE_TOKEN_CIPHER_KEY')
    const refresh_token_enc = cipher ? await encryptAesGcm(refresh, cipher) : btoa(refresh)
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.49.1')
    const admin = createClient(supabaseUrl, serviceKey)
    const googleEmail =
      typeof tokenJson.email === 'string' && tokenJson.email.trim()
        ? tokenJson.email.trim()
        : typeof tokenJson.id_token === 'string'
          ? decodeJwtEmail(tokenJson.id_token as string)
          : null
    const { error } = await admin.from('google_calendar_org_account').upsert({
      id: 1,
      refresh_token_enc,
      google_email: googleEmail,
      linked_by_user_id: uid,
      updated_at: new Date().toISOString(),
    })
    if (error) {
      return new Response(`Supabase: ${error.message}`, { status: 500, headers: cors })
    }
    return new Response(
      '<!DOCTYPE html><html><body><p>Conta Google corporativa conectada. Feche esta aba e, em Analistas, escolha qual sub-agenda de cada analista recebe os eventos.</p></body></html>',
      { headers: { ...cors, 'Content-Type': 'text/html; charset=utf-8' } },
    )
  } catch (e) {
    return new Response(String(e), { status: 500, headers: cors })
  }
})

function decodeJwtEmail(idToken: string): string | null {
  try {
    const parts = idToken.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/'))) as { email?: string }
    return typeof payload.email === 'string' ? payload.email : null
  } catch {
    return null
  }
}

async function encryptAesGcm(plain: string, keyMaterial: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(keyMaterial.padEnd(32, '0').slice(0, 32)), { name: 'AES-GCM' }, false, [
    'encrypt',
  ])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain)),
  )
  const out = new Uint8Array(iv.length + ct.length)
  out.set(iv, 0)
  out.set(ct, iv.length)
  return bytesToBase64(out)
}

function bytesToBase64(u: Uint8Array): string {
  let s = ''
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]!)
  return btoa(s)
}
