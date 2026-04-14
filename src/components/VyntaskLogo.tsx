import { useId } from 'react'

type Props = {
  /** Tamanho em px (viewBox 64×64). */
  size?: number
  /** `inverse`: marca clara sobre fundo escuro (sidebar). `brand`: acento do tema. */
  variant?: 'inverse' | 'brand'
  className?: string
  'aria-hidden'?: boolean
}

/** Calendário + lista de tarefas + check — leitura clara em qualquer escala. */
export function VyntaskLogo({
  size = 40,
  variant = 'brand',
  className = '',
  'aria-hidden': ariaHidden = true,
}: Props) {
  const uid = useId().replace(/:/g, '')
  const topGrad = `vt-top-${uid}`
  const bodyGrad = `vt-body-${uid}`
  const checkGrad = `vt-check-${uid}`
  const ringGrad = `vt-ring-${uid}`
  const badgeFill = `vt-badge-${uid}`

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
          <linearGradient id={topGrad} x1="12" y1="17" x2="52" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffc14a" />
            <stop offset="100%" stopColor="#ff8a1a" />
          </linearGradient>
          <linearGradient id={bodyGrad} x1="12" y1="28" x2="52" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient id={checkGrad} x1="36" y1="34" x2="46" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffb020" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id={ringGrad} x1="22" y1="8" x2="42" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffd066" />
            <stop offset="100%" stopColor="#ff9f1c" />
          </linearGradient>
        </defs>

        {/* Corpo do calendário */}
        <path
          d="M17 17h30q5 0 5 5v28q0 5-5 5H17q-5 0-5-5V22q0-5 5-5z"
          fill={`url(#${bodyGrad})`}
        />
        {/* Faixa superior (mês) */}
        <path d="M17 17h30q5 0 5 5v6H12V22q0-5 5-5z" fill={`url(#${topGrad})`} />
        <path d="M12 28h40" stroke="rgba(15,23,42,0.22)" strokeWidth="1.25" />
        {/* Marcadores de dias na faixa (semana) */}
        <g opacity="0.9" fill="rgba(255,255,255,0.45)">
          <circle cx="17.5" cy="22.5" r="1.35" />
          <circle cx="22.5" cy="22.5" r="1.35" />
          <circle cx="27.5" cy="22.5" r="1.35" />
          <circle cx="32.5" cy="22.5" r="1.35" />
          <circle cx="37.5" cy="22.5" r="1.35" />
          <circle cx="42.5" cy="22.5" r="1.35" />
          <circle cx="47.5" cy="22.5" r="1.35" />
        </g>
        {/* Argolas de calendário de parede */}
        <path
          d="M24 8v10M40 8v10"
          stroke={`url(#${ringGrad})`}
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        {/* Mini grade do mês (só à direita, sob o check) */}
        <g opacity="0.5" fill="rgba(15,23,42,0.11)">
          <rect x="33" y="31" width="6.5" height="5.5" rx="1" />
          <rect x="40.5" y="31" width="6.5" height="5.5" rx="1" />
          <rect x="33" y="38" width="6.5" height="5.5" rx="1" />
          <rect x="40.5" y="38" width="6.5" height="5.5" rx="1" />
        </g>
        {/* Lista / tarefas (à esquerda) */}
        <g>
          <rect x="14.5" y="32.5" width="3.2" height="3.2" rx="0.9" fill={`url(#${checkGrad})`} />
          <path
            d="M20 34h11"
            stroke="rgba(15,23,42,0.35)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect x="14.5" y="38.5" width="3.2" height="3.2" rx="0.9" fill="rgba(15,23,42,0.2)" />
          <path
            d="M20 40h11"
            stroke="rgba(15,23,42,0.28)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect x="14.5" y="44.5" width="3.2" height="3.2" rx="0.9" fill="rgba(15,23,42,0.2)" />
          <path
            d="M20 46h9"
            stroke="rgba(15,23,42,0.28)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
        {/* Dia concluído: círculo + check */}
        <circle cx="44" cy="41" r="8.2" fill="#fff" stroke={`url(#${checkGrad})`} strokeWidth="2.2" />
        <path
          className="vyntask-logo__check"
          d="M39.2 41.2l2.4 2.4 5.6-6.2"
          fill="none"
          stroke={`url(#${checkGrad})`}
          strokeWidth="2.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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
        <linearGradient id={topGrad} x1="12" y1="17" x2="52" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffbf2f" />
          <stop offset="100%" stopColor="#ff7a1c" />
        </linearGradient>
        <linearGradient id={bodyGrad} x1="12" y1="28" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8ecf1" />
        </linearGradient>
        <linearGradient id={checkGrad} x1="36" y1="34" x2="48" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffbe2e" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id={ringGrad} x1="22" y1="8" x2="42" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffd34b" />
          <stop offset="100%" stopColor="#ff8c1a" />
        </linearGradient>
        <linearGradient id={badgeFill} x1="36" y1="33" x2="52" y2="49" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fffefb" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
      </defs>

      <path
        d="M17 17h30q5 0 5 5v28q0 5-5 5H17q-5 0-5-5V22q0-5 5-5z"
        fill={`url(#${bodyGrad})`}
      />
      <path d="M17 17h30q5 0 5 5v6H12V22q0-5 5-5z" fill={`url(#${topGrad})`} />
      <path d="M12 28h40" stroke="rgba(15,23,42,0.18)" strokeWidth="1.25" />
      <g opacity="0.92" fill="rgba(255,255,255,0.5)">
        <circle cx="17.5" cy="22.5" r="1.35" />
        <circle cx="22.5" cy="22.5" r="1.35" />
        <circle cx="27.5" cy="22.5" r="1.35" />
        <circle cx="32.5" cy="22.5" r="1.35" />
        <circle cx="37.5" cy="22.5" r="1.35" />
        <circle cx="42.5" cy="22.5" r="1.35" />
        <circle cx="47.5" cy="22.5" r="1.35" />
      </g>
      <path
        d="M24 8v10M40 8v10"
        stroke={`url(#${ringGrad})`}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <g opacity="0.65" fill="rgba(15,23,42,0.08)">
        <rect x="33" y="31" width="6.5" height="5.5" rx="1" />
        <rect x="40.5" y="31" width="6.5" height="5.5" rx="1" />
        <rect x="33" y="38" width="6.5" height="5.5" rx="1" />
        <rect x="40.5" y="38" width="6.5" height="5.5" rx="1" />
      </g>
      <g>
        <rect x="14.5" y="32.5" width="3.2" height="3.2" rx="0.9" fill={`url(#${checkGrad})`} />
        <path
          d="M20 34h11"
          stroke="rgba(15,23,42,0.32)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect x="14.5" y="38.5" width="3.2" height="3.2" rx="0.9" fill="rgba(15,23,42,0.16)" />
        <path
          d="M20 40h11"
          stroke="rgba(15,23,42,0.26)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect x="14.5" y="44.5" width="3.2" height="3.2" rx="0.9" fill="rgba(15,23,42,0.16)" />
        <path
          d="M20 46h9"
          stroke="rgba(15,23,42,0.26)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <circle cx="44" cy="41" r="8.2" fill={`url(#${badgeFill})`} stroke={`url(#${checkGrad})`} strokeWidth="2.2" />
      <path
        className="vyntask-logo__check"
        d="M39.2 41.2l2.4 2.4 5.6-6.2"
        fill="none"
        stroke={`url(#${checkGrad})`}
        strokeWidth="2.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
