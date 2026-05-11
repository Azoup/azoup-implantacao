import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Check,
  Cloud,
  DatabaseZap,
  Monitor,
  Moon,
  Palette,
  Shield,
  SlidersHorizontal,
  Sun,
  Trash2,
  Upload,
  UserCheck,
  UserX,
  Users,
  Wrench,
} from 'lucide-react'
import { db } from '../db/database'
import { useAuth } from '../auth/AuthContext'
import { RescheduleChainMigrationPanel } from '../components/RescheduleChainMigrationPanel'
import { ALL_PERMISSION_SCOPES, defaultScopesForRole, hasScope, PERMISSION_MODULES, scopesForUser } from '../auth/permissions'
import type { DbUser, PermissionScope } from '../db/types'
import { formatDatePt } from '../lib/dates'
import { emptyUsers } from '../lib/stableDexieEmpty'
import { PALETTE_PRESETS } from '../theme/paletteCatalog'
import { useTheme } from '../theme/ThemeContext'
import { useRegisterUnsavedChanges } from '../navigation/UnsavedChangesContext'
import { useUiFeedback } from '../ui/UiFeedbackContext'
import {
  canOverrideDataModeRuntime,
  getDataMode,
  getDataModeOverrideRuntime,
  isSupabaseConfigured,
  setDataModeOverrideRuntime,
  supabase,
  type DataMode,
} from '../lib/supabaseClient'
import { refreshSupabaseDexieCache } from '../sync/supabaseDexieBridge'
import { mapProfileToUser, type ProfileRow } from '../auth/mapProfileToUser'
import { runIncrementalDomainSync } from '../sync/supabaseIncrementalPull'
import { startSupabaseRealtimeDomainSync, stopSupabaseRealtimeDomainSync } from '../sync/supabaseRealtimeBridge'
import { flushPendingProjectGraphSyncQueue, getPendingProjectGraphSyncIds } from '../sync/supabaseDexieBridge'
import {
  clearRuntimeDiagnostics,
  getBrowserCapabilitySnapshot,
  getRuntimeSyncSnapshot,
  listRuntimeDiagnostics,
  type RuntimeDiagEntry,
} from '../diagnostics/runtimeDiagnostics'
import {
  fetchPortalClientFilesOps,
  fetchWelcomeSubmissionsOps,
  getPortalProjectFileDownloadUrl,
  type PortalClientFileOpsRow,
  type WelcomeSubmissionOpsRow,
  uploadPortalProjectFile,
} from '../services/clientPortal'

const SETTINGS_PROFILES_TIMEOUT_MS = 25_000
const SETTINGS_PROFILES_TIMEOUT_MSG = `A consulta de perfis passou de ${SETTINGS_PROFILES_TIMEOUT_MS / 1000}s sem resposta. Testar em localhost não bloqueia essa lista; verifique rede, VPN, extensões do navegador ou o status do projeto no Supabase.`

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let id: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        id = setTimeout(() => reject(new Error(message)), ms)
      }),
    ])
  } finally {
    if (id !== undefined) clearTimeout(id)
  }
}

/** Lista `profiles` para a tela de admin (RLS aplica conforme o papel no banco). */
async function fetchAdminProfilesList(client: SupabaseClient): Promise<ProfileRow[]> {
  const { data: sessionData } = await client.auth.getSession()
  if (!sessionData.session?.user) {
    throw new Error('Sessão não encontrada. Faça login novamente.')
  }
  const first = await client
    .from('profiles')
    .select('id,email,name,role,user_type,permissions,status,created_at,last_login_at')
    .order('created_at', { ascending: false })
  let data = (first.data as ProfileRow[] | null) ?? null
  let error = first.error
  if (error && /user_type/i.test(error.message ?? '')) {
    const fallback = await client
      .from('profiles')
      .select('id,email,name,role,permissions,status,created_at,last_login_at')
      .order('created_at', { ascending: false })
    data = (fallback.data as ProfileRow[] | null) ?? null
    error = fallback.error
  }
  if (error) throw error
  return (data ?? []) as ProfileRow[]
}

async function fetchUsersListForSettings(client: SupabaseClient): Promise<DbUser[]> {
  const rows = await fetchAdminProfilesList(client)
  return rows.map(mapProfileToUser)
}

type SettingsTab = 'geral' | 'usuarios' | 'aparencia' | 'console'

const icTab = { size: 18, strokeWidth: 2, absoluteStrokeWidth: true } as const
const DIAG_LEVEL_LABEL: Record<RuntimeDiagEntry['level'], string> = {
  error: 'Crítico',
  warn: 'Atenção',
  info: 'Informativo',
}

export function SettingsPage() {
  const { user: current } = useAuth()
  const { theme, themeSource, setTheme, setThemeSource, palette, setPalette } = useTheme()
  const cachedUsers = useLiveQuery(() => db.users.toArray(), []) ?? emptyUsers
  const modKey = useMemo(
    () => (/Mac|iPhone|iPad|iPod/i.test(navigator.userAgent) ? '⌘' : 'Ctrl'),
    [],
  )
  const [tab, setTab] = useState<SettingsTab>('geral')
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [permissionsOpen, setPermissionsOpen] = useState(false)
  const [permissionsUserId, setPermissionsUserId] = useState<string | null>(null)
  const [permissionDraft, setPermissionDraft] = useState<PermissionScope[]>([])
  const [permissionsSaving, setPermissionsSaving] = useState(false)
  const [usersBusy, setUsersBusy] = useState<string | null>(null)
  const [remoteUsers, setRemoteUsers] = useState<DbUser[] | null>(null)
  /** Só para admin: null = ainda carregando lista remota; não usar Dexie como fallback (cache pode ter só 1 perfil). */
  const [usersRemoteLoadError, setUsersRemoteLoadError] = useState<string | null>(null)
  const [dataModeState, setDataModeState] = useState<{
    mode: DataMode
    override: DataMode | null
    canOverride: boolean
  }>({
    mode: getDataMode(),
    override: getDataModeOverrideRuntime(),
    canOverride: canOverrideDataModeRuntime(),
  })
  const [diag, setDiag] = useState<RuntimeDiagEntry[]>([])
  const [runtimeSync, setRuntimeSync] = useState(getRuntimeSyncSnapshot())
  const [pendingSyncCount, setPendingSyncCount] = useState(0)
  const [diagBusy, setDiagBusy] = useState<string | null>(null)
  const [portalBusy, setPortalBusy] = useState<string | null>(null)
  const [portalClients, setPortalClients] = useState<Array<{ id: string; name: string; status: string }>>([])
  const [portalProjects, setPortalProjects] = useState<Array<{ id: string; project_name: string }>>([])
  const [portalSubmissions, setPortalSubmissions] = useState<WelcomeSubmissionOpsRow[]>([])
  const [portalClientFiles, setPortalClientFiles] = useState<PortalClientFileOpsRow[]>([])
  const [newClientName, setNewClientName] = useState('')
  const [linkProfileId, setLinkProfileId] = useState('')
  const [linkClientId, setLinkClientId] = useState('')
  const [linkProjectId, setLinkProjectId] = useState('')
  const portalTemplateFileRef = useRef<HTMLInputElement>(null)
  const usersListEffectGen = useRef(0)
  const [portalTemplateFileHint, setPortalTemplateFileHint] = useState<string | null>(null)
  const canEditSettings = hasScope(current, 'settings.edit')
  const canManageUsers = current?.role === 'admin'
  const latestDiag = diag[0] ?? null
  const hasQueue = pendingSyncCount > 0
  const hasRealtimeIssue = runtimeSync.realtimeStatus === 'error' || runtimeSync.realtimeStatus === 'timed_out'
  const hasRecentError = latestDiag?.level === 'error'
  const diagnosticsSimpleStatus = hasRealtimeIssue || hasRecentError ? 'critical' : hasQueue ? 'attention' : 'ok'
  const diagnosticsStatusLabel =
    diagnosticsSimpleStatus === 'critical'
      ? 'Problema detectado'
      : diagnosticsSimpleStatus === 'attention'
        ? 'Atenção necessária'
        : 'Funcionando normalmente'
  const diagnosticsStatusHint =
    diagnosticsSimpleStatus === 'critical'
      ? 'A sincronização pode falhar para parte da equipe.'
      : diagnosticsSimpleStatus === 'attention'
        ? 'Há itens na fila pendente; recomendamos processar agora.'
        : 'Sem falhas críticas recentes no navegador atual.'
  const diagnosticsRecommendedAction =
    diagnosticsSimpleStatus === 'critical'
      ? 'Clique em "Reabrir realtime". Se continuar, execute "Forçar pull incremental" e envie os detalhes técnicos ao suporte.'
      : diagnosticsSimpleStatus === 'attention'
        ? 'Clique em "Processar fila pendente" para reduzir atrasos de sincronização.'
        : 'Nenhuma ação obrigatória agora. Monitore apenas se houver relato de divergência.'
  const users = useMemo(() => {
    if (!canManageUsers) return cachedUsers
    if (remoteUsers !== null) return remoteUsers
    return []
  }, [canManageUsers, remoteUsers, cachedUsers])
  const editingPermissionUser = permissionsUserId ? users.find((u) => u.id === permissionsUserId) ?? null : null
  const { requestConfirm, toast, toastError } = useUiFeedback()

  function formatSupabaseError(err: unknown, fallback: string): string {
    if (!err || typeof err !== 'object') return fallback
    const e = err as { message?: string; code?: string; details?: string; hint?: string }
    const parts = [e.message, e.code ? `code=${e.code}` : null, e.details, e.hint].filter(Boolean)
    return parts.length > 0 ? parts.join(' | ') : fallback
  }

  function diagSourceLabel(source: string): string {
    const s = source.toLowerCase()
    if (s.includes('auth')) return 'Autenticação'
    if (s.includes('realtime')) return 'Tempo real'
    if (s.includes('incremental') || s.includes('pull')) return 'Sincronização'
    if (s.includes('cache') || s.includes('dexie') || s.includes('indexeddb')) return 'Cache local'
    if (s.includes('queue') || s.includes('pending')) return 'Fila'
    return source.length > 26 ? `${source.slice(0, 26)}...` : source
  }

  async function loadUsersFromSupabase() {
    if (!supabase) throw new Error('Supabase não configurado.')
    const list = await withTimeout(
      fetchUsersListForSettings(supabase),
      SETTINGS_PROFILES_TIMEOUT_MS,
      SETTINGS_PROFILES_TIMEOUT_MSG,
    )
    setRemoteUsers(list)
  }

  useEffect(() => {
    if (!canManageUsers || !supabase) {
      setRemoteUsers(null)
      setUsersRemoteLoadError(null)
      return
    }
    if (tab !== 'usuarios') return

    usersListEffectGen.current += 1
    const gen = usersListEffectGen.current
    let cancelled = false
    setRemoteUsers(null)
    setUsersRemoteLoadError(null)
    ;(async () => {
      try {
        const list = await withTimeout(
          fetchUsersListForSettings(supabase),
          SETTINGS_PROFILES_TIMEOUT_MS,
          SETTINGS_PROFILES_TIMEOUT_MSG,
        )
        if (cancelled || gen !== usersListEffectGen.current) return
        setRemoteUsers(list)
        setUsersRemoteLoadError(null)
        try {
          await refreshSupabaseDexieCache()
        } catch (e) {
          if (!cancelled && gen === usersListEffectGen.current) {
            toastError(e instanceof Error ? e.message : 'Cache local não atualizou após carregar usuários.')
          }
        }
      } catch (e) {
        if (cancelled || gen !== usersListEffectGen.current) return
        const msg = e instanceof Error ? e.message : 'Falha ao carregar usuários do Supabase.'
        setUsersRemoteLoadError(msg)
        setRemoteUsers([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [canManageUsers, current?.id, tab, toastError])

  const loadPortalAdminData = useCallback(async () => {
    if (!canManageUsers || !supabase) return
    const [{ data: clients, error: clientsErr }, { data: projects, error: projectsErr }, submissions, files] = await Promise.all([
      supabase.from('clients').select('id,name,status').order('created_at', { ascending: false }),
      supabase.from('projects').select('id,project_name').order('created_at', { ascending: false }),
      fetchWelcomeSubmissionsOps(),
      fetchPortalClientFilesOps(),
    ])
    if (clientsErr) throw clientsErr
    if (projectsErr) throw projectsErr
    setPortalClients((clients ?? []) as Array<{ id: string; name: string; status: string }>)
    setPortalProjects((projects ?? []) as Array<{ id: string; project_name: string }>)
    setPortalSubmissions(submissions)
    setPortalClientFiles(files)
  }, [canManageUsers])

  useEffect(() => {
    if (!canManageUsers) return
    const pull = () => {
      setDiag(listRuntimeDiagnostics())
      setRuntimeSync(getRuntimeSyncSnapshot())
      setPendingSyncCount(getPendingProjectGraphSyncIds().length)
    }
    pull()
    const t = window.setInterval(pull, 2500)
    return () => window.clearInterval(t)
  }, [canManageUsers])

  useEffect(() => {
    if (!canManageUsers || !supabase) return
    void loadPortalAdminData().catch(() => undefined)
  }, [canManageUsers, current?.id, loadPortalAdminData])

  function openPermissions(userId: string) {
    const target = users.find((u) => u.id === userId)
    if (!target) return
    setErr(null)
    setPermissionsUserId(userId)
    setPermissionDraft(scopesForUser(target))
    setPermissionsOpen(true)
  }

  function resetPermissionsModal() {
    setPermissionsSaving(false)
    setPermissionsOpen(false)
    setPermissionsUserId(null)
    setPermissionDraft([])
    setErr(null)
  }

  function closePermissions() {
    if (permissionsSaving) return
    resetPermissionsModal()
  }

  async function savePermissions() {
    if (!permissionsUserId || !canManageUsers || permissionsSaving) return
    if (!supabase) {
      const msg = 'Supabase não configurado.'
      setErr(msg)
      throw new Error(msg)
    }
    const targetId = permissionsUserId
    const draftSnapshot: PermissionScope[] = [...permissionDraft]
    const allScopesGranted = ALL_PERMISSION_SCOPES.every((scope) => draftSnapshot.includes(scope))
    const shouldPromoteToAdmin =
      !!editingPermissionUser && editingPermissionUser.userType !== 'client' && allScopesGranted
    setPermissionsSaving(true)
    setErr(null)
    try {
      const { error } = await supabase.rpc('admin_set_profile_permissions', {
        p_target_user_id: targetId,
        p_permissions: draftSnapshot,
      })
      if (error) {
        const msg = formatSupabaseError(error, 'Não foi possível salvar permissões.')
        setErr(msg)
        throw new Error(msg)
      }
      if (shouldPromoteToAdmin) {
        const { error: roleErr } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', targetId)
        if (roleErr) {
          const msg = formatSupabaseError(
            roleErr,
            'Permissões salvas, mas não foi possível promover o perfil para admin.',
          )
          setErr(msg)
          throw new Error(msg)
        }
      }
      await loadUsersFromSupabase()
      setRemoteUsers((prev) => {
        if (!prev?.length) return prev
        return prev.map((u) =>
          u.id === targetId
            ? {
                ...u,
                permissions: draftSnapshot.length ? draftSnapshot : null,
                role: shouldPromoteToAdmin ? 'admin' : u.role,
              }
            : u,
        )
      })
      const { error: sessErr } = await supabase.auth.refreshSession()
      if (sessErr) {
        console.warn('[Settings] refreshSession após salvar permissões:', sessErr)
      }
      try {
        await refreshSupabaseDexieCache()
      } catch (e) {
        toastError(e instanceof Error ? e.message : 'Cache local não atualizou após salvar permissões.')
      }
      toast('Permissões salvas.')
      resetPermissionsModal()
    } finally {
      setPermissionsSaving(false)
    }
  }

  const permissionsDraftDirty = useMemo(() => {
    if (!permissionsOpen || !editingPermissionUser) return false
    const draftKey = [...permissionDraft].sort().join('|')
    const origKey = [...scopesForUser(editingPermissionUser)].sort().join('|')
    return draftKey !== origKey
  }, [permissionsOpen, editingPermissionUser, permissionDraft])

  useRegisterUnsavedChanges({
    enabled: permissionsOpen && canManageUsers,
    isDirty: () => permissionsDraftDirty,
    onSave: savePermissions,
    message: 'Há alterações não gravadas nas permissões deste usuário.',
  })

  function toggleScope(scope: PermissionScope, checked: boolean) {
    setPermissionDraft((prev) => {
      const set = new Set(prev)
      if (checked) set.add(scope)
      else set.delete(scope)
      return [...set]
    })
  }

  async function updateUserStatus(userId: string, nextStatus: 'active' | 'inactive' | 'pending') {
    if (!canManageUsers || !supabase) return
    if (current?.id === userId && nextStatus === 'inactive') {
      setErr('Você não pode inativar o próprio acesso.')
      return
    }
    setErr(null)
    setUsersBusy(userId)
    try {
      const { error } = await supabase.rpc('admin_set_profile_status', {
        p_target_user_id: userId,
        p_status: nextStatus,
      })
      if (error) throw error
      await loadUsersFromSupabase()
      const { error: sessErr } = await supabase.auth.refreshSession()
      if (sessErr) {
        console.warn('[Settings] refreshSession após status:', sessErr)
        toastError(
          sessErr.message
            ? `Sessão não renovou após alterar status: ${sessErr.message}.`
            : 'Sessão não renovou após alterar status do usuário.',
        )
      }
      try {
        await refreshSupabaseDexieCache()
      } catch (e) {
        toastError(e instanceof Error ? e.message : 'Cache local não atualizou após mudar status.')
      }
      if (nextStatus === 'inactive') toast('Usuário inativado.')
      else if (nextStatus === 'pending') toast('Usuário movido para pendente.')
      else toast('Usuário aprovado/reativado.')
    } catch (e) {
      toastError(formatSupabaseError(e, 'Falha ao atualizar status do usuário.'))
    } finally {
      setUsersBusy(null)
    }
  }

  async function deleteUserLogin(userId: string, userName: string) {
    if (!canManageUsers || !supabase) return
    if (current?.id === userId) {
      setErr('Você não pode excluir o próprio login.')
      return
    }
    const ok = await requestConfirm({
      title: 'Excluir login',
      message: `Tem certeza que deseja excluir "${userName}"?`,
      confirmLabel: 'Excluir login',
      cancelLabel: 'Cancelar',
    })
    if (!ok) return
    setErr(null)
    setUsersBusy(userId)
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId)
      if (error) {
        // Se houver vínculo histórico (FK/RLS), converte exclusão em inativação para manter governança.
        const fallback = await supabase.rpc('admin_set_profile_status', {
          p_target_user_id: userId,
          p_status: 'inactive',
        })
        if (fallback.error) throw error
        await loadUsersFromSupabase()
        try {
          await refreshSupabaseDexieCache()
        } catch (e) {
          toastError(e instanceof Error ? e.message : 'Cache local não atualizou.')
        }
        toast('Exclusão bloqueada pelo banco. Login inativado com sucesso.')
        return
      }
      await loadUsersFromSupabase()
      try {
        await refreshSupabaseDexieCache()
      } catch (e) {
        toastError(e instanceof Error ? e.message : 'Cache local não atualizou após excluir login.')
      }
      toast('Login excluído com sucesso.')
    } catch (e) {
      toastError(formatSupabaseError(e, 'Falha ao excluir login.'))
    } finally {
      setUsersBusy(null)
    }
  }

  function onToggleDataMode() {
    if (!canManageUsers || !dataModeState.canOverride) return
    const next: DataMode = dataModeState.mode === 'cloud' ? 'local' : 'cloud'
    setDataModeOverrideRuntime(next === 'cloud' ? null : next)
    setDataModeState({
      mode: next,
      override: next === 'cloud' ? null : next,
      canOverride: dataModeState.canOverride,
    })
    toast(
      next === 'cloud'
        ? 'Modo PRODUÇÃO ativado. Recarregando para sincronizar com Supabase...'
        : 'Modo TESTE local ativado. Recarregando...',
    )
    window.setTimeout(() => window.location.reload(), 250)
  }

  async function onCreateClient() {
    if (!newClientName.trim() || !supabase) return
    try {
      setPortalBusy('create-client')
      const { error } = await supabase.rpc('admin_create_client', { p_name: newClientName.trim() })
      if (error) throw error
      setNewClientName('')
      await loadPortalAdminData()
      toast('Cliente criado com sucesso.')
    } catch (e) {
      toastError(formatSupabaseError(e, 'Falha ao criar cliente.'))
    } finally {
      setPortalBusy(null)
    }
  }

  async function onLinkProfileToClient() {
    if (!supabase || !linkProfileId || !linkClientId) return
    try {
      setPortalBusy('link-profile')
      const [typeResp, linkResp] = await Promise.all([
        supabase.rpc('admin_set_profile_user_type', { p_profile_id: linkProfileId, p_user_type: 'client' }),
        supabase.rpc('admin_link_profile_to_client', {
          p_profile_id: linkProfileId,
          p_client_id: linkClientId,
          p_role_in_client: 'member',
        }),
      ])
      if (typeResp.error) throw typeResp.error
      if (linkResp.error) throw linkResp.error
      await loadUsersFromSupabase()
      await loadPortalAdminData()
      toast('Perfil vinculado ao cliente.')
    } catch (e) {
      toastError(formatSupabaseError(e, 'Falha ao vincular perfil ao cliente.'))
    } finally {
      setPortalBusy(null)
    }
  }

  async function onLinkProjectToClient() {
    if (!supabase || !linkClientId || !linkProjectId) return
    try {
      setPortalBusy('link-project')
      const { error } = await supabase.rpc('admin_link_project_to_client', {
        p_project_id: linkProjectId,
        p_client_id: linkClientId,
      })
      if (error) throw error
      await loadPortalAdminData()
      toast('Projeto vinculado ao cliente.')
    } catch (e) {
      toastError(formatSupabaseError(e, 'Falha ao vincular projeto ao cliente.'))
    } finally {
      setPortalBusy(null)
    }
  }

  async function onDownloadPortalFile(fileId: string) {
    try {
      const url = await getPortalProjectFileDownloadUrl(fileId)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      toastError(formatSupabaseError(e, 'Falha ao baixar arquivo.'))
    }
  }

  async function onUploadTemplateFile(projectId: string, file: File) {
    try {
      setPortalBusy(`template-${projectId}`)
      await uploadPortalProjectFile({ projectId, kind: 'template', file })
      await loadPortalAdminData()
      toast('Modelo padrão publicado para o cliente.')
      setPortalTemplateFileHint(null)
    } catch (e) {
      toastError(formatSupabaseError(e, 'Falha ao publicar modelo.'))
    } finally {
      setPortalBusy(null)
    }
  }

  return (
    <div className="page page--wide">
      <header className="page__header page__header--split">
        <div>
          <h1 className="page__title">Configurações</h1>
          <p className="page__subtitle">Usuários, aparência e boas práticas para centralizar a implantação</p>
        </div>
        {canManageUsers ? (
          <button type="button" className="btn btn--primary" onClick={() => setOpen(true)}>
            Como criar usuário
          </button>
        ) : null}
      </header>

      <div className="settings-tabs" role="tablist" aria-label="Seções de configurações">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'geral'}
          className={'settings-tabs__btn' + (tab === 'geral' ? ' is-active' : '')}
          onClick={() => setTab('geral')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Users {...icTab} aria-hidden />
            Geral
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'usuarios'}
          className={'settings-tabs__btn' + (tab === 'usuarios' ? ' is-active' : '')}
          onClick={() => setTab('usuarios')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Shield {...icTab} aria-hidden />
            Usuários
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'aparencia'}
          className={'settings-tabs__btn' + (tab === 'aparencia' ? ' is-active' : '')}
          onClick={() => setTab('aparencia')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Palette {...icTab} aria-hidden />
            Aparência
          </span>
        </button>
        {canManageUsers ? (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'console'}
            className={'settings-tabs__btn' + (tab === 'console' ? ' is-active' : '')}
            onClick={() => setTab('console')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Wrench {...icTab} aria-hidden />
              Console Admin
            </span>
          </button>
        ) : null}
      </div>

      {tab === 'aparencia' ? (
        <section className="panel panel--stack">
          <div className="settings-appearance__head">
            <div>
              <h2 className="panel__title" style={{ marginBottom: '0.35rem' }}>
                Tema e paleta
              </h2>
              <p className="muted panel__lead" style={{ margin: 0, maxWidth: '40rem' }}>
                Escolha uma paleta coordenada (fundo, superfícies e destaque). O modo claro ou escuro combina com
                cada paleta. Você pode seguir o sistema ou fixar manualmente; o botão na barra lateral alterna o modo
                (e passa a valer como escolha manual).
              </p>
            </div>
          </div>

          <div className="settings-appearance__source">
            <span className="settings-appearance__source-label muted">Origem do tema</span>
            <div className="settings-appearance__modes" role="radiogroup" aria-label="Seguir sistema ou tema manual">
              <button
                type="button"
                role="radio"
                aria-checked={themeSource === 'system'}
                className={'settings-appearance__mode' + (themeSource === 'system' ? ' is-active' : '')}
                onClick={() => setThemeSource('system')}
              >
                <Monitor {...icTab} aria-hidden />
                Sistema
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={themeSource === 'manual'}
                className={'settings-appearance__mode' + (themeSource === 'manual' ? ' is-active' : '')}
                onClick={() => setThemeSource('manual')}
              >
                <SlidersHorizontal {...icTab} aria-hidden />
                Manual
              </button>
            </div>
          </div>

          {themeSource === 'manual' ? (
            <div className="settings-appearance__manual-modes">
              <span className="settings-appearance__source-label muted">Modo fixo</span>
              <div className="settings-appearance__modes" role="group" aria-label="Modo claro ou escuro">
                <button
                  type="button"
                  className={'settings-appearance__mode' + (theme === 'light' ? ' is-active' : '')}
                  onClick={() => setTheme('light')}
                >
                  <Sun size={17} strokeWidth={2} aria-hidden />
                  Claro
                </button>
                <button
                  type="button"
                  className={'settings-appearance__mode' + (theme === 'dark' ? ' is-active' : '')}
                  onClick={() => setTheme('dark')}
                >
                  <Moon size={17} strokeWidth={2} aria-hidden />
                  Escuro
                </button>
              </div>
            </div>
          ) : (
            <p className="muted settings-appearance__system-hint">
              Modo atual vem do sistema operacional ({theme === 'dark' ? 'escuro' : 'claro'}). O botão de tema na
              barra lateral fixa manualmente o outro modo.
            </p>
          )}

          <ul className="palette-grid" aria-label="Paletas de cor">
            {PALETTE_PRESETS.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={'palette-card' + (palette === p.id ? ' is-selected' : '')}
                  onClick={() => setPalette(p.id)}
                  aria-pressed={palette === p.id}
                >
                  <span className="palette-card__check" aria-hidden>
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <div className="palette-card__swatches" aria-hidden>
                    {p.swatch.map((hex, i) => (
                      <span key={i} className="palette-card__swatch" style={{ background: hex }} />
                    ))}
                  </div>
                  <h3 className="palette-card__name">{p.name}</h3>
                  <p className="palette-card__tagline">{p.tagline}</p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === 'geral' ? (
        <>
          <section className="panel panel--stack">
            <h2 className="panel__title">VynTask como centro da implantação</h2>
            <p className="muted panel__lead">
              Quando informação está espalhada (planilhas, WhatsApp, e-mail, tickets), perde-se prazo e padrão. O
              objetivo deste app é ser o <strong>registro único</strong> do ciclo por cliente: etapa no quadro,
              tarefas, horas e agenda no mesmo lugar.
            </p>
            <ul className="hint-list">
              <li>
                <strong>Visão Geral</strong> — pipeline oficial; mova o projeto só quando a etapa de negócio mudar.
              </li>
              <li>
                <strong>Projetos + Tarefas</strong> — escopo e execução; evite listas paralelas de
                &quot;pendências&quot; fora daqui.
              </li>
              <li>
                <strong>Agenda</strong> — visitas e marcos; se está no calendário externo, replique o marco aqui (ou
                integre depois).
              </li>
              <li>
                <strong>Relatórios</strong> — leitura de carga e progresso para gestão, sem montar planilha manual toda
                semana.
              </li>
            </ul>
            <p className="muted panel__foot">
              Próximas evoluções que costumam fechar o ciclo: anexos por projeto, modelos de e-mail/checklist por fase,
              integração com calendário e exportação para BI.
            </p>
          </section>

          <section className="panel panel--stack">
            <h2 className="panel__title">Persistência de dados (nuvem x teste)</h2>
            <p className="muted panel__lead">
              Em produção, o padrão agora é <strong>nuvem (Supabase)</strong>. Use modo local somente para testes.
            </p>
            <div className="settings-data-mode">
              <div className="settings-data-mode__status">
                <span className={'pill' + (dataModeState.mode === 'cloud' ? ' pill--ok' : '')}>
                  {dataModeState.mode === 'cloud' ? 'Produção · Supabase' : 'Teste · Local (Dexie)'}
                </span>
                <span className="muted">
                  {isSupabaseConfigured()
                    ? 'Conexão Supabase disponível neste ambiente.'
                    : 'Supabase não configurado para este ambiente.'}
                </span>
              </div>
              {canManageUsers && dataModeState.canOverride ? (
                <button type="button" className="btn btn--ghost" onClick={onToggleDataMode}>
                  {dataModeState.mode === 'cloud' ? <DatabaseZap size={16} strokeWidth={2} /> : <Cloud size={16} strokeWidth={2} />}
                  {dataModeState.mode === 'cloud' ? 'Ativar modo teste local' : 'Voltar para produção (nuvem)'}
                </button>
              ) : (
                <p className="muted settings-data-mode__hint">
                  Alteração de modo disponível apenas para admin em ambiente local (`localhost`).
                </p>
              )}
            </div>
          </section>

          <section className="panel panel--stack">
            <h2 className="panel__title">Atalhos de teclado</h2>
            <p className="muted panel__lead">
              Ganhe velocidade no dia a dia; o estado do menu lateral é lembrado neste aparelho.
            </p>
            <ul className="shortcut-list" aria-label="Atalhos">
              <li>
                <span>Recolher ou expandir o menu lateral</span>
                <span className="shortcut-list__keys">
                  <kbd className="kbd">{modKey}</kbd>
                  <span className="shortcut-list__plus">+</span>
                  <kbd className="kbd">B</kbd>
                </span>
              </li>
            </ul>
          </section>
        </>
      ) : null}

      {tab === 'usuarios' ? (
        <section className="panel panel--stack">
          <div className="page__header page__header--split" style={{ padding: 0, border: 0 }}>
            <div>
              <h2 className="panel__title">Controle de usuários</h2>
              {canManageUsers && remoteUsers === null && !usersRemoteLoadError ? (
                <p className="muted panel__lead">Carregando lista de perfis do Supabase…</p>
              ) : usersRemoteLoadError ? (
                <p className="auth__error panel__lead" style={{ marginTop: 0 }}>
                  {usersRemoteLoadError}
                </p>
              ) : canManageUsers ? (
                <p className="muted panel__lead">
                  {users.length} usuário(s) listados conforme retorno do Supabase (RLS: só admins veem todos os perfis).
                </p>
              ) : (
                <p className="muted panel__lead">{users.length} usuário(s) no cache local deste aparelho.</p>
              )}
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={'pill' + (u.role === 'admin' ? ' pill--accent' : '')}>{u.role}</span>
                    </td>
                    <td>
                      <span className={'pill' + (u.status === 'active' ? ' pill--ok' : u.status === 'pending' ? ' pill--warn' : '')}>
                        {u.status === 'active' ? 'ativo' : u.status === 'pending' ? 'pendente' : 'inativo'}
                      </span>
                    </td>
                    <td>{formatDatePt(u.createdAt)}</td>
                    <td>
                      {canManageUsers ? (
                        <div className="settings-user-actions">
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => openPermissions(u.id)}>
                            <Shield size={14} strokeWidth={2} />
                            Permissões
                          </button>
                          {u.status === 'active' ? (
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => void updateUserStatus(u.id, 'inactive')}
                              disabled={usersBusy === u.id}
                            >
                              <UserX size={14} strokeWidth={2} />
                              Inativar
                            </button>
                          ) : u.status === 'pending' ? (
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => void updateUserStatus(u.id, 'active')}
                              disabled={usersBusy === u.id}
                            >
                              <UserCheck size={14} strokeWidth={2} />
                              Aprovar
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => void updateUserStatus(u.id, 'active')}
                              disabled={usersBusy === u.id}
                            >
                              <UserCheck size={14} strokeWidth={2} />
                              Reativar
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => void deleteUserLogin(u.id, u.name)}
                            disabled={usersBusy === u.id}
                          >
                            <Trash2 size={14} strokeWidth={2} />
                            Excluir login
                          </button>
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!canManageUsers ? (
            <p className="muted panel__foot">Somente admin pode criar usuários e alterar permissões.</p>
          ) : null}
          {err ? <p className="auth__error">{err}</p> : null}

          {canManageUsers ? (
            <section className="panel panel--stack settings-portal-admin" aria-labelledby="settings-portal-admin-title">
              <div className="settings-portal-admin__head">
                <h3 id="settings-portal-admin-title" className="panel__title">
                  Portal Cliente · Vínculos administrativos
                </h3>
                <p className="muted settings-portal-admin__intro">
                  Crie o cadastro do cliente, associe o perfil de acesso e vincule projetos. Publique as planilhas padrão para o portal.
                </p>
              </div>

              <div className="settings-portal-admin__block">
                <h4 className="settings-portal-admin__block-title">Novo cliente</h4>
                <div className="settings-portal-admin__grid settings-portal-admin__grid--single">
                  <label className="field">
                    <span>Nome</span>
                    <input
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Nome do cliente"
                      autoComplete="off"
                    />
                  </label>
                </div>
                <div className="settings-portal-admin__actions">
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => void onCreateClient()}
                    disabled={portalBusy === 'create-client' || !newClientName.trim()}
                  >
                    Criar cliente
                  </button>
                </div>
              </div>

              <div className="settings-portal-admin__block">
                <h4 className="settings-portal-admin__block-title">Vincular perfil ao cliente</h4>
                <div className="settings-portal-admin__grid">
                  <label className="field">
                    <span>Perfil</span>
                    <select value={linkProfileId} onChange={(e) => setLinkProfileId(e.target.value)}>
                      <option value="">Selecione</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Cliente</span>
                    <select value={linkClientId} onChange={(e) => setLinkClientId(e.target.value)}>
                      <option value="">Selecione</option>
                      {portalClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="settings-portal-admin__actions">
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => void onLinkProfileToClient()}
                    disabled={portalBusy === 'link-profile' || !linkProfileId || !linkClientId}
                  >
                    Vincular perfil ao cliente
                  </button>
                </div>
              </div>

              <div className="settings-portal-admin__block">
                <h4 className="settings-portal-admin__block-title">Vincular projeto ao cliente</h4>
                <div className="settings-portal-admin__grid settings-portal-admin__grid--single">
                  <label className="field">
                    <span>Projeto</span>
                    <select value={linkProjectId} onChange={(e) => setLinkProjectId(e.target.value)}>
                      <option value="">Selecione</option>
                      {portalProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.project_name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="settings-portal-admin__actions">
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => void onLinkProjectToClient()}
                    disabled={portalBusy === 'link-project' || !linkClientId || !linkProjectId}
                  >
                    Vincular projeto ao cliente
                  </button>
                </div>
              </div>

              <div className="settings-portal-admin__block">
                <h4 className="settings-portal-admin__block-title">Planilhas padrão no portal</h4>
                <p className="muted settings-portal-admin__hint">
                  Selecione um projeto acima, depois envie o arquivo. Formatos: .xlsx, .xls, .csv, .pdf, .zip.
                </p>
                <input
                  ref={portalTemplateFileRef}
                  type="file"
                  className="sr-only"
                  accept=".xlsx,.xls,.csv,.pdf,.zip"
                  tabIndex={-1}
                  aria-hidden
                  disabled={!linkProjectId || portalBusy?.startsWith('template-')}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file || !linkProjectId) return
                    setPortalTemplateFileHint(file.name)
                    void onUploadTemplateFile(linkProjectId, file)
                    e.currentTarget.value = ''
                  }}
                />
                <div className="file-upload-styled">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={!linkProjectId || portalBusy?.startsWith('template-')}
                    onClick={() => portalTemplateFileRef.current?.click()}
                  >
                    <Upload size={16} strokeWidth={2} aria-hidden />
                    Escolher arquivo
                  </button>
                  <span className="muted file-upload-styled__name" title={portalTemplateFileHint ?? undefined}>
                    {portalTemplateFileHint ?? 'Nenhum arquivo escolhido'}
                  </span>
                </div>
              </div>
            </section>
          ) : null}
        </section>
      ) : null}

      {tab === 'console' && canManageUsers ? (
        <RescheduleChainMigrationPanel actorUserId={current?.id} />
      ) : null}

      {tab === 'console' && canManageUsers ? (
        <section className="panel panel--stack settings-console">
          <div className="page__header page__header--split" style={{ padding: 0, border: 0 }}>
            <div>
              <h2 className="panel__title">Console Admin de Diagnóstico</h2>
              <p className="muted panel__lead">
                Estado de auth/sync em tempo real, fila pendente e falhas recentes por navegador.
              </p>
            </div>
          </div>

          <section className="settings-console-summary" aria-labelledby="settings-console-summary-title">
            <h3 id="settings-console-summary-title" className="settings-console-summary__title">
              Diagnóstico rápido
            </h3>
            <div className="settings-console-summary__grid">
              <article className="settings-console-summary__card">
                <strong className="settings-console-summary__label">Status simples</strong>
                <p className="settings-console-summary__value">
                  <span
                    className={
                      'pill settings-console-summary__status' +
                      (diagnosticsSimpleStatus === 'ok'
                        ? ' pill--ok'
                        : diagnosticsSimpleStatus === 'attention'
                          ? ' pill--warn'
                          : ' settings-console-summary__status--critical')
                    }
                  >
                    {diagnosticsStatusLabel}
                  </span>
                </p>
                <p className="muted settings-console-summary__hint">{diagnosticsStatusHint}</p>
              </article>

              <article className="settings-console-summary__card">
                <strong className="settings-console-summary__label">Ação recomendada</strong>
                <p className="settings-console-summary__hint">{diagnosticsRecommendedAction}</p>
              </article>
            </div>

            <details className="settings-console-summary__details">
              <summary>Detalhes técnicos (IA/suporte)</summary>
              <ul className="settings-console-summary__tech muted">
                <li>Realtime: {runtimeSync.realtimeStatus}</li>
                <li>Fila pendente: {pendingSyncCount}</li>
                <li>
                  Último pull incremental:{' '}
                  {runtimeSync.incrementalLastRunAt
                    ? formatDatePt(runtimeSync.incrementalLastRunAt, 'dd/MM/yyyy HH:mm:ss')
                    : 'nunca'}
                </li>
                <li>Último diagnóstico: {latestDiag ? `${latestDiag.source} · ${latestDiag.level} · ${latestDiag.message}` : 'sem registros'}</li>
              </ul>
            </details>
          </section>

          <div className="settings-console-kpis">
            <div className="settings-console-kpi">
              <strong className="settings-console-kpi__label">Modo de dados</strong>
              <span className="settings-console-kpi__value">
                <span className={'pill' + (dataModeState.mode === 'cloud' ? ' pill--ok' : '')}>
                  {dataModeState.mode === 'cloud' ? 'Cloud (Supabase)' : 'Local (Dexie)'}
                </span>
              </span>
            </div>
            <div className="settings-console-kpi">
              <strong className="settings-console-kpi__label">Realtime</strong>
              <span className="settings-console-kpi__value">
                <span
                  className={
                    'pill' +
                    (runtimeSync.realtimeStatus === 'subscribed'
                      ? ' pill--ok'
                      : runtimeSync.realtimeStatus === 'error' || runtimeSync.realtimeStatus === 'timed_out'
                        ? ' pill--warn'
                        : '')
                  }
                >
                  {runtimeSync.realtimeStatus}
                </span>
              </span>
            </div>
            <div className="settings-console-kpi">
              <strong className="settings-console-kpi__label">Fila pendente</strong>
              <span className="settings-console-kpi__value">{pendingSyncCount}</span>
            </div>
            <div className="settings-console-kpi">
              <strong className="settings-console-kpi__label">Pull incremental</strong>
              <span>
                {runtimeSync.incrementalLastRunAt
                  ? `${formatDatePt(runtimeSync.incrementalLastRunAt, 'dd/MM/yyyy HH:mm')}`
                  : 'nunca'}
              </span>
            </div>
          </div>

          <div className="settings-console-actions" role="group" aria-label="Ações de diagnóstico">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={diagBusy === 'refresh'}
              onClick={() => {
                void (async () => {
                  setDiagBusy('refresh')
                  try {
                    await refreshSupabaseDexieCache()
                    toast('Cache Supabase atualizado.')
                  } catch (e) {
                    toastError(e instanceof Error ? e.message : 'Falha ao atualizar cache.')
                  } finally {
                    setDiagBusy(null)
                  }
                })()
              }}
            >
              Forçar refresh cache
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={diagBusy === 'pull'}
              onClick={() => {
                void (async () => {
                  setDiagBusy('pull')
                  try {
                    await runIncrementalDomainSync()
                    toast('Pull incremental executado.')
                  } catch (e) {
                    toastError(e instanceof Error ? e.message : 'Falha no pull incremental.')
                  } finally {
                    setDiagBusy(null)
                  }
                })()
              }}
            >
              Forçar pull incremental
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={diagBusy === 'rt'}
              onClick={() => {
                setDiagBusy('rt')
                stopSupabaseRealtimeDomainSync()
                startSupabaseRealtimeDomainSync()
                setTimeout(() => setDiagBusy(null), 300)
                toast('Canal realtime reiniciado.')
              }}
            >
              Reabrir realtime
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={diagBusy === 'queue'}
              onClick={() => {
                void (async () => {
                  setDiagBusy('queue')
                  try {
                    await flushPendingProjectGraphSyncQueue()
                    toast('Fila pendente processada.')
                  } catch (e) {
                    toastError(e instanceof Error ? e.message : 'Falha ao processar fila.')
                  } finally {
                    setDiagBusy(null)
                  }
                })()
              }}
            >
              Processar fila pendente
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                clearRuntimeDiagnostics()
                setDiag([])
                toast('Diagnóstico limpo.')
              }}
            >
              Limpar diagnósticos
            </button>
          </div>

          <div className="settings-console-browser">
            <h3 className="settings-console-browser__title">Saúde do navegador atual</h3>
            {(() => {
              const cap = getBrowserCapabilitySnapshot()
              return (
                <ul className="settings-console-cap-list muted">
                  <li>
                    localStorage: <strong>{cap.hasLocalStorage ? 'ok' : 'indisponível'}</strong>
                  </li>
                  <li>
                    sessionStorage: <strong>{cap.hasSessionStorage ? 'ok' : 'indisponível'}</strong>
                  </li>
                  <li>
                    IndexedDB: <strong>{cap.hasIndexedDb ? 'ok' : 'indisponível'}</strong>
                  </li>
                  <li>
                    BroadcastChannel: <strong>{cap.hasBroadcastChannel ? 'ok' : 'indisponível'}</strong>
                  </li>
                  <li>
                    WebSocket: <strong>{cap.hasWebSocket ? 'ok' : 'indisponível'}</strong>
                  </li>
                </ul>
              )
            })()}
          </div>

          <div className="table-wrap settings-console__table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Fonte</th>
                  <th>Nível</th>
                  <th>Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {diag.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      Sem ocorrências registradas.
                    </td>
                  </tr>
                ) : (
                  diag.slice(0, 50).map((d) => (
                    <tr key={d.id}>
                      <td>{formatDatePt(d.at, 'dd/MM/yyyy HH:mm:ss')}</td>
                      <td>{diagSourceLabel(d.source)}</td>
                      <td>
                        <span className={`diag-severity-chip diag-severity-chip--${d.level}`}>{DIAG_LEVEL_LABEL[d.level]}</span>
                      </td>
                      <td>
                        <p className="settings-console-diag-msg">{d.message}</p>
                        {d.details ? (
                          <details className="settings-console-diag-tech">
                            <summary>Detalhes técnicos</summary>
                            <pre>{d.details}</pre>
                          </details>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="table-wrap settings-console__table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Formulário</th>
                  <th>Projeto</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Quando</th>
                </tr>
              </thead>
              <tbody>
                {portalSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      Sem submissões de boas-vindas registradas.
                    </td>
                  </tr>
                ) : (
                  portalSubmissions.map((row) => (
                    <tr key={row.id}>
                      <td>{String(row.id).slice(0, 8)}</td>
                      <td>{String(row.projects?.project_name ?? row.project_id)}</td>
                      <td>{String(row.clients?.name ?? row.client_id)}</td>
                      <td>{String(row.status ?? '')}</td>
                      <td>{row.submitted_at ? formatDatePt(row.submitted_at, 'dd/MM/yyyy HH:mm') : 'rascunho'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="table-wrap settings-console__table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Arquivo enviado pelo cliente</th>
                  <th>Projeto</th>
                  <th>Cliente</th>
                  <th>Quando</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {portalClientFiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      Sem arquivos recebidos dos clientes.
                    </td>
                  </tr>
                ) : (
                  portalClientFiles.map((row) => (
                    <tr key={row.id}>
                      <td>{String(row.original_name ?? '')}</td>
                      <td>{String(row.projects?.project_name ?? row.project_id)}</td>
                      <td>{String(row.profiles?.name ?? 'Cliente')}</td>
                      <td>{formatDatePt(row.created_at, 'dd/MM/yyyy HH:mm')}</td>
                      <td>
                        <button className="btn btn--ghost btn--sm" onClick={() => void onDownloadPortalFile(String(row.id))}>
                          Baixar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {open && canManageUsers ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div className="modal" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">Criação de usuários (modo nuvem)</h2>
            <div className="stack">
              <p className="muted" style={{ margin: 0 }}>
                Para evitar usuários locais, a criação agora é pelo fluxo oficial do Supabase:
              </p>
              <ol className="muted" style={{ margin: 0, paddingLeft: '1.1rem' }}>
                <li>Usuário se cadastra em <strong>/cadastro</strong>, ou</li>
                <li>Admin cria em Authentication → Users (painel Supabase).</li>
              </ol>
              <p className="muted" style={{ margin: 0 }}>
                Todo novo cadastro entra como <strong>pendente</strong>. Depois aprove e ajuste permissões nesta tela.
              </p>
              <div className="modal__actions">
                <button type="button" className="btn btn--primary" onClick={() => setOpen(false)}>
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {permissionsOpen && editingPermissionUser && canManageUsers ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={permissionsSaving ? undefined : closePermissions}
        >
          <div className="modal modal--md settings-permissions-modal" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title settings-permissions-modal__title">Permissões · {editingPermissionUser.name}</h2>
            <p className="muted settings-permissions-modal__lead">
              Prepare o controle por tela/ação para migração futura para Supabase (mesmos scopes).
            </p>
            <div className="settings-permissions-modal__head muted" aria-hidden>
              <span>Módulo</span>
              <span>Visualizar</span>
              <span>Editar</span>
            </div>
            <div className="permissions-matrix">
              {PERMISSION_MODULES.map((m) => (
                <div key={m.key} className="permissions-matrix__row">
                  <strong className="permissions-matrix__module">{m.label}</strong>
                  <label className="permissions-matrix__check">
                    <input
                      type="checkbox"
                      checked={permissionDraft.includes(m.view)}
                      disabled={permissionsSaving}
                      onChange={(e) => {
                        toggleScope(m.view, e.target.checked)
                        if (!e.target.checked && m.edit) toggleScope(m.edit, false)
                      }}
                    />
                    Ver
                  </label>
                  {m.edit ? (
                    <label className="permissions-matrix__check">
                      <input
                        type="checkbox"
                        checked={permissionDraft.includes(m.edit)}
                        disabled={permissionsSaving}
                        onChange={(e) => {
                          toggleScope(m.edit!, e.target.checked)
                          if (e.target.checked) toggleScope(m.view, true)
                        }}
                      />
                      Editar
                    </label>
                  ) : (
                    <span className="muted permissions-matrix__na">Somente leitura</span>
                  )}
                </div>
              ))}
            </div>
            <div className="modal__actions settings-permissions-modal__actions">
              <button type="button" className="btn btn--ghost" onClick={closePermissions} disabled={permissionsSaving}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setPermissionDraft(defaultScopesForRole('user'))}
                disabled={permissionsSaving}
              >
                Preset Usuário
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setPermissionDraft(defaultScopesForRole('admin'))}
                disabled={permissionsSaving}
              >
                Preset Admin
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() =>
                  void savePermissions().catch((e) =>
                    toastError(e instanceof Error ? e.message : 'Não foi possível salvar permissões.'),
                  )
                }
                disabled={!canEditSettings || permissionsSaving}
              >
                {permissionsSaving ? 'Salvando…' : 'Salvar permissões'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
