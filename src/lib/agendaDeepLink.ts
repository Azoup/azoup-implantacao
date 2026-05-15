/**
 * Contrato de entrada na Agenda: query string (partilhável / refresh) + estado do router (atalhos internos).
 * Ver docs/ADR-001-agenda-contratos-navegacao-e-sync.md.
 */

export const AGENDA_QS_EDIT = 'editEvent'
export const AGENDA_QS_PREFILL_TASK = 'prefillTask'
export const AGENDA_QS_PREFILL_PROJECT = 'prefillProject'

export type AgendaLocationState = {
  prefillTaskId?: string
  prefillProjectId?: string
  editEventId?: string
}

export type AgendaNavIntent =
  | { kind: 'editEvent'; eventId: string }
  | { kind: 'prefillTask'; taskId: string; projectId: string | null }

export function parseAgendaIntentFromSearch(search: string): AgendaNavIntent | null {
  const raw = search.startsWith('?') ? search.slice(1) : search
  const sp = new URLSearchParams(raw)
  const edit = sp.get(AGENDA_QS_EDIT)?.trim()
  if (edit) return { kind: 'editEvent', eventId: edit }

  const task = sp.get(AGENDA_QS_PREFILL_TASK)?.trim()
  if (task) {
    const proj = sp.get(AGENDA_QS_PREFILL_PROJECT)?.trim()
    return { kind: 'prefillTask', taskId: task, projectId: proj || null }
  }
  return null
}

export function parseAgendaIntentFromRouterState(state: unknown): AgendaNavIntent | null {
  if (!state || typeof state !== 'object') return null
  const s = state as AgendaLocationState
  if (s.editEventId?.trim()) return { kind: 'editEvent', eventId: s.editEventId.trim() }
  if (s.prefillTaskId?.trim())
    return {
      kind: 'prefillTask',
      taskId: s.prefillTaskId.trim(),
      projectId: s.prefillProjectId?.trim() || null,
    }
  return null
}

/** Preferência: URL (partilhável), depois `location.state`. */
export function parseAgendaNavIntent(search: string, state: unknown): AgendaNavIntent | null {
  return parseAgendaIntentFromSearch(search) ?? parseAgendaIntentFromRouterState(state)
}

export function stripAgendaDeepLinkParams(search: string): string {
  const raw = search.startsWith('?') ? search.slice(1) : search
  const sp = new URLSearchParams(raw)
  sp.delete(AGENDA_QS_EDIT)
  sp.delete(AGENDA_QS_PREFILL_TASK)
  sp.delete(AGENDA_QS_PREFILL_PROJECT)
  const q = sp.toString()
  return q ? `?${q}` : ''
}

export function buildAgendaSearchFromIntent(intent: AgendaNavIntent): string {
  const sp = new URLSearchParams()
  if (intent.kind === 'editEvent') {
    sp.set(AGENDA_QS_EDIT, intent.eventId)
  } else {
    sp.set(AGENDA_QS_PREFILL_TASK, intent.taskId)
    if (intent.projectId) sp.set(AGENDA_QS_PREFILL_PROJECT, intent.projectId)
  }
  const q = sp.toString()
  return q ? `?${q}` : ''
}

/** Rota canónica da grade (deep links e atalhos internos). */
export const AGENDA_CALENDAR_PATH = '/agenda/calendario' as const

export function buildAgendaNavigateTo(intent: AgendaNavIntent): { pathname: string; search: string } {
  return { pathname: AGENDA_CALENDAR_PATH, search: buildAgendaSearchFromIntent(intent) }
}
