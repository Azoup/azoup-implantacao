/** Tipo de sessão para export do cronograma e descrição ao cliente. */
export type SessionType = 'technical' | 'training' | 'handover'

export type SessionTypeOrInfer = SessionType | null

export const SESSION_TYPE_DESCRIPTION: Record<SessionType, string> = {
  technical: 'Conexão remota via TeamViewer, sem reunião',
  training: 'Reunião Online de Treinamento e Conexão remota via TeamViewer.',
  handover: 'Acompanhamento Online, inicio de uso do Sistema',
}

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  technical: 'Técnica (TeamViewer, sem reunião)',
  training: 'Treinamento (reunião online)',
  handover: 'Virada de sistema',
}

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Infere o tipo de sessão pelo título da tarefa.
 * Ordem: virada → técnica (instalação/config) → treinamento (padrão).
 */
export function inferSessionType(taskTitle: string): SessionType {
  const t = normalizeForMatch(taskTitle)
  if (/virada/.test(t)) return 'handover'
  if (/instala[cç][aã]o|configura[cç][oõ]|importa[cç][aã]o|parametriz|parametr/.test(t)) {
    return 'technical'
  }
  return 'training'
}

export function resolveSessionType(
  taskTitle: string,
  stored: SessionTypeOrInfer | undefined,
): SessionType {
  if (stored === 'technical' || stored === 'training' || stored === 'handover') return stored
  return inferSessionType(taskTitle)
}

export function sessionTypeDescription(taskTitle: string, stored?: SessionTypeOrInfer): string {
  return SESSION_TYPE_DESCRIPTION[resolveSessionType(taskTitle, stored)]
}

/** Treinamento e virada geram Google Meet; técnica (instalação/config) só agenda no Google Calendar. */
export function sessionTypeUsesGoogleMeet(sessionType: SessionType): boolean {
  return sessionType === 'training' || sessionType === 'handover'
}

export function shouldAddGoogleMeetForTask(taskTitle: string, stored?: SessionTypeOrInfer): boolean {
  return sessionTypeUsesGoogleMeet(resolveSessionType(taskTitle, stored))
}
