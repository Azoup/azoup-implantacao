/**
 * Mesmo padrão de `src/lib/calendarEventTitle.ts` — **`EMPRESA - ASSUNTO`** (caixa alta).
 * Mantido aqui para edge functions Deno (sem import do bundle Vite).
 */

const PLAN_CODE_PREFIX_RE = /^\d+(?:\.\d+)+\.?\s*/
const BRACKET_TAG_PREFIX_RE = /^\[[^\]]+\]\s*/i
const EMPRESA_ASSUNTO_SEP = ' - '
const GENERIC_EMPRESA = new Set(['INTERNO', 'PROJETO'])
const INTERNO_PREFIX_RE = /^INTERNO\s*-\s*/i

export type CalendarTitleProjectRow = {
  project_name?: string | null
  trade_name?: string | null
  razao_social?: string | null
}

export type CalendarTitleTaskRow = {
  code?: string | null
  title?: string | null
}

export function stripTaskCodePrefix(title: string): string {
  let s = String(title ?? '').trim()
  while (PLAN_CODE_PREFIX_RE.test(s)) {
    s = s.replace(PLAN_CODE_PREFIX_RE, '').trim()
  }
  return s
}

export function stripLeadingBracketTags(name: string): string {
  let s = String(name ?? '').trim()
  while (BRACKET_TAG_PREFIX_RE.test(s)) {
    s = s.replace(BRACKET_TAG_PREFIX_RE, '').trim()
  }
  return s
}

export function extractEmpresaFromProject(project: CalendarTitleProjectRow | null | undefined): string {
  const raw = (
    project?.trade_name?.trim() ||
    project?.razao_social?.trim() ||
    project?.project_name?.trim() ||
    ''
  ).trim()
  if (!raw) return ''

  let cleaned = stripLeadingBracketTags(raw)
  const dashIdx = cleaned.indexOf(EMPRESA_ASSUNTO_SEP)
  if (dashIdx > 0) cleaned = cleaned.slice(0, dashIdx).trim()
  return cleaned.toUpperCase()
}

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

function stripLeadingTaskCode(subject: string, task?: CalendarTitleTaskRow | null): string {
  let s = subject
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

function resolveAssunto(
  eventTitle: string | null | undefined,
  task?: CalendarTitleTaskRow | null,
): string {
  if (task?.title?.trim()) {
    let subject = String(task.title).trim()
    subject = stripLeadingTaskCode(subject, task)
    subject = stripTaskCodePrefix(subject)
    return subject.trim() || 'Compromisso'
  }

  let subject = cleanRawEventTitle(eventTitle) || 'Compromisso'
  const parsed = parseEmpresaAssuntoFromTitle(subject)
  if (parsed && !GENERIC_EMPRESA.has(parsed.empresa)) {
    return stripTaskCodePrefix(parsed.assunto) || 'Compromisso'
  }

  subject = stripLeadingTaskCode(subject, task)
  subject = stripTaskCodePrefix(subject)
  return subject.trim() || 'Compromisso'
}

function resolveEmpresa(
  eventTitle: string | null | undefined,
  project?: CalendarTitleProjectRow | null,
): string {
  const fromProject = extractEmpresaFromProject(project)
  if (fromProject) return fromProject

  const parsed = parseEmpresaAssuntoFromTitle(eventTitle ?? '')
  if (parsed && !GENERIC_EMPRESA.has(parsed.empresa)) return parsed.empresa

  return ''
}

/** Título para `upsertGoogleEvent` e exibição alinhada ao app. */
export function formatGoogleCalendarTitle(
  eventTitle: string | null | undefined,
  _projectId: string | null | undefined,
  project?: CalendarTitleProjectRow | null,
  task?: CalendarTitleTaskRow | null,
): string {
  const empresa = resolveEmpresa(eventTitle, project)
  const assunto = resolveAssunto(eventTitle, task).toUpperCase()
  if (empresa) return `${empresa} - ${assunto}`
  return assunto
}
