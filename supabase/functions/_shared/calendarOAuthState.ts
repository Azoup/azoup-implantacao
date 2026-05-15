/**
 * Estado OAuth Google Calendar.
 * - `mode: 'org'` — conta corporativa única (google_calendar_org_account); não usa `aid`.
 * - Legado sem `mode` mas com `aid` — desativado; requer novo fluxo a partir de Configurações.
 * Opcional: CALENDAR_OAUTH_STATE_SECRET nas Edge Functions (integridade do state).
 */
export type CalendarOAuthStateV1 = {
  v: 1
  uid: string
  exp: number
  /** Conta única CS Azoup / operação. */
  mode?: 'org'
  /** Fluxo legado por analista (removido do produto). */
  aid?: string
}

const te = new TextEncoder()

function bytesToBase64url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!)
  const b64 = btoa(bin)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function hmacSha256Base64url(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', te.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, te.encode(message)))
  return bytesToBase64url(sig)
}

/** Serializa estado para query ?state= (assinado se secret definido). */
export async function encodeCalendarOAuthState(payload: CalendarOAuthStateV1, secret: string | undefined): Promise<string> {
  const json = JSON.stringify(payload)
  if (!secret?.trim()) {
    return btoa(json)
  }
  const b64payload = bytesToBase64url(te.encode(json))
  const sig = await hmacSha256Base64url(secret, b64payload)
  return `${b64payload}.${sig}`
}

export type DecodeCalendarOAuthStateResult =
  | { ok: true; payload: CalendarOAuthStateV1 }
  | { ok: false; reason: string }

function validatePayload(parsed: CalendarOAuthStateV1): DecodeCalendarOAuthStateResult {
  if (parsed.v !== 1 || !parsed.uid) return { ok: false, reason: 'invalid_shape' }
  if (typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return { ok: false, reason: 'expired' }
  if (parsed.mode === 'org') return { ok: true, payload: parsed }
  if (parsed.aid) return { ok: false, reason: 'legacy_analyst_flow_disabled' }
  return { ok: false, reason: 'invalid_shape' }
}

/** Valida exp e, com secret, assinatura HMAC. */
export async function decodeCalendarOAuthState(stateParam: string, secret: string | undefined): Promise<DecodeCalendarOAuthStateResult> {
  const trimmed = stateParam.trim()
  if (!trimmed) return { ok: false, reason: 'empty' }

  if (secret?.trim()) {
    const dot = trimmed.lastIndexOf('.')
    if (dot <= 0) return { ok: false, reason: 'unsigned_or_malformed' }
    const b64payload = trimmed.slice(0, dot)
    const sigGot = trimmed.slice(dot + 1)
    const expected = await hmacSha256Base64url(secret, b64payload)
    if (expected !== sigGot) return { ok: false, reason: 'bad_signature' }
    let json: string
    try {
      json = new TextDecoder().decode(base64urlToBytes(b64payload))
    } catch {
      return { ok: false, reason: 'bad_payload_encoding' }
    }
    try {
      const parsed = JSON.parse(json) as CalendarOAuthStateV1
      return validatePayload(parsed)
    } catch {
      return { ok: false, reason: 'invalid_json' }
    }
  }

  try {
    const parsed = JSON.parse(atob(trimmed)) as CalendarOAuthStateV1
    return validatePayload(parsed)
  } catch {
    return { ok: false, reason: 'invalid_legacy_state' }
  }
}
