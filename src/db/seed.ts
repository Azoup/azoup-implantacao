import { hashPassword } from '../lib/password'
import { uuid } from '../lib/uuid'
import { defaultScopesForRole } from '../auth/permissions'
import { db } from './database'
import { buildBasicPlan, buildMasterPlan, buildProPlan } from './builtinPlans'
import { DEFAULT_PLAN_PRESENTATION_URLS, STATIC_PLAN_PRESENTATIONS } from '../constants/planPresentations'
import type { DbPlanPhase, DbPlanTask, PlanTypeKey } from './types'

async function seedPlan(
  key: PlanTypeKey,
  name: string,
  hoursContracted: number,
  builder: (planId: string) => { phase: DbPlanPhase; tasks: DbPlanTask[] }[],
) {
  const planId = uuid()
  const rows = builder(planId)
  await db.planModels.add({
    id: planId,
    key,
    name,
    hoursContracted,
    phaseCount: rows.length,
    active: true,
    presentationUrl: DEFAULT_PLAN_PRESENTATION_URLS[key] ?? null,
    clientDescription: STATIC_PLAN_PRESENTATIONS.find((s) => s.key === key)?.blurb ?? null,
  })
  for (const { phase, tasks } of rows) {
    await db.planPhases.add(phase)
    for (const t of tasks) await db.planTasks.add(t)
  }
}

let seeding = false
const LOCAL_TEST_ADMIN_EMAIL = 'admin@azoup.com'
const LOCAL_TEST_ADMIN_PASSWORD = 'Azoup@2026'

async function ensureLocalTestAdminUser(): Promise<void> {
  const allUsers = await db.users.toArray()
  const hasAnyPasswordLogin = allUsers.some(
    (u) => u.status === 'active' && typeof u.passwordHash === 'string' && u.passwordHash.trim().length > 0,
  )
  if (hasAnyPasswordLogin) return

  const adminHash = await hashPassword(LOCAL_TEST_ADMIN_EMAIL, LOCAL_TEST_ADMIN_PASSWORD)
  const existing = await db.users.where('email').equals(LOCAL_TEST_ADMIN_EMAIL).first()
  if (existing) {
    await db.users.update(existing.id, {
      name: existing.name || 'Administrador',
      passwordHash: adminHash,
      role: 'admin',
      userType: 'internal',
      permissions: defaultScopesForRole('admin'),
      status: 'active',
    })
    return
  }

  await db.users.add({
    id: uuid(),
    name: 'Administrador',
    email: LOCAL_TEST_ADMIN_EMAIL,
    passwordHash: adminHash,
    role: 'admin',
    userType: 'internal',
    permissions: defaultScopesForRole('admin'),
    status: 'active',
    createdAt: new Date().toISOString(),
    lastLogin: null,
  })
}

export async function seedDatabase(): Promise<void> {
  if (seeding) return
  seeding = true
  try {
    const n = await db.users.count()
    if (n > 0) {
      await ensureLocalTestAdminUser()
      return
    }

    const adminHash = await hashPassword(LOCAL_TEST_ADMIN_EMAIL, LOCAL_TEST_ADMIN_PASSWORD)
    await db.users.add({
      id: uuid(),
      name: 'Administrador',
      email: LOCAL_TEST_ADMIN_EMAIL,
      passwordHash: adminHash,
      role: 'admin',
      userType: 'internal',
      permissions: defaultScopesForRole('admin'),
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: null,
    })

    await db.analysts.bulkAdd([
      {
        id: uuid(),
        name: 'Anderson Telis Junior',
        avatarUrl: null,
        color: '#3B82F6',
        active: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: uuid(),
        name: 'Vinícius Helamã Lameu',
        avatarUrl: null,
        color: '#22C55E',
        active: true,
        createdAt: new Date().toISOString(),
      },
    ])

    await seedPlan('basic', 'Basic', 30, buildBasicPlan)
    await seedPlan('pro', 'Pró', 50, buildProPlan)
    await seedPlan('master', 'Master', 70, buildMasterPlan)
    await ensureLocalTestAdminUser()
  } finally {
    seeding = false
  }
}
