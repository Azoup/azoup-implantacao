type Props = {
  open: boolean
  busy: boolean
  canSave: boolean
  message?: string
  onCancel: () => void
  onDiscard: () => void
  onSaveAndLeave: () => void | Promise<void>
}

export function UnsavedLeaveDialog({
  open,
  busy,
  canSave,
  message,
  onCancel,
  onDiscard,
  onSaveAndLeave,
}: Props) {
  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => (busy ? undefined : onCancel())}>
      <div
        className="modal modal--md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-leave-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="unsaved-leave-title" className="modal__title">
          Alterações não gravadas
        </h2>
        <p className="muted">
          {message ??
            'Existem alterações que ainda não foram gravadas. Deseja gravar antes de sair ou descartar?'}
        </p>
        <div className="modal__actions modal__actions--sticky">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className="btn btn--ghost" onClick={onDiscard} disabled={busy}>
            Sair sem gravar
          </button>
          {canSave ? (
            <button type="button" className="btn btn--primary" onClick={() => void onSaveAndLeave()} disabled={busy}>
              {busy ? 'Gravando…' : 'Gravar e sair'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
