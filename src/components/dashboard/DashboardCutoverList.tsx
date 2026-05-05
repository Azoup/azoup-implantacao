import { Link } from 'react-router-dom'
import { formatDateTimePt } from '../../lib/dates'
import type { DashboardCutoverRow } from '../../types/dashboard'

type Props = {
  cutovers: DashboardCutoverRow[]
}

export function DashboardCutoverList({ cutovers }: Props) {
  return (
    <article className="dashboard-cc__card">
      <h3>Viradas no período</h3>
      {cutovers.length === 0 ? (
        <p className="dashboard-empty dashboard-empty--soft">Sem viradas marcadas no período.</p>
      ) : (
        cutovers.slice(0, 8).map((row) => (
          <Link key={row.id} to={`/projetos/${row.projectId}`} className="dashboard-cc__row">
            <strong>{row.projectName}</strong>
            <span>{row.title}</span>
            <small>{formatDateTimePt(row.occurredAt)}</small>
          </Link>
        ))
      )}
    </article>
  )
}
