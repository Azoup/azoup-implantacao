type Props = {
  size?: number
  className?: string
}

/**
 * Logotipo oficial Azoup (laranja) servido de `/branding/azoup-logo-laranja.png`.
 */
export function AzoupLogoMark({ size = 64, className }: Props) {
  const base = import.meta.env.BASE_URL || '/'

  return (
    <img
      className={className}
      src={`${base}branding/azoup-logo-laranja.png`}
      alt="Azoup"
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      draggable={false}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
    />
  )
}
