import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import {
  emptyAnalysts,
  emptyEvents,
  emptyPhases,
  emptyProjects,
  emptyTasks,
  emptyTimeLogs,
} from '../lib/stableDexieEmpty'
import { formatDurationHmFromHours } from '../lib/durationFormat'
import { formatDatePt } from '../lib/dates'

type ReportsTab = 'executivo' | 'operacao' | 'horas'
type PeriodPreset = 'all' | 'day' | 'week' | 'month' | 'custom'

function toDateOnly(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff))
}

function endOfWeekSunday(d: Date): Date {
  const s = startOfWeekMonday(d)
  return endOfDay(new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6))
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

function isInRange(iso: string, start: Date | null, end: Date | null): boolean {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return false
  if (start && t < start.getTime()) return false
  if (end && t > end.getTime()) return false
  return true
}

function csvCell(value: string | number): string {
  const raw = String(value ?? '')
  return `"${raw.replaceAll('"', '""')}"`
}

function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number>>) {
  const csv = [header.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function ReportsPage() {
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? emptyProjects
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? emptyTasks
  const timeLogs = useLiveQuery(() => db.timeLogs.toArray(), []) ?? emptyTimeLogs
  const events = useLiveQuery(() => db.events.toArray(), []) ?? emptyEvents
  const phases = useLiveQuery(() => db.phases.toArray(), []) ?? emptyPhases
  const analysts = useLiveQuery(() => db.analysts.filter((a) => a.active).toArray(), []) ?? emptyAnalysts

  const [tab, setTab] = useState<ReportsTab>('executivo')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [analystFilter, setAnalystFilter] = useState<string>('all')
  const [phaseFilter, setPhaseFilter] = useState<string>('all')
  const [period, setPeriod] = useState<PeriodPreset>('month')

  const [customStart, setCustomStart] = useState<string>(() => toDateOnly(startOfMonth(new Date())))
  const [customEnd, setCustomEnd] = useState<string>(() => toDateOnly(endOfMonth(new Date())))

  const phaseOptions = useMemo(
    () =>
      phases
        .filter((ph) => projectFilter === 'all' || ph.projectId === projectFilter)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [phases, projectFilter],
  )

  const periodRange = useMemo(() => {
    const now = new Date()
    if (period === 'all') return { start: null as Date | null, end: null as Date | null }
    if (period === 'day') return { start: startOfDay(now), end: endOfDay(now) }
    if (period === 'week') return { start: startOfWeekMonday(now), end: endOfWeekSunday(now) }
    if (period === 'month') return { start: startOfMonth(now), end: endOfMonth(now) }
    const start = customStart ? startOfDay(new Date(customStart)) : null
    const end = customEnd ? endOfDay(new Date(customEnd)) : null
    return { start, end }
  }, [period, customStart, customEnd])

  const maps = useMemo(() => {
    const taskById = new Map(tasks.map((t) => [t.id, t]))
    return { taskById }
  }, [tasks])

  const filtered = useMemo(() => {
    const byProject = (projectId: string | null | undefined): boolean =>
      projectFilter === 'all' ? true : projectId === projectFilter
    const byAnalyst = (analystId: string | null | undefined): boolean =>
      analystFilter === 'all' ? true : analystId === analystFilter
    const byPhase = (taskPhaseId: string | null | undefined): boolean =>
      phaseFilter === 'all' ? true : taskPhaseId === phaseFilter

    const filteredTasks = tasks.filter((t) => byProject(t.projectId) && byAnalyst(t.assignedTo) && byPhase(t.phaseId))
    const filteredTaskIds = new Set(filteredTasks.map((t) => t.id))
    const filteredProjects = projects.filter((p) =>
      projectFilter === 'all' ? filteredTasks.some((t) => t.projectId === p.id) : p.id === projectFilter,
    )

    const filteredTimeLogs = timeLogs.filter((l) => {
      if (!isInRange(l.executionDate, periodRange.start, periodRange.end)) return false
      const task = maps.taskById.get(l.taskId)
      if (!task) return false
      return byProject(task.projectId) && byAnalyst(task.assignedTo) && byPhase(task.phaseId)
    })

    const filteredEvents = events.filter((ev) => {
      if (!isInRange(ev.startTime, periodRange.start, periodRange.end)) return false
      const task = ev.taskId ? maps.taskById.get(ev.taskId) : null
      const eventProjectId = ev.projectId ?? task?.projectId ?? null
      const eventAnalystId = ev.analystId ?? task?.assignedTo ?? null
      const eventPhaseId = task?.phaseId ?? null
      return byProject(eventProjectId) && byAnalyst(eventAnalystId) && byPhase(eventPhaseId)
    })

    return { filteredTasks, filteredTaskIds, filteredProjects, filteredTimeLogs, filteredEvents }
  }, [tasks, projects, timeLogs, events, maps.taskById, projectFilter, analystFilter, phaseFilter, periodRange])

  const metrics = useMemo(() => {
    const done = filtered.filteredTasks.filter((t) => t.status === 'concluida').length
    const prog = filtered.filteredTasks.filter((t) => t.status === 'em_andamento').length
    const pend = filtered.filteredTasks.filter((t) => t.status === 'pendente').length
    const cancelledTasks = filtered.filteredTasks.filter((t) => t.status === 'cancelado').length

    const taskExec = filtered.filteredTimeLogs.filter((l) => l.logType === 'executado').length
    const taskCancelNoNotice = filtered.filteredTimeLogs.filter((l) => l.logType === 'cancelado_sem_horas').length
    const taskCancelWithNotice = filtered.filteredTimeLogs.filter((l) => l.logType === 'cancelado_com_horas').length

    const agendaDone = filtered.filteredEvents.filter((e) => e.status === 'realizado').length
    const agendaCancelled = filtered.filteredEvents.filter((e) => e.status === 'cancelado')
    const agendaCancelNoNotice = agendaCancelled.filter((e) => new Date(e.startTime).getTime() <= Date.now()).length
    const agendaCancelWithNotice = agendaCancelled.length - agendaCancelNoNotice

    const hoursRealizedLogs = filtered.filteredTimeLogs.reduce((s, l) => s + l.hours, 0)
    const hoursEstimated = filtered.filteredTasks.reduce((s, t) => s + t.estimatedHours, 0)
    const hoursActualTasks = filtered.filteredTasks.reduce((s, t) => s + t.actualHours, 0)
    const avgHoursPerDoneTask = done > 0 ? hoursActualTasks / done : 0

    return {
      done,
      prog,
      pend,
      cancelledTasks,
      taskExec,
      taskCancelNoNotice,
      taskCancelWithNotice,
      agendaDone,
      agendaCancelNoNotice,
      agendaCancelWithNotice,
      hoursRealizedLogs,
      hoursEstimated,
      hoursActualTasks,
      avgHoursPerDoneTask,
    }
  }, [filtered])

  const hoursByProject = useMemo(() => {
    return [...filtered.filteredProjects]
      .map((p) => ({ name: p.projectName, h: p.hoursUsed, ratio: p.hoursContracted > 0 ? p.hoursUsed / p.hoursContracted : 0 }))
      .sort((a, b) => b.h - a.h)
      .slice(0, 10)
  }, [filtered.filteredProjects])

  const maxH = Math.max(1, ...hoursByProject.map((x) => x.h))

  const cadence = useMemo(() => {
    const tick = new Date()
    const make = (start: Date, end: Date) => {
      const inLogs = filtered.filteredTimeLogs.filter((l) => isInRange(l.executionDate, start, end))
      const inEvents = filtered.filteredEvents.filter((e) => isInRange(e.startTime, start, end))
      return {
        taskExec: inLogs.filter((l) => l.logType === 'executado').length,
        taskCancelNoNotice: inLogs.filter((l) => l.logType === 'cancelado_sem_horas').length,
        taskCancelWithNotice: inLogs.filter((l) => l.logType === 'cancelado_com_horas').length,
        agendaDone: inEvents.filter((e) => e.status === 'realizado').length,
        agendaCancelled: inEvents.filter((e) => e.status === 'cancelado').length,
      }
    }
    return {
      dia: make(startOfDay(tick), endOfDay(tick)),
      semana: make(startOfWeekMonday(tick), endOfWeekSunday(tick)),
      mes: make(startOfMonth(tick), endOfMonth(tick)),
    }
  }, [filtered.filteredTimeLogs, filtered.filteredEvents])

  const periodLabel = useMemo(() => {
    if (period === 'all') return 'todo_historico'
    if (period === 'day') return 'hoje'
    if (period === 'week') return 'semana_atual'
    if (period === 'month') return 'mes_atual'
    return `${customStart || 'inicio'}_a_${customEnd || 'fim'}`
  }, [period, customStart, customEnd])

  function exportCurrentTabCsv() {
    const ts = toDateOnly(new Date())
    if (tab === 'executivo') {
      downloadCsv(
        `relatorio_executivo_${periodLabel}_${ts}.csv`,
        ['indicador', 'valor'],
        [
          ['tarefas_concluidas', metrics.done],
          ['agendas_realizadas', metrics.agendaDone],
          ['canceladas_sem_aviso', metrics.taskCancelNoNotice + metrics.agendaCancelNoNotice],
          ['canceladas_com_aviso', metrics.taskCancelWithNotice + metrics.agendaCancelWithNotice],
          ['horas_realizadas_logs', metrics.hoursRealizedLogs.toFixed(2)],
          ['tarefas_em_andamento', metrics.prog],
          ['tarefas_pendentes', metrics.pend],
          ['tarefas_canceladas', metrics.cancelledTasks],
        ],
      )
      return
    }

    if (tab === 'operacao') {
      downloadCsv(
        `relatorio_operacao_${periodLabel}_${ts}.csv`,
        ['tipo', 'realizadas', 'canceladas_sem_aviso', 'canceladas_com_aviso'],
        [
          ['tarefas_logs', metrics.taskExec, metrics.taskCancelNoNotice, metrics.taskCancelWithNotice],
          ['agendas', metrics.agendaDone, metrics.agendaCancelNoNotice, metrics.agendaCancelWithNotice],
        ],
      )
      return
    }

    downloadCsv(
      `relatorio_horas_${periodLabel}_${ts}.csv`,
      ['projeto', 'horas_usadas', 'percentual_contrato', 'referencia_data'],
      hoursByProject.map((row) => [row.name, row.h.toFixed(2), Math.round(row.ratio * 100), formatDatePt(new Date())]),
    )
  }

  return (
    <div className="page page--wide">
      <header className="page__header">
        <div>
          <h1 className="page__title">Relatórios</h1>
          <p className="page__subtitle">Indicadores gerenciais de projetos, tarefas, agendas e horas</p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={exportCurrentTabCsv}>
          Exportar CSV da aba
        </button>
      </header>

      <section className="reports-filters panel">
        <div className="reports-filters__tabs" role="tablist" aria-label="Abas de relatórios">
          <button className={'chip' + (tab === 'executivo' ? ' is-on' : '')} onClick={() => setTab('executivo')}>
            Visão executiva
          </button>
          <button className={'chip' + (tab === 'operacao' ? ' is-on' : '')} onClick={() => setTab('operacao')}>
            Operação
          </button>
          <button className={'chip' + (tab === 'horas' ? ' is-on' : '')} onClick={() => setTab('horas')}>
            Horas e eficiência
          </button>
        </div>
        <div className="reports-filters__grid">
          <label className="field">
            <span>Projeto</span>
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="all">Todos os projetos</option>
              {projects
                .slice()
                .sort((a, b) => a.projectName.localeCompare(b.projectName, 'pt-BR'))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectName}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            <span>Analista</span>
            <select value={analystFilter} onChange={(e) => setAnalystFilter(e.target.value)}>
              <option value="all">Todos analistas</option>
              {analysts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Fase</span>
            <select value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)}>
              <option value="all">Todas as fases</option>
              {phaseOptions.map((ph) => (
                <option key={ph.id} value={ph.id}>
                  {ph.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Período</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value as PeriodPreset)}>
              <option value="all">Todo histórico</option>
              <option value="day">Hoje</option>
              <option value="week">Semana atual</option>
              <option value="month">Mês atual</option>
              <option value="custom">Personalizado</option>
            </select>
          </label>
          {period === 'custom' ? (
            <>
              <label className="field">
                <span>Data inicial</span>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              </label>
              <label className="field">
                <span>Data final</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </label>
            </>
          ) : null}
        </div>
      </section>

      {tab === 'executivo' ? (
        <>
          <section className="kpi-row">
            <div className="kpi">
              <div className="kpi__value">{metrics.done}</div>
              <div className="kpi__label">Tarefas concluídas</div>
            </div>
            <div className="kpi">
              <div className="kpi__value">{metrics.agendaDone}</div>
              <div className="kpi__label">Agendas realizadas</div>
            </div>
            <div className="kpi">
              <div className="kpi__value">{metrics.taskCancelNoNotice + metrics.agendaCancelNoNotice}</div>
              <div className="kpi__label">Canceladas sem aviso</div>
            </div>
            <div className="kpi">
              <div className="kpi__value">{metrics.taskCancelWithNotice + metrics.agendaCancelWithNotice}</div>
              <div className="kpi__label">Canceladas com aviso</div>
            </div>
            <div className="kpi">
              <div className="kpi__value">{formatDurationHmFromHours(metrics.hoursRealizedLogs)}</div>
              <div className="kpi__label">Horas realizadas (logs)</div>
            </div>
          </section>

          <div className="reports-grid">
            <section className="panel">
              <h2 className="panel__title">Cadência (dia / semana / mês)</h2>
              <table className="table table--compact">
                <thead>
                  <tr>
                    <th>Período</th>
                    <th className="num">Realizadas</th>
                    <th className="num">Sem aviso</th>
                    <th className="num">Com aviso</th>
                    <th className="num">Agendas realizadas</th>
                    <th className="num">Agendas canceladas</th>
                  </tr>
                </thead>
                <tbody>
                  {(['dia', 'semana', 'mes'] as const).map((k) => (
                    <tr key={k}>
                      <td>{k === 'dia' ? 'Dia' : k === 'semana' ? 'Semana' : 'Mês'}</td>
                      <td className="num">{cadence[k].taskExec}</td>
                      <td className="num">{cadence[k].taskCancelNoNotice}</td>
                      <td className="num">{cadence[k].taskCancelWithNotice}</td>
                      <td className="num">{cadence[k].agendaDone}</td>
                      <td className="num">{cadence[k].agendaCancelled}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="panel">
              <h2 className="panel__title">Distribuição atual de tarefas</h2>
              <div className="donut-wrap">
                <div
                  className="donut"
                  style={{
                    background: (() => {
                      const n = Math.max(1, filtered.filteredTasks.length)
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
                  <li>
                    <span className="dot dot--danger" /> Canceladas: {metrics.cancelledTasks}
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </>
      ) : null}

      {tab === 'operacao' ? (
        <div className="reports-grid">
          <section className="panel">
            <h2 className="panel__title">Tarefas (logs)</h2>
            <table className="table table--compact">
              <tbody>
                <tr>
                  <td>Realizadas</td>
                  <td className="num">{metrics.taskExec}</td>
                </tr>
                <tr>
                  <td>Canceladas sem aviso</td>
                  <td className="num">{metrics.taskCancelNoNotice}</td>
                </tr>
                <tr>
                  <td>Canceladas com aviso</td>
                  <td className="num">{metrics.taskCancelWithNotice}</td>
                </tr>
              </tbody>
            </table>
          </section>
          <section className="panel">
            <h2 className="panel__title">Agendas</h2>
            <table className="table table--compact">
              <tbody>
                <tr>
                  <td>Realizadas</td>
                  <td className="num">{metrics.agendaDone}</td>
                </tr>
                <tr>
                  <td>Canceladas sem aviso (proxy)</td>
                  <td className="num">{metrics.agendaCancelNoNotice}</td>
                </tr>
                <tr>
                  <td>Canceladas com aviso (proxy)</td>
                  <td className="num">{metrics.agendaCancelWithNotice}</td>
                </tr>
              </tbody>
            </table>
            <p className="muted reports-note">
              Proxy de agenda: “sem aviso” quando o horário já passou; “com aviso” quando ainda não passou.
            </p>
          </section>
        </div>
      ) : null}

      {tab === 'horas' ? (
        <div className="reports-grid">
          <section className="panel">
            <h2 className="panel__title">Horas por projeto (hoursUsed)</h2>
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
              {hoursByProject.length === 0 ? <p className="muted">Sem dados para o filtro selecionado.</p> : null}
            </div>
          </section>

          <section className="panel">
            <h2 className="panel__title">Previsto x realizado</h2>
            <table className="table table--compact">
              <tbody>
                <tr>
                  <td>Previsto (tarefas)</td>
                  <td className="num">{formatDurationHmFromHours(metrics.hoursEstimated)}</td>
                </tr>
                <tr>
                  <td>Realizado (actualHours)</td>
                  <td className="num">{formatDurationHmFromHours(metrics.hoursActualTasks)}</td>
                </tr>
                <tr>
                  <td>Realizado (logs)</td>
                  <td className="num">{formatDurationHmFromHours(metrics.hoursRealizedLogs)}</td>
                </tr>
                <tr>
                  <td>Média por tarefa concluída</td>
                  <td className="num">{formatDurationHmFromHours(metrics.avgHoursPerDoneTask)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="panel">
            <h2 className="panel__title">Uso do contrato por projeto</h2>
            <div className="bar-list">
              {hoursByProject.map((row) => (
                <div key={row.name + '_ratio'} className="bar-row">
                  <span className="bar-row__label">{row.name}</span>
                  <div className="bar-row__track">
                    <div className="bar-row__fill" style={{ width: `${Math.min(100, row.ratio * 100)}%` }} />
                  </div>
                  <span className="bar-row__val">{Math.round(row.ratio * 100)}%</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
