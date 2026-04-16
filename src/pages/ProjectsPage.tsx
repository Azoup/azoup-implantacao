import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useLocation } from 'react-router-dom'
import { ArrowDownAZ, ArrowUpWideNarrow, CalendarDays, Clock, Plus, Search, TrendingUp, X } from 'lucide-react'
import { ProjectCreateModal } from '../components/ProjectCreateModal'
import { db } from '../db/database'
import { useAuth } from '../auth/AuthContext'
import { hasScope } from '../auth/permissions'
import { deleteProjectCascade, recordProjectDeletionLog } from '../services/projectDelete'
import { projectProgressPercent } from '../lib/projectProgress'
import { getOpenTaskCodeBadges, getPhaseSegments, statusLabelPt } from '../lib/projectPhaseUi'
import { getActivePlanLabel, getLastCompletedPlanLabel, planPhaseAccentHex } from '../lib/planLabelDisplay'
import { PlanLabelPill, PlanLabelRow } from '../components/PlanLabelChips'
import { AnalystAvatar } from '../components/AnalystAvatar'
import { ConfirmProjectDeleteModal } from '../components/ConfirmProjectDeleteModal'
import type { DbProject, KanbanColumn } from '../db/types'
import { compareTaskCode } from '../lib/taskCode'
import { formatDurationHmFromHours } from '../lib/durationFormat'
import { useUiFeedback } from '../ui/UiFeedbackContext'
import {
  readProjectSortConfig,
  sortProjects,
  writeProjectSortConfig,
  type ProjectSortConfig,
} from '../lib/projectSort'

const metaIcon = { size: 15, strokeWidth: 2, absoluteStrokeWidth: true } as const

export function ProjectsPage() {
  const { toast, toastError } = useUiFeedback()
  const { user } = useAuth()
  const location = useLocation()
  const openedRef = useRef(false)
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? []
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? []
  const phases = useLiveQuery(() => db.phases.toArray(), []) ?? []
  const analystsAll = useLiveQuery(() => db.analysts.toArray(), []) ?? []
  const analysts = useMemo(() => analystsAll.filter((a) => a.active), [analystsAll])
  const plans = useLiveQuery(() => db.planModels.filter((p) => p.active).toArray(), []) ?? []

  const [open, setOpen] = useState(false)
  const [createKanbanColumn, setCreateKanbanColumn] = useState<KanbanColumn>('novos')
  const [editingProject, setEditingProject] = useState<DbProject | null>(null)
  const [projectSort, setProjectSort] = useState<ProjectSortConfig>(() => readProjectSortConfig())
  const [projectNameSearch, setProjectNameSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<DbProject | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const visibleProjects = useMemo(() => {
    const sorted = sortProjects(projects, projectSort)
    const q = projectNameSearch.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((p) => p.projectName.toLowerCase().includes(q))
  }, [projects, projectSort, projectNameSearch])

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
    if (!(user.role === 'admin' || p.createdBy === user.id)) return
    setDeleteTarget(p)
  }

  async function confirmDeleteTarget(reason: string) {
    if (!user || !deleteTarget || deleteSubmitting) return
    setDeleteSubmitting(true)
    try {
      await recordProjectDeletionLog({
        projectId: deleteTarget.id,
        projectName: deleteTarget.projectName,
        user,
        justification: reason,
      })
      await deleteProjectCascade(deleteTarget.id)
      setDeleteTarget(null)
      toast('Projeto excluído com sucesso.')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Não foi possível excluir o projeto.')
    } finally {
      setDeleteSubmitting(false)
    }
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

      <div className="projects-page__toolbar">
        <div className="project-sortbar" role="group" aria-label="Ordenação de projetos">
          <button
            type="button"
            className={'project-sortbar__btn' + (projectSort.key === 'name' ? ' is-active' : '')}
            onClick={() => {
              const next: ProjectSortConfig = { ...projectSort, key: 'name' }
              setProjectSort(next)
              writeProjectSortConfig(next)
            }}
            title="Ordenar por nome"
          >
            <ArrowDownAZ size={15} strokeWidth={2} />
            Nome
          </button>
          <button
            type="button"
            className={'project-sortbar__btn' + (projectSort.key === 'startDate' ? ' is-active' : '')}
            onClick={() => {
              const next: ProjectSortConfig = { ...projectSort, key: 'startDate' }
              setProjectSort(next)
              writeProjectSortConfig(next)
            }}
            title="Ordenar por início do projeto"
          >
            <CalendarDays size={15} strokeWidth={2} />
            Início
          </button>
          <button
            type="button"
            className="project-sortbar__btn project-sortbar__btn--dir"
            onClick={() => {
              const next: ProjectSortConfig = {
                ...projectSort,
                direction: projectSort.direction === 'asc' ? 'desc' : 'asc',
              }
              setProjectSort(next)
              writeProjectSortConfig(next)
            }}
            title={projectSort.direction === 'asc' ? 'Direção: ascendente' : 'Direção: descendente'}
          >
            <ArrowUpWideNarrow size={15} strokeWidth={2} />
            {projectSort.direction === 'asc' ? 'A-Z' : 'Z-A'}
          </button>
        </div>
        <label className="projects-page__search" aria-label="Buscar projeto por nome">
          <Search size={15} strokeWidth={2} />
          <input
            className="input input--sm projects-page__search-input"
            type="text"
            placeholder="Buscar por nome do projeto..."
            value={projectNameSearch}
            onChange={(e) => setProjectNameSearch(e.target.value)}
          />
          {projectNameSearch ? (
            <button
              type="button"
              className="projects-page__search-clear"
              aria-label="Limpar busca"
              onClick={() => setProjectNameSearch('')}
            >
              <X size={13} strokeWidth={2.3} />
            </button>
          ) : null}
        </label>
      </div>

      <div className="project-grid">
        {visibleProjects.map((p) => {
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
          const analyst = analystsAll.find((a) => a.id === p.analystId)

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
                  {analyst ? (
                    <span className="proj-card__analyst" title={`Analista responsável: ${analyst.name}`}>
                      <AnalystAvatar
                        name={analyst.name}
                        color={analyst.color}
                        avatarUrl={analyst.avatarUrl}
                        size="sm"
                      />
                    </span>
                  ) : null}
                  {p.clientApiId?.trim() ? (
                    <span className="proj-card__badge proj-card__badge--api" title="API do projeto">
                      API {p.clientApiId}
                    </span>
                  ) : null}
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
                    {formatDurationHmFromHours(p.hoursUsed)} / {formatDurationHmFromHours(p.hoursContracted)}
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

      <ConfirmProjectDeleteModal
        open={!!deleteTarget}
        projectName={deleteTarget?.projectName ?? ''}
        busy={deleteSubmitting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteTarget}
      />
    </div>
  )
}
