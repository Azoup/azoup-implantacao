import type { DbProject } from '../db/types'
import { formatDatePt } from './dates'

const CLIP = 420

function clipLine(s: string): string {
  const t = s.trim()
  if (!t) return '—'
  return t.length > CLIP ? `${t.slice(0, CLIP - 1)}…` : t
}

function fmtDate(v: unknown): string {
  if (v == null || v === '') return '—'
  try {
    return formatDatePt(String(v))
  } catch {
    return String(v).slice(0, 10)
  }
}

function normBlank(v: unknown): string | null {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s.length ? s : null
}

function sameBlankableString(a: unknown, b: unknown): boolean {
  return normBlank(a) === normBlank(b)
}

/** Compara só a parte data (YYYY-MM-DD) para ISO com hora. */
function sameCalendarDate(a: unknown, b: unknown): boolean {
  const da = a == null || a === '' ? '' : String(a).slice(0, 10)
  const db = b == null || b === '' ? '' : String(b).slice(0, 10)
  return da === db
}

function sameNumber(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') return a === b
  return a === b
}

const FIELD_LABEL: Record<string, string> = {
  projectName: 'Nome do projeto',
  clientType: 'Tipo do cliente (negócio)',
  analystId: 'Analista responsável',
  startDate: 'Data de início',
  dueDate: 'Previsão de término',
  cancelledAt: 'Data de cancelamento',
  status: 'Situação do projeto',
  kanbanColumn: 'Coluna do quadro',
  cnpj: 'CNPJ',
  razaoSocial: 'Razão social',
  tradeName: 'Nome fantasia',
  cep: 'CEP',
  addressStreet: 'Logradouro',
  addressNumber: 'Número',
  addressComplement: 'Complemento',
  addressNeighborhood: 'Bairro',
  addressCity: 'Cidade',
  addressState: 'UF',
  implantationContactName: 'Contato implantação (nome)',
  implantationContactPhone: 'Contato implantação (telefone)',
  corporateEmail: 'E-mail corporativo',
  clientApiId: 'ID cliente (API)',
  internalNotes: 'Observações internas',
  stateRegistration: 'Inscrição estadual',
  secondaryCnpj: 'CNPJ secundário',
  secondaryRazaoSocial: 'Razão social (CNPJ sec.)',
  modulesDescription: 'Módulos / escopo',
  hoursContracted: 'Horas contratadas',
  manualAttentionNote: 'Alerta operacional',
}

const KANBAN_PT: Record<string, string> = {
  novos: 'Novos',
  fase_01: 'Fase 1',
  fase_02: 'Fase 2',
  fase_03: 'Fase 3',
  fase_04: 'Fase 4',
  finalizados: 'Finalizados',
  cancelados: 'Cancelados',
}

const STATUS_PT: Record<string, string> = {
  ativo: 'Em andamento',
  inadimplente: 'Inadimplente',
  congelado: 'Congelado',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}

const CLIENT_TYPE_PT: Record<string, string> = {
  confeccao: 'CONFECÇÃO',
  generico: 'GENÉRICO',
}

export type ProjectPersistPatchAuditOpts = {
  analystNameById?: Map<string, string>
}

function fmtAnalyst(id: unknown, opts?: ProjectPersistPatchAuditOpts): string {
  if (id == null || id === '') return '—'
  const sid = String(id)
  return opts?.analystNameById?.get(sid) ?? sid
}

/**
 * Monta texto para `writeAuditLog.details` quando o formulário de projeto grava alterações.
 * Retorna `null` se não houver diferença entre `before` e os valores em `patch`.
 */
export function describeProjectPersistPatchDiff(
  before: DbProject,
  patch: Record<string, unknown>,
  opts?: ProjectPersistPatchAuditOpts,
): string | null {
  const lines: string[] = []

  const pushChange = (label: string, beforeShown: string, afterShown: string) => {
    lines.push(`${label}: ${beforeShown} → ${afterShown}`)
  }

  for (const key of Object.keys(patch)) {
    if (key === 'manualAttentionAt' || key === 'manualAttentionBy') continue

    if (key === 'planSnapshot') {
      const next = patch.planSnapshot
      if (JSON.stringify(before.planSnapshot) !== JSON.stringify(next)) {
        lines.push('Plano contratado (snapshot) alterado.')
      }
      continue
    }

    if (key === 'freezeTimeline') {
      if (JSON.stringify(before.freezeTimeline ?? []) !== JSON.stringify(patch.freezeTimeline)) {
        lines.push('Histórico de congelamento / descongelamento atualizado.')
      }
      continue
    }

    if (!(key in before)) continue
    const label = FIELD_LABEL[key] ?? key
    const oldVal = before[key as keyof DbProject] as unknown
    const newVal = patch[key]

    if (key === 'startDate' || key === 'dueDate' || key === 'cancelledAt') {
      if (!sameCalendarDate(oldVal, newVal)) {
        pushChange(label, fmtDate(oldVal), fmtDate(newVal))
      }
      continue
    }

    if (key === 'analystId') {
      if (!sameBlankableString(oldVal, newVal)) {
        pushChange(label, fmtAnalyst(oldVal, opts), fmtAnalyst(newVal, opts))
      }
      continue
    }

    if (key === 'status') {
      if (oldVal !== newVal) {
        pushChange(
          label,
          STATUS_PT[String(oldVal)] ?? String(oldVal ?? '—'),
          STATUS_PT[String(newVal)] ?? String(newVal ?? '—'),
        )
      }
      continue
    }

    if (key === 'clientType') {
      if (oldVal !== newVal) {
        pushChange(
          label,
          CLIENT_TYPE_PT[String(oldVal)] ?? String(oldVal ?? '—'),
          CLIENT_TYPE_PT[String(newVal)] ?? String(newVal ?? '—'),
        )
      }
      continue
    }

    if (key === 'kanbanColumn') {
      if (oldVal !== newVal) {
        pushChange(
          label,
          KANBAN_PT[String(oldVal)] ?? String(oldVal ?? '—'),
          KANBAN_PT[String(newVal)] ?? String(newVal ?? '—'),
        )
      }
      continue
    }

    if (key === 'hoursContracted') {
      if (!sameNumber(oldVal, newVal)) {
        pushChange(label, `${Number(oldVal)}h`, `${Number(newVal)}h`)
      }
      continue
    }

    if (key === 'internalNotes' || key === 'modulesDescription' || key === 'manualAttentionNote') {
      if (!sameBlankableString(oldVal, newVal)) {
        lines.push(`${label} alterado.`)
        lines.push(`  Antes: ${clipLine(String(oldVal ?? ''))}`)
        lines.push(`  Depois: ${clipLine(String(newVal ?? ''))}`)
      }
      continue
    }

    if (typeof oldVal === 'string' || typeof newVal === 'string' || oldVal == null || newVal == null) {
      if (!sameBlankableString(oldVal, newVal)) {
        pushChange(label, clipLine(String(oldVal ?? '—')), clipLine(String(newVal ?? '—')))
      }
      continue
    }

    if (oldVal !== newVal) {
      pushChange(label, clipLine(JSON.stringify(oldVal)), clipLine(JSON.stringify(newVal)))
    }
  }

  if (lines.length === 0) return null

  return ['Alteração nos dados do projeto (cadastro / cliente).', ...lines].join('\n')
}
