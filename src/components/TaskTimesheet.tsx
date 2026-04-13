import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Pause, Play, Plus, Timer, Trash2 } from 'lucide-react'
import { db } from '../db/database'
import { formatDatePt } from '../lib/dates'
import type { DbTask, DbTimeSession, DbUser } from '../db/types'
import {
  addManualTimeSession,
  deleteTimeSession,
  getRunningSessionForUser,
  startTimer,
  stopTimer,
  updateSessionDurationSeconds,
} from '../services/timeSessions'

const icSm = { size: 14, strokeWidth: 2, absoluteStrokeWidth: true } as const

function formatHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':')
}

type Props = {
  task: DbTask
  user: DbUser
}

export function TaskTimesheet({ task, user }: Props) {
  const [tick, setTick] = useState(0)
  const [manualHours, setManualHours] = useState('')
  const [manualNotes, setManualNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editHoursDraft, setEditHoursDraft] = useState('')

  const sessions = useLiveQuery(
    () => db.timeSessions.where('taskId').equals(task.id).toArray(),
    [task.id],
  ) ?? []

  const running = useLiveQuery(async () => getRunningSessionForUser(user.id), [user.id])

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  }, [sessions])

  const runningHere = running?.taskId === task.id ? running : null
  const runningElsewhere = running && running.taskId !== task.id ? running : null

  useEffect(() => {
    if (!runningHere) return
    const id = window.setInterval(() => setTick((x) => x + 1), 1000)
    return () => window.clearInterval(id)
  }, [runningHere?.id])

  const liveSeconds = useMemo(() => {
    void tick
    if (!runningHere) return 0
    const start = new Date(runningHere.startedAt).getTime()
    return Math.max(0, Math.floor((Date.now() - start) / 1000))
  }, [runningHere, tick])

  async function onStart() {
    setBusy(true)
    try {
      await startTimer(task.id, user.id)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Não foi possível iniciar o cronômetro')
    } finally {
      setBusy(false)
    }
  }

  async function onStop() {
    if (!runningHere) return
    setBusy(true)
    try {
      await stopTimer(runningHere.id, user.id)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Não foi possível parar o cronômetro')
    } finally {
      setBusy(false)
    }
  }

  async function onAddManual(e: FormEvent) {
    e.preventDefault()
    const h = parseFloat(manualHours.replace(',', '.'))
    if (!Number.isFinite(h) || h <= 0) {
      alert('Informe as horas em decimal (ex.: 1,5 para 1h30).')
      return
    }
    setBusy(true)
    try {
      await addManualTimeSession({
        taskId: task.id,
        userId: user.id,
        hours: h,
        notes: manualNotes,
      })
      setManualHours('')
      setManualNotes('')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Não foi possível adicionar o tempo')
    } finally {
      setBusy(false)
    }
  }

  function beginEdit(s: DbTimeSession) {
    if (s.userId !== user.id) return
    const sec = s.durationSeconds ?? 0
    setEditingId(s.id)
    setEditHoursDraft((sec / 3600).toFixed(2).replace(/\.?0+$/, ''))
  }

  async function saveEdit(sessionId: string) {
    const h = parseFloat(editHoursDraft.replace(',', '.'))
    if (!Number.isFinite(h) || h < 0) {
      alert('Horas inválidas.')
      return
    }
    setBusy(true)
    try {
      await updateSessionDurationSeconds(sessionId, user.id, Math.round(h * 3600))
      setEditingId(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Não foi possível salvar')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(sessionId: string) {
    if (!confirm('Remover este registro de tempo?')) return
    setBusy(true)
    try {
      await deleteTimeSession(sessionId, user.id)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Não foi possível excluir')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="pd-timesheet" aria-label="Registro de tempo na tarefa">
      <div className="pd-timesheet__head">
        <Timer size={15} strokeWidth={2} className="pd-timesheet__head-ic" aria-hidden />
        <span className="pd-timesheet__head-title">Cronômetro e lançamentos</span>
      </div>

      <div
        className={
          'pd-timesheet__timer-panel' + (runningHere ? ' pd-timesheet__timer-panel--live' : '')
        }
      >
        <div className="pd-timesheet__timer-row">
          <div className="pd-timesheet__clock" aria-live="polite">
            <span className="pd-timesheet__hms">{formatHMS(runningHere ? liveSeconds : 0)}</span>
            <span className="pd-timesheet__clock-caption muted">
              {runningHere ? 'Em execução' : 'Parado'}
            </span>
          </div>
          <div className="pd-timesheet__timer-btns">
            {runningHere ? (
              <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={onStop}>
                <Pause {...icSm} aria-hidden />
                Parar
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={busy || !!runningElsewhere}
                onClick={onStart}
              >
                <Play {...icSm} aria-hidden />
                Iniciar
              </button>
            )}
          </div>
        </div>
        {runningElsewhere ? (
          <p className="pd-timesheet__warn muted">Há um cronômetro ativo em outra tarefa.</p>
        ) : null}
      </div>

      <form className="pd-timesheet__manual" onSubmit={onAddManual}>
        <div className="pd-timesheet__manual-head muted">Ajuste manual</div>
        <div className="pd-timesheet__manual-fields">
          <input
            className="input input--xs pd-timesheet__manual-hours"
            type="text"
            inputMode="decimal"
            placeholder="Horas (ex. 1,25)"
            value={manualHours}
            onChange={(e) => setManualHours(e.target.value)}
            aria-label="Horas decimais"
          />
          <input
            className="input input--xs pd-timesheet__manual-notes"
            type="text"
            placeholder="Nota opcional"
            value={manualNotes}
            onChange={(e) => setManualNotes(e.target.value)}
          />
          <button type="submit" className="btn btn--ghost btn--sm pd-timesheet__manual-submit" disabled={busy}>
            <Plus {...icSm} aria-hidden />
            Lançar
          </button>
        </div>
      </form>

      {sortedSessions.length > 0 ? (
        <ul className="pd-timesheet__list">
          {sortedSessions.map((s) => {
            const mine = s.userId === user.id
            const done = s.endedAt != null && s.durationSeconds != null
            const displaySec =
              s.id === runningHere?.id ? liveSeconds : done ? (s.durationSeconds ?? 0) : null
            return (
              <li key={s.id} className="pd-timesheet__row">
                <div className="pd-timesheet__row-main">
                  <span className="pd-timesheet__row-when muted">
                    {formatDatePt(s.startedAt)} {formatDatePt(s.startedAt, 'HH:mm')}
                  </span>
                  <span className="pd-timesheet__row-src">{s.source === 'timer' ? 'Cronômetro' : 'Manual'}</span>
                  {displaySec != null ? (
                    <span className="pd-timesheet__row-dur">{formatHMS(displaySec)}</span>
                  ) : (
                    <span className="pd-timesheet__row-dur pd-timesheet__row-dur--live">em andamento…</span>
                  )}
                </div>
                {editingId === s.id ? (
                  <div className="pd-timesheet__row-edit">
                    <input
                      className="input input--xs"
                      value={editHoursDraft}
                      onChange={(e) => setEditHoursDraft(e.target.value)}
                      aria-label="Nova duração em horas"
                    />
                    <button type="button" className="btn btn--sm btn--primary" disabled={busy} onClick={() => saveEdit(s.id)}>
                      OK
                    </button>
                    <button type="button" className="btn btn--sm btn--ghost" onClick={() => setEditingId(null)}>
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="pd-timesheet__row-actions">
                    {s.notes ? <span className="pd-timesheet__row-note muted">{s.notes}</span> : null}
                    {mine && done ? (
                      <>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => beginEdit(s)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm pd-timesheet__del"
                          aria-label="Excluir sessão"
                          onClick={() => onDelete(s.id)}
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      </>
                    ) : null}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="pd-timesheet__empty muted">Nenhum bloco de tempo nesta tarefa ainda.</p>
      )}
    </section>
  )
}
