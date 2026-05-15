import {
  FormEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import { toZonedTime } from 'date-fns-tz'
import { db } from '../../db/database'
import type { DbAnalyst, DbProject, DbTask } from '../../db/types'
import { createEventValidated, deleteEventValidated, updateEventValidated } from '../../services/events'
import { brDateTimeToIso, normalizeBrDateInput, normalizeTimeInput } from '../../lib/dateTimeInput'
import { isProjectEligibleForScheduling } from '../../lib/projectStatus'
import { isSupabaseConfigured } from '../../lib/supabaseClient'
import { isGoogleCalendarSyncEnabled } from '../../services/calendarPushQueue'
import { parseEmpresaAssuntoFromTitle } from '../../lib/calendarEventTitle'
import { useRegisterUnsavedChanges } from '../../navigation/UnsavedChangesContext'
import { useUnsavedCloseGuard } from '../../navigation/useUnsavedCloseGuard'
import { useUiFeedback } from '../../ui/UiFeedbackContext'
import { agendaModalSnapshotArg } from '../../lib/agendaEventModalSnapshot'
import { compareTaskCode } from '../../lib/taskCode'
import { CAL_TZ } from '../../lib/calendarGrid'

function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function toTimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export type AgendaEventModalHandle = {
  openCreateBlank: (anchor?: Date) => void
  /** Abre o modal para criar compromisso vinculado à tarefa (carrega Dexie). */
  openPrefillTask: (taskId: string, projectId?: string | null) => Promise<void>
  /** Abre para edição; retorna data de início em CAL_TZ para a página ajustar a semana visível. */
  openEditEvent: (eventId: string) => Promise<Date | null>
}

type Props = {
  projects: DbProject[]
  tasks: DbTask[]
  analysts: DbAnalyst[]
  canEditAgenda: boolean
}

export const AgendaEventModal = forwardRef<AgendaEventModalHandle, Props>(function AgendaEventModal(
  { projects, tasks, analysts, canEditAgenda },
  ref,
) {
  const { toast, toastError, toastWarn, requestConfirm, toastMutationSuccess, toastMutationError } =
    useUiFeedback()

  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [analystId, setAnalystId] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [modalProjectId, setModalProjectId] = useState<string | null>(null)
  const [modalTaskId, setModalTaskId] = useState<string | null>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [agendaModalBaseline, setAgendaModalBaseline] = useState<string | null>(null)
  const [agendaEventSaving, setAgendaEventSaving] = useState(false)

  const projectsForPickers = useMemo(() => {
    const eligible = projects.filter((p) => isProjectEligibleForScheduling(p.status))
    if (modalProjectId && !eligible.some((p) => p.id === modalProjectId)) {
      const current = projects.find((p) => p.id === modalProjectId)
      if (current) eligible.push(current)
    }
    return eligible.sort((a, b) => a.projectName.localeCompare(b.projectName, 'pt'))
  }, [projects, modalProjectId])

  const openTasksForModalSelect = useMemo(() => {
    if (!modalProjectId) return []
    return tasks
      .filter((t) => t.projectId === modalProjectId && t.status !== 'concluida' && t.status !== 'cancelado')
      .sort((a, b) => compareTaskCode(a.code, b.code) || a.sortOrder - b.sortOrder)
  }, [tasks, modalProjectId])

  function resetAgendaEventModal() {
    setAgendaEventSaving(false)
    setAgendaModalBaseline(null)
    setModalOpen(false)
    setModalProjectId(null)
    setModalTaskId(null)
    setEditingEventId(null)
    setTitle('')
    setDescription('')
    setStartDate('')
    setStartTime('')
    setEndDate('')
    setEndTime('')
    setAnalystId('')
    setMeetingLink('')
  }

  function closeEventModalImmediate() {
    if (agendaEventSaving) return
    resetAgendaEventModal()
  }

  const deleteEventFromModal = useCallback(async () => {
    if (!canEditAgenda || !editingEventId || agendaEventSaving) return
    const ok = await requestConfirm({
      title: 'Excluir compromisso',
      message:
        'Excluir este compromisso? A ação remove da agenda e do Google Agenda, se estiver sincronizado.',
      danger: true,
      confirmLabel: 'Excluir',
    })
    if (!ok) return
    setAgendaEventSaving(true)
    try {
      const result = await deleteEventValidated(editingEventId)
      resetAgendaEventModal()
      toastMutationSuccess({ action: 'delete', target: 'Compromisso', gender: 'm' })
      if (result.cloudSync === 'queued') {
        toastWarn('Excluído localmente; a nuvem pode estar pendente.')
      } else if (result.cloudSync === 'local_only') {
        toastWarn('Excluído neste aparelho; a nuvem não está configurada ou não respondeu.')
      }
    } catch (err) {
      toastMutationError(
        { action: 'delete', target: 'o compromisso' },
        err instanceof Error ? err.message : undefined,
      )
    } finally {
      setAgendaEventSaving(false)
    }
  }, [
    canEditAgenda,
    editingEventId,
    agendaEventSaving,
    requestConfirm,
    toastMutationSuccess,
    toastMutationError,
    toastWarn,
  ])

  const saveEventFromModal = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!canEditAgenda || agendaEventSaving) return
      if (!startDate || !startTime || !endDate || !endTime) {
        toastWarn('Preencha data e hora de início e fim.')
        return
      }
      const startIso = brDateTimeToIso(startDate, startTime)
      const endIso = brDateTimeToIso(endDate, endTime)
      if (!startIso || !endIso) {
        toastWarn('Use o formato BR: data dd/MM/aaaa e hora HH:mm.')
        return
      }
      setAgendaEventSaving(true)
      const isUpdate = Boolean(editingEventId)
      let cloudSync: 'local_only' | 'queued' | 'synced' = 'local_only'
      try {
        if (editingEventId) {
          const current = await db.events.get(editingEventId)
          if (!current) {
            toastMutationError({ action: 'update', target: 'o compromisso' }, 'Evento não encontrado.')
            return
          }
          const result = await updateEventValidated(editingEventId, {
            title: title.trim() || 'Evento',
            description: description.trim(),
            startTime: startIso,
            endTime: endIso,
            status: current.status,
            projectId: modalProjectId,
            taskId: modalTaskId,
            analystId: analystId || null,
            meetingLink: meetingLink.trim() || null,
          })
          cloudSync = result.cloudSync
        } else {
          const result = await createEventValidated({
            title: title.trim() || 'Evento',
            description: description.trim(),
            startTime: startIso,
            endTime: endIso,
            status: 'agendado',
            projectId: modalProjectId,
            taskId: modalTaskId,
            analystId: analystId || null,
            meetingLink: meetingLink.trim() || null,
          })
          cloudSync = result.cloudSync
        }
      } catch (err) {
        toastMutationError(
          { action: isUpdate ? 'update' : 'create', target: 'o compromisso' },
          err instanceof Error ? err.message : undefined,
        )
        return
      } finally {
        setAgendaEventSaving(false)
      }
      resetAgendaEventModal()
      toastMutationSuccess({
        action: isUpdate ? 'update' : 'create',
        target: 'Compromisso',
        gender: 'm',
      })
      if (cloudSync === 'queued') {
        toastWarn('Salvo localmente; a nuvem pode estar pendente (fila de sincronização).')
      } else if (cloudSync === 'local_only') {
        toastWarn('Salvo neste aparelho; a nuvem não está configurada ou não respondeu.')
      } else if (isGoogleCalendarSyncEnabled()) {
        toast('Sincronizado com o Google Agenda.')
      }
    },
    [
      canEditAgenda,
      agendaEventSaving,
      startDate,
      startTime,
      endDate,
      endTime,
      editingEventId,
      title,
      description,
      modalProjectId,
      modalTaskId,
      analystId,
      meetingLink,
      toast,
      toastMutationSuccess,
      toastMutationError,
      toastWarn,
    ],
  )

  useLayoutEffect(() => {
    if (!modalOpen) {
      setAgendaModalBaseline(null)
      return
    }
    setAgendaModalBaseline((prev) => {
      if (prev !== null) return prev
      return agendaModalSnapshotArg({
        editingEventId,
        title,
        description,
        startDate,
        startTime,
        endDate,
        endTime,
        analystId,
        meetingLink,
        modalProjectId,
        modalTaskId,
      })
    })
  }, [
    modalOpen,
    editingEventId,
    title,
    description,
    startDate,
    startTime,
    endDate,
    endTime,
    analystId,
    meetingLink,
    modalProjectId,
    modalTaskId,
  ])

  const agendaModalDirty = useMemo(() => {
    if (!modalOpen || agendaModalBaseline === null) return false
    return (
      agendaModalSnapshotArg({
        editingEventId,
        title,
        description,
        startDate,
        startTime,
        endDate,
        endTime,
        analystId,
        meetingLink,
        modalProjectId,
        modalTaskId,
      }) !== agendaModalBaseline
    )
  }, [
    modalOpen,
    agendaModalBaseline,
    editingEventId,
    title,
    description,
    startDate,
    startTime,
    endDate,
    endTime,
    analystId,
    meetingLink,
    modalProjectId,
    modalTaskId,
  ])

  useRegisterUnsavedChanges({
    enabled: modalOpen,
    isDirty: () => agendaModalDirty,
    onSave: async () => {
      await saveEventFromModal({ preventDefault() {} } as FormEvent)
    },
    message: 'Há alterações não gravadas neste evento da agenda.',
  })

  const attemptCloseEventModal = useUnsavedCloseGuard({
    isDirty: () => agendaModalDirty,
    onSave: async () => {
      await saveEventFromModal({ preventDefault() {} } as FormEvent)
    },
    onDiscard: closeEventModalImmediate,
    message: 'Ha alteracoes nao gravadas neste evento da agenda. Deseja gravar antes de sair?',
  })

  useEffect(() => {
    if (!modalOpen) return
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape' || agendaEventSaving) return
      ev.preventDefault()
      void attemptCloseEventModal()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalOpen, agendaEventSaving, attemptCloseEventModal])

  const openCreateBlank = useCallback((anchor?: Date) => {
    if (!canEditAgenda) return
    const start = anchor ?? new Date()
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    setEditingEventId(null)
    setTitle('')
    setDescription('')
    setAnalystId('')
    setMeetingLink('')
    setStartDate(toDateInput(start))
    setStartTime(toTimeInput(start))
    setEndDate(toDateInput(end))
    setEndTime(toTimeInput(end))
    setModalProjectId(null)
    setModalTaskId(null)
    setModalOpen(true)
  }, [canEditAgenda])

  const openPrefillTask = useCallback(
    async (taskId: string, projectId?: string | null) => {
      if (!canEditAgenda) return
      const task = await db.tasks.get(taskId)
      const project = await db.projects.get(projectId ?? task?.projectId ?? '')
      if (!task) {
        toastError('Tarefa não encontrada.')
        return
      }
      const now = new Date()
      const end = new Date(now.getTime() + 60 * 60 * 1000)
      setEditingEventId(null)
      setTitle(task.title.trim())
      const aid = task.assignedTo ?? project?.analystId ?? ''
      setAnalystId(aid)
      setStartDate(toDateInput(now))
      setStartTime(toTimeInput(now))
      setEndDate(toDateInput(end))
      setEndTime(toTimeInput(end))
      setModalProjectId(project?.id ?? task.projectId ?? null)
      setModalTaskId(task.id)
      setDescription('')
      setMeetingLink('')
      setModalOpen(true)
    },
    [canEditAgenda, toastError],
  )

  const openEditEvent = useCallback(
    async (eventId: string): Promise<Date | null> => {
      const ev = await db.events.get(eventId)
      if (!ev) {
        toastError('Evento não encontrado na agenda.')
        return null
      }
      if (!canEditAgenda) {
        toastWarn('Sem permissão para editar a agenda.')
        return null
      }
      const linkedTask = ev.taskId ? await db.tasks.get(ev.taskId) : undefined
      let editTitle = ev.title
      if (linkedTask?.title?.trim()) {
        editTitle = linkedTask.title.trim()
      } else {
        const parsed = parseEmpresaAssuntoFromTitle(ev.title)
        if (parsed) editTitle = parsed.assunto
      }
      const startDt = new Date(ev.startTime)
      const endDt = new Date(ev.endTime)
      const zStart = toZonedTime(startDt, CAL_TZ)
      setEditingEventId(ev.id)
      setTitle(editTitle)
      setDescription(ev.description ?? '')
      setStartDate(toDateInput(startDt))
      setStartTime(toTimeInput(startDt))
      setEndDate(toDateInput(endDt))
      setEndTime(toTimeInput(endDt))
      setAnalystId(ev.analystId ?? '')
      setMeetingLink(ev.meetingLink ?? '')
      setModalProjectId(ev.projectId)
      setModalTaskId(ev.taskId)
      setModalOpen(true)
      return zStart
    },
    [canEditAgenda, toastError, toastWarn],
  )

  useImperativeHandle(ref, () => ({
    openCreateBlank,
    openPrefillTask,
    openEditEvent,
  }))

  if (!modalOpen) return null

  return (
    <div
      className="modal-backdrop modal-backdrop--agenda-event"
      role="presentation"
      onClick={agendaEventSaving ? undefined : () => void attemptCloseEventModal()}
    >
      <div
        className="modal modal--agenda-event"
        role="dialog"
        aria-modal="true"
        aria-labelledby="agenda-event-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal--agenda-event__header">
          <h2 id="agenda-event-dialog-title" className="modal__title">
            {editingEventId ? 'Editar evento' : 'Novo evento'}
          </h2>
          <p className="muted modal--agenda-event__tz">Fuso: {CAL_TZ}</p>
          {modalTaskId ? (
            <p className="agenda-modal__link-hint muted">
              Vinculado a uma tarefa: o compromisso aparece no projeto e pode seguir o analista da tarefa.
            </p>
          ) : modalProjectId ? (
            <p className="agenda-modal__link-hint muted">Vinculado ao projeto (sem tarefa específica).</p>
          ) : null}
        </div>
        <form className="agenda-event-form" onSubmit={saveEventFromModal}>
          <div className="modal--agenda-event__scroll">
            <div className="agenda-event-form__grid">
              <label className="field">
                <span>Projeto (opcional)</span>
                <select
                  value={modalProjectId ?? ''}
                  autoFocus={!editingEventId}
                  onChange={(e) => {
                    const v = e.target.value || null
                    setModalProjectId(v)
                    setModalTaskId((cur) => {
                      if (!cur || !v) return null
                      const tk = tasks.find((t) => t.id === cur)
                      return tk?.projectId === v ? cur : null
                    })
                  }}
                >
                  <option value="">— Nenhum</option>
                  {projectsForPickers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Tarefa (opcional)</span>
                <select
                  value={modalTaskId ?? ''}
                  disabled={!modalProjectId}
                  onChange={(e) => {
                    const v = e.target.value || null
                    setModalTaskId(v)
                    if (!v) return
                    const task = tasks.find((t) => t.id === v)
                    if (!task) return
                    setModalProjectId(task.projectId)
                    setTitle(task.title.trim())
                    const proj = projects.find((pr) => pr.id === task.projectId)
                    setAnalystId(task.assignedTo ?? proj?.analystId ?? '')
                  }}
                >
                  <option value="">— Nenhuma</option>
                  {openTasksForModalSelect.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} {t.title}
                    </option>
                  ))}
                </select>
              </label>
              {!modalProjectId ? (
                <p className="agenda-modal-field-hint muted agenda-event-form__span2">
                  Escolha um projeto para listar tarefas em aberto e vincular ao cronograma.
                </p>
              ) : null}
              <label className="field agenda-event-form__span2">
                <span>Título</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!!editingEventId} />
              </label>
              <label className="field agenda-event-form__span2">
                <span>Descrição (opcional)</span>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notas visíveis no Google Agenda ao exportar…"
                />
              </label>
              <label className="field">
                <span>Data início</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/MM/aaaa"
                  value={startDate}
                  onChange={(e) => setStartDate(normalizeBrDateInput(e.target.value))}
                  required
                />
              </label>
              <label className="field">
                <span>Hora início</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="HH:mm"
                  value={startTime}
                  onChange={(e) => setStartTime(normalizeTimeInput(e.target.value))}
                  required
                />
              </label>
              <label className="field">
                <span>Data fim</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/MM/aaaa"
                  value={endDate}
                  onChange={(e) => setEndDate(normalizeBrDateInput(e.target.value))}
                  required
                />
              </label>
              <label className="field">
                <span>Hora fim</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="HH:mm"
                  value={endTime}
                  onChange={(e) => setEndTime(normalizeTimeInput(e.target.value))}
                  required
                />
              </label>
              <label className="field agenda-event-form__span2">
                <span>Analista (define a cor na grade)</span>
                <select value={analystId} onChange={(e) => setAnalystId(e.target.value)}>
                  <option value="">— Sem responsável (cor neutra)</option>
                  {analysts
                    .filter((a) => a.active)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field agenda-event-form__span2">
                <span>Link da reunião (Meet, Zoom…)</span>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://…"
                />
              </label>
            </div>
          </div>
          <div className="modal__actions modal__actions--sticky">
            {isSupabaseConfigured() ? (
              <span className="muted">
                {isGoogleCalendarSyncEnabled()
                  ? 'Salvar envia para a nuvem e para a sub-agenda Google do analista.'
                  : 'Salvar envia para a nuvem.'}
              </span>
            ) : null}
            {editingEventId && canEditAgenda ? (
              <button
                type="button"
                className="btn btn--danger btn--ghost"
                disabled={agendaEventSaving}
                onClick={() => void deleteEventFromModal()}
              >
                Excluir
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => void attemptCloseEventModal()}
              disabled={agendaEventSaving}
            >
              Fechar
            </button>
            <button type="submit" className="btn btn--primary" disabled={!canEditAgenda || agendaEventSaving}>
              {agendaEventSaving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
})
