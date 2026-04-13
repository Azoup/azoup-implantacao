/** Parte legível do nome da fase (após traço ou travessão), para KPIs e timeline. */
export function phaseNameShort(name: string): string {
  const trimmed = name.trim()
  const parts = trimmed.split(/\s*[—–-]\s*/)
  if (parts.length >= 2) {
    const tail = parts[parts.length - 1].trim()
    if (tail.length > 0) return tail.replace(/\s*\([^)]*\)\s*$/, '').trim() || tail
  }
  return trimmed.replace(/^FASE\s+\d+\s*/i, '').trim() || trimmed
}
