import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Sidebar } from './Sidebar'

const SIDEBAR_COLLAPSED_KEY = 'vyntask_sidebar_collapsed_v1'
const MOBILE_MQ = '(max-width: 960px)'

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export function AppShell() {
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
    </div>
  )
}
