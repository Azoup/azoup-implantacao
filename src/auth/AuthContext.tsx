import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { verifyPassword } from '../lib/password'
import { db } from '../db/database'
import { ensureDatabase } from '../db/init'
import type { DbUser } from '../db/types'

const SESSION_KEY = 'vyntask_session_v1'

type Session = { userId: string; issuedAt: string }

type AuthContextValue = {
  ready: boolean
  user: DbUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

function writeSession(s: Session | null) {
  if (!s) localStorage.removeItem(SESSION_KEY)
  else localStorage.setItem(SESSION_KEY, JSON.stringify(s))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<DbUser | null>(null)

  const loadUser = useCallback(async (userId: string) => {
    const u = await db.users.get(userId)
    if (u && u.status === 'active') setUser(u)
    else {
      setUser(null)
      writeSession(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await ensureDatabase()
      if (cancelled) return
      const s = readSession()
      if (s?.userId) await loadUser(s.userId)
      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [loadUser])

  const login = useCallback(async (email: string, password: string) => {
    await ensureDatabase()
    const normalized = email.trim().toLowerCase()
    const u = await db.users.where('email').equals(normalized).first()
    if (!u || u.status !== 'active') throw new Error('Credenciais inválidas.')
    const ok = await verifyPassword(normalized, password, u.passwordHash)
    if (!ok) throw new Error('Credenciais inválidas.')
    await db.users.update(u.id, { lastLogin: new Date().toISOString() })
    writeSession({ userId: u.id, issuedAt: new Date().toISOString() })
    setUser({ ...u, lastLogin: new Date().toISOString() })
  }, [])

  const logout = useCallback(() => {
    writeSession(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const s = readSession()
    if (s?.userId) await loadUser(s.userId)
  }, [loadUser])

  const value = useMemo(
    () => ({ ready, user, login, logout, refreshUser }),
    [ready, user, login, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora de AuthProvider')
  return ctx
}
