import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useLocation } from 'react-router-dom'
import { Clock, Plus, TrendingUp } from 'lucide-react'
import { ProjectCreateModal } from '../components/ProjectCreateModal'
import { db } from '../db/database'
import { useAuth } from '../auth/AuthContext'
import { hasScope } from '../auth/permissions'
import { deleteProjectCascade } from '../services/projectDelete'
import { projectProgressPercent } from '../lib/projectProgress'
import { getOpenTaskCodeBadges, getPhaseSegments, statusLabelPt } from '../lib/projectPhaseUi'
import { getActivePlanLabel, getLastCompletedPlanLabel, planPhaseAccentHex } from '../lib/planLabelDisplay'
import { PlanLabelPill, PlanLabelRow } from '../components/PlanLabelChips'
import type { DbProject, KanbanColumn } from '../db/types'
import { compareTaskCode } from '../lib/taskCode'
import { useUiFeedback } from '../ui/UiFeedbackContext'
import {
  readProjectStartDateSortOrder,
  sortProjectsByStartDate,
  writeProjectStartDateSortOrder,
  type ProjectStartDateSortOrder,
} from '../lib/projectSort'

const metaIcon = { size: 15, strokeWidth: 2, absoluteStrokeWidth: true } as const

export function ProjectsPage() {
  const { requestConfirm } = useUiFeedback()
  const { user } = useAuth()
  const location = useLocation()
  const openedRef = useRef(false)
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? []
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? []
  const phases = useLiveQuery(() => db.phases.toArray(), []) ?? []
  const analysts = (useLiveQuery(() => db.analysts.toArray(), []) ?? []).filter((a) => a.active)
  const plans = useLiveQuery(() => db.planModels.filter((p) => p.active).toArray(), []) ?? []

  const [open, setOpen] = useState(false)
  const [createKanbanColumn, setCreateKanbanColumn] = useState<KanbanColumn>('novos')
  const [editingProject, setEditingProject] = useState<DbProject | null>(null)
  const [startDateSort, setStartDateSort] = useState<ProjectStartDateSortOrder>(() => readProjectStartDateSortOrder())

  const sortedProjects = useMemo(() => sortProjectsByStartDate(projects, startDateSort), [projects, startDateSort])

  useEffect(() => {
    const st = location.state as { openNew?: boolean; kanbanColumn?: KanbanColumn } | null
    if (!user || !hasScope(user, 'projects.edit')) return
    if (st?.openNew && !openedRef.current) {
      if (st.kanbanColumn) setCreateKanbanColumn(st.kanbanColumn)
      setEditingProject(null)
      setOpen(true)
      openedRef.current = true
    }
  }, [location.state, user])

  async function onDelete(id: string) {
    if (!user) return
    if (!hasScope(user, 'projects.edit')) return
    const p = await db.projects.get(id)
    if (!p) return
    const ok =
      user.role === 'admin' || p.createdBy === user.id
        ? await requestConfirm({
            title: 'Excluir projeto',
            message: 'Excluir projeto e todos os dados vinculados?',
            confirmLabel: 'Excluir',
            cancelLabel: 'Cancelar',
            danger: true,
          })
        : false
    if (!ok) return
    await deleteProjectCascade(id)
  }

  if (!user) return null
  const canEditProjects = hasScope(user, 'projects.edit')

  return (
    <div className="page">
      <header className="page__header page__header--split">
        <div>
          <h1 className="page__title">Projetos</h1>
          <p className="page__subtitle">{projects.length} projeto(s) cadastrado(s)</p>
        </div>
        <button
          type="button"
          className="btn btn--primary proj-page__new"
          disabled={!canEditProjects}
          onClick={() => {
            if (!canEditProjects) return
            setEditingProject(null)
            setCreateKanbanColumn('novos')
            setOpen(true)
          }}
        >
          <Plus size={18} strokeWidth={2.25} absoluteStrokeWidth aria-hidden />
          Novo Projeto
        </button>
      </header>

      <div
        className="dashboard-agenda-filter projects-page__start-sort"
        role="group"
        aria-label="Ordenar projetos por data de início"
      >
        <button
          type="button"
          className={'dashboard-agenda-filter__btn' + (startDateSort === 'desc' ? ' is-active' : '')}
          onClick={() => {
            setStartDateSort('desc')
            writeProjectStartDateSortOrder('desc')
          }}
        >
          Início Z→A (recentes)
        </button>
        <button
          type="button"
          className={'dashboard-agenda-filter__btn' + (startDateSort === 'asc' ? ' is-active' : '')}
          onClick={() => {
            setStartDateSort('asc')
            writeProjectStartDateSortOrder('asc')
          }}
        >
          Início A→Z (antigas)
        </button>
      </div>

      <div className="project-grid">
        {sortedProjects.map((p) => {
          const pct = projectProgressPercent(tasks, p.id)
          const projectTasks = tasks.filter((t) => t.projectId === p.id)
          const done = projectTasks.filter((t) => t.status === 'concluida').length
          const planName = plans.find((pl) => pl.key === p.planType)?.name ?? p.planType
          const { segments, currentPhaseName } = getPhaseSegments(phases, tasks, p.id)
          const phSorted = phases
            .filter((x) => x.projectId === p.id)
            .sort((a, b) => a.orderIndex - b.orderIndex)
          const currentSegIdx = segments.findIndex((s) => s === 'current')
          const phaseCaptionColor =
            currentSegIdx >= 0 && phSorted[currentSegIdx]
              ? planPhaseAccentHex(phSorted[currentSegIdx].orderIndex)
              : undefined
          const codeBadges = getOpenTaskCodeBadges(phases, tasks, p.id)
          const lastPlanLabel = getLastCompletedPlanLabel(tasks, p.id)
          const activePlanLabel = getActivePlanLabel(tasks, p.id, phases)
          const tooltipBits = [p.tradeName?.trim(), p.razaoSocial?.trim(), p.cnpj].filter(Boolean)

          return (
            <article key={p.id} className="proj-card">
              <div className="proj-card__head">
                <h2 className="proj-card__title">
                  <Link
                    to={`/projetos/${p.id}`}
                    title={tooltipBits.length ? tooltipBits.join(' · ') : undefined}
                    className="proj-card__title-link"
                  >
                    {p.projectName}
                  </Link>
                </h2>
                <div className="proj-card__badges">
                  <span className="proj-card__badge proj-card__badge--plan" title={p.planType}>
                    {planName}
                  </span>
                  <span className={'proj-card__badge proj-card__badge--status is-' + p.status}>
                    {statusLabelPt(p.status)}
                  </span>
                </div>
              </div>

              {segments.length > 0 ? (
                <div
                  className="proj-card__phase-bar"
                  style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }}
                  role="img"
                  aria-label="Progresso por fase"
                >
                  {segments.map((state, i) => (
                    <div
                      key={i}
                      className={'proj-card__phase-seg proj-card__phase-seg--' + state}
                      style={{
                        ['--seg-base' as string]: planPhaseAccentHex(phSorted[i]?.orderIndex ?? i),
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="proj-card__phase-bar proj-card__phase-bar--empty" aria-hidden />
              )}

              <div className="proj-card__meta-row">
                <div className="proj-card__meta-item">
                  <Clock {...metaIcon} aria-hidden />
                  <span>
                    {p.hoursUsed}h / {p.hoursContracted}h
                  </span>
                </div>
                <div className="proj-card__meta-item proj-card__meta-item--phase">
                  <TrendingUp {...metaIcon} aria-hidden />
                  <span
                    className="proj-card__phase-caption"
                    style={phaseCaptionColor ? { color: phaseCaptionColor } : undefined}
                  >
                    {currentPhaseName ?? '—'}
                  </span>
                </div>
              </div>

              <div className="proj-card__plan-labels">
                <PlanLabelRow last={lastPlanLabel} active={activePlanLabel} variant="dashboard" />
              </div>

              <div className="proj-card__codes">
                <span className="proj-card__codes-heading">Em aberto</span>
                {codeBadges.length === 0 ? (
                  <span className="proj-card__codes-empty muted">Nenhuma tarefa em aberto</span>
                ) : (
                  codeBadges.map((b) => {
                    const openForCode = projectTasks
                      .filter(
                        (x) =>
                          x.code === b.code &&
                          !x.isInformational &&
                          (x.status === 'pendente' || x.status === 'em_andamento'),
                      )
                      .sort((a, c) => compareTaskCode(a.code, c.code) || a.sortOrder - c.sortOrder)
                    const openTask = openForCode[0]
                    return (
                      <PlanLabelPill
                        key={b.code}
                        chip={{ code: b.code, name: openTask?.title ?? b.code }}
                        variant="compact"
                        kind={b.tone === 'progress' ? 'open-progress' : 'open-pending'}
                        codeOnly
                      />
                    )
                  })
                )}
              </div>

              <div className="proj-card__progress-row">
                <div className="proj-card__progress-track">
                  <div className="proj-card__progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="proj-card__progress-pct">{pct}%</span>
              </div>

              <footer className="proj-card__foot">
                <span className="proj-card__summary">
                  {done} de {projectTasks.length} tarefas concluídas
                </span>
                {(user.role === 'admin' || p.createdBy === user.id) && canEditProjects && (
                  <span className="proj-card__actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => {
                        setEditingProject(p)
                        setOpen(true)
                      }}
                    >
                      Editar
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDelete(p.id)}>
                      Excluir
                    </button>
                  </span>
                )}
              </footer>
            </article>
          )
        })}
      </div>

      <ProjectCreateModal
        open={open}
        onClose={() => {
          setOpen(false)
          setEditingProject(null)
        }}
        user={user}
        plans={plans}
        analysts={analysts}
        initialKanbanColumn={createKanbanColumn}
        projectToEdit={editingProject}
      />
    </div>
  )
}
