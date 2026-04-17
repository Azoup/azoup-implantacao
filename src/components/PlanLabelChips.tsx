import type { PlanLabelChip } from '../lib/planLabelDisplay'
import { planLabelColorsFromCode } from '../lib/planLabelDisplay'

function truncate(s: string, n: number) {
  if (s.length <= n) return s
  return `${s.slice(0, Math.max(0, n - 1))}…`
}

type PillKind = 'done' | 'active' | 'open-pending' | 'open-progress'
type PillVariant = 'kanban' | 'dashboard' | 'compact'

export function PlanLabelPill({
  chip,
  variant,
  kind,
  maxName = 28,
  codeOnly = false,
  phaseColorHex,
}: {
  chip: PlanLabelChip
  variant: PillVariant
  kind: PillKind
  maxName?: number
  /** Só o código (etiquetas curtas tipo Trello na fila de abertas). */
  codeOnly?: boolean
  phaseColorHex?: string | null
}) {
  const { background, color, border } = planLabelColorsFromCode(chip.code, phaseColorHex)
  const name = truncate(chip.name, maxName)
  const title = chip.name && chip.name !== chip.code ? `${chip.code} — ${chip.name}` : chip.code
  return (
    <span
      className={
        `vt-plan-label vt-plan-label--${variant} vt-plan-label--${kind}` +
        (codeOnly ? ' vt-plan-label--code-only' : '')
      }
      style={{
        background,
        color,
        borderColor: border,
        ['--vt-pill-color' as string]: border,
      }}
      title={title}
    >
      <span className="vt-plan-label__code">{chip.code}</span>
      {!codeOnly ? <span className="vt-plan-label__name">{name}</span> : null}
    </span>
  )
}

export function PlanLabelRow({
  last,
  active,
  variant,
  resolveCodeColor,
}: {
  last: PlanLabelChip | null
  active: PlanLabelChip | null
  variant: 'kanban' | 'dashboard'
  resolveCodeColor?: (code: string) => string | null | undefined
}) {
  if (!last && !active) return null
  const same = last && active && last.code === active.code
  const maxName = variant === 'kanban' ? 24 : 34
  return (
    <div className={`vt-plan-label-row vt-plan-label-row--${variant}`}>
      {last ? (
        <span className="vt-plan-label-row__pair">
          <span className="vt-plan-label-row__hint">Último</span>
          <PlanLabelPill
            chip={last}
            variant={variant}
            kind="done"
            maxName={maxName}
            phaseColorHex={resolveCodeColor?.(last.code)}
          />
        </span>
      ) : null}
      {active && !same ? (
        <span className="vt-plan-label-row__pair">
          <span className="vt-plan-label-row__hint">Atual</span>
          <PlanLabelPill
            chip={active}
            variant={variant}
            kind="active"
            maxName={maxName}
            phaseColorHex={resolveCodeColor?.(active.code)}
          />
        </span>
      ) : null}
    </div>
  )
}
