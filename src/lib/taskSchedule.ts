import type { DbEvent } from '../db/types'

/**
 * Escolhe o evento `agendado` mais relevante entre candidatos já escopados para a linha
 * (ex.: eventos mesclados de cadeia legada na UI): em andamento no horário,
 * depois o próximo futuro, senão o mais recente no passado ainda marcado como agendado.
 */
export function getPrimaryScheduledEventFromCandidates(candidates: readonly DbEvent[]): DbEvent | null {
  const scheduled = candidates.filter((e) => e.status === 'agendado')
  if (scheduled.length === 0) return null
  const sorted = [...scheduled].sort((a, b) => a.startTime.localeCompare(b.startTime))
  const now = Date.now()
  const inProgress = sorted.find((e) => {
    const s = new Date(e.startTime).getTime()
    const en = new Date(e.endTime).getTime()
    return s <= now && en > now
  })
  if (inProgress) return inProgress
  const upcoming = sorted.find((e) => new Date(e.startTime).getTime() > now)
  if (upcoming) return upcoming
  return sorted[sorted.length - 1] ?? null
}

export function getPrimaryScheduledEventForTask(events: readonly DbEvent[], taskId: string): DbEvent | null {
  return getPrimaryScheduledEventFromCandidates(events.filter((e) => e.taskId === taskId))
}
