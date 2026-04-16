import type { KanbanColumn } from '../db/types'
import { PHASE_PROGRESSION_ACCENTS } from './phaseProgression'

export type KanbanColumnDef = {
  id: KanbanColumn
  title: string
  /** Cor da barra superior da coluna (hex) */
  accent: string
}

export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  { id: 'novos', title: 'Fase 00 · Novos clientes', accent: PHASE_PROGRESSION_ACCENTS[0] },
  { id: 'fase_01', title: 'Fase 01', accent: PHASE_PROGRESSION_ACCENTS[1] },
  { id: 'fase_02', title: 'Fase 02', accent: PHASE_PROGRESSION_ACCENTS[2] },
  { id: 'fase_03', title: 'Fase 03', accent: PHASE_PROGRESSION_ACCENTS[3] },
  { id: 'fase_04', title: 'Fase 04', accent: PHASE_PROGRESSION_ACCENTS[4] },
  { id: 'finalizados', title: 'Concluídos', accent: '#14b8a6' },
  { id: 'cancelados', title: 'Cancelados', accent: '#ef4444' },
]
