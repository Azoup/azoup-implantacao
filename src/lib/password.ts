/** Pepper estável para modo Dexie local; não alterar ou todas as senhas locais deixam de bater. */
const PEPPER = 'vyntask-local-v1'

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Hash local (SHA-256). Trocar por bcrypt/Argon2 no Supabase em produção. */
export async function hashPassword(email: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`${PEPPER}|${email.trim().toLowerCase()}|${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toHex(digest)
}

export async function verifyPassword(
  email: string,
  password: string,
  hash: string,
): Promise<boolean> {
  return (await hashPassword(email, password)) === hash
}
