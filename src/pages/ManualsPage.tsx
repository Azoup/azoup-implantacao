import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { BookOpen, Search, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { MANUALS, type ManualAudience, type ManualDef } from '../constants/manualsCatalog'
import { manualMatchesQuery } from '../lib/manualsSearch'
import { WooCommerceIntegrationManual } from './manuals/WooCommerceIntegrationManual'
import './ManualsPage.css'

const MANUAL_COMPONENTS: Record<string, ComponentType> = {
  'woocommerce-azoup': WooCommerceIntegrationManual,
}

export function ManualsPage() {
  const { user } = useAuth()
  const isInternal = user?.userType !== 'client'

  const hasInternalManuals = useMemo(() => MANUALS.some((m) => m.audience === 'internal'), [])
  const hasClientManuals = useMemo(() => MANUALS.some((m) => m.audience === 'clients'), [])

  const showAudienceTabs = isInternal && hasInternalManuals && hasClientManuals

  const [tabAudience, setTabAudience] = useState<ManualAudience>(() =>
    hasInternalManuals ? 'internal' : 'clients',
  )

  const activeAudience: ManualAudience = !isInternal
    ? 'clients'
    : showAudienceTabs
      ? tabAudience
      : hasInternalManuals
        ? 'internal'
        : 'clients'

  const filtered = useMemo(() => MANUALS.filter((m) => m.audience === activeAudience), [activeAudience])

  const [searchQuery, setSearchQuery] = useState('')

  const visibleManuals = useMemo(
    () => filtered.filter((m) => manualMatchesQuery(m, searchQuery)),
    [filtered, searchQuery],
  )

  const [selectedId, setSelectedId] = useState<string | null>(() => MANUALS[0]?.id ?? null)

  useEffect(() => {
    setSelectedId((prev) => {
      const ids = visibleManuals.map((m) => m.id)
      if (prev != null && ids.includes(prev)) return prev
      return visibleManuals[0]?.id ?? null
    })
  }, [visibleManuals])

  const selected = useMemo(
    () => (selectedId ? MANUALS.find((m) => m.id === selectedId) ?? null : null),
    [selectedId],
  )

  const Body = selectedId ? MANUAL_COMPONENTS[selectedId] : undefined

  const indexLabel =
    activeAudience === 'internal' ? 'Documentação interna' : 'Materiais para clientes'

  const searchTrim = searchQuery.trim()
  const showNoSearchResults = searchTrim.length > 0 && visibleManuals.length === 0 && filtered.length > 0

  return (
    <div className="page page--wide manuals-page">
      <header className="manuals-page__intro">
        <div className="manuals-page__intro-inner">
          <h1 className="manuals-page__title">
            <span className="manuals-page__title-icon" aria-hidden>
              <BookOpen size={26} strokeWidth={1.75} absoluteStrokeWidth />
            </span>
            Manuais
          </h1>
          <p className="manuals-page__subtitle">
            {isInternal ? (
              <>
                Base de procedimentos da <strong>equipe Azoup</strong>. Conteúdo em{' '}
                <strong className="manuals-page__accent">Interno</strong> não deve ser tratado como material para cliente
                final; use a aba <strong>Clientes</strong> apenas quando existir documentação explícita para a base.
              </>
            ) : (
              <>Materiais disponíveis para a sua organização neste portal.</>
            )}
          </p>
        </div>
      </header>

      {showAudienceTabs ? (
        <div className="manuals-page__segmented" role="tablist" aria-label="Categoria de manuais">
          <button
            type="button"
            role="tab"
            aria-selected={tabAudience === 'internal'}
            className={'manuals-page__segment' + (tabAudience === 'internal' ? ' is-active' : '')}
            onClick={() => setTabAudience('internal')}
          >
            Interno — Azoup
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tabAudience === 'clients'}
            className={'manuals-page__segment' + (tabAudience === 'clients' ? ' is-active' : '')}
            onClick={() => setTabAudience('clients')}
          >
            Clientes
          </button>
        </div>
      ) : null}

      <div className="manuals-toolbar">
        <label className="manuals-search">
          <Search className="manuals-search__icon" size={18} strokeWidth={2} absoluteStrokeWidth aria-hidden />
          <input
            type="search"
            className="manuals-search__input"
            placeholder="Buscar por título, descrição ou palavra-chave…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            aria-label="Buscar manuais"
          />
          {searchTrim ? (
            <button
              type="button"
              className="manuals-search__clear"
              onClick={() => setSearchQuery('')}
              aria-label="Limpar busca"
            >
              <X size={18} strokeWidth={2} absoluteStrokeWidth aria-hidden />
            </button>
          ) : null}
        </label>
        <p className="manuals-toolbar__meta" role="status">
          {filtered.length === 0 ? (
            <>Nenhum manual nesta categoria.</>
          ) : showNoSearchResults ? (
            <>Nenhum resultado para &quot;{searchTrim}&quot;.</>
          ) : (
            <>
              {visibleManuals.length} de {filtered.length} manual(is)
              {searchTrim ? <> · filtrado</> : null}
            </>
          )}
        </p>
      </div>

      <div className="manuals-layout">
        <nav className="manuals-index" aria-label="Lista de manuais">
          <h2 className="manuals-index__title">{indexLabel}</h2>
          {filtered.length === 0 ? (
            <p className="manuals-empty">
              {activeAudience === 'clients'
                ? 'Nenhum manual para clientes cadastrado ainda.'
                : 'Nenhum manual interno nesta lista.'}
            </p>
          ) : showNoSearchResults ? (
            <p className="manuals-empty">
              Tente outro termo ou <button type="button" className="manuals-empty__link" onClick={() => setSearchQuery('')}>
                limpar a busca
              </button>
              .
            </p>
          ) : (
            <ul className="manuals-index__list">
              {visibleManuals.map((m: ManualDef) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className={'manuals-index__btn' + (m.id === selectedId ? ' is-active' : '')}
                    onClick={() => setSelectedId(m.id)}
                  >
                    {m.audience === 'internal' ? (
                      <span className="manuals-index__pill" aria-hidden>
                        Interno
                      </span>
                    ) : null}
                    <span className="manuals-index__btn-title">{m.title}</span>
                    <span className="manuals-index__btn-desc">{m.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <article className="manuals-reader">
          {!selected || !Body ? (
            <p className="manuals-empty">Selecione um manual na lista ao lado.</p>
          ) : (
            <>
              <header className="manuals-reader__meta">
                <div className="manuals-reader__meta-text">
                  <h2 className="manuals-reader__heading">{selected.title}</h2>
                  <p className="manuals-reader__intro">{selected.description}</p>
                </div>
                {selected.audience === 'internal' ? (
                  <span className="manuals-audience-badge">Uso interno</span>
                ) : (
                  <span className="manuals-audience-badge manuals-audience-badge--clients">Cliente</span>
                )}
              </header>
              <div className="manuals-reader__body">
                <Body />
              </div>
            </>
          )}
        </article>
      </div>
    </div>
  )
}
