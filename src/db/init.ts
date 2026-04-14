import { db } from './database'
import { seedDemoUnivestProject } from './demoUnivestProject'
import { seedTestProjects } from './seedTestProjects'
import { seedDatabase } from './seed'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { initializeSupabaseDexieBridge } from '../sync/supabaseDexieBridge'

let initPromise: Promise<void> | null = null
const LOCAL_SANDBOX_SEEDED_KEY = 'vyntask.localSandboxSeeded.v1'

function browserStorage(): Storage | null {
  return typeof window !== 'undefined' ? window.localStorage : null
}

async function ensureLocalSandboxProjects(): Promise<void> {
  const storage = browserStorage()
  if (storage?.getItem(LOCAL_SANDBOX_SEEDED_KEY) === '1') return

  // Se já houver projetos locais, consideramos o bootstrap concluído e não re-semeamos.
  const existingProjects = await db.projects.count()
  if (existingProjects > 0) {
    storage?.setItem(LOCAL_SANDBOX_SEEDED_KEY, '1')
    return
  }

  await seedDemoUnivestProject()
  await seedTestProjects()
  storage?.setItem(LOCAL_SANDBOX_SEEDED_KEY, '1')
}

export function ensureDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await db.open()
      if (isSupabaseConfigured()) {
        await initializeSupabaseDexieBridge()
      } else {
        await seedDatabase()
        await ensureLocalSandboxProjects()
      }
    })()
  }
  return initPromise
}
