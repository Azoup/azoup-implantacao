import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Check, Copy, Share2, X } from 'lucide-react'
import type { DbEvent, DbPhase, DbProject, DbTask } from '../../db/types'
import { buildWhatsAppScheduleText } from '../../lib/scheduleExport'

type Props = {
  open: boolean
  onClose: () => void
  project: DbProject
  phase: DbPhase
  events: readonly DbEvent[]
  tasks: readonly DbTask[]
}

export function PhaseScheduleExportModal({ open, onClose, project, phase, events, tasks }: Props) {
  const [copied, setCopied] = useState(false)

  const text = useMemo(
    () => buildWhatsAppScheduleText(project, events, tasks),
    [project, events, tasks],
  )

  useEffect(() => {
    if (!open) return
    setCopied(false)
  }, [open, text])

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* fallback: usuário pode selecionar no textarea */
    }
  }, [text])

  if (!open) return null

  return (
    <ModalBackdrop onClose={onClose}>
      <div
        className="modal modal--md phase-schedule-export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="phase-schedule-export-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="phase-schedule-export-modal__header">
          <h2 id="phase-schedule-export-title" className="modal__title">
            <Share2 size={18} aria-hidden className="phase-schedule-export-modal__title-ic" />
            Exportar cronograma
          </h2>
          <p className="muted phase-schedule-export-modal__subtitle">
            {project.projectName} · {phase.name}
          </p>
        </div>

        <p className="muted phase-schedule-export-modal__hint">
          Texto formatado para colar no WhatsApp. Treinamentos e viradas incluem o link do Google Meet quando
          já sincronizado com a agenda. Instalação e configuração não geram Meet.
        </p>

        <textarea
          className="phase-schedule-export-modal__textarea"
          readOnly
          value={text}
          rows={Math.min(18, Math.max(6, text.split('\n').length + 1))}
          aria-label="Cronograma para WhatsApp"
          onFocus={(e) => e.currentTarget.select()}
        />

        <div className="modal__actions phase-schedule-export-modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Fechar
          </button>
          <button type="button" className="btn btn--primary" onClick={() => void onCopy()}>
            {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>

        <button
          type="button"
          className="modal__close btn btn--ghost btn--icon"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X size={18} aria-hidden />
        </button>
      </div>
    </ModalBackdrop>
  )
}

function ModalBackdrop({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      {children}
    </div>
  )
}
