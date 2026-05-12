import { useCallback, useState } from 'react'
import { AlertTriangle, Database, Download, Loader2 } from 'lucide-react'
import {
  consolidateRescheduleChains,
  diagnoseRescheduleChains,
  snapshotForMigration,
  type ConsolidationOutcome,
  type RescheduleChainDiagnosis,
} from '../services/rescheduleChainMigration'

type Props = {
  actorUserId?: string
}

/**
 * Painel admin para migração consolidadora de cadeias rescheduledFromTaskId/rescheduledToTaskId.
 * Três estágios: Diagnosticar → Backup (download JSON) → Executar.
 */
export function RescheduleChainMigrationPanel({ actorUserId }: Props) {
  const [diagnosis, setDiagnosis] = useState<RescheduleChainDiagnosis | null>(null)
  const [busy, setBusy] = useState<'idle' | 'diagnose' | 'backup' | 'execute'>('idle')
  const [backupDownloaded, setBackupDownloaded] = useState(false)
  const [outcome, setOutcome] = useState<ConsolidationOutcome | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const runDiagnose = useCallback(async () => {
    setBusy('diagnose')
    setErrorMessage(null)
    setOutcome(null)
    setBackupDownloaded(false)
    try {
      const result = await diagnoseRescheduleChains()
      setDiagnosis(result)
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Falha ao diagnosticar.')
    } finally {
      setBusy('idle')
    }
  }, [])

  const runBackup = useCallback(async () => {
    if (!diagnosis) return
    setBusy('backup')
    setErrorMessage(null)
    try {
      const snapshot = await snapshotForMigration(diagnosis)
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `implantacao-azoup-reschedule-migration-snapshot-${snapshot.capturedAt.replace(/[:.]/g, '-')}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setBackupDownloaded(true)
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Falha ao gerar backup.')
    } finally {
      setBusy('idle')
    }
  }, [diagnosis])

  const runExecute = useCallback(async () => {
    if (!diagnosis) return
    if (!backupDownloaded) {
      setErrorMessage('Faça o backup antes de executar a consolidação.')
      return
    }
    setBusy('execute')
    setErrorMessage(null)
    try {
      const result = await consolidateRescheduleChains(diagnosis, actorUserId)
      setOutcome(result)
      const updated = await diagnoseRescheduleChains()
      setDiagnosis(updated)
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Falha na execução.')
    } finally {
      setBusy('idle')
    }
  }, [diagnosis, backupDownloaded, actorUserId])

  return (
    <section
      className="panel panel--stack"
      aria-labelledby="reschedule-migration-title"
      id="reschedule-chain-migration"
    >
      <div className="page__header page__header--split" style={{ padding: 0, border: 0 }}>
        <div>
          <h2 id="reschedule-migration-title" className="panel__title">
            Migração: consolidar cadeias de reagendamento
          </h2>
          <p className="muted panel__lead">
            Mescla tarefas legadas criadas pelo antigo fluxo de reagendamento (1:1) no modelo novo 1 Tarefa : N Eventos.
            Eventos, comentários, horas e sessões das filhas são re-apontados para a tarefa-raiz.
          </p>
        </div>
      </div>

      <div className="settings-console-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={runDiagnose}
          disabled={busy !== 'idle'}
        >
          {busy === 'diagnose' ? <Loader2 size={14} className="spin" /> : <Database size={14} />}
          <span style={{ marginLeft: '0.35rem' }}>1. Diagnosticar (read-only)</span>
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={runBackup}
          disabled={!diagnosis || busy !== 'idle' || (diagnosis.cleanChains.length === 0 && diagnosis.quarantineChains.length === 0)}
        >
          {busy === 'backup' ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
          <span style={{ marginLeft: '0.35rem' }}>2. Gerar backup JSON</span>
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={runExecute}
          disabled={!diagnosis || !backupDownloaded || busy !== 'idle' || diagnosis.cleanChains.length === 0}
        >
          {busy === 'execute' ? <Loader2 size={14} className="spin" /> : <AlertTriangle size={14} />}
          <span style={{ marginLeft: '0.35rem' }}>3. Executar consolidação</span>
        </button>
      </div>

      {errorMessage ? (
        <p className="muted" style={{ color: 'var(--danger)' }}>
          {errorMessage}
        </p>
      ) : null}

      {diagnosis ? (
        <div className="settings-console-kpis" style={{ marginTop: '0.6rem' }}>
          <div className="settings-console-kpi">
            <strong className="settings-console-kpi__label">Cadeias prontas</strong>
            <span className="settings-console-kpi__value">{diagnosis.cleanChains.length}</span>
          </div>
          <div className="settings-console-kpi">
            <strong className="settings-console-kpi__label">Em quarentena</strong>
            <span className="settings-console-kpi__value">{diagnosis.quarantineChains.length}</span>
          </div>
          <div className="settings-console-kpi">
            <strong className="settings-console-kpi__label">Já consolidadas</strong>
            <span className="settings-console-kpi__value">{diagnosis.alreadyConsolidatedChains.length}</span>
          </div>
          <div className="settings-console-kpi">
            <strong className="settings-console-kpi__label">Tarefas afetadas</strong>
            <span className="settings-console-kpi__value">{diagnosis.totals.affectedTasks}</span>
          </div>
          <div className="settings-console-kpi">
            <strong className="settings-console-kpi__label">Cadeia mais longa</strong>
            <span className="settings-console-kpi__value">{diagnosis.totals.longestChain}</span>
          </div>
          <div className="settings-console-kpi">
            <strong className="settings-console-kpi__label">Órfãos</strong>
            <span className="settings-console-kpi__value">{diagnosis.orphanTaskIds.length}</span>
          </div>
        </div>
      ) : null}

      {diagnosis && diagnosis.quarantineChains.length > 0 ? (
        <details className="settings-console-summary__details" open>
          <summary>Cadeias em quarentena ({diagnosis.quarantineChains.length})</summary>
          <ul className="muted" style={{ maxHeight: '12rem', overflow: 'auto' }}>
            {diagnosis.quarantineChains.map((c) => (
              <li key={c.rootTaskId}>
                Raiz <code>{c.rootTaskId}</code> · {c.nodes.length} nós · {c.hasCycle ? 'ciclo' : ''} {c.hasBranch ? 'bifurcação' : ''}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {outcome ? (
        <div
          className="settings-console-summary"
          style={{ borderRadius: 8, padding: '0.6rem', marginTop: '0.6rem' }}
        >
          <strong>Resultado da execução</strong>
          <p className="muted" style={{ margin: '0.3rem 0' }}>
            Consolidadas: <strong>{outcome.consolidatedCount}</strong> · Já feitas (skip): {outcome.skippedCount} · Erros: {outcome.errors.length}
          </p>
          {outcome.errors.length > 0 ? (
            <ul className="muted" style={{ color: 'var(--danger)', maxHeight: '8rem', overflow: 'auto' }}>
              {outcome.errors.map((err) => (
                <li key={err.rootTaskId}>
                  <code>{err.rootTaskId}</code>: {err.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
