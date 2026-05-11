export type FeedbackAction =
  | 'create'
  | 'update'
  | 'save'
  | 'delete'
  | 'register'
  | 'activate'
  | 'deactivate'
  | 'sync'

export type FeedbackGender = 'm' | 'f'

type BuildMessageInput = {
  action: FeedbackAction
  target?: string
  gender?: FeedbackGender
}

const SUCCESS_ENDING_BY_GENDER: Record<FeedbackGender, Record<FeedbackAction, string>> = {
  m: {
    create: 'criado',
    update: 'alterado',
    save: 'salvo',
    delete: 'excluido',
    register: 'registrado',
    activate: 'ativado',
    deactivate: 'inativado',
    sync: 'sincronizado',
  },
  f: {
    create: 'criada',
    update: 'alterada',
    save: 'salva',
    delete: 'excluida',
    register: 'registrada',
    activate: 'ativada',
    deactivate: 'inativada',
    sync: 'sincronizada',
  },
}

const ERROR_VERB_BY_ACTION: Record<FeedbackAction, string> = {
  create: 'criar',
  update: 'alterar',
  save: 'salvar',
  delete: 'excluir',
  register: 'registrar',
  activate: 'ativar',
  deactivate: 'inativar',
  sync: 'sincronizar',
}

function titleCaseFirst(text: string): string {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function buildFeedbackSuccessMessage(input: BuildMessageInput): string {
  const gender = input.gender ?? 'm'
  const verb = SUCCESS_ENDING_BY_GENDER[gender][input.action]
  const target = input.target?.trim()
  if (!target) return `${titleCaseFirst(verb)} com sucesso.`
  return `${titleCaseFirst(target)} ${verb} com sucesso.`
}

export function buildFeedbackErrorMessage(input: BuildMessageInput): string {
  const verb = ERROR_VERB_BY_ACTION[input.action]
  const target = input.target?.trim()
  if (!target) return `Nao foi possivel ${verb}.`
  return `Nao foi possivel ${verb} ${target}.`
}
