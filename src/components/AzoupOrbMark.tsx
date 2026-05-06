type Props = {
  size?: number
  className?: string
}

/**
 * Símbolo circular laranja da Azoup para lockups compactos.
 */
export function AzoupOrbMark({ size = 36, className }: Props) {
  const base = import.meta.env.BASE_URL || '/'
  return (
    <img
      className={className}
      src={`${base}branding/Logo_Bolinha_Laranja_AZOUP.ico`}
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
