import type { ProjectClientType } from '../db/types'

export const DEFAULT_PROJECT_CLIENT_TYPE: ProjectClientType = 'generico'

export const PROJECT_CLIENT_TYPE_SELECT_OPTIONS: { value: ProjectClientType; label: string }[] = [
  { value: 'confeccao', label: 'CONFECÇÃO' },
  { value: 'generico', label: 'GENÉRICO' },
]

/** Rótulos para UI (unidade de negócio do cliente no projeto). */
export function projectClientTypeLabelPt(t: string | null | undefined): string {
  const v = normalizeProjectClientType(t)
  return v === 'confeccao' ? 'CONFECÇÃO' : 'GENÉRICO'
}

export function normalizeProjectClientType(v: unknown): ProjectClientType {
  const s = String(v ?? '').trim().toLowerCase()
  return s === 'confeccao' ? 'confeccao' : 'generico'
}

/** Texto usado na busca da grade (nome + sinônimos do tipo). */
export function projectClientTypeSearchBlob(p: { clientType?: ProjectClientType | string | null }): string {
  const v = normalizeProjectClientType(p.clientType)
  const label = projectClientTypeLabelPt(v).toLowerCase()
  return [v, label, 'confeccao', 'confecção', 'generico', 'genérico'].join(' ')
}
