import { Fragment, type ReactNode } from 'react'

/**
 * Renderiza trechos `**negrito**` e `` `código` `` das notas (conteúdo confiável do repositório).
 */
export function renderReleaseNoteInline(text: string): ReactNode {
  const re = /(\*\*[^*]+\*\*)|(`[^`]+`)/g
  const out: React.ReactNode[] = []
  let i = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > i) {
      out.push(<Fragment key={`t${k++}`}>{text.slice(i, m.index)}</Fragment>)
    }
    if (m[1]) {
      out.push(<strong key={`b${k++}`}>{m[1].slice(2, -2)}</strong>)
    } else if (m[2]) {
      out.push(
        <code key={`c${k++}`} className="release-notes-page__inline-code">
          {m[2].slice(1, -1)}
        </code>,
      )
    }
    i = m.index + m[0].length
  }
  if (i < text.length) {
    out.push(<Fragment key={`t${k++}`}>{text.slice(i)}</Fragment>)
  }
  return out.length > 0 ? <>{out}</> : text
}
