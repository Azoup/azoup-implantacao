import type { KanbanColumn } from '../db/types'
import { phaseProgressionAccent } from './phaseProgression'

export type KanbanColumnDef = {
  id: KanbanColumn
  /** Título na coluna do quadro (com contexto). */
  title: string
  /** Rótulo curto para o select do cartão e textos compactos (evita truncamento). */
  titleCompact: string
  /** Cor da barra superior da coluna (hex) */
  accent: string
}

export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  {
    id: 'novos',
    /** Única coluna com subtítulo “humano”: entrada no funil; o restante usa só o número (igual à ordem em Fases e tarefas). */
    title: 'Fase 00 · Novos clientes',
    titleCompact: 'Fase 00',
    accent: phaseProgressionAccent(0),
  },
  {
    id: 'fase_01',
    title: 'Fase 01',
    titleCompact: 'Fase 01',
    accent: phaseProgressionAccent(1),
  },
  {
    id: 'fase_02',
    title: 'Fase 02',
    titleCompact: 'Fase 02',
    accent: phaseProgressionAccent(2),
  },
  {
    id: 'fase_03',
    title: 'Fase 03',
    titleCompact: 'Fase 03',
    accent: phaseProgressionAccent(3),
  },
  {
    id: 'fase_04',
    title: 'Fase 04',
    titleCompact: 'Fase 04',
    accent: phaseProgressionAccent(4),
  },
  { id: 'finalizados', title: 'Concluídos', titleCompact: 'Concluídos', accent: '#14b8a6' },
  { id: 'congelados', title: 'Congelados', titleCompact: 'Congelados', accent: '#38bdf8' },
  { id: 'inadimplentes', title: 'Inadimplentes', titleCompact: 'Inadimpl.', accent: '#f59e0b' },
  { id: 'cancelados', title: 'Cancelados', titleCompact: 'Cancelados', accent: '#ef4444' },
]

/** Título para cabeçalho de coluna / leitura completa. */
export function kanbanColumnTitleFull(id: KanbanColumn): string {
  return KANBAN_COLUMNS.find((c) => c.id === id)?.title ?? id
}

/** Rótulo curto (select, modal, tooltips). */
export function kanbanColumnTitleCompact(id: KanbanColumn): string {
  return KANBAN_COLUMNS.find((c) => c.id === id)?.titleCompact ?? id
}
