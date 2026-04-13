import { useMemo } from 'react'
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toZonedTime } from 'date-fns-tz'
import { CAL_TZ, dayKey } from '../lib/calendarGrid'

const wdLabels = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

type Props = {
  /** Dia âncora (ex.: segunda da semana visível ou dia ativo) */
  anchor: Date
  todayKeyStr: string
  /** Dias que têm pelo menos um evento (yyyy-MM-dd) */
  daysWithEvents: Set<string>
  onSelectDay: (day: Date) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

export function AgendaMiniMonth({
  anchor,
  todayKeyStr,
  daysWithEvents,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}: Props) {
  const z = toZonedTime(anchor, CAL_TZ)
  const monthStart = startOfMonth(z)
  const monthEndDate = endOfMonth(z)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEndDate, { weekStartsOn: 1 })

  const cells = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd],
  )

  const title = format(monthStart, "MMMM yyyy", { locale: ptBR })

  return (
    <div className="agenda-mini">
      <div className="agenda-mini__nav">
        <button type="button" className="agenda-mini__nav-btn" aria-label="Mês anterior" onClick={onPrevMonth}>
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
        <span className="agenda-mini__title">{title}</span>
        <button type="button" className="agenda-mini__nav-btn" aria-label="Próximo mês" onClick={onNextMonth}>
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      </div>
      <div className="agenda-mini__weekdays">
        {wdLabels.map((l, i) => (
          <span key={i} className="agenda-mini__wd">
            {l}
          </span>
        ))}
      </div>
      <div className="agenda-mini__grid">
        {cells.map((d) => {
          const dk = dayKey(d)
          const outside = !isSameMonth(d, monthStart)
          const isToday = dk === todayKeyStr
          const hasEv = daysWithEvents.has(dk)
          return (
            <button
              key={dk + (outside ? '-o' : '')}
              type="button"
              className={
                'agenda-mini__cell' +
                (outside ? ' is-outside' : '') +
                (isToday ? ' is-today' : '') +
                (hasEv ? ' has-events' : '')
              }
              onClick={() => onSelectDay(d)}
            >
              {format(d, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
