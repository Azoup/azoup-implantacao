import type { PermissionScope } from '../db/types'

export const ROUTE_SCOPE_MAP: Record<string, PermissionScope> = {
  '/dashboard': 'dashboard.view',
  '/visao-geral': 'overview.view',
  '/projetos': 'projects.view',
  '/projetos/:projectId': 'projects.view',
  '/tarefas': 'tasks.view',
  '/agenda': 'agenda.view',
  '/relatorios': 'reports.view',
  '/logs': 'reports.view',
  '/assistente': 'ai.view',
  '/configuracoes': 'settings.view',
  '/modelos-planos': 'planModels.view',
  '/analistas': 'analysts.view',
}

