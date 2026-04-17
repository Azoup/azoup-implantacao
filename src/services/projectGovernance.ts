import { db } from '../db/database'
import type { DbProject, KanbanColumn, ProjectStatus } from '../db/types'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { upsertProjectToSupabase } from '../sync/supabaseDexieBridge'

export function normalizeProjectPlacement(input: {
  status: ProjectStatus
  kanbanColumn: KanbanColumn
}): { status: ProjectStatus; kanbanColumn: KanbanColumn } {
  const { status, kanbanColumn } = input

  if (status === 'finalizado' || kanbanColumn === 'finalizados') {
    return { status: 'finalizado', kanbanColumn: 'finalizados' }
  }
  if (status === 'cancelado' || kanbanColumn === 'cancelados') {
    return { status: 'cancelado', kanbanColumn: 'cancelados' }
  }
  return { status, kanbanColumn }
}

export async function updateProjectPlacement(projectId: string, next: {
  status?: ProjectStatus
  kanbanColumn?: KanbanColumn
}): Promise<void> {
  const current = await db.projects.get(projectId)
  if (!current) throw new Error('Projeto não encontrado.')
  const normalized = normalizeProjectPlacement({
    status: next.status ?? current.status,
    kanbanColumn: next.kanbanColumn ?? current.kanbanColumn,
  })
  if (isSupabaseConfigured()) {
    const merged: DbProject = { ...current, ...normalized }
    await upsertProjectToSupabase(merged)
  }
  await db.projects.update(projectId, normalized)
}

