import { db } from './database'
import { seedDemoUnivestProject } from './demoUnivestProject'
import { seedTestProjects } from './seedTestProjects'
import { seedDatabase } from './seed'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { initializeSupabaseDexieBridge } from '../sync/supabaseDexieBridge'

let initPromise: Promise<void> | null = null

export function ensureDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await db.open()
      if (isSupabaseConfigured()) {
        await initializeSupabaseDexieBridge()
      } else {
        await seedDatabase()
        await seedDemoUnivestProject()
        await seedTestProjects()
      }
    })()
  }
  return initPromise
}
