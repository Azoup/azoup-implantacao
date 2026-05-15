import { formatInTimeZone } from 'date-fns-tz'
import type { DbAnalyst, DbEvent, DbProject, DbTask } from '../../db/types'
import { eventColorsFromAnalyst } from '../../lib/analystColors'
import { inclusiveEndDayKey } from '../../lib/agendaEventDisplay'
import type { AllDayStripPlacement } from '../../lib/agendaEventDisplay'
import { formatAgendaDisplayTitle } from '../../lib/calendarEventTitle'
import { CAL_TZ, dayKeyFromIso } from '../../lib/calendarGrid'
import {
  MONTH_STRIP_BAR_H,
  MONTH_STRIP_GAP,
  MONTH_WEEKDAY_LABELS,
  type MonthWeekBundle,
} from '../../lib/calendarMonthGrid'

export type AgendaMonthViewProps = {
  weekBundles: MonthWeekBundle[]
  /** Eventos filtrados (inclui faixas multi-dia, que não aparecem nos chips). */
  events: DbEvent[]
  analysts: DbAnalyst[]
  projects: DbProject[]
  tasks: DbTask[]
  canEdit: boolean
  onOpenEdit: (eventId: string) => void
  onCreateOnDay: (date: Date) => void
  onShowMore: (dayKey: string) => void
}

const STRIP_INSET_PX = 3
const DAY_NUM_TRACK_H = 22

export function AgendaMonthView({
  weekBundles,
  events,
  analysts,
  projects,
  tasks,
  canEdit,
  onOpenEdit,
  onCreateOnDay,
  onShowMore,
}: AgendaMonthViewProps) {
  const eventsById = new Map(events.map((e) => [e.id, e]))
  const taskById = new Map(tasks.map((t) => [t.id, t]))

  function resolveProject(ev: DbEvent) {
    if (ev.projectId) return projects.find((p) => p.id === ev.projectId)
    const task = ev.taskId ? taskById.get(ev.taskId) : undefined
    return task ? projects.find((p) => p.id === task.projectId) : undefined
  }

  function renderChip(ev: DbEvent) {
    const analyst = analysts.find((a) => a.id === ev.analystId)
    const task = ev.taskId ? taskById.get(ev.taskId) : undefined
    const project = resolveProject(ev)
    const title = formatAgendaDisplayTitle(ev, project, task)
    const { accent, bg, text } = eventColorsFromAnalyst(analyst?.color, ev.status === 'cancelado')
    const timeLabel = formatInTimeZone(ev.startTime, CAL_TZ, 'HH:mm')

    return (
      <button
        key={ev.id}
        type="button"
        className={
          'cal-month__chip' + (ev.status === 'cancelado' ? ' is-cancelled' : '') + (canEdit ? ' is-interactive' : '')
        }
        style={{ ['--evt-accent' as string]: accent, ['--evt-bg' as string]: bg, ['--evt-text' as string]: text }}
        title={`${title} · ${timeLabel}`}
        onClick={(e) => {
          e.stopPropagation()
          onOpenEdit(ev.id)
        }}
      >
        <span className="cal-month__chip-time">{timeLabel}</span>
        <span className="cal-month__chip-title">{title}</span>
      </button>
    )
  }

  function stripStyle(pl: AllDayStripPlacement, colCount: number) {
    const colW = 100 / colCount
    const span = pl.endCol - pl.startCol + 1
    return {
      left: `calc(${pl.startCol * colW}% + ${STRIP_INSET_PX}px)`,
      width: `calc(${span * colW}% - ${STRIP_INSET_PX * 2}px)`,
      top: `${pl.lane * (MONTH_STRIP_BAR_H + MONTH_STRIP_GAP)}px`,
      height: `${MONTH_STRIP_BAR_H}px`,
    }
  }

  function renderStrip(
    pl: AllDayStripPlacement,
    colCount: number,
    weekFirstKey: string,
    weekLastKey: string,
  ) {
    const ev = eventsById.get(pl.eventId)
    if (!ev) return null
    const analyst = analysts.find((a) => a.id === ev.analystId)
    const task = ev.taskId ? taskById.get(ev.taskId) : undefined
    const project = resolveProject(ev)
    const title = formatAgendaDisplayTitle(ev, project, task)
    const { accent, bg, text } = eventColorsFromAnalyst(analyst?.color, ev.status === 'cancelado')
    const startKey = dayKeyFromIso(ev.startTime)
    const endKey = inclusiveEndDayKey(ev)
    const continuesFromPrev = pl.startCol === 0 && startKey < weekFirstKey
    const continuesToNext = pl.endCol === colCount - 1 && endKey > weekLastKey

    return (
      <button
        key={`${pl.eventId}-${pl.startCol}-${pl.lane}`}
        type="button"
        className={
          'cal-month__strip' +
          (ev.status === 'cancelado' ? ' is-cancelled' : '') +
          (canEdit ? ' is-interactive' : '') +
          (continuesFromPrev ? ' cal-month__strip--cont-left' : '') +
          (continuesToNext ? ' cal-month__strip--cont-right' : '') +
          (!continuesFromPrev ? ' cal-month__strip--start' : '') +
          (!continuesToNext ? ' cal-month__strip--end' : '')
        }
        style={{
          ...stripStyle(pl, colCount),
          ['--evt-accent' as string]: accent,
          ['--evt-bg' as string]: bg,
          ['--evt-text' as string]: text,
        }}
        title={title}
        onClick={(e) => {
          e.stopPropagation()
          onOpenEdit(ev.id)
        }}
      >
        {!continuesFromPrev ? <span className="cal-month__strip-title">{title}</span> : null}
      </button>
    )
  }

  return (
    <div className="cal-month" role="grid" aria-label="Calendário mensal">
      <div className="cal-month__weekdays" aria-hidden>
        {MONTH_WEEKDAY_LABELS.map((wd) => (
          <span key={wd} className="cal-month__wd">
            {wd}
          </span>
        ))}
      </div>
      <div className="cal-month__weeks">
        {weekBundles.map((bundle) => {
          const colCount = bundle.cells.length
          const weekFirstKey = bundle.dayKeys[0]!
          const weekLastKey = bundle.dayKeys[bundle.dayKeys.length - 1]!
          const stripTrackH =
            bundle.stripLaneCount > 0
              ? bundle.stripLaneCount * MONTH_STRIP_BAR_H + (bundle.stripLaneCount - 1) * MONTH_STRIP_GAP
              : 0
          return (
            <div
              key={bundle.weekIndex}
              className="cal-month__week"
              style={{ ['--month-strip-track-h' as string]: `${stripTrackH}px` }}
            >
              <div className="cal-month__week-grid">
                {bundle.cells.map((cell) => (
                  <div
                    key={cell.dayKey}
                    className={
                      'cal-month__cell' +
                      (cell.isCurrentMonth ? '' : ' is-outside') +
                      (cell.isToday ? ' is-today' : '') +
                      (canEdit ? ' is-interactive' : '')
                    }
                    role="gridcell"
                    tabIndex={canEdit ? 0 : undefined}
                    onClick={() => {
                      if (canEdit) onCreateOnDay(cell.date)
                    }}
                    onKeyDown={(e) => {
                      if (canEdit && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        onCreateOnDay(cell.date)
                      }
                    }}
                  >
                    <span className={'cal-month__day-num' + (cell.isToday ? ' is-ring' : '')}>
                      {formatInTimeZone(cell.date, CAL_TZ, 'd')}
                    </span>
                    {stripTrackH > 0 ? <div className="cal-month__strip-spacer" aria-hidden /> : null}
                    <div className="cal-month__chips">
                      {cell.visibleEvents.map((ev) => renderChip(ev))}
                      {cell.overflowCount > 0 ? (
                        <button
                          type="button"
                          className="cal-month__overflow"
                          onClick={(e) => {
                            e.stopPropagation()
                            onShowMore(cell.dayKey)
                          }}
                        >
                          +{cell.overflowCount} mais
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              {bundle.stripPlacements.length > 0 ? (
                <div
                  className="cal-month__strips"
                  style={{ height: `${stripTrackH}px`, top: `${DAY_NUM_TRACK_H}px` }}
                >
                  {bundle.stripPlacements.map((pl) =>
                    renderStrip(pl, colCount, weekFirstKey, weekLastKey),
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
