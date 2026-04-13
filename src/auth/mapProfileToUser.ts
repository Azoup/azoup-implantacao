import type { DbUser, PermissionScope, UserRole, UserStatus } from '../db/types'
import { ALL_PERMISSION_SCOPES } from './permissions'

const validScope = new Set<string>(ALL_PERMISSION_SCOPES)

/** Linha `public.profiles` retornada pelo cliente Supabase. */
export type ProfileRow = {
  id: string
  email: string
  name: string
  role: string
  permissions: string[] | null
  status: string
  created_at: string
  last_login_at: string | null
}

function toRole(r: string): UserRole {
  return r === 'admin' ? 'admin' : 'user'
}

function toStatus(s: string): UserStatus {
  return s === 'inactive' ? 'inactive' : 'active'
}

export function mapProfileToUser(row: ProfileRow): DbUser {
  const permissions =
    row.permissions?.filter((p): p is PermissionScope => validScope.has(p)) ?? null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: toRole(row.role),
    permissions: permissions?.length ? permissions : null,
    status: toStatus(row.status),
    createdAt: row.created_at,
    lastLogin: row.last_login_at,
  }
}
