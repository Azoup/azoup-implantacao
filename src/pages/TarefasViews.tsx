import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { formatDatePt } from '../lib/dates'
import {
  classifyDueBucket,
  DUE_BUCKET_LABELS,
  DUE_BUCKET_ORDER,
  type DueBucket,
} from '../lib/taskDueBucket'
import { compareTaskCode } from '../lib/taskCode'
import type { DbPhase, DbProject, DbTask, TaskStatus } from '../db/types'
import { AnalystAvatar } from '../components/AnalystAvatar'

const STATUS_OPTS: TaskStatus[] = ['pendente', 'em_andamento', 'concluida', 'cancelado']

type TarefasPrazoViewProps = {
  tasks: DbTask[]
  projects: DbProject[]
  analysts: { id: string; name: string; color: string; avatarUrl?: string | null }[]
  onStatusChange: (id: string, next: TaskStatus) => void
  canEdit: boolean
}

const BUCKET_ACCENT: Record<DueBucket, string> = {
  vencidas: 'task-prazo-col--danger',
  hoje: 'task-prazo-col--today',
  esta_semana: 'task-prazo-col--week',
  proxima_semana: 'task-prazo-col--next',
  futuro: 'task-prazo-col--future',
  sem_prazo: 'task-prazo-col--none',
}

export function TarefasPrazoView({ tasks, projects, analysts, onStatusChange, canEdit }: TarefasPrazoViewProps) {
  const byBucket = useMemo(() => {
    const m = new Map<DueBucket, DbTask[]>()
    for (const b of DUE_BUCKET_ORDER) m.set(b, [])
    for (const t of tasks) {
      const b = classifyDueBucket(t.dueDate)
      m.get(b)!.push(t)
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        const pa = projects.find((p) => p.id === a.projectId)?.projectName ?? ''
        const pb = projects.find((p) => p.id === b.projectId)?.projectName ?? ''
        if (pa !== pb) return pa.localeCompare(pb, 'pt-BR')
        return compareTaskCode(a.code, b.code) || a.sortOrder - b.sortOrder
      })
    }
    return m
  }, [tasks, projects])

  return (
    <div className="task-prazo-board" role="region" aria-label="Tarefas por prazo">
      <p className="task-prazo-hint muted">
        Somente tarefas <strong>pendentes</strong> ou <strong>em andamento</strong> (use a aba Lista para ver todas).
      </p>
      <div className="task-prazo-cols">
        {DUE_BUCKET_ORDER.map((bucket) => {
          const list = byBucket.get(bucket) ?? []
          return (
            <section key={bucket} className={'task-prazo-col ' + BUCKET_ACCENT[bucket]}>
              <header className="task-prazo-col__head">
                <h3 className="task-prazo-col__title">{DUE_BUCKET_LABELS[bucket]}</h3>
                <span className="task-prazo-col__count">{list.length}</span>
              </header>
              <div className="task-prazo-col__cards">
                {list.length === 0 ? (
                  <p className="task-prazo-col__empty muted">Nenhuma</p>
                ) : (
                  list.map((t) => {
                    const proj = projects.find((p) => p.id === t.projectId)
                    const an = t.assignedTo ? analysts.find((x) => x.id === t.assignedTo) : null
                    return (
                      <article key={t.id} className="task-prazo-card">
                        <div className="task-prazo-card__title">
                          <span className="task-prazo-card__code">{t.code}</span> {t.title}
                        </div>
                        <div className="task-prazo-card__proj">{proj?.projectName ?? '—'}</div>
                        <div className="task-prazo-card__row">
                          <span className="task-prazo-card__due">
                            {t.dueDate ? formatDatePt(t.dueDate) : '—'}
                          </span>
                          {an ? <AnalystAvatar name={an.name} color={an.color} avatarUrl={an.avatarUrl} size="sm" /> : null}
                        </div>
                        <select
                          className="input input--xs task-prazo-card__status"
                          value={t.status}
                          disabled={!canEdit}
                          onChange={(e) => onStatusChange(t.id, e.target.value as TaskStatus)}
                        >
                          {STATUS_OPTS.map((s) => (
                            <option key={s} value={s}>
                              {s.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </article>
                    )
                  })
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

type TarefasFaseViewProps = {
  tasks: DbTask[]
  projects: DbProject[]
  phases: DbPhase[]
  analysts: { id: string; name: string; color: string; avatarUrl?: string | null }[]
  onStatusChange: (id: string, next: TaskStatus) => void
  canEdit: boolean
}

export function TarefasFaseView({ tasks, projects, phases, analysts, onStatusChange, canEdit }: TarefasFaseViewProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const groups = useMemo(() => {
    const projectById = new Map(projects.map((p) => [p.id, p]))

    const projs = [...new Set(tasks.map((t) => t.projectId))]
      .map((id) => projectById.get(id))
      .filter(Boolean) as DbProject[]
    projs.sort((a, b) => a.projectName.localeCompare(b.projectName, 'pt-BR'))

    const out: {
      project: DbProject
      phases: { phase: DbPhase; tasks: DbTask[] }[]
    }[] = []

    for (const proj of projs) {
      const projPhases = phases.filter((ph) => ph.projectId === proj.id).sort((a, b) => a.orderIndex - b.orderIndex)
      const phaseIds = new Set(projPhases.map((ph) => ph.id))
      const phaseGroups: { phase: DbPhase; tasks: DbTask[] }[] = []
      for (const ph of projPhases) {
        const ts = tasks
          .filter((t) => t.projectId === proj.id && t.phaseId === ph.id)
          .sort((a, b) => compareTaskCode(a.code, b.code) || a.sortOrder - b.sortOrder)
        if (ts.length > 0) phaseGroups.push({ phase: ph, tasks: ts })
      }
      const realOrphans = tasks
        .filter((t) => t.projectId === proj.id && !phaseIds.has(t.phaseId))
        .sort((a, b) => compareTaskCode(a.code, b.code) || a.sortOrder - b.sortOrder)
      if (phaseGroups.length > 0 || realOrphans.length > 0) {
        const row: { project: DbProject; phases: { phase: DbPhase; tasks: DbTask[] }[] } = {
          project: proj,
          phases: [...phaseGroups],
        }
        if (realOrphans.length > 0) {
          const synthetic: DbPhase = {
            id: `__orphan__${proj.id}`,
            projectId: proj.id,
            name: 'Sem fase vinculada',
            orderIndex: 999,
            status: 'ativa',
          }
          row.phases.push({ phase: synthetic, tasks: realOrphans })
        }
        out.push(row)
      }
    }

    return out
  }, [tasks, projects, phases])

  function keyFor(pId: string, phId: string) {
    return `${pId}::${phId}`
  }

  function isOpen(k: string) {
    return expanded[k] !== false
  }

  function toggle(k: string) {
    setExpanded((prev) => {
      const cur = prev[k] !== false
      return { ...prev, [k]: !cur }
    })
  }

  return (
    <div className="task-fase" role="region" aria-label="Tarefas por fase">
      <p className="task-fase-hint muted">
        Agrupado por <strong>projeto</strong> e <strong>fase</strong>. Clique na barra para expandir ou recolher.
      </p>
      {groups.length === 0 ? (
        <p className="muted pad">Nenhuma tarefa com os filtros atuais.</p>
      ) : (
        groups.map(({ project, phases: phGroups }) => (
          <section key={project.id} className="task-fase-project">
            <h3 className="task-fase-project__name">{project.projectName}</h3>
            <div className="task-fase-phases">
              {phGroups.map(({ phase, tasks: ts }) => {
                const k = keyFor(project.id, phase.id)
                const open = isOpen(k)
                return (
                  <div key={phase.id} className="task-fase-group">
                    <button
                      type="button"
                      className="task-fase-group__head"
                      onClick={() => toggle(k)}
                      aria-expanded={open}
                    >
                      <span className="task-fase-group__chev" aria-hidden>
                        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </span>
                      <span className="task-fase-group__title">{phase.name}</span>
                      <span className="task-fase-group__count">{ts.length}</span>
                    </button>
                    {open ? (
                      <div className="task-fase-table-wrap">
                        <table className="table task-fase-table">
                          <thead>
                            <tr>
                              <th>Tarefa</th>
                              <th>Prioridade</th>
                              <th>Status</th>
                              <th>Prazo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ts.map((t) => {
                              const an = t.assignedTo ? analysts.find((x) => x.id === t.assignedTo) : null
                              return (
                                <tr key={t.id}>
                                  <td>
                                    <div className="cell-main">
                                      <strong>
                                        {t.code} {t.title}
                                      </strong>
                                    </div>
                                  </td>
                                  <td>
                                    <span className="pill pill--accent">{t.priority}</span>
                                  </td>
                                  <td>
                                    <select
                                      className="input input--xs"
                                      value={t.status}
                                      disabled={!canEdit}
                                      onChange={(e) => onStatusChange(t.id, e.target.value as TaskStatus)}
                                    >
                                      {STATUS_OPTS.map((s) => (
                                        <option key={s} value={s}>
                                          {s.replace('_', ' ')}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td>
                                    <span className="task-fase-due">{t.dueDate ? formatDatePt(t.dueDate) : '—'}</span>
                                    {an ? (
                                      <>
                                        {' '}
                                        <AnalystAvatar name={an.name} color={an.color} avatarUrl={an.avatarUrl} size="sm" />
                                      </>
                                    ) : null}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
