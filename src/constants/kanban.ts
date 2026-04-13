import type { KanbanColumn } from '../db/types'

export type KanbanColumnDef = {
  id: KanbanColumn
  title: string
  /** Cor da barra superior da coluna (hex) */
  accent: string
}

export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  { id: 'novos', title: 'Fase 00 · Novos clientes', accent: '#c4713b' },
  { id: 'fase_01', title: 'Fase 01', accent: '#3b82f6' },
  { id: 'fase_02', title: 'Fase 02', accent: '#22c55e' },
  { id: 'fase_03', title: 'Fase 03', accent: '#a855f7' },
  { id: 'fase_04', title: 'Fase 04', accent: '#e879a9' },
  { id: 'finalizados', title: 'Concluídos', accent: '#14b8a6' },
  { id: 'cancelados', title: 'Cancelados', accent: '#ef4444' },
]
