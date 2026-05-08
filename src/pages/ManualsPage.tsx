import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react'
import { BookOpen, FileDown, Printer, Search, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { AzoupLogoMark } from '../components/AzoupLogoMark'
import { APP_BRAND_NAME_FULL, APP_VERSION_DISPLAY } from '../constants/appMeta'
import {
  MANUAL_CATEGORIES,
  MANUAL_CATEGORY_ORDER,
  MANUALS,
  type ManualAudience,
  type ManualCategoryId,
  type ManualDef,
} from '../constants/manualsCatalog'
import { manualMatchesQuery } from '../lib/manualsSearch'
import { GoogleDriveFtpManual } from './manuals/GoogleDriveFtpManual'
import { WooCommerceIntegrationManual } from './manuals/WooCommerceIntegrationManual'
import './ManualsPage.css'

const MANUAL_COMPONENTS: Record<string, ComponentType> = {
  'woocommerce-azoup': WooCommerceIntegrationManual,
  'google-drive-ftp-azoup': GoogleDriveFtpManual,
}

type GroupedManuals = {
  category: ManualCategoryId
  label: string
  pathLabel: string
  description: string
  items: ManualDef[]
}[]

function groupManualsByCategory(list: ManualDef[]): GroupedManuals {
  return MANUAL_CATEGORY_ORDER.map((categoryId) => {
    const meta = MANUAL_CATEGORIES[categoryId]
    return {
      category: categoryId,
      label: meta.label,
      pathLabel: meta.pathLabel,
      description: meta.description,
      items: list.filter((m) => m.category === categoryId),
    }
  }).filter((g) => g.items.length > 0)
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

  const groupedVisible = useMemo(() => groupManualsByCategory(visibleManuals), [visibleManuals])

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

  /**
   * Imagens com `loading="lazy"` (ou dentro de elementos `display:none` como
   * a letterhead do PDF) podem não estar carregadas no momento do print —
   * força carregamento eager antes de `window.print()` com timeout de
   * segurança para nunca travar o usuário esperando rede.
   */
  const handlePrint = useCallback(async () => {
    if (typeof window === 'undefined') return
    const previousTitle = typeof document !== 'undefined' ? document.title : ''
    if (selected && typeof document !== 'undefined') {
      const safeTitle = selected.title.replace(/[\\/:*?"<>|]+/g, ' ').trim()
      document.title = `${safeTitle} — ${APP_BRAND_NAME_FULL}`
    }
    try {
      const imgs = document.querySelectorAll<HTMLImageElement>('.manuals-reader img')
      await Promise.all(
        Array.from(imgs).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete && img.naturalWidth > 0) {
                resolve()
                return
              }
              img.loading = 'eager'
              const done = () => resolve()
              img.addEventListener('load', done, { once: true })
              img.addEventListener('error', done, { once: true })
              window.setTimeout(done, 2500)
            }),
        ),
      )
      window.print()
    } finally {
      if (typeof document !== 'undefined' && previousTitle) {
        document.title = previousTitle
      }
    }
  }, [selected])

  const printedDate = useMemo(() => {
    try {
      return new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return ''
    }
  }, [])

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
              Tente outro termo ou{' '}
              <button type="button" className="manuals-empty__link" onClick={() => setSearchQuery('')}>
                limpar a busca
              </button>
              .
            </p>
          ) : (
            <div className="manuals-index__groups">
              {groupedVisible.map((group) => (
                <section
                  key={group.category}
                  className="manuals-index__group"
                  aria-label={group.pathLabel}
                >
                  <header className="manuals-index__group-head">
                    <span className="manuals-index__group-folder" aria-hidden>
                      {/* "pastinha" simbólica desenhada via CSS */}
                    </span>
                    <h3 className="manuals-index__group-title" title={group.description}>
                      {group.label}
                    </h3>
                    <span className="manuals-index__group-count" aria-hidden>
                      {group.items.length}
                    </span>
                  </header>
                  <ul className="manuals-index__list">
                    {group.items.map((m: ManualDef) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          className={'manuals-index__btn' + (m.id === selectedId ? ' is-active' : '')}
                          onClick={() => setSelectedId(m.id)}
                        >
                          <span className="manuals-index__btn-title">{m.title}</span>
                          <span className="manuals-index__btn-desc">{m.description}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </nav>

        <article className="manuals-reader">
          {!selected || !Body ? (
            <p className="manuals-empty">Selecione um manual na lista ao lado.</p>
          ) : (
            <>
              {/* Cabeçalho institucional — visível apenas no PDF/impressão */}
              <header className="manuals-reader__letterhead" aria-hidden>
                <div className="manuals-reader__letterhead-brand">
                  <AzoupLogoMark size={42} />
                  <div className="manuals-reader__letterhead-titles">
                    <p className="manuals-reader__letterhead-product">
                      {APP_BRAND_NAME_FULL}{' '}
                      <span className="manuals-reader__letterhead-version">{APP_VERSION_DISPLAY}</span>
                    </p>
                    <p className="manuals-reader__letterhead-section">
                      Manuais · {MANUAL_CATEGORIES[selected.category].pathLabel}
                    </p>
                  </div>
                </div>
                <div className="manuals-reader__letterhead-meta">
                  <p className="manuals-reader__letterhead-doc-title">{selected.title}</p>
                  <p className="manuals-reader__letterhead-stamp">
                    {selected.audience === 'internal' ? 'Uso interno · Equipe Azoup' : 'Material para clientes'}
                    {printedDate ? <> · Gerado em {printedDate}</> : null}
                  </p>
                </div>
              </header>

              <header className="manuals-reader__meta">
                <div className="manuals-reader__meta-text">
                  <p className="manuals-reader__crumbs" aria-label="Categoria do manual">
                    {MANUAL_CATEGORIES[selected.category].pathLabel}
                  </p>
                  <h2 className="manuals-reader__heading">{selected.title}</h2>
                  <p className="manuals-reader__intro">{selected.description}</p>
                </div>
                <div className="manuals-reader__meta-aside">
                  <div className="manuals-reader__actions" role="toolbar" aria-label="Ações do manual">
                    <button
                      type="button"
                      className="manuals-reader__action manuals-reader__action--primary"
                      onClick={handlePrint}
                      title="Abre o diálogo de impressão. Em 'Destino', escolha 'Salvar como PDF'."
                    >
                      <FileDown size={16} strokeWidth={2} absoluteStrokeWidth aria-hidden />
                      <span>Baixar PDF</span>
                    </button>
                    <button
                      type="button"
                      className="manuals-reader__action"
                      onClick={handlePrint}
                      title="Imprimir este manual"
                      aria-label="Imprimir manual"
                    >
                      <Printer size={16} strokeWidth={2} absoluteStrokeWidth aria-hidden />
                      <span className="manuals-reader__action-label-compact">Imprimir</span>
                    </button>
                  </div>
                  {selected.audience === 'internal' ? (
                    <span className="manuals-audience-badge">Uso interno</span>
                  ) : (
                    <span className="manuals-audience-badge manuals-audience-badge--clients">Cliente</span>
                  )}
                </div>
              </header>
              <div className="manuals-reader__body">
                <Body />
              </div>

              {/* Rodapé institucional — visível apenas no PDF/impressão */}
              <footer className="manuals-reader__print-footer" aria-hidden>
                <span>{APP_BRAND_NAME_FULL}</span>
                <span>·</span>
                <span>{selected.title}</span>
                <span>·</span>
                <span>azoup.com.br</span>
              </footer>
            </>
          )}
        </article>
      </div>
    </div>
  )
}
