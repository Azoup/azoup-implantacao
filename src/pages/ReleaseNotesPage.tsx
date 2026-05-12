import { useMemo } from 'react'
import { parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'
import { RELEASE_NOTES, type ReleaseNoteCategory } from '../constants/releaseNotes'
import { APP_BRAND_NAME_FULL, APP_VERSION_DISPLAY } from '../constants/appMeta'
import { APP_TZ } from '../lib/dates'

const CATEGORY_LABEL: Record<ReleaseNoteCategory, string> = {
  BUG_FIX: 'Correção',
  MELHORIA: 'Melhoria',
  NOVA_FUNCAO: 'Nova função',
  DOCUMENTACAO: 'Documentação',
  SEGURANCA: 'Segurança',
  INFRA: 'Infraestrutura',
}

export function ReleaseNotesPage() {
  const bundles = useMemo(() => [...RELEASE_NOTES].sort((a, b) => +parseISO(b.releasedAt) - +parseISO(a.releasedAt)), [])

  return (
    <div className="page page--wide release-notes-page">
      <header className="page__header">
        <h1 className="page__title">Notas de atualização</h1>
        <p className="page__subtitle">
          Histórico de versão do {APP_BRAND_NAME_FULL}. Versão instalada neste navegador:{' '}
          <strong className="release-notes-page__current-ver">{APP_VERSION_DISPLAY}</strong>. Datas abaixo em{' '}
          <strong>horário de Brasília</strong> (America/Sao_Paulo, UTC-3).
        </p>
      </header>

      <section className="panel release-notes-page__panel" aria-label="Histórico de versões">
        <ul className="release-notes-page__list">
          {bundles.map((bundle) => {
            const when = formatInTimeZone(bundle.releasedAt, APP_TZ, "EEEE, d 'de' MMMM 'de' yyyy 'às' HH:mm", {
              locale: ptBR,
            })
            return (
              <li key={bundle.tag} className="release-notes-page__release">
                <header className="release-notes-page__release-head">
                  <div className="release-notes-page__release-titles">
                    <h2 className="release-notes-page__version">{bundle.versionDisplay}</h2>
                    <span className="release-notes-page__tag" title="Etiqueta de release">
                      {bundle.tag}
                    </span>
                  </div>
                  <time className="release-notes-page__when" dateTime={bundle.releasedAt}>
                    {when}
                  </time>
                </header>
                <ul className="release-notes-page__items">
                  {bundle.items.map((item, i) => (
                    <li key={i} className="release-notes-page__item">
                      <span className={`release-notes-page__pill release-notes-page__pill--${item.category.toLowerCase()}`}>
                        {CATEGORY_LABEL[item.category]}
                      </span>
                      <p className="release-notes-page__text">{item.text}</p>
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
