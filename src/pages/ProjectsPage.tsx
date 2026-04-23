import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useLocation } from 'react-router-dom'
import { ArrowDownAZ, CalendarDays, ChevronDown, ChevronUp, Clock, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { ProjectCreateModal } from '../components/ProjectCreateModal'
import { db } from '../db/database'
import {
  emptyAnalysts,
  emptyPhases,
  emptyPlanModels,
  emptyProjects,
  emptyTasks,
} from '../lib/stableDexieEmpty'
import { useAuth } from '../auth/AuthContext'
import { hasScope } from '../auth/permissions'
import { deleteProjectCascade, recordProjectDeletionLog } from '../services/projectDelete'
import { projectProgressPercent } from '../lib/projectProgress'
import { getPhaseSegments, statusLabelPt } from '../lib/projectPhaseUi'
import { getActivePlanLabel, getLastCompletedPlanLabel, planPhaseAccentHex } from '../lib/planLabelDisplay'
import { PlanLabelRow } from '../components/PlanLabelChips'
import { AnalystAvatar } from '../components/AnalystAvatar'
import { ConfirmProjectDeleteModal } from '../components/ConfirmProjectDeleteModal'
import type { DbProject, KanbanColumn } from '../db/types'
import { formatDurationHFromHours } from '../lib/durationFormat'
import { useRegisterUnsavedChanges } from '../navigation/UnsavedChangesContext'
import { useUiFeedback } from '../ui/UiFeedbackContext'
import {
  readProjectSortConfig,
  sortProjects,
  writeProjectSortConfig,
  type ProjectSortConfig,
} from '../lib/projectSort'
import { planPillClass, planSummaryLabel } from '../constants/customPlan'

const metaIcon = { size: 15, strokeWidth: 2, absoluteStrokeWidth: true } as const

export function ProjectsPage() {
  const { toast, toastError } = useUiFeedback()
  const { user } = useAuth()
  const location = useLocation()
  const openedRef = useRef(false)
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? emptyProjects
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? emptyTasks
  const phases = useLiveQuery(() => db.phases.toArray(), []) ?? emptyPhases
  const analystsAll = useLiveQuery(() => db.analysts.toArray(), []) ?? emptyAnalysts
  const analysts = useMemo(() => analystsAll.filter((a) => a.active), [analystsAll])
  const plans = useLiveQuery(() => db.planModels.filter((p) => p.active).toArray(), []) ?? emptyPlanModels

  const [open, setOpen] = useState(false)
  const [createKanbanColumn, setCreateKanbanColumn] = useState<KanbanColumn>('novos')
  const [editingProject, setEditingProject] = useState<DbProject | null>(null)
  const [projectSort, setProjectSort] = useState<ProjectSortConfig>(() => readProjectSortConfig())
  const [projectNameSearch, setProjectNameSearch] = useState('')
  const [selectedAnalystIds, setSelectedAnalystIds] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<DbProject | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  useRegisterUnsavedChanges({
    enabled: open,
    isDirty: () => open,
    message:
      'O formulário de criação ou edição de projeto está aberto. Feche-o após gravar, ou saia sem gravar para descartar.',
  })

  const visibleProjects = useMemo(() => {
    const sorted = sortProjects(projects, projectSort)
    const analystFiltered =
      selectedAnalystIds.length === 0
        ? sorted
        : sorted.filter((p) => p.analystId && selectedAnalystIds.includes(p.analystId))
    const q = projectNameSearch.trim().toLowerCase()
    if (!q) return analystFiltered
    return analystFiltered.filter((p) => p.projectName.toLowerCase().includes(q))
  }, [projects, projectSort, projectNameSearch, selectedAnalystIds])

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
        <div className="project-sortbar" aria-label="Ordenação de projetos">
          <button
            type="button"
            className={'project-sortbar__toggle' + (projectSort.key === 'startDate' ? ' is-active' : '')}
            aria-label="Ordenar por data de início"
            title={
              projectSort.key === 'startDate' && projectSort.direction === 'asc'
                ? 'Mais antigos primeiro'
                : 'Mais novos primeiro'
            }
            onClick={() => {
              const nextDirection =
                projectSort.key === 'startDate' && projectSort.direction === 'asc' ? 'desc' : 'asc'
              const next: ProjectSortConfig = { key: 'startDate', direction: nextDirection }
              setProjectSort(next)
              writeProjectSortConfig(next)
            }}
          >
            <CalendarDays size={14} strokeWidth={2} />
            {projectSort.key === 'startDate' && projectSort.direction === 'asc' ? (
              <ChevronUp size={14} strokeWidth={2.4} />
            ) : (
              <ChevronDown size={14} strokeWidth={2.4} />
            )}
          </button>
          <button
            type="button"
            className={'project-sortbar__toggle' + (projectSort.key === 'name' ? ' is-active' : '')}
            aria-label="Ordenar por nome"
            title={projectSort.key === 'name' && projectSort.direction === 'asc' ? 'Nome A-Z' : 'Nome Z-A'}
            onClick={() => {
              const nextDirection = projectSort.key === 'name' && projectSort.direction === 'asc' ? 'desc' : 'asc'
              const next: ProjectSortConfig = { key: 'name', direction: nextDirection }
              setProjectSort(next)
              writeProjectSortConfig(next)
            }}
          >
            <ArrowDownAZ size={14} strokeWidth={2} />
            <span className="project-sortbar__toggle-text">
              {projectSort.key === 'name' && projectSort.direction === 'desc' ? 'Z-A' : 'A-Z'}
            </span>
            {projectSort.key === 'name' && projectSort.direction === 'desc' ? (
              <ChevronDown size={14} strokeWidth={2.4} />
            ) : (
              <ChevronUp size={14} strokeWidth={2.4} />
            )}
          </button>
        </div>
        <div className="projects-page__analyst-filter" role="group" aria-label="Filtrar por analista">
          {analystsAll.filter((a) => a.active).map((a) => {
            const selected = selectedAnalystIds.includes(a.id)
            return (
              <button
                key={a.id}
                type="button"
                className={'projects-page__analyst-chip' + (selected ? ' is-selected' : '')}
                style={{ ['--analyst-color' as string]: a.color }}
                onClick={() =>
                  setSelectedAnalystIds((prev) =>
                    prev.includes(a.id) ? prev.filter((id) => id !== a.id) : [...prev, a.id],
                  )
                }
                title={selected ? `Remover filtro: ${a.name}` : `Filtrar por: ${a.name}`}
              >
                <AnalystAvatar name={a.name} color={a.color} avatarUrl={a.avatarUrl} size="sm" />
              </button>
            )
          })}
          {selectedAnalystIds.length > 0 ? (
            <button
              type="button"
              className="projects-page__analyst-clear"
              onClick={() => setSelectedAnalystIds([])}
            >
              Limpar analistas
            </button>
          ) : null}
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
          const planName = planSummaryLabel(p.planType)
          const { segments, currentPhaseName } = getPhaseSegments(phases, tasks, p.id)
          const phSorted = phases
            .filter((x) => x.projectId === p.id)
            .sort((a, b) => a.orderIndex - b.orderIndex)
          const currentSegIdx = segments.findIndex((s) => s === 'current')
          const phaseCaptionColor =
            currentSegIdx >= 0 && phSorted[currentSegIdx]
              ? phSorted[currentSegIdx].colorHex || planPhaseAccentHex(phSorted[currentSegIdx].orderIndex)
              : undefined
          const lastPlanLabel = getLastCompletedPlanLabel(tasks, p.id)
          const activePlanLabel = getActivePlanLabel(tasks, p.id, phases)
          const tooltipBits = [p.tradeName?.trim(), p.razaoSocial?.trim(), p.cnpj].filter(Boolean)
          const analyst = analystsAll.find((a) => a.id === p.analystId)

          const resolveCodeColor = (code: string): string | null => {
            const major = Number.parseInt(code.split('.')[0] ?? '0', 10)
            const phase = Number.isFinite(major) && major >= 0 ? phSorted[major] : null
            return phase?.colorHex ?? (phase ? planPhaseAccentHex(phase.orderIndex) : null)
          }

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
                    <span
                      className="proj-card__analyst"
                      title={`Analista responsável: ${analyst.name}`}
                      style={{ ['--analyst-color' as string]: analyst.color }}
                    >
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
                  <span className={planPillClass(p.planType)} title={`Plano: ${planName}`}>
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
                  {segments.map((_, i) => (
                    <div
                      key={i}
                      className={
                        'proj-card__phase-seg ' +
                        (i === currentSegIdx ? 'proj-card__phase-seg--current' : 'proj-card__phase-seg--idle')
                      }
                      style={{
                        ['--seg-base' as string]: phSorted[i]?.colorHex || planPhaseAccentHex(phSorted[i]?.orderIndex ?? i),
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
                    {formatDurationHFromHours(p.hoursUsed)} / {formatDurationHFromHours(p.hoursContracted)}
                  </span>
                </div>
                <div className="proj-card__meta-item proj-card__meta-item--phase">
                  <span
                    className="proj-card__phase-caption"
                    style={phaseCaptionColor ? { color: phaseCaptionColor } : undefined}
                  >
                    {currentPhaseName ?? '—'}
                  </span>
                </div>
              </div>

              <div className="proj-card__plan-labels">
                <PlanLabelRow
                  last={lastPlanLabel}
                  active={activePlanLabel}
                  variant="dashboard"
                  resolveCodeColor={resolveCodeColor}
                />
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
                      className="btn btn--ghost btn--icon proj-card__icon-action"
                      aria-label="Editar projeto"
                      title="Editar projeto"
                      onClick={() => {
                        setEditingProject(p)
                        setOpen(true)
                      }}
                    >
                      <Pencil size={15} strokeWidth={2.15} />
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--icon proj-card__icon-action proj-card__icon-action--danger"
                      aria-label="Excluir projeto"
                      title="Excluir projeto"
                      onClick={() => onDelete(p.id)}
                    >
                      <Trash2 size={15} strokeWidth={2.1} />
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
