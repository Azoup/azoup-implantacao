import { useId } from 'react'

type Props = {
  /** Tamanho em px (viewBox 56×56). */
  size?: number
  /** `inverse`: marca clara sobre fundo escuro (sidebar). `brand`: acento do tema. */
  variant?: 'inverse' | 'brand'
  className?: string
  'aria-hidden'?: boolean
}

/** Marca VynTask — calendário + check, limpa e integrada ao wordmark. */
export function VyntaskLogo({
  size = 40,
  variant = 'brand',
  className = '',
  'aria-hidden': ariaHidden = true,
}: Props) {
  const uid = useId().replace(/:/g, '')
  const topGrad = `vt-top-${uid}`
  const checkGrad = `vt-check-${uid}`
  const bodyGrad = `vt-body-${uid}`
  const screenGrad = `vt-screen-${uid}`
  const ringGrad = `vt-ring-${uid}`

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
        <rect x="12" y="16" width="40" height="34" rx="10" fill="rgba(255,255,255,0.94)" />
        <rect x="12" y="16" width="40" height="11" rx="10" fill="rgba(255,255,255,0.32)" />
        <path d="M12 27h40" stroke="rgba(15,23,42,0.56)" strokeWidth="1.8" />
        <path d="M20 12v9" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M40 12v9" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" />
        <rect x="19" y="31" width="26" height="15" rx="5" fill="rgba(15,23,42,0.86)" />
        <path
          className="vyntask-logo__check"
          d="M23 37 L29 42 L41 31"
          fill="none"
          stroke="#ffffff"
          strokeWidth="4.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle className="vyntask-logo__dot" cx="35" cy="48" r="1.45" fill="rgba(255,255,255,0.74)" />
        <circle className="vyntask-logo__dot" cx="40" cy="48" r="1.45" fill="rgba(255,255,255,0.74)" />
        <circle className="vyntask-logo__dot" cx="45" cy="48" r="1.45" fill="rgba(255,255,255,0.74)" />
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
        <linearGradient id={screenGrad} x1="20" y1="31" x2="45" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1f2a44" />
          <stop offset="100%" stopColor="#121826" />
        </linearGradient>
        <linearGradient id={ringGrad} x1="20" y1="13" x2="40" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffd34b" />
          <stop offset="100%" stopColor="#ff9f26" />
        </linearGradient>
      </defs>

      <path d="M13 16h38c6 0 10 4 10 10v1H13v-11z" fill={`url(#${topGrad})`} />
      <rect x="13" y="24" width="38" height="26" rx="9.5" fill={`url(#${bodyGrad})`} />
      <path d="M13 24h38" stroke="rgba(15,23,42,0.45)" strokeWidth="1.7" />
      <path d="M20 12v9" stroke={`url(#${ringGrad})`} strokeWidth="4.6" strokeLinecap="round" />
      <path d="M40 12v9" stroke={`url(#${ringGrad})`} strokeWidth="4.6" strokeLinecap="round" />
      <rect x="19" y="31" width="26" height="13.8" rx="4.8" fill={`url(#${screenGrad})`} />
      <path
        className="vyntask-logo__check"
        d="M23 36.5 L29 41.5 L40.5 31.5"
        fill="none"
        stroke={`url(#${checkGrad})`}
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="vyntask-logo__dot" cx="35" cy="48" r="1.45" fill="#f37921" />
      <circle className="vyntask-logo__dot" cx="40" cy="48" r="1.45" fill="#f37921" />
      <circle className="vyntask-logo__dot" cx="45" cy="48" r="1.45" fill="#f37921" />
    </svg>
  )
}
