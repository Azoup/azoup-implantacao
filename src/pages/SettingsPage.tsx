import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Cloud, DatabaseZap, Moon, Palette, Shield, Sun, Trash2, UserCheck, UserX, Users, Wrench } from 'lucide-react'
import { db } from '../db/database'
import { useAuth } from '../auth/AuthContext'
import { defaultScopesForRole, hasScope, PERMISSION_MODULES, scopesForUser } from '../auth/permissions'
import type { DbUser, PermissionScope } from '../db/types'
import { formatDatePt } from '../lib/dates'
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

type SettingsTab = 'geral' | 'usuarios' | 'aparencia' | 'console'

const icTab = { size: 18, strokeWidth: 2, absoluteStrokeWidth: true } as const

export function SettingsPage() {
  const { user: current } = useAuth()
  const { theme, setTheme, palette, setPalette } = useTheme()
  const cachedUsers = useLiveQuery(() => db.users.toArray(), []) ?? []
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
  const [usersBusy, setUsersBusy] = useState<string | null>(null)
  const [remoteUsers, setRemoteUsers] = useState<DbUser[] | null>(null)
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
  const canEditSettings = hasScope(current, 'settings.edit')
  const canManageUsers = current?.role === 'admin'
  const users = remoteUsers ?? cachedUsers
  const editingPermissionUser = permissionsUserId ? users.find((u) => u.id === permissionsUserId) ?? null : null
  const { requestConfirm, toast, toastError } = useUiFeedback()

  async function loadUsersFromSupabase() {
    if (!supabase) return
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,name,role,permissions,status,created_at,last_login_at')
      .order('created_at', { ascending: false })
    if (error) throw error
    const mapped = ((data ?? []) as ProfileRow[]).map(mapProfileToUser)
    setRemoteUsers(mapped)
  }

  useEffect(() => {
    if (!canManageUsers || !supabase) return
    let cancelled = false
    ;(async () => {
      try {
        await loadUsersFromSupabase()
        void refreshSupabaseDexieCache().catch(() => undefined)
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Falha ao carregar usuários do Supabase.')
      }
    })()
    return () => {
      cancelled = true
    }
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

  function openPermissions(userId: string) {
    const target = users.find((u) => u.id === userId)
    if (!target) return
    setPermissionsUserId(userId)
    setPermissionDraft(scopesForUser(target))
    setPermissionsOpen(true)
  }

  function closePermissions() {
    setPermissionsOpen(false)
    setPermissionsUserId(null)
    setPermissionDraft([])
  }

  async function savePermissions() {
    if (!permissionsUserId || !canManageUsers) return
    if (!supabase) {
      const msg = 'Supabase não configurado.'
      setErr(msg)
      throw new Error(msg)
    }
    const { error } = await supabase
      .from('profiles')
      .update({ permissions: permissionDraft })
      .eq('id', permissionsUserId)
    if (error) {
      const msg = error.message || 'Não foi possível salvar permissões.'
      setErr(msg)
      throw new Error(msg)
    }
    await loadUsersFromSupabase()
    void refreshSupabaseDexieCache().catch(() => undefined)
    closePermissions()
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
      const { error } = await supabase.from('profiles').update({ status: nextStatus }).eq('id', userId)
      if (error) throw error
      await loadUsersFromSupabase()
      void refreshSupabaseDexieCache().catch(() => undefined)
      if (nextStatus === 'inactive') toast('Usuário inativado.')
      else if (nextStatus === 'pending') toast('Usuário movido para pendente.')
      else toast('Usuário aprovado/reativado.')
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Falha ao atualizar status do usuário.')
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
        const fallback = await supabase.from('profiles').update({ status: 'inactive' }).eq('id', userId)
        if (fallback.error) throw error
        await loadUsersFromSupabase()
        void refreshSupabaseDexieCache().catch(() => undefined)
        toast('Exclusão bloqueada pelo banco. Login inativado com sucesso.')
        return
      }
      await loadUsersFromSupabase()
      void refreshSupabaseDexieCache().catch(() => undefined)
      toast('Login excluído com sucesso.')
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Falha ao excluir login.')
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
                Escolha uma paleta coordenada (fundo, superfícies e destaque). O modo claro ou escuro combina
                automaticamente com cada paleta. Você também pode alternar o modo pelo menu lateral.
              </p>
            </div>
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
              <p className="muted panel__lead">{users.length} usuário(s) carregado(s) automaticamente do Supabase.</p>
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
        </section>
      ) : null}

      {tab === 'console' && canManageUsers ? (
        <section className="panel panel--stack">
          <div className="page__header page__header--split" style={{ padding: 0, border: 0 }}>
            <div>
              <h2 className="panel__title">Console Admin de Diagnóstico</h2>
              <p className="muted panel__lead">
                Estado de auth/sync em tempo real, fila pendente e falhas recentes por navegador.
              </p>
            </div>
          </div>

          <div className="settings-console-kpis">
            <div className="settings-console-kpi">
              <strong>Modo de dados</strong>
              <span>{dataModeState.mode === 'cloud' ? 'Cloud (Supabase)' : 'Local (Dexie)'}</span>
            </div>
            <div className="settings-console-kpi">
              <strong>Realtime</strong>
              <span>{runtimeSync.realtimeStatus}</span>
            </div>
            <div className="settings-console-kpi">
              <strong>Fila pendente</strong>
              <span>{pendingSyncCount}</span>
            </div>
            <div className="settings-console-kpi">
              <strong>Pull incremental</strong>
              <span>
                {runtimeSync.incrementalLastRunAt
                  ? `${formatDatePt(runtimeSync.incrementalLastRunAt, 'dd/MM/yyyy HH:mm')}`
                  : 'nunca'}
              </span>
            </div>
          </div>

          <div className="settings-console-actions">
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
            <h3 style={{ margin: 0 }}>Saúde do navegador atual</h3>
            {(() => {
              const cap = getBrowserCapabilitySnapshot()
              return (
                <ul className="muted" style={{ margin: 0 }}>
                  <li>localStorage: {cap.hasLocalStorage ? 'ok' : 'indisponível'}</li>
                  <li>sessionStorage: {cap.hasSessionStorage ? 'ok' : 'indisponível'}</li>
                  <li>IndexedDB: {cap.hasIndexedDb ? 'ok' : 'indisponível'}</li>
                  <li>BroadcastChannel: {cap.hasBroadcastChannel ? 'ok' : 'indisponível'}</li>
                  <li>WebSocket: {cap.hasWebSocket ? 'ok' : 'indisponível'}</li>
                </ul>
              )
            })()}
          </div>

          <div className="table-wrap">
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
                      <td>{d.source}</td>
                      <td>{d.level}</td>
                      <td title={d.details ?? ''}>{d.message}</td>
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
        <div className="modal-backdrop" role="presentation" onClick={closePermissions}>
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
              <button type="button" className="btn btn--ghost" onClick={closePermissions}>
                Cancelar
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setPermissionDraft(defaultScopesForRole('user'))}>
                Preset Usuário
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setPermissionDraft(defaultScopesForRole('admin'))}>
                Preset Admin
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void savePermissions().catch(() => undefined)}
                disabled={!canEditSettings}
              >
                Salvar permissões
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
