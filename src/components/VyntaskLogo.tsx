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
  const bgGradId = `vt-bg-${uid}`
  const checkGradId = `vt-check-${uid}`

  if (variant === 'inverse') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 56 56"
        className={`vyntask-logo ${className}`}
        aria-hidden={ariaHidden}
        role="img"
      >
        <rect
          className="vyntask-logo__sheet"
          x="6"
          y="6"
          width="44"
          height="44"
          rx="14"
          fill="rgba(255,255,255,0.14)"
          stroke="rgba(255,255,255,0.52)"
          strokeWidth="1.8"
        />
        <circle className="vyntask-logo__bind vyntask-logo__bind--a" cx="19" cy="18" r="2.45" fill="#ffffff" />
        <circle className="vyntask-logo__bind vyntask-logo__bind--b" cx="37" cy="18" r="2.45" fill="#ffffff" />
        <path
          className="vyntask-logo__check"
          d="M16 31 L24 39 L41 21"
          fill="none"
          stroke="#ffffff"
          strokeWidth="4.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle className="vyntask-logo__dot" cx="19" cy="45" r="1.6" fill="rgba(255,255,255,0.5)" />
        <circle className="vyntask-logo__dot" cx="28" cy="45" r="1.6" fill="rgba(255,255,255,0.38)" />
        <circle className="vyntask-logo__dot" cx="37" cy="45" r="1.6" fill="rgba(255,255,255,0.5)" />
      </svg>
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      className={`vyntask-logo ${className}`}
      aria-hidden={ariaHidden}
      role="img"
    >
      <defs>
        <linearGradient id={bgGradId} x1="10" y1="8" x2="44" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-deep)" />
        </linearGradient>
        <linearGradient id={checkGradId} x1="16" y1="31" x2="41" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#ffe8d6" />
        </linearGradient>
      </defs>
      <rect
        className="vyntask-logo__sheet"
        x="6"
        y="6"
        width="44"
        height="44"
        rx="14"
        fill={`url(#${bgGradId})`}
        stroke="color-mix(in srgb, var(--accent-deep) 65%, #000)"
        strokeOpacity={0.38}
        strokeWidth="1.8"
      />
      <circle className="vyntask-logo__bind vyntask-logo__bind--a" cx="19" cy="18" r="2.45" fill="#ffffff" />
      <circle className="vyntask-logo__bind vyntask-logo__bind--b" cx="37" cy="18" r="2.45" fill="#ffffff" />
      <path
        className="vyntask-logo__check"
        d="M16 31 L24 39 L41 21"
        fill="none"
        stroke={`url(#${checkGradId})`}
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="vyntask-logo__dot" cx="19" cy="45" r="1.6" fill="#ffffff" fillOpacity={0.78} />
      <circle className="vyntask-logo__dot" cx="28" cy="45" r="1.6" fill="#ffffff" fillOpacity={0.6} />
      <circle className="vyntask-logo__dot" cx="37" cy="45" r="1.6" fill="#ffffff" fillOpacity={0.78} />
    </svg>
  )
}
