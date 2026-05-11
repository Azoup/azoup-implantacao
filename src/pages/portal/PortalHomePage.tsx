import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, CalendarClock, CheckCircle2, Clock3, FolderKanban, Target } from 'lucide-react'
import { fetchMyPortalProjects, type PortalProject } from '../../services/clientPortal'
import type { ProjectStatus } from '../../db/types'
import { formatDatePt, parseAppDate } from '../../lib/dates'
import { isDashboardOperationalStatus } from '../../lib/projectStatus'
import { useUiFeedback } from '../../ui/UiFeedbackContext'

export function PortalHomePage() {
  const { toastError } = useUiFeedback()
  const [projects, setProjects] = useState<PortalProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        setLoading(true)
        const rows = await fetchMyPortalProjects()
        if (!alive) return
        setProjects(rows)
      } catch (e) {
        if (!alive) return
        toastError(e instanceof Error ? e.message : 'Falha ao carregar projetos do portal.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [toastError])

  const summary = useMemo(() => {
    const total = projects.length
    const ongoing = projects.filter((p) => isDashboardOperationalStatus(p.status as ProjectStatus)).length
    const completed = projects.filter((p) => p.status === 'finalizado').length
    const hoursUsed = projects.reduce((acc, p) => acc + p.hoursUsed, 0)
    const hoursContracted = projects.reduce((acc, p) => acc + p.hoursContracted, 0)
    const hoursPct = hoursContracted > 0 ? Math.min(100, Math.round((hoursUsed / hoursContracted) * 100)) : 0
    const nearDeadline = projects.filter((p) => {
      if (!p.dueDate || p.status === 'finalizado') return false
      const due = parseAppDate(p.dueDate).getTime()
      const now = Date.now()
      return due >= now && due - now <= 1000 * 60 * 60 * 24 * 14
    }).length
    return { total, ongoing, completed, hoursUsed, hoursContracted, hoursPct, nearDeadline }
  }, [projects])

  return (
    <main className="page">
      <section className="panel portal-hero">
        <div className="portal-hero__head">
          <div>
            <h1>Portal do Cliente</h1>
            <p className="page__subtitle">
              Acompanhe progresso e horas dos projetos vinculados. Os eventos agendados no projeto (agenda) aparecem em Ver agenda.
            </p>
          </div>
          <div className="portal-hero__actions">
            <Link to="/portal/agenda" className="btn btn--ghost">
              <CalendarClock size={16} strokeWidth={2} />
              Ver agenda
            </Link>
          </div>
        </div>
        <div className="portal-kpis">
          <article className="portal-kpi">
            <span className="portal-kpi__label">
              <FolderKanban size={14} strokeWidth={2} />
              Projetos vinculados
            </span>
            <strong className="portal-kpi__value">{summary.total}</strong>
          </article>
          <article className="portal-kpi">
            <span className="portal-kpi__label">
              <Activity size={14} strokeWidth={2} />
              Em andamento
            </span>
            <strong className="portal-kpi__value">{summary.ongoing}</strong>
          </article>
          <article className="portal-kpi">
            <span className="portal-kpi__label">
              <CheckCircle2 size={14} strokeWidth={2} />
              Finalizados
            </span>
            <strong className="portal-kpi__value">{summary.completed}</strong>
          </article>
          <article className="portal-kpi">
            <span className="portal-kpi__label">
              <Clock3 size={14} strokeWidth={2} />
              Prazos próximos (14 dias)
            </span>
            <strong className="portal-kpi__value">{summary.nearDeadline}</strong>
          </article>
        </div>
        <article className="portal-progress-card">
          <div className="portal-progress-card__head">
            <h3>Consumo de horas contratadas</h3>
            <span className="pill">{summary.hoursPct}%</span>
          </div>
          <div className="portal-progress">
            <div className="portal-progress__bar" style={{ width: `${summary.hoursPct}%` }} />
          </div>
          <p className="muted portal-progress-card__meta">
            {summary.hoursUsed.toFixed(1)}h usadas de {summary.hoursContracted.toFixed(1)}h contratadas
          </p>
        </article>
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2>Resumo dos projetos</h2>
        </div>
        {loading ? (
          <p>Carregando...</p>
        ) : projects.length ? (
          <div className="portal-project-grid">
            {projects.map((p) => {
              const pct = p.hoursContracted > 0 ? Math.min(100, Math.round((p.hoursUsed / p.hoursContracted) * 100)) : 0
              const isDone = p.status === 'finalizado'
              return (
                <article key={p.id} className="portal-project-card">
                  <header className="portal-project-card__head">
                    <h3>{p.projectName}</h3>
                    <span className={`pill ${isDone ? 'pill--ok' : ''}`}>{p.status}</span>
                  </header>
                  <dl className="portal-project-card__meta">
                    <div>
                      <dt>Início</dt>
                      <dd>{p.startDate ? formatDatePt(p.startDate) : '-'}</dd>
                    </div>
                    <div>
                      <dt>Prazo</dt>
                      <dd>{p.dueDate ? formatDatePt(p.dueDate) : '-'}</dd>
                    </div>
                  </dl>
                  <div className="portal-progress-card__head">
                    <span className="portal-kpi__label">
                      <Target size={14} strokeWidth={2} />
                      Consumo
                    </span>
                    <span className="pill">{pct}%</span>
                  </div>
                  <div className="portal-progress">
                    <div className="portal-progress__bar" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="muted portal-progress-card__meta">
                    {p.hoursUsed.toFixed(1)}h de {p.hoursContracted.toFixed(1)}h
                  </p>
                  <footer className="portal-project-card__actions">
                    <Link to={`/portal/projetos/${p.id}`} className="btn btn--primary">
                      Ver andamento
                    </Link>
                    <Link to={`/portal/boas-vindas/${p.id}`} className="btn btn--ghost">
                      Formulário
                    </Link>
                  </footer>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="portal-empty-state">
            <h3>Nenhum projeto vinculado ainda</h3>
            <p>
              Quando a equipe associar sua empresa ao projeto de implantação, os cards aparecem aqui com prazos,
              consumo de horas e links rápidos.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}
