import { db } from '../db/database'
import type { DbTask } from '../db/types'
import { formatDurationHmFromHours } from '../lib/durationFormat'
import { addTaskTimeLog } from './timeLogs'
import { addManualTimeSession } from './timeSessions'
import { setTaskStatus } from './tasks'

const HOUR_EPS = 1 / 3600 // > 1s de diferença em “horas”

export type TaskConcludeUi = {
  requestConfirm: (opts: {
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    dismissLabel?: string
  }) => Promise<boolean | null>
  requestDestructiveWithReason: (opts: {
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    reasonLabel: string
    reasonPlaceholder?: string
    reasonMinLength: number
  }) => Promise<string | null>
}

/**
 * Conclui tarefa operacional com checagens de horas:
 * - 0h lançadas + previsto > 0: consumir previsto (sessão manual) ou concluir sem consumo + log (timeLog 0h).
 * - Tempo realizado ≠ previsto (ambos > 0): aviso único antes de concluir.
 */
export async function concludeOperationalTaskWithHourGuards(
  task: DbTask,
  informational: boolean,
  actorUserId: string,
  ui: TaskConcludeUi,
): Promise<'completed' | 'cancelled'> {
  if (informational) {
    await setTaskStatus(task.id, 'concluida', actorUserId)
    return 'completed'
  }

  const fresh = await db.tasks.get(task.id)
  const t = fresh ?? task
  const actual = Number.isFinite(t.actualHours) ? t.actualHours : 0
  const est = Number.isFinite(t.estimatedHours) ? t.estimatedHours : 0
  const actualSec = Math.round(actual * 3600)
  const estSec = Math.round(est * 3600)

  const hasActual = actualSec > 0
  const hasEst = estSec > 0

  if (hasActual && hasEst && Math.abs(actual - est) > HOUR_EPS) {
    const ok = await ui.requestConfirm({
      title: 'Tempo diferente do previsto',
      message: `Realizado ${formatDurationHmFromHours(actual)} · previsto ${formatDurationHmFromHours(est)}. Deseja concluir mesmo assim?`,
      confirmLabel: 'Concluir',
      cancelLabel: 'Cancelar',
    })
    if (ok !== true) return 'cancelled'
  }

  if (!hasActual) {
    if (hasEst) {
      const consume = await ui.requestConfirm({
        title: 'Nenhuma hora lançada',
        message: `Esta tarefa está com ${formatDurationHmFromHours(0)} registradas. Deseja consumir o previsto de ${formatDurationHmFromHours(est)} ao concluir? Será criado um lançamento manual com esse tempo.`,
        confirmLabel: `Consumir ${formatDurationHmFromHours(est)}`,
        cancelLabel: 'Não consumir',
        dismissLabel: 'Voltar',
      })
      if (consume === null) return 'cancelled'
      if (consume === true) {
        try {
          await addManualTimeSession({
            taskId: t.id,
            userId: actorUserId,
            hours: est,
            notes: 'Consumo ao concluir: horas previstas aplicadas (não havia tempo registrado).',
          })
        } catch (e) {
          throw e instanceof Error ? e : new Error('Não foi possível lançar as horas previstas.')
        }
        await setTaskStatus(t.id, 'concluida', actorUserId)
        return 'completed'
      }
      const justification = await ui.requestDestructiveWithReason({
        title: 'Concluir sem consumo de horas',
        message:
          'A tarefa permanecerá com 0h de tempo. Informe a justificativa — será registrada no histórico de lançamentos (log executado com 0h).',
        confirmLabel: 'Concluir com log',
        cancelLabel: 'Cancelar',
        reasonLabel: 'Justificativa',
        reasonPlaceholder: 'Descreva por que conclui sem consumir as horas previstas.',
        reasonMinLength: 12,
      })
      if (!justification) return 'cancelled'
      await addTaskTimeLog({
        taskId: t.id,
        userId: actorUserId,
        hours: 0,
        logType: 'executado',
        executionDate: new Date().toISOString(),
        notes: `[Conclusão sem consumo de horas] ${justification.trim()}`,
      })
      await setTaskStatus(t.id, 'concluida', actorUserId)
      return 'completed'
    }
    const okBare = await ui.requestConfirm({
      title: 'Concluir sem tempo',
      message: 'Sem horas previstas e sem tempo lançado nesta tarefa. Deseja marcar como concluída mesmo assim?',
      confirmLabel: 'Concluir',
      cancelLabel: 'Cancelar',
    })
    if (okBare !== true) return 'cancelled'
    await setTaskStatus(t.id, 'concluida', actorUserId)
    return 'completed'
  }

  await setTaskStatus(t.id, 'concluida', actorUserId)
  return 'completed'
}
