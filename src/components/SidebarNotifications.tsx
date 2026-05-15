import { createPortal } from 'react-dom'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bell } from 'lucide-react'
import { db } from '../db/database'
import { emptyProjects } from '../lib/stableDexieEmpty'
import { useAuth } from '../auth/AuthContext'
import { hasScope } from '../auth/permissions'
import { isProjectCheckinStale } from '../services/projectCheckin'
import { formatDatePt } from '../lib/dates'

type Props = {
  collapsed: boolean
  onNavigate?: () => void
}

const PANEL_W = 340

export function SidebarNotifications({ collapsed, onNavigate }: Props) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? emptyProjects

  const checkinStaleInProgress = useMemo(
    () => projects.filter((p) => p.status === 'ativo' && isProjectCheckinStale(p, 7)),
    [projects],
  )

  const totalUnread = checkinStaleInProgress.length

  const updatePanelPos = useCallback(() => {
    const el = btnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    let left = r.right + 10
    const top = Math.max(10, r.top - 4)
    if (left + PANEL_W > window.innerWidth - 12) {
      left = Math.max(12, r.left - PANEL_W - 10)
    }
    setPanelPos({ top, left })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updatePanelPos()
    const onResize = () => updatePanelPos()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open, collapsed, updatePanelPos])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (btnRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const closeAndNavigate = useCallback(() => {
    setOpen(false)
    onNavigate?.()
  }, [onNavigate])

  if (!user || !hasScope(user, 'projects.view')) return null

  const badgeLabel =
    totalUnread === 0
      ? 'Sem notificações nesta categoria'
      : `${totalUnread} projeto(s) em andamento com check-in pendente`

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={'sidebar-notify' + (open ? ' is-open' : '')}
        aria-label="Notificações"
        aria-expanded={open}
        aria-haspopup="dialog"
        title={badgeLabel}
        onClick={() => {
          setOpen((v) => !v)
        }}
      >
        <Bell className="sidebar-notify__icon" size={18} strokeWidth={2.1} absoluteStrokeWidth aria-hidden />
        {totalUnread > 0 ? (
          <span className="sidebar-notify__badge" aria-hidden>
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        ) : null}
      </button>

      {open
        ? createPortal(
            <>
              <div className="sidebar-notify-scrim" aria-hidden onClick={() => setOpen(false)} />
              <div
                ref={panelRef}
                className="sidebar-notify-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="sidebar-notify-title"
                style={{
                  top: panelPos.top,
                  left: panelPos.left,
                  width: PANEL_W,
                }}
              >
                <header className="sidebar-notify-panel__head">
                  <h2 id="sidebar-notify-title" className="sidebar-notify-panel__title">
                    Notificações
                  </h2>
                  <p className="sidebar-notify-panel__lead">
                    Central de avisos operacionais — novos tipos podem ser adicionados com o tempo.
                  </p>
                </header>

                <section className="sidebar-notify-section" aria-labelledby="sidebar-notify-checkin">
                  <h3 id="sidebar-notify-checkin" className="sidebar-notify-section__title">
                    Check-in pendente
                  </h3>
                  <p className="sidebar-notify-section__desc">
                    Projetos <strong>em andamento</strong> sem registro de check-in há mais de 7 dias — possivelmente
                    desatualizados em relação ao campo.
                  </p>
                  {checkinStaleInProgress.length === 0 ? (
                    <p className="sidebar-notify-section__empty muted">Nada pendente nesta categoria.</p>
                  ) : (
                    <ul className="sidebar-notify-list">
                      {checkinStaleInProgress.map((p) => (
                        <li key={p.id}>
                          <Link
                            to={`/projetos/${p.id}`}
                            className="sidebar-notify-list__link"
                            onClick={closeAndNavigate}
                          >
                            <span className="sidebar-notify-list__name">{p.projectName}</span>
                            <span className="sidebar-notify-list__meta">
                              Atualizado em:{' '}
                              {p.lastManualCheckinAt ? formatDatePt(p.lastManualCheckinAt, 'dd/MM/yyyy HH:mm') : '—'}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <footer className="sidebar-notify-panel__foot">
                  <Link to="/projetos" className="sidebar-notify-panel__cta" onClick={closeAndNavigate}>
                    Abrir página Projetos
                  </Link>
                </footer>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  )
}
