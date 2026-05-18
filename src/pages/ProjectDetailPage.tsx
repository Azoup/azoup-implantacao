import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type ChangeEvent,
} from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  CircleCheck,
  Clock,
  CircleDashed,
  Link2,
  Lock,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Pencil,
  Phone,
  Play,
  PlayCircle,
  Plus,
  RotateCcw,
  Send,
  ShieldAlert,
  Snowflake,
  Sparkles,
  Tag,
  Trash2,
  UserCircle2,
  X,
  XCircle,
} from 'lucide-react'
import { DocCommentBody } from '../components/DocCommentBody'
import { AnalystAvatar } from '../components/AnalystAvatar'
import { CustomPlanPhaseModal } from '../components/CustomPlanPhaseModal'
import { PlanTaskModal, type PlanTaskFormValues, type PlanTaskSaveMeta } from '../components/PlanTaskModal'
import { ProjectCreateModal } from '../components/ProjectCreateModal'
import { RegisterHoursModal } from '../components/RegisterHoursModal'
import { TaskScheduleChip } from '../components/TaskScheduleChip'
import { AgendaEventModal, type AgendaEventModalHandle } from '../components/agenda/AgendaEventModal'
import { ManualCompleteTaskModal } from '../components/ManualCompleteTaskModal'
import { ConfirmProjectDeleteModal } from '../components/ConfirmProjectDeleteModal'
import { AiFormatModal } from '../components/AiFormatModal'
import { db } from '../db/database'
import {
  emptyAnalysts,
  emptyComments,
  emptyContacts,
  emptyEvents,
  emptyPhases,
  emptyPlanModels,
  emptyProjects,
  emptyTasks,
  emptyUsers,
} from '../lib/stableDexieEmpty'
import { useAuth } from '../auth/AuthContext'
import { hasScope } from '../auth/permissions'
import { dateInputToIsoNoon } from '../lib/brazilFormat'
import { formatDatePt, toDateInputValue } from '../lib/dates'
import { phaseNameShort } from '../lib/phaseDisplay'
import { projectProgressPercent } from '../lib/projectProgress'
import { getPhaseSegments, statusLabelPt } from '../lib/projectPhaseUi'
import { projectClientTypeLabelPt } from '../lib/projectClientType'
import { projectEngagementKindLabelPt } from '../lib/projectEngagementKind'
import { effectiveTaskIsInformational } from '../lib/effectiveTaskInformational'
import { buildCustomPlanBlueprintBlocks, buildLabelsTabSections, type PlanBlueprintBlock } from '../lib/labelsTabFromPlan'
import { planLabelTabPillStyle, planLabelColorsFromCode, planPhaseAccentHex } from '../lib/planLabelDisplay'
import { normalizeDocLinkUrl } from '../lib/docUrls'
import { compareTaskCode } from '../lib/taskCode'
import { getPrimaryScheduledEventFromCandidates } from '../lib/taskSchedule'
import { buildRescheduleKanbanProjectModel } from '../lib/rescheduleChainKanban'
import { buildAgendaNavigateTo } from '../lib/agendaDeepLink'
import { CUSTOM_PLAN_TYPE, planPillClass, planSummaryLabel } from '../constants/customPlan'
import { uuid } from '../lib/uuid'
import { addProjectContact, deleteProjectContact } from '../services/projectContacts'
import { deleteProjectCascade, recordProjectDeletionLog } from '../services/projectDelete'
import {
  addProjectDocumentation,
  deleteProjectDocumentation,
  updateProjectDocumentationContent,
} from '../services/taskComments'
import {
  billableEstimatedSum,
  projectedBillableSumAfterTaskChange,
  raiseCustomProjectContractHours,
} from '../services/customProjectHours'
import {
  addProjectPhase,
  addProjectTask,
  deleteProjectPhaseCascade,
  deleteProjectTask,
  moveProjectPhase,
  suggestNextProjectTaskCode,
  updateProjectPhase,
  updateProjectTask,
} from '../services/customProjectStructure'
import { concludeOperationalTaskWithHourGuards } from '../services/taskProjectConclude'
import { setTaskCompletedManualOverride, setTaskStatus } from '../services/tasks'
import { useUiFeedback } from '../ui/UiFeedbackContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import {
  fetchWelcomeSubmissionsForProject,
  getPortalProjectFileDownloadUrl,
  listPortalProjectFiles,
  type PortalProjectFile,
  type WelcomeSubmissionForProjectRow,
} from '../services/clientPortal'
import { AZOUP_WELCOME_FORM_FIELDS } from '../constants/azoupWelcomeForm'
import {
  flushPendingProjectGraphSyncByProject,
  getProjectCloudSyncMeta,
  updateProjectPartialInSupabase,
  withDexieSupabaseSyncMuted,
} from '../sync/supabaseDexieBridge'
import { formatDurationHmFromHours } from '../lib/durationFormat'
import { formatDurationHMS, useRunningTimerSession } from '../hooks/useRunningTimerSession'
import { useRegisterUnsavedChanges } from '../navigation/UnsavedChangesContext'
import { registerProjectManualCheckin } from '../services/project'
import { applyProjectFreezeToggle } from '../services/projectFreeze'
import type {
  DbComment,
  DbDocAttachment,
  DbDocLink,
  DbEvent,
  DbPhase,
  DbPlanTask,
  DbProject,
  DbProjectContact,
  DbTask,
  DbUser,
  KanbanColumn,
  LabelStatus,
  TaskStatus,
} from '../db/types'

type DetailTab = 'fases' | 'contatos' | 'docs' | 'labels' | 'portal'

const ic = { size: 16, strokeWidth: 2, absoluteStrokeWidth: true } as const
const icSm = { size: 14, strokeWidth: 2, absoluteStrokeWidth: true } as const

const MAX_DOC_FILE_BYTES = 10 * 1024 * 1024
const MAX_DOC_FILES = 12

function phaseStats(
  phaseId: string,
  projectId: string,
  tasks: DbTask[],
  hiddenTaskIds: ReadonlySet<string>,
) {
  const ts = tasks.filter(
    (t) => t.projectId === projectId && t.phaseId === phaseId && !hiddenTaskIds.has(t.id),
  )
  const done = ts.filter((t) => t.status === 'concluida').length
  const total = ts.length
  const pct = total ? Math.round((done / total) * 100) : 0
  return { done, total, pct, list: [...ts].sort((a, b) => compareTaskCode(a.code, b.code) || a.sortOrder - b.sortOrder) }
}

const icTaskStatus = { size: 16, strokeWidth: 2, absoluteStrokeWidth: true } as const

function taskStatusIcon(status: TaskStatus) {
  if (status === 'concluida')
    return <CheckCircle2 className="pd-task__status-ic pd-task__status-ic--done" {...icTaskStatus} />
  if (status === 'cancelado')
    return <XCircle className="pd-task__status-ic pd-task__status-ic--cancelled" {...icTaskStatus} />
  if (status === 'em_andamento')
    return <PlayCircle className="pd-task__status-ic pd-task__status-ic--progress" {...icTaskStatus} />
  return <CircleDashed className="pd-task__status-ic pd-task__status-ic--pending" {...icTaskStatus} />
}

function docTimestampPt(iso: string): string {
  return `${formatDatePt(iso)} às ${formatDatePt(iso, 'HH:mm')}`
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { running: runningTimerSession, liveSeconds: runningLiveSeconds } = useRunningTimerSession(user?.id)
  const canEditProjects = hasScope(user, 'projects.edit')
  const canEditAgenda = hasScope(user, 'agenda.edit')
  const canViewPortalIntel = Boolean(user) && isSupabaseConfigured() && hasScope(user, 'projects.view')

  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? emptyProjects
  const project = projectId ? projects.find((p) => p.id === projectId) : undefined

  const tasks = useLiveQuery(
    () => (projectId ? db.tasks.where('projectId').equals(projectId).toArray() : Promise.resolve([] as DbTask[])),
    [projectId],
  ) ?? emptyTasks

  const allTasksForAgendaModal = useLiveQuery(() => db.tasks.toArray(), []) ?? emptyTasks

  const projectEvents = useLiveQuery(
    () =>
      projectId
        ? db.events.where('projectId').equals(projectId).toArray()
        : Promise.resolve([] as DbEvent[]),
    [projectId],
  ) ?? emptyEvents

  const phases = useLiveQuery(
    () => (projectId ? db.phases.where('projectId').equals(projectId).toArray() : Promise.resolve([] as DbPhase[])),
    [projectId],
  ) ?? emptyPhases

  const allComments = useLiveQuery(async () => {
    if (!projectId) return [] as DbComment[]
    const direct = await db.comments.where('projectId').equals(projectId).toArray()
    const taskIds = await db.tasks.where('projectId').equals(projectId).primaryKeys()
    if (taskIds.length === 0) return direct
    const byTask = await db.comments.where('taskId').anyOf(taskIds as string[]).toArray()
    const merged = new Map<string, DbComment>()
    for (const c of direct) merged.set(c.id, c)
    for (const c of byTask) merged.set(c.id, c)
    return [...merged.values()]
  }, [projectId]) ?? emptyComments
  const taskCommentsOnly = useMemo(() => allComments.filter((c) => c.taskId != null), [allComments])
  const docComments = useMemo(
    () =>
      [...allComments.filter((c) => c.projectId === projectId && c.taskId == null)].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    [allComments, projectId],
  )

  const users = useLiveQuery(() => db.users.toArray(), []) ?? emptyUsers

  const contacts = useLiveQuery(
    () =>
      projectId
        ? db.projectContacts.where('projectId').equals(projectId).toArray()
        : Promise.resolve([] as DbProjectContact[]),
    [projectId],
  ) ?? emptyContacts

  const plans = useLiveQuery(() => db.planModels.filter((p) => p.active).toArray(), []) ?? emptyPlanModels

  const catalogPlanBlueprint = useLiveQuery(async () => {
    if (!projectId) return null
    const pr = await db.projects.get(projectId)
    if (!pr || pr.planType === CUSTOM_PLAN_TYPE) return null
    const model = await db.planModels.where('key').equals(pr.planType).first()
    if (!model) return null
    const pps = await db.planPhases.where('planModelId').equals(model.id).sortBy('orderIndex')
    const blocks: PlanBlueprintBlock[] = []
    for (const pp of pps) {
      const pts = await db.planTasks.where('planPhaseId').equals(pp.id).sortBy('sortOrder')
      blocks.push({ planPhase: pp, planTasks: pts })
    }
    return { blocks }
  }, [projectId])
  const analystsAll = useLiveQuery(() => db.analysts.toArray(), []) ?? emptyAnalysts
  const analysts = useMemo(() => analystsAll.filter((a) => a.active), [analystsAll])

  const [tab, setTab] = useState<DetailTab>('fases')
  const [portalSubmissions, setPortalSubmissions] = useState<WelcomeSubmissionForProjectRow[]>([])
  const [portalFiles, setPortalFiles] = useState<PortalProjectFile[]>([])
  const [portalLoad, setPortalLoad] = useState(false)
  const [portalErr, setPortalErr] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [hoursTask, setHoursTask] = useState<DbTask | null>(null)
  const [expandedDesc, setExpandedDesc] = useState<Record<string, boolean>>({})
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactRole, setContactRole] = useState('')
  const [docDraft, setDocDraft] = useState('')
  const [docBusy, setDocBusy] = useState(false)
  const docFileInputRef = useRef<HTMLInputElement>(null)
  const agendaEventModalRef = useRef<AgendaEventModalHandle>(null)
  const [docPendingFiles, setDocPendingFiles] = useState<{ localId: string; file: File }[]>([])
  const [docPendingLinks, setDocPendingLinks] = useState<{ id: string; url: string; label: string }[]>([])
  const [docLinkUrlDraft, setDocLinkUrlDraft] = useState('')
  const [docLinkLabelDraft, setDocLinkLabelDraft] = useState('')
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false)
  const [deleteProjectBusy, setDeleteProjectBusy] = useState(false)
  const [cancelProjectOpen, setCancelProjectOpen] = useState(false)
  const [cancelProjectDateYmd, setCancelProjectDateYmd] = useState('')
  const [cancelProjectReason, setCancelProjectReason] = useState('')
  const [cancelProjectBusy, setCancelProjectBusy] = useState(false)
  const [manualCompleteTask, setManualCompleteTask] = useState<DbTask | null>(null)
  const [manualCompleteBusy, setManualCompleteBusy] = useState(false)
  const [docEditingId, setDocEditingId] = useState<string | null>(null)
  const [docEditDraft, setDocEditDraft] = useState('')
  const [docEditBusy, setDocEditBusy] = useState(false)
  const [aiDocTarget, setAiDocTarget] = useState<'new' | 'edit' | null>(null)

  const [customPhaseModal, setCustomPhaseModal] = useState<
    null | { mode: 'add' } | { mode: 'edit'; phase: DbPhase }
  >(null)
  const [customTaskModalOpen, setCustomTaskModalOpen] = useState(false)
  const [customTaskPhaseId, setCustomTaskPhaseId] = useState<string | null>(null)
  const [customTaskEditing, setCustomTaskEditing] = useState<DbTask | null>(null)
  const [customTaskDefaultCode, setCustomTaskDefaultCode] = useState('1.1')
  const [planTaskModalVariant, setPlanTaskModalVariant] = useState<'standard' | 'catalogAdHoc'>('standard')
  const [_syncTick, setSyncTick] = useState(0)
  const [projectSyncBusy, setProjectSyncBusy] = useState(false)
  const [freezeQuickBusy, setFreezeQuickBusy] = useState(false)

  const aiDocInput = aiDocTarget === 'edit' ? docEditDraft : docDraft

  useEffect(() => {
    const id = window.setInterval(() => setSyncTick((n) => n + 1), 5000)
    return () => window.clearInterval(id)
  }, [])

  /** Todos os eventos por tarefa (modelo 1 Tarefa : N Eventos). Ordenados por startTime ascendente. */
  const eventsByTaskId = useMemo(() => {
    const m = new Map<string, DbEvent[]>()
    for (const ev of projectEvents) {
      if (!ev.taskId) continue
      const arr = m.get(ev.taskId) ?? []
      arr.push(ev)
      m.set(ev.taskId, arr)
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime))
    }
    return m
  }, [projectEvents])

  /**
   * Cadeias legadas rescheduled*: um cartão por folha — predecessores ocultos no quadro.
   * Ver comentário em `src/lib/rescheduleChainKanban.ts`.
   */
  const rescheduleKanban = useMemo(
    () => (projectId ? buildRescheduleKanbanProjectModel(projectId, tasks, projectEvents) : null),
    [projectId, tasks, projectEvents],
  )

  const tasksVisibleInProject = useMemo(() => {
    if (!projectId || !rescheduleKanban) return [] as DbTask[]
    return tasks.filter((t) => t.projectId === projectId && !rescheduleKanban.hiddenTaskIds.has(t.id))
  }, [projectId, tasks, rescheduleKanban])

  const sortedPhases = useMemo(
    () => [...phases].sort((a, b) => a.orderIndex - b.orderIndex),
    [phases],
  )

  const planBlueprint = useMemo(() => {
    if (!projectId || !project) return catalogPlanBlueprint ?? null
    if (project.planType === CUSTOM_PLAN_TYPE) {
      const sp = phases.filter((p) => p.projectId === projectId).sort((a, b) => a.orderIndex - b.orderIndex)
      return { blocks: buildCustomPlanBlueprintBlocks(sp, tasks, projectId) }
    }
    return catalogPlanBlueprint ?? null
  }, [projectId, project, phases, tasks, catalogPlanBlueprint])

  const phaseById = useMemo(() => new Map(sortedPhases.map((p) => [p.id, p])), [sortedPhases])

  const currentPhaseName = useMemo(() => {
    if (!projectId) return null
    return getPhaseSegments(phases, tasks, projectId).currentPhaseName
  }, [phases, tasks, projectId])

  const pct = projectId ? projectProgressPercent(tasksVisibleInProject, projectId) : 0
  const doneTasks = tasksVisibleInProject.filter((t) => t.status === 'concluida').length
  const saldo = project ? Math.max(0, project.hoursContracted - project.hoursUsed) : 0

  const commentsByTask = useMemo(() => {
    const m = new Map<string, DbComment[]>()
    for (const c of taskCommentsOnly) {
      if (!c.taskId) continue
      const arr = m.get(c.taskId) ?? []
      arr.push(c)
      m.set(c.taskId, arr)
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    }
    return m
  }, [taskCommentsOnly])

  const commentsByCanonicalLeaf = useMemo(() => {
    const m = new Map<string, DbComment[]>()
    if (!rescheduleKanban) return m
    for (const [leafId, memberIds] of rescheduleKanban.chainMemberIdsByLeaf) {
      const arr: DbComment[] = []
      for (const mid of memberIds) {
        arr.push(...(commentsByTask.get(mid) ?? []))
      }
      arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      m.set(leafId, arr)
    }
    return m
  }, [commentsByTask, rescheduleKanban])

  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
  const noShowCancelledCount = useMemo(
    () => tasks.filter((task) => task.status === 'cancelado' && task.cancellationReason === 'client_no_show').length,
    [tasks],
  )
  const followUpRescheduleCount = useMemo(
    () => tasks.filter((task) => Boolean(task.rescheduledFromTaskId)).length,
    [tasks],
  )

  const labelsTabSections = useMemo(() => {
    if (!planBlueprint || !projectId) return []
    return buildLabelsTabSections(planBlueprint.blocks, sortedPhases, tasks, projectId)
  }, [planBlueprint, sortedPhases, tasks, projectId])

  const userNameById = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users])
  const azoupFieldLabel = useMemo(() => new Map(AZOUP_WELCOME_FORM_FIELDS.map((f) => [f.id, f.label])), [])
  const { toast, toastError, toastWarn, requestConfirm, requestDestructiveWithReason } = useUiFeedback()

  useEffect(() => {
    if (tab === 'portal' && !canViewPortalIntel) setTab('fases')
  }, [tab, canViewPortalIntel])

  useEffect(() => {
    if (tab !== 'portal' || !projectId || !canViewPortalIntel) return
    let alive = true
    void (async () => {
      setPortalLoad(true)
      setPortalErr(null)
      try {
        const [subs, files] = await Promise.all([
          fetchWelcomeSubmissionsForProject(projectId),
          listPortalProjectFiles(projectId),
        ])
        if (!alive) return
        setPortalSubmissions(subs)
        setPortalFiles(files)
      } catch (e) {
        if (!alive) return
        setPortalErr(e instanceof Error ? e.message : 'Falha ao carregar dados do portal.')
        setPortalSubmissions([])
        setPortalFiles([])
      } finally {
        if (alive) setPortalLoad(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [tab, projectId, canViewPortalIntel])

  const docBeingEdited = docEditingId ? docComments.find((c) => c.id === docEditingId) : undefined
  const docEditingDirty = Boolean(
    docEditingId && (docBeingEdited == null || docEditDraft !== docBeingEdited.content),
  )
  const docComposerDirty = Boolean(
    docDraft.trim() ||
      docPendingLinks.length > 0 ||
      docPendingFiles.length > 0 ||
      docLinkUrlDraft.trim() ||
      docLinkLabelDraft.trim(),
  )
  const contactsFormDirty = Boolean(contactName.trim() || contactPhone.trim() || contactRole.trim())
  const projectDetailDirty = docEditingDirty || docComposerDirty || contactsFormDirty

  async function flushProjectUnsaved() {
    if (!project) return
    if (docEditingDirty) await onSaveDocumentationEdit()
    if (docComposerDirty) await onAddDocumentation({ preventDefault() {} } as FormEvent)
    if (contactsFormDirty) await onAddContact({ preventDefault() {} } as FormEvent)
  }

  useRegisterUnsavedChanges({
    enabled: Boolean(user) && canEditProjects && Boolean(project),
    isDirty: () => projectDetailDirty,
    onSave: flushProjectUnsaved,
    message: 'Há rascunhos na documentação ou no formulário de contatos que ainda não foram publicados.',
  })

  async function onPortalFileDownload(fileId: string) {
    try {
      const url = await getPortalProjectFileDownloadUrl(fileId)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Falha ao baixar arquivo.')
    }
  }

  if (!user) return null
  const me: DbUser = user
  if (!projectId) return <Navigate to="/projetos" replace />
  if (projects.length > 0 && !project) {
    return (
      <div className="page">
        <p className="muted">Projeto não encontrado.</p>
        <Link to="/projetos" className="btn btn--primary">
          Voltar aos projetos
        </Link>
      </div>
    )
  }
  if (!project) {
    return (
      <div className="page">
        <p className="muted">Carregando…</p>
      </div>
    )
  }

  const proj: DbProject = project
  const projectCloudSyncMeta = getProjectCloudSyncMeta(proj.id)
  const syncStatusLabel =
    projectCloudSyncMeta.state === 'synced'
      ? 'Nuvem sincronizada'
      : projectCloudSyncMeta.state === 'pending'
        ? 'Sincronização pendente'
        : 'Falha de sincronização'
  const syncStatusTitle = projectCloudSyncMeta.lastErrorCode ?? syncStatusLabel
  const projectAnalyst = proj.analystId ? analystsAll.find((a) => a.id === proj.analystId) ?? null : null
  const planName = planSummaryLabel(proj.planType)
  const isCustomPlan = proj.planType === CUSTOM_PLAN_TYPE
  const customBillableSumEst = isCustomPlan
    ? billableEstimatedSum(tasks.filter((t) => t.projectId === proj.id))
    : 0

  async function onManualProjectCheckin() {
    if (!canEditProjects) return
    const ok = await requestConfirm({
      title: 'Confirmar check-in manual',
      message: `Registrar check-in manual de "${proj.projectName}" agora?`,
      confirmLabel: 'Registrar',
      cancelLabel: 'Cancelar',
    })
    if (!ok) return
    await registerProjectManualCheckin(proj.id, me.id)
    toast('Check-in manual registrado.')
  }

  async function onFreezeHeaderClick() {
    if (!canEditProjects || freezeQuickBusy) return
    const wasFrozen = proj.status === 'congelado'
    setFreezeQuickBusy(true)
    try {
      const r = await applyProjectFreezeToggle({
        projectId: proj.id,
        actorUserId: me.id,
        projectLabel: proj.projectName,
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
      setFreezeQuickBusy(false)
    }
  }

  function mapTaskToPlanModal(t: DbTask): DbPlanTask {
    return {
      id: t.id,
      planPhaseId: t.phaseId,
      code: t.code,
      title: t.title,
      description: t.description,
      estimatedHours: t.estimatedHours,
      isInformational: t.isInformational,
      sortOrder: t.sortOrder,
    }
  }

  async function ensureCustomContractForProjectedSum(taskId: string | null, values: PlanTaskFormValues): Promise<void> {
    if (!isCustomPlan) return
    const projected = projectedBillableSumAfterTaskChange(
      tasks,
      proj.id,
      taskId,
      values.estimatedHours,
      values.isInformational,
    )
    if (projected <= proj.hoursContracted) return
    const ok = await requestConfirm({
      title: 'Previsões acima do contrato',
      message: `Com esta alteração, a soma das estimativas (${projected}h) ultrapassa o contrato atual (${proj.hoursContracted}h). Elevar o contrato para ${projected}h?`,
      confirmLabel: `Elevar para ${projected}h`,
      cancelLabel: 'Cancelar',
    })
    if (!ok) throw new Error('Ajuste do contrato cancelado.')
    await raiseCustomProjectContractHours(proj.id, projected)
  }

  async function onSaveCustomPhaseModal(name: string, colorHex: string | null) {
    if (!customPhaseModal) return
    if (customPhaseModal.mode === 'add') {
      await addProjectPhase(proj.id, name, colorHex)
      toast('Fase criada.')
    } else {
      await updateProjectPhase(customPhaseModal.phase.id, name, colorHex)
      toast('Fase atualizada.')
    }
    setCustomPhaseModal(null)
  }

  async function onSaveCustomTaskModal(values: PlanTaskFormValues, meta?: PlanTaskSaveMeta) {
    const auditForEdit =
      customTaskEditing && meta?.justification && meta.justification.trim().length >= 12
        ? { actorUserId: me.id, justification: meta.justification.trim() }
        : undefined
    if (customTaskEditing && !auditForEdit) {
      throw new Error('Informe a justificativa da alteração (mínimo 12 caracteres).')
    }
    if (planTaskModalVariant === 'catalogAdHoc') {
      const fixed: PlanTaskFormValues = {
        ...values,
        estimatedHours: 0,
        isInformational: false,
      }
      if (customTaskEditing) {
        await updateProjectTask(customTaskEditing.id, fixed, auditForEdit)
        toast('Tarefa avulsa atualizada.')
      } else if (customTaskPhaseId) {
        await addProjectTask(proj.id, customTaskPhaseId, fixed, proj.analystId ?? null, { catalogAdHoc: true })
        toast('Tarefa avulsa criada.')
      }
      return
    }
    await ensureCustomContractForProjectedSum(customTaskEditing?.id ?? null, values)
    if (customTaskEditing) {
      await updateProjectTask(customTaskEditing.id, values, auditForEdit)
      toast('Tarefa atualizada.')
    } else if (customTaskPhaseId) {
      await addProjectTask(proj.id, customTaskPhaseId, values, proj.analystId ?? null)
      toast('Tarefa criada.')
    }
  }

  function openCancelProjectDialog() {
    setCancelProjectDateYmd(toDateInputValue(new Date()))
    setCancelProjectReason('')
    setCancelProjectOpen(true)
  }

  async function confirmCancelProjectFromDetail() {
    if (!canEditProjects || cancelProjectBusy) return
    const reason = cancelProjectReason.trim()
    if (reason.length < 8) {
      toastError('Informe o motivo com pelo menos 8 caracteres.')
      return
    }
    const caIso = dateInputToIsoNoon(cancelProjectDateYmd)
    if (!caIso) {
      toastError('Informe a data de cancelamento.')
      return
    }
    setCancelProjectBusy(true)
    try {
      const line = `\n[${new Date().toISOString()}] Projeto cancelado (detalhe). Motivo: ${reason}`
      const baseNotes = (proj.internalNotes ?? '').trimEnd()
      const cancelPatch = {
        status: 'cancelado' as const,
        kanbanColumn: 'cancelados' as KanbanColumn,
        cancelledAt: caIso,
        internalNotes: baseNotes ? `${baseNotes}${line}` : line.trim(),
      }
      if (isSupabaseConfigured()) {
        await withDexieSupabaseSyncMuted(async () => {
          await updateProjectPartialInSupabase(proj.id, cancelPatch)
          await db.projects.update(proj.id, cancelPatch)
        })
      } else {
        await db.projects.update(proj.id, cancelPatch)
      }
      setCancelProjectOpen(false)
      toast('Projeto marcado como cancelado.')
      navigate('/projetos', { replace: true })
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Não foi possível cancelar o projeto.')
    } finally {
      setCancelProjectBusy(false)
    }
  }

  async function onDeleteProject() {
    if (!canEditProjects) return
    if (!(me.role === 'admin' || proj.createdBy === me.id)) return
    setDeleteProjectOpen(true)
  }

  async function confirmDeleteProject(justification: string) {
    if (deleteProjectBusy) return
    setDeleteProjectBusy(true)
    try {
      await recordProjectDeletionLog({
        projectId: proj.id,
        projectName: proj.projectName,
        user: me,
        justification,
      })
      await deleteProjectCascade(proj.id)
      navigate('/projetos', { replace: true })
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Não foi possível excluir o projeto.')
    } finally {
      setDeleteProjectBusy(false)
    }
  }

  async function onTaskStatus(id: string, next: TaskStatus) {
    if (!canEditProjects) return
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    try {
      if (next === 'concluida') {
        const phase = phaseById.get(task.phaseId)
        const informational = effectiveTaskIsInformational(task, phase, planBlueprint?.blocks)
        // Override manual: tarefa operacional sem nenhum evento realizado exige justificativa explícita.
        if (!informational) {
          const taskEvents = eventsByTaskId.get(task.id) ?? []
          const hasRealized = taskEvents.some((e) => e.status === 'realizado')
          if (!hasRealized) {
            setManualCompleteTask(task)
            return
          }
        }
        const r = await concludeOperationalTaskWithHourGuards(task, informational, me.id, {
          requestConfirm,
          requestDestructiveWithReason,
        })
        if (r === 'cancelled') return
      } else {
        await setTaskStatus(id, next, me.id)
      }
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Não foi possível atualizar a tarefa')
    }
  }

  async function confirmManualCompleteTask(reason: string) {
    if (!manualCompleteTask) return
    setManualCompleteBusy(true)
    try {
      await setTaskCompletedManualOverride(manualCompleteTask.id, reason, me.id)
      setManualCompleteTask(null)
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Não foi possível concluir a tarefa.')
    } finally {
      setManualCompleteBusy(false)
    }
  }

  async function onAddContact(e: FormEvent) {
    e.preventDefault()
    if (!canEditProjects) return
    if (!contactName.trim()) return
    try {
      await addProjectContact({
        projectId: proj.id,
        name: contactName,
        phone: contactPhone,
        role: contactRole,
      })
      setContactName('')
      setContactPhone('')
      setContactRole('')
    } catch {
      toastError('Não foi possível adicionar o contato')
    }
  }

  function enqueueDocFiles(incoming: File[]) {
    if (incoming.length === 0) return
    setDocPendingFiles((prev) => {
      const next = [...prev]
      for (const file of incoming) {
        if (file.size > MAX_DOC_FILE_BYTES) {
          toastWarn(`Arquivo muito grande (máx. ${MAX_DOC_FILE_BYTES / 1024 / 1024} MB): ${file.name}`)
          continue
        }
        if (next.length >= MAX_DOC_FILES) {
          toastWarn(`No máximo ${MAX_DOC_FILES} anexos por nota.`)
          break
        }
        next.push({ localId: uuid(), file })
      }
      return next
    })
  }

  function onDocFileInputChange(ev: ChangeEvent<HTMLInputElement>) {
    const list = ev.target.files
    if (list?.length) enqueueDocFiles([...list])
    ev.target.value = ''
  }

  function onDocPaste(ev: ClipboardEvent<HTMLTextAreaElement>) {
    const fromFiles = ev.clipboardData?.files
    if (fromFiles && fromFiles.length > 0) {
      ev.preventDefault()
      enqueueDocFiles([...fromFiles])
      return
    }
    const items = ev.clipboardData?.items
    if (!items) return
    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it.kind === 'file') {
        const f = it.getAsFile()
        if (f) files.push(f)
      }
    }
    if (files.length > 0) {
      ev.preventDefault()
      enqueueDocFiles(files)
    }
  }

  function onDocDragOver(ev: DragEvent) {
    ev.preventDefault()
    ev.stopPropagation()
  }

  function onDocDrop(ev: DragEvent) {
    ev.preventDefault()
    ev.stopPropagation()
    const dt = ev.dataTransfer.files
    if (dt?.length) enqueueDocFiles([...dt])
  }

  function onAddPendingDocLink() {
    const normalized = normalizeDocLinkUrl(docLinkUrlDraft)
    if (!normalized) {
      toast('Digite uma URL válida (ex.: https://…)', 'warn')
      return
    }
    setDocPendingLinks((prev) => [
      ...prev,
      { id: uuid(), url: normalized, label: docLinkLabelDraft.trim() },
    ])
    setDocLinkUrlDraft('')
    setDocLinkLabelDraft('')
  }

  async function onAddDocumentation(e: FormEvent) {
    e.preventDefault()
    if (!canEditProjects) return
    const hasBody = Boolean(docDraft.trim()) || docPendingFiles.length > 0 || docPendingLinks.length > 0
    if (!hasBody) return
    setDocBusy(true)
    try {
      const docAttachments: DbDocAttachment[] = docPendingFiles.map((p) => ({
        id: uuid(),
        fileName: p.file.name || 'arquivo',
        mimeType: p.file.type || 'application/octet-stream',
        blob: p.file,
      }))
      const docLinks: DbDocLink[] = docPendingLinks.map((l) => ({
        id: l.id,
        url: l.url,
        label: l.label ? l.label : null,
      }))
      await addProjectDocumentation({
        projectId: proj.id,
        authorId: me.id,
        content: docDraft,
        docAttachments: docAttachments.length > 0 ? docAttachments : undefined,
        docLinks: docLinks.length > 0 ? docLinks : undefined,
      })
      setDocDraft('')
      setDocPendingFiles([])
      setDocPendingLinks([])
    } catch {
      toastError('Não foi possível salvar a documentação')
    } finally {
      setDocBusy(false)
    }
  }

  async function onSaveDocumentationEdit() {
    if (!docEditingId) return
    if (!docEditDraft.trim()) {
      toast('O texto não pode ficar vazio.', 'warn')
      return
    }
    setDocEditBusy(true)
    try {
      await updateProjectDocumentationContent({
        commentId: docEditingId,
        actorUserId: me.id,
        newContent: docEditDraft,
      })
      toast('Documentação atualizada. A alteração foi registrada nos logs de auditoria.')
      setDocEditingId(null)
      setDocEditDraft('')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Não foi possível salvar a edição.')
    } finally {
      setDocEditBusy(false)
    }
  }

  function onApplyAiDoc(next: string, mode: 'replace' | 'append') {
    if (!next.trim()) return
    const merge = (current: string) => (mode === 'replace' ? next.trim() : `${current.trim()}\n\n${next.trim()}`.trim())
    if (aiDocTarget === 'edit') setDocEditDraft((prev) => merge(prev))
    else setDocDraft((prev) => merge(prev))
    setAiDocTarget(null)
  }

  async function onDeleteDocumentation(comment: DbComment) {
    const reason = await requestDestructiveWithReason({
      title: 'Excluir documentação',
      message:
        'Esta entrada será removida permanentemente do projeto. A justificativa e o conteúdo removido ficam nos logs de auditoria.',
      reasonLabel: 'Justificativa da exclusão',
      reasonPlaceholder: 'Descreva o motivo (obrigatório para auditoria).',
      reasonMinLength: 12,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
    })
    if (!reason) return
    setDocEditBusy(true)
    try {
      await deleteProjectDocumentation({
        commentId: comment.id,
        actorUserId: me.id,
        actorRole: me.role,
        justification: reason,
      })
      toast('Documentação excluída.')
      if (docEditingId === comment.id) {
        setDocEditingId(null)
        setDocEditDraft('')
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Não foi possível excluir.')
    } finally {
      setDocEditBusy(false)
    }
  }

  async function onLabelPillClickByCode(code: string, displayStatus: LabelStatus) {
    if (!canEditProjects) return
    if (displayStatus === 'completed') return
    const subset = tasks.filter(
      (t) =>
        t.projectId === proj.id &&
        t.code === code &&
        t.status !== 'concluida' &&
        t.status !== 'cancelado',
    )
    if (subset.length === 0) return
    const ok = await requestConfirm({
      title: 'Concluir tarefas',
      message: `Confirmar conclusão das tarefas do item ${code} (${subset.length})?`,
      confirmLabel: 'Concluir',
      cancelLabel: 'Cancelar',
    })
    if (!ok) return
    for (const t of subset) {
      try {
        const phase = phaseById.get(t.phaseId)
        const informational = effectiveTaskIsInformational(t, phase, planBlueprint?.blocks)
        const r = await concludeOperationalTaskWithHourGuards(t, informational, me.id, {
          requestConfirm,
          requestDestructiveWithReason,
        })
        if (r === 'cancelled') break
      } catch (err) {
        toastError(err instanceof Error ? err.message : 'Erro ao concluir tarefa')
        break
      }
    }
  }

  const activePhaseShort = currentPhaseName ? phaseNameShort(currentPhaseName) : '—'

  return (
    <div className="page page--wide page--project-detail">
      <header className="pd-header">
        <div className="pd-header__main">
          <button type="button" className="pd-back btn btn--ghost btn--icon" onClick={() => navigate(-1)} aria-label="Voltar">
            <ChevronLeft size={22} strokeWidth={2} />
          </button>
          <div className="pd-header__titles">
            <h1 className="pd-title">{proj.projectName}</h1>
            <span
              className={'pd-sync-dot is-' + projectCloudSyncMeta.state}
              role="img"
              aria-label={`Status de sincronização: ${syncStatusLabel}`}
              title={syncStatusTitle}
            />
            <span className={'pd-sync-pill is-' + projectCloudSyncMeta.state} title={syncStatusTitle}>
              {syncStatusLabel}
            </span>
            <span className="pd-sync-pill" title="Atualizado em (último check-in manual)">
              Atualizado em:{' '}
              {proj.lastManualCheckinAt ? formatDatePt(proj.lastManualCheckinAt, 'dd/MM HH:mm') : '—'}
            </span>
            <span
              className={planPillClass(proj.planType)}
              title={`Contrato: ${formatDurationHmFromHours(proj.hoursContracted)}`}
            >
              {planName}
            </span>
            <span
              className={'proj-card__badge proj-card__badge--client-type is-' + (proj.clientType ?? 'generico')}
              title="Tipo do cliente (negócio)"
            >
              {projectClientTypeLabelPt(proj.clientType)}
            </span>
            <span
              className={
                'proj-card__badge proj-card__badge--engagement-kind is-' +
                (proj.engagementKind ?? 'operacao_padrao')
              }
              title="Ciclo do projeto: IMPLANTAÇÃO (ciclo principal) vs. UPSELL"
            >
              {projectEngagementKindLabelPt(proj.engagementKind)}
            </span>
            <span className={'proj-card__badge proj-card__badge--status is-' + proj.status}>
              {statusLabelPt(proj.status)}
            </span>
            {(proj.manualAttentionNote ?? '').trim() ? (
              <span
                className="proj-card__badge proj-card__badge--op-alert"
                title={(proj.manualAttentionNote ?? '').trim()}
              >
                Alerta operacional
              </span>
            ) : null}
            <span
              className={'pd-analyst-badge' + (projectAnalyst ? '' : ' pd-analyst-badge--solo')}
              title={projectAnalyst ? `Analista: ${projectAnalyst.name}` : 'Sem analista'}
              style={
                projectAnalyst ? { ['--analyst-color' as string]: projectAnalyst.color } : undefined
              }
            >
              {projectAnalyst ? (
                <>
                  <AnalystAvatar
                    name={projectAnalyst.name}
                    color={projectAnalyst.color}
                    avatarUrl={projectAnalyst.avatarUrl}
                    size="sm"
                  />
                  <span className="pd-analyst-badge__text">{projectAnalyst.name}</span>
                </>
              ) : (
                <span className="pd-analyst-badge__text muted">Sem analista</span>
              )}
            </span>
          </div>
        </div>
        <div className="pd-header__actions">
          {projectCloudSyncMeta.state !== 'synced' ? (
            <button
              type="button"
              className="btn btn--ghost pd-action-btn"
              onClick={() => {
                void (async () => {
                  setProjectSyncBusy(true)
                  try {
                    await flushPendingProjectGraphSyncByProject(proj.id)
                    setSyncTick((n) => n + 1)
                    const meta = getProjectCloudSyncMeta(proj.id)
                    toast(
                      meta.state === 'synced'
                        ? 'Nuvem sincronizada.'
                        : 'Sincronização pendente na nuvem. Reenvio concluído.',
                    )
                  } catch (e) {
                    toastError(e instanceof Error ? e.message : 'Falha de sincronização com a nuvem.')
                  } finally {
                    setProjectSyncBusy(false)
                  }
                })()
              }}
              disabled={projectSyncBusy}
              title={projectCloudSyncMeta.lastErrorCode ?? undefined}
            >
              <RotateCcw {...ic} aria-hidden />
              Sincronizar
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn--ghost pd-action-btn"
            onClick={() => void onManualProjectCheckin()}
            disabled={!canEditProjects}
          >
            <ShieldAlert {...ic} aria-hidden />
            Check-in
          </button>
          <button
            type="button"
            className={
              'btn btn--ghost pd-action-btn' + (proj.status === 'congelado' ? ' pd-action-btn--freeze-on' : '')
            }
            onClick={() => void onFreezeHeaderClick()}
            disabled={
              !canEditProjects ||
              freezeQuickBusy ||
              proj.status === 'finalizado' ||
              proj.status === 'cancelado'
            }
            title={
              proj.status === 'finalizado' || proj.status === 'cancelado'
                ? 'Indisponível para finalizado ou cancelado'
                : proj.status === 'congelado'
                  ? 'Descongelar (ativo) — confirmação e motivo'
                  : 'Congelar — pede motivo (histórico no projeto)'
            }
          >
            <Snowflake {...ic} aria-hidden />
            {proj.status === 'congelado' ? 'Descongelar' : 'Congelar'}
          </button>
          <button
            type="button"
            className="btn btn--ghost pd-action-btn"
            onClick={() => setEditOpen(true)}
            disabled={!canEditProjects}
          >
            <Pencil {...ic} aria-hidden />
            Editar
          </button>
          <button
            type="button"
            className="btn btn--ghost pd-action-btn pd-action-btn--warn"
            onClick={openCancelProjectDialog}
            disabled={!canEditProjects}
          >
            <XCircle {...ic} aria-hidden />
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--ghost pd-action-btn pd-action-btn--danger"
            onClick={onDeleteProject}
            disabled={!canEditProjects}
          >
            <Trash2 {...ic} aria-hidden />
            Excluir
          </button>
        </div>
      </header>

      <section className="pd-kpis" aria-label="Resumo do projeto">
        <div className="pd-kpi">
          <span className="pd-kpi__label">Progresso</span>
          <div className="pd-kpi__progress">
            <div className="pd-kpi__track">
              <div className="pd-kpi__fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="pd-kpi__pct">{pct}%</span>
          </div>
        </div>
        <div className="pd-kpi">
          <span className="pd-kpi__label">Horas utilizadas</span>
          <span className="pd-kpi__value">
            {formatDurationHmFromHours(proj.hoursUsed)} / {formatDurationHmFromHours(proj.hoursContracted)}
          </span>
        </div>
        <div className="pd-kpi">
          <span className="pd-kpi__label">Saldo de horas</span>
          <span className="pd-kpi__value">{formatDurationHmFromHours(saldo)}</span>
        </div>
        <div className="pd-kpi">
          <span className="pd-kpi__label">Atualizado em:</span>
          <span className="pd-kpi__value">
            {proj.lastManualCheckinAt ? formatDatePt(proj.lastManualCheckinAt, 'dd/MM/yyyy HH:mm') : 'Não registrado'}
          </span>
        </div>
        {proj.status === 'cancelado' ? (
          <div className="pd-kpi pd-kpi--cancelled">
            <span className="pd-kpi__label">Data de cancelamento</span>
            <span className="pd-kpi__value">{proj.cancelledAt ? formatDatePt(proj.cancelledAt) : '—'}</span>
          </div>
        ) : null}
        {isCustomPlan ? (
          <div className="pd-kpi">
            <span className="pd-kpi__label">Soma das previsões</span>
            <span className="pd-kpi__value">
              {formatDurationHmFromHours(customBillableSumEst)} / contrato {formatDurationHmFromHours(proj.hoursContracted)}
            </span>
          </div>
        ) : null}
        <div className="pd-kpi">
          <span className="pd-kpi__label">Tarefas</span>
          <span className="pd-kpi__value">
            {doneTasks} / {tasksVisibleInProject.length}
          </span>
        </div>
        <div className="pd-kpi pd-kpi--phase">
          <span className="pd-kpi__label">Fase ativa</span>
          <span className="pd-kpi__phase">{activePhaseShort}</span>
        </div>
      </section>
      <div className="pd-op-summary" aria-label="Sinais operacionais de agenda">
        <span className="pd-op-summary__chip is-no-show">No-show: {noShowCancelledCount}</span>
        <span className="pd-op-summary__chip is-rescheduled">Reagendadas: {followUpRescheduleCount}</span>
        {hasScope(me, 'settings.view') && followUpRescheduleCount > 0 ? (
          <Link className="pd-op-summary__admin-link muted" to="/configuracoes#reschedule-chain-migration">
            Migração de cadeias (admin)
          </Link>
        ) : null}
      </div>

      {(proj.freezeTimeline ?? []).length > 0 ? (
        <section className="pd-freeze-log" aria-label="Histórico de congelamento">
          <h2 className="pd-freeze-log__title">Histórico de congelamento</h2>
          <p className="pd-freeze-log__intro muted">
            Motivos e horários registrados ao usar o atalho de gelo na grade ou aqui no detalhe (também há entrada no log
            de auditoria).
          </p>
          <ul className="pd-freeze-log__list">
            {[...(proj.freezeTimeline ?? [])].reverse().map((ev, idx) => (
              <li key={`${ev.at}-${idx}`} className="pd-freeze-log__item">
                <div className="pd-freeze-log__head">
                  <span className={'pd-freeze-log__badge is-' + ev.kind}>
                    {ev.kind === 'freeze' ? 'Congelado' : 'Descongelado'}
                  </span>
                  <time className="pd-freeze-log__time" dateTime={ev.at}>
                    {formatDatePt(ev.at, 'dd/MM/yyyy HH:mm')}
                  </time>
                </div>
                <p className="pd-freeze-log__reason">{ev.reason}</p>
                <p className="pd-freeze-log__by muted">Por {userNameById.get(ev.by) ?? ev.by}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="pd-tabs" role="tablist" aria-label="Seções do projeto">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'fases'}
          className={'pd-tabs__btn' + (tab === 'fases' ? ' is-active' : '')}
          onClick={() => setTab('fases')}
        >
          <CircleCheck className="pd-tabs__ic" aria-hidden size={18} strokeWidth={2} />
          <span>Fases &amp; tarefas</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'contatos'}
          className={'pd-tabs__btn' + (tab === 'contatos' ? ' is-active' : '')}
          onClick={() => setTab('contatos')}
        >
          <Phone className="pd-tabs__ic" aria-hidden size={18} strokeWidth={2} />
          <span>Contatos ({contacts.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'docs'}
          className={'pd-tabs__btn' + (tab === 'docs' ? ' is-active' : '')}
          onClick={() => setTab('docs')}
        >
          <MessageSquare className="pd-tabs__ic" aria-hidden size={18} strokeWidth={2} />
          <span>Documentação ({docComments.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'labels'}
          className={'pd-tabs__btn' + (tab === 'labels' ? ' is-active' : '')}
          onClick={() => setTab('labels')}
        >
          <Tag className="pd-tabs__ic" aria-hidden size={18} strokeWidth={2} />
          <span>Labels</span>
        </button>
        {canViewPortalIntel ? (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'portal'}
            className={'pd-tabs__btn' + (tab === 'portal' ? ' is-active' : '')}
            onClick={() => setTab('portal')}
          >
            <UserCircle2 className="pd-tabs__ic" aria-hidden size={18} strokeWidth={2} />
            <span>Portal cliente</span>
          </button>
        ) : null}
      </div>

      {tab === 'fases' ? (
        <div className="pd-board-wrap">
          <div className="pd-board">
            {sortedPhases.map((phase) => {
              const { done, total, pct: pPct, list } = phaseStats(
                phase.id,
                proj.id,
                tasks,
                rescheduleKanban?.hiddenTaskIds ?? new Set(),
              )
              const locked = phase.status === 'bloqueada'
              const ativa = phase.status === 'ativa'
              const concl = phase.status === 'concluida'
              return (
                <section
                  key={phase.id}
                  className={
                    'pd-phase' +
                    (ativa ? ' pd-phase--ativa' : '') +
                    (locked ? ' pd-phase--locked' : '')
                  }
                  style={{ ['--pd-phase-accent' as string]: phase.colorHex || planPhaseAccentHex(phase.orderIndex) }}
                >
                  <header className="pd-phase__head">
                    <div className="pd-phase__head-row">
                      <div className={'pd-phase__icon' + (ativa ? ' pd-phase__icon--play' : '')}>
                        {locked ? <Lock {...ic} /> : concl ? <CheckCircle2 {...ic} /> : <Play {...ic} />}
                      </div>
                      <div className="pd-phase__head-main">
                        <h2 className="pd-phase__title">{phase.name}</h2>
                        <div className="pd-phase__head-meta">
                          <span className="pd-phase__stats">{done}/{total} · {pPct}%</span>
                          {locked ? <span className="pd-phase__lock-badge">Bloqueada</span> : null}
                        </div>
                      </div>
                      {canEditProjects ? (
                        isCustomPlan ? (
                          <details className="pd-phase__more">
                            <summary
                              className="btn btn--ghost btn--xs btn--icon pd-phase__more-trigger"
                              aria-label="Menu da fase"
                              title="Ações da fase"
                            >
                              <MoreVertical {...icSm} aria-hidden />
                            </summary>
                            <div className="pd-phase__more-panel" role="menu" aria-label="Ações da fase">
                              <button
                                type="button"
                                className="pd-phase__more-item"
                                role="menuitem"
                                onClick={(ev) => {
                                  const det = ev.currentTarget.closest('details') as HTMLDetailsElement | null
                                  det?.removeAttribute('open')
                                  void (async () => {
                                    const code = await suggestNextProjectTaskCode(proj.id, phase.id)
                                    setPlanTaskModalVariant('standard')
                                    setCustomTaskDefaultCode(code)
                                    setCustomTaskPhaseId(phase.id)
                                    setCustomTaskEditing(null)
                                    setCustomTaskModalOpen(true)
                                  })()
                                }}
                              >
                                <Plus {...icSm} aria-hidden />
                                <span>Nova tarefa</span>
                              </button>
                              <button
                                type="button"
                                className="pd-phase__more-item"
                                role="menuitem"
                                onClick={(ev) => {
                                  const det = ev.currentTarget.closest('details') as HTMLDetailsElement | null
                                  det?.removeAttribute('open')
                                  setCustomPhaseModal({ mode: 'edit', phase })
                                }}
                              >
                                <Pencil {...icSm} aria-hidden />
                                <span>Editar fase</span>
                              </button>
                              <button
                                type="button"
                                className="pd-phase__more-item"
                                role="menuitem"
                                onClick={(ev) => {
                                  const det = ev.currentTarget.closest('details') as HTMLDetailsElement | null
                                  det?.removeAttribute('open')
                                  void moveProjectPhase(proj.id, phase.id, 'up').catch((e) => {
                                    toastError(e instanceof Error ? e.message : 'Não foi possível mover a fase.')
                                  })
                                }}
                              >
                                <ChevronUp {...icSm} aria-hidden />
                                <span>Mover para cima</span>
                              </button>
                              <button
                                type="button"
                                className="pd-phase__more-item"
                                role="menuitem"
                                onClick={(ev) => {
                                  const det = ev.currentTarget.closest('details') as HTMLDetailsElement | null
                                  det?.removeAttribute('open')
                                  void moveProjectPhase(proj.id, phase.id, 'down').catch((e) => {
                                    toastError(e instanceof Error ? e.message : 'Não foi possível mover a fase.')
                                  })
                                }}
                              >
                                <ChevronDown {...icSm} aria-hidden />
                                <span>Mover para baixo</span>
                              </button>
                              <button
                                type="button"
                                className="pd-phase__more-item pd-phase__more-item--danger"
                                role="menuitem"
                                onClick={(ev) => {
                                  const det = ev.currentTarget.closest('details') as HTMLDetailsElement | null
                                  det?.removeAttribute('open')
                                  void (async () => {
                                    const ok = await requestConfirm({
                                      title: 'Excluir fase',
                                      message: `Excluir a fase "${phase.name}" e todas as suas tarefas?`,
                                      confirmLabel: 'Excluir',
                                      cancelLabel: 'Cancelar',
                                      danger: true,
                                    })
                                    if (!ok) return
                                    try {
                                      await deleteProjectPhaseCascade(phase.id)
                                      toast('Fase excluída.')
                                    } catch (e) {
                                      toastError(e instanceof Error ? e.message : 'Não foi possível excluir a fase.')
                                    }
                                  })()
                                }}
                              >
                                <Trash2 {...icSm} aria-hidden />
                                <span>Excluir fase</span>
                              </button>
                            </div>
                          </details>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--ghost btn--xs btn--icon pd-phase__lone-add"
                            onClick={() => {
                              void (async () => {
                                const code = await suggestNextProjectTaskCode(proj.id, phase.id)
                                setPlanTaskModalVariant('catalogAdHoc')
                                setCustomTaskDefaultCode(code)
                                setCustomTaskPhaseId(phase.id)
                                setCustomTaskEditing(null)
                                setCustomTaskModalOpen(true)
                              })()
                            }}
                            title="Nova tarefa avulsa nesta fase (só consome horas reais)"
                            aria-label="Nova tarefa avulsa nesta fase"
                          >
                            <Plus {...icSm} aria-hidden />
                          </button>
                        )
                      ) : null}
                    </div>
                  </header>
                  <div className="pd-phase__tasks">
                    {list.map((t) => {
                      const mergedRowEvents = rescheduleKanban?.mergedEventsByLeaf.get(t.id)
                      const scheduledEv = getPrimaryScheduledEventFromCandidates(
                        mergedRowEvents ?? eventsByTaskId.get(t.id) ?? [],
                      )
                      const displayActual = rescheduleKanban?.aggregateActualByLeaf.get(t.id) ?? t.actualHours
                      const taskComments =
                        commentsByCanonicalLeaf.get(t.id) ?? commentsByTask.get(t.id) ?? []
                      const showDesc = expandedDesc[t.id]
                      const canAct = canEditProjects && !locked && t.status !== 'concluida' && t.status !== 'cancelado'
                      const doneTask = t.status === 'concluida'
                      const informational = effectiveTaskIsInformational(
                        t,
                        phaseById.get(t.phaseId),
                        planBlueprint?.blocks,
                      )
                      const hoursPct =
                        !informational && t.estimatedHours > 0
                          ? Math.min(100, (displayActual / t.estimatedHours) * 100)
                          : null
                      const chainMembers = rescheduleKanban?.chainMemberIdsByLeaf.get(t.id)
                      const timerTaskId = runningTimerSession?.taskId
                      const liveTimerHere =
                        !informational &&
                        Boolean(timerTaskId) &&
                        (chainMembers?.includes(timerTaskId!) || timerTaskId === t.id)
                      const codeColors = planLabelColorsFromCode(t.code, phase.colorHex)
                      const relatedSource = t.rescheduledFromTaskId ? taskById.get(t.rescheduledFromTaskId) : null
                      const relatedTarget = t.rescheduledToTaskId ? taskById.get(t.rescheduledToTaskId) : null
                      return (
                        <article
                          key={t.id}
                          className={
                            'pd-task' +
                            (doneTask ? ' pd-task--done' : '') +
                            (informational ? ' pd-task--info' : '') +
                            (t.isAdHoc ? ' pd-task--adhoc' : '') +
                            (liveTimerHere ? ' pd-task--timer-live' : '')
                          }
                          style={{
                            ['--task-code-color' as string]: codeColors.phase,
                            ['--task-phase-accent' as string]: phase.colorHex || planPhaseAccentHex(phase.orderIndex),
                          }}
                        >
                          <div className="pd-task__top">
                            <div className="pd-task__meta-row">
                              <div className="pd-task__code-line">
                                <span className="pd-task__code">{t.code}</span>
                              </div>
                              <div className="pd-task__status-line">
                                <TaskScheduleChip
                                  task={t}
                                  events={projectEvents}
                                  rowScopedEvents={mergedRowEvents}
                                  onAgendaPress={
                                    canEditAgenda
                                      ? ({ state, primaryEvent }) => {
                                          const intent =
                                            primaryEvent &&
                                            (state === 'scheduled' ||
                                              state === 'in_session' ||
                                              state === 'done_event')
                                              ? ({ kind: 'editEvent' as const, eventId: primaryEvent.id } as const)
                                              : ({
                                                  kind: 'prefillTask' as const,
                                                  taskId: t.id,
                                                  projectId: proj.id,
                                                } as const)
                                          const { pathname, search } = buildAgendaNavigateTo(intent)
                                          navigate({ pathname, search }, { state: {} })
                                        }
                                      : undefined
                                  }
                                />
                                {t.completedManualOverride && t.completedManualOverrideReason ? (
                                  <span
                                    className="pd-task__flow-badge is-rebooked"
                                    title={`Conclusão manual: ${t.completedManualOverrideReason}`}
                                  >
                                    Manual
                                  </span>
                                ) : null}
                                {t.cancellationReason === 'client_no_show' ? (
                                  <span className="pd-task__flow-badge is-no-show">No-show (legado)</span>
                                ) : null}
                                {t.rescheduledToTaskId ? (
                                  <span
                                    className="pd-task__flow-badge is-rebooked"
                                    title={relatedTarget ? `Tarefa legada — cadeia: ${relatedTarget.code}` : 'Reagendamento legado'}
                                  >
                                    Reag. legada
                                  </span>
                                ) : null}
                                {t.rescheduledFromTaskId ? (
                                  <span
                                    className="pd-task__flow-badge is-follow-up"
                                    title={relatedSource ? `Origem (legado): ${relatedSource.code}` : 'Tarefa criada por reagendamento legado'}
                                  >
                                    Retomada (legado)
                                  </span>
                                ) : null}
                                {t.isAdHoc ? (
                                  <span
                                    className="pd-task__adhoc-ico"
                                    title="Tarefa avulsa — fora do escopo do catálogo/plano (só horas reais)"
                                    aria-hidden
                                  >
                                    <Link2 size={13} strokeWidth={2.25} />
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="pd-task__rail">
                              {(() => {
                                const analyst =
                                  analysts.find((a) => a.id === (t.assignedTo ?? proj.analystId ?? '')) ?? null
                                if (!analyst) return null
                                return (
                                  <span
                                    className="pd-task__analyst-inline"
                                    title={analyst.name}
                                    style={{ ['--analyst-ring' as string]: analyst.color }}
                                  >
                                    <AnalystAvatar
                                      name={analyst.name}
                                      color={analyst.color}
                                      avatarUrl={analyst.avatarUrl}
                                      size="sm"
                                    />
                                  </span>
                                )
                              })()}
                              <div className="pd-task__actions">
                                <span className="pd-task__icon-slot" aria-hidden>
                                  {taskStatusIcon(liveTimerHere ? 'em_andamento' : t.status)}
                                </span>
                                {!doneTask && canAct ? (
                                  <button
                                    type="button"
                                    className="btn btn--primary btn--xs btn--icon pd-task__conclude"
                                    onClick={() => onTaskStatus(t.id, 'concluida')}
                                    title="Marcar como concluída"
                                    aria-label="Marcar tarefa como concluída"
                                  >
                                    <CheckCircle2 {...icSm} aria-hidden />
                                  </button>
                                ) : null}
                                <details className="pd-task__more">
                                <summary
                                  className="btn btn--ghost btn--xs btn--icon pd-task__more-trigger"
                                  aria-label="Menu da tarefa"
                                  title="Mais ações"
                                >
                                  <MoreVertical {...icSm} aria-hidden />
                                </summary>
                                <div className="pd-task__more-panel" role="menu" aria-label="Ações da tarefa">
                                  <button
                                    type="button"
                                    className="pd-task__more-item"
                                    role="menuitem"
                                    onClick={(ev) => {
                                      const det = ev.currentTarget.closest('details') as HTMLDetailsElement | null
                                      det?.removeAttribute('open')
                                      setExpandedDesc((d) => ({ ...d, [t.id]: !d[t.id] }))
                                    }}
                                    title={showDesc ? 'Ocultar descrição' : 'Ver descrição'}
                                    aria-label={showDesc ? 'Ocultar descrição da tarefa' : 'Ver descrição da tarefa'}
                                  >
                                    <MessageSquare {...icSm} aria-hidden />
                                    <span>{showDesc ? 'Ocultar' : 'Descrição'}</span>
                                  </button>
                                  {!doneTask && (isCustomPlan || t.isAdHoc) && canEditProjects ? (
                                    <button
                                      type="button"
                                      className="pd-task__more-item"
                                      role="menuitem"
                                      onClick={(ev) => {
                                        const det = ev.currentTarget.closest('details') as HTMLDetailsElement | null
                                        det?.removeAttribute('open')
                                        setPlanTaskModalVariant(isCustomPlan ? 'standard' : 'catalogAdHoc')
                                        setCustomTaskEditing(t)
                                        setCustomTaskPhaseId(phase.id)
                                        setCustomTaskDefaultCode(t.code)
                                        setCustomTaskModalOpen(true)
                                      }}
                                      title="Editar tarefa: código, título, descrição e estimativa"
                                      aria-label="Editar tarefa"
                                    >
                                      <Pencil {...icSm} aria-hidden />
                                      <span>Editar</span>
                                    </button>
                                  ) : null}
                                  {!doneTask && (isCustomPlan || t.isAdHoc) && canEditProjects ? (
                                    <button
                                      type="button"
                                      className="pd-task__more-item pd-task__more-item--danger"
                                      role="menuitem"
                                      onClick={(ev) => {
                                        const det = ev.currentTarget.closest('details') as HTMLDetailsElement | null
                                        det?.removeAttribute('open')
                                        void (async () => {
                                          const reason = await requestDestructiveWithReason({
                                            title: 'Excluir tarefa',
                                            message: `Excluir permanentemente "${t.code} ${t.title}"? A justificativa ficará nos logs de auditoria.`,
                                            reasonLabel: 'Justificativa da exclusão',
                                            reasonPlaceholder: 'Descreva o motivo (obrigatório para auditoria).',
                                            reasonMinLength: 12,
                                            confirmLabel: 'Excluir',
                                            cancelLabel: 'Cancelar',
                                          })
                                          if (!reason) return
                                          try {
                                            await deleteProjectTask(t.id, {
                                              actorUserId: me.id,
                                              justification: reason,
                                            })
                                            toast('Tarefa excluída.')
                                          } catch (e) {
                                            toastError(e instanceof Error ? e.message : 'Falha ao excluir.')
                                          }
                                        })()
                                      }}
                                      aria-label="Excluir tarefa"
                                      title="Excluir tarefa (justificativa obrigatória)"
                                    >
                                      <Trash2 {...icSm} aria-hidden />
                                      <span>Excluir</span>
                                    </button>
                                  ) : null}
                                </div>
                              </details>
                              </div>
                            </div>
                            <span className="pd-task__title">{t.title}</span>
                          </div>
                          {!informational ? (
                            <div
                              className={
                                'pd-task__hours-line' +
                                (t.isAdHoc && t.estimatedHours <= 0 ? ' pd-task__hours-line--adhoc' : '')
                              }
                              title="Horas consumidas / horas previstas nesta tarefa"
                            >
                              <Clock className="pd-task__hours-line-ic" {...icSm} aria-hidden />
                              <span className="pd-task__hours-line-values">
                                <strong>{formatDurationHmFromHours(displayActual)}</strong>
                                <span className="pd-task__hours-line-sep" aria-hidden>
                                  /
                                </span>
                                <span className="pd-task__hours-line-cap">
                                  {t.estimatedHours > 0
                                    ? formatDurationHmFromHours(t.estimatedHours)
                                    : t.isAdHoc
                                      ? '—'
                                      : formatDurationHmFromHours(0)}
                                </span>
                              </span>
                            </div>
                          ) : null}
                          {doneTask ? (
                            <button
                              type="button"
                              className="pd-task__reopen pd-task__reopen--icon"
                              onClick={() => onTaskStatus(t.id, 'pendente')}
                              title="Reabrir tarefa"
                              aria-label="Reabrir tarefa"
                            >
                              <RotateCcw {...icSm} aria-hidden />
                            </button>
                          ) : (
                            <>
                              {!informational ? (
                                <>
                                  {t.isAdHoc && t.estimatedHours <= 0 && displayActual > 0 ? (
                                    <div
                                      className="pd-task__adhoc-spent-meter pd-task__adhoc-spent-meter--solo"
                                      aria-hidden
                                      title="Tempo registrado (fora da previsão do plano)"
                                    >
                                      <div
                                        className="pd-task__adhoc-spent-meter-fill"
                                        style={{
                                          width: `${Math.min(100, (displayActual / 6) * 100)}%`,
                                        }}
                                      />
                                    </div>
                                  ) : hoursPct != null ? (
                                    <div className="pd-task__time-budget-track pd-task__time-budget-track--solo" aria-hidden>
                                      <div
                                        className="pd-task__time-budget-fill"
                                        style={{ width: `${hoursPct}%` }}
                                      />
                                    </div>
                                  ) : null}
                                </>
                              ) : null}
                              {liveTimerHere ? (
                                <div className="pd-task__live-timer" role="status" aria-live="polite">
                                  <span className="pd-task__live-timer-dot" aria-hidden />
                                  <Play className="pd-task__live-timer-play" {...icSm} aria-hidden />
                                  <span className="pd-task__live-timer-label">Cronômetro</span>
                                  <strong className="pd-task__live-timer-hms">{formatDurationHMS(runningLiveSeconds)}</strong>
                                </div>
                              ) : null}
                              {!doneTask && canAct ? (
                                <div className="pd-task__footer">
                                  <div className="pd-task__footer-agenda-wrap">
                                    {scheduledEv ? (
                                      <button
                                        type="button"
                                        className="pd-task__footer-btn pd-task__footer-btn--icon-only pd-task__footer-btn--agenda pd-task__footer-btn--agenda-on"
                                        onClick={() => void agendaEventModalRef.current?.openEditEvent(scheduledEv.id)}
                                        title="Editar compromisso (nesta tela)"
                                        aria-label="Editar compromisso na agenda"
                                      >
                                        <CalendarCheck {...ic} aria-hidden />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="pd-task__footer-btn pd-task__footer-btn--icon-only pd-task__footer-btn--agenda"
                                        onClick={() => void agendaEventModalRef.current?.openPrefillTask(t.id, proj.id)}
                                        title="Agendar (nesta tela)"
                                        aria-label="Agendar na agenda"
                                      >
                                        <CalendarPlus {...ic} aria-hidden />
                                      </button>
                                    )}
                                  </div>
                                  {!informational ? (
                                    <button
                                      type="button"
                                      className="pd-task__footer-btn pd-task__footer-btn--icon-only pd-task__footer-btn--hours"
                                      onClick={() => setHoursTask(t)}
                                      title="Registrar horas nesta tarefa"
                                      aria-label="Registrar horas nesta tarefa"
                                    >
                                      <Clock {...ic} aria-hidden />
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </>
                          )}
                          {taskComments.length > 0 ? (
                            <ul className="pd-task__items">
                              {taskComments.map((c) => (
                                <li key={c.id}>{c.content}</li>
                              ))}
                            </ul>
                          ) : null}
                          {showDesc ? (
                            <p className="pd-task__desc">{t.description?.trim() || 'Sem descrição.'}</p>
                          ) : null}
                        </article>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
          {isCustomPlan && canEditProjects ? (
            <div className="pd-custom-plan-add-phase">
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => setCustomPhaseModal({ mode: 'add' })}
              >
                <Plus {...ic} aria-hidden />
                Nova fase
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'contatos' ? (
        <div className="pd-tab-panel">
          <form className="pd-contacts-form" onSubmit={onAddContact}>
            <input
              className="input pd-contacts-form__input"
              placeholder="Nome"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              aria-label="Nome"
            />
            <input
              className="input pd-contacts-form__input"
              placeholder="Telefone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              aria-label="Telefone"
            />
            <input
              className="input pd-contacts-form__input"
              placeholder="Cargo"
              value={contactRole}
              onChange={(e) => setContactRole(e.target.value)}
              aria-label="Cargo"
            />
            <button type="submit" className="btn btn--primary pd-contacts-form__add" aria-label="Adicionar contato">
              <Plus size={20} strokeWidth={2.25} />
            </button>
          </form>
          <div className="pd-contacts-list">
            {contacts.length === 0 ? (
              <p className="muted pd-contacts-empty">Nenhum contato cadastrado ainda.</p>
            ) : (
              contacts.map((c) => (
                <article key={c.id} className="pd-contact-card">
                  <div className="pd-contact-card__body">
                    <div className="pd-contact-card__name">{c.name}</div>
                    <div className="pd-contact-card__meta muted">
                      {c.role}
                      {c.role && c.phone ? ' • ' : null}
                      {c.phone}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="pd-contact-card__del btn btn--ghost btn--icon"
                    aria-label="Excluir contato"
                    onClick={() => {
                      if (!canEditProjects) return
                      void deleteProjectContact(c.id).catch((e) => {
                        toastError(e instanceof Error ? e.message : 'Não foi possível excluir o contato.')
                      })
                    }}
                    disabled={!canEditProjects}
                  >
                    <Trash2 size={18} strokeWidth={2} />
                  </button>
                </article>
              ))
            )}
          </div>
        </div>
      ) : null}

      {tab === 'docs' ? (
        <div className="pd-tab-panel">
          <p className="muted pd-docs-hint">
            Escreva notas, cole imagens (Ctrl+V), arraste arquivos ou anexe com o clipe. URLs no texto viram links
            clicáveis; use &quot;Link&quot; para salvar referências com rótulo.
          </p>
          <div
            className="pd-docs-editor"
            onDragOver={onDocDragOver}
            onDrop={onDocDrop}
          >
            <input
              ref={docFileInputRef}
              type="file"
              className="sr-only"
              multiple
              aria-hidden
              tabIndex={-1}
              onChange={onDocFileInputChange}
            />
            <div className="pd-docs-toolbar">
              <button
                type="button"
                className="btn btn--ghost btn--sm pd-docs-toolbar__btn"
                onClick={() => docFileInputRef.current?.click()}
              >
                <Paperclip {...icSm} aria-hidden />
                Anexar arquivo
              </button>
              <span className="pd-docs-toolbar__meta muted">Imagens e arquivos ficam neste dispositivo (IndexedDB).</span>
            </div>
            <div className="pd-docs-link-row">
              <Link2 {...icSm} className="pd-docs-link-row__ic" aria-hidden />
              <input
                className="input input--sm pd-docs-link-row__url"
                placeholder="https:// ou exemplo.com.br"
                value={docLinkUrlDraft}
                onChange={(e) => setDocLinkUrlDraft(e.target.value)}
                aria-label="URL do link"
              />
              <input
                className="input input--sm pd-docs-link-row__label"
                placeholder="Rótulo (opcional)"
                value={docLinkLabelDraft}
                onChange={(e) => setDocLinkLabelDraft(e.target.value)}
                aria-label="Rótulo do link"
              />
              <button type="button" className="btn btn--ghost btn--sm" onClick={onAddPendingDocLink}>
                Adicionar link
              </button>
            </div>
            {docPendingFiles.length > 0 || docPendingLinks.length > 0 ? (
              <ul className="pd-docs-chips" aria-label="Anexos e links desta nota">
                {docPendingLinks.map((l) => (
                  <li key={l.id} className="pd-docs-chip pd-docs-chip--link">
                    <span className="pd-docs-chip__text">{l.label || l.url}</span>
                    <button
                      type="button"
                      className="pd-docs-chip__x btn btn--ghost btn--icon"
                      aria-label="Remover link"
                      onClick={() => setDocPendingLinks((p) => p.filter((x) => x.id !== l.id))}
                    >
                      <X size={16} strokeWidth={2} />
                    </button>
                  </li>
                ))}
                {docPendingFiles.map((p) => (
                  <li key={p.localId} className="pd-docs-chip">
                    <span className="pd-docs-chip__text">{p.file.name || 'Arquivo'}</span>
                    <button
                      type="button"
                      className="pd-docs-chip__x btn btn--ghost btn--icon"
                      aria-label="Remover anexo"
                      onClick={() => setDocPendingFiles((f) => f.filter((x) => x.localId !== p.localId))}
                    >
                      <X size={16} strokeWidth={2} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <form className="pd-docs-form" onSubmit={onAddDocumentation}>
              <textarea
                className="input pd-docs-form__input"
                rows={4}
                placeholder="Notas, decisões, resumo de reunião… (cole capturas de tela aqui)"
                value={docDraft}
                onChange={(e) => setDocDraft(e.target.value)}
                onPaste={onDocPaste}
              />
              <button
                type="button"
                className="btn btn--ghost btn--sm pd-docs-form__ai"
                onClick={() => setAiDocTarget('new')}
                disabled={docBusy || !docDraft.trim()}
                title="Estruturar texto com IA"
              >
                <Sparkles size={14} strokeWidth={2} />
                Formatar IA
              </button>
              <button
                type="submit"
                className="btn btn--primary pd-docs-form__send"
                disabled={
                  docBusy ||
                  (!docDraft.trim() && docPendingFiles.length === 0 && docPendingLinks.length === 0)
                }
                aria-label="Publicar"
              >
                <Send size={20} strokeWidth={2} />
              </button>
            </form>
          </div>
          <div className="pd-docs-feed">
            {docComments.length === 0 ? (
              <p className="muted pd-docs-empty">Nenhuma entrada ainda. Use o campo acima para registrar notas.</p>
            ) : (
              docComments.map((c) => {
                const isAuthor = c.authorId === me.id
                const isAdmin = me.role === 'admin'
                const canDeleteDoc = isAdmin || isAuthor
                const isEditing = docEditingId === c.id
                const anotherCardEditing = docEditingId !== null && docEditingId !== c.id
                const actionsDisabled = docEditBusy || anotherCardEditing

                return (
                  <article key={c.id} className="pd-doc-card">
                    <header className="pd-doc-card__head">
                      <div className="pd-doc-card__head-main">
                        <strong className="pd-doc-card__author">
                          {userNameById.get(c.authorId) ?? 'Usuário'}
                        </strong>
                        <div className="pd-doc-card__meta-row muted">
                          <time className="pd-doc-card__time" dateTime={c.createdAt}>
                            {docTimestampPt(c.createdAt)}
                          </time>
                          {c.updatedAt ? (
                            <span className="pd-doc-card__edited">
                              · editado em {docTimestampPt(c.updatedAt)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="pd-doc-card__actions">
                        {isAuthor && !isEditing ? (
                          <button
                            type="button"
                            className="btn btn--ghost btn--icon btn--sm"
                            aria-label="Editar documentação"
                            title="Editar"
                            disabled={actionsDisabled}
                            onClick={() => {
                              setDocEditingId(c.id)
                              setDocEditDraft(c.content)
                            }}
                          >
                            <Pencil size={16} strokeWidth={2} />
                          </button>
                        ) : null}
                        {canDeleteDoc && !isEditing ? (
                          <button
                            type="button"
                            className="btn btn--ghost btn--icon btn--sm"
                            aria-label="Excluir documentação"
                            title="Excluir"
                            disabled={actionsDisabled}
                            onClick={() => void onDeleteDocumentation(c)}
                          >
                            <Trash2 size={16} strokeWidth={2} />
                          </button>
                        ) : null}
                      </div>
                    </header>
                    {isEditing ? (
                      <div className="pd-doc-card__edit">
                        <textarea
                          className="input pd-doc-card__edit-input"
                          rows={5}
                          value={docEditDraft}
                          onChange={(e) => setDocEditDraft(e.target.value)}
                          disabled={docEditBusy}
                          aria-label="Editar texto da documentação"
                        />
                        <div className="pd-doc-card__edit-actions">
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            disabled={docEditBusy || !docEditDraft.trim()}
                            onClick={() => setAiDocTarget('edit')}
                          >
                            <Sparkles size={14} strokeWidth={2} />
                            Formatar IA
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            disabled={docEditBusy}
                            onClick={() => {
                              setDocEditingId(null)
                              setDocEditDraft('')
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            disabled={docEditBusy || !docEditDraft.trim()}
                            onClick={() => void onSaveDocumentationEdit()}
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pd-doc-card__body">
                        <DocCommentBody comment={c} />
                      </div>
                    )}
                  </article>
                )
              })
            )}
          </div>
        </div>
      ) : null}

      {tab === 'labels' ? (
        <div className="pd-tab-panel">
          <p className="pd-labels-hint muted">
            {isCustomPlan ? (
              <>
                A lista segue as <strong>fases e tarefas deste projeto</strong> (plano avulso). O status reflete as
                tarefas reais; clique em um item não concluído para confirmar a conclusão.
              </>
            ) : (
              <>
                A lista segue as <strong>fases e tarefas do plano</strong> vinculado ao projeto (incluindo a fase 00,
                quando existir no modelo). O status reflete as tarefas reais; clique em um item não concluído para
                confirmar a conclusão.
              </>
            )}
          </p>
          {planBlueprint === undefined ? (
            <p className="muted">Carregando estrutura do plano…</p>
          ) : planBlueprint === null ? (
            <p className="muted">
              Modelo de plano não encontrado para a chave &quot;{proj.planType}&quot;. As labels dependem do
              catálogo em Modelos de planos.
            </p>
          ) : labelsTabSections.length === 0 ? (
            <p className="muted">
              {isCustomPlan
                ? 'Adicione fases e tarefas na aba Fases & tarefas para preencher as labels aqui.'
                : 'Este plano ainda não possui fases/tarefas cadastradas no modelo.'}
            </p>
          ) : (
            <div className="pd-label-groups">
              {labelsTabSections.map((section) => (
                <section
                  key={section.planPhase.id}
                  className="pd-label-group"
                  style={{
                    ['--group-accent' as string]: section.planPhase.colorHex || planPhaseAccentHex(section.orderIndex),
                  }}
                >
                  <h3 className="pd-label-group__title">
                    {phaseNameShort(section.planPhase.name)}
                    {!section.projectPhase ? (
                      <span className="pd-label-group__warn muted"> · fase não encontrada no projeto</span>
                    ) : null}
                  </h3>
                  <div className="pd-label-pills">
                    {section.rows.map((row) => {
                      const done = row.displayStatus === 'completed'
                      const pill = planLabelTabPillStyle(row.code, done, section.planPhase.colorHex)
                      return (
                        <button
                          key={section.planPhase.id + '-' + row.planTask.id}
                          type="button"
                          data-phase-tone=""
                          className={
                            'pd-label-pill' + (done ? ' pd-label-pill--done' : ' pd-label-pill--open')
                          }
                          style={{
                            background: pill.background,
                            color: pill.color,
                            borderColor: pill.border,
                          }}
                          onClick={() => onLabelPillClickByCode(row.code, row.displayStatus)}
                          disabled={!canEditProjects || done}
                          title={
                            done
                              ? 'Concluída'
                              : 'Clique para marcar as tarefas deste código como concluídas'
                          }
                        >
                          <span
                            className="pd-label-pill__dot"
                            aria-hidden
                            style={{ background: pill.dot, boxShadow: `0 0 0 1px ${pill.border}` }}
                          />
                          <span className="pd-label-pill__text">
                            {row.code} {row.title}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === 'portal' && canViewPortalIntel ? (
        <div className="pd-tab-panel pd-portal">
          <p className="muted pd-portal__lead">
            Respostas do formulário de boas-vindas e arquivos trocados pelo portal (Supabase). Útil para implantação e
            encaminhamento ao time técnico.
          </p>
          {portalLoad ? <p className="muted">Carregando dados do portal…</p> : null}
          {portalErr ? <p className="auth__error">{portalErr}</p> : null}

          <section className="pd-portal__block">
            <h3 className="pd-portal__block-title">Formulários (boas-vindas)</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Status</th>
                    <th>Cliente (cadastro)</th>
                    <th>Enviado por</th>
                    <th>Template</th>
                    <th>Respostas</th>
                  </tr>
                </thead>
                <tbody>
                  {portalSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted">
                        Nenhuma submissão registrada para este projeto.
                      </td>
                    </tr>
                  ) : (
                    portalSubmissions.map((row) => {
                      const answers = row.answers && typeof row.answers === 'object' ? (row.answers as Record<string, unknown>) : {}
                      const keys = Object.keys(answers).filter((k) => {
                        const v = answers[k]
                        if (v == null) return false
                        if (Array.isArray(v)) return v.length > 0
                        return String(v).trim().length > 0
                      })
                      const tplName =
                        row.welcome_form_templates && typeof row.welcome_form_templates === 'object'
                          ? String((row.welcome_form_templates as { name?: string }).name ?? '—')
                          : '—'
                      const clientName =
                        row.clients && typeof row.clients === 'object'
                          ? String((row.clients as { name?: string }).name ?? '—')
                          : '—'
                      const byId = String(row.submitted_by ?? '')
                      const byName = userNameById.get(byId) ?? (byId ? `${byId.slice(0, 8)}…` : '—')
                      return (
                        <tr key={String(row.id)}>
                          <td>{row.created_at ? formatDatePt(String(row.created_at), 'dd/MM/yyyy HH:mm') : '—'}</td>
                          <td>
                            <span className={'pill' + (row.status === 'submitted' ? ' pill--ok' : '')}>
                              {String(row.status ?? '')}
                            </span>
                          </td>
                          <td>{clientName}</td>
                          <td>{byName}</td>
                          <td>{tplName}</td>
                          <td>
                            <details className="pd-portal__details">
                              <summary className="pd-portal__summary">
                                {keys.length} campo(s) · ver detalhe
                              </summary>
                              <dl className="pd-portal__answers">
                                {keys.map((k) => {
                                  const raw = answers[k]
                                  const text = Array.isArray(raw) ? (raw as string[]).join(', ') : String(raw ?? '')
                                  return (
                                    <div key={k} className="pd-portal__answer-row">
                                      <dt>{azoupFieldLabel.get(k) ?? k}</dt>
                                      <dd>{text}</dd>
                                    </div>
                                  )
                                })}
                              </dl>
                            </details>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="pd-portal__block">
            <h3 className="pd-portal__block-title">Arquivos (modelos e envios)</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Arquivo</th>
                    <th>Tipo</th>
                    <th>Tamanho</th>
                    <th>Quando</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {portalFiles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="muted">
                        Nenhum arquivo no portal para este projeto.
                      </td>
                    </tr>
                  ) : (
                    portalFiles.map((f) => (
                      <tr key={f.id}>
                        <td>{f.originalName}</td>
                        <td>{f.kind === 'template' ? 'Modelo (equipe)' : 'Envio do cliente'}</td>
                        <td>{Math.round((f.sizeBytes / 1024) * 10) / 10} KB</td>
                        <td>{f.createdAt ? formatDatePt(f.createdAt, 'dd/MM/yyyy HH:mm') : '—'}</td>
                        <td>
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void onPortalFileDownload(f.id)}>
                            Baixar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      <AiFormatModal
        open={aiDocTarget !== null}
        title="Formatar documentacao com IA"
        text={aiDocInput}
        intent="project_doc"
        onClose={() => setAiDocTarget(null)}
        onApply={onApplyAiDoc}
      />

      {cancelProjectOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => (!cancelProjectBusy ? setCancelProjectOpen(false) : undefined)}>
          <div className="modal" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Cancelar projeto</h2>
            <p className="muted">
              O projeto será marcado como <strong>Cancelado</strong> e o cartão irá para a coluna Cancelados na visão
              geral.
            </p>
            <label className="field">
              <span>Data de cancelamento</span>
              <input
                type="date"
                value={cancelProjectDateYmd}
                onChange={(e) => setCancelProjectDateYmd(e.target.value)}
                disabled={cancelProjectBusy}
              />
              <span className="field__hint muted">Padrão: hoje. Ajuste se o encerramento foi em outro dia.</span>
            </label>
            <label className="field">
              <span>Motivo (obrigatório, mín. 8 caracteres)</span>
              <textarea
                rows={3}
                value={cancelProjectReason}
                onChange={(e) => setCancelProjectReason(e.target.value)}
                placeholder="Ex.: Cliente encerrou contrato; não haverá implantação."
                disabled={cancelProjectBusy}
              />
            </label>
            <div className="modal__actions">
              <button
                type="button"
                className="btn btn--ghost"
                disabled={cancelProjectBusy}
                onClick={() => setCancelProjectOpen(false)}
              >
                Voltar
              </button>
              <button
                type="button"
                className="btn btn--danger"
                disabled={
                  cancelProjectBusy ||
                  cancelProjectReason.trim().length < 8 ||
                  !cancelProjectDateYmd.trim()
                }
                onClick={() => void confirmCancelProjectFromDetail()}
              >
                {cancelProjectBusy ? 'Gravando…' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ProjectCreateModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        user={me}
        plans={plans}
        analysts={analysts}
        initialKanbanColumn={proj.kanbanColumn}
        projectToEdit={proj}
      />

      <RegisterHoursModal open={!!hoursTask} task={hoursTask} user={me} onClose={() => setHoursTask(null)} />
      <ManualCompleteTaskModal
        open={!!manualCompleteTask}
        task={manualCompleteTask}
        busy={manualCompleteBusy}
        onCancel={() => (manualCompleteBusy ? undefined : setManualCompleteTask(null))}
        onConfirm={confirmManualCompleteTask}
      />
      <ConfirmProjectDeleteModal
        open={deleteProjectOpen}
        projectName={proj.projectName}
        busy={deleteProjectBusy}
        onCancel={() => setDeleteProjectOpen(false)}
        onConfirm={confirmDeleteProject}
      />

      <CustomPlanPhaseModal
        open={customPhaseModal !== null}
        heading={customPhaseModal?.mode === 'edit' ? 'Editar fase' : 'Nova fase'}
        initialName={customPhaseModal?.mode === 'edit' ? customPhaseModal.phase.name : ''}
        initialColorHex={customPhaseModal?.mode === 'edit' ? customPhaseModal.phase.colorHex ?? '' : ''}
        onClose={() => setCustomPhaseModal(null)}
        onSave={onSaveCustomPhaseModal}
      />

      <PlanTaskModal
        open={customTaskModalOpen}
        onClose={() => {
          setCustomTaskModalOpen(false)
          setCustomTaskEditing(null)
          setCustomTaskPhaseId(null)
          setPlanTaskModalVariant('standard')
        }}
        task={customTaskEditing ? mapTaskToPlanModal(customTaskEditing) : null}
        defaultCode={customTaskDefaultCode}
        onSave={onSaveCustomTaskModal}
        variant={planTaskModalVariant === 'catalogAdHoc' ? 'catalogAdHoc' : 'standard'}
        auditOnEdit
      />
      <AgendaEventModal
        ref={agendaEventModalRef}
        projects={projects}
        tasks={allTasksForAgendaModal}
        analysts={analystsAll}
        canEditAgenda={canEditAgenda}
      />
    </div>
  )
}
