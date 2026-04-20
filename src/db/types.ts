export type UserRole = 'admin' | 'user'
export type UserStatus = 'active' | 'inactive'
export type PermissionScope =
  | 'dashboard.view'
  | 'overview.view'
  | 'projects.view'
  | 'projects.edit'
  | 'tasks.view'
  | 'tasks.edit'
  | 'agenda.view'
  | 'agenda.edit'
  | 'reports.view'
  | 'ai.view'
  | 'settings.view'
  | 'settings.edit'
  | 'planModels.view'
  | 'planModels.edit'
  | 'analysts.view'
  | 'analysts.edit'

export type ProjectStatus = 'ativo' | 'pausado' | 'finalizado' | 'cancelado'

/** Chave única do modelo no catálogo (basic, pro, master ou slug customizado). */
export type PlanTypeKey = string

export type KanbanColumn =
  | 'novos'
  | 'fase_01'
  | 'fase_02'
  | 'fase_03'
  | 'fase_04'
  | 'finalizados'
  | 'cancelados'

export type PhaseStatus = 'bloqueada' | 'ativa' | 'concluida'

export type TaskStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelado'
export type TaskPriority = 'baixa' | 'media' | 'alta'

export type EventStatus = 'agendado' | 'realizado' | 'cancelado'

export type TimeLogType = 'executado' | 'cancelado_sem_horas' | 'cancelado_com_horas'

/** Origem do bloco de tempo na tarefa. */
export type TimeSessionSource = 'timer' | 'manual'

/**
 * Sessão de timesheet (cronômetro ou tempo manual).
 * `endedAt` null = cronômetro ativo. Horas do projeto = soma de `actualHours` só em tarefas não informativas.
 */
export interface DbTimeSession {
  id: string
  taskId: string
  userId: string
  /** Analista da tarefa no registro (mesmo vínculo esperado para eventos da agenda ligados à tarefa). */
  analystId: string | null
  startedAt: string
  endedAt: string | null
  durationSeconds: number | null
  source: TimeSessionSource
  notes: string
  createdAt: string
}

export type LabelStatus = 'not_started' | 'in_progress' | 'completed'

export interface DbUser {
  id: string
  name: string
  email: string
  /** Ausente quando o usuário vem só do Supabase Auth (senha não fica no app). */
  passwordHash?: string
  role: UserRole
  /** Scopes preparado para futura migração para Auth externo (ex.: Supabase). */
  permissions?: PermissionScope[] | null
  status: UserStatus
  createdAt: string
  lastLogin: string | null
}

export interface DbAnalyst {
  id: string
  name: string
  avatarUrl: string | null
  color: string
  active: boolean
  createdAt: string
  /** Mesmo id que public.profiles (Supabase); usado em RLS can_edit_project na nuvem. */
  profileId?: string | null
}

export interface DbPlanModel {
  id: string
  key: PlanTypeKey
  name: string
  hoursContracted: number
  phaseCount: number
  active: boolean
  /** URL ou caminho da apresentação (PDF, Slides, etc.) para o cliente */
  presentationUrl: string | null
  /** Texto curto opcional na vitrine /apresentacoes */
  clientDescription: string | null
}

export interface DbPlanPhase {
  id: string
  planModelId: string
  name: string
  orderIndex: number
  /** Cor oficial da fase (hex) usada nas etiquetas e barras. */
  colorHex: string
}

export interface DbPlanTask {
  id: string
  planPhaseId: string
  code: string
  title: string
  description: string
  estimatedHours: number
  isInformational: boolean
  sortOrder: number
}

export interface DbProject {
  id: string
  /** Nome comercial do projeto / como aparece nos quadros */
  projectName: string
  planType: PlanTypeKey
  hoursContracted: number
  hoursUsed: number
  startDate: string | null
  dueDate: string | null
  status: ProjectStatus
  ownerId: string
  analystId: string | null
  createdBy: string
  createdAt: string
  kanbanColumn: KanbanColumn
  /** CNPJ somente dígitos (14) ou null */
  cnpj: string | null
  razaoSocial: string | null
  /** Nome fantasia (ex.: retorno Brasil API) */
  tradeName: string | null
  cep: string | null
  addressStreet: string | null
  addressNumber: string | null
  addressComplement: string | null
  addressNeighborhood: string | null
  addressCity: string | null
  addressState: string | null
  implantationContactName: string | null
  implantationContactPhone: string | null
  corporateEmail: string | null
  clientApiId: string | null
  internalNotes: string | null
  /** Inscrição estadual (IE), somente dígitos ou texto conforme UF */
  stateRegistration: string | null
  /** Segundo CNPJ (ex.: faturamento separado), somente dígitos */
  secondaryCnpj: string | null
  secondaryRazaoSocial: string | null
  /** Módulos / escopo contratado (texto livre) */
  modulesDescription: string | null
  /** Momento em que o plano contratado foi congelado no projeto. */
  planSnapshotCapturedAt: string
  /** Foto do plano na criação do projeto (baseline contratual). */
  planSnapshot: DbProjectPlanSnapshot
  /** Último `updated_at` do Postgres (migração opcional D_domain…); merge incremental / Realtime. */
  remoteUpdatedAt?: string | null
}

/** Catálogo: modelo de plano. `mode` omitido = catálogo (compatível com dados antigos). */
export type DbProjectPlanSnapshotCatalog = {
  mode?: 'catalog'
  modelId: string
  key: string
  name: string
  hoursContracted: number
  phaseCount: number
  taskCount: number
}

/** Plano avulso: sem modelo no catálogo; `hoursContracted` é teto negocial (ajustável com confirmação). */
export type DbProjectPlanSnapshotCustom = {
  mode: 'custom'
  /** Sem modelo real; use string vazia ou placeholder na serialização. */
  modelId: string | null
  key: 'custom'
  name: string
  hoursContracted: number
  phaseCount: number
  taskCount: number
}

export type DbProjectPlanSnapshot = DbProjectPlanSnapshotCatalog | DbProjectPlanSnapshotCustom

export interface DbProjectContact {
  id: string
  projectId: string
  name: string
  phone: string
  role: string
}

export interface DbPhase {
  id: string
  projectId: string
  name: string
  orderIndex: number
  status: PhaseStatus
  /** Snapshot da cor da fase no momento da criação do projeto. */
  colorHex: string | null
  /** Último `updated_at` do Postgres (migração opcional D_domain…). */
  remoteUpdatedAt?: string | null
}

export interface DbTask {
  id: string
  title: string
  description: string
  projectId: string
  phaseId: string
  status: TaskStatus
  priority: TaskPriority
  estimatedHours: number
  actualHours: number
  assignedTo: string | null
  dueDate: string | null
  isInformational: boolean
  createdAt: string
  code: string
  sortOrder: number
  /** Último `updated_at` do Postgres (migração opcional D_domain…). */
  remoteUpdatedAt?: string | null
}

export interface DbEvent {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  status: EventStatus
  projectId: string | null
  taskId: string | null
  analystId: string | null
  meetingLink: string | null
  recordingLink: string | null
  createdAt: string
}

export interface DbTimeLog {
  id: string
  taskId: string
  userId: string
  hours: number
  logType: TimeLogType
  notes: string
  executionDate: string
  isLocked: boolean
}

/** Link explícito na documentação do projeto (além de URLs no texto). */
export interface DbDocLink {
  id: string
  url: string
  /** Texto exibido; se null, mostra a URL. */
  label: string | null
}

/** Arquivo ou imagem anexado à documentação (armazenado no IndexedDB). */
export interface DbDocAttachment {
  id: string
  fileName: string
  mimeType: string
  blob: Blob
}

export interface DbComment {
  id: string
  content: string
  authorId: string
  projectId: string | null
  taskId: string | null
  eventId: string | null
  createdAt: string
  updatedAt: string | null
  docLinks?: DbDocLink[] | null
  docAttachments?: DbDocAttachment[] | null
}

export interface DbProjectDeletionLog {
  id: string
  projectId: string
  projectName: string
  deletedByUserId: string
  deletedByUserName: string
  deletedByUserEmail: string
  justification: string
  deletedAt: string
}

export type AuditAction = 'inclusao' | 'alteracao' | 'exclusao'
export type AuditEntity = 'projeto' | 'timer' | 'fase' | 'tarefa' | 'contato' | 'comentario' | 'outro'

export interface DbAuditLog {
  id: string
  action: AuditAction
  entity: AuditEntity
  entityId: string | null
  entityLabel: string
  userId: string
  userName: string
  userEmail: string
  justification: string | null
  details: string
  createdAt: string
}

export interface DbLabel {
  id: string
  projectId: string
  code: string
  name: string
  status: LabelStatus
}
