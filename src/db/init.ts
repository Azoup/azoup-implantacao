import { db } from './database'
import { seedDemoUnivestProject } from './demoUnivestProject'
import { seedTestProjects } from './seedTestProjects'
import { seedDatabase } from './seed'

let initPromise: Promise<void> | null = null

export function ensureDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await db.open()
      await seedDatabase()
      await seedDemoUnivestProject()
      await seedTestProjects()
    })()
  }
  return initPromise
}
