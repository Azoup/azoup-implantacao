/**
 * Títulos padronizados para agenda e Google Calendar: **`EMPRESA - ASSUNTO`** (caixa alta).
 *
 * - **EMPRESA** — cliente do projeto (`tradeName` → `razaoSocial` → `projectName`).
 * - **ASSUNTO** — nome da tarefa vinculada (fases do plano), sem código `1.1.` / `1.2.`.
 *
 * `events.title` guarda o assunto bruto (ou título vindo do Google); a formatação
 * usa projeto/tarefa resolvidos na UI ou no push, mesmo quando `project_id` está nulo
 * (ex.: import Google sem vínculo).
 */
import type { DbEvent, DbProject, DbTask } from '../db/types'

/** Prefixos de tarefa do plano: `1.1.`, `1.2.`, `2.3 `, `1.1 ` … */
const PLAN_CODE_PREFIX_RE = /^\d+(?:\.\d+)+\.?\s*/

/** Marcadores no início do nome do projeto, ex. `[UPSELL]`. */
const BRACKET_TAG_PREFIX_RE = /^\[[^\]]+\]\s*/i

const EMPRESA_ASSUNTO_SEP = ' - '

const GENERIC_EMPRESA = new Set(['INTERNO', 'PROJETO'])

const INTERNO_PREFIX_RE = /^INTERNO\s*-\s*/i

export type CalendarTitleProject = Pick<DbProject, 'projectName' | 'tradeName' | 'razaoSocial'>
export type CalendarTitleEvent = Pick<DbEvent, 'title' | 'projectId'>
export type CalendarTitleTask = Pick<DbTask, 'code' | 'title'>

/** Remove códigos hierárquicos do plano no início do assunto. */
export function stripTaskCodePrefix(title: string): string {
  let s = String(title ?? '').trim()
  while (PLAN_CODE_PREFIX_RE.test(s)) {
    s = s.replace(PLAN_CODE_PREFIX_RE, '').trim()
  }
  return s
}

/** Remove tags entre colchetes no início (repetidas). */
export function stripLeadingBracketTags(name: string): string {
  let s = String(name ?? '').trim()
  while (BRACKET_TAG_PREFIX_RE.test(s)) {
    s = s.replace(BRACKET_TAG_PREFIX_RE, '').trim()
  }
  return s
}

/**
 * Nome curto do cliente para o prefixo EMPRESA.
 * Retorna string vazia se o projeto não tiver nome utilizável.
 */
export function extractEmpresaFromProject(project: CalendarTitleProject | null | undefined): string {
  const raw = (
    project?.tradeName?.trim() ||
    project?.razaoSocial?.trim() ||
    project?.projectName?.trim() ||
    ''
  ).trim()
  if (!raw) return ''

  let cleaned = stripLeadingBracketTags(raw)
  const dashIdx = cleaned.indexOf(EMPRESA_ASSUNTO_SEP)
  if (dashIdx > 0) cleaned = cleaned.slice(0, dashIdx).trim()
  return cleaned.toUpperCase()
}

/** Separa título já no padrão `EMPRESA - ASSUNTO` (ex.: vindo do Google). */
export function parseEmpresaAssuntoFromTitle(title: string): { empresa: string; assunto: string } | null {
  let raw = String(title ?? '').trim()
  if (!raw) return null
  raw = raw.replace(INTERNO_PREFIX_RE, '').trim()
  const idx = raw.indexOf(EMPRESA_ASSUNTO_SEP)
  if (idx <= 0) return null
  const empresa = raw.slice(0, idx).trim()
  let assunto = raw.slice(idx + EMPRESA_ASSUNTO_SEP.length).trim()
  if (!empresa || !assunto) return null
  assunto = stripTaskCodePrefix(assunto)
  if (!assunto) return null
  return { empresa: empresa.toUpperCase(), assunto: assunto.toUpperCase() }
}

function stripLeadingTaskCode(subject: string, task?: CalendarTitleTask | null): string {
  const s = subject
  const code = task?.code?.trim()
  if (!code) return s

  if (s.startsWith(`${code} `)) return s.slice(code.length + 1).trim()
  if (s.startsWith(`${code}.`)) return s.slice(code.length + 1).trim()
  if (s.startsWith(code)) return s.slice(code.length).trim().replace(/^[.\s]+/, '')
  return s
}

function cleanRawEventTitle(title: string | null | undefined): string {
  return String(title ?? '')
    .trim()
    .replace(INTERNO_PREFIX_RE, '')
    .trim()
}

function resolveAssunto(event: CalendarTitleEvent, task?: CalendarTitleTask | null): string {
  if (task?.title?.trim()) {
    let subject = task.title.trim()
    subject = stripLeadingTaskCode(subject, task)
    subject = stripTaskCodePrefix(subject)
    return subject.trim() || 'Compromisso'
  }

  let subject = cleanRawEventTitle(event.title) || 'Compromisso'
  const parsed = parseEmpresaAssuntoFromTitle(subject)
  if (parsed && !GENERIC_EMPRESA.has(parsed.empresa)) {
    return stripTaskCodePrefix(parsed.assunto) || 'Compromisso'
  }

  subject = stripLeadingTaskCode(subject, task)
  subject = stripTaskCodePrefix(subject)
  return subject.trim() || 'Compromisso'
}

function resolveEmpresa(
  event: CalendarTitleEvent,
  project?: CalendarTitleProject | null,
): string {
  const fromProject = extractEmpresaFromProject(project)
  if (fromProject) return fromProject

  const parsed = parseEmpresaAssuntoFromTitle(event.title ?? '')
  if (parsed && !GENERIC_EMPRESA.has(parsed.empresa)) return parsed.empresa

  return ''
}

/** Título formatado para chips da agenda (e Google, mesmo padrão). */
export function formatAgendaDisplayTitle(
  event: CalendarTitleEvent,
  project?: CalendarTitleProject | null,
  task?: CalendarTitleTask | null,
): string {
  const empresa = resolveEmpresa(event, project)
  const assunto = resolveAssunto(event, task).toUpperCase()
  if (empresa) return `${empresa} - ${assunto}`
  return assunto
}

/** Alias explícito para push / templates Google Calendar. */
export const formatGoogleCalendarTitle = formatAgendaDisplayTitle
