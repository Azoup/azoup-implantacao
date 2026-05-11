import { createPortal } from 'react-dom'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useLocation } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDownAZ,
  Ban,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  ChevronUp,
  Clock,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Snowflake,
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
import type { DbProject, KanbanColumn, ProjectClientType, ProjectStatus } from '../db/types'
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
  discardPendingProjectGraphSync,
  flushPendingProjectGraphSyncByProject,
  getProjectCloudSyncMeta,
  getPendingProjectGraphSyncIds,
} from '../sync/supabaseDexieBridge'
import { registerProjectManualCheckin } from '../services/project'
import { applyManualAttentionOnlyPatch } from '../services/projectManualAttentionQuick'
import { applyProjectFreezeToggle } from '../services/projectFreeze'
import { isProjectCheckinStale } from '../services/projectCheckin'
import { formatDatePt } from '../lib/dates'
import { projectClientTypeLabelPt, projectClientTypeSearchBlob } from '../lib/projectClientType'

const metaIcon = { size: 15, strokeWidth: 2, absoluteStrokeWidth: true } as const

const STATUS_FILTER_CHIPS: { status: ProjectStatus; label: string }[] = [
  { status: 'ativo', label: 'EM ANDAMENTO' },
  { status: 'inadimplente', label: 'INADIMPLENTE' },
  { status: 'congelado', label: 'CONGELADO' },
  { status: 'finalizado', label: 'FINALIZADO' },
  { status: 'cancelado', label: 'CANCELADO' },
]

const CLIENT_TYPE_FILTER_CHIPS: { type: ProjectClientType; label: string }[] = [
  { type: 'confeccao', label: 'CONFECÇÃO' },
  { type: 'generico', label: 'GENÉRICO' },
]

export function ProjectsPage() {
  const { toast, toastError, requestConfirm, requestDestructiveWithReason } = useUiFeedback()
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
  const [focusManualAttentionInModal, setFocusManualAttentionInModal] = useState(false)
  const [projectSort, setProjectSort] = useState<ProjectSortConfig>(() => readProjectSortConfig())
  const [projectNameSearch, setProjectNameSearch] = useState('')
  const [selectedAnalystIds, setSelectedAnalystIds] = useState<string[]>([])
  const [selectedPlanTypes, setSelectedPlanTypes] = useState<string[]>([])
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<ProjectStatus[]>([])
  const [selectedClientTypes, setSelectedClientTypes] = useState<ProjectClientType[]>([])
  const [filterManualAlertOnly, setFilterManualAlertOnly] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DbProject | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [syncRefreshing, setSyncRefreshing] = useState<Record<string, boolean>>({})
  const [_syncTick, setSyncTick] = useState(0)
  const [_checkinTick, setCheckinTick] = useState(0)
  const [pendingModalOpen, setPendingModalOpen] = useState(false)
  const [freezeBusyId, setFreezeBusyId] = useState<string | null>(null)
  /** Toques consecutivos no “Reenviar” por projeto; no 3º oferece limpar a fila. */
  const syncRetryCountRef = useRef<Record<string, number>>({})
  const [syncRetryUi, setSyncRetryUi] = useState(0)

  /** Atalho: alerta operacional no card (popover), sem abrir o modal completo. */
  const [attentionQuick, setAttentionQuick] = useState<{
    projectId: string
    mode: 'view' | 'edit'
    editBuffer: string
    err: string | null
  } | null>(null)
  const attentionAnchorRef = useRef<HTMLButtonElement | null>(null)
  const attentionPopoverRef = useRef<HTMLDivElement | null>(null)
  const attentionEditRef = useRef<HTMLTextAreaElement | null>(null)
  const [attentionPos, setAttentionPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [attentionSaving, setAttentionSaving] = useState(false)

  const closeAttentionQuick = useCallback(() => {
    setAttentionQuick(null)
    setAttentionPos(null)
    attentionAnchorRef.current = null
  }, [])

  useLayoutEffect(() => {
    if (!attentionQuick) {
      setAttentionPos(null)
      return
    }
    const update = () => {
      const anchor = attentionAnchorRef.current
      if (!anchor) return
      const r = anchor.getBoundingClientRect()
      const width = Math.min(360, Math.max(260, window.innerWidth - r.left - 16))
      const margin = 8
      const estHeight = 300
      let top = r.bottom + margin
      if (top + estHeight > window.innerHeight - margin) {
        top = Math.max(margin, r.top - estHeight - margin)
      }
      setAttentionPos({ top, left: r.left, width })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [attentionQuick, attentionQuick?.mode, attentionQuick?.editBuffer])

  useEffect(() => {
    if (!attentionQuick) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAttentionQuick()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [attentionQuick, closeAttentionQuick])

  useEffect(() => {
    if (!attentionQuick) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (attentionPopoverRef.current?.contains(t)) return
      if (attentionAnchorRef.current?.contains(t)) return
      closeAttentionQuick()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [attentionQuick, closeAttentionQuick])

  useEffect(() => {
    if (open) closeAttentionQuick()
  }, [open, closeAttentionQuick])

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
    const clientTypeFiltered =
      selectedClientTypes.length === 0
        ? planFiltered
        : planFiltered.filter((p) => selectedClientTypes.includes(p.clientType ?? 'generico'))
    const statusFiltered =
      selectedStatusFilters.length === 0
        ? clientTypeFiltered
        : clientTypeFiltered.filter((p) => selectedStatusFilters.includes(p.status))
    const attentionFiltered = filterManualAlertOnly
      ? statusFiltered.filter((p) => (p.manualAttentionNote ?? '').trim().length > 0)
      : statusFiltered
    const q = projectNameSearch.trim().toLowerCase()
    if (!q) return attentionFiltered
    return attentionFiltered.filter((p) => {
      if (p.projectName.toLowerCase().includes(q)) return true
      return projectClientTypeSearchBlob(p).includes(q)
    })
  }, [
    projects,
    projectSort,
    projectNameSearch,
    selectedAnalystIds,
    selectedPlanTypes,
    selectedClientTypes,
    selectedStatusFilters,
    filterManualAlertOnly,
  ])

  const hasProjectFiltersActive = useMemo(
    () =>
      projectNameSearch.trim().length > 0 ||
      selectedAnalystIds.length > 0 ||
      selectedPlanTypes.length > 0 ||
      selectedClientTypes.length > 0 ||
      selectedStatusFilters.length > 0 ||
      filterManualAlertOnly,
    [
      projectNameSearch,
      selectedAnalystIds,
      selectedPlanTypes,
      selectedClientTypes,
      selectedStatusFilters,
      filterManualAlertOnly,
    ],
  )

  const projectsCountSubtitle = useMemo(() => {
    const total = projects.length
    const filtered = visibleProjects.length
    if (!hasProjectFiltersActive) {
      return `${total} projeto(s) cadastrado(s)`
    }
    if (filtered === 1) {
      return `1 projeto filtrado de ${total} ${total === 1 ? 'cadastrado' : 'cadastrados'}`
    }
    return `${filtered} projetos filtrados de ${total} cadastrados`
  }, [projects.length, visibleProjects.length, hasProjectFiltersActive])

  useEffect(() => {
    const st = location.state as { openNew?: boolean; kanbanColumn?: KanbanColumn } | null
    if (!user || !hasScope(user, 'projects.edit')) return
    if (st?.openNew && !openedRef.current) {
      if (st.kanbanColumn) setCreateKanbanColumn(st.kanbanColumn)
      setEditingProject(null)
      setFocusManualAttentionInModal(false)
      setOpen(true)
      openedRef.current = true
    }
  }, [location.state, user])

  useEffect(() => {
    const id = window.setInterval(() => setSyncTick((n) => n + 1), 5000)
    return () => window.clearInterval(id)
  }, [])

  const pendingIds = new Set(getPendingProjectGraphSyncIds())
  const pendingCheckinProjects = useMemo(() => {
    return visibleProjects.filter((project) => isProjectCheckinStale(project, 7))
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

  async function onFreezeQuickToggle(p: DbProject) {
    if (!canEditProjects || !user || freezeBusyId) return
    const wasFrozen = p.status === 'congelado'
    setFreezeBusyId(p.id)
    try {
      const r = await applyProjectFreezeToggle({
        projectId: p.id,
        actorUserId: user.id,
        projectLabel: p.projectName,
        dialogs: { requestConfirm, requestDestructiveWithReason },
      })
      if (r === 'ineligible') {
        toastError(
          'Só dá para congelar projeto em andamento ou inadimplente, ou descongelar um congelado. Finalizados e cancelados não usam este atalho.',
        )
        return
      }
      if (r === 'applied') {
        toast(wasFrozen ? 'Projeto descongelado (em andamento).' : 'Projeto congelado.')
      }
    } finally {
      setFreezeBusyId(null)
    }
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

  async function persistAttentionQuickSave(project: DbProject, noteRaw: string) {
    if (!user) return
    setAttentionSaving(true)
    try {
      await applyManualAttentionOnlyPatch(project, user.id, noteRaw, analysts)
      toast('Alerta operacional atualizado.')
      closeAttentionQuick()
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Não foi possível salvar o alerta.')
    } finally {
      setAttentionSaving(false)
    }
  }

  if (!user) return null
  const canEditProjects = hasScope(user, 'projects.edit')

  return (
    <div className="page page--projects-hub">
      <header className="page__header page__header--split">
        <div>
          <h1 className="page__title">Projetos</h1>
          <p className="page__subtitle">{projectsCountSubtitle}</p>
        </div>
        {canEditProjects ? (
          <button
            type="button"
            className="btn btn--ghost proj-page__new"
            onClick={() => {
              setEditingProject(null)
              setFocusManualAttentionInModal(false)
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
        <div className="projects-page__toolbar-primary">
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
              className="projects-page__toolbar-clear"
              aria-label="Limpar filtro de analistas"
              title="Limpar analistas"
              onClick={() => setSelectedAnalystIds([])}
            >
              <X size={14} strokeWidth={2.25} absoluteStrokeWidth aria-hidden />
            </button>
          ) : null}
        </div>
        <span className="projects-page__toolbar-divider" aria-hidden="true" />
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
              className="projects-page__toolbar-clear"
              aria-label="Limpar filtro de planos"
              title="Limpar planos"
              onClick={() => setSelectedPlanTypes([])}
            >
              <X size={14} strokeWidth={2.25} absoluteStrokeWidth aria-hidden />
            </button>
          ) : null}
        </div>
        <div className="projects-page__client-type-filter" role="group" aria-label="Filtrar por tipo do cliente">
          {CLIENT_TYPE_FILTER_CHIPS.map(({ type, label }) => {
            const selected = selectedClientTypes.includes(type)
            return (
              <button
                key={type}
                type="button"
                className={
                  'projects-page__client-type-chip is-' + type + (selected ? ' is-selected' : '')
                }
                aria-pressed={selected}
                onClick={() =>
                  setSelectedClientTypes((prev) =>
                    prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
                  )
                }
                title={selected ? `Remover filtro: ${label}` : `Filtrar: ${label}`}
              >
                {label}
              </button>
            )
          })}
          {selectedClientTypes.length > 0 ? (
            <button
              type="button"
              className="projects-page__toolbar-clear"
              aria-label="Limpar filtro de tipo de cliente"
              title="Limpar tipo de cliente"
              onClick={() => setSelectedClientTypes([])}
            >
              <X size={14} strokeWidth={2.25} absoluteStrokeWidth aria-hidden />
            </button>
          ) : null}
        </div>
        </div>
        <div className="projects-page__toolbar-secondary">
        <div className="projects-page__toolbar-filters">
        <div className="projects-page__status-filter" role="group" aria-label="Filtrar por situação do projeto">
          {STATUS_FILTER_CHIPS.map(({ status, label }) => {
            const selected = selectedStatusFilters.includes(status)
            return (
              <button
                key={status}
                type="button"
                className={'projects-page__status-chip' + (selected ? ' is-selected' : '')}
                aria-pressed={selected}
                onClick={() =>
                  setSelectedStatusFilters((prev) =>
                    prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
                  )
                }
                title={selected ? `Remover filtro: ${label}` : `Filtrar: ${label}`}
              >
                {label}
              </button>
            )
          })}
          {selectedStatusFilters.length > 0 ? (
            <button
              type="button"
              className="projects-page__toolbar-clear"
              aria-label="Limpar filtro de situação"
              title="Limpar situação"
              onClick={() => setSelectedStatusFilters([])}
            >
              <X size={14} strokeWidth={2.25} absoluteStrokeWidth aria-hidden />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className={'projects-page__alert-filter' + (filterManualAlertOnly ? ' is-selected' : '')}
          aria-pressed={filterManualAlertOnly}
          aria-label={
            filterManualAlertOnly
              ? 'Remover filtro: somente com alerta operacional manual'
              : 'Filtrar: somente com alerta operacional manual'
          }
          title="Somente projetos com alerta operacional manual"
          onClick={() => setFilterManualAlertOnly((v) => !v)}
        >
          <CircleAlert size={16} strokeWidth={2.1} absoluteStrokeWidth aria-hidden />
        </button>
        </div>
        <div className="projects-page__toolbar-trailing">
        <label className="projects-page__search" aria-label="Buscar projetos por nome ou tipo de cliente">
          <Search size={15} strokeWidth={2} />
          <input
            className="input projects-page__search-input"
            type="text"
            placeholder="Nome do projeto, CONFECÇÃO, GENÉRICO…"
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
          className="projects-page__pending-btn"
          onClick={() => setPendingModalOpen(true)}
          title={`Pendências de check-in (> 7 dias): ${pendingCheckinProjects.length} projeto(s)`}
          aria-label={`Abrir pendências de check-in: ${pendingCheckinProjects.length} projeto(s) sem check-in há mais de sete dias`}
        >
          <AlertTriangle size={15} strokeWidth={2} aria-hidden />
          <span className="projects-page__pending-count" aria-hidden>
            {pendingCheckinProjects.length}
          </span>
        </button>
        </div>
        </div>
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
                    setFocusManualAttentionInModal(false)
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
          const projectStartIso = p.startDate ?? p.createdAt
          const projectStartLabel = formatDatePt(projectStartIso)
          const cancelIso = p.cancelledAt
          const cancelLabel = cancelIso ? formatDatePt(cancelIso) : '—'

          const resolveCodeColor = (code: string): string | null => {
            const major = Number.parseInt(code.split('.')[0] ?? '0', 10)
            const phase = Number.isFinite(major) && major >= 0 ? phSorted[major] : null
            return phase?.colorHex ?? (phase ? planPhaseAccentHex(phase.orderIndex) : null)
          }

          const cardFrame =
            'proj-card' +
            (p.status === 'congelado' ? ' proj-card--frozen' : '') +
            (p.status === 'inadimplente' ? ' proj-card--arrears' : '') +
            (p.status === 'cancelado' ? ' proj-card--cancelled-muted' : '') +
            ((p.manualAttentionNote ?? '').trim() ? ' proj-card--manual-alert' : '')

          return (
            <article key={p.id} className={cardFrame}>
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
                  {p.status === 'cancelado' ? (
                    <p
                      className="proj-card__start-line proj-card__cancel-line"
                      aria-label={`Data de cancelamento: ${cancelLabel}`}
                    >
                      <Ban className="proj-card__start-icon" size={13} strokeWidth={2} aria-hidden />
                      <span className="proj-card__start-kicker">Data de cancelamento</span>
                      <time
                        className="proj-card__cancel-date"
                        dateTime={cancelIso ? cancelIso.slice(0, 10) : undefined}
                        title="Data em que o projeto foi dado como cancelado (negocial)"
                      >
                        {cancelLabel}
                      </time>
                    </p>
                  ) : null}
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
                  <span
                    className={'proj-card__badge proj-card__badge--client-type is-' + (p.clientType ?? 'generico')}
                    title="Tipo do cliente (negócio)"
                  >
                    {projectClientTypeLabelPt(p.clientType)}
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
                  {(p.manualAttentionNote ?? '').trim() ? (
                    <span
                      className="proj-card__badge proj-card__badge--op-alert"
                      title={(p.manualAttentionNote ?? '').trim()}
                    >
                      Alerta
                    </span>
                  ) : null}
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
                  <span>Atualizado em: {p.lastManualCheckinAt ? formatDatePt(p.lastManualCheckinAt, 'dd/MM HH:mm') : '—'}</span>
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
                      title={(() => {
                        void syncRetryUi
                        const meta = getProjectCloudSyncMeta(p.id)
                        const base = meta.lastErrorCode ? `Reenviar (${meta.lastErrorCode})` : 'Sincronizar agora'
                        const n = syncRetryCountRef.current[p.id] ?? 0
                        if (n >= 1 && n < 3) {
                          return `${base} — mais ${3 - n} toque(s) para poder limpar a fila sem reenviar`
                        }
                        return base
                      })()}
                      disabled={!!syncRefreshing[p.id]}
                      onClick={() => {
                        void (async () => {
                          const pid = p.id
                          const prev = syncRetryCountRef.current[pid] ?? 0
                          const next = prev + 1

                          if (next >= 3) {
                            const clear = await requestConfirm({
                              title: 'Parar de tentar sincronizar?',
                              message:
                                'Este projeto continua na fila de envio à nuvem (o último erro pode ser RLS/permissão). Deseja remover da fila? O app deixa de reenviar automaticamente; os dados seguem salvos neste navegador. Depois de ajustar o Supabase, use este botão de novo para tentar.',
                              confirmLabel: 'Limpar da fila',
                              cancelLabel: 'Continuar tentando',
                            })
                            const { [pid]: _removed, ...rest } = syncRetryCountRef.current
                            syncRetryCountRef.current = rest
                            setSyncRetryUi((x) => x + 1)
                            if (clear === true) {
                              discardPendingProjectGraphSync(pid)
                              setSyncTick((n) => n + 1)
                              toast('Fila de sincronização deste projeto foi limpa.')
                              return
                            }
                          } else {
                            syncRetryCountRef.current = { ...syncRetryCountRef.current, [pid]: next }
                            setSyncRetryUi((x) => x + 1)
                          }

                          setSyncRefreshing((prev) => ({ ...prev, [pid]: true }))
                          try {
                            await flushPendingProjectGraphSyncByProject(pid)
                            setSyncTick((n) => n + 1)
                            const meta = getProjectCloudSyncMeta(pid)
                            toast(
                              meta.state === 'synced'
                                ? 'Nuvem confirmou o projeto.'
                                : 'Salvo localmente; sincronizando com a nuvem.',
                            )
                          } catch (e) {
                            toastError(e instanceof Error ? e.message : 'Falha ao sincronizar projeto.')
                          } finally {
                            setSyncRefreshing((prev) => ({ ...prev, [pid]: false }))
                            if (!getPendingProjectGraphSyncIds().includes(pid)) {
                              const { [pid]: _r, ...rest } = syncRetryCountRef.current
                              syncRetryCountRef.current = rest
                              setSyncRetryUi((x) => x + 1)
                            }
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
                      className={
                        'btn btn--ghost btn--icon proj-card__icon-action' +
                        ((p.manualAttentionNote ?? '').trim() ? ' proj-card__icon-action--attention' : '')
                      }
                      aria-expanded={attentionQuick?.projectId === p.id}
                      aria-haspopup="dialog"
                      aria-controls={attentionQuick?.projectId === p.id ? 'proj-attention-quick-popover' : undefined}
                      aria-label="Alerta operacional — atalho na grade"
                      title={
                        (p.manualAttentionNote ?? '').trim()
                          ? `Alerta: ${(p.manualAttentionNote ?? '').trim()}`
                          : 'Marcar ou editar alerta operacional (atalho; edição completa no lápis)'
                      }
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (attentionQuick?.projectId === p.id) {
                          closeAttentionQuick()
                          return
                        }
                        attentionAnchorRef.current = e.currentTarget
                        const has = (p.manualAttentionNote ?? '').trim().length > 0
                        setAttentionQuick({
                          projectId: p.id,
                          mode: has ? 'view' : 'edit',
                          editBuffer: p.manualAttentionNote ?? '',
                          err: null,
                        })
                      }}
                    >
                      <CircleAlert size={15} strokeWidth={2.15} />
                    </button>
                    <button
                      type="button"
                      className={
                        'btn btn--ghost btn--icon proj-card__icon-action' +
                        (p.status === 'congelado' ? ' proj-card__icon-action--freeze-on' : '') +
                        (p.status === 'finalizado' || p.status === 'cancelado'
                          ? ' proj-card__icon-action--muted-disabled'
                          : '')
                      }
                      aria-label={p.status === 'congelado' ? 'Descongelar projeto' : 'Congelar projeto'}
                      title={
                        p.status === 'finalizado' || p.status === 'cancelado'
                          ? 'Indisponível para finalizado ou cancelado'
                          : p.status === 'congelado'
                            ? 'Descongelar (ativo) — confirmação e motivo'
                            : 'Congelar — pede motivo (histórico no projeto)'
                      }
                      disabled={
                        !!freezeBusyId || p.status === 'finalizado' || p.status === 'cancelado'
                      }
                      onClick={() => void onFreezeQuickToggle(p)}
                    >
                      <Snowflake size={15} strokeWidth={2.15} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--icon proj-card__icon-action"
                      aria-label="Editar projeto"
                      title="Editar projeto"
                      onClick={() => {
                        setEditingProject(p)
                        setFocusManualAttentionInModal(false)
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

      {attentionQuick && attentionPos
        ? createPortal(
            (() => {
              const cur = projects.find((x) => x.id === attentionQuick.projectId)
              if (!cur) return null
              return (
                <div
                  ref={attentionPopoverRef}
                  id="proj-attention-quick-popover"
                  className="project-create-modal__manual-alert-popover projects-page__attention-quick-popover"
                  role="dialog"
                  aria-labelledby="proj-attention-quick-title"
                  style={{
                    position: 'fixed',
                    top: attentionPos.top,
                    left: attentionPos.left,
                    width: attentionPos.width,
                    zIndex: 4200,
                  }}
                >
                  <p className="project-create-modal__manual-alert-popover-title" id="proj-attention-quick-title">
                    Alerta operacional
                  </p>
                  {attentionQuick.mode === 'view' && (cur.manualAttentionNote ?? '').trim() ? (
                    <>
                      <p className="project-create-modal__manual-alert-popover-text">
                        {(cur.manualAttentionNote ?? '').trim()}
                      </p>
                      <div className="project-create-modal__manual-alert-popover-actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          disabled={attentionSaving}
                          onClick={() => {
                            setAttentionQuick((s) =>
                              s ? { ...s, mode: 'edit', editBuffer: cur.manualAttentionNote ?? '', err: null } : s,
                            )
                            requestAnimationFrame(() => attentionEditRef.current?.focus())
                          }}
                        >
                          Editar texto
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm btn--danger"
                          disabled={attentionSaving}
                          onClick={async () => {
                            const ok = await requestConfirm({
                              title: 'Remover alerta',
                              message: 'Remover o alerta operacional manual deste projeto?',
                              confirmLabel: 'Remover',
                              cancelLabel: 'Manter',
                            })
                            if (!ok) return
                            await persistAttentionQuickSave(cur, '')
                          }}
                        >
                          Remover
                        </button>
                      </div>
                    </>
                  ) : null}
                  {attentionQuick.mode === 'view' && !(cur.manualAttentionNote ?? '').trim() ? (
                    <div className="project-create-modal__manual-alert-popover-actions project-create-modal__manual-alert-popover-actions--stack">
                      <p className="muted project-create-modal__manual-alert-popover-empty">
                        Nenhum alerta. Opcional — mínimo 12 caracteres se definir.
                      </p>
                      <button
                        type="button"
                        className="btn btn--sm"
                        disabled={attentionSaving}
                        onClick={() => {
                          setAttentionQuick((s) => (s ? { ...s, mode: 'edit', editBuffer: '', err: null } : s))
                          requestAnimationFrame(() => attentionEditRef.current?.focus())
                        }}
                      >
                        Escrever alerta
                      </button>
                    </div>
                  ) : null}
                  {attentionQuick.mode === 'edit' ? (
                    <>
                      <textarea
                        ref={attentionEditRef}
                        className="project-create-modal__manual-alert-popover-textarea"
                        rows={4}
                        value={attentionQuick.editBuffer}
                        onChange={(e) =>
                          setAttentionQuick((s) => (s ? { ...s, editBuffer: e.target.value, err: null } : s))
                        }
                        placeholder="Motivo visível na grade (tooltip). Mínimo 12 caracteres ou deixe em branco."
                      />
                      {attentionQuick.err ? (
                        <p className="auth__error project-create-modal__manual-alert-popover-err">{attentionQuick.err}</p>
                      ) : null}
                      <div className="project-create-modal__manual-alert-popover-actions">
                        <button
                          type="button"
                          className="btn btn--sm"
                          disabled={attentionSaving}
                          onClick={async () => {
                            const t = attentionQuick.editBuffer.trim()
                            if (t.length > 0 && t.length < 12) {
                              setAttentionQuick((s) =>
                                s ? { ...s, err: 'Use pelo menos 12 caracteres ou deixe em branco.' } : s,
                              )
                              return
                            }
                            await persistAttentionQuickSave(cur, attentionQuick.editBuffer)
                          }}
                        >
                          Aplicar
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          disabled={attentionSaving}
                          onClick={() => {
                            const has = (cur.manualAttentionNote ?? '').trim()
                            if (has) {
                              setAttentionQuick((s) =>
                                s
                                  ? {
                                      ...s,
                                      mode: 'view',
                                      err: null,
                                      editBuffer: cur.manualAttentionNote ?? '',
                                    }
                                  : s,
                              )
                            } else {
                              closeAttentionQuick()
                            }
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          disabled={attentionSaving}
                          onClick={() => {
                            setEditingProject(cur)
                            setFocusManualAttentionInModal(true)
                            setOpen(true)
                            closeAttentionQuick()
                          }}
                        >
                          Abrir edição completa…
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              )
            })(),
            document.body,
          )
        : null}

      <ProjectCreateModal
        open={open}
        onClose={() => {
          setOpen(false)
          setEditingProject(null)
          setFocusManualAttentionInModal(false)
          setProjectModalDirty(false)
        }}
        onDirtyChange={setProjectModalDirty}
        user={user}
        plans={plans}
        analysts={analysts}
        initialKanbanColumn={createKanbanColumn}
        projectToEdit={editingProject}
        focusManualAttentionOnOpen={focusManualAttentionInModal}
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
            <p className="muted">Projetos sem check-in há mais de 7 dias precisam de acompanhamento manual.</p>
            <div className="dashboard-side-stack">
              {pendingCheckinProjects.length === 0 ? (
                <p className="muted">Nenhuma pendência no momento.</p>
              ) : (
                pendingCheckinProjects.map((project) => {
                  return (
                    <div key={project.id} className="dashboard-cc__row">
                      <strong>{project.projectName}</strong>
                      <small>
                        Atualizado em:{' '}
                        {project.lastManualCheckinAt ? formatDatePt(project.lastManualCheckinAt, 'dd/MM/yyyy HH:mm') : '—'}
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
