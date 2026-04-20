import { Navigate, Route, createBrowserRouter, createRoutesFromElements } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './auth/AuthContext'
import { hasScope } from './auth/permissions'
import { ROUTE_SCOPE_MAP } from './auth/routeScopes'
import { AppShell } from './layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { OverviewPage } from './pages/OverviewPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { TarefasPage } from './pages/TarefasPage'
import { AgendaPage } from './pages/AgendaPage'
import { ReportsPage } from './pages/ReportsPage'
import { AiPage } from './pages/AiPage'
import { SettingsPage } from './pages/SettingsPage'
import { PlanModelsPage } from './pages/PlanModelsPage'
import { PlanPresentationsPage } from './pages/PlanPresentationsPage'
import { AnalystsPage } from './pages/AnalystsPage'
import { ImplantationJourneyPage } from './pages/ImplantationJourneyPage'
import { AccessDeniedPage } from './pages/AccessDeniedPage'
import { LogsPage } from './pages/LogsPage'
import type { PermissionScope } from './db/types'

function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth()
  if (!ready) {
    return (
      <div className="boot">
        <div className="boot__inner">Carregando VynTask…</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireScope({ scope, children }: { scope: PermissionScope; children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return null
  if (!hasScope(user, scope)) return <AccessDeniedPage />
  return children
}

/** Data router: necessário para `useBlocker` no AppShell (alterações não salvas na agenda). */
export const appRouter = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
      <Route path="/auth/redefinir-senha" element={<ResetPasswordPage />} />
      <Route path="/apresentacoes" element={<PlanPresentationsPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/dashboard']}>
              <DashboardPage />
            </RequireScope>
          }
        />
        <Route
          path="/visao-geral"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/visao-geral']}>
              <OverviewPage />
            </RequireScope>
          }
        />
        <Route
          path="/projetos"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/projetos']}>
              <ProjectsPage />
            </RequireScope>
          }
        />
        <Route
          path="/projetos/:projectId"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/projetos/:projectId']}>
              <ProjectDetailPage />
            </RequireScope>
          }
        />
        <Route
          path="/implantacao"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/implantacao']}>
              <ImplantationJourneyPage />
            </RequireScope>
          }
        />
        <Route
          path="/tarefas"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/tarefas']}>
              <TarefasPage />
            </RequireScope>
          }
        />
        <Route path="/demandas" element={<Navigate to="/tarefas" replace />} />
        <Route
          path="/agenda"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/agenda']}>
              <AgendaPage />
            </RequireScope>
          }
        />
        <Route
          path="/relatorios"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/relatorios']}>
              <ReportsPage />
            </RequireScope>
          }
        />
        <Route
          path="/logs"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/logs']}>
              <LogsPage />
            </RequireScope>
          }
        />
        <Route
          path="/assistente"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/assistente']}>
              <AiPage />
            </RequireScope>
          }
        />
        <Route
          path="/configuracoes"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/configuracoes']}>
              <SettingsPage />
            </RequireScope>
          }
        />
        <Route
          path="/modelos-planos"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/modelos-planos']}>
              <PlanModelsPage />
            </RequireScope>
          }
        />
        <Route
          path="/analistas"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/analistas']}>
              <AnalystsPage />
            </RequireScope>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </>,
  ),
)
