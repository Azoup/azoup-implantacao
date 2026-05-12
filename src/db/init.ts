import { db } from './database'
import { seedDemoUnivestProject } from './demoUnivestProject'
import { seedTestProjects } from './seedTestProjects'
import { seedDatabase } from './seed'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { initializeSupabaseDexieBridge } from '../sync/supabaseDexieBridge'
import { startLiveSyncAfterBridgeReady } from '../sync/liveSyncController'
import { pushRuntimeDiagnostic } from '../diagnostics/runtimeDiagnostics'

let initPromise: Promise<void> | null = null
const LOCAL_SANDBOX_SEEDED_KEY = 'implantacao_azoup.localSandboxSeeded.v1'

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch (e) {
    pushRuntimeDiagnostic({
      source: 'db-init',
      level: 'warn',
      message: 'localStorage indisponível durante bootstrap.',
      details: e instanceof Error ? e.message : String(e),
    })
    return null
  }
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
        await startLiveSyncAfterBridgeReady()
      } else {
        await seedDatabase()
        await ensureLocalSandboxProjects()
      }
    })()
  }
  return initPromise
}
