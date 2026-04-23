import { describe, expect, it } from 'vitest'
import { mapProfileToUser } from './mapProfileToUser'

describe('mapProfileToUser', () => {
  it('mapeia admin, ativo e tipo interno', () => {
    const u = mapProfileToUser({
      id: 'u1',
      email: 'a@b.com',
      name: 'Ana',
      role: 'admin',
      permissions: null,
      status: 'active',
      created_at: '2020-01-01T00:00:00.000Z',
      last_login_at: null,
    })
    expect(u.id).toBe('u1')
    expect(u.role).toBe('admin')
    expect(u.status).toBe('active')
    expect(u.userType).toBe('internal')
    expect(u.permissions).toBeNull()
  })

  it('mapeia cliente e pendente', () => {
    const u = mapProfileToUser({
      id: 'c1',
      email: 'c@b.com',
      name: 'Cliente',
      role: 'user',
      user_type: 'client',
      permissions: [],
      status: 'pending',
      created_at: '2021-06-15T00:00:00.000Z',
      last_login_at: '2022-01-01T12:00:00.000Z',
    })
    expect(u.userType).toBe('client')
    expect(u.status).toBe('pending')
    expect(u.lastLogin).toBe('2022-01-01T12:00:00.000Z')
  })

  it('filtra permissões inválidas', () => {
    const u = mapProfileToUser({
      id: 'x',
      email: 'x@b.com',
      name: 'X',
      role: 'user',
      permissions: ['dashboard.view', 'invalid.scope', 'projects.view'],
      status: 'active',
      created_at: '2020-01-01T00:00:00.000Z',
      last_login_at: null,
    })
    expect(u.permissions).toEqual(['dashboard.view', 'projects.view'])
  })
})
