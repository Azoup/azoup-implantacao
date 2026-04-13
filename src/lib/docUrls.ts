/** Detecta URLs em texto simples (similar a Trello/Notion ao colar links). */
const URL_IN_TEXT_RE = /https?:\/\/[^\s<>"'()[\]]+|www\.[^\s<>"'()[\]]+/gi

export type TextUrlPart = { kind: 'text'; text: string } | { kind: 'url'; href: string; display: string }

export function splitTextWithUrls(text: string): TextUrlPart[] {
  if (!text) return []
  const parts: TextUrlPart[] = []
  let last = 0
  const re = new RegExp(URL_IN_TEXT_RE.source, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ kind: 'text', text: text.slice(last, m.index) })
    }
    const raw = m[0]
    const href = raw.toLowerCase().startsWith('www.') ? `https://${raw}` : raw
    parts.push({ kind: 'url', href, display: raw })
    last = m.index + raw.length
  }
  if (last < text.length) {
    parts.push({ kind: 'text', text: text.slice(last) })
  }
  return parts
}

export function normalizeDocLinkUrl(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  try {
    if (/^https?:\/\//i.test(t)) {
      return new URL(t).href
    }
    return new URL(`https://${t}`).href
  } catch {
    return null
  }
}
