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
  return (
    <span className={cls} style={{ background: color }} aria-hidden>
      {initialsFromName(name)}
    </span>
  )
}
