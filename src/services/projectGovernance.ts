import { db } from '../db/database'
import type { KanbanColumn, ProjectStatus } from '../db/types'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { updateProjectPartialInSupabase, withDexieSupabaseSyncMuted } from '../sync/supabaseDexieBridge'

export function normalizeProjectPlacement(input: {
  status: ProjectStatus
  kanbanColumn: KanbanColumn
}): { status: ProjectStatus; kanbanColumn: KanbanColumn } {
  const { status, kanbanColumn } = input

  /** Situação explícita (ex.: formulário de edição) tem prioridade sobre colunas “terminais” antigas. */
  if (status === 'finalizado') {
    return { status: 'finalizado', kanbanColumn: 'finalizados' }
  }
  if (status === 'cancelado') {
    return { status: 'cancelado', kanbanColumn: 'cancelados' }
  }
  if (status === 'ativo' || status === 'inadimplente' || status === 'congelado') {
    if (kanbanColumn === 'cancelados' || kanbanColumn === 'finalizados') {
      return { status, kanbanColumn: 'novos' }
    }
    return { status, kanbanColumn }
  }

  if (kanbanColumn === 'finalizados') {
    return { status: 'finalizado', kanbanColumn: 'finalizados' }
  }
  if (kanbanColumn === 'cancelados') {
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
    await withDexieSupabaseSyncMuted(async () => {
      await updateProjectPartialInSupabase(projectId, normalized)
      await db.projects.update(projectId, normalized)
    })
  } else {
    await db.projects.update(projectId, normalized)
  }
}

