import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { hasScope } from '../auth/permissions'
import { PlanPhaseModal } from '../components/PlanPhaseModal'
import { PlanTaskModal, type PlanTaskFormValues } from '../components/PlanTaskModal'
import { db } from '../db/database'
import type { DbPlanPhase, DbPlanTask, PlanTypeKey } from '../db/types'
import { compareTaskCode } from '../lib/taskCode'
import { formatDurationHmFromHours } from '../lib/durationFormat'
import { BUILTIN_PLAN_KEYS } from '../constants/planPresentations'
import { slugifyPlanKey } from '../lib/planModelKey'
import {
  countProjectsUsingPlanKey,
  createBlankPlanModel,
  deletePlanModel,
  duplicatePlanModel,
  ensureUniquePlanKey,
  updatePlanModel,
} from '../services/planModels'
import {
  inferPhaseColor,
  normalizePhaseColorHex,
  phaseProgressionAccent,
} from '../constants/phaseProgression'
import {
  addPlanPhase,
  addPlanTask,
  deletePlanPhase,
  deletePlanTask,
  movePlanPhase,
  suggestNextTaskCode,
  updatePlanPhase,
  updatePlanTask,
} from '../services/planStructure'
import { useUiFeedback } from '../ui/UiFeedbackContext'

const BUILTIN_ORDER: PlanTypeKey[] = ['basic', 'pro', 'master']
const EMPTY_TEMPLATE = '__empty__'

export function PlanModelsPage() {
  const { toastError, requestConfirm } = useUiFeedback()
  const { user } = useAuth()
  const canEditPlanModels = hasScope(user, 'planModels.edit')
  const plans = useLiveQuery(() => db.planModels.toArray(), []) ?? []
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [hours, setHours] = useState(30)
  const [presentationUrl, setPresentationUrl] = useState('')
  const [clientDescription, setClientDescription] = useState('')
  const [active, setActive] = useState(true)
  const [metaErr, setMetaErr] = useState<string | null>(null)
  const [metaOk, setMetaOk] = useState(false)

  const [editStructure, setEditStructure] = useState(false)

  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTemplateKey, setNewTemplateKey] = useState<PlanTypeKey | typeof EMPTY_TEMPLATE>('basic')
  const [newHours, setNewHours] = useState(30)
  const [newErr, setNewErr] = useState<string | null>(null)
  const [newSaving, setNewSaving] = useState(false)

  const [phaseModalOpen, setPhaseModalOpen] = useState(false)
  const [phaseEditing, setPhaseEditing] = useState<DbPlanPhase | null>(null)

  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [taskEditing, setTaskEditing] = useState<DbPlanTask | null>(null)
  const [taskModalPhaseId, setTaskModalPhaseId] = useState<string | null>(null)
  const [taskDefaultCode, setTaskDefaultCode] = useState('1.1')

  const opHoursByPlan = useLiveQuery(async () => {
    const phases = await db.planPhases.toArray()
    const tasks = await db.planTasks.toArray()
    const phaseToPlan = new Map(phases.map((p) => [p.id, p.planModelId]))
    const m = new Map<string, number>()
    for (const t of tasks) {
      if (t.isInformational) continue
      const planId = phaseToPlan.get(t.planPhaseId)
      if (!planId) continue
      m.set(planId, (m.get(planId) ?? 0) + t.estimatedHours)
    }
    return m
  }, [])

  useEffect(() => {
    if (!selectedId && plans[0]) setSelectedId(plans[0].id)
  }, [plans, selectedId])

  const selected = plans.find((p) => p.id === selectedId)

  const builtinPlans = useMemo(() => {
    const map = new Map(plans.map((p) => [p.key, p]))
    return BUILTIN_ORDER.map((k) => map.get(k)).filter(Boolean) as typeof plans
  }, [plans])

  useEffect(() => {
    if (!selected) return
    setName(selected.name)
    setHours(selected.hoursContracted)
    setPresentationUrl(selected.presentationUrl ?? '')
    setClientDescription(selected.clientDescription ?? '')
    setActive(selected.active)
    setMetaErr(null)
    setMetaOk(false)
  }, [selected?.id, selected?.name, selected?.hoursContracted, selected?.presentationUrl, selected?.clientDescription, selected?.active])

  useEffect(() => {
    if (!newOpen) return
    const tpl =
      selected && BUILTIN_PLAN_KEYS.has(selected.key)
        ? selected.key
        : BUILTIN_ORDER.map((k) => plans.find((p) => p.key === k)).find(Boolean)?.key ?? 'basic'
    setNewTemplateKey(tpl as PlanTypeKey)
    const src = plans.find((p) => p.key === tpl)
    setNewHours(src?.hoursContracted ?? 30)
    setNewName('')
    setNewErr(null)
  }, [newOpen, selected?.key, plans])

  useEffect(() => {
    if (!newOpen) return
    if (newTemplateKey === EMPTY_TEMPLATE) return
    const src = plans.find((p) => p.key === newTemplateKey)
    if (src) setNewHours(src.hoursContracted)
  }, [newTemplateKey, newOpen, plans])

  const detail = useLiveQuery(
    async () => {
      if (!selectedId) return { phases: [] as DbPlanPhase[], tasks: [] as DbPlanTask[] }
      const phases = await db.planPhases.where('planModelId').equals(selectedId).sortBy('orderIndex')
      const ids = new Set(phases.map((p) => p.id))
      const tasks = (await db.planTasks.toArray()).filter((t) => ids.has(t.planPhaseId))
      tasks.sort((a, b) => {
        const pa = phases.find((p) => p.id === a.planPhaseId)?.orderIndex ?? 0
        const pb = phases.find((p) => p.id === b.planPhaseId)?.orderIndex ?? 0
        if (pa !== pb) return pa - pb
        const c = compareTaskCode(a.code, b.code)
        if (c !== 0) return c
        return a.sortOrder - b.sortOrder
      })
      return { phases, tasks }
    },
    [selectedId],
  ) ?? { phases: [] as DbPlanPhase[], tasks: [] as DbPlanTask[] }

  const tasksByPhase = useMemo(() => {
    const m = new Map<string, DbPlanTask[]>()
    for (const t of detail.tasks) {
      const arr = m.get(t.planPhaseId) ?? []
      arr.push(t)
      m.set(t.planPhaseId, arr)
    }
    for (const arr of m.values()) arr.sort((a, b) => a.sortOrder - b.sortOrder || compareTaskCode(a.code, b.code))
    return m
  }, [detail.tasks])

  const projectCount = useLiveQuery(
    async () => {
      if (!selectedId) return 0
      const p = await db.planModels.get(selectedId)
      if (!p) return 0
      return countProjectsUsingPlanKey(p.key)
    },
    [selectedId],
  )

  const openNewPhase = useCallback(() => {
    if (!canEditPlanModels) return
    if (!selectedId) return
    setPhaseEditing(null)
    setPhaseModalOpen(true)
  }, [selectedId, canEditPlanModels])

  const openEditPhase = useCallback((ph: DbPlanPhase) => {
    if (!canEditPlanModels) return
    setPhaseEditing(ph)
    setPhaseModalOpen(true)
  }, [canEditPlanModels])

  const onPhaseSave = useCallback(
    async (phaseName: string, phaseColorHex: string) => {
      if (!selectedId) return
      if (!canEditPlanModels) return
      if (phaseEditing) {
        await updatePlanPhase(
          phaseEditing.id,
          phaseName,
          normalizePhaseColorHex(phaseColorHex, inferPhaseColor(phaseName, phaseEditing.orderIndex)),
        )
      } else {
        const nextOrder =
          detail.phases.length > 0 ? detail.phases[detail.phases.length - 1].orderIndex + 1 : 0
        await addPlanPhase(
          selectedId,
          phaseName,
          normalizePhaseColorHex(phaseColorHex, inferPhaseColor(phaseName, nextOrder)),
        )
      }
    },
    [selectedId, phaseEditing, canEditPlanModels, detail.phases],
  )

  const openNewTask = useCallback(
    async (phaseId: string) => {
      if (!canEditPlanModels) return
      if (!selectedId) return
      const code = await suggestNextTaskCode(selectedId, phaseId)
      setTaskDefaultCode(code)
      setTaskEditing(null)
      setTaskModalPhaseId(phaseId)
      setTaskModalOpen(true)
    },
    [selectedId, canEditPlanModels],
  )

  const openEditTask = useCallback((t: DbPlanTask) => {
    if (!canEditPlanModels) return
    setTaskEditing(t)
    setTaskModalPhaseId(t.planPhaseId)
    setTaskDefaultCode(t.code)
    setTaskModalOpen(true)
  }, [canEditPlanModels])

  const onTaskSave = useCallback(
    async (values: PlanTaskFormValues) => {
      if (!canEditPlanModels) return
      if (taskEditing) await updatePlanTask(taskEditing.id, values)
      else {
        if (!taskModalPhaseId) throw new Error('Fase não selecionada')
        await addPlanTask(taskModalPhaseId, values)
      }
    },
    [taskEditing, taskModalPhaseId, canEditPlanModels],
  )

  async function onSaveMeta(e: FormEvent) {
    e.preventDefault()
    if (!canEditPlanModels) return
    if (!selected) return
    setMetaErr(null)
    setMetaOk(false)
    try {
      const url = presentationUrl.trim() || null
      await updatePlanModel(selected.id, {
        name: name.trim(),
        hoursContracted: Math.max(1, Math.round(hours)),
        presentationUrl: url,
        clientDescription: clientDescription.trim() || null,
        active,
      })
      setMetaOk(true)
      setTimeout(() => setMetaOk(false), 2400)
    } catch (err) {
      setMetaErr(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  async function onToggleActive(next: boolean) {
    if (!canEditPlanModels) return
    if (!selected) return
    setActive(next)
    try {
      await updatePlanModel(selected.id, { active: next })
    } catch {
      setActive(!next)
    }
  }

  async function onCreatePlan(e: FormEvent) {
    e.preventDefault()
    if (!canEditPlanModels) return
    const nm = newName.trim()
    if (nm.length < 2) {
      setNewErr('Informe o nome do plano.')
      return
    }
    setNewErr(null)
    setNewSaving(true)
    try {
      const baseKey = slugifyPlanKey(nm)
      const key = await ensureUniquePlanKey(baseKey)
      const hrs = Math.max(1, Math.round(newHours))

      if (newTemplateKey === EMPTY_TEMPLATE) {
        await createBlankPlanModel({
          name: nm,
          key,
          hoursContracted: hrs,
          presentationUrl: null,
        })
      } else {
        const source = plans.find((p) => p.key === newTemplateKey)
        if (!source) {
          setNewErr('Modelo base não encontrado.')
          return
        }
        await duplicatePlanModel({
          sourcePlanId: source.id,
          name: nm,
          key,
          hoursContracted: hrs,
          presentationUrl: source.presentationUrl,
        })
      }

      const created = await db.planModels.where('key').equals(key).first()
      setNewOpen(false)
      if (created) {
        setSelectedId(created.id)
        setEditStructure(true)
      }
    } catch (err) {
      setNewErr(err instanceof Error ? err.message : 'Erro ao criar')
    } finally {
      setNewSaving(false)
    }
  }

  async function onDelete() {
    if (!canEditPlanModels) return
    if (!selected) return
    const ok = await requestConfirm({
      title: 'Excluir plano',
      message: `Excluir o plano "${selected.name}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      danger: true,
    })
    if (!ok) return
    try {
      await deletePlanModel(selected.id)
      setSelectedId(plans.find((p) => p.id !== selected.id)?.id ?? null)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Não foi possível excluir')
    }
  }

  async function onDeletePhase(ph: DbPlanPhase) {
    if (!canEditPlanModels) return
    const ok = await requestConfirm({
      title: 'Excluir fase',
      message: `Excluir a fase "${ph.name}" e todas as tarefas dentro dela?`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      danger: true,
    })
    if (!ok) return
    await deletePlanPhase(ph.id)
  }

  async function onDeleteTask(t: DbPlanTask) {
    if (!canEditPlanModels) return
    const ok = await requestConfirm({
      title: 'Excluir tarefa modelo',
      message: `Excluir a tarefa "${t.code} ${t.title}"?`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      danger: true,
    })
    if (!ok) return
    await deletePlanTask(t.id)
  }

  const builtin = selected && BUILTIN_PLAN_KEYS.has(selected.key)

  return (
    <div className="page page--wide page--plan-models">
      <header className="page__header page__header--split">
        <div>
          <h1 className="page__title">Modelos de Planos</h1>
          <p className="page__subtitle plan-models-page__subtitle">
            Gerencie a estrutura de planos, fases e tarefas reutilizáveis.{' '}
            <Link to="/apresentacoes" className="plan-models__public-link" target="_blank">
              Página pública para clientes ↗
            </Link>
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary plan-models-page__new-btn"
          onClick={() => setNewOpen(true)}
          disabled={!canEditPlanModels}
        >
          + Novo Plano
        </button>
      </header>

      <div className="plan-split">
        <div className="plan-list">
          {plans
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
            .map((p) => {
              const op = opHoursByPlan?.get(p.id) ?? p.hoursContracted
              return (
                <button
                  key={p.id}
                  type="button"
                  className={'plan-card' + (p.id === selectedId ? ' is-selected' : '')}
                  onClick={() => setSelectedId(p.id)}
                >
                  <strong className="plan-card__name">{p.name}</strong>
                  <div className="plan-card__stats">
                    <span>
                      {p.phaseCount} {p.phaseCount === 1 ? 'fase' : 'fases'} ·{' '}
                      {formatDurationHmFromHours(p.hoursContracted)}
                    </span>
                  </div>
                  <div className="plan-card__op muted">Operacional: {formatDurationHmFromHours(op)}</div>
                  {!p.active ? <span className="plan-card__inactive">Inativo</span> : null}
                </button>
              )
            })}
        </div>

        <div className="panel plan-detail plan-detail--edit plan-detail--styled">
          {selected ? (
            <>
              <header className="plan-detail__toolbar">
                <div className="plan-detail__toolbar-main">
                  <h2 className="plan-detail__title">{selected.name}</h2>
                  <p className="muted plan-detail__meta">
                    Chave <code>{selected.key}</code>
                    {builtin ? ' · plano base' : null}
                    {typeof projectCount === 'number' ? ` · ${projectCount} projeto(s) com esta chave` : null}
                  </p>
                </div>
                <div className="plan-detail__toolbar-actions">
                  <label className="plan-ativo-toggle">
                    <input
                      type="checkbox"
                      checked={active}
                      disabled={!canEditPlanModels}
                      onChange={(e) => void onToggleActive(e.target.checked)}
                    />
                    <span className="plan-ativo-toggle__ui" aria-hidden />
                    <span>Ativo</span>
                  </label>
                  <button
                    type="button"
                    className={'btn plan-detail__edit-btn' + (editStructure ? ' btn--primary' : ' btn--ghost')}
                    disabled={!canEditPlanModels}
                    onClick={() => setEditStructure((v) => !v)}
                  >
                    <Pencil size={16} strokeWidth={2} aria-hidden />
                    {editStructure ? 'Concluir edição' : 'Editar estrutura'}
                  </button>
                  {!builtin && canEditPlanModels ? (
                    <button
                      type="button"
                      className="btn btn--ghost plan-detail__trash"
                      title="Excluir plano"
                      onClick={() => void onDelete()}
                    >
                      <Trash2 size={18} strokeWidth={2} aria-hidden />
                    </button>
                  ) : null}
                </div>
              </header>

              <form className="plan-meta-form plan-edit-card stack" onSubmit={onSaveMeta}>
                <h3 className="plan-meta-form__title">Cadastro do modelo</h3>
                <label className="field">
                  <span>Nome</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    placeholder="Ex: Pró"
                  />
                </label>
                <label className="field">
                  <span>Horas totais (contratadas)</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                  />
                </label>
                <label className="field">
                  <span>URL da apresentação (PDF, link…)</span>
                  <input
                    type="text"
                    placeholder="https://… ou /planos/arquivo.pdf"
                    value={presentationUrl}
                    onChange={(e) => setPresentationUrl(e.target.value)}
                  />
                </label>
                <p className="muted field-hint">
                  PDFs no site: pasta <code>public/planos</code> → use <code>/planos/nome.pdf</code>.
                </p>
                <label className="field">
                  <span>Resumo na página pública</span>
                  <textarea
                    rows={3}
                    value={clientDescription}
                    onChange={(e) => setClientDescription(e.target.value)}
                    placeholder="Texto curto em /apresentacoes"
                  />
                </label>
                {metaErr ? <p className="auth__error">{metaErr}</p> : null}
                {metaOk ? <p className="plan-meta-form__ok">Alterações salvas.</p> : null}
                <div className="plan-meta-form__actions plan-meta-form__actions--end">
                  <button type="submit" className="btn btn--primary" disabled={!canEditPlanModels}>
                    Salvar
                  </button>
                </div>
              </form>

              <section className="plan-structure plan-structure--styled">
                <div className="plan-structure__head">
                  <div>
                    <h3 className="plan-structure__title">Estrutura — fases e tarefas</h3>
                    <p className="muted plan-structure__hint">
                      {editStructure
                        ? 'Adicione fases e tarefas do modelo. Projetos já criados com esta chave não são alterados automaticamente.'
                        : 'Ative Editar estrutura para incluir ou alterar fases e tarefas.'}
                    </p>
                  </div>
                  {editStructure && selectedId ? (
                    <button type="button" className="btn btn--ghost plan-structure__add-phase" onClick={openNewPhase}>
                      <Plus size={18} strokeWidth={2} aria-hidden />
                      Nova fase
                    </button>
                  ) : null}
                </div>
                <div className="plan-structure__tree">
                  {detail.phases.length === 0 && editStructure ? (
                    <p className="muted">Nenhuma fase ainda. Clique em <strong>Nova fase</strong> para começar.</p>
                  ) : null}
                  {detail.phases.map((ph) => {
                    const ts = tasksByPhase.get(ph.id) ?? []
                    return (
                      <div
                        key={ph.id}
                        className="plan-phase-card"
                        style={{ ['--plan-phase-accent' as string]: ph.colorHex || phaseProgressionAccent(ph.orderIndex) }}
                      >
                        <div className="plan-phase-card__head">
                          <span className="plan-phase-card__badge">{ph.orderIndex + 1}</span>
                          <h4 className="plan-phase-card__name">{ph.name}</h4>
                          {editStructure && selectedId ? (
                            <div className="plan-phase-card__actions">
                              <button
                                type="button"
                                className="btn btn--icon btn--xs btn--ghost"
                                title="Mover para cima"
                                onClick={() => void movePlanPhase(selectedId, ph.id, 'up')}
                              >
                                <ChevronUp size={18} strokeWidth={2} />
                              </button>
                              <button
                                type="button"
                                className="btn btn--icon btn--xs btn--ghost"
                                title="Mover para baixo"
                                onClick={() => void movePlanPhase(selectedId, ph.id, 'down')}
                              >
                                <ChevronDown size={18} strokeWidth={2} />
                              </button>
                              <button
                                type="button"
                                className="btn btn--icon btn--xs btn--ghost"
                                title="Editar fase"
                                onClick={() => openEditPhase(ph)}
                              >
                                <Pencil size={16} strokeWidth={2} />
                              </button>
                              <button
                                type="button"
                                className="btn btn--icon btn--xs btn--ghost plan-icon-danger"
                                title="Excluir fase"
                                onClick={() => void onDeletePhase(ph)}
                              >
                                <Trash2 size={16} strokeWidth={2} />
                              </button>
                              <button
                                type="button"
                                className="btn btn--xs btn--primary plan-phase-card__add-task"
                                onClick={() => void openNewTask(ph.id)}
                              >
                                <Plus size={14} strokeWidth={2} aria-hidden />
                                Nova tarefa
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <ul className="plan-task-rows">
                          {ts.map((t) => (
                            <li key={t.id} className={'plan-task-row' + (editStructure ? ' plan-task-row--editable' : '')}>
                              <span className="plan-task-row__code">{t.code}</span>
                              <span className="plan-task-row__title">{t.title}</span>
                              <span className="plan-task-row__hours muted">
                                {t.isInformational ? 'info' : formatDurationHmFromHours(t.estimatedHours)}
                              </span>
                              {editStructure ? (
                                <span className="plan-task-row__actions">
                                  <button
                                    type="button"
                                    className="btn btn--icon btn--xs btn--ghost"
                                    title="Editar tarefa"
                                    onClick={() => openEditTask(t)}
                                  >
                                    <Pencil size={15} strokeWidth={2} />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn--icon btn--xs btn--ghost plan-icon-danger"
                                    title="Excluir tarefa"
                                    onClick={() => void onDeleteTask(t)}
                                  >
                                    <Trash2 size={15} strokeWidth={2} />
                                  </button>
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </section>
            </>
          ) : (
            <p className="muted">Selecione um plano na lista.</p>
          )}
        </div>
      </div>

      {newOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => !newSaving && setNewOpen(false)}>
          <div
            className="modal modal--plan-form"
            role="dialog"
            aria-modal
            aria-labelledby="plan-new-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-plan__header">
              <h2 id="plan-new-title" className="modal__title">
                Novo Plano
              </h2>
              <button
                type="button"
                className="modal-plan__close"
                aria-label="Fechar"
                disabled={newSaving}
                onClick={() => setNewOpen(false)}
              >
                <X size={22} strokeWidth={2} />
              </button>
            </div>
            <div className="modal-plan__body">
              <form className="stack plan-new-form" onSubmit={onCreatePlan}>
                <label className="field">
                  <span>Nome</span>
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    minLength={2}
                    placeholder="Ex: Pró"
                  />
                </label>
                <label className="field">
                  <span>Tipo</span>
                  <select
                    value={newTemplateKey}
                    onChange={(e) => setNewTemplateKey(e.target.value as PlanTypeKey | typeof EMPTY_TEMPLATE)}
                  >
                    <option value={EMPTY_TEMPLATE}>Em branco (adicione fases e tarefas)</option>
                    {builtinPlans.map((p) => (
                      <option key={p.id} value={p.key}>
                        Copiar estrutura — {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Horas totais</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={newHours}
                    onChange={(e) => setNewHours(Number(e.target.value))}
                  />
                </label>
                <p className="muted plan-new-form__hint">
                  {newTemplateKey === EMPTY_TEMPLATE
                    ? 'Plano vazio: após salvar, use Editar estrutura para criar fases e tarefas.'
                    : 'Será criada uma cópia das fases e tarefas do tipo escolhido. A chave interna é gerada a partir do nome.'}
                </p>
                {newErr ? <p className="auth__error">{newErr}</p> : null}
                <div className="modal-plan__footer">
                  <button type="button" className="btn btn--ghost" disabled={newSaving} onClick={() => setNewOpen(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn--primary" disabled={newSaving}>
                    {newSaving ? 'Salvando…' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <PlanPhaseModal
        open={phaseModalOpen}
        onClose={() => {
          setPhaseModalOpen(false)
          setPhaseEditing(null)
        }}
        phase={phaseEditing}
        orderIndex={
          phaseEditing
            ? phaseEditing.orderIndex
            : detail.phases.length > 0
              ? detail.phases[detail.phases.length - 1].orderIndex + 1
              : 0
        }
        onSave={onPhaseSave}
      />

      <PlanTaskModal
        open={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false)
          setTaskEditing(null)
          setTaskModalPhaseId(null)
        }}
        task={taskEditing}
        defaultCode={taskDefaultCode}
        onSave={onTaskSave}
      />
    </div>
  )
}
