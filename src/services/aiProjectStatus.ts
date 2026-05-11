import { db } from '../db/database'
import type { DbEvent, DbProject, DbTask, DbUser } from '../db/types'
import { projectProgressPercent } from '../lib/projectProgress'
import { supabase } from '../lib/supabaseClient'
import { getPrimaryScheduledEventForTask } from '../lib/taskSchedule'
import { isProjectCheckinStale } from './projectCheckin'

type MatchConfidence = 'alta' | 'media' | 'baixa'
type AssistantSeverity = 'media' | 'alta' | 'critica'
type AssistantAlertType = 'atraso' | 'risco_orcamento' | 'sem_atualizacao' | 'sem_proxima_tarefa'

export type AiAssistantAlert = {
  tipo: AssistantAlertType
  severidade: AssistantSeverity
  regraDisparada: string
}

export type AiProjectSnapshot = {
  projectId: string
  projectName: string
  statusExecutivo: 'verde' | 'amarelo' | 'vermelho'
  progressoPct: number
  horasContratadas: number
  horasUsadas: number
  consumoPct: number
  proximaTarefa: { id: string; titulo: string; data: string | null } | null
  ultimaConcluida: { id: string; titulo: string; data: string | null } | null
  totalTarefas: number
  tarefasConcluidas: number
  confidenceScore: number
  confidenceLevel: MatchConfidence
  matchedTerm: string
  matchedProjectName: string
  alerts: AiAssistantAlert[]
}

export type AiProjectAssistantResult =
  | { kind: 'empty_query' }
  | { kind: 'not_found'; normalizedQuery: string }
  | {
      kind: 'ambiguous'
      normalizedQuery: string
      candidates: Array<{ projectId: string; projectName: string; score: number; confidence: MatchConfidence }>
    }
  | { kind: 'ok'; normalizedQuery: string; snapshot: AiProjectSnapshot; summary: string; source: 'deterministico' | 'ia' }

type ResolveInput = {
  question: string
  projects: DbProject[]
  tasks: DbTask[]
  events: DbEvent[]
  forcedProjectId?: string
}

function norm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractSearchTerm(question: string): string {
  const q = question.trim()
  if (!q) return ''
  const patterns = [
    /projeto\s+(?:da|do|de)\s+(.+)$/i,
    /status\s+(?:da|do|de)\s+(.+)$/i,
    /como\s+(?:ta|est[áa])\s+o?\s*projeto\s+(?:da|do|de)?\s*(.+)$/i,
  ]
  for (const p of patterns) {
    const m = q.match(p)
    if (m?.[1]) return m[1].trim()
  }
  return q
}

function confidenceFromScore(score: number): MatchConfidence {
  if (score >= 0.92) return 'alta'
  if (score >= 0.85) return 'media'
  return 'baixa'
}

function overlapScore(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  if (a.startsWith(b) || b.startsWith(a)) return 0.95
  if (a.includes(b) || b.includes(a)) return 0.9
  const aTokens = new Set(a.split(' ').filter(Boolean))
  const bTokens = new Set(b.split(' ').filter(Boolean))
  if (aTokens.size === 0 || bTokens.size === 0) return 0
  let inter = 0
  for (const t of aTokens) if (bTokens.has(t)) inter += 1
  const tokenRatio = inter / Math.max(aTokens.size, bTokens.size)
  return tokenRatio * 0.82
}

function scoreProjectMatch(searchTerm: string, project: DbProject): number {
  const term = norm(searchTerm)
  const fields = [project.projectName, project.tradeName ?? '', project.razaoSocial ?? ''].map(norm).filter(Boolean)
  if (term.length === 0 || fields.length === 0) return 0
  const top = Math.max(...fields.map((f) => overlapScore(term, f)))
  const boost = fields.some((f) => f === term) ? 0.04 : 0
  return Math.min(1, top + boost)
}

function chooseNextTask(tasks: DbTask[], events: DbEvent[]): { id: string; titulo: string; data: string | null } | null {
  const active = tasks.filter((t) => t.status === 'pendente' || t.status === 'em_andamento')
  if (active.length === 0) return null
  const withSchedule = active
    .map((task) => {
      const mainEvent = getPrimaryScheduledEventForTask(events, task.id)
      return { task, event: mainEvent }
    })
    .filter((x) => x.event !== null)
    .sort((a, b) => (a.event?.startTime ?? '').localeCompare(b.event?.startTime ?? ''))
  if (withSchedule.length > 0) {
    const first = withSchedule[0]
    return {
      id: first.task.id,
      titulo: first.task.title,
      data: first.event?.startTime ?? null,
    }
  }
  const byDueDate = [...active].sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))[0]
  return { id: byDueDate.id, titulo: byDueDate.title, data: byDueDate.dueDate ?? null }
}

function chooseLastCompletedTask(tasks: DbTask[]): { id: string; titulo: string; data: string | null } | null {
  const done = tasks
    .filter((t) => t.status === 'concluida')
    .sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt))
  const first = done[0]
  if (!first) return null
  return { id: first.id, titulo: first.title, data: first.completedAt ?? null }
}

function buildAlerts(project: DbProject, tasks: DbTask[], nextTask: AiProjectSnapshot['proximaTarefa']): AiAssistantAlert[] {
  const alerts: AiAssistantAlert[] = []
  const nowIso = new Date().toISOString()
  const delayed = tasks.some((t) => (t.status === 'pendente' || t.status === 'em_andamento') && !!t.dueDate && t.dueDate < nowIso)
  if (delayed) {
    alerts.push({ tipo: 'atraso', severidade: 'alta', regraDisparada: 'Ha tarefas pendentes com vencimento expirado.' })
  }
  if (project.hoursContracted > 0) {
    const pct = Math.round((project.hoursUsed / project.hoursContracted) * 100)
    if (pct >= 100) alerts.push({ tipo: 'risco_orcamento', severidade: 'critica', regraDisparada: 'Horas usadas acima do contratado.' })
    else if (pct >= 90) alerts.push({ tipo: 'risco_orcamento', severidade: 'alta', regraDisparada: 'Consumo de horas acima de 90%.' })
    else if (pct >= 80) alerts.push({ tipo: 'risco_orcamento', severidade: 'media', regraDisparada: 'Consumo de horas acima de 80%.' })
  }
  const stale7 = isProjectCheckinStale(project, 7)
  if (stale7) {
    const stale14 = isProjectCheckinStale(project, 14)
    alerts.push({
      tipo: 'sem_atualizacao',
      severidade: stale14 ? 'critica' : 'alta',
      regraDisparada: stale14 ? 'Projeto com check-in ausente há muito tempo.' : 'Projeto sem check-in recente.',
    })
  }
  if (!nextTask) {
    alerts.push({ tipo: 'sem_proxima_tarefa', severidade: 'alta', regraDisparada: 'Nao ha proxima tarefa clara para execucao.' })
  }
  return alerts
}

function deriveExecutiveStatus(alerts: AiAssistantAlert[]): 'verde' | 'amarelo' | 'vermelho' {
  if (alerts.some((a) => a.severidade === 'critica' || a.severidade === 'alta')) return 'vermelho'
  if (alerts.length > 0) return 'amarelo'
  return 'verde'
}

function fmtDate(iso: string | null): string {
  if (!iso) return '--'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--'
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function deterministicSummary(snapshot: AiProjectSnapshot): string {
  const next = snapshot.proximaTarefa ? `${snapshot.proximaTarefa.titulo} (${fmtDate(snapshot.proximaTarefa.data)})` : 'Sem tarefa agendada'
  const last = snapshot.ultimaConcluida ? `${snapshot.ultimaConcluida.titulo} (${fmtDate(snapshot.ultimaConcluida.data)})` : 'Sem tarefa concluida recente'
  const risk = snapshot.alerts.length > 0 ? snapshot.alerts.map((a) => a.tipo).join(', ') : 'sem alertas relevantes'
  return `Projeto ${snapshot.projectName}: proxima tarefa ${next}; ultima concluida ${last}; conclusao ${snapshot.progressoPct}% (${snapshot.tarefasConcluidas}/${snapshot.totalTarefas}); horas ${snapshot.horasUsadas}h/${snapshot.horasContratadas}h (${snapshot.consumoPct}%), ${risk}.`
}

async function callAssistantLlm(question: string, snapshot: AiProjectSnapshot): Promise<string | null> {
  if (import.meta.env.VITE_AI_ASSISTANT_ENABLE_LLM !== '1') return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12_000)
  try {
    let authHeader: string | null = null
    if (supabase) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.access_token) authHeader = `Bearer ${session.access_token}`
    }
    const res = await fetch('/functions/v1/ai-project-assistant', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({ schemaVersion: 'v1', question, snapshot, locale: 'pt-BR' }),
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { summaryText?: string; output?: { text?: string } }
    const text = data.summaryText ?? data.output?.text ?? null
    return typeof text === 'string' && text.trim() ? text.trim() : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function resolveAiProjectAssistant(input: ResolveInput): Promise<AiProjectAssistantResult> {
  const normalizedQuery = norm(extractSearchTerm(input.question))
  if (!normalizedQuery) return { kind: 'empty_query' }

  if (input.projects.length === 0) return { kind: 'not_found', normalizedQuery }

  let target = input.forcedProjectId ? input.projects.find((p) => p.id === input.forcedProjectId) ?? null : null
  const ranked = input.projects
    .map((project) => {
      const score = scoreProjectMatch(normalizedQuery, project)
      return { project, score, confidence: confidenceFromScore(score) }
    })
    .filter((x) => x.score > 0.3)
    .sort((a, b) => b.score - a.score)

  if (!target) {
    const first = ranked[0]
    if (!first) return { kind: 'not_found', normalizedQuery }
    const second = ranked[1]
    if (second && first.score - second.score < 0.03) {
      return {
        kind: 'ambiguous',
        normalizedQuery,
        candidates: ranked.slice(0, 4).map((x) => ({
          projectId: x.project.id,
          projectName: x.project.projectName,
          score: Number(x.score.toFixed(3)),
          confidence: x.confidence,
        })),
      }
    }
    target = first.project
  }

  const projectTasks = input.tasks.filter((t) => t.projectId === target.id)
  const projectEvents = input.events.filter((e) => e.projectId === target.id)
  const totalTarefas = projectTasks.length
  const tarefasConcluidas = projectTasks.filter((t) => t.status === 'concluida').length
  const progressoPct = projectProgressPercent(projectTasks, target.id)
  const horasContratadas = Number.isFinite(target.hoursContracted) ? target.hoursContracted : 0
  const horasUsadas = Number.isFinite(target.hoursUsed) ? target.hoursUsed : 0
  const consumoPct = horasContratadas > 0 ? Math.round((horasUsadas / horasContratadas) * 100) : 0
  const proximaTarefa = chooseNextTask(projectTasks, projectEvents)
  const ultimaConcluida = chooseLastCompletedTask(projectTasks)
  const alerts = buildAlerts(target, projectTasks, proximaTarefa)
  const matchedScore = scoreProjectMatch(normalizedQuery, target)
  const snapshot: AiProjectSnapshot = {
    projectId: target.id,
    projectName: target.projectName,
    statusExecutivo: deriveExecutiveStatus(alerts),
    progressoPct,
    horasContratadas,
    horasUsadas,
    consumoPct,
    proximaTarefa,
    ultimaConcluida,
    totalTarefas,
    tarefasConcluidas,
    confidenceScore: Number(matchedScore.toFixed(3)),
    confidenceLevel: confidenceFromScore(matchedScore),
    matchedTerm: normalizedQuery,
    matchedProjectName: target.projectName,
    alerts,
  }

  const deterministic = deterministicSummary(snapshot)
  const aiSummary = await callAssistantLlm(input.question, snapshot)
  return {
    kind: 'ok',
    normalizedQuery,
    snapshot,
    summary: aiSummary ?? deterministic,
    source: aiSummary ? 'ia' : 'deterministico',
  }
}

type MetricEvent = 'query_success' | 'query_not_found' | 'query_ambiguous' | 'query_error'

export async function recordAiAssistantMetric(params: {
  event: MetricEvent
  user: Pick<DbUser, 'id' | 'name' | 'email'> | null
  projectId?: string | null
  details: string
}): Promise<void> {
  const now = new Date().toISOString()
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  const userId = params.user?.id ?? 'system'
  const userName = params.user?.name ?? 'Sistema'
  const userEmail = params.user?.email ?? 'system@vyntask.local'
  try {
    await db.auditLogs.add({
      id,
      action: 'alteracao',
      entity: 'outro',
      entityId: params.projectId ?? null,
      entityLabel: 'assistente_ia',
      userId,
      userName,
      userEmail,
      justification: null,
      details: `[${params.event}] ${params.details}`,
      createdAt: now,
    })
  } catch {
    // Telemetria nunca deve quebrar a UX do assistente.
  }
}
