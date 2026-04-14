import { FormEvent, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { AuthCardShell } from '../components/auth/AuthCardShell'

export function RegisterPage() {
  const { ready, authMode, user, signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<{ needsEmailConfirmation: boolean } | null>(null)

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
      <AuthCardShell subtitle="Cadastro online não está disponível neste ambiente.">
        <p className="muted" style={{ margin: 0 }}>
          Configure <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> no <code>.env.local</code>{' '}
          para habilitar conta com e-mail e senha.
        </p>
        <p className="auth__footer-link">
          <Link to="/login">Voltar ao login</Link>
        </p>
      </AuthCardShell>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const r = await signUp(email, password, name)
      setDone(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no cadastro.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthCardShell subtitle="Cadastro recebido">
        {done.needsEmailConfirmation ? (
          <p className="muted" style={{ margin: 0 }}>
            Enviamos um link de confirmação para o seu e-mail. Abra a mensagem e confirme antes de entrar.
          </p>
        ) : (
          <p className="muted" style={{ margin: 0 }}>Sua conta está pronta. Você já pode entrar.</p>
        )}
        <p className="auth__footer-link">
          <Link to="/login">Ir para o login</Link>
        </p>
      </AuthCardShell>
    )
  }

  return (
    <AuthCardShell subtitle="Criar conta">
      <form className="auth__form" onSubmit={onSubmit}>
        <label className="field">
          <span>Nome</span>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
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
        <label className="field">
          <span>Senha</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        {error ? <p className="auth__error">{error}</p> : null}
        <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
          {loading ? 'Cadastrando…' : 'Cadastrar'}
        </button>
      </form>
      <p className="auth__footer-link">
        <Link to="/login">Já tenho conta</Link>
      </p>
    </AuthCardShell>
  )
}
