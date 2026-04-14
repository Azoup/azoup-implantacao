import { FormEvent, useEffect, useId, useState } from 'react'
import type { DbAnalyst } from '../db/types'
import { AnalystAvatar } from './AnalystAvatar'

type Props = {
  open: boolean
  title: string
  description: string
  candidates: DbAnalyst[]
  confirmLabel: string
  onCancel: () => void
  onContinue: (replacementId: string | null) => void
}

export function AnalystReplacementPickModal({
  open,
  title,
  description,
  candidates,
  confirmLabel,
  onCancel,
  onContinue,
}: Props) {
  const uid = useId()
  const noneInputId = `${uid}-none`
  const [choice, setChoice] = useState<string>('__none__')

  useEffect(() => {
    if (open) setChoice('__none__')
  }, [open, candidates])

  useEffect(() => {
    if (!open) return
    const id = window.requestAnimationFrame(() => {
      document.getElementById(noneInputId)?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [open, noneInputId])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const replacementId = choice === '__none__' ? null : choice
    onContinue(replacementId)
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal modal--md analyst-replace-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={`${uid}-title`} className="modal__title">
          {title}
        </h2>
        <p className="analyst-replace-modal__desc muted">{description}</p>
        <form className="analyst-replace-modal__form" onSubmit={onSubmit}>
          <fieldset className="analyst-replace-modal__fieldset">
            <legend className="sr-only">Substituto</legend>
            <label className="analyst-replace-option" htmlFor={noneInputId}>
              <input
                id={noneInputId}
                type="radio"
                name="replacement"
                checked={choice === '__none__'}
                onChange={() => setChoice('__none__')}
              />
              <span className="analyst-replace-option__body">
                <strong>Sem substituto</strong>
                <span className="muted analyst-replace-option__hint">Remove o vínculo deste analista em projetos, tarefas, agenda e sessões.</span>
              </span>
            </label>
            {candidates.map((a) => {
              const inputId = `${uid}-${a.id}`
              return (
                <label key={a.id} className="analyst-replace-option" htmlFor={inputId}>
                  <input
                    id={inputId}
                    type="radio"
                    name="replacement"
                    checked={choice === a.id}
                    onChange={() => setChoice(a.id)}
                  />
                  <AnalystAvatar name={a.name} color={a.color} avatarUrl={a.avatarUrl} size="sm" />
                  <span className="analyst-replace-option__body">
                    <strong>{a.name}</strong>
                    <span className="muted analyst-replace-option__hint">Reatribuir referências para este analista.</span>
                  </span>
                </label>
              )
            })}
          </fieldset>
          <div className="modal__actions analyst-replace-modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary">
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
