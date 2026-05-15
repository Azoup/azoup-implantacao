import { AgendaMiniMonth } from '../AgendaMiniMonth'
import type { DbAnalyst, DbProject } from '../../db/types'
import {
  isAnalystFilterAll,
  isAnalystFilterUnassigned,
  isAnalystSelected,
  setAnalystFilterAll,
  setAnalystFilterUnassigned,
  toggleAnalystInFilter,
  type AnalystFilter,
} from '../../lib/agendaAnalystFilter'
import { isGoogleCalendarSyncEnabled } from '../../services/calendarPushQueue'

export type AgendaSidebarProps = {
  monthCursor: Date
  todayKey: string
  daysWithEvents: Set<string>
  onSelectDay: (d: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  analysts: DbAnalyst[]
  analystFilter: AnalystFilter
  onAnalystFilterChange: (next: AnalystFilter) => void
  projectsForPickers: DbProject[]
  agendaProjectFilterId: string | null
  onProjectFilterChange: (id: string | null) => void
  googleSyncBusy: boolean
  onGoogleSync: () => void
  collapsed?: boolean
}

export function AgendaSidebar({
  monthCursor,
  todayKey,
  daysWithEvents,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  analysts,
  analystFilter,
  onAnalystFilterChange,
  projectsForPickers,
  agendaProjectFilterId,
  onProjectFilterChange,
  googleSyncBusy,
  onGoogleSync,
  collapsed = false,
}: AgendaSidebarProps) {
  const activeAnalysts = analysts.filter((a) => a.active)

  return (
    <aside
      id="agenda-gc-sidebar"
      className={'agenda-gc-sidebar panel' + (collapsed ? ' is-collapsed' : '')}
      aria-label="Mini calendário e analistas"
      aria-hidden={collapsed}
    >
      <div className="agenda-gc-sidebar__body">
        <AgendaMiniMonth
          anchor={monthCursor}
          todayKeyStr={todayKey}
          daysWithEvents={daysWithEvents}
          onSelectDay={onSelectDay}
          onPrevMonth={onPrevMonth}
          onNextMonth={onNextMonth}
        />
        <section className="agenda-gc-legend" aria-label="Analistas visíveis">
          <div className="agenda-gc-legend__head">
            <h3 className="agenda-gc-legend__title">Analistas</h3>
            <button
              type="button"
              className="agenda-gc-legend__show-all"
              onClick={() => onAnalystFilterChange(setAnalystFilterAll())}
            >
              Mostrar todos
            </button>
          </div>
          <p className="agenda-gc-legend__hint muted">
            Marque quem aparece na grade. A cor do evento segue o analista.
          </p>
          <label className="agenda-gc-legend__row agenda-gc-legend__row--check">
            <input
              type="checkbox"
              className="agenda-gc-legend__input"
              checked={isAnalystFilterAll(analystFilter)}
              onChange={() => onAnalystFilterChange(setAnalystFilterAll())}
            />
            <span
              className={'agenda-gc-legend__checkbox' + (isAnalystFilterAll(analystFilter) ? ' is-checked' : '')}
              aria-hidden
            />
            <span className="agenda-gc-legend__label">Todos os analistas</span>
          </label>
          {activeAnalysts.map((a) => {
            const checked = isAnalystSelected(analystFilter, a.id)
            return (
              <label key={a.id} className="agenda-gc-legend__row agenda-gc-legend__row--check">
                <input
                  type="checkbox"
                  className="agenda-gc-legend__input"
                  checked={checked}
                  onChange={() => onAnalystFilterChange(toggleAnalystInFilter(analystFilter, a.id))}
                />
                <span
                  className={'agenda-gc-legend__checkbox' + (checked ? ' is-checked' : '')}
                  style={{ ['--analyst-color' as string]: a.color }}
                  aria-hidden
                />
                <span className="agenda-gc-legend__label">{a.name}</span>
              </label>
            )
          })}
          <label className="agenda-gc-legend__row agenda-gc-legend__row--check">
            <input
              type="checkbox"
              className="agenda-gc-legend__input"
              checked={isAnalystFilterUnassigned(analystFilter)}
              onChange={() => onAnalystFilterChange(setAnalystFilterUnassigned())}
            />
            <span
              className={
                'agenda-gc-legend__checkbox agenda-gc-legend__checkbox--unassigned' +
                (isAnalystFilterUnassigned(analystFilter) ? ' is-checked' : '')
              }
              aria-hidden
            />
            <span className="agenda-gc-legend__label">Sem responsável</span>
          </label>
        </section>
        <label className="field agenda-gc-project-filter">
          <span>Projeto na grade</span>
          <select
            className="input"
            value={agendaProjectFilterId ?? ''}
            onChange={(e) => onProjectFilterChange(e.target.value || null)}
          >
            <option value="">Todos os projetos</option>
            {projectsForPickers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.projectName}
              </option>
            ))}
          </select>
        </label>
        <div className="agenda-google-card">
          <h3 className="agenda-google-card__title">Google Agenda</h3>
          {isGoogleCalendarSyncEnabled() ? (
            <>
              <p className="agenda-google-card__text muted">
                Compromissos criados aqui vão para a sub-agenda Google do analista. Eventos só no Google são importados
                ao sincronizar.
              </p>
              <button
                type="button"
                className="btn btn--secondary btn--sm agenda-google-card__sync"
                disabled={googleSyncBusy}
                onClick={onGoogleSync}
              >
                {googleSyncBusy ? 'Sincronizando…' : 'Sincronizar Google Agenda'}
              </button>
            </>
          ) : (
            <p className="agenda-google-card__text muted">
              Sincronização automática exige{' '}
              <code className="agenda-google-card__code">VITE_GOOGLE_CALENDAR_SYNC=true</code>.
            </p>
          )}
        </div>
      </div>
    </aside>
  )
}
