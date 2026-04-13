import { db } from './database'
import { createProjectFromPlan } from '../services/project'
import { syncProjectKanbanFromPlanState } from '../services/kanbanPhaseSync'

const DEMO_CNPJ = '11060349000135'

const MODULES = `• PCP (Produção)
• Ficha Técnica
• Emissão de NF-e
• Relatórios Gerenciais
• Carteira de Pedidos
• Controle Financeiro
• Controle de Estoque
• Boletos
• Power B.I — Padrão e Produção`

const INTERNAL_NOTES = `Cliente: Juliana — confecção de uniformes; foco em controlar a produção (hoje está desorganizado).

Operação: 02 CNPJs no Lucro Presumido. Controle em um único estoque e cadastro de produtos; segundo CNPJ para separar faturamento, com baixa em um único estoque.

CNPJ principal (matriz/operação): 11.060.349/0001-35 — UNIVEST UBERABA CONFECCOES LTDA.
CNPJ secundário (faturamento): 22.939.124/0001-70 — Prestsilk Estamparia e Confecção Ltda.

Plano comercial referência: Pró ERP Confecção.`

/**
 * Garante um projeto de demonstração com dados reais informados (UNIVEST / Juliana).
 * Só cria se ainda não existir projeto com o CNPJ principal.
 */
export async function seedDemoUnivestProject(): Promise<void> {
  const dup = await db.projects.where('cnpj').equals(DEMO_CNPJ).first()
  if (dup) {
    await syncProjectKanbanFromPlanState(dup.id)
    return
  }

  const user = await db.users.orderBy('id').first()
  if (!user) return

  const analysts = (await db.analysts.toArray()).filter((a) => a.active)
  const analystId = analysts[0]?.id ?? null

  await createProjectFromPlan({
    projectName: 'UNIVEST Uberaba — ERP Confecção (Juliana)',
    planKey: 'pro',
    analystId,
    ownerId: user.id,
    createdBy: user.id,
    startDate: new Date().toISOString(),
    dueDate: null,
    cnpj: DEMO_CNPJ,
    razaoSocial: 'UNIVEST UBERABA CONFECCOES LTDA',
    tradeName: null,
    cep: null,
    addressStreet: null,
    addressNumber: null,
    addressComplement: null,
    addressNeighborhood: null,
    addressCity: 'Uberaba',
    addressState: 'MG',
    implantationContactName: 'Juliana',
    implantationContactPhone: '(34) 99915-0086',
    corporateEmail: null,
    clientApiId: null,
    internalNotes: INTERNAL_NOTES,
    stateRegistration: '13489780078',
    secondaryCnpj: '22939124000170',
    secondaryRazaoSocial: 'Prestsilk Estamparia e Confecção Ltda.',
    modulesDescription: MODULES,
  })
}
