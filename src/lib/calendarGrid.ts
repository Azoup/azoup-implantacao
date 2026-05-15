import { addDays, addWeeks, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'

export const CAL_TZ = 'America/Sao_Paulo'

const fmtOpts = { locale: ptBR }

/** Início e fim do dia visível na grade (horas cheias). */
export const GRID_START_HOUR = 7
export const GRID_END_HOUR = 22

export function zonedNow(): Date {
  return toZonedTime(new Date(), CAL_TZ)
}

export function mondayOfWeekContaining(anchor: Date): Date {
  const z = toZonedTime(anchor, CAL_TZ)
  return startOfWeek(z, { weekStartsOn: 1 })
}

export function weekDaysMonFri(weekMondayZ: Date): Date[] {
  return [0, 1, 2, 3, 4].map((i) => addDays(weekMondayZ, i))
}

export function shiftWeek(weekMondayZ: Date, deltaWeeks: number): Date {
  return addWeeks(weekMondayZ, deltaWeeks)
}

export function dayKey(d: Date): string {
  return formatInTimeZone(d, CAL_TZ, 'yyyy-MM-dd')
}

export function formatDayHeader(d: Date): { weekday: string; day: string } {
  const wd = formatInTimeZone(d, CAL_TZ, 'EEE', fmtOpts).replace(/\.$/, '').toUpperCase()
  return {
    weekday: wd,
    day: formatInTimeZone(d, CAL_TZ, 'dd'),
  }
}

export function formatWeekRangeLabel(weekMondayZ: Date): string {
  const fri = addDays(weekMondayZ, 4)
  const a = formatInTimeZone(weekMondayZ, CAL_TZ, "d 'de' MMMM", fmtOpts)
  const b = formatInTimeZone(fri, CAL_TZ, "d 'de' MMMM", fmtOpts)
  return `${a} — ${b}`
}

export function formatSingleDayLong(d: Date): string {
  return formatInTimeZone(d, CAL_TZ, "EEEE, d 'de' MMMM yyyy", fmtOpts)
}

export function formatMonthRangeLabel(anchor: Date): string {
  return formatInTimeZone(toZonedTime(anchor, CAL_TZ), CAL_TZ, 'MMMM yyyy', fmtOpts)
}

/** ISO sem sufixo Z/offset = horário de parede em CAL_TZ (evita tratar como UTC). */
export function parseEventInstant(iso: string): Date {
  const s = iso.trim()
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{1,3})?$/.test(s)) {
    const wall = /T\d{2}:\d{2}$/.test(s) ? `${s}:00` : s
    return fromZonedTime(wall, CAL_TZ)
  }
  return new Date(s)
}

export function minutesFromMidnightInTz(iso: string): number {
  const instant = parseEventInstant(iso)
  const h = Number(formatInTimeZone(instant, CAL_TZ, 'H'))
  const m = Number(formatInTimeZone(instant, CAL_TZ, 'm'))
  return h * 60 + m
}

export function dayKeyFromIso(iso: string): string {
  return formatInTimeZone(parseEventInstant(iso), CAL_TZ, 'yyyy-MM-dd')
}

/** Retorna top% e height% dentro da faixa GRID_START_HOUR–GRID_END_HOUR. */
export function layoutInGrid(
  startIso: string,
  endIso: string,
): { topPct: number; heightPct: number; clipped: boolean } {
  const gridStartMin = GRID_START_HOUR * 60
  const gridEndMin = GRID_END_HOUR * 60
  const total = gridEndMin - gridStartMin

  let startMin = minutesFromMidnightInTz(startIso)
  let endMin = minutesFromMidnightInTz(endIso)
  if (endMin <= startMin) endMin = startMin + 30

  const clipped = startMin < gridStartMin || endMin > gridEndMin
  startMin = Math.max(gridStartMin, startMin)
  endMin = Math.min(gridEndMin, endMin)
  if (endMin <= startMin) endMin = Math.min(gridEndMin, startMin + 30)

  const topPct = ((startMin - gridStartMin) / total) * 100
  const heightPct = Math.max(((endMin - startMin) / total) * 100, 1.2)
  return { topPct, heightPct, clipped }
}

/** Uma linha por hora no intervalo visível (ex.: 7h–21h = 15 faixas até 22h). */
export function hourSlots(): number[] {
  const slots: number[] = []
  for (let h = GRID_START_HOUR; h < GRID_END_HOUR; h++) slots.push(h)
  return slots
}

export type Segment = { id: string; startMin: number; endMin: number }

export function maxConcurrency(ev: Segment[]): number {
  const pts: { t: number; d: number }[] = []
  for (const e of ev) {
    pts.push({ t: e.startMin, d: 1 }, { t: e.endMin, d: -1 })
  }
  pts.sort((a, b) => a.t - b.t || a.d - b.d)
  let c = 0
  let m = 0
  for (const p of pts) {
    c += p.d
    m = Math.max(m, c)
  }
  return Math.max(1, m)
}

export type LaneAssignment = { lane: number; laneCount: number; stackIndex: number }

/**
 * Distribui eventos sobrepostos em faixas paralelas (máx. `maxLanes` colunas).
 * Acima do limite, empilha na última coluna com `stackIndex` (deslocamento visual).
 */
export function assignLanes(ev: Segment[], maxLanes = 2): Map<string, LaneAssignment> {
  const rawCount = maxConcurrency(ev)
  const laneCount = Math.min(rawCount, Math.max(1, maxLanes))
  const sorted = ev.slice().sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)
  const laneEnd = Array.from({ length: laneCount }, () => 0)
  const stackInLane = Array.from({ length: laneCount }, () => 0)
  const map = new Map<string, LaneAssignment>()
  for (const e of sorted) {
    let lane = 0
    for (; lane < laneCount; lane++) {
      if (laneEnd[lane] <= e.startMin) break
    }
    if (lane === laneCount) {
      lane = laneCount - 1
      stackInLane[lane] += 1
    } else {
      stackInLane[lane] = 0
    }
    laneEnd[lane] = Math.max(laneEnd[lane], e.endMin)
    map.set(e.id, { lane, laneCount, stackIndex: stackInLane[lane] })
  }
  return map
}
