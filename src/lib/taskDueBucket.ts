import { addWeeks, endOfWeek } from 'date-fns'
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'
import { APP_TZ } from './dates'

export type DueBucket = 'vencidas' | 'hoje' | 'esta_semana' | 'proxima_semana' | 'futuro' | 'sem_prazo'

export const DUE_BUCKET_ORDER: DueBucket[] = [
  'vencidas',
  'hoje',
  'esta_semana',
  'proxima_semana',
  'futuro',
  'sem_prazo',
]

export const DUE_BUCKET_LABELS: Record<DueBucket, string> = {
  vencidas: 'Vencidas',
  hoje: 'Hoje',
  esta_semana: 'Esta semana',
  proxima_semana: 'Próxima semana',
  futuro: 'Depois',
  sem_prazo: 'Sem prazo',
}

/** Tarefas com estes status entram no quadro por prazo (foco em execução). */
export function isTaskActiveForPrazoBoard(status: string): boolean {
  return status === 'pendente' || status === 'em_andamento'
}

/**
 * Classifica pelo vencimento no fuso APP_TZ. Sem prazo se null/vazio.
 * Segunda-feira = início da semana (pt-BR comum).
 */
export function classifyDueBucket(dueDateIso: string | null | undefined, now = new Date()): DueBucket {
  if (!dueDateIso?.trim()) return 'sem_prazo'

  const todayStr = formatInTimeZone(now, APP_TZ, 'yyyy-MM-dd')
  const dueStr = formatInTimeZone(new Date(dueDateIso), APP_TZ, 'yyyy-MM-dd')

  if (dueStr < todayStr) return 'vencidas'
  if (dueStr === todayStr) return 'hoje'

  const nowZ = toZonedTime(now, APP_TZ)
  const endThisWeek = endOfWeek(nowZ, { weekStartsOn: 1 })
  const endThisStr = formatInTimeZone(endThisWeek, APP_TZ, 'yyyy-MM-dd')
  if (dueStr <= endThisStr) return 'esta_semana'

  const nextWeekAnchor = addWeeks(nowZ, 1)
  const endNextWeek = endOfWeek(nextWeekAnchor, { weekStartsOn: 1 })
  const endNextStr = formatInTimeZone(endNextWeek, APP_TZ, 'yyyy-MM-dd')
  if (dueStr <= endNextStr) return 'proxima_semana'

  return 'futuro'
}
