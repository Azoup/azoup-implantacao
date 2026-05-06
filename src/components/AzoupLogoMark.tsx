type Props = {
  size?: number
  className?: string
  fit?: 'contain' | 'cover'
  zoom?: number
}

/**
 * Logotipo oficial Azoup (laranja) servido de `/branding/azoup-logo-laranja.png`.
 */
export function AzoupLogoMark({ size = 64, className, fit = 'contain', zoom = 1 }: Props) {
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
      style={{
        width: size,
        height: size,
        objectFit: fit,
        transform: `scale(${zoom})`,
        transformOrigin: 'center',
        display: 'block',
      }}
    />
  )
}
