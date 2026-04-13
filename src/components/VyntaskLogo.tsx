import { useId } from 'react'

type Props = {
  /** Tamanho em px (viewBox 48×48). */
  size?: number
  /** `inverse`: marca clara sobre fundo escuro (sidebar). `brand`: acento do tema. */
  variant?: 'inverse' | 'brand'
  className?: string
  'aria-hidden'?: boolean
}

/**
 * Marca VynTask — minimalista: folha de tarefas + check (implantação concluída / organização).
 */
export function VyntaskLogo({
  size = 40,
  variant = 'brand',
  className = '',
  'aria-hidden': ariaHidden = true,
}: Props) {
  const uid = useId().replace(/:/g, '')
  const gradId = `vt-check-${uid}`

  if (variant === 'inverse') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        className={`vyntask-logo ${className}`}
        aria-hidden={ariaHidden}
        role="img"
      >
        <rect
          className="vyntask-logo__sheet"
          x="10"
          y="11.5"
          width="28"
          height="29"
          rx="7.5"
          ry="7.5"
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="2"
        />
        <circle className="vyntask-logo__bind vyntask-logo__bind--a" cx="18.5" cy="17" r="2.15" fill="#ffffff" />
        <circle className="vyntask-logo__bind vyntask-logo__bind--b" cx="29.5" cy="17" r="2.15" fill="#ffffff" />
        <path
          className="vyntask-logo__check"
          d="M17.2 24.8 L23.2 30.8 L33.4 19.2"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle className="vyntask-logo__dot" cx="18" cy="36.5" r="1.35" fill="rgba(255,255,255,0.42)" />
        <circle className="vyntask-logo__dot" cx="24" cy="36.5" r="1.35" fill="rgba(255,255,255,0.42)" />
        <circle className="vyntask-logo__dot" cx="30" cy="36.5" r="1.35" fill="rgba(255,255,255,0.42)" />
      </svg>
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={`vyntask-logo ${className}`}
      aria-hidden={ariaHidden}
      role="img"
    >
      <defs>
        <linearGradient id={gradId} x1="16" y1="19" x2="34" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-deep)" />
        </linearGradient>
      </defs>
      <rect
        className="vyntask-logo__sheet"
        x="10"
        y="11.5"
        width="28"
        height="29"
        rx="7.5"
        ry="7.5"
        fill="none"
        stroke="var(--accent)"
        strokeOpacity={0.42}
        strokeWidth="2"
      />
      <circle className="vyntask-logo__bind vyntask-logo__bind--a" cx="18.5" cy="17" r="2.15" fill="var(--accent)" />
      <circle className="vyntask-logo__bind vyntask-logo__bind--b" cx="29.5" cy="17" r="2.15" fill="var(--accent)" />
      <path
        className="vyntask-logo__check"
        d="M17.2 24.8 L23.2 30.8 L33.4 19.2"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="vyntask-logo__dot" cx="18" cy="36.5" r="1.35" fill="var(--accent)" fillOpacity={0.35} />
      <circle className="vyntask-logo__dot" cx="24" cy="36.5" r="1.35" fill="var(--accent)" fillOpacity={0.35} />
      <circle className="vyntask-logo__dot" cx="30" cy="36.5" r="1.35" fill="var(--accent)" fillOpacity={0.35} />
    </svg>
  )
}
