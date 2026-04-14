import { NavLink, useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Briefcase,
  CalendarRange,
  ChartColumnIncreasing,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Gauge,
  Kanban,
  Library,
  LogOut,
  Moon,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Sun,
  UsersRound,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { hasScope } from '../auth/permissions'
import { useTheme } from '../theme/ThemeContext'
import { VyntaskLogo } from '../components/VyntaskLogo'
import { APP_VERSION_DISPLAY } from '../constants/appMeta'

type NavItem = { to: string; label: string; icon: LucideIcon; scope: Parameters<typeof hasScope>[1] }

const mainNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: Gauge, scope: 'dashboard.view' },
  { to: '/visao-geral', label: 'Visão Geral', icon: Kanban, scope: 'overview.view' },
  { to: '/projetos', label: 'Projetos', icon: Briefcase, scope: 'projects.view' },
  { to: '/tarefas', label: 'Tarefas', icon: ClipboardList, scope: 'tasks.view' },
  { to: '/agenda', label: 'Agenda', icon: CalendarRange, scope: 'agenda.view' },
  { to: '/relatorios', label: 'Relatórios', icon: ChartColumnIncreasing, scope: 'reports.view' },
  { to: '/assistente', label: 'Assistente IA', icon: Sparkles, scope: 'ai.view' },
]

const bottomNav: NavItem[] = [
  { to: '/configuracoes', label: 'Configurações', icon: SlidersHorizontal, scope: 'settings.view' },
  { to: '/modelos-planos', label: 'Modelos de Planos', icon: Library, scope: 'planModels.view' },
  { to: '/analistas', label: 'Analistas', icon: UsersRound, scope: 'analysts.view' },
]

const iconProps = { size: 20, strokeWidth: 1.75, absoluteStrokeWidth: true } as const
const iconPropsCollapsed = { size: 22, strokeWidth: 1.75, absoluteStrokeWidth: true } as const

type SidebarProps = {
  collapsed: boolean
  onToggleCollapse: () => void
  /** Fecha gaveta mobile após navegar */
  onNavigate?: () => void
}

export function Sidebar({ collapsed, onToggleCollapse, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const ThemeIcon = theme === 'dark' ? Sun : Moon
  const ip = collapsed ? iconPropsCollapsed : iconProps
  const visibleMainNav = mainNav.filter((x) => hasScope(user, x.scope))
  const visibleBottomNav = bottomNav.filter((x) => hasScope(user, x.scope))
  const canCreateProjects = hasScope(user, 'projects.edit')

  return (
    <aside className={'sidebar' + (collapsed ? ' sidebar--collapsed' : '')}>
      <div className="sidebar__brand sidebar__brand--interactive">
        <span className="sidebar__logo vyntask-logo-wrap" aria-hidden>
          <VyntaskLogo variant="brand" size={32} />
        </span>
        <div className="sidebar__brand-text">
          <div className="sidebar__title">
            <span className="sidebar__title-accent">Vyn</span>Task
          </div>
          <div className="sidebar__version">{APP_VERSION_DISPLAY}</div>
        </div>
      </div>

      <div className="sidebar__divider" aria-hidden />

      <button
        type="button"
        className="sidebar__rail-toggle"
        onClick={onToggleCollapse}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        title={collapsed ? 'Expandir (Ctrl+B)' : 'Recolher (Ctrl+B)'}
      >
        {collapsed ? <ChevronRight size={18} strokeWidth={2} /> : <ChevronLeft size={18} strokeWidth={2} />}
      </button>

      <div className="sidebar__scroll">
        <nav className="sidebar__nav" aria-label="Principal">
          {visibleMainNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => onNavigate?.()}
              className={({ isActive }) => 'sidebar__link' + (isActive ? ' is-active' : '')}
              title={collapsed ? label : undefined}
              aria-label={collapsed ? label : undefined}
            >
              <Icon className="sidebar__icon" aria-hidden {...ip} />
              <span className="sidebar__label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <nav className="sidebar__nav sidebar__nav--bottom" aria-label="Sistema">
          {visibleBottomNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => onNavigate?.()}
              className={({ isActive }) => 'sidebar__link' + (isActive ? ' is-active' : '')}
              title={collapsed ? label : undefined}
              aria-label={collapsed ? label : undefined}
            >
              <Icon className="sidebar__icon" aria-hidden {...ip} />
              <span className="sidebar__label">{label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            className="sidebar__link sidebar__link--btn"
            onClick={() => {
              toggle()
              onNavigate?.()
            }}
            title={collapsed ? (theme === 'dark' ? 'Modo claro' : 'Modo escuro') : undefined}
            aria-label={
              collapsed ? (theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro') : undefined
            }
          >
            <ThemeIcon className="sidebar__icon" aria-hidden {...ip} />
            <span className="sidebar__label">Modo {theme === 'dark' ? 'Claro' : 'Escuro'}</span>
          </button>
          <button
            type="button"
            className="sidebar__link sidebar__link--btn"
            onClick={() => {
              onNavigate?.()
              logout()
              navigate('/login', { replace: true })
            }}
            title={collapsed ? 'Sair' : undefined}
            aria-label={collapsed ? 'Sair' : undefined}
          >
            <LogOut className="sidebar__icon" aria-hidden {...ip} />
            <span className="sidebar__label">Sair</span>
          </button>
        </nav>

        <div className="sidebar__footer">
          {user?.name ? (
            <div className="sidebar__user">
              <span className="sidebar__user-name">{user.name}</span>
            </div>
          ) : null}

          {canCreateProjects ? (
            <button
              type="button"
              className={'btn btn--primary sidebar__cta' + (collapsed ? ' sidebar__cta--icon-only' : '')}
              onClick={() => {
                onNavigate?.()
                navigate('/projetos', { state: { openNew: true } })
              }}
              title={collapsed ? 'Novo projeto' : undefined}
              aria-label={collapsed ? 'Novo projeto' : undefined}
            >
              {collapsed ? (
                <Plus size={22} strokeWidth={2.25} absoluteStrokeWidth />
              ) : (
                '+ Novo projeto'
              )}
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
