import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarClock, CheckCircle2, ClipboardList, ListChecks, Timer } from 'lucide-react'
import {
  fetchPortalAgenda,
  fetchPortalProjectGraph,
  type PortalEventRow,
  type PortalPhaseRow,
  type PortalProjectGraph,
  type PortalTaskRow,
} from '../../services/clientPortal'
import { formatDatePt, formatDateTimePt } from '../../lib/dates'
import { useUiFeedback } from '../../ui/UiFeedbackContext'

export function PortalProjectPage() {
  const { projectId = '' } = useParams()
  const { toastError } = useUiFeedback()
  const [data, setData] = useState<PortalProjectGraph | null>(null)
  const [agenda, setAgenda] = useState<PortalEventRow[]>([])

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const [next, projectAgenda] = await Promise.all([fetchPortalProjectGraph(projectId), fetchPortalAgenda([projectId])])
        if (!alive) return
        setData(next)
        const startOfToday = new Date()
        startOfToday.setHours(0, 0, 0, 0)
        const t0 = startOfToday.getTime()
        const upcoming = projectAgenda
          .filter((e) => {
            if (!e.start_time) return false
            const t = new Date(String(e.start_time)).getTime()
            return Number.isFinite(t) && t >= t0
          })
          .sort((a, b) => {
            const ta = a.start_time ? new Date(String(a.start_time)).getTime() : 0
            const tb = b.start_time ? new Date(String(b.start_time)).getTime() : 0
            return ta - tb
          })
          .slice(0, 8)
        setAgenda(upcoming)
      } catch (e) {
        if (!alive) return
        toastError(e instanceof Error ? e.message : 'Falha ao carregar andamento do projeto.')
      }
    })()
    return () => {
      alive = false
    }
  }, [projectId, toastError])

  const progress = useMemo(() => {
    const tasks = data?.tasks ?? []
    const total = tasks.length
    const done = tasks.filter((t) => t.status === 'concluida').length
    const inProgress = tasks.filter((t) => t.status === 'em_andamento').length
    const pending = tasks.filter((t) => t.status === 'pendente').length
    const estimated = tasks.reduce((acc, t) => acc + Number(t.estimated_hours ?? 0), 0)
    const actual = tasks.reduce((acc, t) => acc + Number(t.actual_hours ?? 0), 0)
    return {
      total,
      done,
      inProgress,
      pending,
      pct: total ? Math.round((done / total) * 100) : 0,
      estimated,
      actual,
    }
  }, [data])

  const phaseSummaries = useMemo(() => {
    const tasks = data?.tasks ?? []
    return (data?.phases ?? []).map((phase: PortalPhaseRow) => {
      const phaseTasks = tasks.filter((t) => t.phase_id === phase.id)
      const total = phaseTasks.length
      const done = phaseTasks.filter((t) => t.status === 'concluida').length
      const pct = total > 0 ? Math.round((done / total) * 100) : 0
      return { phase, phaseTasks, total, done, pct }
    })
  }, [data])

  if (!data?.project) {
    return (
      <main className="page">
        <section className="panel">Carregando projeto...</section>
      </main>
    )
  }

  const project = data.project

  return (
    <main className="page">
      <section className="panel">
        <div className="panel__header">
          <h1>{String(project.project_name ?? 'Projeto')}</h1>
          <p className="page__subtitle">Dados do projeto em modo leitura (tarefas, fases e horas como na área interna).</p>
        </div>
        <div className="portal-kpis">
          <article className="portal-kpi">
            <span className="portal-kpi__label">
              <ClipboardList size={14} strokeWidth={2} />
              Tarefas totais
            </span>
            <strong className="portal-kpi__value">{progress.total}</strong>
          </article>
          <article className="portal-kpi">
            <span className="portal-kpi__label">
              <CheckCircle2 size={14} strokeWidth={2} />
              Concluídas
            </span>
            <strong className="portal-kpi__value">{progress.done}</strong>
          </article>
          <article className="portal-kpi">
            <span className="portal-kpi__label">
              <ListChecks size={14} strokeWidth={2} />
              Em andamento
            </span>
            <strong className="portal-kpi__value">{progress.inProgress}</strong>
          </article>
          <article className="portal-kpi">
            <span className="portal-kpi__label">
              <Timer size={14} strokeWidth={2} />
              Pendentes
            </span>
            <strong className="portal-kpi__value">{progress.pending}</strong>
          </article>
        </div>
        <div className="portal-project-summary">
          <article className="portal-progress-card">
            <div className="portal-progress-card__head">
              <h3>Progresso geral do projeto</h3>
              <span className="pill pill--ok">{progress.pct}%</span>
            </div>
            <div className="portal-progress">
              <div className="portal-progress__bar" style={{ width: `${progress.pct}%` }} />
            </div>
            <p className="muted portal-progress-card__meta">
              {progress.done} de {progress.total} tarefas concluídas · Contrato:{' '}
              {Number(project.hours_contracted ?? 0).toFixed(1)}h · Utilizadas no projeto:{' '}
              {Number(project.hours_used ?? 0).toFixed(1)}h
            </p>
          </article>
          <article className="portal-progress-card">
            <div className="portal-progress-card__head">
              <h3>Horas das tarefas (previsto x realizado)</h3>
              <span className="pill">
                {progress.actual.toFixed(1)}h / {progress.estimated.toFixed(1)}h
              </span>
            </div>
            <div className="portal-progress">
              <div
                className="portal-progress__bar"
                style={{
                  width: `${progress.estimated > 0 ? Math.min(100, Math.round((progress.actual / progress.estimated) * 100)) : 0}%`,
                }}
              />
            </div>
            <p className="muted portal-progress-card__meta">
              {progress.actual.toFixed(1)}h realizadas · {progress.estimated.toFixed(1)}h previstas (soma das tarefas)
            </p>
          </article>
        </div>
        <div className="portal-project-card__actions">
          <Link className="btn btn--primary" to={`/portal/boas-vindas/${projectId}`}>
            Preencher formulário de boas-vindas
          </Link>
          <Link className="btn btn--ghost" to="/portal/agenda">
            <CalendarClock size={16} strokeWidth={2} />
            Ver agenda completa
          </Link>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2>Fases e tarefas</h2>
          <p className="page__subtitle">
            Início: {project.start_date ? formatDatePt(project.start_date) : '-'} · Prazo:{' '}
            {project.due_date ? formatDatePt(project.due_date) : '-'}
          </p>
        </div>
        <div className="portal-phase-list">
          {phaseSummaries.map(({ phase, phaseTasks, total, done, pct }) => (
            <article key={phase.id} className="portal-phase-card">
              <header className="portal-phase-card__head">
                <h3>{String(phase.name)}</h3>
                <span className="pill">{pct}%</span>
              </header>
              <div className="portal-progress">
                <div className="portal-progress__bar" style={{ width: `${pct}%` }} />
              </div>
              <p className="muted portal-progress-card__meta">
                {done} de {total} tarefas concluídas
              </p>
              <ul className="portal-task-list">
                {phaseTasks.map((task: PortalTaskRow) => (
                  <li key={task.id} className="portal-task-item">
                    <span className={`pill ${task.status === 'concluida' ? 'pill--ok' : task.status === 'em_andamento' ? 'pill--warn' : ''}`}>
                      {String(task.status)}
                    </span>
                    <div>
                      <strong>{String(task.title)}</strong>
                      <small>
                        Previsto {Number(task.estimated_hours ?? 0).toFixed(1)}h · Realizado{' '}
                        {Number(task.actual_hours ?? 0).toFixed(1)}h
                      </small>
                    </div>
                  </li>
                ))}
                {!phaseTasks.length ? <li className="muted">Sem tarefas nesta fase.</li> : null}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2>Próximos eventos (a partir de hoje)</h2>
          <p className="page__subtitle">Mesmos eventos da agenda do projeto; aqui só os próximos (até 8).</p>
        </div>
        {agenda.length ? (
          <div className="portal-agenda-grid">
            {agenda.map((event) => (
              <article key={String(event.id)} className="portal-agenda-card">
                <header className="portal-agenda-card__head">
                  <h3>{String(event.title ?? 'Evento')}</h3>
                  <span className="pill">{String(event.status ?? 'agendado')}</span>
                </header>
                {event.description?.trim() ? <p className="muted">{String(event.description)}</p> : null}
                <p className="portal-agenda-card__date">
                  <CalendarClock size={14} strokeWidth={2} /> {event.start_time ? formatDateTimePt(String(event.start_time)) : '-'}{' '}
                  {event.end_time ? `até ${formatDateTimePt(String(event.end_time))}` : ''}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">
            Nenhum evento com início a partir de hoje neste projeto. Em Ver agenda completa aparecem todos os eventos cadastrados
            (incluindo passados).
          </p>
        )}
      </section>
    </main>
  )
}
