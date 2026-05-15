import { useEffect, useMemo, useState } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { Calendar } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import type { DbEvent } from '../db/types'
import { updateEventValidated } from '../services/events'
import { getRunningSessionForUser, startTimer, stopTimer } from '../services/timeSessions'
import { setTaskStatus } from '../services/tasks'
import { useUiFeedback } from '../ui/UiFeedbackContext'
import { formatAgendaDisplayTitle } from '../lib/calendarEventTitle'
import { dayKeyFromIso, CAL_TZ } from '../lib/calendarGrid'
import { dedupeAgendaEventsByGoogleId } from '../lib/agendaEventDisplay'
import { filterHiddenGoogleTwinDuplicates } from '../lib/agendaEventDedupe'
import {
  applyAnalystFilter,
  isAnalystFilterAll,
  isAnalystFilterUnassigned,
  setAnalystFilterAll,
  setAnalystFilterSingle,
  setAnalystFilterUnassigned,
  singleSelectedAnalystId,
} from '../lib/agendaAnalystFilter'
import { useAgendaOutlet } from './agendaOutletContext'

type CloseTaskDecision = 'keep' | 'in_progress' | 'done'

export function AgendaExecutionPage() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { toast, toastError, toastWarn } = useUiFeedback()
  const {
    events,
    tasks,
    projects,
    analysts,
    analystFilter,
    setAnalystFilter,
    agendaProjectFilterId,
    setAgendaProjectFilterId,
    timeSessions,
  } = useAgendaOutlet()

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])

  const filteredEvents = useMemo(() => {
    let list = applyAnalystFilter(events, analystFilter)
    if (agendaProjectFilterId) {
      list = list.filter((ev) => {
        const pid = ev.projectId ?? (ev.taskId ? taskById.get(ev.taskId)?.projectId : undefined)
        return pid === agendaProjectFilterId
      })
    }
    return filterHiddenGoogleTwinDuplicates(dedupeAgendaEventsByGoogleId(list))
  }, [events, analystFilter, agendaProjectFilterId, taskById])

  const projectsForPickers = useMemo(
    () =>
      [...projects]
        .filter((p) => p.status !== 'cancelado')
        .sort((a, b) => a.projectName.localeCompare(b.projectName, 'pt')),
    [projects],
  )

  const todayKey = dayKeyFromIso(new Date().toISOString())

  const executionEventsToday = useMemo(
    () =>
      filteredEvents
        .filter((ev) => dayKeyFromIso(ev.startTime) === todayKey)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [filteredEvents, todayKey],
  )

  const activeSessionByTaskId = useMemo(() => {
    const out = new Map<string, string>()
    if (!userId) return out
    for (const s of timeSessions) {
      if (s.userId === userId && s.endedAt == null) out.set(s.taskId, s.id)
    }
    return out
  }, [timeSessions, userId])

  const [timerTick, setTimerTick] = useState(0)
  useEffect(() => {
    if (activeSessionByTaskId.size === 0) return
    const id = window.setInterval(() => setTimerTick((v) => v + 1), 1000)
    return () => window.clearInterval(id)
  }, [activeSessionByTaskId.size])

  const eventById = useMemo(() => new Map(events.map((ev) => [ev.id, ev])), [events])

  const [closingEventId, setClosingEventId] = useState<string | null>(null)
  const [closeTaskDecision, setCloseTaskDecision] = useState<CloseTaskDecision>('keep')
  const [closeOutcomeSummary, setCloseOutcomeSummary] = useState('')
  const [closeNextStep, setCloseNextStep] = useState('')
  const [closeLoggedHours, setCloseLoggedHours] = useState('')
  const [closeSaving, setCloseSaving] = useState(false)

  const closingEvent = closingEventId ? (eventById.get(closingEventId) ?? null) : null

  function formatSecondsClock(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds))
    const hh = String(Math.floor(s / 3600)).padStart(2, '0')
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  }

  function hoursSuggestionForEvent(ev: DbEvent): number {
    if (!ev.taskId || !userId) return 0
    const sessions = timeSessions.filter((s) => s.userId === userId && s.taskId === ev.taskId)
    const targetDay = dayKeyFromIso(ev.startTime)
    const nowMs = Date.now() + timerTick * 0
    const seconds = sessions
      .filter((s) => dayKeyFromIso(s.startedAt) === targetDay)
      .reduce((acc, s) => {
        if (s.endedAt == null) {
          const startMs = new Date(s.startedAt).getTime()
          if (!Number.isFinite(startMs)) return acc
          return acc + Math.max(0, Math.floor((nowMs - startMs) / 1000))
        }
        return acc + (s.durationSeconds ?? 0)
      }, 0)
    return Math.round((seconds / 3600) * 100) / 100
  }

  async function persistExecutionEvent(
    ev: DbEvent,
    updates: Partial<
      Pick<DbEvent, 'status' | 'executionState' | 'outcomeSummary' | 'nextStep' | 'closedAt' | 'loggedHours'>
    >,
  ) {
    await updateEventValidated(ev.id, {
      title: ev.title,
      description: ev.description,
      startTime: ev.startTime,
      endTime: ev.endTime,
      status: updates.status ?? ev.status,
      projectId: ev.projectId,
      taskId: ev.taskId,
      analystId: ev.analystId,
      meetingLink: ev.meetingLink,
      executionState: updates.executionState ?? ev.executionState ?? 'scheduled',
      outcomeSummary: updates.outcomeSummary ?? ev.outcomeSummary ?? null,
      nextStep: updates.nextStep ?? ev.nextStep ?? null,
      closedAt: updates.closedAt ?? ev.closedAt ?? null,
      loggedHours: updates.loggedHours ?? ev.loggedHours ?? null,
    })
  }

  async function handleStartExecution(ev: DbEvent) {
    if (!userId) return
    if (!ev.taskId) {
      toastWarn('Vincule uma tarefa ao evento para usar o timer.')
      return
    }
    try {
      await startTimer(ev.taskId, userId)
      await persistExecutionEvent(ev, { executionState: 'in_progress' })
      toast('Execução iniciada.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Não foi possível iniciar o timer.')
    }
  }

  async function handlePauseExecution(ev: DbEvent) {
    if (!userId || !ev.taskId) return
    try {
      const running = await getRunningSessionForUser(userId)
      if (!running || running.taskId !== ev.taskId) {
        toastWarn('Nenhum timer ativo para pausar neste item.')
        return
      }
      await stopTimer(running.id, userId)
      await persistExecutionEvent(ev, { executionState: 'paused' })
      toast('Execução pausada.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Não foi possível pausar o timer.')
    }
  }

  async function handleResumeExecution(ev: DbEvent) {
    if (!userId || !ev.taskId) return
    try {
      await startTimer(ev.taskId, userId)
      await persistExecutionEvent(ev, { executionState: 'in_progress' })
      toast('Execução retomada.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Não foi possível retomar o timer.')
    }
  }

  function openCloseWizard(ev: DbEvent) {
    setClosingEventId(ev.id)
    setCloseTaskDecision(ev.taskId ? 'keep' : 'in_progress')
    setCloseOutcomeSummary(ev.outcomeSummary ?? '')
    setCloseNextStep(ev.nextStep ?? '')
    setCloseLoggedHours(String(hoursSuggestionForEvent(ev) || ''))
  }

  async function handleConfirmCloseWizard() {
    if (!closingEvent || !userId) return
    if (!closeOutcomeSummary.trim() || !closeNextStep.trim()) {
      toastWarn('Preencha resultado e próximo passo para concluir.')
      return
    }
    const parsedHours = Number(closeLoggedHours.replace(',', '.'))
    if (!Number.isFinite(parsedHours) || parsedHours < 0) {
      toastWarn('Horas inválidas. Informe um número maior ou igual a zero.')
      return
    }
    setCloseSaving(true)
    try {
      if (closingEvent.taskId) {
        if (closeTaskDecision === 'done') await setTaskStatus(closingEvent.taskId, 'concluida', userId)
        if (closeTaskDecision === 'in_progress') await setTaskStatus(closingEvent.taskId, 'em_andamento', userId)
      }
      const running = await getRunningSessionForUser(userId)
      if (running && closingEvent.taskId && running.taskId === closingEvent.taskId) {
        await stopTimer(running.id, userId)
      }
      await persistExecutionEvent(closingEvent, {
        status: 'realizado',
        executionState: 'completed',
        outcomeSummary: closeOutcomeSummary.trim(),
        nextStep: closeNextStep.trim(),
        closedAt: new Date().toISOString(),
        loggedHours: parsedHours,
      })
      setClosingEventId(null)
      toast('Execução concluída e registrada.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Não foi possível concluir a execução.')
    } finally {
      setCloseSaving(false)
    }
  }

  const primaryExecutionCta = useMemo(() => {
    const runningEvent = executionEventsToday.find((ev) => ev.taskId && activeSessionByTaskId.has(ev.taskId))
    if (runningEvent) {
      return { label: 'Pausar execução', kind: 'pause' as const, eventId: runningEvent.id }
    }
    const pausedEvent = executionEventsToday.find((ev) => ev.executionState === 'paused' && ev.taskId)
    if (pausedEvent) {
      return { label: 'Retomar execução', kind: 'resume' as const, eventId: pausedEvent.id }
    }
    const startCandidate = executionEventsToday.find((ev) => ev.status !== 'cancelado' && ev.executionState !== 'completed')
    if (startCandidate) {
      return { label: 'Iniciar execução', kind: 'start' as const, eventId: startCandidate.id }
    }
    return null
  }, [executionEventsToday, activeSessionByTaskId])

  return (
    <div className="agenda-exec-page agenda-exec-route">
      <section className="agenda-exec-filters panel" aria-label="Filtros da execução de hoje">
        <p className="agenda-exec-filters__label muted">Analista</p>
        <div className="agenda-exec-filters__chips">
          <button
            type="button"
            className={'agenda-exec-filter-chip' + (isAnalystFilterAll(analystFilter) ? ' is-active' : '')}
            onClick={() => setAnalystFilter(setAnalystFilterAll())}
          >
            Todos
          </button>
          {analysts
            .filter((a) => a.active)
            .map((a) => (
              <button
                key={a.id}
                type="button"
                className={
                  'agenda-exec-filter-chip' + (singleSelectedAnalystId(analystFilter) === a.id ? ' is-active' : '')
                }
                onClick={() => setAnalystFilter(setAnalystFilterSingle(a.id))}
                style={{ ['--chip-dot' as string]: a.color }}
              >
                <span className="agenda-exec-filter-chip__dot" aria-hidden />
                {a.name}
              </button>
            ))}
          <button
            type="button"
            className={'agenda-exec-filter-chip' + (isAnalystFilterUnassigned(analystFilter) ? ' is-active' : '')}
            onClick={() => setAnalystFilter(setAnalystFilterUnassigned())}
          >
            Sem responsável
          </button>
        </div>
        <label className="field agenda-exec-filters__project">
          <span>Projeto</span>
          <select
            className="input"
            value={agendaProjectFilterId ?? ''}
            onChange={(e) => setAgendaProjectFilterId(e.target.value || null)}
          >
            <option value="">Todos os projetos</option>
            {projectsForPickers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.projectName}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="agenda-exec panel agenda-exec--solo" aria-label="Execução inteligente de hoje">
        <div className="agenda-exec__head">
          <div>
            <h2 className="agenda-exec__title">Execução de hoje</h2>
            <p className="agenda-exec__hint muted">
              Entre na reunião, execute com timer e conclua com resultado, próximo passo e horas.
            </p>
          </div>
          {primaryExecutionCta ? (
            <button
              type="button"
              className="btn btn--primary agenda-exec__primary"
              onClick={() => {
                const target = eventById.get(primaryExecutionCta.eventId)
                if (!target) return
                if (primaryExecutionCta.kind === 'pause') {
                  void handlePauseExecution(target)
                  return
                }
                if (primaryExecutionCta.kind === 'resume') {
                  void handleResumeExecution(target)
                  return
                }
                void handleStartExecution(target)
              }}
            >
              {primaryExecutionCta.label}
            </button>
          ) : null}
        </div>
        <div className="agenda-exec__list">
          {executionEventsToday.length === 0 ? (
            <div className="agenda-empty agenda-exec__empty" role="status">
              <Calendar className="agenda-empty__icon" size={26} strokeWidth={1.75} aria-hidden />
              <p className="agenda-empty__title">Sem execuções para hoje</p>
              <p className="agenda-empty__hint muted">
                Compromissos do dia com tarefa vinculada aparecem aqui para timer e fechamento.
              </p>
            </div>
          ) : null}
          {executionEventsToday.map((ev) => {
            const task = ev.taskId ? taskById.get(ev.taskId) : null
            const projRow =
              ev.projectId != null
                ? projects.find((p) => p.id === ev.projectId)
                : task
                  ? projects.find((p) => p.id === task.projectId)
                  : undefined
            const runningSessionId = ev.taskId ? activeSessionByTaskId.get(ev.taskId) : undefined
            const state = runningSessionId
              ? 'running'
              : ev.executionState === 'paused'
                ? 'paused'
                : ev.executionState === 'completed' || ev.status === 'realizado'
                  ? 'done'
                  : 'scheduled'
            const suggestedHours = hoursSuggestionForEvent(ev)
            const suggestedSeconds = Math.round(suggestedHours * 3600)
            const displayTitle = formatAgendaDisplayTitle(ev, projRow, task ?? undefined)
            return (
              <article key={ev.id} className={`agenda-exec-item is-${state}`}>
                <div className="agenda-exec-item__main">
                  <p className="agenda-exec-item__time">
                    {formatInTimeZone(ev.startTime, CAL_TZ, 'HH:mm')} - {formatInTimeZone(ev.endTime, CAL_TZ, 'HH:mm')}
                  </p>
                  <h3 className="agenda-exec-item__title">{displayTitle}</h3>
                  {projRow ? <p className="agenda-exec-item__project muted">{projRow.projectName}</p> : null}
                  <p className="agenda-exec-item__meta">
                    {task ? `${task.code} · ${task.title}` : 'Sem tarefa vinculada'}
                  </p>
                </div>
                <div className="agenda-exec-item__side">
                  <span className={`agenda-exec-chip is-${state}`}>
                    {state === 'running'
                      ? 'Em execução'
                      : state === 'paused'
                        ? 'Pausado'
                        : state === 'done'
                          ? 'Concluído'
                          : 'Agendado'}
                  </span>
                  <span className="agenda-exec-item__timer" aria-live="polite">
                    {formatSecondsClock(suggestedSeconds)}
                  </span>
                </div>
                <div className="agenda-exec-item__actions">
                  {ev.meetingLink ? (
                    <a className="btn btn--ghost" href={ev.meetingLink} target="_blank" rel="noopener noreferrer">
                      Entrar na reunião
                    </a>
                  ) : null}
                  {task ? (
                    state === 'running' ? (
                      <button type="button" className="btn btn--ghost" onClick={() => void handlePauseExecution(ev)}>
                        Pausar
                      </button>
                    ) : state === 'paused' ? (
                      <button type="button" className="btn btn--ghost" onClick={() => void handleResumeExecution(ev)}>
                        Retomar
                      </button>
                    ) : state !== 'done' ? (
                      <button type="button" className="btn btn--ghost" onClick={() => void handleStartExecution(ev)}>
                        Iniciar timer
                      </button>
                    ) : null
                  ) : null}
                  {state !== 'done' ? (
                    <button type="button" className="btn btn--primary" onClick={() => openCloseWizard(ev)}>
                      Fechar execução
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {closingEvent ? (
        <div className="modal-backdrop" role="presentation" onClick={closeSaving ? undefined : () => setClosingEventId(null)}>
          <div
            className="modal modal--agenda-close"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agenda-close-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="agenda-close-title" className="modal__title">
              Fechamento da execução
            </h2>
            <p className="muted">
              Concluir reunião com registro claro do resultado, próximos passos e horas confirmadas.
            </p>
            <div className="stack">
              <label className="field">
                <span>Resultado da reunião</span>
                <textarea
                  rows={2}
                  value={closeOutcomeSummary}
                  onChange={(e) => setCloseOutcomeSummary(e.target.value)}
                  placeholder="Resumo objetivo do que foi decidido."
                />
              </label>
              <label className="field">
                <span>Próximo passo</span>
                <textarea
                  rows={2}
                  value={closeNextStep}
                  onChange={(e) => setCloseNextStep(e.target.value)}
                  placeholder="Ação + responsável + prazo."
                />
              </label>
              {closingEvent.taskId ? (
                <label className="field">
                  <span>Atualização da tarefa vinculada</span>
                  <select value={closeTaskDecision} onChange={(e) => setCloseTaskDecision(e.target.value as CloseTaskDecision)}>
                    <option value="keep">Manter status da tarefa</option>
                    <option value="in_progress">Marcar como em andamento</option>
                    <option value="done">Concluir tarefa</option>
                  </select>
                </label>
              ) : null}
              <label className="field">
                <span>Horas registradas</span>
                <input
                  value={closeLoggedHours}
                  onChange={(e) => setCloseLoggedHours(e.target.value)}
                  placeholder="Ex.: 1.50"
                />
              </label>
            </div>
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" disabled={closeSaving} onClick={() => setClosingEventId(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn--primary" disabled={closeSaving} onClick={() => void handleConfirmCloseWizard()}>
                {closeSaving ? 'Concluindo...' : 'Concluir reunião'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
