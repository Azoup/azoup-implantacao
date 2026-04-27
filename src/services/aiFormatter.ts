import { supabase } from '../lib/supabaseClient'

export type AiFormatIntent = 'project_doc' | 'task_description'
export type AiApplyMode = 'replace' | 'append'

export type AiFormatResult = {
  formattedText: string
  source: 'ai' | 'local_fallback'
}

type FormatPayload = {
  schemaVersion: 'v1'
  intent: AiFormatIntent
  text: string
  locale: 'pt-BR'
  style: 'objective'
  maxChars: number
}

function normalizeLine(line: string): string {
  return line
    .replace(/^\s*[*•-]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function uniqueKeepOrder(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    const key = item.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

function buildProjectDocFallback(rawText: string): string {
  const rawLines = rawText
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const cleaned = rawLines.map(normalizeLine).filter(Boolean)
  if (cleaned.length === 0) return ''

  const titleBase = cleaned[0].length > 90 ? 'Escopo do Projeto' : cleaned[0]
  const title = /plano|escopo|projeto/i.test(titleBase) ? titleBase : `Escopo do Projeto - ${titleBase}`

  const moduleHints = /(pcp|ficha|nf|relat|pedid|finance|estoque|boleto|power\s*bi|crm|fiscal|produc|implant)/i
  const modules = uniqueKeepOrder(
    cleaned.filter((line) => {
      if (line.length < 2 || line.length > 64) return false
      const fromBullet = /^\s*[*•-]/.test(line)
      if (fromBullet) return true
      return moduleHints.test(line)
    }),
  ).slice(0, 12)

  const longLines = cleaned.filter((line) => line.length >= 70)
  const summary =
    longLines.find((line) => /(cliente|empresa|segmento|confecc|uniforme|fabrica|produc)/i.test(line)) ??
    longLines[0] ??
    cleaned[0]

  const goalHints = /(implantar|estruturar|melhorar|organizar|controlar|previs|automat|integrar|reduzir)/i
  const goals = uniqueKeepOrder(cleaned.filter((line) => goalHints.test(line) && line.length >= 18)).slice(0, 6)

  const attentionHints = /(aten[cç][aã]o|dor|critic|inquieta|sem controle|mat[ée]ria-?prima|gargalo|risco)/i
  const attentions = uniqueKeepOrder(cleaned.filter((line) => attentionHints.test(line) && line.length >= 18)).slice(0, 4)

  const out: string[] = []
  out.push(`## ${title}`)
  out.push('')
  out.push('### Modulos')
  for (const mod of modules.length > 0 ? modules : ['Escopo modular nao detalhado no texto original.']) {
    out.push(`- ${mod}`)
  }
  out.push('')
  out.push('### Resumo')
  out.push(`- ${summary}`)
  out.push('')
  out.push('### Objetivo do Projeto')
  for (const g of goals.length > 0 ? goals : ['Consolidar o escopo e validar prioridades com o cliente.']) {
    out.push(`- ${g}`)
  }
  out.push('')
  out.push('### Ponto de Atencao')
  for (const a of attentions.length > 0 ? attentions : ['Validar riscos operacionais e dependencias criticas antes da implantacao.']) {
    out.push(`- ${a}`)
  }
  return out.join('\n')
}

function localFallbackFormat(rawText: string, intent: AiFormatIntent): string {
  if (intent === 'project_doc') {
    return buildProjectDocFallback(rawText)
  }

  const cleaned = rawText
    .replace(/\r/g, '\n')
    .split('\n')
    .map(normalizeLine)
    .filter(Boolean)

  if (cleaned.length === 0) return ''

  const first = cleaned[0]
  const title = first.length > 90 ? 'Registro estruturado' : first
  const sectionHeaders = cleaned.filter((l) => /^\d+[.)]\s*/.test(l))
  const highlights = cleaned.filter((l) => !/^\d+[.)]\s*/.test(l)).slice(0, 12)

  const intro = 'Descrição de tarefa estruturada automaticamente.'

  const out: string[] = []
  out.push(`## ${title}`)
  out.push('')
  out.push(`- ${intro}`)
  out.push('- Revise antes de salvar.')
  out.push('')

  if (sectionHeaders.length > 0) {
    out.push('### Seções detectadas')
    for (const h of sectionHeaders.slice(0, 8)) {
      out.push(`- ${h}`)
    }
    out.push('')
  }

  out.push('### Pontos principais')
  for (const l of highlights) {
    out.push(`- ${l}`)
  }
  out.push('')
  out.push('### Próximos passos')
  out.push('- Validar informações-chave com o cliente/equipe.')
  out.push('- Ajustar responsáveis e prazos no VynTask.')
  return out.join('\n')
}

async function callFormatterEndpoint(payload: FormatPayload, timeoutMs = 14_000): Promise<string | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    let authHeader: string | null = null
    if (supabase) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.access_token) authHeader = `Bearer ${session.access_token}`
    }
    const res = await fetch('/functions/v1/ai-format-doc', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { formattedText?: string; output?: { markdown?: string } }
    const formatted = data.formattedText ?? data.output?.markdown ?? null
    return typeof formatted === 'string' && formatted.trim().length > 0 ? formatted.trim() : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function formatTextWithAi(text: string, intent: AiFormatIntent): Promise<AiFormatResult> {
  const safe = text.trim()
  if (!safe) return { formattedText: '', source: 'local_fallback' }
  const payload: FormatPayload = {
    schemaVersion: 'v1',
    intent,
    text: safe.slice(0, 12_000),
    locale: 'pt-BR',
    style: 'objective',
    maxChars: 12_000,
  }
  const remote = await callFormatterEndpoint(payload)
  if (remote) return { formattedText: remote, source: 'ai' }
  return { formattedText: localFallbackFormat(safe, intent), source: 'local_fallback' }
}
