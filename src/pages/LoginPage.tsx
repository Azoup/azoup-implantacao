import { FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { VyntaskLogo } from '../components/VyntaskLogo'

export function LoginPage() {
  const { ready, user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@azoup.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!ready) {
    return (
      <div className="boot">
        <div className="boot__inner">Inicializando banco local…</div>
      </div>
    )
  }

  if (user) return <Navigate to="/dashboard" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__brand">
          <span className="auth__brand-mark vyntask-logo-wrap">
            <VyntaskLogo variant="brand" size={44} aria-hidden />
          </span>
          <div>
            <h1 className="auth__title">
              <span className="auth__title-accent">Vyn</span>Task
            </h1>
            <p className="auth__subtitle">Central operacional de implantação — sessão local</p>
          </div>
        </div>
        <form className="auth__form" onSubmit={onSubmit}>
          <label className="field">
            <span>E-mail</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error ? <p className="auth__error">{error}</p> : null}
          <button type="submit" className="btn btn--primary btn--block" disabled={loading || !ready}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="auth__hint">Admin padrão: admin@azoup.com / Azoup@2026</p>
        <p className="auth__footer-link">
          <Link to="/apresentacoes">Apresentações dos planos (clientes)</Link>
        </p>
      </div>
    </div>
  )
}
