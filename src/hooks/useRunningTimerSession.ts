import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { DbTimeSession } from '../db/types'
import { getRunningSessionForUser } from '../services/timeSessions'
import { formatClockHmsFromSeconds } from '../lib/durationFormat'

/** Formato relógio 00:00:00 (cronômetro ao vivo). */
export function formatDurationHMS(totalSeconds: number): string {
  return formatClockHmsFromSeconds(totalSeconds)
}

/** Sessão de cronômetro ativa do usuário + segundos decorridos (atualiza a cada 1s). */
export function useRunningTimerSession(userId: string | null | undefined) {
  const running = useLiveQuery(
    async () => {
      if (!userId) return null
      return getRunningSessionForUser(userId)
    },
    [userId],
  ) as DbTimeSession | null | undefined

  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setTick((x) => x + 1), 1000)
    return () => window.clearInterval(id)
  }, [running?.id])

  const liveSeconds = useMemo(() => {
    void tick
    if (!running?.startedAt) return 0
    return Math.max(0, Math.floor((Date.now() - new Date(running.startedAt).getTime()) / 1000))
  }, [running, tick])

  return { running: running ?? null, liveSeconds }
}
