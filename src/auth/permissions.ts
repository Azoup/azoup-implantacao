import type { DbUser, PermissionScope, UserRole } from '../db/types'

export const ALL_PERMISSION_SCOPES: PermissionScope[] = [
  'dashboard.view',
  'overview.view',
  'projects.view',
  'projects.edit',
  'tasks.view',
  'tasks.edit',
  'agenda.view',
  'agenda.edit',
  'reports.view',
  'ai.view',
  'settings.view',
  'settings.edit',
  'planModels.view',
  'planModels.edit',
  'analysts.view',
  'analysts.edit',
]

export const PERMISSION_MODULES: { key: string; label: string; view: PermissionScope; edit?: PermissionScope }[] = [
  { key: 'dashboard', label: 'Dashboard', view: 'dashboard.view' },
  { key: 'overview', label: 'Visão Geral', view: 'overview.view' },
  { key: 'projects', label: 'Projetos', view: 'projects.view', edit: 'projects.edit' },
  { key: 'tasks', label: 'Tarefas', view: 'tasks.view', edit: 'tasks.edit' },
  { key: 'agenda', label: 'Agenda', view: 'agenda.view', edit: 'agenda.edit' },
  { key: 'reports', label: 'Relatórios', view: 'reports.view' },
  { key: 'ai', label: 'Assistente IA', view: 'ai.view' },
  { key: 'settings', label: 'Configurações', view: 'settings.view', edit: 'settings.edit' },
  { key: 'planModels', label: 'Modelos de Plano', view: 'planModels.view', edit: 'planModels.edit' },
  { key: 'analysts', label: 'Analistas', view: 'analysts.view', edit: 'analysts.edit' },
]

const USER_DEFAULT_SCOPES: PermissionScope[] = [
  'dashboard.view',
  'overview.view',
  'projects.view',
  'projects.edit',
  'tasks.view',
  'tasks.edit',
  'agenda.view',
  'agenda.edit',
  'reports.view',
  'ai.view',
  'settings.view',
]

export function defaultScopesForRole(role: UserRole): PermissionScope[] {
  if (role === 'admin') return [...ALL_PERMISSION_SCOPES]
  return [...USER_DEFAULT_SCOPES]
}

export function scopesForUser(user: Pick<DbUser, 'role' | 'permissions'> | null | undefined): PermissionScope[] {
  if (!user) return []
  const fallback = defaultScopesForRole(user.role)
  if (!user.permissions?.length) return fallback
  const valid = user.permissions.filter((s): s is PermissionScope =>
    (ALL_PERMISSION_SCOPES as string[]).includes(s),
  )
  return valid.length > 0 ? valid : fallback
}

export function hasScope(user: Pick<DbUser, 'role' | 'permissions'> | null | undefined, scope: PermissionScope): boolean {
  return scopesForUser(user).includes(scope)
}

