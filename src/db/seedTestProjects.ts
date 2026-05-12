/**
 * Três projetos de sandbox (Basic / Pró / Master) com cadastro completo e cenários distintos
 * para testar kanban, fases, horas, relatórios, agenda e documentação.
 * CNPJs exclusivos do QA; não recria se já existir (só sincroniza coluna do kanban).
 */
import { db } from './database'
import { createProjectFromPlan } from '../services/project'
import { setTaskStatus } from '../services/tasks'
import { addProjectContact } from '../services/projectContacts'
import { addProjectDocumentation } from '../services/taskComments'
import { recalculateProjectHoursUsed } from '../services/hoursAccounting'
import { syncProjectKanbanFromPlanState } from '../services/kanbanPhaseSync'
import { createEventValidated } from '../services/events'

const QA_BASIC_CNPJ = '33014556000196'
const QA_PRO_CNPJ = '33014556000277'
const QA_MASTER_CNPJ = '33014556000358'

const QA_NOTE = `PROJETO DE TESTE IMPLANTACAO AZOUP (sandbox)
— Use para validar: Visão geral, Dashboard, Projetos, Fases/tarefas, Labels, Agenda, Relatórios, horas.
— Pode excluir estes projetos sem impacto em produção.`

function isoDaysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(12, 0, 0, 0)
  return d.toISOString()
}

async function phaseByOrder(projectId: string, orderIndex: number) {
  const phases = await db.phases.where('projectId').equals(projectId).toArray()
  return phases.find((p) => p.orderIndex === orderIndex) ?? null
}

async function tasksInPhase(projectId: string, orderIndex: number) {
  const ph = await phaseByOrder(projectId, orderIndex)
  if (!ph) return []
  return db.tasks.where('phaseId').equals(ph.id).sortBy('sortOrder')
}

async function concludePhase(projectId: string, orderIndex: number) {
  const list = await tasksInPhase(projectId, orderIndex)
  for (const t of list) {
    if (t.status === 'concluida' || t.status === 'cancelado') continue
    await setTaskStatus(t.id, 'concluida')
  }
}

async function seedAgendaSample(projectId: string, analystId: string | null, suffix: string) {
  const start = new Date()
  start.setDate(start.getDate() + 2)
  start.setHours(14, 0, 0, 0)
  const end = new Date(start)
  end.setHours(15, 30, 0, 0)
  await createEventValidated({
    title: `[QA ${suffix}] Alinhamento de implantação`,
    description: 'Evento fictício para testar a agenda e o dashboard.',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    status: 'agendado',
    projectId,
    taskId: null,
    analystId,
    meetingLink: 'https://meet.google.com/lookup/qa-implantacao-azoup-test',
  })
}

async function enrichCommon(
  projectId: string,
  userId: string,
  analystId: string | null,
  label: string,
) {
  await addProjectContact({
    projectId,
    name: `Contato fiscal ${label}`,
    phone: '(11) 98765-4321',
    role: 'Financeiro',
  })
  await addProjectContact({
    projectId,
    name: `Contato operação ${label}`,
    phone: '(11) 91234-5678',
    role: 'Produção / TI',
  })

  await addProjectDocumentation({
    projectId,
    authorId: userId,
    content: `Documentação inicial QA (${label}). Checklist: acessos, VPN, backup.`,
    docLinks: [
      {
        id: `${projectId}-qa-doclink`,
        url: 'https://docs.google.com/document/d/qa-implantacao-azoup-example',
        label: 'Doc compartilhado (exemplo)',
      },
    ],
  })

  await seedAgendaSample(projectId, analystId, label)
}

async function applyHoursSample(projectId: string, taskCodes: string[], hoursEach: number) {
  const tasks = await db.tasks.where('projectId').equals(projectId).toArray()
  for (const code of taskCodes) {
    const t = tasks.find((x) => x.code === code && !x.isInformational)
    if (t) await db.tasks.update(t.id, { actualHours: hoursEach })
  }
  await recalculateProjectHoursUsed(projectId)
}

/** Basic: Fase 00 concluída; Fase 01 em andamento (2 concluídas, 1 em andamento, resto pendente). */
async function scenarioBasic(projectId: string) {
  await concludePhase(projectId, 0)
  const t1 = await tasksInPhase(projectId, 1)
  let i = 0
  for (const t of t1) {
    if (t.isInformational) {
      if (t.status !== 'concluida') await setTaskStatus(t.id, 'concluida')
      continue
    }
    if (i === 0 || i === 1) {
      if (t.status !== 'concluida') await setTaskStatus(t.id, 'concluida')
    } else if (i === 2) {
      if (t.status !== 'em_andamento') await setTaskStatus(t.id, 'em_andamento')
      await db.tasks.update(t.id, { dueDate: isoDaysFromNow(7) })
    } else if (i === 3) {
      await db.tasks.update(t.id, { dueDate: isoDaysFromNow(14), priority: 'alta' })
    }
    i++
  }
  await applyHoursSample(projectId, ['0.7', '0.8', '1.1'], 1.5)
}

/** Pró: Fases 00 e 01 concluídas; Fase 02 com uma tarefa em andamento. */
async function scenarioPro(projectId: string) {
  await concludePhase(projectId, 0)
  await concludePhase(projectId, 1)
  const t2 = await tasksInPhase(projectId, 2)
  let seen = false
  for (const t of t2) {
    if (t.isInformational) {
      if (t.status !== 'concluida') await setTaskStatus(t.id, 'concluida')
      continue
    }
    if (!seen) {
      await setTaskStatus(t.id, 'em_andamento')
      await db.tasks.update(t.id, { dueDate: isoDaysFromNow(5) })
      seen = true
    }
  }
  await applyHoursSample(projectId, ['0.7', '0.8', '1.1', '1.2', '2.1'], 2)
}

/** Master: Fases 00–02 concluídas; Fase 03 (produção) com trabalho em aberto. */
async function scenarioMaster(projectId: string) {
  await concludePhase(projectId, 0)
  await concludePhase(projectId, 1)
  await concludePhase(projectId, 2)
  const t3 = await tasksInPhase(projectId, 3)
  let idx = 0
  for (const t of t3) {
    if (t.isInformational) {
      if (t.status !== 'concluida') await setTaskStatus(t.id, 'concluida')
      continue
    }
    if (idx === 0) await setTaskStatus(t.id, 'concluida')
    else if (idx === 1) {
      await setTaskStatus(t.id, 'em_andamento')
      await db.tasks.update(t.id, { dueDate: isoDaysFromNow(3), priority: 'alta' })
    }
    idx++
  }
  await applyHoursSample(projectId, ['0.7', '0.8', '1.1', '2.1', '3.1', '3.2'], 2.5)
}

export async function seedTestProjects(): Promise<void> {
  const user = await db.users.orderBy('id').first()
  if (!user) return

  const analysts = (await db.analysts.toArray()).filter((a) => a.active)
  const a0 = analysts[0]?.id ?? null
  const a1 = analysts[1]?.id ?? a0

  const start = new Date()
  start.setMonth(start.getMonth() - 2)
  const due = new Date()
  due.setMonth(due.getMonth() + 4)

  const defs = [
    {
      cnpj: QA_BASIC_CNPJ,
      planKey: 'basic' as const,
      name: '[QA] Sandbox Basic 30h — IMPLANTACAO AZOUP',
      analystId: a0,
      scenario: scenarioBasic as (id: string) => Promise<void>,
      tradeName: 'QA Confecções Basic Ltda',
      secondaryCnpj: null as string | null,
      secondaryRazao: null as string | null,
      modules: 'Escopo Basic: vendas, produção enxuta, BI essencial.',
    },
    {
      cnpj: QA_PRO_CNPJ,
      planKey: 'pro' as const,
      name: '[QA] Sandbox Pró 50h — IMPLANTACAO AZOUP',
      analystId: a1,
      scenario: scenarioPro,
      tradeName: 'QA Confecções Pró ME',
      secondaryCnpj: '33014556000439',
      secondaryRazao: 'QA Confecções Filial Faturamento LTDA',
      modules: 'Escopo Pró: vendas, financeiro, produção confecção, BI, boletos, estoque MP.',
    },
    {
      cnpj: QA_MASTER_CNPJ,
      planKey: 'master' as const,
      name: '[QA] Sandbox Master 70h — IMPLANTACAO AZOUP',
      analystId: a0,
      scenario: scenarioMaster,
      tradeName: 'QA Confecções Master Group',
      secondaryCnpj: '33014556000510',
      secondaryRazao: 'QA Confecções Holding Teste LTDA',
      modules: 'Escopo Master: e-commerce, Azvendas, compras, Correios, BI estendido, módulos extras.',
    },
  ]

  for (const def of defs) {
    const dup = await db.projects.where('cnpj').equals(def.cnpj).first()
    if (dup) {
      await syncProjectKanbanFromPlanState(dup.id)
      continue
    }

    const projectId = await createProjectFromPlan({
      projectName: def.name,
      clientType: 'confeccao',
      planKey: def.planKey,
      ownerId: user.id,
      createdBy: user.id,
      analystId: def.analystId,
      cnpj: def.cnpj,
      razaoSocial: `${def.tradeName} (Razão Social QA)`,
      tradeName: def.tradeName,
      cep: '01310100',
      addressStreet: 'Avenida Paulista',
      addressNumber: '1000',
      addressComplement: 'Conj. 42 — QA',
      addressNeighborhood: 'Bela Vista',
      addressCity: 'São Paulo',
      addressState: 'SP',
      implantationContactName: 'Fulano QA Silva',
      implantationContactPhone: '(11) 98888-7777',
      corporateEmail: `qa-${def.planKey}@exemplo-implantacao-azoup.invalid`,
      clientApiId: `implantacao-azoup-qa-${def.planKey}`,
      internalNotes: `${QA_NOTE}\n\nPlano: ${def.planKey.toUpperCase()} · ${def.modules}`,
      stateRegistration: '123456789012',
      secondaryCnpj: def.secondaryCnpj,
      secondaryRazaoSocial: def.secondaryRazao,
      modulesDescription: def.modules,
      startDate: start.toISOString(),
      dueDate: due.toISOString(),
    })

    const tag = def.planKey.toUpperCase()
    await enrichCommon(projectId, user.id, def.analystId, tag)
    await def.scenario(projectId)
    await syncProjectKanbanFromPlanState(projectId)
  }
}
