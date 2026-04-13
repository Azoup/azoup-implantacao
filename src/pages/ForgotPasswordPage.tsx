import { FormEvent, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { VyntaskLogo } from '../components/VyntaskLogo'

export function ForgotPasswordPage() {
  const { ready, authMode, user, requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  if (!ready) {
    return (
      <div className="boot">
        <div className="boot__inner">Carregando…</div>
      </div>
    )
  }

  if (user) return <Navigate to="/dashboard" replace />

  if (authMode !== 'supabase') {
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
              <p className="auth__subtitle">Recuperação de senha</p>
            </div>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Neste ambiente o acesso é local. Peça a um administrador para redefinir sua senha em Configurações ou
            configure Supabase para envio de e-mail de recuperação.
          </p>
          <p className="auth__footer-link">
            <Link to="/login">Voltar ao login</Link>
          </p>
        </div>
      </div>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
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
              <p className="auth__subtitle">E-mail enviado</p>
            </div>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Se existir uma conta para este e-mail, você receberá instruções para redefinir a senha. Verifique também a
            pasta de spam.
          </p>
          <p className="auth__footer-link">
            <Link to="/login">Voltar ao login</Link>
          </p>
        </div>
      </div>
    )
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
            <p className="auth__subtitle">Esqueci minha senha</p>
          </div>
        </div>
        <form className="auth__form" onSubmit={onSubmit}>
          <label className="field">
            <span>E-mail</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          {error ? <p className="auth__error">{error}</p> : null}
          <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar link'}
          </button>
        </form>
        <p className="auth__footer-link">
          <Link to="/login">Voltar ao login</Link>
        </p>
      </div>
    </div>
  )
}
