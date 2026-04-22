import { Component, FormEvent, type ReactNode, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { format } from 'date-fns'
import { Check, Clock, History, ImagePlus, Paperclip, Pause, Play, X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import type { DbDocAttachment, DbTask, DbTimeLog, DbTimeSession, DbUser, TaskStatus, TimeLogType } from '../db/types'
import { addProjectDocumentation } from '../services/taskComments'
import { deleteTimeSession, getRunningSessionForUser, updateSessionDurationSeconds } from '../services/timeSessions'
import {
  registerTaskAttendance,
  type AttendanceEntryMode,
  type AttendanceKind,
} from '../services/attendanceRegistration'
import { useUiFeedback } from '../ui/UiFeedbackContext'
import {
  formatClockHmsFromHours,
  formatClockHmsFromSeconds,
  formatDurationHmsFromHours,
  formatDurationHmsFromSeconds,
  formatDurationHmFromHours,
  parseDurationFlexibleToHours,
} from '../lib/durationFormat'
import { AnalystAvatar } from './AnalystAvatar'
import { pushRuntimeDiagnostic } from '../diagnostics/runtimeDiagnostics'

type Props = {
  open: boolean
  task: DbTask | null
  user: DbUser
  onClose: () => void
}

const iconSm = { size: 18, strokeWidth: 2, absoluteStrokeWidth: true } as const
type EditableTaskStatus = Extract<TaskStatus, 'pendente' | 'em_andamento' | 'concluida'>
type RegTab = 'manual' | 'timer' | 'historico'

function normalizeTaskStatus(status: TaskStatus): EditableTaskStatus {
  if (status === 'em_andamento' || status === 'concluida') return status
  return 'pendente'
}

const MANUAL_DURATION_ZERO = formatClockHmsFromSeconds(0)

function normalizeManualDurationDisplay(raw: string): string {
  const d = parseDurationFlexibleToHours(raw)
  if (!Number.isFinite(d) || d < 0) return raw.trim()
  return formatClockHmsFromHours(d)
}

function safeFormatDate(isoLike: string, pattern: string, fallback: string): string {
  try {
    const dt = new Date(isoLike)
    if (!Number.isFinite(dt.getTime())) return fallback
    return format(dt, pattern)
  } catch {
    return fallback
  }
}

function logTypeLabel(t: TimeLogType): string {
  if (t === 'executado') return 'Executado'
  if (t === 'cancelado_sem_horas') return 'Cancelado (sem horas)'
  return 'Cancelado (com horas)'
}

class RegisterHoursModalErrorBoundary extends Component<{ children: ReactNode; onClose: () => void }, { hasError: boolean }> {
  state = { hasError: false }
  componentDidCatch(err: unknown) {
    console.error('[RegisterHoursModal] Error:', err)
    pushRuntimeDiagnostic({
      source: 'register-hours-modal',
      level: 'error',
      message: 'Erro de render no modal de atendimento.',
      details: err instanceof Error ? err.message : String(err),
    })
    this.setState({ hasError: true })
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="modal-backdrop" role="presentation" onClick={this.props.onClose}>
          <div
            className="modal modal--md"
            role="dialog"
            aria-modal
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <h2 className="modal__title">Erro ao abrir lançamento</h2>
            <p className="muted" style={{ margin: '0.4rem 0 0.85rem' }}>
              Ocorreu um problema ao carregar o registro de horas. Feche e tente novamente.
            </p>
            <div className="modal__actions">
              <button type="button" className="btn btn--primary" onClick={this.props.onClose}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function RegisterHoursModalInner({ open, task, user, onClose }: Props) {
  function errorToMessage(err: unknown, fallback: string): string {
    if (err instanceof Error) return err.message || fallback
    return String(err || fallback)
  }

  async function withTimeout<T>(promise: Promise<T>, label: string, ms = 35_000): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Tempo limite ao ${label}. Tente novamente.`)), ms)
      })
      return await Promise.race([promise, timeoutPromise])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  const { toast, toastError, requestDestructiveWithReason } = useUiFeedback()
  const [attendanceKind, setAttendanceKind] = useState<AttendanceKind>('ocorreu')
  const [activeTab, setActiveTab] = useState<RegTab>('manual')
  const [hours, setHours] = useState('')
  const [executionDate, setExecutionDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [executionTime, setExecutionTime] = useState(() => format(new Date(), 'HH:mm'))
  const [taskStatus, setTaskStatus] = useState<EditableTaskStatus>('pendente')
  const [notes, setNotes] = useState('')
  const [analystId, setAnalystId] = useState<string>('')
  const [newDate, setNewDate] = useState('')
  const [docPendingFiles, setDocPendingFiles] = useState<{ localId: string; file: File }[]>([])
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingHours, setEditingHours] = useState('')
  const [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(0)
  const docFileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const running = useLiveQuery(async () => getRunningSessionForUser(user.id), [user.id])
  const runningHere = running?.taskId === task?.id ? running : null
  const runningElsewhere = running && running.taskId !== task?.id ? running : null

  const projectAnalystId =
    useLiveQuery(
      () =>
        task?.projectId
          ? db.projects.get(task.projectId).then((p) => p?.analystId ?? '')
          : Promise.resolve(''),
      [task?.projectId],
    ) ?? ''
  const analysts = (useLiveQuery(() => db.analysts.toArray(), []) ?? []).filter((a) => a.active)
  const taskSessions =
    useLiveQuery(
      async () => (task?.id ? db.timeSessions.where('taskId').equals(task.id).reverse().sortBy('createdAt') : []),
      [task?.id, busy],
    ) ?? []
  const taskLogs =
    useLiveQuery(async () => (task?.id ? db.timeLogs.where('taskId').equals(task.id).toArray() : []), [task?.id, busy]) ??
    []
  const userNames = useLiveQuery(async () => {
    const users = await db.users.toArray()
    const m: Record<string, string> = {}
    for (const u of users) m[u.id] = u.name
    return m
  }, [])

  const selectedAnalyst = useMemo(() => {
    const id = analystId || projectAnalystId
    return analysts.find((a) => a.id === id) ?? null
  }, [analysts, analystId, projectAnalystId])

  const mergedHistory = useMemo(() => {
    type Row =
      | { kind: 'session'; id: string; sortAt: number; session: DbTimeSession }
      | { kind: 'log'; id: string; sortAt: number; log: DbTimeLog }
    const rows: Row[] = []
    for (const s of taskSessions) {
      const t = new Date(s.startedAt).getTime()
      rows.push({ kind: 'session', id: s.id, sortAt: Number.isFinite(t) ? t : 0, session: s })
    }
    for (const l of taskLogs) {
      const t = new Date(l.executionDate).getTime()
      rows.push({ kind: 'log', id: `log-${l.id}`, sortAt: Number.isFinite(t) ? t : 0, log: l })
    }
    return rows.sort((a, b) => b.sortAt - a.sortAt)
  }, [taskSessions, taskLogs])

  const liveSeconds = useMemo(() => {
    void tick
    if (!runningHere) return 0
    return Math.max(0, Math.floor((Date.now() - new Date(runningHere.startedAt).getTime()) / 1000))
  }, [runningHere, tick])

  const entryMode: AttendanceEntryMode = useMemo(() => {
    if (task && attendanceKind === 'ocorreu' && (activeTab === 'timer' || runningHere?.taskId === task.id)) {
      return 'timer'
    }
    return 'manual'
  }, [task, attendanceKind, activeTab, runningHere])

  useEffect(() => {
    if (!open || !task) return
    setAttendanceKind('ocorreu')
    setActiveTab('manual')
    setHours(task.estimatedHours > 0 ? formatClockHmsFromHours(task.estimatedHours) : '')
    setExecutionDate(format(new Date(), 'yyyy-MM-dd'))
    setExecutionTime(format(new Date(), 'HH:mm'))
    setTaskStatus(normalizeTaskStatus(task.status))
    setNotes('')
    setAnalystId(task.assignedTo ?? projectAnalystId ?? '')
    setNewDate('')
    setDocPendingFiles([])
    setEditingSessionId(null)
    setEditingHours('')
  }, [open, task?.id, projectAnalystId])

  useEffect(() => {
    if (!open || !task || attendanceKind !== 'ocorreu') return
    if (runningHere) setHours(MANUAL_DURATION_ZERO)
  }, [open, task?.id, attendanceKind, runningHere?.id])

  useEffect(() => {
    if (!task) return
    if (attendanceKind === 'nao_compareceu_sem_aviso') {
      setHours((prev) =>
        !prev.trim()
          ? formatClockHmsFromHours(task.estimatedHours > 0 ? task.estimatedHours : 1)
          : prev,
      )
    } else if (attendanceKind === 'nao_compareceu_avisou') {
      setHours(MANUAL_DURATION_ZERO)
    }
  }, [attendanceKind, task?.id])

  useEffect(() => {
    if (attendanceKind !== 'ocorreu') {
      setActiveTab((t) => (t === 'timer' ? 'manual' : t))
    }
  }, [attendanceKind])

  useEffect(() => {
    if (!runningHere) return
    const id = window.setInterval(() => setTick((x) => x + 1), 1000)
    return () => window.clearInterval(id)
  }, [runningHere?.id])

  useEffect(() => {
    if (!open || !task) return
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault()
        if (!busy) onClose()
      } else if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
        ev.preventDefault()
        const fakeEvt = { preventDefault() {} } as FormEvent
        void onSubmit(fakeEvt)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, busy, task?.id, runningHere?.id, hours, notes, executionDate, activeTab])

  if (!open || !task) return null
  if (task.isInformational) return null

  function goTab(next: RegTab) {
    if (!task) return
    if (next === 'timer') {
      if (attendanceKind !== 'ocorreu') return
      setActiveTab('timer')
      setHours(MANUAL_DURATION_ZERO)
      return
    }
    if (next === 'manual') {
      setActiveTab('manual')
      if (attendanceKind === 'ocorreu' && !runningHere) {
        const estimated = task.estimatedHours
        setHours((prev) => {
          const d = parseDurationFlexibleToHours(prev)
          if (!prev.trim() || !Number.isFinite(d) || d <= 0) {
            return estimated > 0 ? formatClockHmsFromHours(estimated) : ''
          }
          return prev
        })
      }
      return
    }
    setActiveTab(next)
  }

  const summaryDate = safeFormatDate(executionDate, 'dd/MM/yyyy', executionDate || 'sem data')

  const scenarioBadge =
    attendanceKind === 'ocorreu'
      ? { cls: 'register-hours-modal__chip register-hours-modal__chip--ok', text: 'Ocorreu' }
      : attendanceKind === 'nao_compareceu_avisou'
        ? { cls: 'register-hours-modal__chip register-hours-modal__chip--info', text: 'Não ocorreu · avisou' }
        : { cls: 'register-hours-modal__chip register-hours-modal__chip--danger', text: 'Não ocorreu · sem aviso' }

  async function onSaveSessionEdit() {
    if (!editingSessionId) return
    const parsed = parseDurationFlexibleToHours(editingHours)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast('Informe uma duração válida maior que zero (ex.: 1h30m0s ou 01:30:00).', 'warn')
      return
    }
    try {
      await updateSessionDurationSeconds(editingSessionId, user.id, Math.round(parsed * 3600))
      toast('Registro atualizado com sucesso.')
      setEditingSessionId(null)
      setEditingHours('')
    } catch (err) {
      const msg = errorToMessage(err, 'Não foi possível atualizar o registro.')
      pushRuntimeDiagnostic({
        source: 'register-hours-modal',
        level: 'warn',
        message: 'Falha ao editar sessão de tempo.',
        details: msg,
      })
      toastError(msg)
    }
  }

  async function onDeleteSession(sessionId: string) {
    const reason = await requestDestructiveWithReason({
      title: 'Excluir registro de tempo',
      message: 'Deseja excluir este registro de tempo? Essa ação não pode ser desfeita.',
      reasonLabel: 'Justificativa da exclusão',
      reasonPlaceholder: 'Descreva o motivo (obrigatório para auditoria).',
      reasonMinLength: 8,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
    })
    if (!reason) return
    try {
      await deleteTimeSession(sessionId, user.id, reason)
      toast('Registro excluído.')
    } catch (err) {
      const msg = errorToMessage(err, 'Não foi possível excluir o registro.')
      pushRuntimeDiagnostic({
        source: 'register-hours-modal',
        level: 'warn',
        message: 'Falha ao excluir sessão de tempo.',
        details: msg,
      })
      toastError(msg)
    }
  }

  function addQuickMinutes(mins: number) {
    const current = parseDurationFlexibleToHours(hours)
    const base = Number.isFinite(current) && current >= 0 ? current : 0
    const next = Math.max(0, base + mins / 60)
    setHours(formatClockHmsFromHours(next))
  }

  function enqueueDocFiles(incoming: File[]) {
    if (incoming.length === 0) return
    setDocPendingFiles((prev) => {
      const next = [...prev]
      for (const file of incoming) {
        next.push({ localId: crypto.randomUUID(), file })
      }
      return next.slice(0, 8)
    })
  }

  function onDocFileInputChange(ev: ChangeEvent<HTMLInputElement>) {
    const list = ev.target.files
    if (list?.length) enqueueDocFiles([...list])
    ev.target.value = ''
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!task) return
    const hFromField = parseDurationFlexibleToHours(hours)
    const isTimerFlow = attendanceKind === 'ocorreu' && entryMode === 'timer'
    if (attendanceKind !== 'ocorreu' && entryMode === 'timer') {
      toast('Quando a reunião não ocorreu, use lançamento manual.', 'warn')
      return
    }
    if (attendanceKind === 'nao_compareceu_sem_aviso' && (!Number.isFinite(hFromField) || hFromField <= 0)) {
      toast('Sem aviso prévio deve consumir horas (padrão previsto, mas editável).', 'warn')
      return
    }
    if (attendanceKind === 'nao_compareceu_sem_aviso' && notes.trim().length < 8) {
      toast('Sem aviso exige observação com pelo menos 8 caracteres.', 'warn')
      return
    }
    if (attendanceKind === 'ocorreu' && !isTimerFlow) {
      if (!Number.isFinite(hFromField) || hFromField <= 0) {
        toast(
          'No lançamento manual, informe uma duração maior que zero em hh:mm:ss (sugerimos o estimado) ou use a aba Timer.',
          'warn',
        )
        return
      }
    }
    if (attendanceKind !== 'ocorreu' && !newDate) {
      toast('Informe a data para reagendar a tarefa.', 'warn')
      return
    }
    setBusy(true)
    try {
      await withTimeout(
        registerTaskAttendance({
          taskId: task.id,
          actorUserId: user.id,
          attendanceKind,
          entryMode,
          manualHours: isTimerFlow ? 0 : hFromField,
          notes,
          executionDate,
          executionTime,
          analystId: analystId || null,
          taskStatus: attendanceKind === 'ocorreu' ? taskStatus : undefined,
          newDate: newDate || null,
        }),
        'registrar atendimento',
      )
      const docAttachments: DbDocAttachment[] = docPendingFiles.map((p) => ({
        id: crypto.randomUUID(),
        fileName: p.file.name || 'arquivo',
        mimeType: p.file.type || 'application/octet-stream',
        blob: p.file,
      }))
      if (notes.trim() || docAttachments.length > 0) {
        await withTimeout(
          addProjectDocumentation({
            projectId: task.projectId,
            authorId: user.id,
            content: notes.trim(),
            docAttachments,
          }),
          'salvar documentação do atendimento',
        )
      }
      onClose()
    } catch (err) {
      const msg = errorToMessage(err, 'Não foi possível registrar')
      pushRuntimeDiagnostic({
        source: 'register-hours-modal',
        level: 'error',
        message: 'Falha no registro de atendimento.',
        details: msg,
      })
      toastError(msg)
    } finally {
      setBusy(false)
    }
  }

  const timerTabDisabled = attendanceKind !== 'ocorreu'
  const primaryLabel =
    busy
      ? 'Salvando…'
      : attendanceKind === 'ocorreu' && (activeTab === 'timer' || runningHere)
        ? runningHere
          ? 'Parar e registrar'
          : 'Iniciar cronômetro'
        : 'Registrar'

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="modal modal--md register-hours-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reg-hours-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__head register-hours-modal__head">
          <div className="register-hours-modal__title-row">
            <span className="register-hours-modal__icon" aria-hidden>
              <Clock {...iconSm} />
            </span>
            <h2 id="reg-hours-title" className="modal__title">
              Registrar atendimento
            </h2>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fechar">
            <X size={20} strokeWidth={2} />
          </button>
        </header>

        <form ref={formRef} onSubmit={onSubmit} className="register-hours-modal__form">
          <div className="register-hours-modal__scroll">
            <div className="register-hours-modal__task-box">
              <div className="register-hours-modal__task-code">
                {task.code} {task.title}
              </div>
              <p className="register-hours-modal__task-meta muted">
                Estimado: {formatDurationHmFromHours(task.estimatedHours)} · Realizado:{' '}
                {formatDurationHmFromHours(task.actualHours)}
              </p>
            </div>

            <fieldset className="register-hours-modal__status-fieldset">
              <legend className="register-hours-modal__legend">Resultado do atendimento</legend>
              <div className="register-hours-modal__outcome-grid">
                <button
                  type="button"
                  className={
                    'register-hours-modal__outcome' +
                    (attendanceKind === 'ocorreu' ? ' is-selected' : '') +
                    ' register-hours-modal__outcome--ok'
                  }
                  onClick={() => setAttendanceKind('ocorreu')}
                >
                  <Check className="register-hours-modal__outcome-ic" size={22} aria-hidden />
                  <span className="register-hours-modal__outcome-title">Ocorreu</span>
                  <span className="register-hours-modal__outcome-sub muted">Reunião realizada · lançar tempo</span>
                </button>
                <button
                  type="button"
                  className={
                    'register-hours-modal__outcome' +
                    (attendanceKind === 'nao_compareceu_avisou' ? ' is-selected' : '') +
                    ' register-hours-modal__outcome--info'
                  }
                  onClick={() => setAttendanceKind('nao_compareceu_avisou')}
                >
                  <X className="register-hours-modal__outcome-ic" size={22} aria-hidden />
                  <span className="register-hours-modal__outcome-title">Avisou antes</span>
                  <span className="register-hours-modal__outcome-sub muted">Sem consumo de horas</span>
                </button>
                <button
                  type="button"
                  className={
                    'register-hours-modal__outcome' +
                    (attendanceKind === 'nao_compareceu_sem_aviso' ? ' is-selected' : '') +
                    ' register-hours-modal__outcome--danger'
                  }
                  onClick={() => setAttendanceKind('nao_compareceu_sem_aviso')}
                >
                  <X className="register-hours-modal__outcome-ic" size={22} aria-hidden />
                  <span className="register-hours-modal__outcome-title">Sem aviso</span>
                  <span className="register-hours-modal__outcome-sub muted">Consome horas · justificativa</span>
                </button>
              </div>
            </fieldset>

            <div className="register-hours-modal__toolbar">
              <div className="register-hours-modal__toolbar-analyst">
                {selectedAnalyst ? (
                  <span
                    className="register-hours-modal__toolbar-avatar"
                    aria-hidden
                    style={{ ['--analyst-color' as string]: selectedAnalyst.color }}
                  >
                    <AnalystAvatar
                      name={selectedAnalyst.name}
                      color={selectedAnalyst.color}
                      avatarUrl={selectedAnalyst.avatarUrl}
                      size="sm"
                    />
                  </span>
                ) : (
                  <span className="register-hours-modal__toolbar-avatar register-hours-modal__toolbar-avatar--empty muted" aria-hidden>
                    —
                  </span>
                )}
                <label className="register-hours-modal__toolbar-field">
                  <span className="sr-only">Analista</span>
                  <select className="input input--compact" value={analystId} onChange={(e) => setAnalystId(e.target.value)}>
                    <option value="">Padrão do projeto</option>
                    {analysts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {attendanceKind === 'ocorreu' ? (
                <label className="register-hours-modal__toolbar-field register-hours-modal__toolbar-status">
                  <span className="register-hours-modal__toolbar-label">Status após registro</span>
                  <select
                    className="input input--compact"
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as EditableTaskStatus)}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluida">Concluído</option>
                  </select>
                </label>
              ) : (
                <div className="register-hours-modal__toolbar-placeholder muted">
                  Reagendamento obrigatório abaixo
                </div>
              )}
            </div>

            <div className="register-hours-modal__grid2">
              <label className="register-hours-modal__field">
                <span className="register-hours-modal__label">Data de execução</span>
                <input className="input" type="date" value={executionDate} onChange={(e) => setExecutionDate(e.target.value)} />
              </label>
              <label className="register-hours-modal__field">
                <span className="register-hours-modal__label">Hora de execução</span>
                <input className="input" type="time" value={executionTime} onChange={(e) => setExecutionTime(e.target.value)} />
              </label>
            </div>

            {attendanceKind !== 'ocorreu' ? (
              <label className="register-hours-modal__field">
                <span className="register-hours-modal__label">Reagendar para</span>
                <input className="input" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </label>
            ) : null}

            <div className="register-hours-modal__tabs" role="tablist" aria-label="Forma de lançamento">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'manual'}
                className={'register-hours-modal__tab' + (activeTab === 'manual' ? ' is-active' : '')}
                onClick={() => goTab('manual')}
              >
                Manual
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'timer'}
                className={'register-hours-modal__tab' + (activeTab === 'timer' ? ' is-active' : '')}
                disabled={timerTabDisabled}
                title={timerTabDisabled ? 'Disponível apenas quando a reunião ocorreu.' : undefined}
                onClick={() => !timerTabDisabled && goTab('timer')}
              >
                Timer
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'historico'}
                className={'register-hours-modal__tab' + (activeTab === 'historico' ? ' is-active' : '')}
                onClick={() => goTab('historico')}
              >
                <History size={15} strokeWidth={2} aria-hidden className="register-hours-modal__tab-ic" />
                Histórico
              </button>
            </div>

            <div className="register-hours-modal__tab-panel" role="tabpanel">
              {activeTab === 'manual' ? (
                <div className="register-hours-modal__panel">
                  {(attendanceKind === 'nao_compareceu_sem_aviso' || attendanceKind === 'ocorreu') ? (
                    <label className="register-hours-modal__field">
                      <span className="register-hours-modal__label">Duração (hh:mm:ss)</span>
                      <input
                        className="input register-hours-modal__duration-input"
                        type="text"
                        inputMode="text"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={
                          task.estimatedHours > 0
                            ? `Estimado ${formatClockHmsFromHours(task.estimatedHours)}`
                            : MANUAL_DURATION_ZERO
                        }
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        onBlur={() => setHours((h) => (h.trim() ? normalizeManualDurationDisplay(h) : h))}
                      />
                      <div className="register-hours-modal__quick register-hours-modal__quick--dense">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => addQuickMinutes(1)}>
                          +1m
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => addQuickMinutes(5)}>
                          +5m
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => addQuickMinutes(15)}>
                          +15m
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => addQuickMinutes(30)}>
                          +30m
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => addQuickMinutes(60)}>
                          +1h
                        </button>
                      </div>
                      <span className="register-hours-modal__hint muted">
                        {attendanceKind === 'nao_compareceu_sem_aviso'
                          ? 'Sem aviso: horas obrigatórias (padrão = previsto).'
                          : runningHere
                            ? 'Cronômetro ativo nesta tarefa: ao registrar, vale o tempo medido; o campo fica em 00:00:00 só para referência.'
                            : 'Informe o tempo real trabalhado ou use a aba Timer para medir sem depender deste valor.'}
                      </span>
                    </label>
                  ) : (
                    <p className="register-hours-modal__hint muted">
                      Cliente avisou antes: registro sem horas. Use observações se quiser documentar.
                    </p>
                  )}
                </div>
              ) : null}

              {activeTab === 'timer' ? (
                <div className="register-hours-modal__panel">
                  <div className="register-hours-modal__timer-hero">
                    <div className="register-hours-modal__timer-ring" aria-live="polite">
                      <span className="register-hours-modal__timer-digits">{formatClockHmsFromSeconds(runningHere ? liveSeconds : 0)}</span>
                      <span className="register-hours-modal__timer-state muted">
                        {runningHere ? 'Contando nesta tarefa' : 'Pronto para iniciar'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={
                        'register-hours-modal__timer-play' +
                        (runningHere ? ' register-hours-modal__timer-play--stop' : '')
                      }
                      disabled={busy || !!runningElsewhere}
                      title={runningElsewhere ? 'Há cronômetro em outra tarefa.' : undefined}
                      aria-label={runningHere ? 'Parar e registrar' : 'Iniciar cronômetro'}
                      onClick={() => formRef.current?.requestSubmit()}
                    >
                      {runningHere ? <Pause size={28} strokeWidth={2} fill="currentColor" /> : <Play size={28} strokeWidth={2} fill="currentColor" />}
                    </button>
                  </div>
                  {runningElsewhere ? (
                    <p className="register-hours-modal__hint muted">Outra tarefa com cronômetro ativo — pare-o antes de iniciar aqui.</p>
                  ) : null}
                </div>
              ) : null}

              {activeTab === 'historico' ? (
                <div className="register-hours-modal__panel register-hours-modal__panel--history">
                  {mergedHistory.length === 0 ? (
                    <p className="register-hours-modal__hint muted">Nenhum lançamento ou cancelamento registrado nesta tarefa.</p>
                  ) : (
                    <ul className="register-hours-modal__hist-list">
                      {mergedHistory.map((row) => {
                        if (row.kind === 'log') {
                          const l = row.log
                          const when = safeFormatDate(l.executionDate, "dd/MM/yyyy HH:mm", '—')
                          const who = userNames?.[l.userId] ?? 'Usuário'
                          return (
                            <li key={row.id} className="register-hours-modal__hist-row register-hours-modal__hist-row--log">
                              <div className="register-hours-modal__hist-main">
                                <span className="register-hours-modal__hist-date">{when}</span>
                                <span className={'register-hours-modal__hist-pill register-hours-modal__hist-pill--log'}>
                                  {logTypeLabel(l.logType)}
                                </span>
                              </div>
                              <div className="register-hours-modal__hist-meta muted">
                                {formatDurationHmsFromHours(l.hours)} · {who}
                              </div>
                            </li>
                          )
                        }
                        const s = row.session
                        const editable = s.userId === user.id && s.endedAt != null
                        const durationLabel = formatDurationHmsFromSeconds(s.durationSeconds ?? 0)
                        const when = safeFormatDate(s.startedAt, "dd/MM/yyyy 'às' HH:mm", 'sem data')
                        const isEditing = editingSessionId === s.id
                        const src = s.source === 'timer' ? 'Timer' : 'Manual'
                        return (
                          <li key={row.id} className="register-hours-modal__hist-row">
                            <div className="register-hours-modal__hist-main">
                              <span className="register-hours-modal__hist-date">{when}</span>
                              <span className="register-hours-modal__hist-pill">{src}</span>
                            </div>
                            <div className="register-hours-modal__hist-actions">
                              {isEditing ? (
                                <>
                                  <input
                                    className="input register-hours-modal__history-hours"
                                    type="text"
                                    inputMode="text"
                                    autoComplete="off"
                                    spellCheck={false}
                                    title="Ex.: 0h15m0s ou 00:15:00"
                                    value={editingHours}
                                    onChange={(e) => setEditingHours(e.target.value)}
                                  />
                                  <button type="button" className="btn btn--ghost btn--sm" onClick={onSaveSessionEdit}>
                                    Salvar
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn--ghost btn--sm"
                                    onClick={() => {
                                      setEditingSessionId(null)
                                      setEditingHours('')
                                    }}
                                  >
                                    Cancelar
                                  </button>
                                </>
                              ) : (
                                <>
                                  <strong className="register-hours-modal__hist-hours">{durationLabel}</strong>
                                  {editable ? (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn--ghost btn--sm"
                                        onClick={() => {
                                          setEditingSessionId(s.id)
                                          setEditingHours(durationLabel)
                                        }}
                                      >
                                        Editar
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn--danger btn--sm"
                                        onClick={() => void onDeleteSession(s.id)}
                                      >
                                        Excluir
                                      </button>
                                    </>
                                  ) : (
                                    <span className="muted register-hours-modal__hist-readonly">Somente leitura</span>
                                  )}
                                </>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>

            {activeTab !== 'historico' ? (
              <div className="register-hours-modal__notes-block">
                <div className="register-hours-modal__notes-head">
                  <label className="register-hours-modal__label" htmlFor="reg-hours-notes">
                    Observações
                  </label>
                  <div className="register-hours-modal__notes-tools">
                    <input
                      ref={docFileInputRef}
                      type="file"
                      className="sr-only"
                      multiple
                      aria-hidden
                      tabIndex={-1}
                      onChange={onDocFileInputChange}
                    />
                    <button
                      type="button"
                      className="register-hours-modal__icon-btn"
                      onClick={() => docFileInputRef.current?.click()}
                      aria-label="Anexar arquivos"
                      title="Anexar arquivos"
                    >
                      <Paperclip size={18} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      className="register-hours-modal__icon-btn"
                      onClick={() => docFileInputRef.current?.click()}
                      aria-label="Anexar imagens"
                      title="Colar ou anexar imagens"
                    >
                      <ImagePlus size={18} strokeWidth={2} />
                    </button>
                  </div>
                </div>
                <textarea
                  id="reg-hours-notes"
                  className="input register-hours-modal__textarea"
                  rows={3}
                  placeholder="Opcional — também vira documentação do projeto se houver texto ou anexos."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onPaste={(ev) => {
                    const files = ev.clipboardData?.files
                    if (files && files.length > 0) {
                      ev.preventDefault()
                      enqueueDocFiles([...files])
                    }
                  }}
                />
                <span className="register-hours-modal__hint muted">
                  Documentação: o conteúdo pode ser publicado na aba Documentações ao registrar.
                </span>
                {docPendingFiles.length > 0 ? (
                  <ul className="register-hours-modal__attach-list">
                    {docPendingFiles.map((f) => (
                      <li key={f.localId} className="register-hours-modal__attach-row">
                        <span className="register-hours-modal__attach-name">{f.file.name}</span>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => setDocPendingFiles((p) => p.filter((x) => x.localId !== f.localId))}
                        >
                          remover
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="register-hours-modal__footer-sticky">
            <div className="register-hours-modal__footer-summary">
              <span className={scenarioBadge.cls}>{scenarioBadge.text}</span>
              <span className="register-hours-modal__footer-summary-text muted" title={`${summaryDate} · ${executionTime}`}>
                {summaryDate} · {executionTime}
                {attendanceKind === 'ocorreu'
                  ? ` · ${taskStatus === 'em_andamento' ? 'em andamento' : taskStatus === 'concluida' ? 'concluído' : 'pendente'}`
                  : ''}
                {attendanceKind !== 'ocorreu' || (!runningHere && activeTab !== 'timer')
                  ? ` · ${
                      attendanceKind === 'nao_compareceu_avisou'
                        ? '0h'
                        : hours.trim()
                          ? hours
                          : MANUAL_DURATION_ZERO
                    }`
                  : ''}
              </span>
            </div>
            <div className="register-hours-modal__footer-actions">
              <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primary" disabled={busy}>
                {primaryLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export function RegisterHoursModal(props: Props) {
  if (!props.open) return null
  return (
    <RegisterHoursModalErrorBoundary onClose={props.onClose}>
      <RegisterHoursModalInner {...props} />
    </RegisterHoursModalErrorBoundary>
  )
}
