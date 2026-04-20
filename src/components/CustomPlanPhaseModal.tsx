import { FormEvent, useEffect, useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  open: boolean
  heading: string
  initialName: string
  initialColorHex: string
  onClose: () => void
  onSave: (name: string, colorHex: string | null) => Promise<void>
}

export function CustomPlanPhaseModal({
  open,
  heading,
  initialName,
  initialColorHex,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState('')
  const [colorHex, setColorHex] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(initialName)
    setColorHex(initialColorHex)
    setErr(null)
  }, [open, initialName, initialColorHex])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (n.length < 2) {
      setErr('Informe o nome da fase (mín. 2 caracteres).')
      return
    }
    const c = colorHex.trim()
    const color = c && /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(c) ? (c.length === 4 ? expandShort(c) : c) : null
    setSaving(true)
    setErr(null)
    try {
      await onSave(n, color)
      onClose()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => !saving && onClose()}>
      <div
        className="modal modal--plan-form"
        role="dialog"
        aria-modal
        aria-labelledby="custom-phase-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-plan__header">
          <h2 id="custom-phase-modal-title" className="modal__title">
            {heading}
          </h2>
          <button type="button" className="modal-plan__close" aria-label="Fechar" disabled={saving} onClick={onClose}>
            <X size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="modal-plan__body">
          <form className="stack plan-new-form" onSubmit={onSubmit}>
            <label className="field">
              <span>Nome da fase</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Onboarding" required />
            </label>
            <label className="field">
              <span>Cor (hex, opcional)</span>
              <input
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                placeholder="#f97316"
                autoComplete="off"
              />
            </label>
            {err ? <p className="auth__error">{err}</p> : null}
            <div className="modal__actions">
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

function expandShort(h: string): string {
  const x = h.slice(1)
  if (x.length !== 3) return h
  return `#${x[0]}${x[0]}${x[1]}${x[1]}${x[2]}${x[2]}`
}
