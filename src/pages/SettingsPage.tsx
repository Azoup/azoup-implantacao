import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Moon, Palette, Shield, Sun, Users } from 'lucide-react'
import { db } from '../db/database'
import { useAuth } from '../auth/AuthContext'
import { defaultScopesForRole, hasScope, PERMISSION_MODULES, scopesForUser } from '../auth/permissions'
import type { PermissionScope } from '../db/types'
import { formatDatePt } from '../lib/dates'
import { PALETTE_PRESETS } from '../theme/paletteCatalog'
import { useTheme } from '../theme/ThemeContext'
import { supabase } from '../lib/supabaseClient'
import { refreshSupabaseDexieCache } from '../sync/supabaseDexieBridge'

type SettingsTab = 'geral' | 'aparencia'

const icTab = { size: 18, strokeWidth: 2, absoluteStrokeWidth: true } as const

export function SettingsPage() {
  const { user: current } = useAuth()
  const { theme, setTheme, palette, setPalette } = useTheme()
  const users = useLiveQuery(() => db.users.toArray(), []) ?? []
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
  const canEditSettings = hasScope(current, 'settings.edit')
  const canManageUsers = current?.role === 'admin'
  const editingPermissionUser = permissionsUserId ? users.find((u) => u.id === permissionsUserId) ?? null : null

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
      setErr('Supabase não configurado.')
      return
    }
    const { error } = await supabase
      .from('profiles')
      .update({ permissions: permissionDraft })
      .eq('id', permissionsUserId)
    if (error) {
      setErr(error.message || 'Não foi possível salvar permissões.')
      return
    }
    await refreshSupabaseDexieCache()
    closePermissions()
  }

  function toggleScope(scope: PermissionScope, checked: boolean) {
    setPermissionDraft((prev) => {
      const set = new Set(prev)
      if (checked) set.add(scope)
      else set.delete(scope)
      return [...set]
    })
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
          aria-selected={tab === 'aparencia'}
          className={'settings-tabs__btn' + (tab === 'aparencia' ? ' is-active' : '')}
          onClick={() => setTab('aparencia')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Palette {...icTab} aria-hidden />
            Aparência
          </span>
        </button>
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

          <section className="panel">
            <h2 className="panel__title">Usuários</h2>
            <p className="muted">{users.length} usuário(s) cadastrado(s)</p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Perfil</th>
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
                      <td>{formatDatePt(u.createdAt)}</td>
                      <td>
                        {canManageUsers ? (
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => openPermissions(u.id)}>
                            <Shield size={14} strokeWidth={2} />
                            Permissões
                          </button>
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
        </>
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
                Depois ajuste permissões nesta tela (botão <strong>Permissões</strong>).
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
              <button type="button" className="btn btn--primary" onClick={savePermissions} disabled={!canEditSettings}>
                Salvar permissões
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
