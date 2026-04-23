import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { emptyAuditLogs } from '../lib/stableDexieEmpty'
import { formatDatePt } from '../lib/dates'
import type { AuditAction } from '../db/types'

type ActionFilter = 'all' | AuditAction

function toLocalDateTimeInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function LogsPage() {
  const logs = useLiveQuery(() => db.auditLogs.orderBy('createdAt').reverse().toArray(), []) ?? emptyAuditLogs
  const [fromAt, setFromAt] = useState('')
  const [toAt, setToAt] = useState('')
  const [action, setAction] = useState<ActionFilter>('all')
  const [userFilter, setUserFilter] = useState('')

  const filtered = useMemo(() => {
    const fromMs = fromAt ? new Date(fromAt).getTime() : Number.NEGATIVE_INFINITY
    const toMs = toAt ? new Date(toAt).getTime() : Number.POSITIVE_INFINITY
    const userNeedle = userFilter.trim().toLowerCase()
    return logs.filter((l) => {
      const t = new Date(l.createdAt).getTime()
      if (t < fromMs || t > toMs) return false
      if (action !== 'all' && l.action !== action) return false
      if (userNeedle) {
        const text = `${l.userName} ${l.userEmail}`.toLowerCase()
        if (!text.includes(userNeedle)) return false
      }
      return true
    })
  }, [logs, fromAt, toAt, action, userFilter])

  return (
    <div className="page page--wide">
      <header className="page__header">
        <h1 className="page__title">Logs de auditoria</h1>
        <p className="page__subtitle">Inclusões, alterações e exclusões com usuário, data/hora e justificativa.</p>
      </header>

      <section className="panel logs-panel">
        <div className="logs-filter-grid">
          <label className="field">
            <span>De (data/hora)</span>
            <input type="datetime-local" className="input" value={fromAt} onChange={(e) => setFromAt(e.target.value)} />
          </label>
          <label className="field">
            <span>Até (data/hora)</span>
            <input type="datetime-local" className="input" value={toAt} onChange={(e) => setToAt(e.target.value)} />
          </label>
          <label className="field">
            <span>Ação</span>
            <select className="input" value={action} onChange={(e) => setAction(e.target.value as ActionFilter)}>
              <option value="all">Todas</option>
              <option value="inclusao">Inclusão</option>
              <option value="alteracao">Alteração</option>
              <option value="exclusao">Exclusão</option>
            </select>
          </label>
          <label className="field">
            <span>Usuário</span>
            <input
              className="input"
              placeholder="Nome ou e-mail"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="panel logs-panel">
        <div className="logs-head-row">
          <strong>{filtered.length}</strong> registro(s)
        </div>
        {filtered.length === 0 ? (
          <p className="muted">Nenhum log para os filtros informados.</p>
        ) : (
          <div className="table-wrap">
            <table className="table logs-table">
              <thead>
                <tr>
                  <th>Data/hora</th>
                  <th>Ação</th>
                  <th>Usuário</th>
                  <th>Entidade</th>
                  <th>Item</th>
                  <th>Detalhes</th>
                  <th>Justificativa</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <span title={toLocalDateTimeInput(l.createdAt)}>
                        {formatDatePt(l.createdAt)} {formatDatePt(l.createdAt, 'HH:mm:ss')}
                      </span>
                    </td>
                    <td>
                      <span className={'pill logs-pill logs-pill--' + l.action}>{l.action}</span>
                    </td>
                    <td>
                      <div className="logs-user">
                        <div>{l.userName}</div>
                        <small className="muted">{l.userEmail}</small>
                      </div>
                    </td>
                    <td>{l.entity}</td>
                    <td>{l.entityLabel}</td>
                    <td>{l.details}</td>
                    <td>{l.justification ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
