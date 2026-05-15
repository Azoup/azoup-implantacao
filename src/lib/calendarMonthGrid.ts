import { eachDayOfInterval, endOfMonth, endOfWeek, isSameMonth, startOfMonth, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'
import type { DbEvent } from '../db/types'
import {
  buildAllDayStripPlacements,
  isMonthStripEvent,
  type AllDayStripPlacement,
} from './agendaEventDisplay'
import { CAL_TZ, dayKey, dayKeyFromIso } from './calendarGrid'

export const MAX_CHIPS_PER_CELL = 3
export const MAX_CHIPS_PER_CELL_MOBILE = 2
export const MONTH_STRIP_BAR_H = 20
export const MONTH_STRIP_GAP = 2

export type MonthCell = {
  date: Date
  dayKey: string
  isCurrentMonth: boolean
  isToday: boolean
  events: DbEvent[]
  visibleEvents: DbEvent[]
  overflowCount: number
}

export type MonthWeekRow = MonthCell[]

/** Uma semana da grade mensal com faixas multi-dia (estilo Google Calendar). */
export type MonthWeekBundle = {
  weekIndex: number
  cells: MonthWeekRow
  dayKeys: string[]
  stripPlacements: AllDayStripPlacement[]
  stripLaneCount: number
}

function buildCellsForInterval(
  gridStart: Date,
  gridEnd: Date,
  zAnchor: Date,
  todayKey: string,
  timedByStartDay: Map<string, DbEvent[]>,
  maxChips: number,
): MonthCell[] {
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  return days.map((d) => {
    const z = toZonedTime(d, CAL_TZ)
    const dk = dayKey(z)
    const dayEvents = (timedByStartDay.get(dk) ?? []).slice().sort((a, b) => a.startTime.localeCompare(b.startTime))
    const visibleEvents = dayEvents.slice(0, maxChips)
    return {
      date: z,
      dayKey: dk,
      isCurrentMonth: isSameMonth(z, zAnchor),
      isToday: dk === todayKey,
      events: dayEvents,
      visibleEvents,
      overflowCount: Math.max(0, dayEvents.length - visibleEvents.length),
    }
  })
}

export function buildMonthWeekBundles(
  anchor: Date,
  events: DbEvent[],
  todayKey: string,
  maxChips = MAX_CHIPS_PER_CELL,
): MonthWeekBundle[] {
  const zAnchor = toZonedTime(anchor, CAL_TZ)
  const monthStart = startOfMonth(zAnchor)
  const monthEnd = endOfMonth(zAnchor)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const timedByStartDay = new Map<string, DbEvent[]>()
  for (const ev of events) {
    if (isMonthStripEvent(ev)) continue
    const k = dayKeyFromIso(ev.startTime)
    if (!timedByStartDay.has(k)) timedByStartDay.set(k, [])
    timedByStartDay.get(k)!.push(ev)
  }

  const allCells = buildCellsForInterval(gridStart, gridEnd, zAnchor, todayKey, timedByStartDay, maxChips)
  const bundles: MonthWeekBundle[] = []

  for (let wi = 0; wi < allCells.length; wi += 7) {
    const cells = allCells.slice(wi, wi + 7)
    const dayKeys = cells.map((c) => c.dayKey)
    const stripPlacements = buildAllDayStripPlacements(events, dayKeys, isMonthStripEvent)
    const stripLaneCount = Math.max(1, ...stripPlacements.map((p) => p.laneCount), 0)
    bundles.push({
      weekIndex: wi / 7,
      cells,
      dayKeys,
      stripPlacements,
      stripLaneCount: stripPlacements.length > 0 ? stripLaneCount : 0,
    })
  }

  return bundles
}

/** @deprecated Prefer buildMonthWeekBundles for month UI with strip bars. */
export function monthWeekRows(
  anchor: Date,
  events: DbEvent[],
  todayKey: string,
  maxChips = MAX_CHIPS_PER_CELL,
): MonthWeekRow[] {
  return buildMonthWeekBundles(anchor, events, todayKey, maxChips).map((b) => b.cells)
}

export const MONTH_WEEKDAY_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

export function formatMonthTitle(anchor: Date): string {
  return formatInTimeZone(toZonedTime(anchor, CAL_TZ), CAL_TZ, 'MMMM yyyy', { locale: ptBR })
}

/** Início do dia em ISO para pré-preencher modal (meio-dia no fuso da agenda). */
export function defaultStartIsoForDayKey(dayKeyStr: string): string {
  return `${dayKeyStr}T09:00:00`
}

export function defaultEndIsoForDayKey(dayKeyStr: string): string {
  return `${dayKeyStr}T10:00:00`
}
