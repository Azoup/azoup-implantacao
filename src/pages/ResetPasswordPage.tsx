import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { AuthCardShell } from '../components/auth/AuthCardShell'

export function ResetPasswordPage() {
  const { ready, authMode, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionOk, setSessionOk] = useState<boolean | null>(null)

  useEffect(() => {
    if (!ready) return
    if (!isSupabaseConfigured() || !supabase) {
      setSessionOk(false)
      return
    }
    let cancelled = false
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) setSessionOk(!!session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (
        event === 'INITIAL_SESSION' ||
        event === 'PASSWORD_RECOVERY' ||
        event === 'SIGNED_IN'
      ) {
        setSessionOk(!!session)
      }
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [ready])

  if (!ready || sessionOk === null) {
    return (
      <div className="boot">
        <div className="boot__inner">Carregando…</div>
      </div>
    )
  }

  if (authMode !== 'supabase' || !sessionOk) {
    return (
      <AuthCardShell subtitle="Redefinir senha">
        <p className="auth__error" style={{ margin: 0 }}>
          Link inválido, expirado ou sessão ausente. Solicite um novo e-mail em &quot;Esqueci minha senha&quot;.
        </p>
        <p className="auth__footer-link">
          <Link to="/recuperar-senha">Pedir novo link</Link>
          {' · '}
          <Link to="/login">Login</Link>
        </p>
      </AuthCardShell>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== password2) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('Use pelo menos 6 caracteres.')
      return
    }
    setLoading(true)
    try {
      await updatePassword(password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar a senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCardShell subtitle="Nova senha">
      <form className="auth__form" onSubmit={onSubmit}>
        <label className="field">
          <span>Nova senha</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        <label className="field">
          <span>Confirmar senha</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
            minLength={6}
          />
        </label>
        {error ? <p className="auth__error">{error}</p> : null}
        <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
          {loading ? 'Salvando…' : 'Salvar senha'}
        </button>
      </form>
      <p className="auth__footer-link">
        <Link to="/login">Cancelar</Link>
      </p>
    </AuthCardShell>
  )
}
