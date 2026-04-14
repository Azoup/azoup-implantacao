import { FormEvent, useCallback, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, Edit3, Trash2, UserCheck, UserX } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { hasScope } from '../auth/permissions'
import { db } from '../db/database'
import { uuid } from '../lib/uuid'
import { formatDatePt } from '../lib/dates'
import type { DbAnalyst } from '../db/types'
import { AnalystAvatar } from '../components/AnalystAvatar'
import { AnalystAvatarCropper } from '../components/AnalystAvatarCropper'
import { AnalystReplacementPickModal } from '../components/AnalystReplacementPickModal'
import { reassignAnalystReferences } from '../services/analystAssignments'
import { useUiFeedback } from '../ui/UiFeedbackContext'

const ANALYST_COLORS = ['#FF8B17', '#0EA5E9', '#8B5CF6', '#22C55E', '#EF4444', '#EC4899', '#14B8A6', '#6366F1']

type AnalystDraft = {
  id: string | null
  name: string
  color: string
  avatarUrl: string | null
}

type ReplacementFlowState =
  | null
  | { mode: 'inactivate'; subjectId: string; candidates: DbAnalyst[] }
  | { mode: 'remove'; subjectId: string; candidates: DbAnalyst[] }

export function AnalystsPage() {
  const { toastWarn, requestConfirm } = useUiFeedback()
  const { user } = useAuth()
  const canEditAnalysts = hasScope(user, 'analysts.edit')
  const analysts = useLiveQuery(() => db.analysts.toArray(), []) ?? []
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<AnalystDraft>({
    id: null,
    name: '',
    color: '#FF8B17',
    avatarUrl: null,
  })
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [replacementFlow, setReplacementFlow] = useState<ReplacementFlowState>(null)

  const activeCount = useMemo(() => analysts.filter((a) => a.active).length, [analysts])

  const closeReplacementModal = useCallback(() => setReplacementFlow(null), [])

  async function handleReplacementContinue(replacementId: string | null) {
    const flow = replacementFlow
    if (!flow) return
    setReplacementFlow(null)
    if (flow.mode === 'inactivate') {
      await reassignAnalystReferences(flow.subjectId, replacementId)
      await db.analysts.update(flow.subjectId, { active: false })
      return
    }
    const ok = await requestConfirm({
      title: 'Remover analista',
      message:
        'Remover este analista definitivamente? As referências ativas passam a usar o substituto escolhido (ou ficam sem responsável).',
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
      danger: true,
    })
    if (!ok) return
    await reassignAnalystReferences(flow.subjectId, replacementId)
    await db.analysts.delete(flow.subjectId)
  }

  function openNew() {
    setDraft({
      id: null,
      name: '',
      color: '#FF8B17',
      avatarUrl: null,
    })
    setOpen(true)
    setCropSrc(null)
  }

  function openEdit(a: DbAnalyst) {
    setDraft({
      id: a.id,
      name: a.name,
      color: a.color,
      avatarUrl: a.avatarUrl ?? null,
    })
    setOpen(true)
    setCropSrc(null)
  }

  function closeModal() {
    setOpen(false)
    setCropSrc(null)
  }

  async function onAvatarFile(file: File) {
    const max = 2 * 1024 * 1024
    if (!file.type.startsWith('image/')) {
      toastWarn('Selecione uma imagem (jpg, png, webp, etc).')
      return
    }
    if (file.size > max) {
      toastWarn('A imagem deve ter no máximo 2MB.')
      return
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(String(fr.result ?? ''))
      fr.onerror = () => reject(new Error('Falha ao ler arquivo'))
      fr.readAsDataURL(file)
    })
    setCropSrc(dataUrl)
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!canEditAnalysts) return
    const name = draft.name.trim()
    if (!name) return
    if (draft.id) {
      await db.analysts.update(draft.id, {
        name,
        color: draft.color,
        avatarUrl: draft.avatarUrl,
      })
    } else {
      await db.analysts.add({
        id: uuid(),
        name,
        avatarUrl: draft.avatarUrl,
        color: draft.color,
        active: true,
        createdAt: new Date().toISOString(),
      })
    }
    closeModal()
  }

  /** `currentlyActive`: estado atual do analista no card (true = está ativo; botão Inativar). */
  async function toggleActive(id: string, currentlyActive: boolean) {
    if (!canEditAnalysts) return
    if (currentlyActive) {
      const others = analysts.filter((a) => a.active && a.id !== id)
      if (others.length === 0) {
        await reassignAnalystReferences(id, null)
        await db.analysts.update(id, { active: false })
        return
      }
      setReplacementFlow({ mode: 'inactivate', subjectId: id, candidates: others })
      return
    }
    await db.analysts.update(id, { active: true })
  }

  async function remove(id: string) {
    if (!canEditAnalysts) return
    const others = analysts.filter((a) => a.active && a.id !== id)
    if (others.length === 0) {
      const ok = await requestConfirm({
        title: 'Remover analista',
        message: 'Remover analista definitivamente? Não há outros analistas ativos para assumir vínculos.',
        confirmLabel: 'Remover',
        cancelLabel: 'Cancelar',
        danger: true,
      })
      if (!ok) return
      await reassignAnalystReferences(id, null)
      await db.analysts.delete(id)
      return
    }
    setReplacementFlow({ mode: 'remove', subjectId: id, candidates: others })
  }

  return (
    <div className="page page--wide analysts-page">
      <header className="page__header page__header--split analysts-page__header">
        <div>
          <h1 className="page__title">Analistas</h1>
          <p className="page__subtitle">Responsáveis pela implantação, agenda e execução das tarefas</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openNew} disabled={!canEditAnalysts}>
          + Novo Analista
        </button>
      </header>

      <section className="panel panel--stack analysts-page__panel">
        <div className="analysts-kpis">
          <div className="analysts-kpi">
            <span className="analysts-kpi__label muted">Total</span>
            <strong className="analysts-kpi__value">{analysts.length}</strong>
          </div>
          <div className="analysts-kpi">
            <span className="analysts-kpi__label muted">Ativos</span>
            <strong className="analysts-kpi__value">{activeCount}</strong>
          </div>
        </div>

        {analysts.length === 0 ? (
          <p className="muted">Nenhum analista cadastrado ainda.</p>
        ) : (
          <div className="analysts-grid">
            {analysts.map((a) => (
              <article key={a.id} className="analyst-card">
                <div className="analyst-card__top">
                  <AnalystAvatar name={a.name} color={a.color} avatarUrl={a.avatarUrl} size="lg" />
                  <div className="analyst-card__main">
                    <h3 className="analyst-card__name">{a.name}</h3>
                    <p className="analyst-card__meta muted">Criado em {formatDatePt(a.createdAt)}</p>
                  </div>
                  <span className={'pill ' + (a.active ? 'pill--accent' : '')}>{a.active ? 'Ativo' : 'Inativo'}</span>
                </div>
                <div className="analyst-card__color-row">
                  <span className="muted">Cor vinculada</span>
                  <span className="color-dot" style={{ background: a.color }} />
                  <code className="analyst-card__hex">{a.color.toUpperCase()}</code>
                </div>
                <div className="analyst-card__actions">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(a)} disabled={!canEditAnalysts}>
                    <Edit3 size={14} strokeWidth={2} />
                    Editar
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => void toggleActive(a.id, a.active)} disabled={!canEditAnalysts}>
                    {a.active ? <UserX size={14} strokeWidth={2} /> : <UserCheck size={14} strokeWidth={2} />}
                    {a.active ? 'Inativar' : 'Ativar'}
                  </button>
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => void remove(a.id)} disabled={!canEditAnalysts}>
                    <Trash2 size={14} strokeWidth={2} />
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <AnalystReplacementPickModal
        open={replacementFlow !== null}
        title={replacementFlow?.mode === 'inactivate' ? 'Inativar analista' : 'Substituto antes de excluir'}
        description={
          replacementFlow?.mode === 'inactivate'
            ? 'Escolha quem recebe projetos, tarefas, agenda e sessões deste analista. Você também pode remover os vínculos.'
            : 'Escolha o analista que assume as referências ativas. Em seguida confirme a exclusão definitiva.'
        }
        candidates={replacementFlow?.candidates ?? []}
        confirmLabel={replacementFlow?.mode === 'inactivate' ? 'Inativar' : 'Continuar'}
        onCancel={closeReplacementModal}
        onContinue={(rid) => void handleReplacementContinue(rid)}
      />

      {open && canEditAnalysts ? (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div className="modal" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
            <h2 className="modal__title">{draft.id ? 'Editar analista' : 'Novo analista'}</h2>
            <form className="stack" onSubmit={onSave}>
              {cropSrc ? (
                <AnalystAvatarCropper
                  src={cropSrc}
                  onCancel={() => setCropSrc(null)}
                  onApply={(dataUrl) => {
                    setDraft((d) => ({ ...d, avatarUrl: dataUrl }))
                    setCropSrc(null)
                  }}
                />
              ) : null}
              <div className="analyst-avatar-editor">
                <AnalystAvatar
                  name={draft.name || 'Analista'}
                  color={draft.color}
                  avatarUrl={draft.avatarUrl}
                  size="lg"
                />
                <div className="analyst-avatar-editor__actions">
                  <label className="btn btn--ghost btn--sm">
                    <Camera size={14} strokeWidth={2} />
                    {draft.avatarUrl ? 'Trocar foto' : 'Selecionar foto'}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        void onAvatarFile(file)
                        e.currentTarget.value = ''
                      }}
                    />
                  </label>
                  {draft.avatarUrl ? (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setDraft((d) => ({ ...d, avatarUrl: null }))}
                    >
                      Remover foto
                    </button>
                  ) : null}
                </div>
              </div>
              <label className="field">
                <span>Nome</span>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  required
                />
              </label>
              <div className="field">
                <span>Cor do analista</span>
                <div className="analyst-color-picker">
                  {ANALYST_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Selecionar cor ${c}`}
                      className={'analyst-color-swatch' + (draft.color.toLowerCase() === c.toLowerCase() ? ' is-active' : '')}
                      style={{ background: c }}
                      onClick={() => setDraft((d) => ({ ...d, color: c }))}
                    />
                  ))}
                  <label className="analyst-color-custom">
                    <span className="muted">Personalizar</span>
                    <input
                      type="color"
                      value={draft.color}
                      onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
                    />
                  </label>
                </div>
              </div>
              <div className="modal__actions">
                <button type="button" className="btn btn--ghost" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary">
                  {draft.id ? 'Salvar alterações' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
