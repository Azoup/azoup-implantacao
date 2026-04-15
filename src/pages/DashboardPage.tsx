import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpWideNarrow,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FolderKanban,
  Link2Off,
  Pencil,
  Save,
  ListTodo,
  Video,
  XOctagon,
} from 'lucide-react'
import { db } from '../db/database'
import { formatDatePt, weekdayTitlePt } from '../lib/dates'
import { brDateTimeToIso, normalizeBrDateInput, normalizeTimeInput } from '../lib/dateTimeInput'
import { projectProgressPercent } from '../lib/projectProgress'
import { deriveKanbanColumnFromPlanState } from '../services/kanbanPhaseSync'
import { useReconcileKanbanColumns } from '../hooks/useReconcileKanbanColumns'
import { getActivePlanLabel, getLastCompletedPlanLabel, planPhaseAccentHex } from '../lib/planLabelDisplay'
import { PlanLabelRow } from '../components/PlanLabelChips'
import type { DbEvent, DbTask } from '../db/types'
import { updateEventValidated } from '../services/events'
import { AnalystAvatar } from '../components/AnalystAvatar'
import { useUiFeedback } from '../ui/UiFeedbackContext'
import {
  readProjectSortConfig,
  sortProjects,
  writeProjectSortConfig,
  type ProjectSortConfig,
} from '../lib/projectSort'

const iconSm = { size: 20, strokeWidth: 1.75, absoluteStrokeWidth: true } as const

function isOverdueTask(t: DbTask): boolean {
  if (!t.dueDate) return false
  if (t.status === 'concluida' || t.status === 'cancelado') return false
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return new Date(t.dueDate) < end
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function minutesDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 60000)
}

function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function toTimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function DashboardPage() {
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? []
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? []
  const phases = useLiveQuery(() => db.phases.toArray(), []) ?? []
  const events = useLiveQuery(() => db.events.toArray(), []) ?? []
  const analysts = useLiveQuery(() => db.analysts.toArray(), []) ?? []
  const planModels = useLiveQuery(() => db.planModels.toArray(), []) ?? []

  useReconcileKanbanColumns(projects, phases, tasks)

  const todayTitle = useMemo(() => weekdayTitlePt(new Date()), [])
  const [openEventId, setOpenEventId] = useState<string | null>(null)
  const [editEventId, setEditEventId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editMeetingLink, setEditMeetingLink] = useState('')
  const [editAnalystId, setEditAnalystId] = useState('')
  const [agendaLinkFilter, setAgendaLinkFilter] = useState<'all' | 'with_link'>('all')
  const [projectSort, setProjectSort] = useState<ProjectSortConfig>(() => readProjectSortConfig())
  const [now, setNow] = useState(() => new Date())
  const meetingInputRef = useRef<HTMLInputElement | null>(null)
  const { toast, toastError, requestConfirm } = useUiFeedback()

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!editEventId) return
    const raf = window.requestAnimationFrame(() => meetingInputRef.current?.focus())
    return () => window.cancelAnimationFrame(raf)
  }, [editEventId])

  const kpis = useMemo(() => {
    const colOf = (p: (typeof projects)[0]) => deriveKanbanColumnFromPlanState(p, phases, tasks)
    const active = projects.filter(
      (p) => p.status === 'ativo' && colOf(p) !== 'finalizados' && colOf(p) !== 'cancelados',
    )
    const doneProj = projects.filter((p) => p.status === 'finalizado' || colOf(p) === 'finalizados').length
    const cancelled = projects.filter((p) => p.status === 'cancelado' || colOf(p) === 'cancelados').length
    const taskActive = tasks.filter((t) => t.status === 'em_andamento').length
    const taskDone = tasks.filter((t) => t.status === 'concluida').length
    return {
      projectsOngoing: active.length,
      tasksOngoing: taskActive,
      projectsDone: doneProj,
      projectsCancelled: cancelled,
      tasksDone: taskDone,
      tasksTotal: tasks.length,
    }
  }, [projects, tasks, phases])

  const todayEvents = useMemo(() => {
    const today = new Date()
    return (events as DbEvent[])
      .filter((e) => {
        if (e.status !== 'agendado') return false
        const st = new Date(e.startTime)
        return isSameCalendarDay(st, today)
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }, [events])
  const visibleTodayEvents = useMemo(
    () => (agendaLinkFilter === 'with_link' ? todayEvents.filter((x) => !!x.meetingLink?.trim()) : todayEvents),
    [todayEvents, agendaLinkFilter],
  )

  const alerts = useMemo(() => {
    return tasks.filter(isOverdueTask).slice(0, 12)
  }, [tasks])

  const ongoingList = useMemo(() => {
    const filtered = projects.filter((p) => {
      if (p.status !== 'ativo') return false
      const col = deriveKanbanColumnFromPlanState(p, phases, tasks)
      return col !== 'finalizados' && col !== 'cancelados'
    })
    const ordered = sortProjects(filtered, projectSort)
    return ordered.slice(0, 12)
  }, [projects, phases, tasks, projectSort])

  function planLabel(key: string) {
    const m = planModels.find((x) => x.key === key)
    if (m) return m.name
    if (key === 'pro') return 'Pró'
    return key
  }

  function startEditEvent(ev: DbEvent) {
    const startDt = new Date(ev.startTime)
    const endDt = new Date(ev.endTime)
    setEditEventId(ev.id)
    setEditTitle(ev.title)
    setEditDescription(ev.description ?? '')
    setEditStartDate(toDateInput(startDt))
    setEditStartTime(toTimeInput(startDt))
    setEditEndDate(toDateInput(endDt))
    setEditEndTime(toTimeInput(endDt))
    setEditMeetingLink(ev.meetingLink ?? '')
    setEditAnalystId(ev.analystId ?? '')
    setOpenEventId(ev.id)
  }

  function startEditLinkOnly(ev: DbEvent) {
    startEditEvent(ev)
    const raf = window.requestAnimationFrame(() => meetingInputRef.current?.focus())
    window.setTimeout(() => window.cancelAnimationFrame(raf), 250)
  }

  async function saveEventEdit(e: FormEvent) {
    e.preventDefault()
    if (!editEventId || !editStartDate || !editStartTime || !editEndDate || !editEndTime) return
    const startIso = brDateTimeToIso(editStartDate, editStartTime)
    const endIso = brDateTimeToIso(editEndDate, editEndTime)
    if (!startIso || !endIso) {
      toast('Use o formato BR: data dd/MM/aaaa e hora HH:mm.', 'warn')
      return
    }
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      toast('O fim precisa ser depois do início.', 'warn')
      return
    }
    const current = await db.events.get(editEventId)
    if (!current) return
    try {
      await updateEventValidated(editEventId, {
        title: editTitle.trim() || 'Evento',
        description: editDescription.trim(),
        startTime: startIso,
        endTime: endIso,
        status: current.status,
        projectId: current.projectId,
        taskId: current.taskId,
        analystId: editAnalystId || null,
        meetingLink: editMeetingLink.trim() || null,
      })
      setEditEventId(null)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Não foi possível salvar a edição do evento.')
    }
  }

  async function markEventAsDone(eventId: string) {
    const ok = await requestConfirm({
      title: 'Agenda',
      message: 'Marcar este evento como realizado?',
      confirmLabel: 'Marcar como realizado',
      cancelLabel: 'Cancelar',
    })
    if (!ok) return
    await db.events.update(eventId, { status: 'realizado' })
    if (openEventId === eventId) setOpenEventId(null)
    if (editEventId === eventId) setEditEventId(null)
  }

  function liveBadge(ev: DbEvent): { label: string; tone: 'live' | 'soon' | 'late' | 'today' } {
    const s = new Date(ev.startTime)
    const e = new Date(ev.endTime)
    if (now >= s && now <= e) return { label: 'Em andamento', tone: 'live' }
    if (now < s) {
      const mins = minutesDiff(s, now)
      if (mins <= 60) return { label: `Começa em ${Math.max(1, mins)} min`, tone: 'soon' }
      return { label: `Hoje às ${formatDatePt(ev.startTime, 'HH:mm')}`, tone: 'today' }
    }
    return { label: 'Encerrado', tone: 'late' }
  }

  return (
    <div className="page page--dashboard">
      <header className="page__header dashboard__header">
        <div>
          <h1 className="page__title">Dashboard</h1>
          <p className="page__subtitle dashboard__date">{todayTitle}</p>
        </div>
      </header>

      <section className="dashboard-kpi-row" aria-label="Resumo">
        <div className="dashboard-kpi dashboard-kpi--folder">
          <div className="dashboard-kpi__icon" aria-hidden>
            <FolderKanban {...iconSm} />
          </div>
          <div className="dashboard-kpi__body">
            <div className="dashboard-kpi__value">{kpis.projectsOngoing}</div>
            <div className="dashboard-kpi__label">Projetos em andamento</div>
          </div>
        </div>
        <div className="dashboard-kpi dashboard-kpi--clock">
          <div className="dashboard-kpi__icon" aria-hidden>
            <Clock3 {...iconSm} />
          </div>
          <div className="dashboard-kpi__body">
            <div className="dashboard-kpi__value">{kpis.tasksOngoing}</div>
            <div className="dashboard-kpi__label">Tarefas em andamento</div>
          </div>
        </div>
        <div className="dashboard-kpi dashboard-kpi--done">
          <div className="dashboard-kpi__icon" aria-hidden>
            <CheckCircle2 {...iconSm} />
          </div>
          <div className="dashboard-kpi__body">
            <div className="dashboard-kpi__value">{kpis.projectsDone}</div>
            <div className="dashboard-kpi__label">Projetos concluídos</div>
          </div>
        </div>
        <div className="dashboard-kpi dashboard-kpi--cancel">
          <div className="dashboard-kpi__icon" aria-hidden>
            <XOctagon {...iconSm} />
          </div>
          <div className="dashboard-kpi__body">
            <div className="dashboard-kpi__value">{kpis.projectsCancelled}</div>
            <div className="dashboard-kpi__label">Projetos cancelados</div>
          </div>
        </div>
        <div className="dashboard-kpi dashboard-kpi--tasks">
          <div className="dashboard-kpi__icon" aria-hidden>
            <ListTodo {...iconSm} />
          </div>
          <div className="dashboard-kpi__body">
            <div className="dashboard-kpi__value">
              {kpis.tasksDone}/{kpis.tasksTotal}
            </div>
            <div className="dashboard-kpi__label">Tarefas concluídas</div>
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel dashboard-panel dashboard-panel--projects">
          <h2 className="dashboard-panel__title">
            <span className="dashboard-panel__title-icon" aria-hidden>
              <FolderKanban size={22} strokeWidth={1.75} absoluteStrokeWidth />
            </span>
            Projetos em andamento
          </h2>
          <div className="project-sortbar" role="group" aria-label="Ordenação de projetos">
            <button
              type="button"
              className={'project-sortbar__btn' + (projectSort.key === 'name' ? ' is-active' : '')}
              onClick={() => {
                const next: ProjectSortConfig = { ...projectSort, key: 'name' }
                setProjectSort(next)
                writeProjectSortConfig(next)
              }}
              title="Ordenar por nome"
            >
              <ArrowDownAZ size={15} strokeWidth={2} />
              Nome
            </button>
            <button
              type="button"
              className={'project-sortbar__btn' + (projectSort.key === 'startDate' ? ' is-active' : '')}
              onClick={() => {
                const next: ProjectSortConfig = { ...projectSort, key: 'startDate' }
                setProjectSort(next)
                writeProjectSortConfig(next)
              }}
              title="Ordenar por início do projeto"
            >
              <CalendarDays size={15} strokeWidth={2} />
              Início
            </button>
            <button
              type="button"
              className="project-sortbar__btn project-sortbar__btn--dir"
              onClick={() => {
                const next: ProjectSortConfig = {
                  ...projectSort,
                  direction: projectSort.direction === 'asc' ? 'desc' : 'asc',
                }
                setProjectSort(next)
                writeProjectSortConfig(next)
              }}
              title={projectSort.direction === 'asc' ? 'Direção: ascendente' : 'Direção: descendente'}
            >
              <ArrowUpWideNarrow size={15} strokeWidth={2} />
              {projectSort.direction === 'asc' ? 'A-Z' : 'Z-A'}
            </button>
          </div>
          <div className="dashboard-proj-list">
            {ongoingList.length === 0 ? (
              <p className="dashboard-empty">Nenhum projeto ativo. Crie um em Projetos.</p>
            ) : (
              ongoingList.map((p) => {
                const pct = projectProgressPercent(tasks, p.id)
                const analyst = analysts.find((a) => a.id === p.analystId)
                const activePhase = phases.find((ph) => ph.projectId === p.id && ph.status === 'ativa')
                const phaseLabel = activePhase?.name ?? '—'
                const phaseColor = activePhase ? planPhaseAccentHex(activePhase.orderIndex) : undefined
                const lastLabel = getLastCompletedPlanLabel(tasks, p.id)
                const activeLabel = getActivePlanLabel(tasks, p.id, phases)
                return (
                  <article key={p.id} className="dashboard-proj-card">
                    <div className="dashboard-proj-card__head">
                      <Link to={`/projetos/${p.id}`} className="dashboard-proj-card__name dashboard-proj-card__name--link">
                        {p.projectName}
                      </Link>
                      <span className="dashboard-proj-card__plan">{planLabel(p.planType)}</span>
                    </div>
                    <PlanLabelRow last={lastLabel} active={activeLabel} variant="dashboard" />
                    <div className="dashboard-proj-card__meta">
                      <span className="dashboard-proj-card__hours">
                        {p.hoursUsed}h / {p.hoursContracted}h
                      </span>
                      <span className="dashboard-proj-card__dot" aria-hidden>
                        ·
                      </span>
                      <span
                        className="dashboard-proj-card__phase"
                        style={phaseColor ? { color: phaseColor } : undefined}
                      >
                        {phaseLabel}
                      </span>
                      {analyst ? (
                        <AnalystAvatar
                          className="dashboard-proj-card__analyst"
                          name={analyst.name}
                          color={analyst.color}
                          avatarUrl={analyst.avatarUrl}
                          size="sm"
                        />
                      ) : null}
                    </div>
                    <div className="dashboard-proj-card__progress-row">
                      <div className="dashboard-proj-card__track">
                        <div className="dashboard-proj-card__fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="dashboard-proj-card__pct">{pct}%</span>
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </section>

        <div className="dashboard-col">
          <section className="panel dashboard-panel">
            <h2 className="dashboard-panel__title">
              <span className="dashboard-panel__title-icon" aria-hidden>
                <CalendarDays size={22} strokeWidth={1.75} absoluteStrokeWidth />
              </span>
              Agenda de hoje
            </h2>
            <div className="dashboard-agenda-filter" role="group" aria-label="Filtro da agenda de hoje">
              <button
                type="button"
                className={'dashboard-agenda-filter__btn' + (agendaLinkFilter === 'all' ? ' is-active' : '')}
                onClick={() => setAgendaLinkFilter('all')}
              >
                Todos ({todayEvents.length})
              </button>
              <button
                type="button"
                className={'dashboard-agenda-filter__btn' + (agendaLinkFilter === 'with_link' ? ' is-active' : '')}
                onClick={() => setAgendaLinkFilter('with_link')}
              >
                Com link ({todayEvents.filter((x) => !!x.meetingLink?.trim()).length})
              </button>
            </div>
            <div className="dashboard-side-stack">
              {visibleTodayEvents.length === 0 ? (
                <p className="dashboard-empty dashboard-empty--soft">Sem eventos hoje</p>
              ) : (
                visibleTodayEvents.map((ev) => {
                  const expanded = openEventId === ev.id
                  const editing = editEventId === ev.id
                  const task = ev.taskId ? tasks.find((t) => t.id === ev.taskId) : null
                  const project = ev.projectId
                    ? projects.find((p) => p.id === ev.projectId)
                    : task
                      ? projects.find((p) => p.id === task.projectId)
                      : null
                  const analyst = ev.analystId ? analysts.find((a) => a.id === ev.analystId) : null
                  const badge = liveBadge(ev)
                  const meetingLink = ev.meetingLink?.trim() ?? ''
                  const hasMeeting = meetingLink.length > 0
                  return (
                    <article key={ev.id} className={'dashboard-event' + (expanded ? ' is-open' : '')}>
                      <button
                        type="button"
                        className="dashboard-event__head"
                        onClick={() => setOpenEventId((id) => (id === ev.id ? null : ev.id))}
                      >
                        <span className="dashboard-event__time">
                          {formatDatePt(ev.startTime, 'HH:mm')} — {formatDatePt(ev.endTime, 'HH:mm')}
                        </span>
                        <span className={'dashboard-event__live-badge is-' + badge.tone}>{badge.label}</span>
                        <span className="dashboard-event__title">{ev.title}</span>
                      </button>

                      <div className="dashboard-event__actions">
                        {hasMeeting ? (
                          <a
                            className="btn btn--sm btn--primary"
                            href={meetingLink}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Video size={14} strokeWidth={2} />
                            Entrar
                          </a>
                        ) : (
                          <button
                            type="button"
                            className="dashboard-event__no-link"
                            title="Evento sem link de reunião. Clique para adicionar."
                            onClick={() => startEditLinkOnly(ev)}
                          >
                            <Link2Off size={14} strokeWidth={2} />
                            Sem link
                          </button>
                        )}
                        <button type="button" className="btn btn--sm btn--ghost" onClick={() => startEditEvent(ev)}>
                          <Pencil size={14} strokeWidth={2} />
                          Editar
                        </button>
                        <button type="button" className="btn btn--sm btn--ghost" onClick={() => markEventAsDone(ev.id)}>
                          <CheckCircle2 size={14} strokeWidth={2} />
                          Concluir
                        </button>
                        <Link className="btn btn--sm btn--ghost" to="/agenda">
                          <ExternalLink size={14} strokeWidth={2} />
                          Agenda
                        </Link>
                      </div>

                      {expanded ? (
                        <div className="dashboard-event__details">
                          {!editing ? (
                            <>
                              <p className="dashboard-event__line">
                                <strong>Projeto:</strong> {project?.projectName ?? '—'}
                              </p>
                              <p className="dashboard-event__line">
                                <strong>Tarefa:</strong> {task ? `${task.code} ${task.title}` : '—'}
                              </p>
                              <p className="dashboard-event__line">
                                <strong>Analista:</strong> {analyst?.name ?? 'Sem responsável'}
                              </p>
                              <p className="dashboard-event__line">
                                <strong>Descrição:</strong> {ev.description?.trim() || 'Sem descrição'}
                              </p>
                              {ev.meetingLink ? (
                                <a
                                  className="dashboard-event__link"
                                  href={meetingLink}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {meetingLink}
                                </a>
                              ) : null}
                            </>
                          ) : (
                            <form className="dashboard-event__edit-form" onSubmit={saveEventEdit}>
                              <label className="field">
                                <span>Título</span>
                                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
                              </label>
                              <label className="field">
                                <span>Descrição</span>
                                <textarea
                                  rows={2}
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                />
                              </label>
                              <div className="dashboard-event__edit-grid">
                                <label className="field">
                                  <span>Data início</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="dd/MM/aaaa"
                                    value={editStartDate}
                                    onChange={(e) => setEditStartDate(normalizeBrDateInput(e.target.value))}
                                    required
                                  />
                                </label>
                                <label className="field">
                                  <span>Hora início</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="HH:mm"
                                    value={editStartTime}
                                    onChange={(e) => setEditStartTime(normalizeTimeInput(e.target.value))}
                                    required
                                  />
                                </label>
                                <label className="field">
                                  <span>Data fim</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="dd/MM/aaaa"
                                    value={editEndDate}
                                    onChange={(e) => setEditEndDate(normalizeBrDateInput(e.target.value))}
                                    required
                                  />
                                </label>
                                <label className="field">
                                  <span>Hora fim</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="HH:mm"
                                    value={editEndTime}
                                    onChange={(e) => setEditEndTime(normalizeTimeInput(e.target.value))}
                                    required
                                  />
                                </label>
                              </div>
                              <label className="field">
                                <span>Analista</span>
                                <select value={editAnalystId} onChange={(e) => setEditAnalystId(e.target.value)}>
                                  <option value="">Sem responsável</option>
                                  {analysts
                                    .filter((a) => a.active)
                                    .map((a) => (
                                      <option key={a.id} value={a.id}>
                                        {a.name}
                                      </option>
                                    ))}
                                </select>
                              </label>
                              <label className="field">
                                <span>Link da reunião</span>
                                <input
                                  ref={meetingInputRef}
                                  type="url"
                                  value={editMeetingLink}
                                  onChange={(e) => setEditMeetingLink(e.target.value)}
                                  placeholder="https://meet.google.com/..."
                                />
                              </label>
                              <div className="dashboard-event__edit-actions">
                                <button type="button" className="btn btn--sm btn--ghost" onClick={() => setEditEventId(null)}>
                                  Cancelar
                                </button>
                                <button type="submit" className="btn btn--sm btn--primary">
                                  <Save size={14} strokeWidth={2} />
                                  Salvar
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      ) : null}
                    </article>
                  )
                })
              )}
            </div>
          </section>

          <section className="panel dashboard-panel dashboard-panel--alerts">
            <h2 className="dashboard-panel__title">
              <span className="dashboard-panel__title-icon dashboard-panel__title-icon--warn" aria-hidden>
                <AlertTriangle size={22} strokeWidth={1.75} absoluteStrokeWidth />
              </span>
              Alertas
            </h2>
            <div className="dashboard-side-stack">
              {alerts.length === 0 ? (
                <p className="dashboard-empty dashboard-empty--soft">Sem tarefas atrasadas com prazo definido.</p>
              ) : (
                alerts.map((t) => {
                  const proj = projects.find((pr) => pr.id === t.projectId)
                  return (
                    <div key={t.id} className="dashboard-alert">
                      <AlertTriangle className="dashboard-alert__icon" size={18} strokeWidth={2} aria-hidden />
                      <div className="dashboard-alert__text">
                        Tarefa &quot;{t.title}&quot; atrasada (prazo: {t.dueDate ? formatDatePt(t.dueDate) : '—'}) —{' '}
                        <strong>{proj?.projectName ?? '—'}</strong>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
