import { addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { isCustomPlanType } from '../constants/customPlan'
import type { DbEvent, DbTask } from '../db/types'
import { CAL_TZ } from './calendarGrid'
import { compareTaskCode } from './taskCode'

export const DAILY_SLOTS = [
  { label: '09:00', startH: 9, startM: 0 },
  { label: '10:45', startH: 10, startM: 45 },
  { label: '14:15', startH: 14, startM: 15 },
  { label: '16:00', startH: 16, startM: 0 },
] as const

export type DailySlot = (typeof DAILY_SLOTS)[number]

export const SESSION_DURATION_MIN = 90

/** Intervalo mínimo (em dias de calendário) para considerar “espaçado” (ex.: seg → qua = 2). */
export const PREFERRED_MIN_CALENDAR_GAP = 2

/** Limite operacional: última sessão da fase não deve passar deste número de dias úteis após o início. */
export const PHASE_SCHEDULE_MAX_BUSINESS_DAYS = 20

export type ScheduleParams = {
  startDate: string
  analystId: string
  projectId: string
  sessionsPerWeek: 2 | 3
  blockedDates?: string[]
}

export type SlotProposal = {
  taskId: string
  taskTitle: string
  analystId: string
  startTime: string
  endTime: string
  slotKey: string
  dateYmd: string
  slotLabel: string
}

export type ScheduleGenerationResult = {
  proposals: SlotProposal[]
  skippedAlreadyScheduled: string[]
  skippedInformational: string[]
  lastProposedDate: string | null
}

const fmtOpts = { locale: ptBR }

function parseYmdInTz(ymd: string): Date {
  return fromZonedTime(`${ymd}T12:00:00`, CAL_TZ)
}

export function addDaysYmd(ymd: string, days: number): string {
  return formatInTimeZone(addDays(parseYmdInTz(ymd), days), CAL_TZ, 'yyyy-MM-dd')
}

export function isWeekdayYmd(ymd: string): boolean {
  const isoDow = Number(formatInTimeZone(parseYmdInTz(ymd), CAL_TZ, 'i'))
  return isoDow >= 1 && isoDow <= 5
}

/** Conta dias úteis (seg–sex) entre duas datas, inclusive. */
export function countBusinessDaysInclusive(
  fromYmd: string,
  toYmd: string,
  blocked?: ReadonlySet<string>,
): number {
  if (!fromYmd || !toYmd || toYmd < fromYmd) return 0
  let count = 0
  let cur = fromYmd
  while (cur <= toYmd) {
    if (isWeekdayYmd(cur) && !blocked?.has(cur)) count++
    cur = addDaysYmd(cur, 1)
  }
  return count
}

export function exceedsPhaseScheduleBusinessDayLimit(
  startYmd: string,
  lastYmd: string,
  maxDays: number = PHASE_SCHEDULE_MAX_BUSINESS_DAYS,
): boolean {
  return countBusinessDaysInclusive(startYmd, lastYmd) > maxDays
}

export function nextBusinessDayYmd(ymd: string, blocked?: ReadonlySet<string>): string {
  let cur = ymd
  for (let i = 0; i < 370; i++) {
    if (isWeekdayYmd(cur) && !blocked?.has(cur)) return cur
    cur = addDaysYmd(cur, 1)
  }
  return cur
}

/** Segunda-feira da semana de `ymd` no fuso {@link CAL_TZ} (independente do TZ do SO/CI). */
export function mondayOfWeekYmd(ymd: string): string {
  const isoDow = Number(formatInTimeZone(parseYmdInTz(ymd), CAL_TZ, 'i'))
  return addDaysYmd(ymd, -(isoDow - 1))
}

export function slotToIso(ymd: string, slot: DailySlot): { startTime: string; endTime: string } {
  const wall = `${ymd}T${String(slot.startH).padStart(2, '0')}:${String(slot.startM).padStart(2, '0')}:00`
  const start = fromZonedTime(wall, CAL_TZ)
  const end = new Date(start.getTime() + SESSION_DURATION_MIN * 60_000)
  return { startTime: start.toISOString(), endTime: end.toISOString() }
}

export function eventsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const a0 = new Date(aStart).getTime()
  const a1 = new Date(aEnd).getTime()
  const b0 = new Date(bStart).getTime()
  const b1 = new Date(bEnd).getTime()
  return a0 < b1 && b0 < a1
}

export function hasSlotConflict(
  startTime: string,
  endTime: string,
  analystId: string,
  existingEvents: readonly DbEvent[],
): boolean {
  return existingEvents.some((e) => {
    if (e.status !== 'agendado') return false
    if (e.analystId !== analystId) return false
    return eventsOverlap(startTime, endTime, e.startTime, e.endTime)
  })
}

function ymdOrdinal(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

export function calendarDayDiffYmd(a: string, b: string): number {
  return Math.abs(ymdOrdinal(a) - ymdOrdinal(b))
}

export function minGapToDates(ymd: string, picked: readonly string[]): number {
  if (picked.length === 0) return Number.POSITIVE_INFINITY
  return Math.min(...picked.map((p) => calendarDayDiffYmd(ymd, p)))
}

/** Dias úteis (seg–sex) de uma semana, a partir da segunda-feira em yyyy-MM-dd. */
export function weekdayDatesInWeek(weekMondayYmd: string): string[] {
  return [0, 1, 2, 3, 4].map((i) => addDaysYmd(weekMondayYmd, i))
}

export function dayHasFreeSlot(
  ymd: string,
  analystId: string,
  events: readonly DbEvent[],
): boolean {
  return DAILY_SLOTS.some((slot) => {
    const { startTime, endTime } = slotToIso(ymd, slot)
    return !hasSlotConflict(startTime, endTime, analystId, events)
  })
}

/**
 * Ordena candidatos: prioriza ≥1 dia útil entre sessões (gap calendário ≥2);
 * se não houver, aceita dias consecutivos; desempata pela data mais cedo.
 */
export function rankCandidateDays(available: readonly string[], pickedInWeek: readonly string[]): string[] {
  return [...available].sort((a, b) => {
    const gapA = minGapToDates(a, pickedInWeek)
    const gapB = minGapToDates(b, pickedInWeek)
    const spacedA = gapA >= PREFERRED_MIN_CALENDAR_GAP ? 1 : 0
    const spacedB = gapB >= PREFERRED_MIN_CALENDAR_GAP ? 1 : 0
    if (spacedB !== spacedA) return spacedB - spacedA
    const byDate = a.localeCompare(b)
    if (byDate !== 0) return byDate
    return gapB - gapA
  })
}

function taskHasScheduledEvent(taskId: string, events: readonly DbEvent[]): boolean {
  return events.some((e) => e.taskId === taskId && e.status === 'agendado')
}

function firstFreeSlotOnDay(
  ymd: string,
  analystId: string,
  events: readonly DbEvent[],
  startSlotIdx: number,
): DailySlot | null {
  for (let si = 0; si < DAILY_SLOTS.length; si++) {
    const slot = DAILY_SLOTS[(startSlotIdx + si) % DAILY_SLOTS.length]!
    const { startTime, endTime } = slotToIso(ymd, slot)
    if (!hasSlotConflict(startTime, endTime, analystId, events)) return slot
  }
  return null
}

export function formatSlotLabel(ymd: string, slotTimeLabel: string): string {
  const d = parseYmdInTz(ymd)
  const wd = formatInTimeZone(d, CAL_TZ, 'EEE', fmtOpts).replace(/\.$/, '')
  const br = formatInTimeZone(d, CAL_TZ, 'dd/MM', fmtOpts)
  return `${wd} ${slotTimeLabel} · ${br}`
}

export function weekdayShortPt(ymd: string): string {
  return formatInTimeZone(parseYmdInTz(ymd), CAL_TZ, 'EEE', fmtOpts).replace(/\.$/, '')
}

export function isPhaseEligibleForScheduleLaunch(
  phaseOrderIndex: number,
  phaseStatus: string,
  planType: string,
): boolean {
  if (phaseStatus === 'concluida') return false
  const minOrder = isCustomPlanType(planType) ? 0 : 1
  return phaseOrderIndex >= minOrder
}

export function generatePhaseSchedule(
  tasks: readonly DbTask[],
  existingEvents: readonly DbEvent[],
  params: ScheduleParams,
): ScheduleGenerationResult {
  const blocked = new Set(params.blockedDates ?? [])
  const startYmd = nextBusinessDayYmd(params.startDate, blocked)
  const sessionsPerWeek = params.sessionsPerWeek

  const skippedInformational: string[] = []
  const skippedAlreadyScheduled: string[] = []
  const eligible: DbTask[] = []

  for (const t of tasks) {
    if (t.isInformational) {
      skippedInformational.push(t.id)
      continue
    }
    if (taskHasScheduledEvent(t.id, existingEvents)) {
      skippedAlreadyScheduled.push(t.id)
      continue
    }
    if (t.status === 'concluida' || t.status === 'cancelado') continue
    eligible.push(t)
  }

  eligible.sort((a, b) => compareTaskCode(a.code, b.code) || a.sortOrder - b.sortOrder)

  const batchUsedDates = new Set<string>()
  const proposals: SlotProposal[] = []
  let workingEvents: DbEvent[] = [...existingEvents]

  let weekNum = 0
  let posInWeek = 0
  let weekPickedDays: string[] = []
  let slotRotation = 0

  for (const task of eligible) {
    let placed = false
    let weekAttempts = 0

    while (!placed && weekAttempts < 80) {
      const weekMonday = addDaysYmd(mondayOfWeekYmd(startYmd), weekNum * 7)
      const rawDays = weekdayDatesInWeek(weekMonday)

      const candidates = rawDays.filter((d) => {
        if (weekNum === 0 && d < startYmd) return false
        if (!isWeekdayYmd(d) || blocked.has(d)) return false
        if (batchUsedDates.has(d)) return false
        return dayHasFreeSlot(d, params.analystId, workingEvents)
      })

      const ranked = rankCandidateDays(candidates, weekPickedDays)

      for (const candidateYmd of ranked) {
        const slot = firstFreeSlotOnDay(candidateYmd, params.analystId, workingEvents, slotRotation)
        if (!slot) continue

        const { startTime, endTime } = slotToIso(candidateYmd, slot)
        proposals.push({
          taskId: task.id,
          taskTitle: task.title,
          analystId: params.analystId,
          startTime,
          endTime,
          slotKey: slot.label,
          dateYmd: candidateYmd,
          slotLabel: formatSlotLabel(candidateYmd, slot.label),
        })
        batchUsedDates.add(candidateYmd)
        weekPickedDays.push(candidateYmd)
        workingEvents = [
          ...workingEvents,
          {
            id: `proposal-${task.id}`,
            title: task.title,
            description: '',
            startTime,
            endTime,
            status: 'agendado',
            projectId: params.projectId,
            taskId: task.id,
            analystId: params.analystId,
            meetingLink: null,
            recordingLink: null,
            createdAt: new Date().toISOString(),
          },
        ]
        slotRotation++
        posInWeek++
        if (posInWeek >= sessionsPerWeek) {
          posInWeek = 0
          weekPickedDays = []
          weekNum++
        }
        placed = true
        break
      }

      if (!placed) {
        weekNum++
        posInWeek = 0
        weekPickedDays = []
        weekAttempts++
      }
    }
  }

  return {
    proposals,
    skippedAlreadyScheduled,
    skippedInformational,
    lastProposedDate: proposals.length ? proposals[proposals.length - 1]!.dateYmd : null,
  }
}
