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
          <p className="page__subtitle">Eventos vinculados aos seus projetos com status e datas atualizadas.</p>
        </div>
        <div className="portal-kpis">
          <article className="portal-kpi">
            <span className="portal-kpi__label">
              <CalendarClock size={14} strokeWidth={2} />
              Projetos monitorados
            </span>
            <strong className="portal-kpi__value">{projectsCount}</strong>
          </article>
          <article className="portal-kpi">
            <span className="portal-kpi__label">
              <Timer size={14} strokeWidth={2} />
              Eventos totais
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
                <p className="muted">{String(event.description ?? 'Sem descrição detalhada.')}</p>
                <p className="portal-agenda-card__date">
                  <CalendarClock size={14} strokeWidth={2} />
                  {event.start_time ? formatDateTimePt(String(event.start_time)) : '-'}
                  {event.end_time ? ` até ${formatDateTimePt(String(event.end_time))}` : ''}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p>Nenhum evento para os projetos vinculados.</p>
        )}
      </section>
    </main>
  )
}
