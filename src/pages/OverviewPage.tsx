import { useCallback, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { GripVertical, Plus } from 'lucide-react'
import { db } from '../db/database'
import { KANBAN_COLUMNS } from '../constants/kanban'
import { projectProgressPercent } from '../lib/projectProgress'
import { getActivePlanLabel, getLastCompletedPlanLabel } from '../lib/planLabelDisplay'
import type { KanbanColumn } from '../db/types'
import { PlanLabelRow } from '../components/PlanLabelChips'
import { AnalystAvatar } from '../components/AnalystAvatar'
import { applyManualKanbanColumnMove, deriveKanbanColumnFromPlanState } from '../services/kanbanPhaseSync'
import { useReconcileKanbanColumns } from '../hooks/useReconcileKanbanColumns'
import { useAuth } from '../auth/AuthContext'
import { hasScope } from '../auth/permissions'
import { formatDurationHmFromHours } from '../lib/durationFormat'

const iconSmall = { size: 16, strokeWidth: 2 } as const

const DT_PROJECT = 'application/x-vyntask-project'

type PendingMove = {
  projectId: string
  projectName: string
  from: KanbanColumn
  to: KanbanColumn
}

function columnTitle(id: KanbanColumn): string {
  return KANBAN_COLUMNS.find((c) => c.id === id)?.title ?? id
}

function moveConsequences(from: KanbanColumn, to: KanbanColumn): string {
  if (to === 'cancelados') {
    return 'O projeto será marcado como cancelado. As tarefas não serão alteradas automaticamente.'
  }
  if (to === 'finalizados') {
    return 'Todas as fases do plano serão concluídas e todas as tarefas (exceto canceladas) marcadas como concluídas — projeto em Concluídos.'
  }
  if (to === 'novos') {
    return 'Volta para a Fase 00 do plano (tarefas 0.x): tudo pendente; só a primeira fase do plano ativa, demais bloqueadas.'
  }
  if (from === 'novos') {
    return 'As fases e tarefas serão alinhadas à coluna escolhida: o que estiver “antes” no plano será marcado como concluído; a fase alvo ficará ativa com tarefas pendentes; fases posteriores serão bloqueadas e reabertas.'
  }
  const fi = KANBAN_COLUMNS.findIndex((c) => c.id === from)
  const ti = KANBAN_COLUMNS.findIndex((c) => c.id === to)
  const forward = fi >= 0 && ti >= 0 && ti > fi
  if (forward) {
    return 'Fases anteriores à coluna escolhida serão concluídas e suas tarefas marcadas como concluídas. Fases posteriores terão tarefas reabertas (pendente) e ficarão bloqueadas.'
  }
  return 'Fases à frente da coluna escolhida terão tarefas reabertas (pendente) e ficarão bloqueadas; fases anteriores serão concluídas com tarefas concluídas, conforme a posição no plano.'
}

export function OverviewPage() {
  const { user } = useAuth()
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? []
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? []
  const phases = useLiveQuery(() => db.phases.toArray(), []) ?? []
  const analysts = useLiveQuery(() => db.analysts.toArray(), []) ?? []
  const planModels = useLiveQuery(() => db.planModels.toArray(), []) ?? []

  const canEditProjects = user ? hasScope(user, 'projects.edit') : false

  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [justification, setJustification] = useState('')
  const [modalError, setModalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const effectiveKanbanByProject = useMemo(() => {
    const m = new Map<string, KanbanColumn>()
    for (const p of projects) {
      m.set(p.id, deriveKanbanColumnFromPlanState(p, phases, tasks))
    }
    return m
  }, [projects, phases, tasks])

  useReconcileKanbanColumns(projects, phases, tasks)

  const activeCount = useMemo(() => {
    return projects.filter((p) => {
      const col = effectiveKanbanByProject.get(p.id) ?? p.kanbanColumn
      return col !== 'cancelados' && p.status !== 'cancelado'
    }).length
  }, [projects, effectiveKanbanByProject])

  function requestMove(projectId: string, projectName: string, to: KanbanColumn) {
    if (!canEditProjects) return
    const p = projects.find((x) => x.id === projectId)
    if (!p) return
    const from = effectiveKanbanByProject.get(projectId) ?? deriveKanbanColumnFromPlanState(p, phases, tasks)
    if (from === to) return
    setModalError(null)
    setJustification('')
    setPendingMove({ projectId, projectName, from, to })
  }

  async function confirmMove() {
    if (!pendingMove) return
    setModalError(null)
    setSubmitting(true)
    try {
      await applyManualKanbanColumnMove(pendingMove.projectId, pendingMove.to, justification)
      setPendingMove(null)
      setJustification('')
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Não foi possível mover.')
    } finally {
      setSubmitting(false)
    }
  }

  const cancelModal = useCallback(() => {
    setPendingMove(null)
    setJustification('')
    setModalError(null)
  }, [])

  function planBadgeClass(planType: string) {
    if (planType === 'master') return 'kanban-card__badge kanban-card__badge--master'
    if (planType === 'pro') return 'kanban-card__badge kanban-card__badge--pro'
    if (planType === 'basic') return 'kanban-card__badge kanban-card__badge--basic'
    return 'kanban-card__badge kanban-card__badge--custom'
  }

  function planBadgeLabel(p: { planType: string; hoursContracted: number }) {
    const m = planModels.find((x) => x.key === p.planType)
    const tag =
      p.planType === 'master'
        ? 'MASTER'
        : p.planType === 'pro'
          ? 'PRO'
          : p.planType === 'basic'
            ? 'BASIC'
            : (() => {
                const n = m?.name ?? p.planType
                return n.length > 16 ? `${n.slice(0, 14)}…` : n
              })()
    return `${tag} ${formatDurationHmFromHours(p.hoursContracted)}`
  }

  return (
    <div className="page page--wide page--kanban">
      <header className="page__header page__header--split kanban-page__header">
        <div>
          <h1 className="page__title">Visão Geral</h1>
          <p className="page__subtitle">
            Colunas = fases do plano (0.x → Fase 00, 1.x → Fase 01, …); Concluídos só com todo o plano fechado ·{' '}
            {activeCount} projeto(s) ativos
          </p>
        </div>
        <Link to="/projetos" state={{ openNew: true }} className="btn btn--primary">
          Novo projeto
        </Link>
      </header>

      <div className="kanban">
        {KANBAN_COLUMNS.map((col) => {
          const colProjects = projects.filter((p) => (effectiveKanbanByProject.get(p.id) ?? p.kanbanColumn) === col.id)
          return (
            <section
              key={col.id}
              className="kanban__col"
              style={{ ['--kanban-accent' as string]: col.accent }}
              onDragOver={(e) => {
                if (!canEditProjects) return
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
              }}
              onDrop={(e) => {
                if (!canEditProjects) return
                e.preventDefault()
                const raw = e.dataTransfer.getData(DT_PROJECT) || e.dataTransfer.getData('text/plain')
                if (!raw) return
                let projectId = raw
                try {
                  const j = JSON.parse(raw) as { projectId?: string }
                  if (j.projectId) projectId = j.projectId
                } catch {
                  /* plain id */
                }
                const proj = projects.find((x) => x.id === projectId)
                if (!proj) return
                requestMove(projectId, proj.projectName, col.id)
              }}
            >
              <div className="kanban__col-surface">
                <div className="kanban__accent" aria-hidden />
                <header className="kanban__head">
                  <h2 className="kanban__title">{col.title}</h2>
                  <span className="kanban__count">{colProjects.length}</span>
                </header>

                <div className="kanban__cards">
                  {colProjects.length === 0 ? (
                    <div className="kanban__empty">
                      <p>Nenhum projeto nesta etapa</p>
                      <span className="kanban__empty-hint">
                        {canEditProjects
                          ? 'Arraste um cartão para cá ou altere a coluna no card (com confirmação)'
                          : 'Os cartões refletem o andamento em Fases e tarefas'}
                      </span>
                    </div>
                  ) : (
                    colProjects.map((p) => {
                      const pct = projectProgressPercent(tasks, p.id)
                      const analyst = analysts.find((a) => a.id === p.analystId)
                      const lastLabel = getLastCompletedPlanLabel(tasks, p.id)
                      const activeLabel = getActivePlanLabel(tasks, p.id, phases)
                      const effective = effectiveKanbanByProject.get(p.id) ?? p.kanbanColumn
                      return (
                        <article
                          key={p.id}
                          className="kanban-card"
                          draggable={canEditProjects}
                          onDragStart={(e) => {
                            if (!canEditProjects) return
                            const payload = JSON.stringify({ projectId: p.id })
                            e.dataTransfer.setData(DT_PROJECT, payload)
                            e.dataTransfer.setData('text/plain', p.id)
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                        >
                          <div className="kanban-card__top">
                            <span
                              className={'kanban-card__grip' + (canEditProjects ? ' kanban-card__grip--draggable' : '')}
                              aria-hidden
                              title={canEditProjects ? 'Arrastar para outra coluna' : undefined}
                            >
                              <GripVertical {...iconSmall} />
                            </span>
                            <Link to={`/projetos/${p.id}`} className="kanban-card__title kanban-card__title--link">
                              {p.projectName}
                            </Link>
                          </div>
                          <div className="kanban-card__badges">
                            {analyst ? (
                              <span className="kanban-card__analyst" title={`Analista responsável: ${analyst.name}`}>
                                <AnalystAvatar
                                  name={analyst.name}
                                  color={analyst.color}
                                  avatarUrl={analyst.avatarUrl}
                                  size="sm"
                                />
                              </span>
                            ) : null}
                            <span className={planBadgeClass(p.planType)}>{planBadgeLabel(p)}</span>
                          </div>
                          <PlanLabelRow last={lastLabel} active={activeLabel} variant="kanban" />
                          <div className="kanban-card__progress">
                            <div className="kanban-card__progress-track">
                              <div className="kanban-card__progress-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="kanban-card__progress-label">{pct}%</span>
                          </div>
                          <div className="kanban-card__meta">
                            <span className="kanban-card__hours">
                              {formatDurationHmFromHours(p.hoursUsed)} / {formatDurationHmFromHours(p.hoursContracted)}
                            </span>
                            {!analyst ? (
                              <span className="kanban-card__no-analyst" title="Sem analista responsável">
                                Sem analista
                              </span>
                            ) : null}
                          </div>
                          <div className="kanban-card__move">
                            {canEditProjects ? (
                              <label className="kanban-card__move-label">
                                <span className="sr-only">Mover para coluna</span>
                                <select
                                  className="kanban-card__select"
                                  value={effective}
                                  onChange={(e) => {
                                    const next = e.target.value as KanbanColumn
                                    requestMove(p.id, p.projectName, next)
                                  }}
                                >
                                  {KANBAN_COLUMNS.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.title}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ) : (
                              <span className="kanban-card__col-readonly muted" title="Sem permissão para mover">
                                {columnTitle(effective)}
                              </span>
                            )}
                          </div>
                        </article>
                      )
                    })
                  )}
                </div>

                <Link
                  className="kanban__add-card"
                  to="/projetos"
                  state={{ openNew: true, kanbanColumn: col.id }}
                >
                  <Plus size={18} strokeWidth={2} />
                  Adicionar cartão
                </Link>
              </div>
            </section>
          )
        })}
      </div>

      {pendingMove ? (
        <div className="modal-backdrop" role="presentation" onClick={cancelModal}>
          <div className="modal kanban-move-modal" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Confirmar mudança no kanban</h2>
            <p className="muted kanban-move-modal__project">
              <strong>{pendingMove.projectName}</strong>
            </p>
            <p className="kanban-move-modal__route">
              {columnTitle(pendingMove.from)} → <strong>{columnTitle(pendingMove.to)}</strong>
            </p>
            <div className="kanban-move-modal__warn">
              <p>{moveConsequences(pendingMove.from, pendingMove.to)}</p>
              <p className="muted">
                Isso mantém o quadro alinhado à subaba <strong>Fases e tarefas</strong> do projeto.
              </p>
            </div>
            <label className="field">
              <span>Justificativa (obrigatória, mín. 8 caracteres)</span>
              <textarea
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Ex.: Cliente pediu retorno à fase de vendas após pausa contratual."
                autoFocus
              />
            </label>
            {modalError ? <p className="field__error">{modalError}</p> : null}
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={cancelModal} disabled={submitting}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={submitting || justification.trim().length < 8}
                onClick={() => void confirmMove()}
              >
                {submitting ? 'Aplicando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
