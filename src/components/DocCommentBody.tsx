import { useEffect, useMemo } from 'react'
import { Download, ExternalLink } from 'lucide-react'
import { splitTextWithUrls } from '../lib/docUrls'
import type { DbComment, DbDocAttachment, DbDocLink } from '../db/types'

const icSm = { size: 14, strokeWidth: 2, absoluteStrokeWidth: true } as const

const NO_LINKS: DbDocLink[] = []
const NO_ATTACH: DbDocAttachment[] = []

function LinkifiedBlock({ text }: { text: string }) {
  const parts = useMemo(() => splitTextWithUrls(text), [text])
  if (parts.length === 0) return null
  return (
    <p className="pd-doc-card__text pd-doc-card__text--linkified">
      {parts.map((p, i) =>
        p.kind === 'text' ? (
          <span key={i}>{p.text}</span>
        ) : (
          <a
            key={i}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className="pd-doc-card__inline-link"
          >
            {p.display}
            <ExternalLink {...icSm} className="pd-doc-card__inline-link-ic" aria-hidden />
          </a>
        ),
      )}
    </p>
  )
}

function AttachmentGrid({ items }: { items: DbDocAttachment[] }) {
  const paired = useMemo(
    () => items.map((a) => ({ a, url: URL.createObjectURL(a.blob) })),
    [items],
  )

  useEffect(() => {
    return () => {
      for (const p of paired) {
        URL.revokeObjectURL(p.url)
      }
    }
  }, [paired])

  if (items.length === 0) return null

  return (
    <div className="pd-doc-card__attachments">
      {paired.map(({ a, url }) => {
        const isImage = a.mimeType.startsWith('image/')
        if (isImage) {
          return (
            <a
              key={a.id}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="pd-doc-card__thumb-link"
              title={a.fileName}
            >
              <img src={url} alt={a.fileName || 'Imagem anexada'} className="pd-doc-card__thumb" />
            </a>
          )
        }
        return (
          <a
            key={a.id}
            href={url}
            download={a.fileName || 'download'}
            className="pd-doc-card__file-chip"
            title={a.fileName}
          >
            <Download {...icSm} aria-hidden />
            <span className="pd-doc-card__file-name">{a.fileName || 'Arquivo'}</span>
          </a>
        )
      })}
    </div>
  )
}

function LinkList({ links }: { links: DbDocLink[] }) {
  if (links.length === 0) return null
  return (
    <ul className="pd-doc-card__link-list">
      {links.map((l) => (
        <li key={l.id}>
          <a href={l.url} target="_blank" rel="noopener noreferrer" className="pd-doc-card__link-pill">
            {l.label?.trim() || l.url}
            <ExternalLink {...icSm} aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  )
}

export function DocCommentBody({ comment }: { comment: DbComment }) {
  const text = comment.content?.trim() ?? ''
  const links = comment.docLinks ?? NO_LINKS
  const attachments = comment.docAttachments ?? NO_ATTACH

  return (
    <div className="pd-doc-card__rich">
      {text ? <LinkifiedBlock text={comment.content} /> : null}
      <LinkList links={links} />
      <AttachmentGrid items={attachments} />
      {!text && links.length === 0 && attachments.length === 0 ? (
        <p className="muted pd-doc-card__empty">(vazio)</p>
      ) : null}
    </div>
  )
}
