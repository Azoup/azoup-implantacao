import { useEffect, useState } from 'react'
import { CalendarClock, CheckCircle2, CircleEllipsis, Timer } from 'lucide-react'
import { fetchMyPortalProjects, fetchPortalAgenda, type PortalEventRow } from '../../services/clientPortal'
import { formatDateTimePt } from '../../lib/dates'
import { useUiFeedback } from '../../ui/UiFeedbackContext'

export function PortalAgendaPage() {
  const { toastError } = useUiFeedback()
  const [events, setEvents] = useState<PortalEventRow[]>([])
  const [projectsCount, setProjectsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        setLoading(true)
        const projects = await fetchMyPortalProjects()
        setProjectsCount(projects.length)
        const agenda = await fetchPortalAgenda(projects.map((p) => p.id))
        if (!alive) return
        setEvents(agenda)
      } catch (e) {
        if (!alive) return
        toastError(e instanceof Error ? e.message : 'Falha ao carregar agenda do portal.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [toastError])

  return (
    <main className="page">
      <section className="panel">
        <div className="panel__header">
          <h1>Agenda do Cliente</h1>
          <p className="page__subtitle">
            Eventos cadastrados nos seus projetos vinculados — a mesma agenda que a equipe usa no sistema.
          </p>
          <p className="muted" style={{ marginTop: '0.5rem', maxWidth: '42rem' }}>
            Esta tela é somente leitura: mostra compromissos já gravados na nuvem para os seus projetos. Novas datas ou
            alterações feitas pela equipe podem levar alguns instantes para aparecer; atualize a página se acabou de
            salvar algo no app principal.
          </p>
        </div>
        <div className="portal-kpis">
          <article className="portal-kpi">
            <span className="portal-kpi__label">
              <CalendarClock size={14} strokeWidth={2} />
              Projetos vinculados
            </span>
            <strong className="portal-kpi__value">{projectsCount}</strong>
          </article>
          <article className="portal-kpi">
            <span className="portal-kpi__label">
              <Timer size={14} strokeWidth={2} />
              Eventos listados
            </span>
            <strong className="portal-kpi__value">{events.length}</strong>
          </article>
          <article className="portal-kpi">
            <span className="portal-kpi__label">
              <CheckCircle2 size={14} strokeWidth={2} />
              Realizados
            </span>
            <strong className="portal-kpi__value">{events.filter((e) => String(e.status) === 'realizado').length}</strong>
          </article>
          <article className="portal-kpi">
            <span className="portal-kpi__label">
              <CircleEllipsis size={14} strokeWidth={2} />
              Agendados
            </span>
            <strong className="portal-kpi__value">{events.filter((e) => String(e.status) === 'agendado').length}</strong>
          </article>
        </div>
        {loading ? (
          <p>Carregando...</p>
        ) : events.length ? (
          <div className="portal-agenda-grid">
            {events.map((event) => (
              <article key={String(event.id)} className="portal-agenda-card">
                <header className="portal-agenda-card__head">
                  <h3>{String(event.title ?? 'Evento')}</h3>
                  <span className={`pill ${String(event.status ?? '') === 'realizado' ? 'pill--ok' : String(event.status ?? '') === 'agendado' ? 'pill--warn' : ''}`}>
                    {String(event.status ?? '')}
                  </span>
                </header>
                {event.description?.trim() ? <p className="muted">{String(event.description)}</p> : null}
                <p className="portal-agenda-card__date">
                  <CalendarClock size={14} strokeWidth={2} />
                  {event.start_time ? formatDateTimePt(String(event.start_time)) : '-'}
                  {event.end_time ? ` até ${formatDateTimePt(String(event.end_time))}` : ''}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p>Não há eventos cadastrados nos projetos vinculados.</p>
        )}
      </section>
    </main>
  )
}
