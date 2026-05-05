import { Link } from 'react-router-dom'
import type { DashboardActionRow } from '../../types/dashboard'

type Props = {
  rows: DashboardActionRow[]
}

export function DashboardActionList({ rows }: Props) {
  return (
    <article className="dashboard-cc__card">
      <h3>Ações imediatas</h3>
      {rows.length === 0 ? (
        <p className="dashboard-empty dashboard-empty--soft">Sem ações críticas para o recorte atual.</p>
      ) : (
        rows.slice(0, 8).map((row) => (
          <Link key={row.id} to={`/projetos/${row.projectId}`} className="dashboard-cc__row">
            <strong>{row.projectName}</strong>
            <span>{row.reason}</span>
            <small>
              {row.ownerLabel} · prioridade {row.priority}
            </small>
          </Link>
        ))
      )}
    </article>
  )
}
