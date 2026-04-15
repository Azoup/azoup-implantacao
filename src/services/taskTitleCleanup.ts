import { db } from '../db/database'

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripLeadingTaskCode(text: string, code: string): string {
  const cleanCode = code.trim()
  if (!cleanCode) return text
  const escaped = escapeRegex(cleanCode)
  const rx = new RegExp(`^(?:\\s*${escaped}\\s*[-–—:.)]?\\s*)+`, 'i')
  return text.replace(rx, '').trim()
}

/**
 * Remove códigos legados no início de título/descrição quando o código já está em `task.code`.
 * Ex.: "0.3 - 0.3 Reunião de alinhamento" -> "Reunião de alinhamento"
 */
export async function cleanupLegacyTaskCodePrefixes(): Promise<number> {
  const tasks = await db.tasks.toArray()
  let changed = 0

  await db.transaction('rw', db.tasks, async () => {
    for (const task of tasks) {
      const code = task.code?.trim()
      if (!code) continue

      const nextTitle = stripLeadingTaskCode(task.title ?? '', code)
      const nextDescription = stripLeadingTaskCode(task.description ?? '', code)
      const shouldUpdate = nextTitle !== task.title || nextDescription !== task.description
      if (!shouldUpdate) continue

      await db.tasks.update(task.id, {
        title: nextTitle || task.title,
        description: nextDescription || task.description,
      })
      changed += 1
    }
  })

  return changed
}
