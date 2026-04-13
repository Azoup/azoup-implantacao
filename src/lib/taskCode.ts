/** Ordenação estável: 1.2 vem antes de 1.10 (evita ordenação lexicográfica quebrada). */
export function compareTaskCode(a: string, b: string): number {
  const pa = a.split(/[.\s]+/).map((p) => parseInt(p, 10) || 0)
  const pb = b.split(/[.\s]+/).map((p) => parseInt(p, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0
    const db = pb[i] ?? 0
    if (da !== db) return da - db
  }
  return 0
}
