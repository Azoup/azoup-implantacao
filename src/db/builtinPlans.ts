/**
 * Estruturas dos planos Basic (30h), Pró (50h) e Master (70h)
 * alinhadas às apresentações Azoup (PDF/TXT) e tabelas de horas.
 *
 * `orderIndex` da fase = coluna do kanban (Visão geral): 0 → Fase 00, 1 → Fase 01, …
 * Códigos de tarefa: o número antes do ponto (0.7, 1.2, 2.1…) segue essa mesma fase.
 */
import { uuid } from '../lib/uuid'
import { db } from './database'
import type { DbPlanPhase, DbPlanTask, PlanTypeKey } from './types'

type TDef = {
  code: string
  title: string
  description: string
  hours: number
  info?: boolean
}

export const BUILTIN_PLAN_KEYS_LIST = ['basic', 'pro', 'master'] as const

const ONBOARDING: TDef[] = [
  { code: '0.1', title: 'Primeiro contato', description: 'Registrar contato inicial e expectativas.', hours: 0, info: true },
  { code: '0.2', title: 'Formulário de boas-vindas', description: 'Coletar dados cadastrais básicos.', hours: 0, info: true },
  { code: '0.3', title: 'Reunião de alinhamento', description: 'Alinhar escopo, prazos e responsáveis.', hours: 0, info: true },
  { code: '0.4', title: 'Acesso aos ambientes', description: 'Liberar acessos e credenciais necessárias.', hours: 0, info: true },
  { code: '0.5', title: 'Coleta de documentos', description: 'Checklist de documentos fiscais e operacionais.', hours: 0, info: true },
  { code: '0.6', title: 'Cronograma inicial', description: 'Publicar cronograma macro da implantação.', hours: 0, info: true },
]

function phaseRows(
  planModelId: string,
  name: string,
  orderIndex: number,
  tasks: TDef[],
): { phase: DbPlanPhase; tasks: DbPlanTask[] } {
  const phase: DbPlanPhase = {
    id: uuid(),
    planModelId,
    name,
    orderIndex,
  }
  const taskRows: DbPlanTask[] = tasks.map((t, sortOrder) => ({
    id: uuid(),
    planPhaseId: phase.id,
    code: t.code,
    title: t.title,
    description: t.description,
    estimatedHours: t.info ? 0 : t.hours,
    isInformational: !!t.info,
    sortOrder,
  }))
  return { phase, tasks: taskRows }
}

const P00 = 'FASE 00 - Preparativos (ou onboarding)'
const P01 = 'FASE 01 (Vendas)'
const P02_FIN = 'FASE 02 - Financeiro'
const P02_PROD = 'FASE 02 - Produção'
const P03_GER = 'FASE 03 - Gerenciamento e relatórios'
const P03_PROD = 'FASE 03 - Produção'
const P04_GER = 'FASE 04 - Gerenciamento e relatórios'

/** Basic: 30h — TXT + tabela (inst./config. em preparativos; vendas / produção / gerencial). */
export function buildBasicPlan(planId: string) {
  const out: { phase: DbPlanPhase; tasks: DbPlanTask[] }[] = []
  out.push(
    phaseRows(planId, P00, 0, [
      ...ONBOARDING,
      { code: '0.7', title: 'Instalação do sistema', description: 'Instalação e validação do ambiente.', hours: 2 },
      { code: '0.8', title: 'Configurações', description: 'Parametrização inicial do sistema.', hours: 2 },
    ]),
  )
  out.push(
    phaseRows(planId, P01, 1, [
      { code: '1.1', title: 'Cadastros: vendas', description: 'Cadastros para o fluxo comercial.', hours: 3 },
      { code: '1.2', title: 'Vendas', description: 'Fluxo de pedidos e faturamento.', hours: 3 },
      { code: '1.3', title: 'NF-e', description: 'Parametrização e emissão de NF-e.', hours: 2 },
      { code: '1.4', title: 'Virada de sistema: vendas', description: 'Go-live do módulo de vendas.', hours: 4 },
    ]),
  )
  out.push(
    phaseRows(planId, P02_PROD, 2, [
      { code: '2.1', title: 'Cadastros: confecção', description: 'Cadastros para produção.', hours: 3 },
      { code: '2.2', title: 'Ordem de produção', description: 'PCP e ordens de produção.', hours: 3 },
      { code: '2.3', title: 'Virada de sistema: produção', description: 'Go-live da produção.', hours: 4 },
    ]),
  )
  out.push(
    phaseRows(planId, P03_GER, 3, [
      { code: '3.1', title: 'Controle financeiro', description: 'Rotinas financeiras essenciais.', hours: 2 },
      { code: '3.2', title: 'Controle de estoque: produto acabado', description: 'Estoque de produto acabado.', hours: 1 },
      { code: '3.3', title: 'Relatórios BI', description: 'Painéis e relatórios gerenciais.', hours: 1 },
    ]),
  )
  return out
}

/** Pró: 50h — TXT + tabela. */
export function buildProPlan(planId: string) {
  const out: { phase: DbPlanPhase; tasks: DbPlanTask[] }[] = []
  out.push(
    phaseRows(planId, P00, 0, [
      ...ONBOARDING,
      { code: '0.7', title: 'Instalação do sistema', description: 'Instalação e validação do ambiente.', hours: 2 },
      { code: '0.8', title: 'Configurações', description: 'Parametrização inicial do sistema.', hours: 2 },
    ]),
  )
  out.push(
    phaseRows(planId, P01, 1, [
      { code: '1.1', title: 'Cadastros: vendas', description: 'Cadastros para o fluxo comercial.', hours: 4 },
      { code: '1.2', title: 'Vendas', description: 'Fluxo de pedidos e faturamento.', hours: 4 },
      { code: '1.3', title: 'NF-e', description: 'Parametrização e emissão de NF-e.', hours: 4 },
      { code: '1.4', title: 'Virada de sistema: vendas', description: 'Go-live do módulo de vendas.', hours: 4 },
    ]),
  )
  out.push(
    phaseRows(planId, P02_FIN, 2, [
      { code: '2.1', title: 'Controle financeiro', description: 'Rotinas e controles financeiros.', hours: 4 },
      { code: '2.2', title: 'Boletos', description: 'Cadastro e processo de boletos.', hours: 1 },
    ]),
  )
  out.push(
    phaseRows(planId, P03_PROD, 3, [
      { code: '3.1', title: 'Cadastros: confecção', description: 'Cadastros para produção.', hours: 4 },
      { code: '3.2', title: 'Ficha técnica e ficha de custo', description: 'Fichas técnicas e de custo.', hours: 4 },
      { code: '3.3', title: 'Ordem de produção', description: 'PCP e ordens de produção.', hours: 4 },
      { code: '3.4', title: 'Virada de sistema: produção', description: 'Go-live da produção.', hours: 4 },
      { code: '3.5', title: 'Pagamento de faccionistas', description: 'Rotina de pagamento a faccionistas.', hours: 2 },
      { code: '3.6', title: 'Controle de estoque: matéria-prima', description: 'Estoque de insumos e MP.', hours: 3 },
    ]),
  )
  out.push(
    phaseRows(planId, P04_GER, 4, [
      { code: '4.1', title: 'Fluxo de caixa', description: 'Projeções e movimentações de caixa.', hours: 2 },
      { code: '4.2', title: 'DRE', description: 'Demonstrativo de resultados.', hours: 1 },
      { code: '4.3', title: 'Relatórios BI', description: 'Painéis e relatórios gerenciais.', hours: 1 },
    ]),
  )
  return out
}

/** Master: 70h — tabela oficial + fases do TXT. */
export function buildMasterPlan(planId: string) {
  const out: { phase: DbPlanPhase; tasks: DbPlanTask[] }[] = []
  out.push(
    phaseRows(planId, P00, 0, [
      ...ONBOARDING,
      { code: '0.7', title: 'Instalação do sistema', description: 'Instalação e validação do ambiente.', hours: 3 },
      { code: '0.8', title: 'Configurações', description: 'Parametrização inicial do sistema.', hours: 3 },
    ]),
  )
  out.push(
    phaseRows(planId, P01, 1, [
      { code: '1.1', title: 'Cadastros: vendas', description: 'Cadastros para o fluxo comercial.', hours: 4 },
      { code: '1.2', title: 'Vendas', description: 'Fluxo de pedidos e faturamento.', hours: 4 },
      { code: '1.3', title: 'NF-e', description: 'Parametrização e emissão de NF-e.', hours: 4 },
      { code: '1.4', title: 'Virada de sistema: vendas', description: 'Go-live do módulo de vendas.', hours: 4 },
      { code: '1.5', title: 'Azvendas', description: 'Módulo / rotinas Azvendas.', hours: 4 },
      { code: '1.6', title: 'Integração e-commerce', description: 'Integração com loja virtual e canais online.', hours: 4 },
    ]),
  )
  out.push(
    phaseRows(planId, P02_FIN, 2, [
      { code: '2.1', title: 'Controle financeiro', description: 'Rotinas e controles financeiros.', hours: 2 },
      { code: '2.2', title: 'Controle de cheque', description: 'Gestão de cheques.', hours: 2 },
      { code: '2.3', title: 'Boletos', description: 'Cadastro e processo de boletos.', hours: 2 },
    ]),
  )
  out.push(
    phaseRows(planId, P03_PROD, 3, [
      { code: '3.1', title: 'Cadastros: confecção', description: 'Cadastros para produção.', hours: 4 },
      { code: '3.2', title: 'Ficha técnica e ficha de custo', description: 'Fichas técnicas e de custo.', hours: 6 },
      { code: '3.3', title: 'Ordem de produção', description: 'PCP e ordens de produção.', hours: 4 },
      { code: '3.4', title: 'Virada de sistema: produção', description: 'Go-live da produção.', hours: 4 },
      { code: '3.5', title: 'Pagamento de faccionistas', description: 'Rotina de pagamento a faccionistas.', hours: 2 },
      { code: '3.6', title: 'Controle de estoque: matéria-prima', description: 'Estoque de insumos e MP.', hours: 4 },
    ]),
  )
  out.push(
    phaseRows(planId, P04_GER, 4, [
      { code: '4.1', title: 'Fluxo de caixa', description: 'Projeções e movimentações de caixa.', hours: 2 },
      { code: '4.2', title: 'DRE', description: 'Demonstrativo de resultados.', hours: 2 },
      { code: '4.3', title: 'Compras', description: 'Fluxo de compras e recebimento.', hours: 2 },
      { code: '4.4', title: 'Integração com os Correios', description: 'Integração logística / Correios.', hours: 2 },
      { code: '4.5', title: 'Relatórios BI', description: 'Painéis e relatórios gerenciais.', hours: 2 },
    ]),
  )
  return out
}

const HOURS: Record<(typeof BUILTIN_PLAN_KEYS_LIST)[number], number> = {
  basic: 30,
  pro: 50,
  master: 70,
}

function builderForKey(key: PlanTypeKey): ((planId: string) => { phase: DbPlanPhase; tasks: DbPlanTask[] }[]) | null {
  if (key === 'basic') return buildBasicPlan
  if (key === 'pro') return buildProPlan
  if (key === 'master') return buildMasterPlan
  return null
}

/**
 * Substitui fases e tarefas modelo de um plano base (basic / pro / master).
 * Não remove o registro do plano nem altera a chave.
 */
export async function replaceBuiltinPlanStructure(planId: string, key: PlanTypeKey): Promise<void> {
  const build = builderForKey(key)
  if (!build) return
  const rows = build(planId)
  await db.transaction('rw', db.planTasks, db.planPhases, db.planModels, async () => {
    const oldPhases = await db.planPhases.where('planModelId').equals(planId).toArray()
    for (const ph of oldPhases) {
      await db.planTasks.where('planPhaseId').equals(ph.id).delete()
    }
    await db.planPhases.where('planModelId').equals(planId).delete()
    for (const { phase, tasks } of rows) {
      await db.planPhases.add(phase)
      for (const t of tasks) await db.planTasks.add(t)
    }
    await db.planModels.update(planId, {
      phaseCount: rows.length,
      hoursContracted: HOURS[key as keyof typeof HOURS] ?? (await db.planModels.get(planId))?.hoursContracted ?? 0,
    })
  })
}

/** Migração / manutenção: atualiza os três planos base no banco local. */
export async function syncBuiltinPlanTemplates(): Promise<void> {
  for (const key of BUILTIN_PLAN_KEYS_LIST) {
    const plan = await db.planModels.where('key').equals(key).first()
    if (!plan) continue
    await replaceBuiltinPlanStructure(plan.id, key)
  }
}
