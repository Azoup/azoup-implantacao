import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import {
  fetchWelcomeTemplate,
  fetchWelcomeSubmissionsForProject,
  saveWelcomeTemplateForProject,
  type WelcomeSubmissionForProjectRow,
} from '../services/clientPortal'
import { useUiFeedback } from '../ui/UiFeedbackContext'
import { AZOUP_WELCOME_GOOGLE_FORM_URL } from '../constants/azoupWelcomeForm'
import {
  buildAzoupMarkerSchema,
  resolveWelcomeFormFieldsFromSchema,
  defaultGoogleFormUrlFromSchema,
  type WelcomeFormFieldDef,
  type WelcomeFormSchemaPayload,
} from '../lib/welcomeFormSchema'
import { formatDateTimePt } from '../lib/dates'
import { useAuth } from '../auth/AuthContext'
import { hasScope } from '../auth/permissions'
import './WelcomeFormsPage.css'

type TabKey = 'editor' | 'responses'

function newFieldId(): string {
  return `campo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function emptyField(): WelcomeFormFieldDef {
  return {
    id: newFieldId(),
    section: 'Nova seção',
    label: 'Nova pergunta',
    type: 'text',
    required: false,
    help: '',
    placeholder: '',
  }
}

function optionsToLines(opts: string[] | undefined): string {
  return (opts ?? []).join('\n')
}

function linesToOptions(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function WelcomeFormsPage() {
  const { toast, toastError } = useUiFeedback()
  const { user } = useAuth()
  const canPreviewPortal = Boolean(user && hasScope(user, 'portal.forms.fill'))

  const projectsLive = useLiveQuery(
    () =>
      db.projects.toArray().then((rows) =>
        [...rows].sort((a, b) =>
          (a.projectName ?? '').localeCompare(b.projectName ?? '', 'pt-BR', { sensitivity: 'base' }),
        ),
      ),
    [],
  )
  const projects = useMemo(() => projectsLive ?? [], [projectsLive])
  const [projectId, setProjectId] = useState('')
  const [tab, setTab] = useState<TabKey>('editor')
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState('Formulário de boas-vindas')
  const [googleUrl, setGoogleUrl] = useState(AZOUP_WELCOME_GOOGLE_FORM_URL)
  const [fields, setFields] = useState<WelcomeFormFieldDef[]>(() => resolveWelcomeFormFieldsFromSchema(null))
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [subs, setSubs] = useState<WelcomeSubmissionForProjectRow[]>([])

  useEffect(() => {
    if (!projectId && projects.length) {
      setProjectId(projects[0].id)
    }
  }, [projectId, projects])

  useEffect(() => {
    if (!projectId) return
    let alive = true
    setLoading(true)
    void (async () => {
      try {
        const [tpl, submissions] = await Promise.all([
          fetchWelcomeTemplate(projectId),
          fetchWelcomeSubmissionsForProject(projectId),
        ])
        if (!alive) return
        const schema = tpl ? (tpl as { form_schema?: unknown }).form_schema : null
        setTemplateId(tpl?.id ? String(tpl.id) : null)
        setTemplateName(tpl?.name ? String(tpl.name) : 'Formulário de boas-vindas')
        setGoogleUrl(defaultGoogleFormUrlFromSchema(schema) ?? AZOUP_WELCOME_GOOGLE_FORM_URL)
        setFields(resolveWelcomeFormFieldsFromSchema(schema))
        setSubs(submissions)
      } catch (e) {
        toastError(e instanceof Error ? e.message : 'Falha ao carregar.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [projectId, toastError])

  async function onSave() {
    if (!projectId) return
    const ids = new Set<string>()
    for (const f of fields) {
      if (ids.has(f.id)) {
        toastError(`ID duplicado: ${f.id}. Ajuste antes de salvar.`)
        return
      }
      ids.add(f.id)
    }
    const schema: WelcomeFormSchemaPayload = {
      fields: fields.map((f) => ({ ...f })),
      externalGoogleFormUrl: googleUrl.trim() || null,
    }
    try {
      setSaving(true)
      const { templateId: tid } = await saveWelcomeTemplateForProject({
        projectId,
        name: templateName.trim() || 'Formulário de boas-vindas',
        schema,
      })
      setTemplateId(tid)
      toast('Formulário salvo. O portal do cliente passa a usar esta versão.')
      const submissions = await fetchWelcomeSubmissionsForProject(projectId)
      setSubs(submissions)
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Falha ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  function onRestoreAzoupDefaults() {
    if (!window.confirm('Restaurar o modelo padrão Azoup no editor? Salve depois para gravar no projeto.')) return
    setFields(resolveWelcomeFormFieldsFromSchema(buildAzoupMarkerSchema()))
    setGoogleUrl(AZOUP_WELCOME_GOOGLE_FORM_URL)
    toast('Modelo padrão carregado no editor (use Salvar para publicar).')
  }

  function updateField(i: number, patch: Partial<WelcomeFormFieldDef>) {
    setFields((prev) => {
      const next = [...prev]
      next[i] = { ...next[i]!, ...patch }
      return next
    })
  }

  function moveField(i: number, dir: -1 | 1) {
    setFields((prev) => {
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      const t = next[i]!
      next[i] = next[j]!
      next[j] = t
      return next
    })
  }

  function removeField(i: number) {
    setFields((prev) => prev.filter((_, idx) => idx !== i))
  }

  function duplicateField(i: number) {
    setFields((prev) => {
      const copy = { ...prev[i]!, id: newFieldId() }
      const next = [...prev]
      next.splice(i + 1, 0, copy)
      return next
    })
  }

  const projectLabel = projects.find((p) => p.id === projectId)?.projectName ?? '—'

  return (
    <div className="page page--wide wf-page">
      <header className="page__header">
        <h1 className="page__title">Formulários</h1>
        <p className="page__subtitle">
          Edite o formulário de boas-vindas por projeto. O que salvar aqui é o que o cliente vê em{' '}
          <strong>Portal → Boas-vindas</strong> (mesmo template no Supabase).
        </p>
      </header>

      <div className="wf-toolbar panel">
        <label className="field wf-field--project">
          <span>Projeto</span>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={!projects.length}>
            {!projects.length ? <option value="">Nenhum projeto local</option> : null}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.projectName}
              </option>
            ))}
          </select>
        </label>
        <label className="field wf-field--grow">
          <span>Nome do template</span>
          <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Formulário de boas-vindas" />
        </label>
        {canPreviewPortal && projectId ? (
          <Link className="btn btn--ghost" to={`/portal/boas-vindas/${projectId}`} target="_blank" rel="noreferrer">
            Abrir como cliente
          </Link>
        ) : null}
        <button type="button" className="btn btn--primary" disabled={saving || !projectId || loading} onClick={() => void onSave()}>
          {saving ? 'Salvando…' : 'Salvar formulário'}
        </button>
      </div>

      <div className="wf-tabs" role="tablist" aria-label="Modo">
        <button
          type="button"
          role="tab"
          className={`btn wf-tab ${tab === 'editor' ? 'btn--primary' : 'btn--ghost'}`}
          aria-selected={tab === 'editor'}
          onClick={() => setTab('editor')}
        >
          Perguntas
        </button>
        <button
          type="button"
          role="tab"
          className={`btn wf-tab ${tab === 'responses' ? 'btn--primary' : 'btn--ghost'}`}
          aria-selected={tab === 'responses'}
          onClick={() => setTab('responses')}
        >
          Respostas ({subs.length})
        </button>
      </div>

      {loading ? (
        <p className="muted">Carregando…</p>
      ) : tab === 'editor' ? (
        <div className="wf-editor">
          <section className="panel wf-panel">
            <h2 className="panel__title">Link opcional (Google Forms)</h2>
            <p className="panel__lead muted">Exibido no portal como alternativa ao formulário nativo.</p>
            <label className="field">
              <span>URL</span>
              <input value={googleUrl} onChange={(e) => setGoogleUrl(e.target.value)} placeholder="https://..." />
            </label>
          </section>

          <div className="wf-editor-actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setFields((p) => [...p, emptyField()])}>
              Adicionar pergunta
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onRestoreAzoupDefaults}>
              Carregar padrão Azoup
            </button>
            {templateId ? (
              <span className="muted wf-meta">
                Template ativo: <code>{templateId}</code>
              </span>
            ) : (
              <span className="muted wf-meta">Nenhum template ativo — o primeiro salvar cria o registro.</span>
            )}
          </div>

          <ul className="wf-field-list">
            {fields.map((f, i) => (
              <li key={`${f.id}-${i}`} className="panel wf-field-card">
                <div className="wf-field-card__head">
                  <span className="wf-field-badge">#{i + 1}</span>
                  <div className="wf-field-card__actions">
                    <button type="button" className="btn btn--xs btn--ghost" aria-label="Subir" onClick={() => moveField(i, -1)} disabled={i === 0}>
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn--xs btn--ghost"
                      aria-label="Descer"
                      onClick={() => moveField(i, 1)}
                      disabled={i === fields.length - 1}
                    >
                      ↓
                    </button>
                    <button type="button" className="btn btn--xs btn--ghost" onClick={() => duplicateField(i)}>
                      Duplicar
                    </button>
                    <button type="button" className="btn btn--xs btn--danger" onClick={() => removeField(i)}>
                      Remover
                    </button>
                  </div>
                </div>
                <div className="form-grid wf-grid">
                  <label className="field">
                    <span>ID (chave)</span>
                    <input value={f.id} onChange={(e) => updateField(i, { id: e.target.value.trim() })} spellCheck={false} />
                  </label>
                  <label className="field">
                    <span>Seção</span>
                    <input value={f.section ?? ''} onChange={(e) => updateField(i, { section: e.target.value })} />
                  </label>
                  <label className="field wf-span-2">
                    <span>Pergunta (rótulo)</span>
                    <input value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Tipo</span>
                    <select value={f.type} onChange={(e) => updateField(i, { type: e.target.value as WelcomeFormFieldDef['type'] })}>
                      <option value="text">Texto curto</option>
                      <option value="textarea">Texto longo</option>
                      <option value="select">Lista (uma opção)</option>
                      <option value="checklist">Lista (várias opções)</option>
                    </select>
                  </label>
                  <label className="field wf-check">
                    <span>Obrigatório</span>
                    <input type="checkbox" checked={!!f.required} onChange={(e) => updateField(i, { required: e.target.checked })} />
                  </label>
                  {(f.type === 'select' || f.type === 'checklist') && (
                    <label className="field wf-span-2">
                      <span>Opções (uma por linha)</span>
                      <textarea
                        rows={4}
                        value={optionsToLines(f.options)}
                        onChange={(e) => updateField(i, { options: linesToOptions(e.target.value) })}
                      />
                    </label>
                  )}
                  <label className="field wf-span-2">
                    <span>Dica (help)</span>
                    <textarea rows={2} value={f.help ?? ''} onChange={(e) => updateField(i, { help: e.target.value })} />
                  </label>
                  <label className="field wf-span-2">
                    <span>Placeholder</span>
                    <input value={f.placeholder ?? ''} onChange={(e) => updateField(i, { placeholder: e.target.value })} />
                  </label>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <section className="panel wf-responses">
          <h2 className="panel__title">Respostas — {projectLabel}</h2>
          <p className="panel__lead muted">Últimas submissões sincronizadas do Supabase para este projeto.</p>
          {!subs.length ? (
            <p className="muted">Nenhuma resposta ainda.</p>
          ) : (
            <ul className="wf-sub-list">
              {subs.map((s) => (
                <li key={s.id} className="wf-sub panel">
                  <header className="wf-sub__head">
                    <strong>{formatDateTimePt(s.created_at ?? s.submitted_at ?? '')}</strong>
                    <span className={`wf-status wf-status--${(s.status ?? 'draft').toLowerCase()}`}>{s.status ?? '—'}</span>
                    <span className="muted">{s.clients?.name ?? 'Cliente'}</span>
                  </header>
                  <SubmissionAnswers fields={fields} answers={s.answers} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

function SubmissionAnswers({ fields, answers }: { fields: WelcomeFormFieldDef[]; answers: unknown }) {
  const map = answers && typeof answers === 'object' ? (answers as Record<string, unknown>) : {}
  const byId = new Map(fields.map((f) => [f.id, f]))
  const keys = Object.keys(map).length ? Object.keys(map) : fields.map((f) => f.id)
  return (
    <dl className="wf-answers">
      {keys.map((id) => {
        const def = byId.get(id)
        const label = def?.label ?? id
        const v = map[id]
        let text: string
        if (Array.isArray(v)) text = v.join(', ')
        else if (v == null) text = '—'
        else text = String(v)
        return (
          <div key={id} className="wf-answers__row">
            <dt>{label}</dt>
            <dd>{text || '—'}</dd>
          </div>
        )
      })}
    </dl>
  )
}
