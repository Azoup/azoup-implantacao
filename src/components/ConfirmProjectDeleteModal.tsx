import { useState } from 'react'

type Props = {
  open: boolean
  projectName: string
  busy?: boolean
  onCancel: () => void
  onConfirm: (justification: string) => Promise<void> | void
}

export function ConfirmProjectDeleteModal({ open, projectName, busy = false, onCancel, onConfirm }: Props) {
  const [typedName, setTypedName] = useState('')
  const [reason, setReason] = useState('')

  if (!open) return null

  const canSubmit = typedName.trim() === projectName.trim() && reason.trim().length >= 8 && !busy

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => (busy ? null : onCancel())}>
      <div className="modal modal--md proj-delete-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Excluir projeto</h2>
        <p className="proj-delete-modal__lead">
          Esta ação é permanente. Digite o nome do projeto e informe a justificativa para registrar auditoria.
        </p>
        <div className="field">
          <label className="field__label" htmlFor="proj-delete-name">
            Nome do projeto para confirmação
          </label>
          <input
            id="proj-delete-name"
            className="input"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={projectName}
            disabled={busy}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="proj-delete-reason">
            Justificativa
          </label>
          <textarea
            id="proj-delete-reason"
            className="textarea proj-delete-modal__reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Ex.: Projeto cancelado pelo cliente após reunião de alinhamento."
            disabled={busy}
          />
        </div>
        <p className="proj-delete-modal__hint">Será registrado: usuário, data/hora e justificativa.</p>
        <div className="modal__actions modal__actions--sticky">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => void onConfirm(reason.trim())}
            disabled={!canSubmit}
          >
            {busy ? 'Excluindo...' : 'Excluir projeto'}
          </button>
        </div>
      </div>
    </div>
  )
}
