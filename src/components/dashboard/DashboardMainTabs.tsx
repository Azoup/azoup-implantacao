export type DashboardMainTab = 'summary' | 'query'

type Props = {
  activeTab: DashboardMainTab
  onChange: (tab: DashboardMainTab) => void
}

export function DashboardMainTabs({ activeTab, onChange }: Props) {
  return (
    <div className="dashboard-cc__tabs" role="tablist" aria-label="Abas do dashboard">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'summary'}
        className={'dashboard-cc__tab' + (activeTab === 'summary' ? ' is-active' : '')}
        onClick={() => onChange('summary')}
      >
        Resumo
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'query'}
        className={'dashboard-cc__tab' + (activeTab === 'query' ? ' is-active' : '')}
        onClick={() => onChange('query')}
      >
        Consulta
      </button>
    </div>
  )
}
