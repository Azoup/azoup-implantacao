import { pickReadableText } from '../lib/analystColors'

type AnalystAvatarProps = {
  name: string
  color: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function initialsFromName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function AnalystAvatar({ name, color, avatarUrl, size = 'md', className = '' }: AnalystAvatarProps) {
  const cls = `analyst-avatar analyst-avatar--${size} ${className}`.trim()
  if (avatarUrl?.trim()) {
    return <img src={avatarUrl} alt={name} className={cls} style={{ borderColor: color }} />
  }
  const textColor = pickReadableText(color)
  return (
    <span
      className={cls}
      style={{
        background: `color-mix(in srgb, ${color} 24%, var(--surface))`,
        borderColor: color,
        color: textColor,
      }}
      aria-hidden
    >
      {initialsFromName(name)}
    </span>
  )
}
