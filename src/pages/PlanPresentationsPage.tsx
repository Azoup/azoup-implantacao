import { useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { ExternalLink, FileText } from 'lucide-react'
import { db } from '../db/database'
import { ensureDatabase } from '../db/init'
import { STATIC_PLAN_PRESENTATIONS } from '../constants/planPresentations'
import { VyntaskLogo } from '../components/VyntaskLogo'

type Card = {
  key: string
  name: string
  hoursContracted: number
  presentationUrl: string | null
  blurb: string
}

export function PlanPresentationsPage() {
  useEffect(() => {
    void ensureDatabase()
  }, [])

  const fromDb = useLiveQuery(() => db.planModels.filter((p) => p.active).toArray(), []) ?? null

  const cards: Card[] | null = useMemo(() => {
    if (fromDb === null) return null
    if (fromDb.length === 0) {
      return STATIC_PLAN_PRESENTATIONS.map((s) => ({
        key: s.key,
        name: s.name,
        hoursContracted: s.hoursContracted,
        presentationUrl: s.presentationUrl,
        blurb: s.blurb,
      }))
    }
    const sorted = [...fromDb].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    return sorted.map((p) => ({
      key: p.key,
      name: p.name,
      hoursContracted: p.hoursContracted,
      presentationUrl: p.presentationUrl,
      blurb:
        p.clientDescription?.trim() ||
        'Conteúdo da reunião de alinhamento: etapas, comunicação, horas e cronograma típico da implantação.',
    }))
  }, [fromDb])

  return (
    <div className="presentations-page">
      <header className="presentations-page__header">
        <div className="presentations-page__brand">
          <span className="presentations-page__logo vyntask-logo-wrap" aria-hidden>
            <VyntaskLogo variant="inverse" size={28} />
          </span>
          <div>
            <h1 className="presentations-page__title">VynTask · Planos de implantação</h1>
            <p className="presentations-page__sub">
              Material de apresentação para a reunião de alinhamento (referência comercial).
            </p>
          </div>
        </div>
        <Link to="/login" className="btn btn--ghost presentations-page__login">
          Área da equipe
        </Link>
      </header>

      <main className="presentations-page__main">
        {cards === null ? (
          <p className="presentations-page__loading">Carregando…</p>
        ) : (
          <ul className="presentations-grid">
            {cards.map((c) => (
              <li key={c.key} className="presentations-card">
                <div className="presentations-card__icon" aria-hidden>
                  <FileText size={28} strokeWidth={1.5} />
                </div>
                <h2 className="presentations-card__name">{c.name}</h2>
                <p className="presentations-card__hours">{c.hoursContracted} horas contratadas</p>
                <p className="presentations-card__blurb">{c.blurb}</p>
                {c.presentationUrl ? (
                  <a
                    className="btn btn--primary presentations-card__cta"
                    href={c.presentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir apresentação
                    <ExternalLink size={18} strokeWidth={2} />
                  </a>
                ) : (
                  <p className="presentations-card__missing">Material ainda não foi publicado para este plano.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="presentations-page__footer">
        <p>
          Dúvidas comerciais ou contratuais: use o canal oficial da Azoup. Este espaço reúne apenas o PDF de alinhamento
          cadastrado em <strong>Modelos de planos</strong> no VynTask.
        </p>
      </footer>
    </div>
  )
}
