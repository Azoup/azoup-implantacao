import { useCallback, useEffect, useMemo, useState } from 'react'
import { addDays, addMonths, addWeeks, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { toZonedTime } from 'date-fns-tz'
import { AgendaSidebar } from '../components/agenda/AgendaSidebar'
import { AgendaMonthView } from '../components/agenda/AgendaMonthView'
import { applyAnalystFilter, primaryAnalystIdForGoogleSync } from '../lib/agendaAnalystFilter'
import { buildMonthWeekBundles } from '../lib/calendarMonthGrid'
import { useAuth } from '../auth/AuthContext'
import { hasScope } from '../auth/permissions'
import {
  buildAllDayStripPlacements,
  dedupeAgendaEventsByGoogleId,
  isAllDayOrMultiDayBlock,
} from '../lib/agendaEventDisplay'
import { AgendaCalEventBlock } from '../components/agenda/AgendaCalEventBlock'
import type { DbEvent } from '../db/types'
import {
  isGoogleCalendarSyncEnabled,
  pullGoogleCalendarEvents,
} from '../services/calendarPushQueue'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { useUiFeedback } from '../ui/UiFeedbackContext'
import {
  assignLanes,
  CAL_TZ,
  dayKey,
  dayKeyFromIso,
  formatDayHeader,
  formatSingleDayLong,
  formatMonthRangeLabel,
  formatWeekRangeLabel,
  GRID_END_HOUR,
  GRID_START_HOUR,
  hourSlots,
  layoutInGrid,
  minutesFromMidnightInTz,
  mondayOfWeekContaining,
  type LaneAssignment,
  type Segment,
  weekDaysMonFri,
  zonedNow,
} from '../lib/calendarGrid'
import { useAgendaOutlet } from './agendaOutletContext'

type ViewMode = 'month' | 'week' | 'day'

const ALLDAY_STRIP_BAR_H = 24
const ALLDAY_STRIP_GAP = 4
const ALLDAY_STRIP_PAD = 6

function clipSegment(ev: DbEvent): Segment | null {
  if (isAllDayOrMultiDayBlock(ev)) return null
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

export function AgendaPage() {
  const { user } = useAuth()
  const canEditAgenda = hasScope(user, 'agenda.edit')
  const { toast, toastError } = useUiFeedback()
  const [googleSyncBusy, setGoogleSyncBusy] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const {
    events,
    analysts,
    tasks,
    projects,
    analystFilter,
    setAnalystFilter,
    agendaProjectFilterId,
    setAgendaProjectFilterId,
    eventModalRef,
    calendarBoot,
    setCalendarBoot,
  } = useAgendaOutlet()

  const [weekMonday, setWeekMonday] = useState(() => mondayOfWeekContaining(new Date()))
  const [activeDay, setActiveDay] = useState(() => zonedNow())
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(zonedNow()))
  const [viewMode, setViewMode] = useState<ViewMode>('month')

  useEffect(() => {
    if (!calendarBoot) return
    const z = calendarBoot.anchor
    setWeekMonday(mondayOfWeekContaining(z))
    setActiveDay(z)
    setMonthCursor(startOfMonth(z))
    setViewMode('day')
    setCalendarBoot(null)
  }, [calendarBoot, setCalendarBoot])

  const todayKey = dayKey(zonedNow())

  const displayDays = useMemo(() => {
    if (viewMode === 'week') return weekDaysMonFri(weekMonday)
    return [activeDay]
  }, [viewMode, weekMonday, activeDay])

  const handleGoogleSync = useCallback(async () => {
    if (!isGoogleCalendarSyncEnabled() || !isSupabaseConfigured()) return
    setGoogleSyncBusy(true)
    try {
      const analystId = primaryAnalystIdForGoogleSync(analystFilter)
      const rangeStart = displayDays[0]
      const rangeEnd = displayDays[displayDays.length - 1]
      const timeMin = new Date(rangeStart.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
      const timeMax = new Date(rangeEnd.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
      const { imported, updated } = await pullGoogleCalendarEvents({
        analystId,
        timeMin,
        timeMax,
        force: true,
      })
      toast(`Google Agenda: ${imported} novo(s), ${updated} atualizado(s).`)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Falha ao sincronizar com Google Agenda.')
    } finally {
      setGoogleSyncBusy(false)
    }
  }, [analystFilter, displayDays, toast, toastError])

  const subtitle = useMemo(() => {
    if (viewMode === 'month') return formatMonthRangeLabel(monthCursor)
    if (viewMode === 'week') return formatWeekRangeLabel(weekMonday)
    return formatSingleDayLong(activeDay)
  }, [viewMode, monthCursor, weekMonday, activeDay])

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])

  const projectsForPickers = useMemo(
    () =>
      [...projects]
        .filter((p) => p.status !== 'cancelado')
        .sort((a, b) => a.projectName.localeCompare(b.projectName, 'pt')),
    [projects],
  )

  const filteredEvents = useMemo(() => {
    let list = applyAnalystFilter(events, analystFilter)
    if (agendaProjectFilterId) {
      list = list.filter((ev) => {
        const pid = ev.projectId ?? (ev.taskId ? taskById.get(ev.taskId)?.projectId : undefined)
        return pid === agendaProjectFilterId
      })
    }
    return dedupeAgendaEventsByGoogleId(list)
  }, [events, analystFilter, agendaProjectFilterId, taskById])

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

  const displayDayKeysList = useMemo(() => displayDays.map((d) => dayKey(d)), [displayDays])

  const allDayStripPlacements = useMemo(
    () => buildAllDayStripPlacements(filteredEvents, displayDayKeysList),
    [filteredEvents, displayDayKeysList],
  )

  const allDayStripLaneCount = useMemo(
    () => Math.max(1, ...allDayStripPlacements.map((p) => p.laneCount), 0),
    [allDayStripPlacements],
  )

  const eventsById = useMemo(() => new Map(filteredEvents.map((e) => [e.id, e])), [filteredEvents])

  const laneMaps = useMemo(() => {
    const out = new Map<string, Map<string, LaneAssignment>>()
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

  const nowTopPct = layoutInGrid(new Date().toISOString(), new Date(Date.now() + 60_000).toISOString()).topPct

  const goToday = useCallback(() => {
    const now = new Date()
    const mon = mondayOfWeekContaining(now)
    setWeekMonday(mon)
    setActiveDay(zonedNow())
    setMonthCursor(startOfMonth(toZonedTime(now, CAL_TZ)))
  }, [])

  const goPrev = useCallback(() => {
    if (viewMode === 'month') {
      setMonthCursor((m) => subMonths(m, 1))
    } else if (viewMode === 'week') {
      setWeekMonday((w) => {
        const next = addWeeks(w, -1)
        setMonthCursor(startOfMonth(next))
        return next
      })
    } else {
      setActiveDay((d) => {
        const n = addDays(d, -1)
        setWeekMonday(mondayOfWeekContaining(n))
        setMonthCursor(startOfMonth(n))
        return n
      })
    }
  }, [viewMode])

  const goNext = useCallback(() => {
    if (viewMode === 'month') {
      setMonthCursor((m) => addMonths(m, 1))
    } else if (viewMode === 'week') {
      setWeekMonday((w) => {
        const next = addWeeks(w, 1)
        setMonthCursor(startOfMonth(next))
        return next
      })
    } else {
      setActiveDay((d) => {
        const n = addDays(d, 1)
        setWeekMonday(mondayOfWeekContaining(n))
        setMonthCursor(startOfMonth(n))
        return n
      })
    }
  }, [viewMode])

  const switchToMonth = useCallback(() => {
    setViewMode('month')
    setMonthCursor(startOfMonth(activeDay))
  }, [activeDay])

  const switchToDay = useCallback(() => {
    setViewMode('day')
    setWeekMonday(mondayOfWeekContaining(activeDay))
  }, [activeDay])

  const switchToWeek = useCallback(() => {
    setViewMode('week')
    setWeekMonday(mondayOfWeekContaining(activeDay))
    setMonthCursor(startOfMonth(activeDay))
  }, [activeDay])

  const onMiniSelectDay = useCallback((d: Date) => {
    const z = toZonedTime(d, CAL_TZ)
    setActiveDay(z)
    setWeekMonday(mondayOfWeekContaining(z))
    setMonthCursor(startOfMonth(z))
    setViewMode('day')
  }, [])

  function alignCalendarTo(z: Date) {
    setWeekMonday(mondayOfWeekContaining(z))
    setActiveDay(z)
    setMonthCursor(startOfMonth(z))
    setViewMode('day')
  }

  const openEditEvent = useCallback(
    (eventId: string) => {
      void eventModalRef.current?.openEditEvent(eventId).then((z) => {
        if (z) alignCalendarTo(z)
      })
    },
    [eventModalRef],
  )

  const slots = hourSlots()

  const monthWeekBundles = useMemo(
    () => buildMonthWeekBundles(monthCursor, filteredEvents, todayKey),
    [monthCursor, filteredEvents, todayKey],
  )

  const headerTitle =
    viewMode === 'month'
      ? formatInTimeZone(monthCursor, CAL_TZ, 'MMMM yyyy', { locale: ptBR })
      : viewMode === 'week'
        ? formatInTimeZone(weekMonday, CAL_TZ, 'MMMM yyyy', { locale: ptBR })
        : formatInTimeZone(activeDay, CAL_TZ, 'MMMM yyyy', { locale: ptBR })

  const onShowMoreDay = useCallback(
    (dayKeyStr: string) => {
      const [y, m, d] = dayKeyStr.split('-').map(Number)
      const z = toZonedTime(new Date(y, m - 1, d, 12, 0, 0), CAL_TZ)
      setActiveDay(z)
      setWeekMonday(mondayOfWeekContaining(z))
      setMonthCursor(startOfMonth(z))
      setViewMode('day')
    },
    [],
  )

  const onCreateOnDay = useCallback(
    (date: Date) => {
      if (!canEditAgenda) return
      eventModalRef.current?.openCreateBlank(date)
    },
    [canEditAgenda, eventModalRef],
  )

  return (
    <div
      className={
        'agenda-gc-layout agenda-gc-layout--calendar-only' +
        (sidebarCollapsed ? ' is-agenda-sidebar-collapsed' : '')
      }
    >
      <AgendaSidebar
        monthCursor={monthCursor}
        todayKey={todayKey}
        daysWithEvents={daysWithEvents}
        onSelectDay={onMiniSelectDay}
        onPrevMonth={() => setMonthCursor((m) => subMonths(m, 1))}
        onNextMonth={() => setMonthCursor((m) => addMonths(m, 1))}
        analysts={analysts}
        analystFilter={analystFilter}
        onAnalystFilterChange={setAnalystFilter}
        projectsForPickers={projectsForPickers}
        agendaProjectFilterId={agendaProjectFilterId}
        onProjectFilterChange={setAgendaProjectFilterId}
        googleSyncBusy={googleSyncBusy}
        onGoogleSync={() => void handleGoogleSync()}
        collapsed={sidebarCollapsed}
      />

      {!sidebarCollapsed ? (
        <button
          type="button"
          className="agenda-gc-sidebar-backdrop"
          aria-label="Fechar painel lateral"
          tabIndex={-1}
          onClick={() => setSidebarCollapsed(true)}
        />
      ) : null}

      <div className="agenda-gc-main">
        <header
          className="agenda-gc-bar agenda-gc-bar--surface agenda-gc-bar--sticky"
          aria-label="Período e visualização da agenda"
        >
          <div className="agenda-gc-bar__leading">
            <button
              type="button"
              className="btn btn--icon agenda-gc-panel-toggle"
              aria-expanded={!sidebarCollapsed}
              aria-controls="agenda-gc-sidebar"
              aria-label={sidebarCollapsed ? 'Abrir painel da agenda' : 'Fechar painel da agenda'}
              title={sidebarCollapsed ? 'Abrir painel' : 'Fechar painel'}
              onClick={() => setSidebarCollapsed((c) => !c)}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen size={20} strokeWidth={1.85} />
              ) : (
                <PanelLeftClose size={20} strokeWidth={1.85} />
              )}
            </button>
            <div className="agenda-gc-bar__left">
              <h1 className="agenda-gc-bar__title">Agenda</h1>
              <p className="agenda-gc-bar__sub">{subtitle}</p>
            </div>
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
                className={'agenda-seg__btn' + (viewMode === 'month' ? ' is-active' : '')}
                onClick={switchToMonth}
              >
                Mês
              </button>
              <button
                type="button"
                className={'agenda-seg__btn' + (viewMode === 'week' ? ' is-active' : '')}
                onClick={switchToWeek}
              >
                Semana
              </button>
              <button
                type="button"
                className={'agenda-seg__btn' + (viewMode === 'day' ? ' is-active' : '')}
                onClick={switchToDay}
              >
                Dia
              </button>
            </div>
            <button
              type="button"
              className="btn btn--primary agenda-gc-create"
              disabled={!canEditAgenda}
              onClick={() => eventModalRef.current?.openCreateBlank(activeDay)}
            >
              + Criar
            </button>
          </div>
        </header>

        {viewMode === 'month' ? (
          <section className="cal-shell cal-shell--gc cal-shell--month">
            <AgendaMonthView
              weekBundles={monthWeekBundles}
              events={filteredEvents}
              analysts={analysts}
              projects={projects}
              tasks={tasks}
              canEdit={canEditAgenda}
              onOpenEdit={openEditEvent}
              onCreateOnDay={onCreateOnDay}
              onShowMore={onShowMoreDay}
            />
          </section>
        ) : (
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
            {allDayStripPlacements.length > 0 ? (
              <div
                className="cal-allday-strip"
                style={{
                  height:
                    allDayStripLaneCount * ALLDAY_STRIP_BAR_H +
                    (allDayStripLaneCount - 1) * ALLDAY_STRIP_GAP +
                    ALLDAY_STRIP_PAD * 2,
                }}
              >
                <div className="cal-allday-strip__spacer" aria-hidden />
                <div className="cal-allday-strip__track">
                  {displayDays.map((d) => {
                    const dk = dayKey(d)
                    const isToday = dk === todayKey
                    return (
                      <div
                        key={dk}
                        className={'cal-allday-strip__col' + (isToday ? ' is-today' : '')}
                        aria-hidden
                      />
                    )
                  })}
                  <div className="cal-allday-strip__bars">
                    {allDayStripPlacements.map((pl) => {
                      const ev = eventsById.get(pl.eventId)
                      if (!ev) return null
                      const colCount = displayDays.length
                      const colW = 100 / colCount
                      const span = pl.endCol - pl.startCol + 1
                      const an = analysts.find((a) => a.id === ev.analystId)
                      const task = ev.taskId ? tasks.find((t) => t.id === ev.taskId) : undefined
                      const proj = ev.projectId
                        ? projects.find((p) => p.id === ev.projectId)
                        : task
                          ? projects.find((p) => p.id === task.projectId)
                          : undefined
                      const top =
                        ALLDAY_STRIP_PAD + pl.lane * (ALLDAY_STRIP_BAR_H + ALLDAY_STRIP_GAP)
                      return (
                        <AgendaCalEventBlock
                          key={ev.id}
                          ev={ev}
                          variant="allday-strip"
                          analyst={an}
                          project={proj}
                          task={task}
                          projectName={proj?.projectName}
                          canEdit={canEditAgenda}
                          stripStyle={{
                            top: `${top}px`,
                            height: `${ALLDAY_STRIP_BAR_H}px`,
                            left: `calc(${pl.startCol * colW}% + 3px)`,
                            width: `calc(${span * colW}% - 6px)`,
                          }}
                          onOpenEdit={openEditEvent}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : null}
            <div className="cal-body" style={{ height: `calc(${slots.length} * var(--agenda-cal-slot-height, 52px))` }}>
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
                    {/* TODO: arrastar eventos na grade para remarcar (updateEventValidated + feedback visual). */}
                    <div className="cal-day__events">
                      {list.map((ev) => {
                        if (isAllDayOrMultiDayBlock(ev)) return null
                        if (!clipSegment(ev)) return null
                        const an = analysts.find((a) => a.id === ev.analystId)
                        const { topPct, heightPct } = layoutInGrid(ev.startTime, ev.endTime)
                        const lane = lanes.get(ev.id)
                        const lc = lane?.laneCount ?? 1
                        const ln = lane?.lane ?? 0
                        const stackIndex = lane?.stackIndex ?? 0
                        const widthPct = 100 / lc
                        const leftPct = ln * widthPct
                        const laneInset = lc > 1 ? 1 : 0.35
                        const hTiny = heightPct < 5
                        const hCompact = heightPct < 9 || lc > 1
                        const lanesBand =
                          stackIndex > 0 ? 'stacked' : lc >= 2 ? '2' : null
                        const task = ev.taskId ? tasks.find((t) => t.id === ev.taskId) : undefined
                        const proj = ev.projectId
                          ? projects.find((p) => p.id === ev.projectId)
                          : task
                            ? projects.find((p) => p.id === task.projectId)
                            : undefined
                        return (
                          <AgendaCalEventBlock
                            key={ev.id}
                            ev={ev}
                            variant="timed"
                            analyst={an}
                            project={proj}
                            task={task}
                            canEdit={canEditAgenda}
                            topPct={topPct}
                            heightPct={heightPct}
                            leftPct={leftPct}
                            widthPct={widthPct}
                            laneInset={laneInset}
                            stackIndex={stackIndex}
                            lanesBand={lanesBand}
                            hTiny={hTiny}
                            hCompact={hCompact}
                            onOpenEdit={openEditEvent}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
        )}
      </div>
    </div>
  )
}
