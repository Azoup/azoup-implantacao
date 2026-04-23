import { FormEvent, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { DbPlanTask } from '../db/types'
import { formatDecimalHoursForBrInput, parseDurationFlexibleToHours } from '../lib/durationFormat'

export type PlanTaskFormValues = {
  code: string
  title: string
  description: string
  estimatedHours: number
  isInformational: boolean
}

type Props = {
  open: boolean
  onClose: () => void
  task: DbPlanTask | null
  defaultCode: string
  onSave: (values: PlanTaskFormValues) => Promise<void>
}

export function PlanTaskModal({ open, onClose, task, defaultCode, onSave }: Props) {
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedHoursDraft, setEstimatedHoursDraft] = useState('')
  const [isInformational, setIsInformational] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (task) {
      setCode(task.code)
      setTitle(task.title)
      setDescription(task.description)
      setEstimatedHoursDraft(
        task.isInformational ? '0' : formatDecimalHoursForBrInput(task.estimatedHours),
      )
      setIsInformational(task.isInformational)
    } else {
      setCode(defaultCode)
      setTitle('')
      setDescription('')
      setEstimatedHoursDraft('1')
      setIsInformational(false)
    }
    setErr(null)
  }, [open, task, defaultCode])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const c = code.trim()
    const t = title.trim()
    if (!c) {
      setErr('Informe o código da tarefa (ex.: 1.1).')
      return
    }
    if (t.length < 2) {
      setErr('Informe o título.')
      return
    }
    let estimatedHours = 0
    if (!isInformational) {
      const parsed = parseDurationFlexibleToHours(estimatedHoursDraft)
      if (!Number.isFinite(parsed) || parsed < 0) {
        setErr('Horas inválidas. Use decimal com vírgula ou ponto (ex.: 1,5) ou relógio (1:30).')
        return
      }
      if (parsed > 999) {
        setErr('Horas estimadas no máximo 999.')
        return
      }
      estimatedHours = parsed
    }

    setSaving(true)
    setErr(null)
    try {
      await onSave({
        code: c,
        title: t,
        description: description.trim(),
        estimatedHours: Math.max(0, estimatedHours),
        isInformational,
      })
      onClose()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const modalTitle = task ? 'Editar tarefa' : 'Nova tarefa'

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => !saving && onClose()}>
      <div
        className="modal modal--plan-form modal--plan-task"
        role="dialog"
        aria-modal
        aria-labelledby="plan-task-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-plan__header">
          <h2 id="plan-task-modal-title" className="modal__title">
            {modalTitle}
          </h2>
          <button type="button" className="modal-plan__close" aria-label="Fechar" disabled={saving} onClick={onClose}>
            <X size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="modal-plan__body">
          <form id="vyntask-plan-task-form" className="stack plan-new-form" onSubmit={onSubmit}>
            <label className="field">
              <span>Código</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} required placeholder="Ex: 1.1" />
            </label>
            <label className="field">
              <span>Título</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={2}
                placeholder="Ex: 1.1 Instalação"
              />
            </label>
            <label className="field">
              <span>Descrição</span>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição da tarefa" />
            </label>
            <label className="field field--row plan-task-modal__toggle">
              <input
                type="checkbox"
                checked={isInformational}
                onChange={(e) => setIsInformational(e.target.checked)}
              />
              <span>Informativa (não consome horas)</span>
            </label>
            <label className={`field plan-task-modal__hours ${isInformational ? 'is-disabled' : ''}`}>
              <span>Horas estimadas</span>
              <input
                className="plan-task-modal__hours-input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                disabled={isInformational}
                placeholder="1,5 ou 1:30"
                value={isInformational ? '—' : estimatedHoursDraft}
                onChange={(e) => {
                  if (isInformational) return
                  setEstimatedHoursDraft(e.target.value)
                }}
              />
              <span className="field__hint muted">
                Decimal com vírgula ou ponto (1,5 h) ou relógio 1:30 — até 999 h.
              </span>
            </label>
          </form>
        </div>
        <div className="modal-plan__footer">
          {err ? <p className="auth__error modal-plan__footer-err">{err}</p> : null}
          <div className="modal-plan__footer-actions">
            <button type="button" className="btn btn--ghost" disabled={saving} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" form="vyntask-plan-task-form" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
