import type { DbEvent } from '../db/types'

/**
 * Escolhe o evento `agendado` mais relevante para uma tarefa (em andamento no horário,
 * depois o próximo futuro, senão o mais recente no passado ainda marcado como agendado).
 */
export function getPrimaryScheduledEventForTask(events: readonly DbEvent[], taskId: string): DbEvent | null {
  const candidates = events.filter((e) => e.taskId === taskId && e.status === 'agendado')
  if (candidates.length === 0) return null
  const sorted = [...candidates].sort((a, b) => a.startTime.localeCompare(b.startTime))
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
