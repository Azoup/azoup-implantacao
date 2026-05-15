import { CalendarPlus, FileText, Play, Video } from 'lucide-react'
import type { DbAnalyst, DbTask } from '../../db/types'
import type { DbEvent, DbProject } from '../../db/types'
import { eventColorsFromAnalyst } from '../../lib/analystColors'
import { formatAgendaDisplayTitle } from '../../lib/calendarEventTitle'
import {
  formatEventTimeLabel,
  getAgendaEventActionLinks,
  isAllDayOrMultiDayBlock,
} from '../../lib/agendaEventDisplay'
import { buildGoogleCalendarTemplateUrl } from '../../lib/googleCalendarUrl'

export type AgendaCalEventBlockProps = {
  ev: DbEvent
  variant: 'timed' | 'allday-strip'
  analyst?: DbAnalyst
  project?: DbProject
  task?: DbTask
  /** Legado: subtÃ­tulo no chip; omitir se `project` jÃ¡ for passado. */
  projectName?: string
  canEdit: boolean
  topPct?: number
  heightPct?: number
  leftPct?: number
  widthPct?: number
  laneInset?: number
  stackIndex?: number
  lanesBand?: 'many' | '2' | 'stacked' | null
  hTiny?: boolean
  hCompact?: boolean
  stripStyle?: { top: string; height: string; left: string; width: string }
  onOpenEdit: (eventId: string) => void
}

function titleAttr(
  displayTitle: string,
  ev: DbEvent,
  opts: { sub?: string; analystName?: string; canEdit: boolean },
): string {
  const parts: string[] = [displayTitle, formatEventTimeLabel(ev)]
  if (opts.sub) parts.push(opts.sub)
  if (opts.analystName) parts.push(`Resp.: ${opts.analystName}`)
  if (ev.status === 'cancelado') parts.push('Cancelado')
  if (opts.canEdit) parts.push('Clique para editar')
  return parts.join(' Â· ')
}

export function AgendaCalEventBlock({
  ev,
  variant,
  analyst,
  project,
  task,
  projectName,
  canEdit,
  topPct,
  heightPct,
  leftPct,
  widthPct,
  laneInset = 0.4,
  stackIndex = 0,
  lanesBand,
  hTiny,
  hCompact,
  stripStyle,
  onOpenEdit,
}: AgendaCalEventBlockProps) {
  const cancelled = ev.status === 'cancelado'
  const fromGoogle = Boolean(ev.googleEventId)
  const allDay = isAllDayOrMultiDayBlock(ev)
  const displayTitle = formatAgendaDisplayTitle(ev, project, task)
  const subLabel = project?.projectName ?? projectName
  const { accent, bg, text } = eventColorsFromAnalyst(analyst?.color, cancelled)
  const links = getAgendaEventActionLinks(ev)
  const gCalUrl = buildGoogleCalendarTemplateUrl({
    title: displayTitle,
    startIso: ev.startTime,
    endIso: ev.endTime,
    details: [ev.description, subLabel ? `Projeto: ${subLabel}` : '', analyst ? `Analista: ${analyst.name}` : '']
      .filter(Boolean)
      .join('\n'),
    location: links.meeting ?? undefined,
  })

  const iconCount =
    (links.meeting ? 1 : 0) + (links.recording ? 1 : 0) + (links.transcript ? 1 : 0) + 1

  const className =
    'cal-event cal-event--gc' +
    (variant === 'allday-strip' ? ' cal-event--allday-strip' : '') +
    (fromGoogle ? ' cal-event--google' : '') +
    (cancelled ? ' is-cancelled' : '') +
    (canEdit ? ' is-interactive' : '') +
    (lanesBand ? ` cal-event--lanes-${lanesBand}` : '') +
    (stackIndex > 0 ? ' cal-event--stacked' : '') +
    (hTiny ? ' cal-event--h-tiny' : '') +
    (hCompact ? ' cal-event--h-compact' : '')

  const stackPx = stackIndex > 0 ? stackIndex * 7 : 0
  const narrowLane = (widthPct ?? 100) < 100 || stackIndex > 0

  const layoutStyle =
    variant === 'allday-strip' && stripStyle
      ? stripStyle
      : {
          top: `${topPct}%`,
          height: `${heightPct}%`,
          left: `calc(${leftPct ?? 0}% + ${laneInset + stackPx}px)`,
          width: `calc(${widthPct ?? 100}% - ${2 * laneInset + stackPx}px)`,
          zIndex: stackIndex > 0 ? 4 + stackIndex : narrowLane ? 3 : 2,
        }

  return (
    <div
      role={canEdit ? 'button' : undefined}
      tabIndex={canEdit ? 0 : -1}
      className={className}
      style={{
        ...layoutStyle,
        minWidth:
          variant === 'allday-strip' || narrowLane
            ? undefined
            : 'var(--agenda-event-min-width, 92px)',
        ['--evt-accent' as string]: accent,
        ['--evt-bg' as string]: bg,
        ['--evt-text' as string]: text,
        ['--agenda-gc-icons-strip-w' as string]: iconCount > 2 ? '2.85rem' : '1.85rem',
        ['--agenda-gc-icons-strip-w-dual' as string]: iconCount > 3 ? '3.35rem' : '2.42rem',
      }}
      title={titleAttr(displayTitle, ev, { sub: subLabel, analystName: analyst?.name, canEdit })}
      onKeyDown={(e) => {
        if (!canEdit) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenEdit(ev.id)
        }
      }}
      onClick={() => {
        if (!canEdit) return
        onOpenEdit(ev.id)
      }}
    >
      <span className="cal-event__accent-bar" aria-hidden />
      <div className="cal-event__body">
        <span className="cal-event__title">{displayTitle}</span>
        <span
          className={
            'cal-event__time' + (variant === 'allday-strip' || allDay ? ' cal-event__time--allday' : '')
          }
        >
          {formatEventTimeLabel(ev)}
        </span>
        {subLabel && variant !== 'allday-strip' && !narrowLane ? (
          <span className="cal-event__sub">{subLabel}</span>
        ) : null}
        {fromGoogle && !narrowLane ? (
          <span className="cal-event__badge cal-event__badge--google" title="Importado do Google Agenda">
            Google
          </span>
        ) : null}
        {cancelled ? <span className="cal-event__badge">Cancelado</span> : null}
      </div>
      {!narrowLane ? (
        <div className="cal-event__foot" role="toolbar" aria-label="AÃ§Ãµes do evento" onClick={(e) => e.stopPropagation()}>
          <div className="cal-event__icons">
            {links.recording ? (
              <a
                className="cal-event__icon-btn cal-event__icon-btn--recording"
                href={links.recording}
                target="_blank"
                rel="noopener noreferrer"
                title="GravaÃ§Ã£o (Drive)"
                onClick={(e) => e.stopPropagation()}
              >
                <Play size={14} strokeWidth={2} />
              </a>
            ) : null}
            {links.transcript ? (
              <a
                className="cal-event__icon-btn cal-event__icon-btn--transcript"
                href={links.transcript}
                target="_blank"
                rel="noopener noreferrer"
                title="TranscriÃ§Ã£o / notas"
                onClick={(e) => e.stopPropagation()}
              >
                <FileText size={14} strokeWidth={2} />
              </a>
            ) : null}
            {links.meeting ? (
              <a
                className="cal-event__icon-btn"
                href={links.meeting}
                target="_blank"
                rel="noopener noreferrer"
                title="Link da reuniÃ£o"
                onClick={(e) => e.stopPropagation()}
              >
                <Video size={14} strokeWidth={2} />
              </a>
            ) : null}
            <a
              className="cal-event__icon-btn cal-event__icon-btn--google"
              href={gCalUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Adicionar ao Google Agenda"
              onClick={(e) => e.stopPropagation()}
            >
              <CalendarPlus size={14} strokeWidth={2} />
            </a>
          </div>
        </div>
      ) : null}
    </div>
  )
}
