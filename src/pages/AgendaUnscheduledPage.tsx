import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Clock } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { hasScope } from '../auth/permissions'
import { formatDurationHmFromHours } from '../lib/durationFormat'
import { compareTaskCode } from '../lib/taskCode'
import type { DbProject, DbTask } from '../db/types'
import { useAgendaOutlet } from './agendaOutletContext'

type ProjectGroup = {
  project: DbProject | null
  tasks: DbTask[]
}

export function AgendaUnscheduledPage() {
  const { user } = useAuth()
  const canEditAgenda = hasScope(user, 'agenda.edit')
  const { events, tasks, projects, eventModalRef } = useAgendaOutlet()

  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const searchNorm = search.trim().toLowerCase()

  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  const linkedTaskIds = useMemo(() => new Set(events.map((e) => e.taskId).filter(Boolean) as string[]), [events])

  const groups = useMemo(() => {
    let list = tasks.filter((t) => !linkedTaskIds.has(t.id) && t.status !== 'concluida' && t.status !== 'cancelado')
    if (searchNorm) {
      list = list.filter((t) => {
        const pn = projectById.get(t.projectId)?.projectName ?? ''
        const hay = `${t.code} ${t.title} ${pn}`.toLowerCase()
        return hay.includes(searchNorm)
      })
    }
    const byPid = new Map<string | null, DbTask[]>()
    for (const t of list) {
      const pid = t.projectId ?? null
      if (!byPid.has(pid)) byPid.set(pid, [])
      byPid.get(pid)!.push(t)
    }
    for (const arr of byPid.values()) {
      arr.sort((a, b) => compareTaskCode(a.code, b.code) || a.sortOrder - b.sortOrder)
    }
    const keys = [...byPid.keys()].sort((a, b) => {
      const na = a ? (projectById.get(a)?.projectName ?? '\uffff') : 'zzz'
      const nb = b ? (projectById.get(b)?.projectName ?? '\uffff') : 'zzz'
      const c = na.localeCompare(nb, 'pt')
      if (c !== 0) return c
      return String(a).localeCompare(String(b))
    })
    const out: ProjectGroup[] = keys.map((pid) => ({
      project: pid ? projectById.get(pid) ?? null : null,
      tasks: byPid.get(pid) ?? [],
    }))
    return out
  }, [tasks, linkedTaskIds, searchNorm, projectById])

  const totalTasks = useMemo(() => groups.reduce((acc, g) => acc + g.tasks.length, 0), [groups])

  function toggleGroup(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="agenda-unsched-page">
      <header className="agenda-unsched-page__head">
        <div>
          <h1 className="agenda-unsched-page__title">Tarefas não agendadas</h1>
          <p className="agenda-unsched-page__sub muted">
            Agrupadas por projeto. Clique numa tarefa para abrir o compromisso e lançar no cronograma.
          </p>
        </div>
      </header>

      <div className="agenda-unsched-toolbar panel">
        <label className="field agenda-unsched-toolbar__search">
          <span>Buscar</span>
          <input
            className="input"
            placeholder="Código, título ou projeto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar tarefas não agendadas"
          />
        </label>
        <p className="agenda-unsched-toolbar__count muted" role="status">
          {totalTasks === 0 ? 'Nenhuma tarefa nesta lista' : `${totalTasks} tarefa${totalTasks === 1 ? '' : 's'}`}
        </p>
      </div>

      <div className="agenda-unsched-groups">
        {groups.length === 0 ? (
          <div className="agenda-empty agenda-unsched-groups__empty panel" role="status">
            <p className="agenda-empty__title">Nada para mostrar</p>
            <p className="agenda-empty__hint muted">
              {searchNorm ? 'Tente outro termo de busca.' : 'Todas as tarefas em aberto já têm compromisso na agenda.'}
            </p>
          </div>
        ) : null}
        {groups.map((g) => {
          const key = g.project?.id ?? '__no_project__'
          const title =
            g.project?.projectName ??
            (g.tasks[0]?.projectId ? 'Projeto (dados incompletos)' : 'Sem projeto')
          const isOpen = !collapsed[key]
          return (
            <section key={key} className="agenda-unsched-group panel">
              <button
                type="button"
                className="agenda-unsched-group__header"
                onClick={() => toggleGroup(key)}
                aria-expanded={isOpen}
              >
                {isOpen ? <ChevronDown size={18} aria-hidden /> : <ChevronRight size={18} aria-hidden />}
                <span className="agenda-unsched-group__name">{title}</span>
                <span className="agenda-unsched-group__badge">{g.tasks.length}</span>
              </button>
              {isOpen ? (
                <ul className="agenda-unsched-group__list">
                  {g.tasks.map((t) => {
                    const p = g.project ?? projectById.get(t.projectId)
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          className="agenda-unsched-task"
                          disabled={!canEditAgenda}
                          title={canEditAgenda ? 'Agendar no cronograma' : 'Sem permissão para editar a agenda'}
                          onClick={() => void eventModalRef.current?.openPrefillTask(t.id, p?.id ?? t.projectId)}
                        >
                          <span className="agenda-unsched-task__code">{t.code}</span>
                          <span className="agenda-unsched-task__title">{t.title}</span>
                          <span className="agenda-unsched-task__meta">
                            <Clock size={14} strokeWidth={1.75} aria-hidden />
                            {formatDurationHmFromHours(t.estimatedHours)}
                          </span>
                          <span className="agenda-unsched-task__cta">Agendar…</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}
