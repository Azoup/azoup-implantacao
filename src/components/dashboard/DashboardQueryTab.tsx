import type { ReactNode } from 'react'
import type { DashboardQuerySubTab } from '../../types/dashboard'

type Props = {
  activeSubTab: DashboardQuerySubTab
  onChangeSubTab: (tab: DashboardQuerySubTab) => void
  projectsContent: ReactNode
  tasksContent: ReactNode
  cutoversContent: ReactNode
}

export function DashboardQueryTab({
  activeSubTab,
  onChangeSubTab,
  projectsContent,
  tasksContent,
  cutoversContent,
}: Props) {
  return (
    <section className="dashboard-cc__query">
      <div className="dashboard-cc__subtabs" role="tablist" aria-label="Consulta detalhada">
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'projects'}
          className={'dashboard-cc__subtab' + (activeSubTab === 'projects' ? ' is-active' : '')}
          onClick={() => onChangeSubTab('projects')}
        >
          Projetos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'tasks'}
          className={'dashboard-cc__subtab' + (activeSubTab === 'tasks' ? ' is-active' : '')}
          onClick={() => onChangeSubTab('tasks')}
        >
          Tarefas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'cutovers'}
          className={'dashboard-cc__subtab' + (activeSubTab === 'cutovers' ? ' is-active' : '')}
          onClick={() => onChangeSubTab('cutovers')}
        >
          Viradas
        </button>
      </div>

      <div className="dashboard-cc__query-content">
        {activeSubTab === 'projects' ? projectsContent : null}
        {activeSubTab === 'tasks' ? tasksContent : null}
        {activeSubTab === 'cutovers' ? cutoversContent : null}
      </div>
    </section>
  )
}
