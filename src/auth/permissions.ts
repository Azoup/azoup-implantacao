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
  'manuals.view',
  'portal.view',
  'portal.agenda.view',
  'portal.forms.fill',
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
  { key: 'manuals', label: 'Manuais', view: 'manuals.view' },
  { key: 'portal', label: 'Portal Cliente', view: 'portal.view', edit: 'portal.forms.fill' },
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
  'manuals.view',
]

const CLIENT_DEFAULT_SCOPES: PermissionScope[] = [
  'portal.view',
  'portal.agenda.view',
  'portal.forms.fill',
]

export function defaultScopesForRole(role: UserRole): PermissionScope[] {
  if (role === 'admin') return [...ALL_PERMISSION_SCOPES]
  return [...USER_DEFAULT_SCOPES]
}

export function scopesForUser(user: Pick<DbUser, 'role' | 'permissions' | 'userType'> | null | undefined): PermissionScope[] {
  if (!user) return []
  const fallback = user.userType === 'client' ? CLIENT_DEFAULT_SCOPES : defaultScopesForRole(user.role)
  if (!user.permissions?.length) return fallback
  const valid = user.permissions.filter((s): s is PermissionScope =>
    (ALL_PERMISSION_SCOPES as string[]).includes(s),
  )
  return valid.length > 0 ? valid : fallback
}

export function hasScope(
  user: Pick<DbUser, 'role' | 'permissions' | 'userType'> | null | undefined,
  scope: PermissionScope,
): boolean {
  return scopesForUser(user).includes(scope)
}

/**
 * Manuais: `manuals.view` OU time interno com Projetos (evita item oculto quando o perfil no Supabase tem
 * lista explícita de scopes salva antes da existência de `manuals.view`).
 */
export function canAccessManuais(user: Pick<DbUser, 'role' | 'permissions' | 'userType'> | null | undefined): boolean {
  if (!user) return false
  if (hasScope(user, 'manuals.view')) return true
  if (user.userType !== 'client' && hasScope(user, 'projects.view')) return true
  return false
}

