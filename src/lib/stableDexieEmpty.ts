/**
 * Referências estáveis para fallback quando `useLiveQuery` ainda retornou `undefined`.
 * Evita `?? []` (novo array a cada render), que dispara avisos de react-hooks/exhaustive-deps.
 */
import type {
  DbAnalyst,
  DbAuditLog,
  DbComment,
  DbEvent,
  DbPhase,
  DbPlanModel,
  DbProject,
  DbProjectContact,
  DbTask,
  DbTimeLog,
  DbTimeSession,
  DbUser,
} from '../db/types'

function frozen<T extends readonly unknown[]>(xs: T): T {
  return Object.freeze(xs) as T
}

export const emptyProjects = frozen([] as DbProject[])
export const emptyTasks = frozen([] as DbTask[])
export const emptyEvents = frozen([] as DbEvent[])
export const emptyPhases = frozen([] as DbPhase[])
export const emptyAnalysts = frozen([] as DbAnalyst[])
export const emptyPlanModels = frozen([] as DbPlanModel[])
export const emptyUsers = frozen([] as DbUser[])
export const emptyComments = frozen([] as DbComment[])
export const emptyContacts = frozen([] as DbProjectContact[])
export const emptyAuditLogs = frozen([] as DbAuditLog[])
export const emptyTimeLogs = frozen([] as DbTimeLog[])
export const emptyTimeSessions = frozen([] as DbTimeSession[])
