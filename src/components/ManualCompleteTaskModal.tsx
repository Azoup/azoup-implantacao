import { useEffect, useState, type FormEvent } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { DbTask } from '../db/types'

type Props = {
  open: boolean
  task: DbTask | null
  busy?: boolean
  onCancel: () => void
  onConfirm: (reason: string) => void | Promise<void>
}

/**
 * Modal de confirmação para concluir uma tarefa SEM evento `realizado`.
 * Exige justificativa obrigatória (≥3 chars). Resultado: completedManualOverride=true.
 */
export function ManualCompleteTaskModal({ open, task, busy, onCancel, onConfirm }: Props) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (open) {
      setReason('')
      setTouched(false)
    }
  }, [open])

  if (!open || !task) return null

  const trimmed = reason.trim()
  const isValid = trimmed.length >= 3

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isValid) {
      setTouched(true)
      return
    }
    void onConfirm(trimmed)
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => (busy ? undefined : onCancel())}>
      <div
        className="modal modal--md"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="manual-complete-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="manual-complete-title" className="modal__title" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <AlertTriangle size={18} aria-hidden style={{ color: 'var(--warning)' }} />
          Concluir sem atendimento registrado
        </h2>
        <p className="muted" style={{ margin: '0.35rem 0 0.85rem' }}>
          A tarefa <strong>{task.code} · {task.title}</strong> não tem nenhum evento marcado como
          <em> realizado</em>. Tem certeza que deseja concluí-la mesmo assim?
        </p>
        <form onSubmit={handleSubmit}>
          <label className="form-row">
            <span>Motivo da conclusão manual (obrigatório)</span>
            <textarea
              value={reason}
              onChange={(ev) => setReason(ev.target.value)}
              onBlur={() => setTouched(true)}
              rows={3}
              placeholder="Ex.: cliente confirmou conclusão por outro canal; tarefa absorvida em outra; etc."
              autoFocus
              aria-invalid={touched && !isValid}
            />
          </label>
          {touched && !isValid ? (
            <p className="muted" style={{ color: 'var(--danger)' }}>
              Informe um motivo com pelo menos 3 caracteres.
            </p>
          ) : null}
          <div className="modal__actions modal__actions--sticky">
            <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy || !isValid}>
              {busy ? 'Concluindo…' : 'Confirmar conclusão manual'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
