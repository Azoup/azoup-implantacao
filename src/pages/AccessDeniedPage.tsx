import { Link } from 'react-router-dom'

export function AccessDeniedPage() {
  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">Sem permissão</h1>
        <p className="page__subtitle">Seu usuário não tem acesso a esta tela.</p>
      </header>
      <Link to="/dashboard" className="btn btn--primary">
        Voltar ao dashboard
      </Link>
    </div>
  )
}

