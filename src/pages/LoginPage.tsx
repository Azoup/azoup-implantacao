import { FormEvent, useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { VyntaskLogo } from '../components/VyntaskLogo'
import { APP_VERSION_DISPLAY } from '../constants/appMeta'

export function LoginPage() {
  const REMEMBER_EMAIL_KEY = 'vyntask_remember_email'
  const { ready, authMode, user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBER_EMAIL_KEY)
    if (remembered) {
      setEmail(remembered)
      setRememberMe(true)
    }
  }, [])

  if (!ready) {
    return (
      <div className="boot">
        <div className="boot__inner">
          {authMode === 'supabase' ? 'Carregando…' : 'Inicializando banco local…'}
        </div>
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
      if (rememberMe) localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim().toLowerCase())
      else localStorage.removeItem(REMEMBER_EMAIL_KEY)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login.')
    } finally {
      setLoading(false)
    }
  }

  const subtitle =
    authMode === 'supabase'
      ? 'Acesse sua conta'
      : 'Central operacional de implantação — sessão local'

  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__brand">
          <span className="auth__brand-mark vyntask-logo-wrap">
            <VyntaskLogo variant="brand" size={52} aria-hidden />
          </span>
          <div>
            <h1 className="auth__title">
              <span className="auth__title-accent">Vyn</span>Task
            </h1>
            <p className="auth__subtitle">{subtitle}</p>
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
            <div className="auth__password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth__password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          <label className="auth__remember">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Lembrar-me neste navegador</span>
          </label>
          {error ? <p className="auth__error">{error}</p> : null}
          <button type="submit" className="btn btn--primary btn--block" disabled={loading || !ready}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <nav className="auth__sub-links" aria-label="Outras opções de acesso">
          <Link to="/cadastro">Criar conta</Link>
          <Link to="/recuperar-senha">Esqueci minha senha</Link>
        </nav>
        {authMode !== 'supabase' ? (
          <p className="auth__hint">Modo local ativo. Cadastro e recuperação exigem Supabase configurado.</p>
        ) : null}
        <p className="auth__footer-link">
          <Link to="/apresentacoes">Apresentações dos planos (clientes)</Link>
        </p>
        <p className="auth__version" aria-label={`Versão ${APP_VERSION_DISPLAY}`}>
          {APP_VERSION_DISPLAY}
        </p>
      </div>
    </div>
  )
}
