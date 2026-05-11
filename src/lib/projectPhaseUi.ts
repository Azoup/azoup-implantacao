import type { DbPhase, DbTask, ProjectStatus } from '../db/types'
import { compareTaskCode } from './taskCode'

export type PhaseSegmentState = 'done' | 'current' | 'future'

export function statusLabelPt(status: ProjectStatus): string {
  const m: Record<ProjectStatus, string> = {
    ativo: 'Em andamento',
    inadimplente: 'Inadimplente',
    congelado: 'Congelado',
    finalizado: 'Finalizado',
    cancelado: 'Cancelado',
  }
  return m[status] ?? status
}

function phaseTasksComplete(tasks: DbTask[], projectId: string, phaseId: string): boolean {
  const ts = tasks.filter((t) => t.projectId === projectId && t.phaseId === phaseId)
  if (ts.length === 0) return false
  return ts.every((t) => t.status === 'concluida')
}

/** Segmentos da barra por fase: verde concluída, laranja atual, cinza futura. */
export function getPhaseSegments(
  phases: DbPhase[],
  tasks: DbTask[],
  projectId: string,
): { segments: PhaseSegmentState[]; currentPhaseName: string | null } {
  const ph = phases
    .filter((p) => p.projectId === projectId)
    .sort((a, b) => a.orderIndex - b.orderIndex)
  if (ph.length === 0) return { segments: [], currentPhaseName: null }

  let currentIdx = -1
  for (let i = 0; i < ph.length; i++) {
    if (!phaseTasksComplete(tasks, projectId, ph[i].id)) {
      currentIdx = i
      break
    }
  }

  const segments: PhaseSegmentState[] = ph.map((_, i) => {
    if (currentIdx === -1) return 'done'
    if (i < currentIdx) return 'done'
    if (i === currentIdx) return 'current'
    return 'future'
  })

  const currentPhaseName =
    currentIdx >= 0 ? ph[currentIdx].name : 'Todas as fases concluídas'

  return { segments, currentPhaseName }
}

export type TaskCodeBadge = { code: string; tone: 'progress' | 'pending' }

/** Pills com códigos de tarefas abertas na fase atual (e, se faltar, próximas). */
export function getOpenTaskCodeBadges(
  phases: DbPhase[],
  tasks: DbTask[],
  projectId: string,
  max = 8,
): TaskCodeBadge[] {
  const ph = phases
    .filter((p) => p.projectId === projectId)
    .sort((a, b) => a.orderIndex - b.orderIndex)
  if (ph.length === 0) return []

  const { segments } = getPhaseSegments(phases, tasks, projectId)
  const currentIdx = segments.findIndex((s) => s === 'current')
  const order =
    currentIdx >= 0
      ? [
          ...ph.slice(currentIdx).map((p) => p.id),
          ...ph.slice(0, currentIdx).map((p) => p.id),
        ]
      : ph.map((p) => p.id)

  const open = (tid: string) =>
    tasks.filter(
      (t) =>
        t.projectId === projectId &&
        t.phaseId === tid &&
        (t.status === 'pendente' || t.status === 'em_andamento'),
    )

  const out: TaskCodeBadge[] = []
  for (const pid of order) {
    const list = open(pid).sort((a, b) => compareTaskCode(a.code, b.code) || a.sortOrder - b.sortOrder)
    for (const t of list) {
      if (out.length >= max) return out
      out.push({
        code: t.code,
        tone: t.status === 'em_andamento' ? 'progress' : 'pending',
      })
    }
  }
  return out
}
