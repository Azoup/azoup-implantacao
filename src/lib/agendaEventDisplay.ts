import { addDays, parseISO } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import type { DbEvent } from '../db/types'
import { CAL_TZ, GRID_END_HOUR, GRID_START_HOUR, dayKeyFromIso, minutesFromMidnightInTz } from './calendarGrid'

const URL_RE = /https?:\/\/[^\s)<>"']+/gi

/** Uma linha por `googleEventId` (mantém a mais “completa” se o pull duplicou). */
export function dedupeAgendaEventsByGoogleId(events: DbEvent[]): DbEvent[] {
  const withoutGoogle: DbEvent[] = []
  const byGoogle = new Map<string, DbEvent>()

  const richness = (e: DbEvent) =>
    (e.projectId || e.taskId ? 4 : 0) + (e.googleSyncStatus === 'synced' ? 2 : 0) + (e.meetingLink ? 1 : 0)

  for (const ev of events) {
    const gid = ev.googleEventId?.trim()
    if (!gid) {
      withoutGoogle.push(ev)
      continue
    }
    const prev = byGoogle.get(gid)
    if (!prev || richness(ev) > richness(prev)) byGoogle.set(gid, ev)
  }

  return [...withoutGoogle, ...byGoogle.values()].sort((a, b) => a.startTime.localeCompare(b.startTime))
}

/** Último dia civil inclusivo (fim exclusivo à meia-noite no fuso da agenda). */
export function inclusiveEndDayKey(ev: DbEvent): string {
  const endKey = dayKeyFromIso(ev.endTime)
  const endMin = minutesFromMidnightInTz(ev.endTime)
  if (endMin <= 1) {
    const d = parseISO(`${endKey}T12:00:00`)
    return dayKeyFromIso(addDays(d, -1).toISOString())
  }
  return endKey
}

/** Import Google legado (T12:00–T13:00) ou bloco ≥23h / meia-noite. */
export function isAllDayOrMultiDayBlock(ev: DbEvent): boolean {
  const startKey = dayKeyFromIso(ev.startTime)
  const endKey = dayKeyFromIso(ev.endTime)
  const startMin = minutesFromMidnightInTz(ev.startTime)
  const endMin = minutesFromMidnightInTz(ev.endTime)
  const durationMs = new Date(ev.endTime).getTime() - new Date(ev.startTime).getTime()

  if (durationMs >= 23 * 60 * 60 * 1000) return true

  if (ev.googleEventId && durationMs <= 2 * 60 * 1000) return true

  /** Import legado: bloco fixo 12:00–13:00 no fuso da agenda (não compromissos reais ~12:09). */
  const legacyNoonStart = 12 * 60
  const legacyNoonEnd = 13 * 60
  if (
    ev.googleEventId &&
    startKey === endKey &&
    Math.abs(startMin - legacyNoonStart) <= 5 &&
    Math.abs(endMin - legacyNoonEnd) <= 5 &&
    durationMs >= 50 * 60 * 1000 &&
    durationMs <= 70 * 60 * 1000
  ) {
    return true
  }

  if (startMin <= 1 && endMin <= 1 && startKey !== endKey && durationMs >= 60 * 60 * 1000) return true

  if (startMin <= 1 && endMin <= 1 && durationMs >= 20 * 60 * 60 * 1000) return true

  if (startMin <= 60 && endMin <= 60 && durationMs >= 12 * 60 * 60 * 1000) return true

  const gridStartMin = GRID_START_HOUR * 60
  const gridEndMin = GRID_END_HOUR * 60
  if (
    startMin <= gridStartMin + 60 &&
    endMin >= gridEndMin - 60 &&
    durationMs >= 8 * 60 * 60 * 1000
  ) {
    return true
  }

  return false
}

/** Evento ocupa mais de um dia civil no fuso da agenda (ex.: férias). */
export function spansMultipleCalendarDays(ev: DbEvent): boolean {
  return dayKeyFromIso(ev.startTime) !== inclusiveEndDayKey(ev)
}

/** Faixa contínua na grade mensal: dia inteiro ou vários dias. */
export function isMonthStripEvent(ev: DbEvent): boolean {
  return isAllDayOrMultiDayBlock(ev) || spansMultipleCalendarDays(ev)
}

export function formatEventTimeLabel(ev: DbEvent): string {
  if (isAllDayOrMultiDayBlock(ev)) {
    const s = dayKeyFromIso(ev.startTime)
    const e = inclusiveEndDayKey(ev)
    if (s === e) return 'Dia inteiro'
    const a = formatInTimeZone(ev.startTime, CAL_TZ, 'd/M')
    const b = formatInTimeZone(`${e}T12:00:00`, CAL_TZ, 'd/M')
    return `${a} – ${b}`
  }
  const t0 = formatInTimeZone(ev.startTime, CAL_TZ, 'HH:mm')
  const t1 = formatInTimeZone(ev.endTime, CAL_TZ, 'HH:mm')
  return `${t0} – ${t1}`
}

export type AgendaEventActionLinks = {
  meeting: string | null
  recording: string | null
  transcript: string | null
}

function classifyUrl(url: string): 'recording' | 'transcript' | 'meeting' | null {
  const u = url.toLowerCase()
  if (u.includes('meet.google.com') || u.includes('zoom.us') || u.includes('teams.microsoft.com')) {
    return 'meeting'
  }
  if (
    u.includes('gemini.google.com') ||
    u.includes('notebooklm.google.com') ||
    (u.includes('docs.google.com/document') && (u.includes('transcri') || u.includes('resumo')))
  ) {
    return 'transcript'
  }
  if (u.includes('drive.google.com')) {
    if (u.includes('/file/') || u.includes('open?id=') || u.includes('/video')) return 'recording'
    return 'recording'
  }
  return null
}

/** Links acionáveis no chip (campos + URLs na descrição). */
export function getAgendaEventActionLinks(ev: DbEvent): AgendaEventActionLinks {
  let meeting = ev.meetingLink?.trim() || null
  let recording = ev.recordingLink?.trim() || null
  let transcript: string | null = null

  const urls = (ev.description ?? '').match(URL_RE) ?? []
  for (const raw of urls) {
    const url = raw.replace(/[.,;]+$/, '')
    const kind = classifyUrl(url)
    if (kind === 'meeting' && !meeting) meeting = url
    if (kind === 'recording' && !recording) recording = url
    if (kind === 'transcript' && !transcript) transcript = url
  }

  if (!transcript) {
    for (const raw of urls) {
      const url = raw.replace(/[.,;]+$/, '')
      const u = url.toLowerCase()
      if (u.includes('docs.google.com') && !recording?.includes(url)) {
        transcript = url
        break
      }
    }
  }

  return { meeting, recording, transcript }
}

export type AllDayStripPlacement = {
  eventId: string
  startCol: number
  endCol: number
  lane: number
  laneCount: number
}

type ColSeg = { id: string; startCol: number; endCol: number }

function assignColLanes(segments: ColSeg[]): Map<string, { lane: number; laneCount: number }> {
  if (segments.length === 0) return new Map()
  const sorted = segments.slice().sort((a, b) => a.startCol - b.startCol || a.endCol - b.endCol)
  const laneEnds: number[] = []
  const map = new Map<string, { lane: number; laneCount: number }>()

  for (const seg of sorted) {
    let lane = 0
    for (; lane < laneEnds.length; lane++) {
      if (laneEnds[lane]! < seg.startCol) break
    }
    if (lane === laneEnds.length) laneEnds.push(seg.endCol)
    else laneEnds[lane] = seg.endCol
    map.set(seg.id, { lane, laneCount: 0 })
  }

  const laneCount = Math.max(1, laneEnds.length)
  for (const [, v] of map) v.laneCount = laneCount
  return map
}

/** Faixas “dia inteiro” / multi-dia visíveis na semana ou na linha da grade mensal. */
export function buildAllDayStripPlacements(
  events: DbEvent[],
  displayDayKeys: string[],
  isStripEvent: (ev: DbEvent) => boolean = isAllDayOrMultiDayBlock,
): AllDayStripPlacement[] {
  const keyToCol = new Map(displayDayKeys.map((k, i) => [k, i]))
  const colCount = displayDayKeys.length
  const segments: ColSeg[] = []

  const firstKey = displayDayKeys[0]
  const lastKey = displayDayKeys[displayDayKeys.length - 1]
  const seenGoogleIds = new Set<string>()
  const seenLocalIds = new Set<string>()

  for (const ev of events) {
    if (!isStripEvent(ev)) continue
    if (seenLocalIds.has(ev.id)) continue
    if (ev.googleEventId) {
      if (seenGoogleIds.has(ev.googleEventId)) continue
      seenGoogleIds.add(ev.googleEventId)
    }
    seenLocalIds.add(ev.id)
    const startKey = dayKeyFromIso(ev.startTime)
    const endKey = inclusiveEndDayKey(ev)
    if (endKey < firstKey! || startKey > lastKey!) continue

    let s: number
    if (keyToCol.has(startKey)) s = keyToCol.get(startKey)!
    else if (startKey < firstKey!) s = 0
    else continue

    let e: number
    if (keyToCol.has(endKey)) e = keyToCol.get(endKey)!
    else if (endKey > lastKey!) e = colCount - 1
    else continue

    if (s > e) continue
    segments.push({ id: ev.id, startCol: s, endCol: e })
  }

  const lanes = assignColLanes(segments)
  const out: AllDayStripPlacement[] = []
  for (const seg of segments) {
    const lane = lanes.get(seg.id)
    if (!lane) continue
    out.push({
      eventId: seg.id,
      startCol: seg.startCol,
      endCol: seg.endCol,
      lane: lane.lane,
      laneCount: lane.laneCount,
    })
  }
  return out
}
