import type { DbEvent, DbTask } from '../../db/types'

const CUTOVER_TAGS = new Set([
  'virada',
  'virada_agendada',
  'virada_cancelada',
  'virada_concluida',
  'cutover',
  'cutover_scheduled',
  'cutover_cancelled',
  'cutover_completed',
  'go_live',
  'golive',
])

const CUTOVER_TEXT_HINTS = [/\bvirada\b/i, /\bcut\s?over\b/i, /\bgo\s?-?\s?live\b/i]

function normalizedEventTags(event: DbEvent): string[] {
  const maybeTags = (event as unknown as { tags?: unknown }).tags
  const tags = Array.isArray(maybeTags) ? maybeTags : []
  return tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean)
}

function looksLikeCutoverText(text: string | null | undefined): boolean {
  if (!text) return false
  const source = text.trim()
  if (!source) return false
  return CUTOVER_TEXT_HINTS.some((rx) => rx.test(source))
}

function isCommonOperationalEvent(text: string | null | undefined): boolean {
  if (!text) return false
  const source = text.trim()
  if (!source) return false
  return /\b(reuni[aã]o|daily|alinhamento|acompanhamento|suporte|treinamento|follow[\s-]?up)\b/i.test(source)
}

export function isCutoverEvent(event: DbEvent, taskById?: Map<string, DbTask>): boolean {
  const tags = normalizedEventTags(event)
  if (tags.some((tag) => CUTOVER_TAGS.has(tag))) return true

  const eventHasCutoverText = looksLikeCutoverText(event.title) || looksLikeCutoverText(event.description)
  if (eventHasCutoverText) return true

  if (!event.taskId || !taskById) return false
  const task = taskById.get(event.taskId)
  if (!task) return false

  if (isCommonOperationalEvent(event.title) || isCommonOperationalEvent(event.description)) return false

  return (
    looksLikeCutoverText(task.title) ||
    looksLikeCutoverText(task.description) ||
    looksLikeCutoverText(task.code)
  )
}
