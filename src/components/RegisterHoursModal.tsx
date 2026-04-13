import { FormEvent, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Check, Clock, X } from 'lucide-react'
import type { DbTask, DbUser, TimeLogType } from '../db/types'
import { addTaskTimeLog } from '../services/timeLogs'

type Props = {
  open: boolean
  task: DbTask | null
  user: DbUser
  onClose: () => void
}

const iconSm = { size: 18, strokeWidth: 2, absoluteStrokeWidth: true } as const

export function RegisterHoursModal({ open, task, user, onClose }: Props) {
  const [logType, setLogType] = useState<TimeLogType>('executado')
  const [hours, setHours] = useState('')
  const [executionDate, setExecutionDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !task) return
    setLogType('executado')
    setHours(task.estimatedHours > 0 ? String(task.estimatedHours) : '')
    setExecutionDate(format(new Date(), 'yyyy-MM-dd'))
    setNotes('')
  }, [open, task?.id])

  if (!open || !task) return null
  if (task.isInformational) return null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!task) return
    const h = parseFloat(hours.replace(',', '.'))
    if (logType !== 'cancelado_sem_horas' && (Number.isNaN(h) || h < 0)) {
      alert('Informe horas válidas.')
      return
    }
    const effective = logType === 'cancelado_sem_horas' ? 0 : h
    setBusy(true)
    try {
      await addTaskTimeLog({
        taskId: task.id,
        userId: user.id,
        hours: effective,
        logType,
        executionDate: new Date(executionDate + 'T12:00:00').toISOString(),
        notes,
      })
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível registrar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="modal modal--md register-hours-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reg-hours-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__head register-hours-modal__head">
          <div className="register-hours-modal__title-row">
            <span className="register-hours-modal__icon" aria-hidden>
              <Clock {...iconSm} />
            </span>
            <h2 id="reg-hours-title" className="modal__title">
              Registrar Horas
            </h2>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fechar">
            <X size={20} strokeWidth={2} />
          </button>
        </header>

        <form onSubmit={onSubmit} className="register-hours-modal__form">
          <div className="register-hours-modal__task-box">
            <div className="register-hours-modal__task-code">
              {task.code} {task.title}
            </div>
            <p className="register-hours-modal__task-meta muted">
              Estimado: {task.estimatedHours}h · Realizado: {task.actualHours}h
            </p>
          </div>

          <fieldset className="register-hours-modal__status-fieldset">
            <legend className="register-hours-modal__legend">Status da execução</legend>
            <div className="register-hours-modal__status-grid">
              <button
                type="button"
                className={
                  'register-hours-modal__status-card' + (logType === 'executado' ? ' is-selected' : '')
                }
                onClick={() => setLogType('executado')}
              >
                <Check className="register-hours-modal__status-ic register-hours-modal__status-ic--ok" size={20} />
                <span>Executado normalmente</span>
              </button>
              <button
                type="button"
                className={
                  'register-hours-modal__status-card' + (logType === 'cancelado_sem_horas' ? ' is-selected' : '')
                }
                onClick={() => setLogType('cancelado_sem_horas')}
              >
                <X className="register-hours-modal__status-ic register-hours-modal__status-ic--muted" size={20} />
                <span>Cancelado (sem horas)</span>
              </button>
              <button
                type="button"
                className={
                  'register-hours-modal__status-card' + (logType === 'cancelado_com_horas' ? ' is-selected' : '')
                }
                onClick={() => setLogType('cancelado_com_horas')}
              >
                <X className="register-hours-modal__status-ic register-hours-modal__status-ic--danger" size={20} />
                <span>Cancelado (com horas)</span>
              </button>
            </div>
          </fieldset>

          {logType !== 'cancelado_sem_horas' ? (
            <label className="register-hours-modal__field">
              <span className="register-hours-modal__label">Horas realizadas</span>
              <input
                className="input"
                type="text"
                inputMode="decimal"
                placeholder={task.estimatedHours > 0 ? `Estimado: ${task.estimatedHours}h` : '0'}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
              <span className="register-hours-modal__hint muted">
                Pode ser diferente do estimado — informe as horas reais
              </span>
            </label>
          ) : null}

          <label className="register-hours-modal__field">
            <span className="register-hours-modal__label">Data de execução</span>
            <input
              className="input"
              type="date"
              value={executionDate}
              onChange={(e) => setExecutionDate(e.target.value)}
            />
          </label>

          <label className="register-hours-modal__field">
            <span className="register-hours-modal__label">Observações</span>
            <textarea
              className="input register-hours-modal__textarea"
              rows={3}
              placeholder="Opcional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          <footer className="modal__footer register-hours-modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? 'Salvando…' : 'Registrar'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
