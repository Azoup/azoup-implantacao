import type { ProjectStatus } from '../db/types'

const ALLOWED: readonly ProjectStatus[] = ['ativo', 'inadimplente', 'congelado', 'finalizado', 'cancelado']

/**
 * Normaliza `projects.status` vindo do Postgres ou legado.
 * - `pausado` → `congelado`
 * - `inativo` → `cancelado` (nomenclatura única: só "Cancelado" na UI)
 */
export function normalizeRemoteProjectStatus(raw: string | null | undefined): ProjectStatus {
  const s = String(raw ?? 'ativo')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (s === 'pausado') return 'congelado'
  if (s === 'inativo') return 'cancelado'
  if ((ALLOWED as readonly string[]).includes(s)) return s as ProjectStatus
  return 'ativo'
}

/** Projetos que entram no mesmo recorte operacional do dashboard que "em andamento" (ativo + inadimplente). */
export function isDashboardOperationalStatus(status: ProjectStatus): boolean {
  return status === 'ativo' || status === 'inadimplente'
}
