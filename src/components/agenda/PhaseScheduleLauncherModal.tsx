import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, CalendarClock, Check, Loader2, X } from 'lucide-react'
import type { DbAnalyst, DbEvent, DbPhase, DbProject, DbTask } from '../../db/types'
import { emptyEvents } from '../../lib/stableDexieEmpty'
import { normalizeBrDateInput, brDateTimeToIso } from '../../lib/dateTimeInput'
import { formatDatePt, toDateInputValue } from '../../lib/dates'
import {
  countBusinessDaysInclusive,
  DAILY_SLOTS,
  exceedsPhaseScheduleBusinessDayLimit,
  generatePhaseSchedule,
  hasSlotConflict,
  PHASE_SCHEDULE_MAX_BUSINESS_DAYS,
  slotToIso,
  type SlotProposal,
  weekdayShortPt,
} from '../../lib/scheduleGenerator'
import { compareTaskCode } from '../../lib/taskCode'
import { shouldAddGoogleMeetForTask } from '../../lib/sessionType'
import { AnalystAvatar } from '../AnalystAvatar'
import { db } from '../../db/database'
import { createEventValidated } from '../../services/events'
import { isGoogleCalendarSyncEnabled } from '../../services/calendarPushQueue'
import { updateProjectPartialInSupabase } from '../../sync/supabaseDexieBridge'
import { useUiFeedback } from '../../ui/UiFeedbackContext'

type Step = 'config' | 'preview' | 'confirming'

type PreviewRow = SlotProposal & {
  rowKey: string
  confirmStatus: 'pending' | 'creating' | 'done' | 'error'
  errorMessage?: string
}

type Props = {
  open: boolean
  onClose: () => void
  project: DbProject
  phase: DbPhase
  phaseTasks: DbTask[]
  informationalTaskIds: readonly string[]
  analysts: DbAnalyst[]
}

function todayBr(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function brToYmd(br: string): string | null {
  const iso = brDateTimeToIso(br, '12:00')
  if (!iso) return null
  return toDateInputValue(iso)
}

function ymdToBr(ymd: string): string {
  const [y, m, d] = ymd.split('-')
  if (!y || !m || !d) return ymd
  return `${d}/${m}/${y}`
}

export function PhaseScheduleLauncherModal({
  open,
  onClose,
  project,
  phase,
  phaseTasks,
  informationalTaskIds,
  analysts,
}: Props) {
  const { toast, toastError, toastWarn } = useUiFeedback()
  const allEvents = useLiveQuery(() => db.events.toArray(), []) ?? emptyEvents
  const [step, setStep] = useState<Step>('config')
  const [analystId, setAnalystId] = useState('')
  const [startDateBr, setStartDateBr] = useState(todayBr)
  const [sessionsPerWeek, setSessionsPerWeek] = useState<2 | 3>(2)
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [skippedInfo, setSkippedInfo] = useState<string[]>([])
  const [skippedScheduled, setSkippedScheduled] = useState<string[]>([])
  const [lastDate, setLastDate] = useState<string | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const activeAnalysts = useMemo(
    () => analysts.filter((a) => a.active).sort((a, b) => a.name.localeCompare(b.name, 'pt')),
    [analysts],
  )

  const selectedAnalyst = analysts.find((a) => a.id === analystId) ?? null

  const schedulableTasks = useMemo(() => {
    const infoSet = new Set(informationalTaskIds)
    return phaseTasks
      .filter((t) => !infoSet.has(t.id))
      .sort((a, b) => compareTaskCode(a.code, b.code) || a.sortOrder - b.sortOrder)
  }, [phaseTasks, informationalTaskIds])

  const phaseHasActiveEvents = useMemo(
    () =>
      allEvents.some(
        (e) =>
          e.projectId === project.id &&
          e.status === 'agendado' &&
          phaseTasks.some((t) => t.id === e.taskId),
      ),
    [allEvents, project.id, phaseTasks],
  )

  const analystsById = useMemo(() => new Map(analysts.map((a) => [a.id, a])), [analysts])

  function rowHasAgendaConflict(row: PreviewRow, extraEvents: readonly DbEvent[] = allEvents): boolean {
    return hasSlotConflict(row.startTime, row.endTime, row.analystId, extraEvents)
  }

  const scheduleBusinessSpan = useMemo(() => {
    const startYmd = brToYmd(startDateBr)
    if (!startYmd || !lastDate || rows.length === 0) return null
    const businessDays = countBusinessDaysInclusive(startYmd, lastDate)
    return {
      startYmd,
      lastDate,
      businessDays,
      exceedsLimit: exceedsPhaseScheduleBusinessDayLimit(startYmd, lastDate),
    }
  }, [startDateBr, lastDate, rows.length])

  const reset = useCallback(() => {
    setStep('config')
    setAnalystId(project.analystId ?? '')
    setStartDateBr(todayBr())
    setSessionsPerWeek(2)
    setRows([])
    setSkippedInfo([])
    setSkippedScheduled([])
    setLastDate(null)
    setConfirmBusy(false)
  }, [project.analystId])

  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const canGenerate =
    Boolean(analystId) &&
    selectedAnalyst?.active === true &&
    schedulableTasks.length > 0 &&
    Boolean(brToYmd(startDateBr))

  function handleGeneratePreview() {
    const ymd = brToYmd(startDateBr)
    if (!ymd || !analystId) return
    const tasksForGen = phaseTasks.map((t) =>
      informationalTaskIds.includes(t.id) ? { ...t, isInformational: true } : t,
    )
    const result = generatePhaseSchedule(tasksForGen, allEvents, {
      startDate: ymd,
      analystId,
      projectId: project.id,
      sessionsPerWeek,
    })
    setSkippedInfo(result.skippedInformational)
    setSkippedScheduled(result.skippedAlreadyScheduled)
    setLastDate(result.lastProposedDate)
    setRows(
      result.proposals.map((p) => ({
        ...p,
        rowKey: p.taskId,
        confirmStatus: 'pending',
      })),
    )
    setStep('preview')
  }

  function updateRowSlot(rowKey: string, slotKey: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowKey !== rowKey) return r
        const slot = DAILY_SLOTS.find((s) => s.label === slotKey) ?? DAILY_SLOTS[0]!
        const { startTime, endTime } = slotToIso(r.dateYmd, slot)
        return {
          ...r,
          slotKey: slot.label,
          startTime,
          endTime,
          slotLabel: `${weekdayShortPt(r.dateYmd)} ${slot.label} · ${ymdToBr(r.dateYmd)}`,
        }
      }),
    )
  }

  function updateRowAnalyst(rowKey: string, nextAnalystId: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowKey !== rowKey) return r
        const slot = DAILY_SLOTS.find((s) => s.label === r.slotKey) ?? DAILY_SLOTS[0]!
        let { startTime, endTime } = slotToIso(r.dateYmd, slot)
        let slotKey = slot.label
        let slotLabel = r.slotLabel
        if (hasSlotConflict(startTime, endTime, nextAnalystId, allEvents)) {
          for (const s of DAILY_SLOTS) {
            const cand = slotToIso(r.dateYmd, s)
            if (!hasSlotConflict(cand.startTime, cand.endTime, nextAnalystId, allEvents)) {
              startTime = cand.startTime
              endTime = cand.endTime
              slotKey = s.label
              slotLabel = `${weekdayShortPt(r.dateYmd)} ${s.label} · ${ymdToBr(r.dateYmd)}`
              break
            }
          }
        }
        return { ...r, analystId: nextAnalystId, startTime, endTime, slotKey, slotLabel }
      }),
    )
  }

  async function maybeBindProjectAnalyst(bindId: string) {
    if (project.analystId || !bindId) return
    await db.projects.update(project.id, { analystId: bindId })
    try {
      await updateProjectPartialInSupabase(project.id, { analystId: bindId })
    } catch {
      /* eventos locais seguem; sync pode retentar */
    }
  }

  async function handleConfirm() {
    if (rows.length === 0 || confirmBusy) return
    setConfirmBusy(true)
    setStep('confirming')
    const bindAnalystId = analystId || rows[0]?.analystId
    if (bindAnalystId) await maybeBindProjectAnalyst(bindAnalystId)

    let workingEvents: DbEvent[] = [...allEvents]
    let created = 0
    let blockedConflict = 0
    let errors = 0

    for (const row of rows) {
      if (row.confirmStatus === 'done') continue

      if (rowHasAgendaConflict(row, workingEvents)) {
        blockedConflict++
        setRows((prev) =>
          prev.map((r) =>
            r.rowKey === row.rowKey
              ? {
                  ...r,
                  confirmStatus: 'error',
                  errorMessage:
                    'Horário ocupado na agenda do analista. Troque o horário na linha ou escolha outro dia.',
                }
              : r,
          ),
        )
        continue
      }

      setRows((prev) =>
        prev.map((r) =>
          r.rowKey === row.rowKey ? { ...r, confirmStatus: 'creating', errorMessage: undefined } : r,
        ),
      )
      try {
        const linkedTask = phaseTasks.find((t) => t.id === row.taskId)
        const addGoogleMeet = shouldAddGoogleMeetForTask(
          row.taskTitle,
          linkedTask?.sessionType,
        )
        const result = await createEventValidated({
          title: row.taskTitle,
          description: '',
          startTime: row.startTime,
          endTime: row.endTime,
          status: 'agendado',
          projectId: project.id,
          taskId: row.taskId,
          analystId: row.analystId,
          meetingLink: null,
          addGoogleMeet,
          executionState: 'scheduled',
        })
        const saved = await db.events.get(result.id)
        if (saved) workingEvents = [...workingEvents, saved]
        created++
        setRows((prev) =>
          prev.map((r) => (r.rowKey === row.rowKey ? { ...r, confirmStatus: 'done' } : r)),
        )
      } catch (err) {
        errors++
        const msg = err instanceof Error ? err.message : 'Erro ao criar evento'
        setRows((prev) =>
          prev.map((r) =>
            r.rowKey === row.rowKey ? { ...r, confirmStatus: 'error', errorMessage: msg } : r,
          ),
        )
      }
    }

    setConfirmBusy(false)

    const summaryParts: string[] = []
    if (created > 0) summaryParts.push(`${created} sessão(ões) criada(s)`)
    if (blockedConflict > 0) summaryParts.push(`${blockedConflict} bloqueada(s) por conflito de horário`)
    if (errors > 0) summaryParts.push(`${errors} com erro ao gravar`)
    const summary = summaryParts.join(' · ')

    if (created > 0 && blockedConflict === 0 && errors === 0) {
      toast(summary || 'Cronograma lançado.')
      onClose()
    } else if (created > 0) {
      toastWarn(summary)
    } else {
      toastError(summary || 'Nenhuma sessão foi criada. Revise os horários e tente novamente.')
    }
  }

  if (!open) return null

  const googleHint =
    isGoogleCalendarSyncEnabled() && selectedAnalyst && !selectedAnalyst.googleCalendarId

  const modalClass =
    'modal' + (step === 'config' ? ' modal--md phase-schedule-modal' : ' modal--lg phase-schedule-modal')

  return (
    <ModalBackdrop onClose={confirmBusy ? undefined : onClose}>
      <div
        className={modalClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby="phase-schedule-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="phase-schedule-modal__header">
          <h2 id="phase-schedule-title" className="modal__title">
            <CalendarClock size={18} aria-hidden className="phase-schedule-modal__title-ic" />
            Lançar cronograma
          </h2>
          <p className="muted phase-schedule-modal__subtitle">
            {project.projectName} · {phase.name}
          </p>
        </div>

        {step === 'config' ? (
          <div className="phase-schedule-modal__body">
            {phaseHasActiveEvents ? (
              <p className="phase-schedule-banner phase-schedule-banner--warn" role="status">
                <AlertTriangle size={14} aria-hidden />
                Esta fase já tem compromissos agendados. O lançamento <strong>adiciona</strong> novas sessões; os
                existentes não são alterados.
              </p>
            ) : null}
            {schedulableTasks.length === 0 ? (
              <p className="phase-schedule-banner phase-schedule-banner--info" role="status">
                Nenhuma tarefa elegível nesta fase (todas informacionais, concluídas ou já agendadas).
              </p>
            ) : null}
            <label className="field">
              <span>Analista</span>
              <select value={analystId} onChange={(e) => setAnalystId(e.target.value)} disabled={confirmBusy}>
                <option value="">— Selecione</option>
                {activeAnalysts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              {analystId && selectedAnalyst && !selectedAnalyst.active ? (
                <span className="phase-schedule-field-error">Analista inativo.</span>
              ) : null}
            </label>
            <label className="field">
              <span>Data de início</span>
              <input
                value={startDateBr}
                onChange={(e) => setStartDateBr(normalizeBrDateInput(e.target.value))}
                placeholder="dd/mm/aaaa"
                inputMode="numeric"
                disabled={confirmBusy}
              />
            </label>
            <fieldset className="phase-schedule-sessions-field">
              <legend>Sessões por semana</legend>
              <div className="phase-schedule-sessions-options">
                <label className="phase-schedule-sessions-option">
                  <input
                    type="radio"
                    name="sessionsPerWeek"
                    checked={sessionsPerWeek === 2}
                    disabled={confirmBusy}
                    onChange={() => setSessionsPerWeek(2)}
                  />
                  <span>2 por semana</span>
                  <span className="muted">Prioriza 1 dia entre sessões</span>
                </label>
                <label className="phase-schedule-sessions-option">
                  <input
                    type="radio"
                    name="sessionsPerWeek"
                    checked={sessionsPerWeek === 3}
                    disabled={confirmBusy}
                    onChange={() => setSessionsPerWeek(3)}
                  />
                  <span>3 por semana</span>
                  <span className="muted">Prioriza 1 dia entre sessões</span>
                </label>
              </div>
            </fieldset>
            {googleHint ? (
              <p className="muted phase-schedule-google-hint">
                O analista selecionado ainda não tem subagenda Google vinculada; os eventos ficam no app e na fila de sync.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="phase-schedule-modal__body phase-schedule-modal__body--preview">
            <SchedulePreviewMeta
              rows={rows}
              lastDate={lastDate}
              skippedScheduled={skippedScheduled}
              skippedInfo={skippedInfo}
              businessDays={scheduleBusinessSpan?.businessDays ?? null}
            />
            {scheduleBusinessSpan?.exceedsLimit ? (
              <p className="phase-schedule-banner phase-schedule-banner--warn" role="status">
                <AlertTriangle size={14} aria-hidden />
                O cronograma vai até <strong>{formatDatePt(scheduleBusinessSpan.lastDate)}</strong> —{' '}
                <strong>{scheduleBusinessSpan.businessDays} dias úteis</strong> após o início (limite recomendado:{' '}
                {PHASE_SCHEDULE_MAX_BUSINESS_DAYS}). Revise datas ou sessões/semana antes de confirmar.
              </p>
            ) : null}
            {rows.some((r) => rowHasAgendaConflict(r)) ? (
              <p className="phase-schedule-banner phase-schedule-banner--warn" role="status">
                <AlertTriangle size={14} aria-hidden />
                Linhas com ⚠ têm horário já ocupado na agenda do analista. Ajuste antes de confirmar — ao
                confirmar, essas linhas <strong>não serão gravadas</strong>.
              </p>
            ) : null}
            <div className="phase-schedule-table-wrap">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Quando</th>
                    <th scope="col">Horário</th>
                    <th scope="col">Tarefa</th>
                    <th scope="col">Analista</th>
                    <th scope="col" aria-label="Status" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const task = phaseTasks.find((t) => t.id === row.taskId)
                    const conflict = rowHasAgendaConflict(row)
                    const rowError = row.confirmStatus === 'error'
                    return (
                      <tr
                        key={row.rowKey}
                        className={
                          rowError
                            ? 'schedule-table__row--error'
                            : conflict
                              ? 'schedule-table__row--warning'
                              : undefined
                        }
                      >
                        <td className="schedule-table__idx">{idx + 1}</td>
                        <td className="schedule-table__when">
                          <span className="schedule-table__when-day">{weekdayShortPt(row.dateYmd)}</span>
                          <span className="schedule-table__when-date">{ymdToBr(row.dateYmd)}</span>
                        </td>
                        <td className="schedule-table__slot">
                          <select
                            className="schedule-table__select schedule-table__select--time"
                            value={row.slotKey}
                            disabled={step === 'confirming'}
                            onChange={(e) => updateRowSlot(row.rowKey, e.target.value)}
                            aria-label={`Horário da tarefa ${task?.code ?? row.taskId}`}
                          >
                            {DAILY_SLOTS.map((s) => (
                              <option key={s.label} value={s.label}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="schedule-table__task">
                          <span className="schedule-table__task-code">{task?.code ?? '—'}</span>
                          <span className="schedule-table__task-title">{task?.title ?? row.taskTitle}</span>
                        </td>
                        <td className="schedule-table__analyst">
                          <ScheduleAnalystCell
                            analystId={row.analystId}
                            analystsById={analystsById}
                            activeAnalysts={activeAnalysts}
                            disabled={step === 'confirming'}
                            ariaLabel={`Analista da tarefa ${task?.code ?? row.taskId}`}
                            onChange={(id) => updateRowAnalyst(row.rowKey, id)}
                          />
                        </td>
                        <td className="schedule-table__status">
                          {row.confirmStatus === 'creating' ? (
                            <Loader2 size={14} className="spin schedule-table__status-icon" aria-label="Criando" />
                          ) : row.confirmStatus === 'done' ? (
                            <Check size={14} className="schedule-table__status-icon schedule-table__status-icon--done" aria-label="Criado" />
                          ) : row.confirmStatus === 'error' ? (
                            <span title={row.errorMessage} className="schedule-table__status-icon schedule-table__status-icon--error">
                              <X size={14} aria-label="Erro" />
                            </span>
                          ) : conflict ? (
                            <AlertTriangle
                              size={14}
                              className="schedule-table__status-icon schedule-table__status-icon--warn"
                              aria-label="Conflito de horário na agenda do analista"
                            />
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="modal__actions modal__actions--sticky">
          {step === 'config' ? (
            <>
              <button type="button" className="btn btn--ghost" onClick={onClose} disabled={confirmBusy}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={!canGenerate || confirmBusy}
                onClick={handleGeneratePreview}
              >
                Gerar prévia →
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setStep('config')}
                disabled={confirmBusy}
              >
                ← Voltar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={rows.length === 0 || confirmBusy}
                onClick={() => void handleConfirm()}
              >
                {confirmBusy ? 'Agendando…' : `Confirmar ${rows.length} sessão(ões)`}
              </button>
            </>
          )}
        </div>
      </div>
    </ModalBackdrop>
  )
}

function ModalBackdrop({
  children,
  onClose,
}: {
  children: ReactNode
  onClose?: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      {children}
    </div>
  )
}

function ScheduleAnalystCell({
  analystId,
  analystsById,
  activeAnalysts,
  disabled,
  ariaLabel,
  onChange,
}: {
  analystId: string
  analystsById: Map<string, DbAnalyst>
  activeAnalysts: DbAnalyst[]
  disabled: boolean
  ariaLabel: string
  onChange: (analystId: string) => void
}) {
  const analyst = analystsById.get(analystId)
  return (
    <div className="schedule-table__analyst-inner">
      {analyst ? (
        <AnalystAvatar
          name={analyst.name}
          color={analyst.color}
          avatarUrl={analyst.avatarUrl}
          size="sm"
          className="schedule-table__analyst-avatar"
        />
      ) : null}
      <select
        className="schedule-table__select schedule-table__select--analyst"
        value={analystId}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      >
        {activeAnalysts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function SchedulePreviewMeta({
  rows,
  lastDate,
  skippedScheduled,
  skippedInfo,
  businessDays,
}: {
  rows: PreviewRow[]
  lastDate: string | null
  skippedScheduled: string[]
  skippedInfo: string[]
  businessDays: number | null
}) {
  const count = rows.length
  return (
    <div className="phase-schedule-preview-meta">
      <span className="phase-schedule-preview-meta__count">
        {count} {count === 1 ? 'sessão' : 'sessões'}
      </span>
      {lastDate ? (
        <span className="phase-schedule-preview-meta__until">até {formatDatePt(lastDate)}</span>
      ) : null}
      {businessDays != null ? (
        <span className="phase-schedule-preview-meta__muted">
          {businessDays} dia(s) útil(is) após início
        </span>
      ) : null}
      {skippedScheduled.length > 0 ? (
        <span className="phase-schedule-preview-meta__muted">
          {skippedScheduled.length} já agendada(s) ignoradas
        </span>
      ) : null}
      {skippedInfo.length > 0 ? (
        <span className="phase-schedule-preview-meta__muted">
          {skippedInfo.length} informativa(s) ignoradas
        </span>
      ) : null}
    </div>
  )
}
