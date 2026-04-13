import { FormEvent, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { DbPlanTask } from '../db/types'

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
  const [estimatedHours, setEstimatedHours] = useState(0)
  const [isInformational, setIsInformational] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (task) {
      setCode(task.code)
      setTitle(task.title)
      setDescription(task.description)
      setEstimatedHours(task.estimatedHours)
      setIsInformational(task.isInformational)
    } else {
      setCode(defaultCode)
      setTitle('')
      setDescription('')
      setEstimatedHours(0)
      setIsInformational(false)
    }
    setErr(null)
  }, [open, task?.id, defaultCode])

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
        className="modal modal--plan-form"
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
          <form className="stack plan-new-form" onSubmit={onSubmit}>
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
            <label className="field">
              <span>Horas estimadas</span>
              <input
                type="number"
                min={0}
                max={999}
                disabled={isInformational}
                value={isInformational ? 0 : estimatedHours}
                onChange={(e) => setEstimatedHours(Number(e.target.value))}
              />
            </label>
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
