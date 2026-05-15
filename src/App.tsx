import { Suspense, type ReactNode } from 'react'
import { Navigate, Outlet, Route, createBrowserRouter, createRoutesFromElements } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { canAccessManuais, hasScope } from './auth/permissions'
import { ROUTE_SCOPE_MAP } from './auth/routeScopes'
import { AppShell } from './layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { AccessDeniedPage } from './pages/AccessDeniedPage'
import { RoutePageFallback } from './components/RoutePageFallback'
import {
  AgendaLayoutLazy,
  AgendaPageLazy,
  AgendaExecutionPageLazy,
  AgendaUnscheduledPageLazy,
  AiPageLazy,
  AnalystsPageLazy,
  DashboardPageLazy,
  ForgotPasswordPageLazy,
  ImplantationJourneyPageLazy,
  LogsPageLazy,
  ManualsPageLazy,
  OverviewPageLazy,
  PlanModelsPageLazy,
  PlanPresentationsPageLazy,
  PortalAgendaPageLazy,
  PortalHomePageLazy,
  PortalProjectPageLazy,
  PortalWelcomeFormPageLazy,
  ReleaseNotesPageLazy,
  ProjectDetailPageLazy,
  ProjectsPageLazy,
  RegisterPageLazy,
  ReportsPageLazy,
  ResetPasswordPageLazy,
  SettingsPageLazy,
  TarefasPageLazy,
  WelcomeFormsPageLazy,
} from './app/lazyPages'
import type { PermissionScope } from './db/types'
import { UnsavedChangesProvider } from './navigation/UnsavedChangesContext'

/** Garante `useAuth` / guards de alterações em toda a árvore do data router (evita “fora de AuthProvider”). */
function AppRootProviders() {
  return (
    <AuthProvider>
      <UnsavedChangesProvider>
        <Outlet />
      </UnsavedChangesProvider>
    </AuthProvider>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth()
  if (!ready) {
    return (
      <div className="boot">
        <div className="boot__inner">Carregando Implantação Azoup…</div>
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
  return <Suspense fallback={<RoutePageFallback />}>{children}</Suspense>
}

function RequireManuais({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return null
  if (!canAccessManuais(user)) return <AccessDeniedPage />
  return <Suspense fallback={<RoutePageFallback />}>{children}</Suspense>
}

function RootRedirect() {
  const { user } = useAuth()
  if (user?.userType === 'client') return <Navigate to="/portal" replace />
  return <Navigate to="/dashboard" replace />
}

/** Data router: necessário para `useBlocker` no AppShell (alterações não salvas na agenda). */
export const appRouter = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppRootProviders />}>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/cadastro"
        element={
          <Suspense fallback={<RoutePageFallback />}>
            <RegisterPageLazy />
          </Suspense>
        }
      />
      <Route
        path="/recuperar-senha"
        element={
          <Suspense fallback={<RoutePageFallback />}>
            <ForgotPasswordPageLazy />
          </Suspense>
        }
      />
      <Route
        path="/auth/redefinir-senha"
        element={
          <Suspense fallback={<RoutePageFallback />}>
            <ResetPasswordPageLazy />
          </Suspense>
        }
      />
      <Route
        path="/apresentacoes"
        element={
          <Suspense fallback={<RoutePageFallback />}>
            <PlanPresentationsPageLazy />
          </Suspense>
        }
      />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<RootRedirect />} />
        <Route
          path="/dashboard"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/dashboard']}>
              <DashboardPageLazy />
            </RequireScope>
          }
        />
        <Route
          path="/atualizacoes"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/atualizacoes']}>
              <ReleaseNotesPageLazy />
            </RequireScope>
          }
        />
        <Route
          path="/visao-geral"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/visao-geral']}>
              <OverviewPageLazy />
            </RequireScope>
          }
        />
        <Route
          path="/projetos"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/projetos']}>
              <ProjectsPageLazy />
            </RequireScope>
          }
        />
        <Route
          path="/projetos/:projectId"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/projetos/:projectId']}>
              <ProjectDetailPageLazy />
            </RequireScope>
          }
        />
        <Route
          path="/implantacao"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/implantacao']}>
              <ImplantationJourneyPageLazy />
            </RequireScope>
          }
        />
        <Route
          path="/formularios"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/formularios']}>
              <WelcomeFormsPageLazy />
            </RequireScope>
          }
        />
        <Route path="/manuais" element={<RequireManuais><ManualsPageLazy /></RequireManuais>} />
        <Route
          path="/tarefas"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/tarefas']}>
              <TarefasPageLazy />
            </RequireScope>
          }
        />
        <Route path="/demandas" element={<Navigate to="/tarefas" replace />} />
        <Route
          path="/agenda"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/agenda']}>
              <AgendaLayoutLazy />
            </RequireScope>
          }
        >
          <Route index element={<Navigate to="calendario" replace />} />
          <Route path="calendario" element={<AgendaPageLazy />} />
          <Route path="em-execucao" element={<AgendaExecutionPageLazy />} />
          <Route path="em-andamento" element={<Navigate to="/agenda/em-execucao" replace />} />
          <Route path="tarefas-nao-agendadas" element={<AgendaUnscheduledPageLazy />} />
        </Route>
        <Route
          path="/relatorios"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/relatorios']}>
              <ReportsPageLazy />
            </RequireScope>
          }
        />
        <Route
          path="/logs"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/logs']}>
              <LogsPageLazy />
            </RequireScope>
          }
        />
        <Route
          path="/assistente"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/assistente']}>
              <AiPageLazy />
            </RequireScope>
          }
        />
        <Route
          path="/configuracoes"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/configuracoes']}>
              <SettingsPageLazy />
            </RequireScope>
          }
        />
        <Route
          path="/modelos-planos"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/modelos-planos']}>
              <PlanModelsPageLazy />
            </RequireScope>
          }
        />
        <Route
          path="/analistas"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/analistas']}>
              <AnalystsPageLazy />
            </RequireScope>
          }
        />
        <Route
          path="/portal"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/portal']}>
              <PortalHomePageLazy />
            </RequireScope>
          }
        />
        <Route
          path="/portal/projetos/:projectId"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/portal/projetos/:projectId']}>
              <PortalProjectPageLazy />
            </RequireScope>
          }
        />
        <Route
          path="/portal/agenda"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/portal/agenda']}>
              <PortalAgendaPageLazy />
            </RequireScope>
          }
        />
        <Route
          path="/portal/boas-vindas/:projectId"
          element={
            <RequireScope scope={ROUTE_SCOPE_MAP['/portal/boas-vindas/:projectId']}>
              <PortalWelcomeFormPageLazy />
            </RequireScope>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Route>,
  ),
)
