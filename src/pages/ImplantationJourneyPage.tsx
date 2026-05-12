import { Fragment } from 'react'
import type { ReactNode } from 'react'
import {
  BarChart3,
  BookMarked,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Flag,
  Headphones,
  Mail,
  MessageCircle,
  MessagesSquare,
  PencilLine,
  Printer,
  Ticket,
  Upload,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  IMPLANTATION_JOURNEY_INTRO,
  IMPLANTATION_JOURNEY_STEPS,
  IMPLANTATION_TOOL_LINES,
  type ImplantationJourneyIconKey,
  type ImplantationToolPart,
} from '../constants/implantationJourney'
import { AzoupLogoMark } from '../components/AzoupLogoMark'
import './ImplantationJourneyPage.css'

const ICON_MAP: Record<ImplantationJourneyIconKey, LucideIcon> = {
  mail: Mail,
  whatsapp: MessageCircle,
  users: Users,
  clipboard: ClipboardList,
  calendar: Calendar,
  chat: MessagesSquare,
  spreadsheet: FileSpreadsheet,
  download: Download,
  ticket: Ticket,
  database: Database,
  pencil: PencilLine,
  upload: Upload,
  book: BookMarked,
  calendarRange: CalendarDays,
  check: CheckCircle2,
  fileText: FileText,
  chart: BarChart3,
  flag: Flag,
  headset: Headphones,
}

type UrlPart = { kind: 'url'; href: string }
type TextPart = { kind: 'text'; s: string }

function splitUrls(text: string | null | undefined): (UrlPart | TextPart)[] {
  const t = typeof text === 'string' ? text : ''
  const out: (UrlPart | TextPart)[] = []
  const re = /(https?:\/\/[^\s]+)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(t))) {
    if (m.index > last) out.push({ kind: 'text', s: t.slice(last, m.index) })
    out.push({ kind: 'url', href: m[1] })
    last = m.index + m[1].length
  }
  if (last < t.length) out.push({ kind: 'text', s: t.slice(last) })
  return out
}

function renderBold(s: string | null | undefined): ReactNode {
  const raw = typeof s === 'string' ? s : ''
  const parts = raw.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i}>{p.slice(2, -2)}</strong>
    }
    return <span key={i}>{p}</span>
  })
}

function RichParagraph({ text }: { text: string | null | undefined }) {
  const chunks = splitUrls(text)
  return (
    <p className="impl-page__pill-body">
      {chunks.map((c, i) =>
        c.kind === 'url' ? (
          <a key={i} href={c.href} target="_blank" rel="noopener noreferrer">
            {c.href}
          </a>
        ) : (
          <Fragment key={i}>{renderBold(c.s)}</Fragment>
        ),
      )}
    </p>
  )
}

function IntroRich({ text }: { text: string | null | undefined }) {
  const chunks = splitUrls(text)
  return (
    <>
      {chunks.map((c, i) =>
        c.kind === 'url' ? (
          <a key={i} href={c.href} target="_blank" rel="noopener noreferrer">
            {c.href}
          </a>
        ) : (
          <Fragment key={i}>{renderBold(c.s)}</Fragment>
        ),
      )}
    </>
  )
}

function ToolLinePartView({ part }: { part: ImplantationToolPart }) {
  if (part.type === 'text') return <span>{part.value}</span>
  if (part.type === 'link') {
    return (
      <a href={part.href} target="_blank" rel="noopener noreferrer">
        {part.label}
      </a>
    )
  }
  return <strong className="impl-page__tool-tag">{part.value}</strong>
}

export function ImplantationJourneyPage() {
  const base = import.meta.env.BASE_URL || '/'
  const staticPdfHref = `${base}docs/jornada-implantacao-cliente-azoup.pdf`
  const staticHtmlHref = `${base}docs/jornada-implantacao-cliente-azoup.html`
  const azoupSite = 'https://azoup.com.br/'

  return (
    <div className="page impl-page">
      <header className="page__header page__header--split impl-page__page-head">
        <div>
          <h1 className="page__title">Jornada do cliente</h1>
          <p className="page__subtitle impl-page__subtitle">
            Fluxo único: do projeto ao suporte. Exporte com imprimir (PDF no navegador), arquivo pronto ou página HTML.
          </p>
        </div>
        <div className="impl-page__actions" role="toolbar" aria-label="Exportar jornada">
          <button
            type="button"
            className="impl-page__action"
            onClick={() => window.print()}
            title="Imprimir — no diálogo do navegador, escolha Salvar como PDF"
          >
            <Printer size={18} strokeWidth={2} absoluteStrokeWidth aria-hidden />
            <span className="impl-page__action-text">Imprimir</span>
          </button>
          <a
            className="impl-page__action"
            href={staticPdfHref}
            download
            title="Baixar PDF"
          >
            <FileDown size={18} strokeWidth={2} absoluteStrokeWidth aria-hidden />
            <span className="impl-page__action-text">PDF</span>
          </a>
          <a
            className="impl-page__action"
            href={staticHtmlHref}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir HTML em nova aba"
          >
            <FileText size={18} strokeWidth={2} absoluteStrokeWidth aria-hidden />
            <span className="impl-page__action-text">HTML</span>
          </a>
        </div>
      </header>

      <div className="impl-page__hero impl-page__hero--minimal">
        <div className="impl-page__hero-mesh" aria-hidden />
        <div className="impl-page__hero-inner">
          <div className="impl-page__logo-wrap">
            <AzoupLogoMark size={56} />
          </div>
          <div className="impl-page__hero-titles">
            <p className="impl-page__hero-kicker">
              <a href={azoupSite} target="_blank" rel="noopener noreferrer" className="impl-page__hero-kicker-link">
                Azoup tecnologia
              </a>
            </p>
            <h2 className="impl-page__hero-title">Do projeto ao suporte</h2>
            <p className="impl-page__hero-sub">Um fluxo linear para acompanhar cada etapa com o cliente.</p>
          </div>
        </div>
      </div>

      <div className="impl-page__accent-line" aria-hidden />

      <div className="impl-page__intro-grid impl-page__intro-grid--minimal">
        <div className="impl-page__intro-card">
          <strong>Objetivo</strong>
          <p>{IMPLANTATION_JOURNEY_INTRO.objective}</p>
        </div>
        <div className="impl-page__intro-card">
          <strong>Referência</strong>
          <p>
            <IntroRich text={IMPLANTATION_JOURNEY_INTRO.control ?? ''} />
          </p>
        </div>
        <div className="impl-page__intro-card impl-page__intro-card--tools">
          <strong>{IMPLANTATION_JOURNEY_INTRO.toolsTitle}</strong>
          <ul className="impl-page__tools-list">
            {IMPLANTATION_TOOL_LINES.map((line) => (
              <li key={line.name}>
                <strong className="impl-page__tool-name">{line.name}</strong>
                {line.parts.map((part, i) => (
                  <ToolLinePartView key={`${line.name}-${i}`} part={part} />
                ))}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ol className="impl-page__timeline">
        {IMPLANTATION_JOURNEY_STEPS.map((step) => {
          const Icon = ICON_MAP[step.icon]
          return (
            <Fragment key={step.n}>
              {step.phase ? (
                <li className="impl-page__phase">
                  <span className="impl-page__phase-pill">{step.phase}</span>
                </li>
              ) : null}
              <li className="impl-page__row">
                <div className="impl-page__marker">
                  <div className="impl-page__num">{step.n}</div>
                  <div className="impl-page__rail" aria-hidden />
                </div>
                <div className="impl-page__pill">
                  <p className="impl-page__pill-title">
                    <span className="impl-page__pill-title-text">{step.title}</span>
                    <Icon className="impl-page__pill-title-ico" size={18} strokeWidth={2} absoluteStrokeWidth aria-hidden />
                  </p>
                  <RichParagraph text={step.body ?? ''} />
                </div>
              </li>
            </Fragment>
          )
        })}
      </ol>

      <p className="impl-page__footer-note">
        Implantação Azoup · <a href={azoupSite} target="_blank" rel="noopener noreferrer">azoup.com.br</a>
      </p>
    </div>
  )
}
