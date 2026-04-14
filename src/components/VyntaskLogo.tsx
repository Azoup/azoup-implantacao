import { useId } from 'react'

type Props = {
  /** Tamanho em px (viewBox 56×56). */
  size?: number
  /** `inverse`: marca clara sobre fundo escuro (sidebar). `brand`: acento do tema. */
  variant?: 'inverse' | 'brand'
  className?: string
  'aria-hidden'?: boolean
}

/** Marca VynTask — bloco sólido + check em "V" com presença visual. */
export function VyntaskLogo({
  size = 40,
  variant = 'brand',
  className = '',
  'aria-hidden': ariaHidden = true,
}: Props) {
  const uid = useId().replace(/:/g, '')
  const cardGrad = `vt-card-${uid}`
  const topGrad = `vt-top-${uid}`
  const checkGrad = `vt-check-${uid}`
  const bodyGrad = `vt-body-${uid}`
  const shadowGrad = `vt-shadow-${uid}`

  if (variant === 'inverse') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        className={`vyntask-logo ${className}`}
        aria-hidden={ariaHidden}
        role="img"
      >
        <defs>
          <linearGradient id={shadowGrad} x1="8" y1="10" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </linearGradient>
        </defs>
        <rect
          className="vyntask-logo__sheet"
          x="6"
          y="6"
          width="52"
          height="52"
          rx="15"
          fill={`url(#${shadowGrad})`}
          opacity="0.92"
        />
        <rect x="13" y="16" width="38" height="33" rx="9" fill="rgba(255,255,255,0.9)" />
        <path d="M13 24h38" stroke="rgba(15,23,42,0.62)" strokeWidth="1.7" />
        <rect x="13" y="16" width="38" height="10" rx="9" fill="rgba(255,255,255,0.28)" />
        <path d="M22 13v8" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <path d="M42 13v8" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <rect x="20" y="30" width="24" height="15" rx="4.8" fill="rgba(15,23,42,0.82)" />
        <path
          className="vyntask-logo__check"
          d="M23 37 L29 42 L41 31"
          fill="none"
          stroke="#ffffff"
          strokeWidth="4.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle className="vyntask-logo__dot" cx="34" cy="48" r="1.4" fill="rgba(255,255,255,0.65)" />
        <circle className="vyntask-logo__dot" cx="39" cy="48" r="1.4" fill="rgba(255,255,255,0.65)" />
        <circle className="vyntask-logo__dot" cx="44" cy="48" r="1.4" fill="rgba(255,255,255,0.65)" />
      </svg>
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`vyntask-logo ${className}`}
      aria-hidden={ariaHidden}
      role="img"
    >
      <defs>
        <linearGradient id={cardGrad} x1="7" y1="8" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2a3042" />
          <stop offset="100%" stopColor="#0c111c" />
        </linearGradient>
        <linearGradient id={topGrad} x1="14" y1="16" x2="50" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffbf2f" />
          <stop offset="100%" stopColor="#ff8e1f" />
        </linearGradient>
        <linearGradient id={bodyGrad} x1="13" y1="25" x2="51" y2="49" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#d6d6d9" />
        </linearGradient>
        <linearGradient id={checkGrad} x1="24" y1="35" x2="42" y2="31" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffbe2e" />
          <stop offset="100%" stopColor="#ff7a1c" />
        </linearGradient>
        <radialGradient id={shadowGrad} cx="0" cy="0" r="1" gradientTransform="translate(32 50) rotate(90) scale(12 22)" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(0,0,0,0.32)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      <rect className="vyntask-logo__sheet" x="6" y="6" width="52" height="52" rx="15" fill={`url(#${cardGrad})`} />
      <path d="M16 54h32c7 0 11-4 11-11v4c0 7-4 11-11 11H16c-7 0-11-4-11-11v-4c0 7 4 11 11 11z" fill={`url(#${shadowGrad})`} />
      <path d="M13 16h38c6 0 10 4 10 10v1H13v-11z" fill={`url(#${topGrad})`} />
      <rect x="13" y="24" width="38" height="26" rx="9.5" fill={`url(#${bodyGrad})`} />
      <path d="M13 24h38" stroke="rgba(15,23,42,0.45)" strokeWidth="1.7" />
      <path d="M22 13v8" stroke="#ffc84a" strokeWidth="4.6" strokeLinecap="round" />
      <path d="M42 13v8" stroke="#ffc84a" strokeWidth="4.6" strokeLinecap="round" />
      <rect x="20" y="30" width="24" height="13.8" rx="4.8" fill="#1b2234" />
      <path
        className="vyntask-logo__check"
        d="M23 36.5 L29 41.5 L40.5 31.5"
        fill="none"
        stroke={`url(#${checkGrad})`}
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="vyntask-logo__dot" cx="34" cy="48" r="1.45" fill="#f37921" />
      <circle className="vyntask-logo__dot" cx="39" cy="48" r="1.45" fill="#f37921" />
      <circle className="vyntask-logo__dot" cx="44" cy="48" r="1.45" fill="#f37921" />
    </svg>
  )
}
