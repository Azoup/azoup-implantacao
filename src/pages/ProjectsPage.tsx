import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useLocation } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDownAZ,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
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
import {
  PLAN_FILTER_OPTIONS,
  normalizePlanTypeKey,
  planPillClass,
  planSummaryLabel,
} from '../constants/customPlan'
import {
  flushPendingProjectGraphSyncByProject,
  getProjectCloudSyncMeta,
  getPendingProjectGraphSyncIds,
} from '../sync/supabaseDexieBridge'
import { registerProjectManualCheckin } from '../services/project'
import { deriveProjectFreshnessBySla, projectFreshnessLabel } from '../services/projectFreshness'
import { formatDatePt } from '../lib/dates'

const metaIcon = { size: 15, strokeWidth: 2, absoluteStrokeWidth: true } as const

export function ProjectsPage() {
  const { toast, toastError, requestConfirm } = useUiFeedback()
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
  const [projectModalDirty, setProjectModalDirty] = useState(false)
  const [createKanbanColumn, setCreateKanbanColumn] = useState<KanbanColumn>('novos')
  const [editingProject, setEditingProject] = useState<DbProject | null>(null)
  const [projectSort, setProjectSort] = useState<ProjectSortConfig>(() => readProjectSortConfig())
  const [projectNameSearch, setProjectNameSearch] = useState('')
  const [selectedAnalystIds, setSelectedAnalystIds] = useState<string[]>([])
  const [selectedPlanTypes, setSelectedPlanTypes] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<DbProject | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [syncRefreshing, setSyncRefreshing] = useState<Record<string, boolean>>({})
  const [_syncTick, setSyncTick] = useState(0)
  const [_checkinTick, setCheckinTick] = useState(0)
  const [pendingModalOpen, setPendingModalOpen] = useState(false)

  useRegisterUnsavedChanges({
    enabled: open,
    isDirty: () => projectModalDirty,
    message:
      'O formulário de criação ou edição de projeto está aberto. Feche-o após gravar, ou saia sem gravar para descartar.',
  })

  const visibleProjects = useMemo(() => {
    const sorted = sortProjects(projects, projectSort)
    const analystFiltered =
      selectedAnalystIds.length === 0
        ? sorted
        : sorted.filter((p) => p.analystId && selectedAnalystIds.includes(p.analystId))
    const planFiltered =
      selectedPlanTypes.length === 0
        ? analystFiltered
        : analystFiltered.filter((p) => selectedPlanTypes.includes(normalizePlanTypeKey(p.planType)))
    const q = projectNameSearch.trim().toLowerCase()
    if (!q) return planFiltered
    return planFiltered.filter((p) => p.projectName.toLowerCase().includes(q))
  }, [projects, projectSort, projectNameSearch, selectedAnalystIds, selectedPlanTypes])

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

  useEffect(() => {
    const id = window.setInterval(() => setSyncTick((n) => n + 1), 5000)
    return () => window.clearInterval(id)
  }, [])

  const pendingIds = new Set(getPendingProjectGraphSyncIds())
  const pendingFreshnessProjects = useMemo(() => {
    return visibleProjects.filter((project) => {
      const status = deriveProjectFreshnessBySla(project).status
      return status === 'atrasado' || status === 'critico' || status === 'neutro'
    })
  }, [visibleProjects])

  async function onManualCheckin(projectId: string, projectName: string) {
    if (!canEditProjects || !user) return
    const ok = await requestConfirm({
      title: 'Confirmar check-in manual',
      message: `Registrar check-in manual para "${projectName}" agora?`,
      confirmLabel: 'Registrar',
      cancelLabel: 'Cancelar',
    })
    if (!ok) return
    await registerProjectManualCheckin(projectId, user.id)
    setCheckinTick((n) => n + 1)
    toast('Check-in manual registrado.')
  }

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
    <div className="page page--projects-hub">
      <header className="page__header page__header--split">
        <div>
          <h1 className="page__title">Projetos</h1>
          <p className="page__subtitle">{projects.length} projeto(s) cadastrado(s)</p>
        </div>
        {canEditProjects ? (
          <button
            type="button"
            className="btn btn--ghost proj-page__new"
            onClick={() => {
              setEditingProject(null)
              setCreateKanbanColumn('novos')
              setOpen(true)
            }}
          >
            <Plus size={18} strokeWidth={2.25} absoluteStrokeWidth aria-hidden />
            Novo projeto
          </button>
        ) : null}
      </header>

      <div className="projects-page__toolbar">
        <div className="project-sortbar" aria-label="Ordenação de projetos">
          <button
            type="button"
            className={'project-sortbar__toggle' + (projectSort.key === 'startDate' ? ' is-active' : '')}
            aria-pressed={projectSort.key === 'startDate'}
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
            aria-pressed={projectSort.key === 'name'}
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
                aria-pressed={selected}
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
        <div className="projects-page__plan-filter" role="group" aria-label="Filtrar por plano">
          {PLAN_FILTER_OPTIONS.map((plan) => {
            const selected = selectedPlanTypes.includes(plan.key)
            return (
              <button
                key={plan.key}
                type="button"
                className={'projects-page__plan-chip ' + planPillClass(plan.key) + (selected ? ' is-selected' : '')}
                aria-pressed={selected}
                onClick={() =>
                  setSelectedPlanTypes((prev) =>
                    prev.includes(plan.key) ? prev.filter((key) => key !== plan.key) : [...prev, plan.key],
                  )
                }
                title={selected ? `Remover filtro: ${plan.label}` : `Filtrar por: ${plan.label}`}
              >
                {plan.label}
              </button>
            )
          })}
          {selectedPlanTypes.length > 0 ? (
            <button
              type="button"
              className="projects-page__plan-clear"
              onClick={() => setSelectedPlanTypes([])}
            >
              Limpar planos
            </button>
          ) : null}
        </div>
        <label className="projects-page__search" aria-label="Buscar projeto por nome">
          <Search size={15} strokeWidth={2} />
          <input
            className="input projects-page__search-input"
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
        <button
          type="button"
          className="btn btn--ghost btn--sm projects-page__pending-btn"
          onClick={() => setPendingModalOpen(true)}
          title="Ver pendências por status de frescor"
        >
          <AlertTriangle size={14} strokeWidth={2} />
          Pendências ({pendingFreshnessProjects.length})
        </button>
      </div>

      {visibleProjects.length === 0 ? (
        <div className="projects-page__empty" role="status">
          {projects.length === 0 ? (
            <>
              {canEditProjects ? (
                <p>
                  Nenhum projeto cadastrado ainda. O cadastro principal fica no botão{' '}
                  <strong>+ Novo projeto</strong> na barra lateral — sempre no mesmo lugar.
                </p>
              ) : (
                <p>Nenhum projeto disponível. Se precisar de cadastros novos, peça a um administrador.</p>
              )}
              {canEditProjects ? (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => {
                    setEditingProject(null)
                    setCreateKanbanColumn('novos')
                    setOpen(true)
                  }}
                >
                  Criar primeiro projeto
                </button>
              ) : null}
            </>
          ) : (
            <p>Nenhum projeto corresponde aos filtros ou à busca. Ajuste os filtros ou limpe a pesquisa.</p>
          )}
        </div>
      ) : (
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
          const syncMeta = getProjectCloudSyncMeta(p.id)
          const syncStatusLabel =
            syncMeta.state === 'synced'
              ? 'Nuvem confirmada'
              : syncMeta.state === 'pending'
                ? 'Salvo localmente; sincronizando com a nuvem'
                : 'Falha na sincronização; nova tentativa na fila'
          const syncStatusTitle = syncMeta.lastErrorCode ?? syncStatusLabel
          const freshness = deriveProjectFreshnessBySla(p).status
          const projectStartIso = p.startDate ?? p.createdAt
          const projectStartLabel = formatDatePt(projectStartIso)

          const resolveCodeColor = (code: string): string | null => {
            const major = Number.parseInt(code.split('.')[0] ?? '0', 10)
            const phase = Number.isFinite(major) && major >= 0 ? phSorted[major] : null
            return phase?.colorHex ?? (phase ? planPhaseAccentHex(phase.orderIndex) : null)
          }

          return (
            <article key={p.id} className="proj-card">
              <div className="proj-card__head">
                <div className="proj-card__title-stack">
                  <h2 className="proj-card__title">
                    <Link
                      to={`/projetos/${p.id}`}
                      title={tooltipBits.length ? tooltipBits.join(' · ') : undefined}
                      className="proj-card__title-link"
                    >
                      {p.projectName}
                    </Link>
                  </h2>
                  <p className="proj-card__start-line" aria-label={`Data de início: ${projectStartLabel}`}>
                    <CalendarDays
                      className="proj-card__start-icon"
                      size={13}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="proj-card__start-kicker">Início</span>
                    <time
                      className="proj-card__start-date"
                      dateTime={projectStartIso.slice(0, 10)}
                      title={p.startDate ? 'Data de início do projeto' : 'Data de início (cadastro do projeto)'}
                    >
                      {projectStartLabel}
                    </time>
                  </p>
                </div>
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
                  <span
                    className={'proj-card__sync-dot is-' + syncMeta.state}
                    role="img"
                    aria-label={`Status de sincronização: ${syncStatusLabel}`}
                    title={syncStatusTitle}
                  />
                  <span className={'proj-card__badge proj-card__badge--freshness is-' + freshness}>
                    {projectFreshnessLabel(freshness)}
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
                <div className="proj-card__meta-item proj-card__meta-item--checkin">
                  <CheckCheck {...metaIcon} aria-hidden />
                  <span>Check-in: {p.lastManualCheckinAt ? formatDatePt(p.lastManualCheckinAt, 'dd/MM HH:mm') : '—'}</span>
                </div>
                <div
                  className="proj-card__meta-item proj-card__meta-item--phase"
                  style={
                    phaseCaptionColor ? { ['--proj-phase-accent' as string]: phaseCaptionColor } : undefined
                  }
                >
                  <span className="proj-card__phase-caption">{currentPhaseName ?? '—'}</span>
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
                <span className="proj-card__actions">
                  {pendingIds.has(p.id) ? (
                    <button
                      type="button"
                      className="btn btn--ghost btn--icon proj-card__icon-action"
                      aria-label="Sincronizar projeto com nuvem"
                      title={getProjectCloudSyncMeta(p.id).lastErrorCode ? `Reenviar (${getProjectCloudSyncMeta(p.id).lastErrorCode})` : 'Sincronizar agora'}
                      disabled={!!syncRefreshing[p.id]}
                      onClick={() => {
                        void (async () => {
                          setSyncRefreshing((prev) => ({ ...prev, [p.id]: true }))
                          try {
                            await flushPendingProjectGraphSyncByProject(p.id)
                            setSyncTick((n) => n + 1)
                            const meta = getProjectCloudSyncMeta(p.id)
                            toast(
                              meta.state === 'synced'
                                ? 'Nuvem confirmou o projeto.'
                                : 'Salvo localmente; sincronizando com a nuvem.',
                            )
                          } catch (e) {
                            toastError(e instanceof Error ? e.message : 'Falha ao sincronizar projeto.')
                          } finally {
                            setSyncRefreshing((prev) => ({ ...prev, [p.id]: false }))
                          }
                        })()
                      }}
                    >
                      <RotateCcw size={15} strokeWidth={2.1} />
                    </button>
                  ) : null}
                  {canEditProjects ? (
                    <>
                    <button
                      type="button"
                      className="btn btn--ghost btn--icon proj-card__icon-action"
                      aria-label="Registrar check-in manual"
                      title="Check-in manual"
                      onClick={() => void onManualCheckin(p.id, p.projectName)}
                    >
                      <CheckCheck size={15} strokeWidth={2.15} />
                    </button>
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
                    {user.role === 'admin' || p.createdBy === user.id ? (
                      <button
                        type="button"
                        className="btn btn--ghost btn--icon proj-card__icon-action proj-card__icon-action--danger"
                        aria-label="Excluir projeto"
                        title="Excluir projeto"
                        onClick={() => onDelete(p.id)}
                      >
                        <Trash2 size={15} strokeWidth={2.1} />
                      </button>
                    ) : null}
                    </>
                  ) : null}
                </span>
              </footer>
            </article>
          )
        })}
        </div>
      )}

      <ProjectCreateModal
        open={open}
        onClose={() => {
          setOpen(false)
          setEditingProject(null)
          setProjectModalDirty(false)
        }}
        onDirtyChange={setProjectModalDirty}
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
      {pendingModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setPendingModalOpen(false)}>
          <div className="modal" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Pendências de check-in</h2>
            <p className="muted">Projetos em neutro, atrasado ou crítico precisam de acompanhamento manual.</p>
            <div className="dashboard-side-stack">
              {pendingFreshnessProjects.length === 0 ? (
                <p className="muted">Nenhuma pendência no momento.</p>
              ) : (
                pendingFreshnessProjects.map((project) => {
                  const status = deriveProjectFreshnessBySla(project).status
                  return (
                    <div key={project.id} className="dashboard-cc__row">
                      <strong>{project.projectName}</strong>
                      <span>{projectFreshnessLabel(status)}</span>
                      <small>
                        Último check-in: {project.lastManualCheckinAt ? formatDatePt(project.lastManualCheckinAt, 'dd/MM/yyyy HH:mm') : '—'}
                      </small>
                    </div>
                  )
                })
              )}
            </div>
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setPendingModalOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
