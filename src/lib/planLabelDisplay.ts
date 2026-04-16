import { phaseProgressionAccent } from '../constants/phaseProgression'
import type { DbPhase, DbTask } from '../db/types'
import { compareTaskCode } from './taskCode'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '').trim()
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function mixHex(from: string, to: string, t: number): string {
  const a = hexToRgb(from)
  const b = hexToRgb(to)
  const r = Math.round(a.r + (b.r - a.r) * t)
  const g = Math.round(a.g + (b.g - a.g) * t)
  const bl = Math.round(a.b + (b.b - a.b) * t)
  return `#${[r, g, bl].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const lin = [r, g, b].map((c) => {
    const x = c / 255
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}

/** Texto legível sobre o fundo da etiqueta (claro/escuro). */
export function planLabelTextOnBackground(bg: string): string {
  return relativeLuminance(bg) > 0.42 ? '#0f172a' : '#f8fafc'
}

export function parsePlanCodeMajorMinor(code: string): { major: number; minor: number } {
  const s = code.trim()
  const i = s.indexOf('.')
  if (i < 0) {
    const major = parseInt(s, 10)
    return { major: Number.isFinite(major) && major >= 0 ? major : 0, minor: 1 }
  }
  const major = parseInt(s.slice(0, i), 10)
  const rest = s.slice(i + 1)
  const m = /^(\d+)/.exec(rest)
  const minor = m ? parseInt(m[1], 10) : 1
  return {
    major: Number.isFinite(major) && major >= 0 ? major : 0,
    minor: Number.isFinite(minor) && minor > 0 ? minor : 1,
  }
}

/** Cores da etiqueta = mesma cor da fase (0.x → Fase 00, 1.x → Fase 01, …); sem tons diferentes por subcódigo. */
export function planLabelColorsFromCode(code: string): { background: string; color: string } {
  const { major } = parsePlanCodeMajorMinor(code)
  const background = phaseProgressionAccent(major)
  return { background, color: planLabelTextOnBackground(background) }
}

/** Cor “chefe” da fase (timeline, cabeçalho da seção Labels, kanban) pelo `orderIndex` do plano. */
export function planPhaseAccentHex(planOrderIndex: number): string {
  return phaseProgressionAccent(planOrderIndex)
}

/**
 * Pills da aba Labels (projeto): fundo/borda/ponto alinhados ao código; concluídas ficam na mesma família, mais apagadas.
 */
export function planLabelTabPillStyle(code: string, completed: boolean): {
  background: string
  color: string
  dot: string
  border: string
} {
  const base = planLabelColorsFromCode(code)
  if (!completed) {
    const dot = mixHex(base.background, '#0f172a', 0.24)
    const border = mixHex(base.background, '#0f172a', 0.32)
    return { background: base.background, color: base.color, dot, border }
  }
  const bg = mixHex(base.background, '#334155', 0.5)
  const color = planLabelTextOnBackground(bg)
  const dot = mixHex(bg, '#0f172a', 0.22)
  const border = mixHex(bg, '#475569', 0.45)
  return { background: bg, color, dot, border }
}

export type PlanLabelChip = { code: string; name: string }

function titleForCode(tasks: DbTask[], code: string): string {
  const subset = tasks.filter((t) => t.code === code).sort((a, b) => a.sortOrder - b.sortOrder)
  return subset[0]?.title ?? code
}

/**
 * Último código do plano totalmente encerrado (todas as tarefas operacionais concluídas ou canceladas,
 * com ao menos uma concluída), na ordem do plano — equivale ao “último marco executado”.
 */
export function getLastCompletedPlanLabel(tasks: DbTask[], projectId: string): PlanLabelChip | null {
  const mine = tasks.filter((t) => t.projectId === projectId && !t.isInformational)
  if (mine.length === 0) return null
  const codes = [...new Set(mine.map((t) => t.code))].sort(compareTaskCode)
  let last: PlanLabelChip | null = null
  for (const code of codes) {
    const subset = mine.filter((t) => t.code === code)
    const allDone = subset.every((t) => t.status === 'concluida' || t.status === 'cancelado')
    const anyDone = subset.some((t) => t.status === 'concluida')
    if (allDone && anyDone) {
      last = { code, name: titleForCode(mine, code) }
    }
  }
  return last
}

/**
 * Primeiro código com trabalho em aberto na **fase ativa** do projeto (pendente ou em andamento).
 * Inclui tarefas informativas (0.x comuns na Fase 00), para não “pular” para 1.x enquanto a fase 01
 * estiver bloqueada. Requer `phases` alinhadas ao projeto (ex.: Dexie).
 */
export function getActivePlanLabel(tasks: DbTask[], projectId: string, phases: DbPhase[]): PlanLabelChip | null {
  const projectPhases = phases
    .filter((ph) => ph.projectId === projectId)
    .sort((a, b) => a.orderIndex - b.orderIndex)
  const activePhase = projectPhases.find((ph) => ph.status === 'ativa')
  if (!activePhase) return null

  const mine = tasks.filter((t) => t.projectId === projectId && t.phaseId === activePhase.id)
  if (mine.length === 0) return null
  const codes = [...new Set(mine.map((t) => t.code))].sort(compareTaskCode)
  const curCode = codes.find((c) =>
    mine.some((t) => t.code === c && t.status !== 'concluida' && t.status !== 'cancelado'),
  )
  if (!curCode) return null
  const open = mine
    .filter((t) => t.code === curCode && t.status !== 'concluida' && t.status !== 'cancelado')
    .sort((a, b) => a.sortOrder - b.sortOrder)[0]
  return { code: curCode, name: open?.title ?? titleForCode(mine, curCode) }
}
