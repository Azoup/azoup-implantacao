import type { TaskPriority, TaskStatus } from '../db/types'

export const TASK_STATUS_OPTIONS: TaskStatus[] = ['pendente', 'em_andamento', 'concluida', 'cancelado']
export const TASK_PRIORITY_OPTIONS: TaskPriority[] = ['baixa', 'media', 'alta']
