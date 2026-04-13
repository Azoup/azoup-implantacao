import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addDays, addMonths, addWeeks, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarPlus, ChevronLeft, ChevronRight, Clock, Video } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { toZonedTime } from 'date-fns-tz'
import { useLocation, useNavigate } from 'react-router-dom'
import { AgendaMiniMonth } from '../components/AgendaMiniMonth'
import { useAuth } from '../auth/AuthContext'
import { hasScope } from '../auth/permissions'
import { db } from '../db/database'
import { eventColorsFromAnalyst } from '../lib/analystColors'
import { buildGoogleCalendarTemplateUrl } from '../lib/googleCalendarUrl'
import type { DbEvent } from '../db/types'
import { createEventValidated } from '../services/events'
import {
  assignLanes,
  CAL_TZ,
  dayKey,
  dayKeyFromIso,
  formatDayHeader,
  formatSingleDayLong,
  formatWeekRangeLabel,
  GRID_END_HOUR,
  GRID_START_HOUR,
  hourSlots,
  layoutInGrid,
  minutesFromMidnightInTz,
  mondayOfWeekContaining,
  type Segment,
  weekDaysMonFri,
  zonedNow,
} from '../lib/calendarGrid'

type ViewMode = 'week' | 'day'

function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function toTimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function normalizeBrDateInput(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function normalizeTimeInput(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

function brDateTimeToIso(dateBr: string, time: string): string | null {
  const m = dateBr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const tm = time.match(/^(\d{2}):(\d{2})$/)
  if (!tm) return null
  const dd = Number(m[1])
  const mm = Number(m[2])
  const yyyy = Number(m[3])
  const hh = Number(tm[1])
  const mi = Number(tm[2])
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || hh > 23 || mi > 59) return null
  const dt = new Date(yyyy, mm - 1, dd, hh, mi, 0, 0)
  if (Number.isNaN(dt.getTime())) return null
  if (dt.getDate() !== dd || dt.getMonth() !== mm - 1 || dt.getFullYear() !== yyyy) return null
  return dt.toISOString()
}

function clipSegment(ev: DbEvent): Segment | null {
  const gridStart = GRID_START_HOUR * 60
  const gridEnd = GRID_END_HOUR * 60
  let s = minutesFromMidnightInTz(ev.startTime)
  let e = minutesFromMidnightInTz(ev.endTime)
  if (e <= s) e = s + 30
  s = Math.max(gridStart, s)
  e = Math.min(gridEnd, e)
  if (e <= s) return null
  return { id: ev.id, startMin: s, endMin: e }
}

type AgendaLocationState = {
  prefillTaskId?: string
  prefillProjectId?: string
}

export function AgendaPage() {
  const { user } = useAuth()
  const canEditAgenda = hasScope(user, 'agenda.edit')
  const location = useLocation()
  const navigate = useNavigate()
  const prefillConsumedKey = useRef<string | null>(null)

  const events = useLiveQuery(() => db.events.orderBy('startTime').toArray(), []) ?? []
  const analysts = useLiveQuery(() => db.analysts.toArray(), []) ?? []
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? []
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? []

  const [weekMonday, setWeekMonday] = useState(() => mondayOfWeekContaining(new Date()))
  const [activeDay, setActiveDay] = useState(() => zonedNow())
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(zonedNow()))
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [filter, setFilter] = useState<string>('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [analystId, setAnalystId] = useState<string>('')
  const [meetingLink, setMeetingLink] = useState('')
  const [modalProjectId, setModalProjectId] = useState<string | null>(null)
  const [modalTaskId, setModalTaskId] = useState<string | null>(null)

  useEffect(() => {
    const st = location.state as AgendaLocationState | null
    if (!st?.prefillTaskId) return
    const token = `${location.key}:${st.prefillTaskId}`
    if (prefillConsumedKey.current === token) return
    prefillConsumedKey.current = token
    const tid = st.prefillTaskId
    const pid = st.prefillProjectId
    navigate(location.pathname, { replace: true, state: {} })
    if (!canEditAgenda) return
    void (async () => {
      const task = await db.tasks.get(tid)
      const project = await db.projects.get(pid ?? task?.projectId ?? '')
      const now = new Date()
      const end = new Date(now.getTime() + 60 * 60 * 1000)
      if (task) setTitle(`${task.code} ${task.title}`.trim())
      const aid = task?.assignedTo ?? project?.analystId ?? ''
      setAnalystId(aid)
      setStartDate(toDateInput(now))
      setStartTime(toTimeInput(now))
      setEndDate(toDateInput(end))
      setEndTime(toTimeInput(end))
      setModalProjectId(project?.id ?? task?.projectId ?? null)
      setModalTaskId(task?.id ?? tid)
      setModalOpen(true)
    })()
  }, [location.state, location.key, location.pathname, navigate, canEditAgenda])

  const todayKey = dayKey(zonedNow())

  const displayDays = useMemo(() => {
    if (viewMode === 'week') return weekDaysMonFri(weekMonday)
    return [activeDay]
  }, [viewMode, weekMonday, activeDay])

  const subtitle = useMemo(() => {
    if (viewMode === 'week') return formatWeekRangeLabel(weekMonday)
    return formatSingleDayLong(activeDay)
  }, [viewMode, weekMonday, activeDay])

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events
    if (filter === 'unassigned') return events.filter((e) => !e.analystId)
    return events.filter((e) => e.analystId === filter)
  }, [events, filter])

  const dayKeysVisible = useMemo(() => new Set(displayDays.map((d) => dayKey(d))), [displayDays])

  const daysWithEvents = useMemo(() => {
    const s = new Set<string>()
    for (const ev of filteredEvents) {
      s.add(dayKeyFromIso(ev.startTime))
    }
    return s
  }, [filteredEvents])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DbEvent[]>()
    for (const k of dayKeysVisible) map.set(k, [])
    for (const ev of filteredEvents) {
      const k = dayKeyFromIso(ev.startTime)
      if (map.has(k)) map.get(k)!.push(ev)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime))
    }
    return map
  }, [filteredEvents, dayKeysVisible])

  const laneMaps = useMemo(() => {
    const out = new Map<string, Map<string, { lane: number; laneCount: number }>>()
    for (const k of dayKeysVisible) {
      const list = eventsByDay.get(k) ?? []
      const segments: Segment[] = []
      for (const ev of list) {
        const seg = clipSegment(ev)
        if (seg) segments.push(seg)
      }
      out.set(k, assignLanes(segments))
    }
    return out
  }, [eventsByDay, dayKeysVisible])

  const unscheduled = useMemo(() => {
    const linked = new Set(events.map((e) => e.taskId).filter(Boolean) as string[])
    return tasks.filter((t) => !linked.has(t.id) && t.status !== 'concluida' && t.status !== 'cancelado').slice(0, 50)
  }, [tasks, events])

  const nowTopPct = useMemo(() => {
    const n = new Date()
    return layoutInGrid(n.toISOString(), new Date(n.getTime() + 60_000).toISOString()).topPct
  }, [weekMonday, activeDay, viewMode])

  const goToday = useCallback(() => {
    const now = new Date()
    const mon = mondayOfWeekContaining(now)
    setWeekMonday(mon)
    setActiveDay(zonedNow())
    setMonthCursor(startOfMonth(toZonedTime(now, CAL_TZ)))
  }, [])

  const goPrev = useCallback(() => {
    if (viewMode === 'week') {
      setWeekMonday((w) => addWeeks(w, -1))
    } else {
      setActiveDay((d) => {
        const n = addDays(d, -1)
        setWeekMonday(mondayOfWeekContaining(n))
        return n
      })
    }
  }, [viewMode])

  const goNext = useCallback(() => {
    if (viewMode === 'week') {
      setWeekMonday((w) => addWeeks(w, 1))
    } else {
      setActiveDay((d) => {
        const n = addDays(d, 1)
        setWeekMonday(mondayOfWeekContaining(n))
        return n
      })
    }
  }, [viewMode])

  const switchToDay = useCallback(() => {
    setViewMode('day')
    setActiveDay(zonedNow())
    setWeekMonday(mondayOfWeekContaining(new Date()))
  }, [])

  const switchToWeek = useCallback(() => {
    setViewMode('week')
    setWeekMonday(mondayOfWeekContaining(activeDay))
  }, [activeDay])

  const onMiniSelectDay = useCallback((d: Date) => {
    const z = toZonedTime(d, CAL_TZ)
    setActiveDay(z)
    setWeekMonday(mondayOfWeekContaining(z))
    setMonthCursor(startOfMonth(z))
    setViewMode('day')
  }, [])

  async function addEvent(e: FormEvent) {
    e.preventDefault()
    if (!canEditAgenda) return
    if (!startDate || !startTime || !endDate || !endTime) return
    const startIso = brDateTimeToIso(startDate, startTime)
    const endIso = brDateTimeToIso(endDate, endTime)
    if (!startIso || !endIso) {
      alert('Use o formato BR: data dd/MM/aaaa e hora HH:mm.')
      return
    }
    try {
      await createEventValidated({
        title: title.trim() || 'Evento',
        description: description.trim(),
        startTime: startIso,
        endTime: endIso,
        status: 'agendado',
        projectId: modalProjectId,
        taskId: modalTaskId,
        analystId: analystId || null,
        meetingLink: meetingLink.trim() || null,
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível salvar o evento.')
      return
    }
    setTitle('')
    setDescription('')
    setStartDate('')
    setStartTime('')
    setEndDate('')
    setEndTime('')
    setAnalystId('')
    setMeetingLink('')
    setModalProjectId(null)
    setModalTaskId(null)
    setModalOpen(false)
  }

  const slots = hourSlots()

  const headerTitle =
    viewMode === 'week'
      ? formatInTimeZone(weekMonday, CAL_TZ, 'MMMM yyyy', { locale: ptBR })
      : formatInTimeZone(activeDay, CAL_TZ, 'MMMM yyyy', { locale: ptBR })

  return (
    <div className="page page--wide agenda-page agenda-page--gc">
      <div className="agenda-gc-layout">
        <aside className="agenda-gc-sidebar panel">
          <AgendaMiniMonth
            anchor={monthCursor}
            todayKeyStr={todayKey}
            daysWithEvents={daysWithEvents}
            onSelectDay={onMiniSelectDay}
            onPrevMonth={() => setMonthCursor((m) => subMonths(m, 1))}
            onNextMonth={() => setMonthCursor((m) => addMonths(m, 1))}
          />
          <div className="agenda-gc-legend">
            <h3 className="agenda-gc-legend__title">Legenda</h3>
            <p className="agenda-gc-legend__hint muted">A cor do evento segue o analista responsável.</p>
            <button
              type="button"
              className={'agenda-gc-legend__row' + (filter === 'all' ? ' is-active' : '')}
              onClick={() => setFilter('all')}
            >
              <span className="agenda-gc-legend__dot agenda-gc-legend__dot--all" />
              Todos os eventos
            </button>
            {analysts.filter((a) => a.active).map((a) => (
              <button
                key={a.id}
                type="button"
                className={'agenda-gc-legend__row' + (filter === a.id ? ' is-active' : '')}
                onClick={() => setFilter(a.id)}
              >
                <span className="agenda-gc-legend__dot" style={{ background: a.color }} />
                {a.name}
              </button>
            ))}
            <button
              type="button"
              className={'agenda-gc-legend__row' + (filter === 'unassigned' ? ' is-active' : '')}
              onClick={() => setFilter('unassigned')}
            >
              <span className="agenda-gc-legend__dot agenda-gc-legend__dot--unassigned" />
              Sem responsável
            </button>
          </div>
          <div className="agenda-google-card">
            <h3 className="agenda-google-card__title">Google Agenda</h3>
            <p className="agenda-google-card__text muted">
              Use <strong>Abrir no Google</strong> em cada evento para criar o mesmo compromisso na sua conta Google
              (abre em nova aba; não exige login no VynTask).
            </p>
            <p className="agenda-google-card__text muted">
              <strong>Sincronização automática</strong> (dois sentidos) exige projeto no Google Cloud, OAuth e um
              servidor seguro para guardar tokens — possível em uma fase futura com backend.
            </p>
          </div>
        </aside>

        <div className="agenda-gc-main">
          <header className="agenda-gc-bar">
            <div className="agenda-gc-bar__left">
              <h1 className="agenda-gc-bar__title">Agenda</h1>
              <p className="agenda-gc-bar__sub">{subtitle}</p>
            </div>
            <div className="agenda-gc-bar__center">
              <button type="button" className="agenda-gc-today" onClick={goToday}>
                Hoje
              </button>
              <div className="agenda-gc-arrows">
                <button type="button" className="btn btn--icon agenda-gc-icon" aria-label="Anterior" onClick={goPrev}>
                  <ChevronLeft size={22} strokeWidth={1.75} />
                </button>
                <button type="button" className="btn btn--icon agenda-gc-icon" aria-label="Próximo" onClick={goNext}>
                  <ChevronRight size={22} strokeWidth={1.75} />
                </button>
              </div>
              <span className="agenda-gc-bar__month" aria-hidden>
                {headerTitle}
              </span>
            </div>
            <div className="agenda-gc-bar__right">
              <div className="agenda-seg agenda-seg--gc">
                <button
                  type="button"
                  className={'agenda-seg__btn' + (viewMode === 'day' ? ' is-active' : '')}
                  onClick={switchToDay}
                >
                  Dia
                </button>
                <button
                  type="button"
                  className={'agenda-seg__btn' + (viewMode === 'week' ? ' is-active' : '')}
                  onClick={switchToWeek}
                >
                  Semana
                </button>
              </div>
              <button
                type="button"
                className="btn btn--primary agenda-gc-create"
                disabled={!canEditAgenda}
                onClick={() => {
                  if (!canEditAgenda) return
                  const now = new Date()
                  const end = new Date(now.getTime() + 60 * 60 * 1000)
                  setStartDate(toDateInput(now))
                  setStartTime(toTimeInput(now))
                  setEndDate(toDateInput(end))
                  setEndTime(toTimeInput(end))
                  setModalProjectId(null)
                  setModalTaskId(null)
                  setModalOpen(true)
                }}
              >
                + Criar
              </button>
            </div>
          </header>

          <section className="cal-shell cal-shell--gc">
            <div className="cal-scroll">
              <div className="cal-head">
                <div className="cal-head__spacer" aria-hidden />
                {displayDays.map((d) => {
                  const dk = dayKey(d)
                  const { weekday, day } = formatDayHeader(d)
                  const isToday = dk === todayKey
                  return (
                    <div key={dk} className={'cal-head__col' + (isToday ? ' is-today' : '')}>
                      <span className="cal-head__wd">{weekday}</span>
                      <span className={'cal-head__num' + (isToday ? ' is-ring' : '')}>{day}</span>
                    </div>
                  )
                })}
              </div>
              <div className="cal-body" style={{ height: `${slots.length * 52}px` }}>
                <div className="cal-times">
                  {slots.map((h) => (
                    <div key={h} className="cal-times__cell">
                      {String(h).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>
                {displayDays.map((d) => {
                  const dk = dayKey(d)
                  const list = eventsByDay.get(dk) ?? []
                  const lanes = laneMaps.get(dk) ?? new Map()
                  const showNow = dk === todayKey
                  return (
                    <div key={dk} className={'cal-day' + (showNow ? ' is-today-col' : '')}>
                      <div className="cal-day__grid" aria-hidden>
                        {slots.map((h) => (
                          <div key={h} className="cal-day__hour" />
                        ))}
                      </div>
                      {showNow ? (
                        <div className="cal-now-line" style={{ top: `${nowTopPct}%` }} aria-hidden />
                      ) : null}
                      <div className="cal-day__events">
                        {list.map((ev) => {
                          const an = analysts.find((a) => a.id === ev.analystId)
                          const { topPct, heightPct } = layoutInGrid(ev.startTime, ev.endTime)
                          const lane = lanes.get(ev.id)
                          const lc = lane?.laneCount ?? 1
                          const ln = lane?.lane ?? 0
                          const widthPct = 100 / lc
                          const leftPct = ln * widthPct
                          const cancelled = ev.status === 'cancelado'
                          const task = ev.taskId ? tasks.find((t) => t.id === ev.taskId) : undefined
                          const proj = ev.projectId
                            ? projects.find((p) => p.id === ev.projectId)
                            : task
                              ? projects.find((p) => p.id === task.projectId)
                              : undefined
                          const sub = proj?.projectName
                          const { accent, bg } = eventColorsFromAnalyst(an?.color, cancelled)
                          const gCalUrl = buildGoogleCalendarTemplateUrl({
                            title: ev.title,
                            startIso: ev.startTime,
                            endIso: ev.endTime,
                            details: [ev.description, sub ? `Projeto: ${sub}` : '', an ? `Analista: ${an.name}` : '']
                              .filter(Boolean)
                              .join('\n'),
                            location: ev.meetingLink ?? undefined,
                          })
                          return (
                            <div
                              key={ev.id}
                              className={'cal-event cal-event--gc' + (cancelled ? ' is-cancelled' : '')}
                              style={{
                                top: `${topPct}%`,
                                height: `${heightPct}%`,
                                left: `${leftPct + 0.8}%`,
                                width: `${widthPct - 1.6}%`,
                                ['--evt-accent' as string]: accent,
                                ['--evt-bg' as string]: bg,
                              }}
                              title={ev.title}
                            >
                              <span className="cal-event__accent-bar" aria-hidden />
                              <div className="cal-event__body">
                                <span className="cal-event__title">{ev.title}</span>
                                <span className="cal-event__time">
                                  {formatInTimeZone(ev.startTime, CAL_TZ, 'HH:mm')} —{' '}
                                  {formatInTimeZone(ev.endTime, CAL_TZ, 'HH:mm')}
                                </span>
                                {sub ? <span className="cal-event__sub">{sub}</span> : null}
                                {cancelled ? <span className="cal-event__badge">Cancelado</span> : null}
                              </div>
                              <div className="cal-event__foot">
                                {ev.meetingLink ? (
                                  <a
                                    className="cal-event__icon-btn"
                                    href={ev.meetingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Link da reunião"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Video size={14} strokeWidth={2} />
                                  </a>
                                ) : null}
                                <a
                                  className="cal-event__icon-btn cal-event__icon-btn--google"
                                  href={gCalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Adicionar ao Google Agenda"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <CalendarPlus size={14} strokeWidth={2} />
                                </a>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </div>

        <aside className="panel agenda-side agenda-side--gc">
          <h2 className="panel__title">Tarefas não agendadas</h2>
          <div className="uns-list">
            {unscheduled.map((t) => {
              const p = projects.find((x) => x.id === t.projectId)
              return (
                <div key={t.id} className="uns-card uns-card--gc">
                  <span className="uns-card__accent" aria-hidden />
                  <div className="uns-card__inner">
                    <div className="uns-card__title">
                      {t.code} {t.title}
                    </div>
                    <div className="uns-card__meta">
                      <Clock size={14} strokeWidth={1.75} aria-hidden />
                      <span>{t.estimatedHours}h</span>
                    </div>
                    <div className="uns-card__proj">{p?.projectName ?? '—'}</div>
                  </div>
                </div>
              )
            })}
            {unscheduled.length === 0 ? <p className="muted">Tudo agendado ou concluído.</p> : null}
          </div>
        </aside>
      </div>

      {modalOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => {
            setModalOpen(false)
            setModalProjectId(null)
            setModalTaskId(null)
          }}
        >
          <div className="modal" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Novo evento</h2>
            <p className="muted">Fuso: {CAL_TZ}</p>
            {modalTaskId ? (
              <p className="agenda-modal__link-hint muted">
                Vinculado à tarefa do projeto (mesmo analista da tarefa quando aplicável).
              </p>
            ) : null}
            <form className="stack" onSubmit={addEvent}>
              <label className="field">
                <span>Título</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
              </label>
              <label className="field">
                <span>Descrição (opcional)</span>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notas visíveis no Google Agenda ao exportar…"
                />
              </label>
              <label className="field">
                <span>Data início</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/MM/aaaa"
                  value={startDate}
                  onChange={(e) => setStartDate(normalizeBrDateInput(e.target.value))}
                  required
                />
              </label>
              <label className="field">
                <span>Hora início</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="HH:mm"
                  value={startTime}
                  onChange={(e) => setStartTime(normalizeTimeInput(e.target.value))}
                  required
                />
              </label>
              <label className="field">
                <span>Data fim</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/MM/aaaa"
                  value={endDate}
                  onChange={(e) => setEndDate(normalizeBrDateInput(e.target.value))}
                  required
                />
              </label>
              <label className="field">
                <span>Hora fim</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="HH:mm"
                  value={endTime}
                  onChange={(e) => setEndTime(normalizeTimeInput(e.target.value))}
                  required
                />
              </label>
              <label className="field">
                <span>Analista (define a cor na grade)</span>
                <select value={analystId} onChange={(e) => setAnalystId(e.target.value)}>
                  <option value="">— Sem responsável (cor neutra)</option>
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
                <span>Link da reunião (Meet, Zoom…)</span>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://…"
                />
              </label>
              <div className="modal__actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    setModalOpen(false)
                    setModalProjectId(null)
                    setModalTaskId(null)
                  }}
                >
                  Fechar
                </button>
                <button type="submit" className="btn btn--primary" disabled={!canEditAgenda}>
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
