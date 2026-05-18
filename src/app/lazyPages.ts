import { lazy } from 'react'

export const RegisterPageLazy = lazy(() => import('../pages/RegisterPage').then((m) => ({ default: m.RegisterPage })))
export const ForgotPasswordPageLazy = lazy(() =>
  import('../pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
)
export const ResetPasswordPageLazy = lazy(() =>
  import('../pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
)
export const PlanPresentationsPageLazy = lazy(() =>
  import('../pages/PlanPresentationsPage').then((m) => ({ default: m.PlanPresentationsPage })),
)
export const DashboardPageLazy = lazy(() => import('../pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
export const OverviewPageLazy = lazy(() => import('../pages/OverviewPage').then((m) => ({ default: m.OverviewPage })))
export const ProjectsPageLazy = lazy(() => import('../pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })))
export const ProjectDetailPageLazy = lazy(() =>
  import('../pages/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })),
)
export const TarefasPageLazy = lazy(() => import('../pages/TarefasPage').then((m) => ({ default: m.TarefasPage })))
export const AgendaLayoutLazy = lazy(() =>
  import('../pages/AgendaLayout').then((m) => ({ default: m.AgendaLayout })),
)
export const AgendaPageLazy = lazy(() => import('../pages/AgendaPage').then((m) => ({ default: m.AgendaPage })))
export const AgendaExecutionPageLazy = lazy(() =>
  import('../pages/AgendaExecutionPage').then((m) => ({ default: m.AgendaExecutionPage })),
)
export const AgendaUnscheduledPageLazy = lazy(() =>
  import('../pages/AgendaUnscheduledPage').then((m) => ({ default: m.AgendaUnscheduledPage })),
)
export const ReportsPageLazy = lazy(() => import('../pages/ReportsPage').then((m) => ({ default: m.ReportsPage })))
export const AiPageLazy = lazy(() => import('../pages/AiPage').then((m) => ({ default: m.AiPage })))
export const SettingsPageLazy = lazy(() => import('../pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
export const PlanModelsPageLazy = lazy(() => import('../pages/PlanModelsPage').then((m) => ({ default: m.PlanModelsPage })))
export const AnalystsPageLazy = lazy(() => import('../pages/AnalystsPage').then((m) => ({ default: m.AnalystsPage })))
export const ImplantationJourneyPageLazy = lazy(() =>
  import('../pages/ImplantationJourneyPage').then((m) => ({ default: m.ImplantationJourneyPage })),
)
export const WelcomeFormsPageLazy = lazy(() =>
  import('../pages/WelcomeFormsPage').then((m) => ({ default: m.WelcomeFormsPage })),
)
export const LogsPageLazy = lazy(() => import('../pages/LogsPage').then((m) => ({ default: m.LogsPage })))
export const ManualsPageLazy = lazy(() => import('../pages/ManualsPage').then((m) => ({ default: m.ManualsPage })))
export const PortalHomePageLazy = lazy(() =>
  import('../pages/portal/PortalHomePage').then((m) => ({ default: m.PortalHomePage })),
)
export const PortalProjectPageLazy = lazy(() =>
  import('../pages/portal/PortalProjectPage').then((m) => ({ default: m.PortalProjectPage })),
)
export const PortalAgendaPageLazy = lazy(() =>
  import('../pages/portal/PortalAgendaPage').then((m) => ({ default: m.PortalAgendaPage })),
)
export const PortalWelcomeFormPageLazy = lazy(() =>
  import('../pages/portal/PortalWelcomeFormPage').then((m) => ({ default: m.PortalWelcomeFormPage })),
)
