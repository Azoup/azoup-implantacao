import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ClipboardList, ExternalLink, Save, Send, Upload } from 'lucide-react'
import {
  fetchMyWelcomeSubmission,
  fetchWelcomeTemplate,
  getPortalProjectFileDownloadUrl,
  listPortalProjectFiles,
  type PortalProjectFile,
  saveWelcomeSubmission,
  uploadPortalProjectFile,
} from '../../services/clientPortal'
import { useUiFeedback } from '../../ui/UiFeedbackContext'
import { AZOUP_WELCOME_GOOGLE_FORM_URL } from '../../constants/azoupWelcomeForm'
import {
  defaultGoogleFormUrlFromSchema,
  resolveWelcomeFormFieldsFromSchema,
  type WelcomeFormFieldDef,
} from '../../lib/welcomeFormSchema'
import { AzoupLogoMark } from '../../components/AzoupLogoMark'
import '../PortalWelcomeFormPage.css'

function normalizeAnswersForFields(raw: Record<string, unknown> | null, fieldList: WelcomeFormFieldDef[]): Record<string, unknown> {
  if (!raw) return {}
  const next: Record<string, unknown> = { ...raw }
  for (const f of fieldList) {
    if (f.type !== 'checklist') continue
    const v = next[f.id]
    if (Array.isArray(v)) continue
    if (typeof v === 'string' && v.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(v) as unknown
        if (Array.isArray(parsed)) next[f.id] = parsed.map(String)
      } catch {
        /* ignore */
      }
    }
  }
  return next
}

function fieldIsFilled(field: WelcomeFormFieldDef, answers: Record<string, unknown>): boolean {
  const v = answers[field.id]
  if (field.type === 'checklist') {
    return Array.isArray(v) && v.length > 0
  }
  return String(v ?? '').trim().length > 0
}

const AZOUP_SITE = 'https://azoup.com.br/'

export function PortalWelcomeFormPage() {
  const { projectId = '' } = useParams()
  const { toast, toastError } = useUiFeedback()
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [fields, setFields] = useState<WelcomeFormFieldDef[]>(() => resolveWelcomeFormFieldsFromSchema(null))
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [googleFormUrl, setGoogleFormUrl] = useState(AZOUP_WELCOME_GOOGLE_FORM_URL)
  const [submitting, setSubmitting] = useState(false)
  const [lastStatus, setLastStatus] = useState<string | null>(null)
  const [templateFiles, setTemplateFiles] = useState<PortalProjectFile[]>([])
  const [myFiles, setMyFiles] = useState<PortalProjectFile[]>([])
  const [fileBusy, setFileBusy] = useState(false)
  const clientFileRef = useRef<HTMLInputElement>(null)
  const [clientFileHint, setClientFileHint] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const template = await fetchWelcomeTemplate(projectId)
        if (!alive) return
        if (template?.id) {
          setTemplateId(String(template.id))
          const schema = (template as { form_schema?: unknown }).form_schema
          const list = resolveWelcomeFormFieldsFromSchema(schema)
          setGoogleFormUrl(defaultGoogleFormUrlFromSchema(schema) ?? AZOUP_WELCOME_GOOGLE_FORM_URL)
          setFields(list)
          const sub = await fetchMyWelcomeSubmission(projectId, String(template.id))
          if (sub?.answers && typeof sub.answers === 'object') {
            setAnswers(normalizeAnswersForFields(sub.answers as Record<string, unknown>, list))
          }
          if (sub?.status) setLastStatus(String(sub.status))
        } else {
          setTemplateId(null)
          const list = resolveWelcomeFormFieldsFromSchema(null)
          setFields(list)
          setGoogleFormUrl(AZOUP_WELCOME_GOOGLE_FORM_URL)
          setAnswers({})
          setLastStatus(null)
        }
        const [templates, mine] = await Promise.all([
          listPortalProjectFiles(projectId, 'template'),
          listPortalProjectFiles(projectId, 'client_submission'),
        ])
        if (!alive) return
        setTemplateFiles(templates)
        setMyFiles(mine)
      } catch (e) {
        toastError(e instanceof Error ? e.message : 'Falha ao carregar formulário.')
      }
    })()
    return () => {
      alive = false
    }
  }, [projectId, toastError])

  const canSubmit = useMemo(
    () => fields.every((field) => !field.required || fieldIsFilled(field, answers)),
    [answers, fields],
  )

  const fieldSections = useMemo(() => {
    const map = new Map<string, WelcomeFormFieldDef[]>()
    for (const f of fields) {
      const sec = f.section?.trim() || 'Formulário'
      if (!map.has(sec)) map.set(sec, [])
      map.get(sec)!.push(f)
    }
    return [...map.entries()]
  }, [fields])

  const overallProgress = useMemo(() => {
    const required = fields.filter((f) => f.required)
    if (!required.length) return { pct: 0, filled: 0, total: 0 }
    const filled = required.filter((f) => fieldIsFilled(f, answers)).length
    return { pct: Math.round((filled / required.length) * 100), filled, total: required.length }
  }, [fields, answers])

  const sectionProgressList = useMemo(() => {
    return fieldSections.map(([title, sectionFields], idx) => {
      const required = sectionFields.filter((f) => f.required)
      const filled = required.filter((f) => fieldIsFilled(f, answers)).length
      const pct = required.length ? Math.round((filled / required.length) * 100) : 100
      return { title, idx, pct, filled, total: required.length }
    })
  }, [fieldSections, answers])

  async function onSave(status: 'draft' | 'submitted') {
    if (!templateId) {
      toastError('Template de formulário não encontrado para este projeto.')
      return
    }
    if (status === 'submitted' && !canSubmit) {
      toastError('Preencha os campos obrigatórios antes de enviar.')
      return
    }
    try {
      setSubmitting(true)
      await saveWelcomeSubmission({ templateId, projectId, answers, status })
      setLastStatus(status)
      toast(status === 'submitted' ? 'Formulário enviado com sucesso.' : 'Rascunho salvo.')
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Falha ao salvar formulário.')
    } finally {
      setSubmitting(false)
    }
  }

  async function onUploadClientFile(file: File) {
    try {
      setFileBusy(true)
      await uploadPortalProjectFile({ projectId, kind: 'client_submission', file })
      const mine = await listPortalProjectFiles(projectId, 'client_submission')
      setMyFiles(mine)
      toast('Arquivo enviado. A equipe já pode baixar no painel.')
      setClientFileHint(null)
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Falha ao enviar arquivo.')
    } finally {
      setFileBusy(false)
    }
  }

  async function onDownload(fileId: string) {
    try {
      const url = await getPortalProjectFileDownloadUrl(fileId)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Falha ao baixar arquivo.')
    }
  }

  return (
    <main className="page port-welcome-page">
      <header className="page__header page__header--split">
        <div>
          <h1 className="page__title">Formulário de boas-vindas</h1>
          <p className="page__subtitle">
            Mesmo conteúdo da Jornada do cliente Azoup — preencha por seções, salve rascunho e envie quando estiver pronto.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <Link className="btn btn--ghost" to={`/portal/projetos/${projectId}`}>
            Voltar ao projeto
          </Link>
        </div>
      </header>

      <div className="port-welcome__hero" aria-labelledby="port-welcome-hero-title">
        <div className="port-welcome__hero-mesh" aria-hidden />
        <div className="port-welcome__hero-inner">
          <div className="port-welcome__logo-wrap">
            <AzoupLogoMark size={72} />
          </div>
          <div className="port-welcome__hero-titles">
            <p className="port-welcome__hero-kicker">
              <a href={AZOUP_SITE} target="_blank" rel="noopener noreferrer">
                Azoup tecnologia
              </a>
            </p>
            <h2 id="port-welcome-hero-title" className="port-welcome__hero-title">
              Jornada do cliente
            </h2>
            <p className="port-welcome__hero-sub">
              Respostas ficam vinculadas ao seu projeto na Implantação Azoup. Use as dicas em cada campo; campos com * são obrigatórios
              antes do envio final.
            </p>
          </div>
        </div>
      </div>

      <div className="port-welcome__accent-band" aria-hidden>
        <span className="port-welcome__accent-band-line" />
      </div>

      <div className="port-welcome__intro-grid">
        <div className="port-welcome__intro-card">
          <strong>Como preencher</strong>
          <p>
            Navegue pelas seções abaixo ou pelos atalhos no bloco de progresso. Você pode <strong>salvar rascunho</strong> a
            qualquer momento e retomar depois.
          </p>
        </div>
        <div className="port-welcome__intro-card">
          <strong>Referência</strong>
          <p>
            O formulário oficial no Google Forms continua disponível se preferir responder por lá — na Implantação Azoup a equipe
            enxerga tudo no mesmo projeto.
          </p>
        </div>
      </div>

      <section className="panel port-welcome__form-panel">
        <div className="port-welcome__callout">
          <p className="port-welcome__callout-lead muted">
            Prefere responder com login Google? Use o link externo. As respostas nativas abaixo ficam registradas neste
            projeto.
          </p>
          <a className="btn btn--ghost" href={googleFormUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={16} strokeWidth={2} aria-hidden />
            Abrir no Google Forms
          </a>
        </div>

        {!templateId ? (
          <p className="auth__error" style={{ marginBottom: '1rem' }}>
            Este projeto ainda não tem o formulário publicado pela equipe. Peça um administrador para configurar o template
            no projeto; você já pode usar o Google Forms pelo link acima.
          </p>
        ) : null}

        {lastStatus ? (
          <div className="port-welcome__status-row">
            <p>
              Status atual:{' '}
              <span className={`pill ${lastStatus === 'submitted' ? 'pill--ok' : 'pill--warn'}`}>{lastStatus}</span>
            </p>
          </div>
        ) : null}

        <div className="port-welcome__progress-wrap">
          <div className="port-welcome__progress-head">
            <strong>Progresso do formulário</strong>
            <span className="pill pill--ok">
              {overallProgress.filled}/{overallProgress.total} obrigatórios · {overallProgress.pct}%
            </span>
          </div>
          <div className="port-welcome__progress-bar" role="progressbar" aria-valuenow={overallProgress.pct} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${overallProgress.pct}%` }} />
          </div>
          <nav className="port-welcome__section-nav" aria-label="Atalhos para seções do formulário">
            {sectionProgressList.map(({ title, idx, pct }) => (
              <a key={title} href={`#port-welcome-sec-${idx}`} className={pct === 100 ? 'is-done' : undefined}>
                {title.replace(/^\d+\.\s*/, '')} ({pct}%)
              </a>
            ))}
          </nav>
        </div>

        <div className="port-welcome__sections">
          {fieldSections.map(([sectionTitle, sectionFields], sectionIdx) => {
            const sp = sectionProgressList[sectionIdx]
            return (
              <section key={sectionTitle} id={`port-welcome-sec-${sectionIdx}`} className="port-welcome__section-card">
                <header className="port-welcome__section-head">
                  <span className="port-welcome__section-badge" aria-hidden>
                    {sectionIdx + 1}
                  </span>
                  <h2>{sectionTitle}</h2>
                  <span className="pill">{sp?.pct ?? 0}%</span>
                </header>
                <p className="port-welcome__section-meta">
                  {sp?.total ? (
                    <>
                      {sp.filled} de {sp.total} obrigatórios preenchidos nesta seção.
                    </>
                  ) : (
                    <>Nesta seção não há obrigatórios explícitos — preencha conforme o rótulo.</>
                  )}
                </p>
                <div className="form-grid port-welcome__grid">
                  {sectionFields.map((field) => (
                    <label key={field.id} className="field">
                      <span>
                        {field.label}
                        {field.required ? ' *' : ''}
                      </span>
                      {field.help ? <p className="port-welcome__field-hint">{field.help}</p> : null}
                      {field.type === 'textarea' ? (
                        <textarea
                          rows={4}
                          placeholder={field.placeholder ?? ''}
                          value={String(answers[field.id] ?? '')}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          value={String(answers[field.id] ?? '')}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))}
                        >
                          <option value="">Selecione…</option>
                          {(field.options ?? []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'checklist' ? (
                        <div className="port-welcome__checklist" role="group" aria-label={field.label}>
                          {(field.options ?? []).map((option) => {
                            const selected = new Set(
                              Array.isArray(answers[field.id]) ? (answers[field.id] as string[]) : [],
                            )
                            const checked = selected.has(option)
                            return (
                              <label key={option} className="port-welcome__check-item">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const cur = new Set(
                                      Array.isArray(answers[field.id]) ? ([...(answers[field.id] as string[])] as string[]) : [],
                                    )
                                    if (e.target.checked) cur.add(option)
                                    else cur.delete(option)
                                    setAnswers((prev) => ({ ...prev, [field.id]: [...cur] }))
                                  }}
                                />
                                <span>{option}</span>
                              </label>
                            )
                          })}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder={field.placeholder ?? ''}
                          value={String(answers[field.id] ?? '')}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))}
                        />
                      )}
                    </label>
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        <div className="port-welcome__actions">
          <button type="button" className="btn btn--ghost" onClick={() => void onSave('draft')} disabled={submitting || !templateId}>
            <Save size={16} strokeWidth={2} aria-hidden />
            Salvar rascunho
          </button>
          <button type="button" className="btn btn--primary" onClick={() => void onSave('submitted')} disabled={submitting || !templateId}>
            <Send size={16} strokeWidth={2} aria-hidden />
            Enviar formulário
          </button>
        </div>
      </section>

      <section className="panel port-welcome__files-panel">
        <h2 className="panel__title">
          <ClipboardList size={18} strokeWidth={2} style={{ display: 'inline', verticalAlign: 'text-top', marginRight: 6 }} />
          Planilhas padrão e envio de arquivos
        </h2>
        <p className="muted">Baixe os modelos publicados pela equipe, preencha e envie por aqui.</p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Modelos padrão</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {templateFiles.length === 0 ? (
                <tr>
                  <td colSpan={2} className="muted">
                    Sem modelos publicados ainda.
                  </td>
                </tr>
              ) : (
                templateFiles.map((file) => (
                  <tr key={file.id}>
                    <td>{file.originalName}</td>
                    <td>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => void onDownload(file.id)}>
                        Baixar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="field">
          <span>Enviar planilha preenchida</span>
          <input
            ref={clientFileRef}
            type="file"
            className="sr-only"
            accept=".xlsx,.xls,.csv,.pdf,.zip"
            tabIndex={-1}
            aria-hidden
            disabled={fileBusy}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setClientFileHint(file.name)
              void onUploadClientFile(file)
              e.currentTarget.value = ''
            }}
          />
          <div className="file-upload-styled">
            <button type="button" className="btn btn--ghost btn--sm" disabled={fileBusy} onClick={() => clientFileRef.current?.click()}>
              <Upload size={16} strokeWidth={2} aria-hidden />
              Escolher arquivo
            </button>
            <span className="muted file-upload-styled__name" title={clientFileHint ?? undefined}>
              {clientFileHint ?? 'Nenhum arquivo escolhido'}
            </span>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Arquivos enviados</th>
                <th>Tamanho</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {myFiles.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">
                    Nenhum arquivo enviado ainda.
                  </td>
                </tr>
              ) : (
                myFiles.map((file) => (
                  <tr key={file.id}>
                    <td>{file.originalName}</td>
                    <td>{Math.round((Number(file.sizeBytes ?? 0) / 1024) * 10) / 10} KB</td>
                    <td>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => void onDownload(file.id)}>
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
    </main>
  )
}
