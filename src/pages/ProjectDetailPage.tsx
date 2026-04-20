import {
  FormEvent,
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
  ChevronLeft,
  CircleCheck,
  Clock,
  Hourglass,
  Link2,
  Lock,
  MessageSquare,
  Paperclip,
  Pencil,
  Phone,
  Play,
  PlayCircle,
  Plus,
  RotateCcw,
  Send,
  Tag,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import { DocCommentBody } from '../components/DocCommentBody'
import { AnalystAvatar } from '../components/AnalystAvatar'
import { CustomPlanPhaseModal } from '../components/CustomPlanPhaseModal'
import { PlanTaskModal, type PlanTaskFormValues } from '../components/PlanTaskModal'
import { ProjectCreateModal } from '../components/ProjectCreateModal'
import { RegisterHoursModal } from '../components/RegisterHoursModal'
import { ConfirmProjectDeleteModal } from '../components/ConfirmProjectDeleteModal'
import { db } from '../db/database'
import { useAuth } from '../auth/AuthContext'
import { hasScope } from '../auth/permissions'
import { formatDatePt } from '../lib/dates'
import { phaseNameShort } from '../lib/phaseDisplay'
import { projectProgressPercent } from '../lib/projectProgress'
import { getPhaseSegments } from '../lib/projectPhaseUi'
import { effectiveTaskIsInformational } from '../lib/effectiveTaskInformational'
import { buildCustomPlanBlueprintBlocks, buildLabelsTabSections, type PlanBlueprintBlock } from '../lib/labelsTabFromPlan'
import { planLabelTabPillStyle, planLabelColorsFromCode, planPhaseAccentHex } from '../lib/planLabelDisplay'
import { normalizeDocLinkUrl } from '../lib/docUrls'
import { compareTaskCode } from '../lib/taskCode'
import { getPrimaryScheduledEventForTask } from '../lib/taskSchedule'
import { CUSTOM_PLAN_LABEL, CUSTOM_PLAN_TYPE } from '../constants/customPlan'
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
import { setTaskStatus } from '../services/tasks'
import { useUiFeedback } from '../ui/UiFeedbackContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { updateProjectPartialInSupabase, withDexieSupabaseSyncMuted } from '../sync/supabaseDexieBridge'
import { formatDurationHmFromHours } from '../lib/durationFormat'
import { formatDurationHMS, useRunningTimerSession } from '../hooks/useRunningTimerSession'
import { useRegisterUnsavedChanges } from '../navigation/UnsavedChangesContext'
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

type DetailTab = 'fases' | 'contatos' | 'docs' | 'labels'

const ic = { size: 16, strokeWidth: 2, absoluteStrokeWidth: true } as const
const icSm = { size: 14, strokeWidth: 2, absoluteStrokeWidth: true } as const

const MAX_DOC_FILE_BYTES = 10 * 1024 * 1024
const MAX_DOC_FILES = 12

function phaseStats(phaseId: string, projectId: string, tasks: DbTask[]) {
  const ts = tasks.filter((t) => t.projectId === projectId && t.phaseId === phaseId)
  const done = ts.filter((t) => t.status === 'concluida').length
  const total = ts.length
  const pct = total ? Math.round((done / total) * 100) : 0
  return { done, total, pct, list: [...ts].sort((a, b) => compareTaskCode(a.code, b.code) || a.sortOrder - b.sortOrder) }
}

function taskStatusIcon(status: TaskStatus) {
  if (status === 'concluida') return <CheckCircle2 className="pd-task__status-ic pd-task__status-ic--done" {...icSm} />
  if (status === 'cancelado') return <XCircle className="pd-task__status-ic" {...icSm} />
  if (status === 'em_andamento')
    return <PlayCircle className="pd-task__status-ic pd-task__status-ic--progress" {...icSm} />
  return <Hourglass className="pd-task__status-ic" {...icSm} />
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

  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? []
  const project = projectId ? projects.find((p) => p.id === projectId) : undefined

  const tasks = useLiveQuery(
    () => (projectId ? db.tasks.where('projectId').equals(projectId).toArray() : Promise.resolve([] as DbTask[])),
    [projectId],
  ) ?? []

  const projectEvents = useLiveQuery(
    () =>
      projectId
        ? db.events.where('projectId').equals(projectId).toArray()
        : Promise.resolve([] as DbEvent[]),
    [projectId],
  ) ?? []

  const phases = useLiveQuery(
    () => (projectId ? db.phases.where('projectId').equals(projectId).toArray() : Promise.resolve([] as DbPhase[])),
    [projectId],
  ) ?? []

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
  }, [projectId]) ?? []
  const taskCommentsOnly = useMemo(() => allComments.filter((c) => c.taskId != null), [allComments])
  const docComments = useMemo(
    () =>
      [...allComments.filter((c) => c.projectId === projectId && c.taskId == null)].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    [allComments, projectId],
  )

  const users = useLiveQuery(() => db.users.toArray(), []) ?? []

  const contacts = useLiveQuery(
    () =>
      projectId
        ? db.projectContacts.where('projectId').equals(projectId).toArray()
        : Promise.resolve([] as DbProjectContact[]),
    [projectId],
  ) ?? []

  const plans = useLiveQuery(() => db.planModels.filter((p) => p.active).toArray(), []) ?? []

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
  const analystsAll = useLiveQuery(() => db.analysts.toArray(), []) ?? []
  const analysts = useMemo(() => analystsAll.filter((a) => a.active), [analystsAll])

  const [tab, setTab] = useState<DetailTab>('fases')
  const [editOpen, setEditOpen] = useState(false)
  const [hoursTask, setHoursTask] = useState<DbTask | null>(null)
  const [expandedDesc, setExpandedDesc] = useState<Record<string, boolean>>({})
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactRole, setContactRole] = useState('')
  const [docDraft, setDocDraft] = useState('')
  const [docBusy, setDocBusy] = useState(false)
  const docFileInputRef = useRef<HTMLInputElement>(null)
  const [docPendingFiles, setDocPendingFiles] = useState<{ localId: string; file: File }[]>([])
  const [docPendingLinks, setDocPendingLinks] = useState<{ id: string; url: string; label: string }[]>([])
  const [docLinkUrlDraft, setDocLinkUrlDraft] = useState('')
  const [docLinkLabelDraft, setDocLinkLabelDraft] = useState('')
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false)
  const [deleteProjectBusy, setDeleteProjectBusy] = useState(false)
  const [docEditingId, setDocEditingId] = useState<string | null>(null)
  const [docEditDraft, setDocEditDraft] = useState('')
  const [docEditBusy, setDocEditBusy] = useState(false)

  const [customPhaseModal, setCustomPhaseModal] = useState<
    null | { mode: 'add' } | { mode: 'edit'; phase: DbPhase }
  >(null)
  const [customTaskModalOpen, setCustomTaskModalOpen] = useState(false)
  const [customTaskPhaseId, setCustomTaskPhaseId] = useState<string | null>(null)
  const [customTaskEditing, setCustomTaskEditing] = useState<DbTask | null>(null)
  const [customTaskDefaultCode, setCustomTaskDefaultCode] = useState('1.1')

  const scheduledEventByTaskId = useMemo(() => {
    const m = new Map<string, DbEvent>()
    for (const t of tasks) {
      const ev = getPrimaryScheduledEventForTask(projectEvents, t.id)
      if (ev) m.set(t.id, ev)
    }
    return m
  }, [projectEvents, tasks])

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

  const { segments, currentPhaseName } = useMemo(
    () => (projectId ? getPhaseSegments(phases, tasks, projectId) : { segments: [] as const, currentPhaseName: null }),
    [phases, tasks, projectId],
  )

  const pct = projectId ? projectProgressPercent(tasks, projectId) : 0
  const doneTasks = tasks.filter((t) => t.status === 'concluida').length
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

  const labelsTabSections = useMemo(() => {
    if (!planBlueprint || !projectId) return []
    return buildLabelsTabSections(planBlueprint.blocks, sortedPhases, tasks, projectId)
  }, [planBlueprint, sortedPhases, tasks, projectId])

  const userNameById = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users])
  const { toast, toastError, toastWarn, requestConfirm, requestDestructiveWithReason } = useUiFeedback()

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
  const projectAnalyst = proj.analystId ? analystsAll.find((a) => a.id === proj.analystId) ?? null : null
  const planName =
    proj.planType === CUSTOM_PLAN_TYPE
      ? CUSTOM_PLAN_LABEL
      : plans.find((pl) => pl.key === proj.planType)?.name ?? proj.planType
  const isCustomPlan = proj.planType === CUSTOM_PLAN_TYPE
  const customBillableSumEst = isCustomPlan
    ? billableEstimatedSum(tasks.filter((t) => t.projectId === proj.id))
    : 0

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

  async function onSaveCustomTaskModal(values: PlanTaskFormValues) {
    await ensureCustomContractForProjectedSum(customTaskEditing?.id ?? null, values)
    if (customTaskEditing) {
      await updateProjectTask(customTaskEditing.id, values)
      toast('Tarefa atualizada.')
    } else if (customTaskPhaseId) {
      await addProjectTask(proj.id, customTaskPhaseId, values, proj.analystId ?? null)
      toast('Tarefa criada.')
    }
  }

  async function onCancelProject() {
    if (!canEditProjects) return
    const ok = await requestConfirm({
      title: 'Cancelar projeto',
      message: 'Marcar este projeto como cancelado?',
      confirmLabel: 'Marcar como cancelado',
      cancelLabel: 'Voltar',
      danger: true,
    })
    if (!ok) return
    const cancelPatch = { status: 'cancelado' as const, kanbanColumn: 'cancelados' as KanbanColumn }
    if (isSupabaseConfigured()) {
      await withDexieSupabaseSyncMuted(async () => {
        await updateProjectPartialInSupabase(proj.id, cancelPatch)
        await db.projects.update(proj.id, cancelPatch)
      })
    } else {
      await db.projects.update(proj.id, cancelPatch)
    }
    navigate('/projetos', { replace: true })
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
            <span className="pd-plan-badge">{planName}</span>
            <span
              className="pd-analyst-badge"
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
            onClick={onCancelProject}
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
            {doneTasks} / {tasks.length}
          </span>
        </div>
        <div className="pd-kpi pd-kpi--phase">
          <span className="pd-kpi__label">Fase ativa</span>
          <span className="pd-kpi__phase">{activePhaseShort}</span>
        </div>
      </section>

      {segments.length > 0 ? (
        <div className="pd-timeline" aria-hidden={false}>
          <div
            className="pd-timeline__bar"
            style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }}
          >
            {segments.map((s, i) => (
              <div
                key={i}
                className={'pd-timeline__seg pd-timeline__seg--' + s}
                title={sortedPhases[i]?.name}
                style={{
                  ['--seg-base' as string]:
                    sortedPhases[i]?.colorHex || planPhaseAccentHex(sortedPhases[i]?.orderIndex ?? 0),
                }}
              />
            ))}
          </div>
          <div
            className="pd-timeline__labels"
            style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }}
          >
            {sortedPhases.map((ph) => (
              <span
                key={ph.id}
                className="pd-timeline__label"
                style={{ ['--seg-base' as string]: ph.colorHex || planPhaseAccentHex(ph.orderIndex) }}
              >
                {phaseNameShort(ph.name)}
              </span>
            ))}
          </div>
        </div>
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
      </div>

      {tab === 'fases' ? (
        <div className="pd-board-wrap">
          <div className="pd-board">
            {sortedPhases.map((phase) => {
              const { done, total, pct: pPct, list } = phaseStats(phase.id, proj.id, tasks)
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
                    <div className={'pd-phase__icon' + (ativa ? ' pd-phase__icon--play' : '')}>
                      {locked ? <Lock {...ic} /> : concl ? <CheckCircle2 {...ic} /> : <Play {...ic} />}
                    </div>
                    <div className="pd-phase__head-text">
                      <h2 className="pd-phase__title">{phase.name}</h2>
                      <p className="pd-phase__meta muted">
                        {done}/{total} · {pPct}%
                        {locked ? (
                          <>
                            {' '}
                            <span className="pd-phase__lock-badge">Bloqueada</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                    {isCustomPlan && canEditProjects ? (
                      <div className="pd-phase__custom-actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => {
                            void (async () => {
                              const code = await suggestNextProjectTaskCode(proj.id, phase.id)
                              setCustomTaskDefaultCode(code)
                              setCustomTaskPhaseId(phase.id)
                              setCustomTaskEditing(null)
                              setCustomTaskModalOpen(true)
                            })()
                          }}
                        >
                          <Plus {...icSm} aria-hidden />
                          Tarefa
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => setCustomPhaseModal({ mode: 'edit', phase })}
                        >
                          <Pencil {...icSm} aria-hidden />
                          Fase
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => void moveProjectPhase(proj.id, phase.id, 'up')}
                          title="Mover fase para cima"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => void moveProjectPhase(proj.id, phase.id, 'down')}
                          title="Mover fase para baixo"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm pd-phase__btn-danger"
                          onClick={() => {
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
                        </button>
                      </div>
                    ) : null}
                  </header>
                  <div className="pd-phase__tasks">
                    {list.map((t) => {
                      const scheduledEv = scheduledEventByTaskId.get(t.id)
                      const taskComments = commentsByTask.get(t.id) ?? []
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
                          ? Math.min(100, (t.actualHours / t.estimatedHours) * 100)
                          : null
                      const liveTimerHere = !informational && runningTimerSession?.taskId === t.id
                      const codeColors = planLabelColorsFromCode(t.code, phase.colorHex)
                      return (
                        <article
                          key={t.id}
                          className={
                            'pd-task' +
                            (doneTask ? ' pd-task--done' : '') +
                            (informational ? ' pd-task--info' : '') +
                            (liveTimerHere ? ' pd-task--timer-live' : '')
                          }
                          style={{
                            ['--task-code-color' as string]: codeColors.phase,
                            ['--task-phase-accent' as string]: phase.colorHex || planPhaseAccentHex(phase.orderIndex),
                          }}
                        >
                          <div className="pd-task__top">
                            <div className="pd-task__title-row">
                              <div className="pd-task__code-row">
                                <span className="pd-task__code">{t.code}</span>
                                {informational ? (
                                  <span className="pd-task__info-badge">Informativa</span>
                                ) : null}
                                {scheduledEv ? (
                                  <span className="pd-task__schedule-badge" title="Compromisso na agenda">
                                    Agendada
                                  </span>
                                ) : null}
                              </div>
                              <span className="pd-task__title">{t.title}</span>
                            </div>
                            <div className="pd-task__top-right">
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
                              {taskStatusIcon(liveTimerHere ? 'em_andamento' : t.status)}
                            </div>
                          </div>
                          {doneTask ? (
                            <button
                              type="button"
                              className="pd-task__reopen"
                              onClick={() => onTaskStatus(t.id, 'pendente')}
                            >
                              <RotateCcw {...icSm} aria-hidden />
                              Reabrir tarefa
                            </button>
                          ) : (
                            <>
                              {!informational ? (
                                <div className="pd-task__time-budget">
                                  <div className="pd-task__time-budget-top">
                                    <span className="pd-task__time-budget-label">
                                      <Clock {...icSm} aria-hidden />
                                      Tempo
                                    </span>
                                    <span className="pd-task__time-budget-values">
                                      <strong>{formatDurationHmFromHours(t.actualHours)}</strong>
                                      {t.estimatedHours > 0 ? (
                                        <> de {formatDurationHmFromHours(t.estimatedHours)}</>
                                      ) : (
                                        <span className="muted"> · sem estimativa</span>
                                      )}
                                    </span>
                                  </div>
                                  {hoursPct != null ? (
                                    <div className="pd-task__time-budget-track" aria-hidden>
                                      <div
                                        className="pd-task__time-budget-fill"
                                        style={{ width: `${hoursPct}%` }}
                                      />
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                              {liveTimerHere ? (
                                <div className="pd-task__live-timer" role="status" aria-live="polite">
                                  <span className="pd-task__live-timer-dot" aria-hidden />
                                  <Play className="pd-task__live-timer-play" {...icSm} aria-hidden />
                                  <span className="pd-task__live-timer-label">Cronômetro</span>
                                  <strong className="pd-task__live-timer-hms">{formatDurationHMS(runningLiveSeconds)}</strong>
                                </div>
                              ) : null}
                              {taskComments.length > 0 ? (
                                <ul className="pd-task__items">
                                  {taskComments.map((c) => (
                                    <li key={c.id}>{c.content}</li>
                                  ))}
                                </ul>
                              ) : null}
                              <button
                                type="button"
                                className="pd-task__linkish"
                                onClick={() => setExpandedDesc((d) => ({ ...d, [t.id]: !d[t.id] }))}
                              >
                                <MessageSquare {...icSm} aria-hidden />
                                {showDesc ? 'Ocultar detalhes' : 'Detalhes'}
                              </button>
                              {showDesc ? (
                                <p className="pd-task__desc">{t.description?.trim() || 'Sem descrição.'}</p>
                              ) : null}
                              {canAct || (isCustomPlan && canEditProjects) ? (
                                <div
                                  className={
                                    'pd-task__actions' +
                                    (informational ? ' pd-task__actions--no-register' : '')
                                  }
                                >
                                  {isCustomPlan && canEditProjects ? (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn--ghost btn--sm pd-task__btn"
                                        onClick={() => {
                                          setCustomTaskEditing(t)
                                          setCustomTaskPhaseId(phase.id)
                                          setCustomTaskDefaultCode(t.code)
                                          setCustomTaskModalOpen(true)
                                        }}
                                      >
                                        <Pencil {...icSm} aria-hidden />
                                        Editar
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn--ghost btn--sm pd-task__btn"
                                        onClick={() => {
                                          void (async () => {
                                            const ok = await requestConfirm({
                                              title: 'Excluir tarefa',
                                              message: `Excluir "${t.code} ${t.title}"?`,
                                              confirmLabel: 'Excluir',
                                              cancelLabel: 'Cancelar',
                                              danger: true,
                                            })
                                            if (!ok) return
                                            try {
                                              await deleteProjectTask(t.id)
                                              toast('Tarefa excluída.')
                                            } catch (e) {
                                              toastError(e instanceof Error ? e.message : 'Falha ao excluir.')
                                            }
                                          })()
                                        }}
                                      >
                                        <Trash2 {...icSm} aria-hidden />
                                        Excluir
                                      </button>
                                    </>
                                  ) : null}
                                  {canAct && !informational ? (
                                    <button
                                      type="button"
                                      className="btn btn--ghost btn--sm pd-task__btn"
                                      onClick={() => setHoursTask(t)}
                                    >
                                      <Clock {...icSm} aria-hidden />
                                      Registrar
                                    </button>
                                  ) : null}
                                  {canAct ? (
                                    scheduledEv ? (
                                      <button
                                        type="button"
                                        className="btn btn--ghost btn--sm pd-task__btn pd-task__btn--scheduled"
                                        onClick={() =>
                                          navigate('/agenda', {
                                            state: { editEventId: scheduledEv.id },
                                          })
                                        }
                                        title="Abrir na agenda para editar o horário"
                                      >
                                        <CalendarCheck {...icSm} aria-hidden />
                                        Agendado
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="btn btn--ghost btn--sm pd-task__btn"
                                        onClick={() =>
                                          navigate('/agenda', {
                                            state: { prefillTaskId: t.id, prefillProjectId: proj.id },
                                          })
                                        }
                                      >
                                        <CalendarPlus {...icSm} aria-hidden />
                                        Agendar
                                      </button>
                                    )
                                  ) : null}
                                  {canAct ? (
                                    <button
                                      type="button"
                                      className={
                                        'btn btn--primary btn--sm pd-task__btn' +
                                        (informational ? '' : ' pd-task__btn--full')
                                      }
                                      onClick={() => onTaskStatus(t.id, 'concluida')}
                                    >
                                      <CheckCircle2 {...icSm} aria-hidden />
                                      Concluir
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </>
                          )}
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
                      void deleteProjectContact(c.id)
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
        }}
        task={customTaskEditing ? mapTaskToPlanModal(customTaskEditing) : null}
        defaultCode={customTaskDefaultCode}
        onSave={onSaveCustomTaskModal}
      />
    </div>
  )
}
