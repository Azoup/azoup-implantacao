import { useMemo, useState } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { RELEASE_NOTES, type ReleaseNoteCategory } from '../constants/releaseNotes'
import { APP_BRAND_NAME_FULL, APP_VERSION_DISPLAY } from '../constants/appMeta'
import { APP_TZ } from '../lib/dates'
import { renderReleaseNoteInline } from '../lib/releaseNoteRichText'
import {
  RELEASE_NOTE_CATEGORIES,
  filterReleaseNoteBundles,
  groupBundlesByBrDay,
  sortBundlesNewestFirst,
  type ReleaseNotesViewFilters,
} from '../lib/releaseNotesFilter'

const CATEGORY_LABEL: Record<ReleaseNoteCategory, string> = {
  BUG_FIX: 'Correção',
  MELHORIA: 'Melhoria',
  NOVA_FUNCAO: 'Nova função',
  DOCUMENTACAO: 'Documentação',
  SEGURANCA: 'Segurança',
  INFRA: 'Infraestrutura',
}

const emptyFilters: ReleaseNotesViewFilters = {
  search: '',
  tag: '',
  dateFrom: '',
  dateTo: '',
  categories: [],
}

/** Data de publicação no calendário de Brasília, formato numérico BR. */
function formatPublishedDateBr(iso: string): string {
  return formatInTimeZone(iso, APP_TZ, 'dd/MM/yyyy')
}

/** Horário local de Brasília (útil quando há mais de uma release no mesmo dia). */
function formatPublishedTimeBr(iso: string): string {
  return formatInTimeZone(iso, APP_TZ, 'HH:mm')
}

function filtersActive(f: ReleaseNotesViewFilters): boolean {
  return (
    f.search.trim() !== '' ||
    f.tag !== '' ||
    f.dateFrom.trim() !== '' ||
    f.dateTo.trim() !== '' ||
    f.categories.length > 0
  )
}

export function ReleaseNotesPage() {
  const [filters, setFilters] = useState<ReleaseNotesViewFilters>(emptyFilters)

  const sorted = useMemo(() => sortBundlesNewestFirst(RELEASE_NOTES), [])
  const tagOptions = useMemo(() => sorted.map((b) => b.tag), [sorted])

  const filtered = useMemo(
    () => filterReleaseNoteBundles(sorted, filters, APP_TZ),
    [sorted, filters],
  )

  const groupedByDay = useMemo(() => groupBundlesByBrDay(filtered, APP_TZ), [filtered])

  const clearCategories = () => setFilters((p) => ({ ...p, categories: [] }))

  return (
    <div className="page page--wide release-notes-page">
      <header className="page__header">
        <h1 className="page__title">Notas de atualização</h1>
        <p className="page__subtitle">
          Histórico do {APP_BRAND_NAME_FULL}. Versão neste navegador:{' '}
          <strong className="release-notes-page__current-ver">{APP_VERSION_DISPLAY}</strong>. O texto abaixo{' '}
          <strong>não é gerado automaticamente</strong> ao salvar ou compilar: vem de{' '}
          <code className="release-notes-page__kbd">src/constants/releaseNotes.ts</code> (e do{' '}
          <code className="release-notes-page__kbd">CHANGELOG.md</code>), atualizados quando se{' '}
          <strong>fecha um pacote</strong> (dia de entrega ou release que você pedir para versionar). Várias mudanças
          podem entrar na <strong>mesma versão</strong>. Datas no calendário de <strong>Brasília</strong> (
          <code className="release-notes-page__kbd">America/Sao_Paulo</code>), formato <strong>dd/mm/aaaa</strong>. Para
          registrar o próximo pacote, use <code className="release-notes-page__kbd">registrar-release-do-dia.bat</code>{' '}
          na raiz do repositório.
        </p>
      </header>

      <section className="panel release-notes-page__panel" aria-label="Histórico de versões">
        <div className="release-notes-page__toolbar">
          <div className="release-notes-page__toolbar-row release-notes-page__toolbar-row--grow">
            <label className="field">
              <span>Buscar</span>
              <input
                type="search"
                placeholder="Texto nas notas, versão ou etiqueta…"
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                autoComplete="off"
              />
            </label>
          </div>
          <div className="release-notes-page__toolbar-row release-notes-page__toolbar-row--filters">
            <label className="field">
              <span>Etiqueta (release)</span>
              <select value={filters.tag} onChange={(e) => setFilters((p) => ({ ...p, tag: e.target.value }))}>
                <option value="">Todas</option>
                {tagOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Data inicial (Brasília)</span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Data final (Brasília)</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
              />
            </label>
            {filtersActive(filters) && (
              <button type="button" className="btn btn--ghost btn--sm release-notes-page__clear" onClick={() => setFilters(emptyFilters)}>
                Limpar filtros
              </button>
            )}
          </div>
          <div className="release-notes-page__toolbar-block">
            <p className="release-notes-page__section-label">Tipos de mudança</p>
            <div className="release-notes-page__chips" role="group" aria-label="Filtrar por tipo de mudança">
              {RELEASE_NOTE_CATEGORIES.map((c) => {
                const narrowed = filters.categories.length > 0
                const pressed = narrowed && filters.categories.includes(c)
                const muted = narrowed && !pressed
                const cat = c.toLowerCase()
                return (
                  <button
                    key={c}
                    type="button"
                    className={`release-notes-page__chip release-notes-page__chip--${cat} ${pressed ? 'release-notes-page__chip--strong' : ''} ${muted ? 'release-notes-page__chip--muted' : ''}`}
                    onClick={() => {
                      setFilters((prev) => {
                        if (prev.categories.length === 0) {
                          return { ...prev, categories: [c] }
                        }
                        const set = new Set(prev.categories)
                        if (set.has(c)) set.delete(c)
                        else set.add(c)
                        const next = [...set]
                        return { ...prev, categories: next }
                      })
                    }}
                    aria-pressed={narrowed ? pressed : undefined}
                  >
                    {CATEGORY_LABEL[c]}
                  </button>
                )
              })}
              {filters.categories.length > 0 && (
                <button type="button" className="btn btn--ghost btn--sm" onClick={clearCategories}>
                  Todos os tipos
                </button>
              )}
            </div>
          </div>
          <p className="muted release-notes-page__meta" role="status">
            Mostrando <strong>{filtered.length}</strong> de <strong>{sorted.length}</strong> releases
            {filtersActive(filters) ? ' (filtros ativos)' : ''}.
          </p>
        </div>

        {filtered.length === 0 ? (
          <p className="muted release-notes-page__empty">Nenhuma release combina com os filtros. Ajuste a busca ou limpe os filtros.</p>
        ) : (
          <ul className="release-notes-page__list">
            {groupedByDay.map((day) => {
              const dayLabel = formatPublishedDateBr(day.bundles[0].releasedAt)
              const showTimeInRelease = day.bundles.length > 1
              return (
                <li key={day.dateKey} className="release-notes-page__day">
                  <div className="release-notes-page__day-head">
                    <h2 className="release-notes-page__day-label">{dayLabel}</h2>
                    <span className="release-notes-page__day-meta">
                      {day.bundles.length} release{day.bundles.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <ul className="release-notes-page__day-list">
                    {day.bundles.map((bundle) => (
                      <li key={bundle.tag} className="release-notes-page__release">
                        <header className="release-notes-page__release-head">
                          <div className="release-notes-page__release-titles">
                            <h3 className="release-notes-page__version">{bundle.versionDisplay}</h3>
                            <span className="release-notes-page__tag" title="Etiqueta de release">
                              {bundle.tag}
                            </span>
                          </div>
                          {showTimeInRelease ? (
                            <time
                              className="release-notes-page__when release-notes-page__when--time"
                              dateTime={bundle.releasedAt}
                              title="Horário de publicação (Brasília)"
                            >
                              {formatPublishedTimeBr(bundle.releasedAt)}
                            </time>
                          ) : null}
                        </header>
                        <ul className="release-notes-page__items">
                          {bundle.items.map((item, i) => (
                            <li key={i} className="release-notes-page__item">
                              <span
                                className={`release-notes-page__pill release-notes-page__pill--${item.category.toLowerCase()}`}
                              >
                                {CATEGORY_LABEL[item.category]}
                              </span>
                              <p className="release-notes-page__text">{renderReleaseNoteInline(item.text)}</p>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
