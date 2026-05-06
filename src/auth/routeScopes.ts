import type { PermissionScope } from '../db/types'

export const ROUTE_SCOPE_MAP: Record<string, PermissionScope> = {
  '/dashboard': 'dashboard.view',
  '/visao-geral': 'overview.view',
  '/projetos': 'projects.view',
  '/projetos/:projectId': 'projects.view',
  '/implantacao': 'projects.view',
  '/tarefas': 'tasks.view',
  '/agenda': 'agenda.view',
  '/relatorios': 'reports.view',
  '/logs': 'reports.view',
  '/assistente': 'ai.view',
  '/configuracoes': 'settings.view',
  '/modelos-planos': 'planModels.view',
  '/analistas': 'analysts.view',
  '/manuais': 'manuals.view',
  '/portal': 'portal.view',
  '/portal/projetos/:projectId': 'portal.view',
  '/portal/agenda': 'portal.agenda.view',
  '/portal/boas-vindas/:projectId': 'portal.forms.fill',
}

