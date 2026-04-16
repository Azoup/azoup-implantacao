import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { LayoutList, Columns3, FolderTree } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { hasScope } from '../auth/permissions'
import { db } from '../db/database'
import { compareTaskCode } from '../lib/taskCode'
import { isTaskActiveForPrazoBoard } from '../lib/taskDueBucket'
import { formatDatePt } from '../lib/dates'
import { formatDurationHmFromHours } from '../lib/durationFormat'
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from '../constants/tasks'
import { setTaskStatus } from '../services/tasks'
import type { TaskPriority, TaskStatus } from '../db/types'
import { TarefasFaseView, TarefasPrazoView } from './TarefasViews'
import { useUiFeedback } from '../ui/UiFeedbackContext'

type TarefaTab = 'lista' | 'prazo' | 'fase'

const tabIcon = { size: 18, strokeWidth: 1.75, absoluteStrokeWidth: true } as const

export function TarefasPage() {
  const { user } = useAuth()
  const canEditTasks = hasScope(user, 'tasks.edit')
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? []
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? []
  const phases = useLiveQuery(() => db.phases.toArray(), []) ?? []
  const analysts = useLiveQuery(() => db.analysts.toArray(), []) ?? []
  const { toastError } = useUiFeedback()

  const [tab, setTab] = useState<TarefaTab>('lista')
  const [q, setQ] = useState('')
  const [st, setSt] = useState<TaskStatus | 'all'>('all')
  const [pr, setPr] = useState<TaskPriority | 'all'>('all')
  const [pj, setPj] = useState<string>('all')

  const filteredTasks = useMemo(() => {
    let list = [...tasks]
    list.sort((a, b) => {
      const pc = a.projectId.localeCompare(b.projectId)
      if (pc !== 0) return pc
      return compareTaskCode(a.code, b.code) || a.sortOrder - b.sortOrder
    })
    if (q.trim()) {
      const n = q.toLowerCase()
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(n) ||
          t.code.toLowerCase().includes(n) ||
          t.description.toLowerCase().includes(n),
      )
    }
    if (st !== 'all') list = list.filter((t) => t.status === st)
    if (pr !== 'all') list = list.filter((t) => t.priority === pr)
    if (pj !== 'all') list = list.filter((t) => t.projectId === pj)
    return list
  }, [tasks, q, st, pr, pj])

  const prazoTasks = useMemo(
    () => filteredTasks.filter((t) => isTaskActiveForPrazoBoard(t.status)),
    [filteredTasks],
  )

  const analystRows = useMemo(
    () => analysts.map((a) => ({ id: a.id, name: a.name, color: a.color, avatarUrl: a.avatarUrl })),
    [analysts],
  )

  async function changeStatus(id: string, next: TaskStatus) {
    if (!canEditTasks) return
    try {
      await setTaskStatus(id, next, user?.id)
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Não foi possível atualizar')
    }
  }

  return (
    <div className="page page--wide page--tarefas">
      <header className="page__header page__header--split">
        <div>
          <h1 className="page__title">Tarefas</h1>
          <p className="page__subtitle">{tasks.length} tarefas · filtros aplicam às três visualizações</p>
        </div>
        <button type="button" className="btn btn--primary" disabled>
          + Nova Tarefa Interna
        </button>
      </header>

      <div className="task-tabs" role="tablist" aria-label="Visualização">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'lista'}
          className={'task-tabs__btn' + (tab === 'lista' ? ' is-active' : '')}
          onClick={() => setTab('lista')}
        >
          <LayoutList {...tabIcon} />
          Lista
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'prazo'}
          className={'task-tabs__btn' + (tab === 'prazo' ? ' is-active' : '')}
          onClick={() => setTab('prazo')}
        >
          <Columns3 {...tabIcon} />
          Por prazo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'fase'}
          className={'task-tabs__btn' + (tab === 'fase' ? ' is-active' : '')}
          onClick={() => setTab('fase')}
        >
          <FolderTree {...tabIcon} />
          Por fase
        </button>
      </div>

      <div className="toolbar task-toolbar">
        <input
          className="input"
          placeholder="Buscar tarefa…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input input--sm" value={st} onChange={(e) => setSt(e.target.value as typeof st)}>
          <option value="all">Todos status</option>
          {TASK_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
        <select className="input input--sm" value={pr} onChange={(e) => setPr(e.target.value as typeof pr)}>
          <option value="all">Todas prioridades</option>
          {TASK_PRIORITY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="input input--sm" value={pj} onChange={(e) => setPj(e.target.value)}>
          <option value="all">Todos projetos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.projectName}
            </option>
          ))}
        </select>
      </div>

      {tab === 'lista' ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tarefa</th>
                <th>Projeto</th>
                <th>Prioridade</th>
                <th>Status</th>
                <th>Horas</th>
                <th>Prazo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((t) => {
                const proj = projects.find((p) => p.id === t.projectId)
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="cell-main">
                        <strong>
                          {t.code} {t.title}
                        </strong>
                        {t.description ? <div className="muted cell-sub">{t.description}</div> : null}
                      </div>
                    </td>
                    <td>{proj?.projectName ?? '—'}</td>
                    <td>
                      <span className="pill pill--accent">{t.priority}</span>
                    </td>
                    <td>
                      <select
                        className="input input--xs"
                        value={t.status}
                        onChange={(e) => changeStatus(t.id, e.target.value as TaskStatus)}
                      >
                        {TASK_STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {formatDurationHmFromHours(t.actualHours)}/{formatDurationHmFromHours(t.estimatedHours)}
                    </td>
                    <td>{t.dueDate ? formatDatePt(t.dueDate) : '—'}</td>
                    <td>
                      <span className="muted">—</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredTasks.length === 0 ? <p className="muted pad">Nenhuma tarefa encontrada.</p> : null}
        </div>
      ) : null}

      {tab === 'prazo' ? (
        <TarefasPrazoView
          tasks={prazoTasks}
          projects={projects}
          analysts={analystRows}
          onStatusChange={changeStatus}
          canEdit={canEditTasks}
        />
      ) : null}

      {tab === 'fase' ? (
        <TarefasFaseView
          tasks={filteredTasks}
          projects={projects}
          phases={phases}
          analysts={analystRows}
          onStatusChange={changeStatus}
          canEdit={canEditTasks}
        />
      ) : null}
    </div>
  )
}
