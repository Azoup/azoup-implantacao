import { FormEvent, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { DbPlanPhase } from '../db/types'

type Props = {
  open: boolean
  onClose: () => void
  phase: DbPlanPhase | null
  onSave: (name: string) => Promise<void>
}

export function PlanPhaseModal({ open, onClose, phase, onSave }: Props) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(phase?.name ?? '')
    setErr(null)
  }, [open, phase?.id])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (n.length < 2) {
      setErr('Informe o nome da fase.')
      return
    }
    setSaving(true)
    setErr(null)
    try {
      await onSave(n)
      onClose()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const title = phase ? 'Editar fase' : 'Nova fase'

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => !saving && onClose()}>
      <div
        className="modal modal--plan-form"
        role="dialog"
        aria-modal
        aria-labelledby="plan-phase-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-plan__header">
          <h2 id="plan-phase-modal-title" className="modal__title">
            {title}
          </h2>
          <button type="button" className="modal-plan__close" aria-label="Fechar" disabled={saving} onClick={onClose}>
            <X size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="modal-plan__body">
          <form className="stack plan-new-form" onSubmit={onSubmit}>
            <label className="field">
              <span>Nome</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                placeholder="Ex: Fase 01 — Vendas"
              />
            </label>
            <p className="muted plan-new-form__hint">
              {phase
                ? 'Ordem: use ↑ ↓ no cartão da fase na lista.'
                : 'A fase será adicionada ao final; depois você pode reordenar com ↑ ↓.'}
            </p>
            {err ? <p className="auth__error">{err}</p> : null}
            <div className="modal-plan__footer">
              <button type="button" className="btn btn--ghost" disabled={saving} onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
