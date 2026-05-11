import { FormEvent, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { DbPlanPhase } from '../db/types'
import { PHASE_COLOR_PRESETS, inferPhaseColor, normalizePhaseColorHex } from '../constants/phaseProgression'
import { useUnsavedCloseGuard } from '../navigation/useUnsavedCloseGuard'

type Props = {
  open: boolean
  onClose: () => void
  phase: DbPlanPhase | null
  orderIndex: number
  onSave: (name: string, colorHex: string) => Promise<void>
}

export function PlanPhaseModal({ open, onClose, phase, orderIndex, onSave }: Props) {
  const [name, setName] = useState('')
  const [colorHex, setColorHex] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [baseline, setBaseline] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(phase?.name ?? '')
    setColorHex(phase?.colorHex ?? inferPhaseColor(phase?.name ?? '', orderIndex))
    setErr(null)
  }, [open, phase, orderIndex])

  const snapshot = useMemo(() => JSON.stringify({ name, colorHex }), [name, colorHex])

  useLayoutEffect(() => {
    if (!open) {
      setBaseline(null)
      return
    }
    setBaseline((prev) => prev ?? snapshot)
  }, [open, snapshot])

  const dirty = useMemo(() => {
    if (!open || baseline === null) return false
    return baseline !== snapshot
  }, [open, baseline, snapshot])

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
      await onSave(n, normalizePhaseColorHex(colorHex, inferPhaseColor(n, orderIndex)))
      onClose()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const attemptClose = useUnsavedCloseGuard({
    isDirty: () => dirty,
    onSave: async () => {
      await onSubmit({ preventDefault() {} } as FormEvent)
    },
    onDiscard: onClose,
    message: 'Ha alteracoes nao gravadas nesta fase. Deseja gravar antes de sair?',
  })

  useEffect(() => {
    if (!open) return
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape' || saving) return
      ev.preventDefault()
      void attemptClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, saving, attemptClose])

  if (!open) return null

  const title = phase ? 'Editar fase' : 'Nova fase'

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => (!saving ? void attemptClose() : undefined)}>
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
          <button
            type="button"
            className="modal-plan__close"
            aria-label="Fechar"
            disabled={saving}
            onClick={() => void attemptClose()}
          >
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
            <label className="field">
              <span>Cor da fase</span>
              <div className="plan-phase-color-grid">
                {PHASE_COLOR_PRESETS.map((preset) => {
                  const selected = colorHex.toLowerCase() === preset.hex.toLowerCase()
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      className={'plan-phase-color-chip' + (selected ? ' is-selected' : '')}
                      onClick={() => setColorHex(preset.hex)}
                      title={preset.label}
                      style={{ ['--phase-chip-color' as string]: preset.hex }}
                    >
                      <span className="plan-phase-color-chip__dot" aria-hidden />
                      {preset.label}
                    </button>
                  )
                })}
              </div>
              <input
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                placeholder="#b89a2b"
                pattern="^#?[0-9a-fA-F]{6}$"
              />
            </label>
            <p className="muted plan-new-form__hint">
              {phase
                ? 'Ordem: use ↑ ↓ no cartão da fase na lista.'
                : 'A fase será adicionada ao final; depois você pode reordenar com ↑ ↓.'}
            </p>
            {err ? <p className="auth__error">{err}</p> : null}
            <div className="modal-plan__footer">
              <button type="button" className="btn btn--ghost" disabled={saving} onClick={() => void attemptClose()}>
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
