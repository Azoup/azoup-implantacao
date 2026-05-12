import { useCallback, useEffect, useState } from 'react'
import { Outlet, useBlocker } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { UnsavedLeaveDialog } from '../components/UnsavedLeaveDialog'
import { useUnsavedChanges } from '../navigation/UnsavedChangesContext'
import { Sidebar } from './Sidebar'

const SIDEBAR_COLLAPSED_KEY = 'implantacao_azoup_sidebar_collapsed_v1'
const MOBILE_MQ = '(max-width: 960px)'

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

function locationsDiffer(a: { pathname: string; search: string; hash: string }, b: typeof a) {
  return a.pathname !== b.pathname || a.search !== b.search || a.hash !== b.hash
}

export function AppShell() {
  const { getActive } = useUnsavedChanges()
  const [leaveBusy, setLeaveBusy] = useState(false)

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const g = getActive()
    if (!g?.isDirty()) return false
    return locationsDiffer(currentLocation, nextLocation)
  })

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const g = getActive()
      if (g?.isDirty()) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [getActive])

  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MQ).matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const onChange = () => {
      setIsMobileLayout(mq.matches)
      if (!mq.matches) setMobileNavOpen(false)
    }
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed])

  useEffect(() => {
    if (!mobileNavOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileNavOpen])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((c) => !c)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        if (isMobileLayout) setMobileNavOpen((o) => !o)
        else setSidebarCollapsed((c) => !c)
      }
      if (e.key === 'Escape' && mobileNavOpen) setMobileNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMobileLayout, mobileNavOpen])

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), [])
  const sidebarCollapsedEffective = sidebarCollapsed && !isMobileLayout

  const blocked = blocker.state === 'blocked'
  const activeGuard = blocked ? getActive() : null
  const canSaveLeave = Boolean(activeGuard?.onSave)

  return (
    <div
      className={
        'shell' +
        (sidebarCollapsed ? ' shell--sidebar-collapsed' : '') +
        (mobileNavOpen ? ' shell--mobile-nav-open' : '')
      }
    >
      <button
        type="button"
        className="shell__mobile-menu-btn"
        onClick={() => setMobileNavOpen((o) => !o)}
        aria-expanded={mobileNavOpen}
        aria-label={mobileNavOpen ? 'Fechar menu' : 'Abrir menu'}
      >
        {mobileNavOpen ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
      </button>
      <div
        className="shell__nav-backdrop"
        aria-hidden
        role="presentation"
        onClick={closeMobileNav}
      />
      <Sidebar
        collapsed={sidebarCollapsedEffective}
        onToggleCollapse={toggleSidebar}
        onNavigate={isMobileLayout ? closeMobileNav : undefined}
      />
      <div className="shell__main">
        <Outlet />
      </div>

      <UnsavedLeaveDialog
        open={blocked}
        busy={leaveBusy}
        canSave={canSaveLeave}
        message={activeGuard?.message}
        onCancel={() => {
          if (blocker.state === 'blocked') blocker.reset()
        }}
        onDiscard={() => {
          if (blocker.state === 'blocked') blocker.proceed()
        }}
        onSaveAndLeave={async () => {
          const g = getActive()
          if (!g?.onSave) {
            if (blocker.state === 'blocked') blocker.proceed()
            return
          }
          setLeaveBusy(true)
          try {
            await g.onSave()
            if (blocker.state === 'blocked') blocker.proceed()
          } catch {
            // Mantém o diálogo aberto para o usuário tentar de novo ou sair sem gravar
          } finally {
            setLeaveBusy(false)
          }
        }}
      />
    </div>
  )
}
