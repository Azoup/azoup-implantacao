import type { KanbanColumn } from '../db/types'
import { phaseProgressionAccent } from './phaseProgression'

export type KanbanColumnDef = {
  id: KanbanColumn
  title: string
  /** Cor da barra superior da coluna (hex) */
  accent: string
}

export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  { id: 'novos', title: 'Fase 00 · Novos clientes', accent: phaseProgressionAccent(0) },
  { id: 'fase_01', title: 'Fase 01', accent: phaseProgressionAccent(1) },
  { id: 'fase_02', title: 'Fase 02', accent: phaseProgressionAccent(2) },
  { id: 'fase_03', title: 'Fase 03', accent: phaseProgressionAccent(3) },
  { id: 'fase_04', title: 'Fase 04', accent: phaseProgressionAccent(4) },
  { id: 'finalizados', title: 'Concluídos', accent: '#14b8a6' },
  { id: 'cancelados', title: 'Cancelados', accent: '#ef4444' },
]
