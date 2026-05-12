import { FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import type { DbPlanTask } from '../db/types'
import { formatDecimalHoursForBrInput, parseDurationFlexibleToHours } from '../lib/durationFormat'
import { AiFormatModal } from './AiFormatModal'
import { useUnsavedCloseGuard } from '../navigation/useUnsavedCloseGuard'
import { useUiFeedback } from '../ui/UiFeedbackContext'

export type PlanTaskFormValues = {
  code: string
  title: string
  description: string
  estimatedHours: number
  isInformational: boolean
}

export type PlanTaskSaveMeta = { justification: string }

type Props = {
  open: boolean
  onClose: () => void
  task: DbPlanTask | null
  defaultCode: string
  onSave: (values: PlanTaskFormValues, meta?: PlanTaskSaveMeta) => Promise<void>
  /** Tarefa extra em projeto de plano catálogo: sem estimativa; só consome horas reais. */
  variant?: 'standard' | 'catalogAdHoc'
  /**
   * Em projetos: ao editar tarefa existente, exige justificativa (auditoria) antes de salvar.
   * Modelos de plano (`PlanModelsPage`) devem deixar `false`.
   */
  auditOnEdit?: boolean
}

export function PlanTaskModal({
  open,
  onClose,
  task,
  defaultCode,
  onSave,
  variant = 'standard',
  auditOnEdit = false,
}: Props) {
  const { toastError, toastMutationError } = useUiFeedback()
  const codeRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const hoursRef = useRef<HTMLInputElement>(null)
  const auditJustificationRef = useRef<HTMLTextAreaElement>(null)

  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedHoursDraft, setEstimatedHoursDraft] = useState('')
  const [isInformational, setIsInformational] = useState(false)
  const [auditJustification, setAuditJustification] = useState('')
  const [saving, setSaving] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [baseline, setBaseline] = useState<string | null>(null)

  const isCatalogAdHoc = variant === 'catalogAdHoc'

  useEffect(() => {
    if (!open) return
    if (task) {
      setCode(task.code)
      setTitle(task.title)
      setDescription(task.description)
      if (isCatalogAdHoc) {
        setEstimatedHoursDraft('0')
        setIsInformational(false)
      } else {
        setEstimatedHoursDraft(
          task.isInformational ? '0' : formatDecimalHoursForBrInput(task.estimatedHours),
        )
        setIsInformational(task.isInformational)
      }
    } else {
      setCode(defaultCode)
      setTitle('')
      setDescription('')
      setEstimatedHoursDraft(isCatalogAdHoc ? '0' : '1')
      setIsInformational(false)
    }
    setAuditJustification('')
  }, [open, task, defaultCode, isCatalogAdHoc])

  const draftSnapshot = useMemo(
    () =>
      JSON.stringify({
        code,
        title,
        description,
        estimatedHoursDraft,
        isInformational,
        auditJustification,
      }),
    [code, title, description, estimatedHoursDraft, isInformational, auditJustification],
  )

  useLayoutEffect(() => {
    if (!open) {
      setBaseline(null)
      return
    }
    setBaseline((prev) => prev ?? draftSnapshot)
  }, [open, draftSnapshot])

  const modalDirty = useMemo(() => {
    if (!open || baseline === null) return false
    return baseline !== draftSnapshot
  }, [open, baseline, draftSnapshot])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const c = code.trim()
    const t = title.trim()
    if (!c) {
      toastError('Informe o código da tarefa (ex.: 1.1).')
      window.requestAnimationFrame(() => codeRef.current?.focus())
      return
    }
    if (t.length < 2) {
      toastError('Informe o título (mínimo 2 caracteres).')
      window.requestAnimationFrame(() => titleRef.current?.focus())
      return
    }
    let estimatedHours = 0
    let informational = isInformational
    if (isCatalogAdHoc) {
      estimatedHours = 0
      informational = false
    } else if (!informational) {
      const parsed = parseDurationFlexibleToHours(estimatedHoursDraft)
      if (!Number.isFinite(parsed) || parsed < 0) {
        toastError('Horas inválidas. Use decimal (ex.: 1,5) ou relógio (1:30).')
        window.requestAnimationFrame(() => hoursRef.current?.focus())
        return
      }
      if (parsed > 999) {
        toastError('Estimativa no máximo 999 h.')
        window.requestAnimationFrame(() => hoursRef.current?.focus())
        return
      }
      estimatedHours = parsed
    }

    if (auditOnEdit && task) {
      const jus = auditJustification.trim()
      if (jus.length < 12) {
        toastError('Justificativa: mínimo 12 caracteres (obrigatório para auditoria).')
        window.requestAnimationFrame(() => auditJustificationRef.current?.focus())
        return
      }
    }

    setSaving(true)
    try {
      const payload: PlanTaskFormValues = {
        code: c,
        title: t,
        description: description.trim(),
        estimatedHours: Math.max(0, estimatedHours),
        isInformational: informational,
      }
      if (auditOnEdit && task) {
        await onSave(payload, { justification: auditJustification.trim() })
      } else {
        await onSave(payload)
      }
      onClose()
    } catch (ex) {
      toastMutationError(
        { action: task ? 'update' : 'save', target: 'a tarefa', gender: 'f' },
        ex instanceof Error ? ex.message : undefined,
      )
    } finally {
      setSaving(false)
    }
  }

  const attemptClose = useUnsavedCloseGuard({
    isDirty: () => modalDirty,
    onSave: onSubmit.bind(null, { preventDefault() {} } as FormEvent),
    onDiscard: onClose,
    message: 'Ha alteracoes nao gravadas nesta tarefa. Deseja gravar antes de sair?',
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

  const modalTitle = isCatalogAdHoc
    ? task
      ? 'Editar tarefa avulsa'
      : 'Nova tarefa avulsa'
    : task
      ? 'Editar tarefa'
      : 'Nova tarefa'

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => (!saving ? void attemptClose() : undefined)}>
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
          <form id="implantacao-azoup-plan-task-form" className="stack plan-new-form" onSubmit={onSubmit}>
            <label className="field">
              <span>Código</span>
              <input
                ref={codeRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                placeholder="Ex: 1.1"
              />
            </label>
            <label className="field">
              <span>Título</span>
              <input
                ref={titleRef}
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
              <div className="plan-task-modal__ai">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setAiOpen(true)}
                  disabled={saving || !description.trim()}
                >
                  <Sparkles size={14} strokeWidth={2} />
                  Formatar IA
                </button>
              </div>
            </label>
            {isCatalogAdHoc ? (
              <p className="field__hint muted" style={{ marginTop: 0 }}>
                Não altera a previsão do plano (estimativa do catálogo). O tempo só entra nas{' '}
                <strong>horas utilizadas</strong> via cronômetro ou lançamentos nesta tarefa.
              </p>
            ) : (
              <>
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
                    ref={hoursRef}
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
              </>
            )}
            {auditOnEdit && task ? (
              <label className="field">
                <span>Justificativa da alteração</span>
                <textarea
                  ref={auditJustificationRef}
                  className="input"
                  rows={3}
                  value={auditJustification}
                  onChange={(e) => setAuditJustification(e.target.value)}
                  placeholder="Obrigatório para auditoria (mín. 12 caracteres)."
                  autoComplete="off"
                />
                <span className="field__hint muted">Registrada nos logs de auditoria junto com o resumo das mudanças.</span>
              </label>
            ) : null}
          </form>
        </div>
        <div className="modal-plan__footer">
          <div className="modal-plan__footer-actions">
            <button type="button" className="btn btn--ghost" disabled={saving} onClick={() => void attemptClose()}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" form="implantacao-azoup-plan-task-form" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
      <AiFormatModal
        open={aiOpen}
        title="Formatar descricao da tarefa"
        text={description}
        intent="task_description"
        onClose={() => setAiOpen(false)}
        onApply={(next, mode) => {
          if (!next.trim()) return
          setDescription((prev) => (mode === 'replace' ? next.trim() : `${prev.trim()}\n\n${next.trim()}`.trim()))
          setAiOpen(false)
        }}
      />
    </div>
  )
}
