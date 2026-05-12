import { supabase } from '../lib/supabaseClient'
import type { WelcomeFormSchemaPayload } from '../lib/welcomeFormSchema'

/** Projeto vinculado ao cliente no portal (lista inicial). */
export type PortalProject = {
  id: string
  projectName: string
  status: string
  startDate: string | null
  dueDate: string | null
  hoursContracted: number
  hoursUsed: number
}

/** Resumo do projeto retornado pelo grafo do portal. */
export type PortalProjectSummary = {
  id: string
  project_name?: string | null
  status?: string | null
  start_date?: string | null
  due_date?: string | null
  hours_contracted?: number | null
  hours_used?: number | null
}

export type PortalPhaseRow = {
  id: string
  name: string
  order_index?: number | null
  status?: string | null
  project_id: string
}

export type PortalTaskRow = {
  id: string
  title: string
  status: string
  phase_id: string
  estimated_hours?: number | null
  actual_hours?: number | null
}

export type PortalProjectGraph = {
  project: PortalProjectSummary | null
  phases: PortalPhaseRow[]
  tasks: PortalTaskRow[]
}

export type PortalEventRow = {
  id: string
  title?: string | null
  start_time?: string | null
  end_time?: string | null
  status?: string | null
  description?: string | null
  project_id?: string | null
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase indisponivel para o Portal Cliente.')
  return supabase
}

export async function fetchMyPortalProjects(): Promise<PortalProject[]> {
  const db = requireSupabase()
  const { data, error } = await db
    .from('project_client_links')
    .select('projects(id,project_name,status,start_date,due_date,hours_contracted,hours_used)')
  if (error) throw error
  return ((data ?? []) as unknown[])
    .flatMap((row) => {
      const r = row as { projects?: unknown }
      const p = r.projects
      if (p == null) return []
      return Array.isArray(p) ? p : [p]
    })
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null && !Array.isArray(p))
    .map((p) => ({
      id: String(p.id),
      projectName: String(p.project_name ?? ''),
      status: String(p.status ?? 'ativo'),
      startDate: p.start_date ? String(p.start_date) : null,
      dueDate: p.due_date ? String(p.due_date) : null,
      hoursContracted: Number(p.hours_contracted ?? 0),
      hoursUsed: Number(p.hours_used ?? 0),
    }))
}

export async function fetchPortalProjectGraph(projectId: string): Promise<PortalProjectGraph> {
  const db = requireSupabase()
  const [{ data: project, error: projectError }, { data: phases, error: phaseError }, { data: tasks, error: taskError }] =
    await Promise.all([
      db
        .from('projects')
        .select('id,project_name,status,start_date,due_date,hours_contracted,hours_used')
        .eq('id', projectId)
        .maybeSingle(),
      db.from('phases').select('id,name,order_index,status,project_id').eq('project_id', projectId).order('order_index'),
      db.from('tasks').select('id,title,status,phase_id,estimated_hours,actual_hours').eq('project_id', projectId),
    ])
  if (projectError) throw projectError
  if (phaseError) throw phaseError
  if (taskError) throw taskError
  return {
    project: project as PortalProjectSummary | null,
    phases: (phases ?? []) as PortalPhaseRow[],
    tasks: (tasks ?? []) as PortalTaskRow[],
  }
}

export async function fetchPortalAgenda(projectIds: string[]): Promise<PortalEventRow[]> {
  const db = requireSupabase()
  if (!projectIds.length) return []
  const { data, error } = await db
    .from('events')
    .select('id,title,start_time,end_time,status,project_id,description')
    .in('project_id', projectIds)
    .order('start_time')
  if (error) throw error
  return (data ?? []) as PortalEventRow[]
}

export async function fetchWelcomeTemplate(projectId: string) {
  const db = requireSupabase()
  const { data, error } = await db
    .from('welcome_form_templates')
    .select('id,project_id,name,form_schema,is_active')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Cria ou atualiza o template ativo do projeto (equipe com `can_edit_project`). */
export async function saveWelcomeTemplateForProject(args: {
  projectId: string
  name: string
  schema: WelcomeFormSchemaPayload
}): Promise<{ templateId: string }> {
  const db = requireSupabase()
  const { data: existing, error: qErr } = await db
    .from('welcome_form_templates')
    .select('id')
    .eq('project_id', args.projectId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (qErr) throw qErr
  if (existing?.id) {
    const { error } = await db
      .from('welcome_form_templates')
      .update({ name: args.name, form_schema: args.schema })
      .eq('id', existing.id)
    if (error) throw error
    return { templateId: String(existing.id) }
  }
  const { data: inserted, error } = await db
    .from('welcome_form_templates')
    .insert({
      project_id: args.projectId,
      name: args.name,
      form_schema: args.schema,
      is_active: true,
    })
    .select('id')
    .single()
  if (error) throw error
  return { templateId: String((inserted as { id: string }).id) }
}

export async function fetchMyWelcomeSubmission(projectId: string, templateId: string) {
  const db = requireSupabase()
  const { data, error } = await db
    .from('welcome_form_submissions')
    .select('id,answers,status,submitted_at')
    .eq('project_id', projectId)
    .eq('template_id', templateId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveWelcomeSubmission(args: {
  templateId: string
  projectId: string
  answers: Record<string, unknown>
  status: 'draft' | 'submitted'
}) {
  const db = requireSupabase()
  const payload = {
    template_id: args.templateId,
    project_id: args.projectId,
    answers: args.answers,
    status: args.status,
    submitted_at: args.status === 'submitted' ? new Date().toISOString() : null,
  }
  const { data, error } = await db.from('welcome_form_submissions').insert(payload).select('id').single()
  if (error) throw error
  return data
}

export type WelcomeSubmissionOpsRow = {
  id: string
  status?: string | null
  submitted_at?: string | null
  project_id: string
  client_id?: string | null
  created_at?: string | null
  profiles?: { name?: string | null } | null
  projects?: { project_name?: string | null } | null
  clients?: { name?: string | null } | null
}

export async function fetchWelcomeSubmissionsOps(): Promise<WelcomeSubmissionOpsRow[]> {
  const db = requireSupabase()
  const { data, error } = await db
    .from('welcome_form_submissions')
    .select('id,status,submitted_at,project_id,client_id,created_at,profiles(name),projects(project_name),clients(name)')
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return (data ?? []) as WelcomeSubmissionOpsRow[]
}

/** Submissões de boas-vindas deste projeto (equipe com permissão de edição do projeto). */
export type WelcomeSubmissionForProjectRow = {
  id: string
  status?: string | null
  submitted_at?: string | null
  created_at?: string | null
  answers?: unknown
  template_id?: string | null
  submitted_by?: string | null
  client_id?: string | null
  welcome_form_templates?: { name?: string | null } | null
  clients?: { name?: string | null } | null
}

export async function fetchWelcomeSubmissionsForProject(projectId: string): Promise<WelcomeSubmissionForProjectRow[]> {
  const db = requireSupabase()
  const { data, error } = await db
    .from('welcome_form_submissions')
    .select(
      'id,status,submitted_at,created_at,answers,template_id,submitted_by,client_id,welcome_form_templates(name),clients(name)',
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(80)
  if (error) throw error
  return (data ?? []) as WelcomeSubmissionForProjectRow[]
}

export type PortalProjectFile = {
  id: string
  projectId: string
  kind: 'template' | 'client_submission'
  originalName: string
  sizeBytes: number
  createdAt: string
  uploadedBy: string
}

function safeFileName(name: string): string {
  return name.replace(/[^\w.-]+/g, '_')
}

export async function listPortalProjectFiles(projectId: string, kind?: PortalProjectFile['kind']): Promise<PortalProjectFile[]> {
  const db = requireSupabase()
  let q = db
    .from('portal_project_files')
    .select('id,project_id,kind,original_name,size_bytes,created_at,uploaded_by')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (kind) q = q.eq('kind', kind)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    projectId: String(row.project_id),
    kind: String(row.kind) as PortalProjectFile['kind'],
    originalName: String(row.original_name ?? ''),
    sizeBytes: Number(row.size_bytes ?? 0),
    createdAt: String(row.created_at ?? ''),
    uploadedBy: String(row.uploaded_by ?? ''),
  }))
}

export async function uploadPortalProjectFile(args: { projectId: string; kind: PortalProjectFile['kind']; file: File }): Promise<void> {
  const db = requireSupabase()
  const timestamp = Date.now()
  const path = `${args.projectId}/${args.kind}/${timestamp}-${safeFileName(args.file.name)}`
  const upload = await db.storage.from('portal-files').upload(path, args.file, {
    upsert: false,
    contentType: args.file.type || 'application/octet-stream',
  })
  if (upload.error) throw upload.error

  const auth = await db.auth.getUser()
  const userId = auth.data.user?.id
  if (!userId) throw new Error('Sessão inválida para upload.')

  const { error } = await db.from('portal_project_files').insert({
    project_id: args.projectId,
    kind: args.kind,
    original_name: args.file.name,
    mime_type: args.file.type || null,
    size_bytes: args.file.size,
    storage_path: path,
    uploaded_by: userId,
  })
  if (error) throw error
}

export async function getPortalProjectFileDownloadUrl(fileId: string): Promise<string> {
  const db = requireSupabase()
  const { data: row, error: rowError } = await db
    .from('portal_project_files')
    .select('storage_path')
    .eq('id', fileId)
    .single()
  if (rowError) throw rowError
  const path = String((row as { storage_path?: string | null }).storage_path ?? '')
  if (!path) throw new Error('Arquivo sem caminho de storage.')

  const { data, error } = await db.storage.from('portal-files').createSignedUrl(path, 60)
  if (error) throw error
  if (!data?.signedUrl) throw new Error('Não foi possível gerar link de download.')
  return data.signedUrl
}

export type PortalClientFileOpsRow = {
  id: string
  project_id: string
  kind?: string | null
  original_name?: string | null
  size_bytes?: number | null
  created_at: string
  projects?: { project_name?: string | null } | null
  profiles?: { name?: string | null } | null
}

export async function fetchPortalClientFilesOps(): Promise<PortalClientFileOpsRow[]> {
  const db = requireSupabase()
  const { data, error } = await db
    .from('portal_project_files')
    .select('id,project_id,kind,original_name,size_bytes,created_at,projects(project_name),profiles(name)')
    .eq('kind', 'client_submission')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as PortalClientFileOpsRow[]
}
