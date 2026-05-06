import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { useAuth } from '../auth/AuthContext'
import type { DbEvent, DbProject, DbTask } from '../db/types'
import { recordAiAssistantMetric, resolveAiProjectAssistant, type AiProjectAssistantResult } from '../services/aiProjectStatus'

const emptyProjects: DbProject[] = []
const emptyTasks: DbTask[] = []
const emptyEvents: DbEvent[] = []

export function AiPage() {
  const { user } = useAuth()
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AiProjectAssistantResult | null>(null)
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? emptyProjects
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? emptyTasks
  const events = useLiveQuery(() => db.events.toArray(), []) ?? emptyEvents

  async function runQuery(forcedProjectId?: string) {
    const clean = question.trim()
    if (!clean) return
    setLoading(true)
    try {
      const resolved = await resolveAiProjectAssistant({
        question: clean,
        projects,
        tasks,
        events,
        forcedProjectId,
      })
      setResult(resolved)
      if (resolved.kind === 'ok') {
        await recordAiAssistantMetric({
          event: 'query_success',
          user,
          projectId: resolved.snapshot.projectId,
          details: `Consulta bem-sucedida para "${resolved.snapshot.projectName}" (${resolved.source}).`,
        })
      } else if (resolved.kind === 'ambiguous') {
        await recordAiAssistantMetric({
          event: 'query_ambiguous',
          user,
          details: `Consulta ambigua para "${resolved.normalizedQuery}" (${resolved.candidates.length} candidatos).`,
        })
      } else if (resolved.kind === 'not_found') {
        await recordAiAssistantMetric({
          event: 'query_not_found',
          user,
          details: `Nenhum projeto encontrado para "${resolved.normalizedQuery}".`,
        })
      }
    } catch (error) {
      setResult(null)
      await recordAiAssistantMetric({
        event: 'query_error',
        user,
        details: error instanceof Error ? error.message : 'Erro inesperado na consulta do assistente.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page ai-assistant-page">
      <header className="page__header">
        <h1 className="page__title">Assistente IA</h1>
        <p className="page__subtitle">Consulte o status executivo dos projetos em linguagem natural.</p>
      </header>

      <section className="panel ai-assistant__panel">
        <div className="ai-assistant__prompt">
          <label className="field">
            <span>Pergunta</span>
            <input
              className="input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex.: Como está o projeto da INNOVARE?"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void runQuery()
              }}
            />
          </label>
          <button type="button" className="btn btn--primary" onClick={() => void runQuery()} disabled={loading || !question.trim()}>
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
        </div>

        {result?.kind === 'ambiguous' ? (
          <div className="ai-assistant__state ai-assistant__state--warn">
            <strong>Encontrei mais de um projeto parecido.</strong>
            <p className="muted">Selecione o projeto correto para continuar:</p>
            <div className="ai-assistant__options">
              {result.candidates.map((candidate) => (
                <button
                  key={candidate.projectId}
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => void runQuery(candidate.projectId)}
                >
                  {candidate.projectName} ({Math.round(candidate.score * 100)}%)
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {result?.kind === 'not_found' ? (
          <div className="ai-assistant__state ai-assistant__state--warn">
            <strong>Nao encontrei um projeto com esse nome.</strong>
            <p className="muted">Tente outra variacao do nome comercial ou razao social.</p>
          </div>
        ) : null}

        {result?.kind === 'ok' ? (
          <article className="ai-assistant__answer">
            <header className="ai-assistant__answer-head">
              <h2>{result.snapshot.projectName}</h2>
              <span className={'pill ai-assistant__status ai-assistant__status--' + result.snapshot.statusExecutivo}>
                {result.snapshot.statusExecutivo}
              </span>
            </header>
            <p className="ai-assistant__summary">{result.summary}</p>
            <div className="ai-assistant__kpis">
              <div className="ai-assistant__kpi">
                <span>Proxima tarefa</span>
                <strong>{result.snapshot.proximaTarefa?.titulo ?? 'Nao definida'}</strong>
                <small>{result.snapshot.proximaTarefa?.data ? new Date(result.snapshot.proximaTarefa.data).toLocaleString('pt-BR') : '--'}</small>
              </div>
              <div className="ai-assistant__kpi">
                <span>Ultima concluida</span>
                <strong>{result.snapshot.ultimaConcluida?.titulo ?? 'Sem registro'}</strong>
                <small>{result.snapshot.ultimaConcluida?.data ? new Date(result.snapshot.ultimaConcluida.data).toLocaleString('pt-BR') : '--'}</small>
              </div>
              <div className="ai-assistant__kpi">
                <span>Conclusao</span>
                <strong>{result.snapshot.progressoPct}%</strong>
                <small>
                  {result.snapshot.tarefasConcluidas}/{result.snapshot.totalTarefas} tarefas
                </small>
              </div>
              <div className="ai-assistant__kpi">
                <span>Horas</span>
                <strong>
                  {result.snapshot.horasUsadas}h / {result.snapshot.horasContratadas}h
                </strong>
                <small>{result.snapshot.consumoPct}% consumido</small>
              </div>
            </div>
            <footer className="ai-assistant__meta">
              <span>
                Confianca do match: <strong>{result.snapshot.confidenceLevel}</strong> ({Math.round(result.snapshot.confidenceScore * 100)}%)
              </span>
              <span>
                Fonte: <strong>{result.source}</strong>
              </span>
            </footer>
            {result.snapshot.alerts.length > 0 ? (
              <ul className="ai-assistant__alerts">
                {result.snapshot.alerts.map((alert) => (
                  <li key={alert.tipo + alert.regraDisparada}>
                    <strong>{alert.tipo}</strong>: {alert.regraDisparada}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted ai-assistant__ok">Sem alertas executivos no momento.</p>
            )}
          </article>
        ) : null}
      </section>
    </div>
  )
}
