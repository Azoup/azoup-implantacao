import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { formatDurationHmFromHours } from '../lib/durationFormat'

export function ReportsPage() {
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? []
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? []
  const timeLogs = useLiveQuery(() => db.timeLogs.toArray(), []) ?? []

  const metrics = useMemo(() => {
    const done = tasks.filter((t) => t.status === 'concluida').length
    const prog = tasks.filter((t) => t.status === 'em_andamento').length
    const pend = tasks.filter((t) => t.status === 'pendente').length
    const hoursRealized = timeLogs
      .filter((l) => l.logType === 'executado')
      .reduce((s, l) => s + l.hours, 0)
    const est = tasks.reduce((s, t) => s + t.estimatedHours, 0)
    return { done, prog, pend, hoursRealized, est }
  }, [tasks, timeLogs])

  const hoursByProject = useMemo(() => {
    return [...projects]
      .map((p) => ({ name: p.projectName, h: p.hoursUsed }))
      .sort((a, b) => b.h - a.h)
      .slice(0, 8)
  }, [projects])

  const maxH = Math.max(1, ...hoursByProject.map((x) => x.h))

  return (
    <div className="page page--wide">
      <header className="page__header page__header--split">
        <div>
          <h1 className="page__title">Relatórios</h1>
          <p className="page__subtitle">Métricas operacionais e produtividade</p>
        </div>
        <select className="input input--sm" disabled>
          <option>Todos projetos</option>
        </select>
      </header>

      <section className="kpi-row">
        <div className="kpi">
          <div className="kpi__value">{metrics.done}</div>
          <div className="kpi__label">Tarefas concluídas</div>
        </div>
        <div className="kpi">
          <div className="kpi__value">0</div>
          <div className="kpi__label">Cancelamentos (log)</div>
        </div>
        <div className="kpi">
          <div className="kpi__value">0</div>
          <div className="kpi__label">Reagendamentos</div>
        </div>
        <div className="kpi">
          <div className="kpi__value">{formatDurationHmFromHours(metrics.hoursRealized)}</div>
          <div className="kpi__label">Horas realizadas (logs)</div>
        </div>
      </section>

      <div className="reports-grid">
        <section className="panel">
          <h2 className="panel__title">Horas por projeto (campo hoursUsed)</h2>
          <div className="bar-list">
            {hoursByProject.map((row) => (
              <div key={row.name} className="bar-row">
                <span className="bar-row__label">{row.name}</span>
                <div className="bar-row__track">
                  <div className="bar-row__fill" style={{ width: `${(row.h / maxH) * 100}%` }} />
                </div>
                <span className="bar-row__val">{formatDurationHmFromHours(row.h)}</span>
              </div>
            ))}
            {hoursByProject.length === 0 ? <p className="muted">Sem dados.</p> : null}
          </div>
        </section>

        <section className="panel">
          <h2 className="panel__title">Distribuição de tarefas</h2>
          <div className="donut-wrap">
            <div
              className="donut"
              style={{
                background: (() => {
                  const n = Math.max(1, tasks.length)
                  const a = (metrics.done / n) * 360
                  const b = ((metrics.done + metrics.prog) / n) * 360
                  return `conic-gradient(var(--success) 0deg ${a}deg, var(--accent) ${a}deg ${b}deg, var(--border) ${b}deg 360deg)`
                })(),
              }}
            />
            <ul className="donut-legend">
              <li>
                <span className="dot dot--ok" /> Concluídas: {metrics.done}
              </li>
              <li>
                <span className="dot dot--accent" /> Em andamento: {metrics.prog}
              </li>
              <li>
                <span className="dot dot--muted" /> Pendentes: {metrics.pend}
              </li>
            </ul>
          </div>
        </section>

        <section className="panel">
          <h2 className="panel__title">Estimado vs realizado (tarefas)</h2>
          <table className="table table--compact">
            <tbody>
              <tr>
                <td>Total estimado</td>
                <td className="num">{formatDurationHmFromHours(metrics.est)}</td>
              </tr>
              <tr>
                <td>Total realizado (actualHours)</td>
                <td className="num">{formatDurationHmFromHours(tasks.reduce((s, t) => s + t.actualHours, 0))}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}
