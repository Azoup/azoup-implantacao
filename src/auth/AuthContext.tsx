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
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { mapProfileToUser, type ProfileRow } from './mapProfileToUser'
import { refreshSupabaseDexieCache } from '../sync/supabaseDexieBridge'
import { startLiveSyncAfterBridgeReady, stopLiveSyncOnLogout } from '../sync/liveSyncController'
import { cleanupLegacyTaskCodePrefixes } from '../services/taskTitleCleanup'

const SESSION_KEY = 'vyntask_session_v1'

type Session = { userId: string; issuedAt: string }

export type AuthMode = 'supabase' | 'dexie'

type AuthContextValue = {
  ready: boolean
  authMode: AuthMode
  user: DbUser | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsEmailConfirmation: boolean }>
  requestPasswordReset: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
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

async function fetchProfileUser(userId: string): Promise<DbUser | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,name,role,permissions,status,created_at,last_login_at')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) return null
  const u = mapProfileToUser(data as ProfileRow)
  if (u.status !== 'active') return null
  return u
}

async function touchLastLogin(userId: string) {
  if (!supabase) return
  await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', userId)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const useSb = isSupabaseConfigured() && supabase !== null
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<DbUser | null>(null)

  const loadDexieUser = useCallback(async (userId: string) => {
    const u = await db.users.get(userId)
    if (u && u.status === 'active') setUser(u)
    else {
      setUser(null)
      writeSession(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let subscription: { unsubscribe: () => void } | null = null

    ;(async () => {
      try {
        await ensureDatabase()
        if (cancelled) return

        if (useSb && supabase) {
          const client = supabase
          writeSession(null)
          const {
            data: { session },
          } = await client.auth.getSession()
          if (cancelled) return
          if (session?.user) {
            const u = await fetchProfileUser(session.user.id)
            if (cancelled) return
            if (u) {
              setUser(u)
              try {
                await refreshSupabaseDexieCache()
                await cleanupLegacyTaskCodePrefixes()
                await startLiveSyncAfterBridgeReady()
              } catch (err) {
                console.warn('[Auth] Falha ao sincronizar cache Supabase/Dexie no bootstrap.', err)
              }
            } else {
              stopLiveSyncOnLogout()
              await client.auth.signOut()
              setUser(null)
            }
          } else {
            stopLiveSyncOnLogout()
            setUser(null)
          }
          if (!cancelled) setReady(true)

          const { data } = client.auth.onAuthStateChange(async (event, session) => {
            if (cancelled) return
            if (event === 'SIGNED_OUT' || !session?.user) {
              stopLiveSyncOnLogout()
              setUser(null)
              return
            }
            const u = await fetchProfileUser(session.user.id)
            if (cancelled) return
            if (u) {
              setUser(u)
              try {
                stopLiveSyncOnLogout()
                await refreshSupabaseDexieCache()
                await cleanupLegacyTaskCodePrefixes()
                await startLiveSyncAfterBridgeReady()
              } catch (err) {
                console.warn('[Auth] Falha ao sincronizar cache Supabase/Dexie após auth change.', err)
              }
            } else {
              stopLiveSyncOnLogout()
              await client.auth.signOut()
              setUser(null)
            }
          })
          subscription = data.subscription
        } else {
          const s = readSession()
          if (s?.userId) await loadDexieUser(s.userId)
          await cleanupLegacyTaskCodePrefixes()
          if (!cancelled) setReady(true)
        }
      } catch (err) {
        console.error('[Auth] Falha no bootstrap de autenticação.', err)
        if (!cancelled) {
          setUser(null)
          setReady(true)
        }
      }
    })()

    return () => {
      cancelled = true
      subscription?.unsubscribe()
    }
  }, [useSb, loadDexieUser])

  /** Após muito tempo em segundo plano o access token pode expirar; revalidar ao voltar à aba reduz falhas em gravar/excluir. */
  useEffect(() => {
    if (!useSb || !supabase) return
    const client = supabase
    const onVis = () => {
      if (document.visibilityState !== 'visible') return
      void (async () => {
        try {
          const {
            data: { session },
          } = await client.auth.getSession()
          if (!session) return
          const expMs = session.expires_at ? session.expires_at * 1000 : null
          const skewMs = 120_000
          if (expMs != null && expMs < Date.now() + skewMs) {
            const { error } = await client.auth.refreshSession()
            if (error) console.warn('[Auth] refreshSession ao focar a aba:', error.message)
          }
        } catch (e) {
          console.warn('[Auth] Falha ao revalidar sessão ao focar a aba.', e)
        }
      })()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [useSb])

  const login = useCallback(
    async (email: string, password: string) => {
      const normalized = email.trim().toLowerCase()
      if (useSb && supabase) {
        const { error } = await supabase.auth.signInWithPassword({ email: normalized, password })
        if (error) throw new Error(error.message || 'Falha no login.')
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.user) throw new Error('Sessão não iniciada.')
        const u = await fetchProfileUser(session.user.id)
        if (!u) {
          await supabase.auth.signOut()
          throw new Error('Perfil indisponível ou inativo.')
        }
        await touchLastLogin(session.user.id)
        setUser({ ...u, lastLogin: new Date().toISOString() })
        await refreshSupabaseDexieCache()
        await cleanupLegacyTaskCodePrefixes()
        await startLiveSyncAfterBridgeReady()
        return
      }

      await ensureDatabase()
      const u = await db.users.where('email').equals(normalized).first()
      if (!u || u.status !== 'active') throw new Error('Credenciais inválidas.')
      const hash = u.passwordHash
      if (!hash) throw new Error('Credenciais inválidas.')
      const ok = await verifyPassword(normalized, password, hash)
      if (!ok) throw new Error('Credenciais inválidas.')
      await db.users.update(u.id, { lastLogin: new Date().toISOString() })
      writeSession({ userId: u.id, issuedAt: new Date().toISOString() })
      setUser({ ...u, lastLogin: new Date().toISOString() })
    },
    [useSb],
  )

  const logout = useCallback(async () => {
    stopLiveSyncOnLogout()
    writeSession(null)
    setUser(null)
    if (useSb && supabase) await supabase.auth.signOut()
  }, [useSb])

  const refreshUser = useCallback(async () => {
    if (useSb && supabase) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        const u = await fetchProfileUser(session.user.id)
        setUser(u)
      } else {
        setUser(null)
      }
      return
    }
    const s = readSession()
    if (s?.userId) await loadDexieUser(s.userId)
  }, [useSb, loadDexieUser])

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      if (!useSb || !supabase) throw new Error('Cadastro requer Supabase configurado.')
      const normalized = email.trim().toLowerCase()
      const { data, error } = await supabase.auth.signUp({
        email: normalized,
        password,
        options: {
          data: { full_name: fullName.trim() },
        },
      })
      if (error) throw new Error(error.message || 'Falha no cadastro.')
      const needsEmailConfirmation = !data.session
      return { needsEmailConfirmation }
    },
    [useSb],
  )

  const requestPasswordReset = useCallback(
    async (email: string) => {
      if (!useSb || !supabase) throw new Error('Recuperação de senha requer Supabase configurado.')
      const redirectTo = `${window.location.origin}/auth/redefinir-senha`
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo,
      })
      if (error) throw new Error(error.message || 'Não foi possível enviar o e-mail.')
    },
    [useSb],
  )

  const updatePassword = useCallback(
    async (newPassword: string) => {
      if (!useSb || !supabase) throw new Error('Redefinição requer Supabase configurado.')
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw new Error(error.message || 'Não foi possível atualizar a senha.')
    },
    [useSb],
  )

  const authMode: AuthMode = useSb ? 'supabase' : 'dexie'

  const value = useMemo(
    () => ({
      ready,
      authMode,
      user,
      login,
      logout,
      refreshUser,
      signUp,
      requestPasswordReset,
      updatePassword,
    }),
    [
      ready,
      authMode,
      user,
      login,
      logout,
      refreshUser,
      signUp,
      requestPasswordReset,
      updatePassword,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora de AuthProvider')
  return ctx
}
