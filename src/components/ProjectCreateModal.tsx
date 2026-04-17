import { FormEvent, useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { Building2, Loader2, MapPin, Rocket } from 'lucide-react'
import type {
  DbAnalyst,
  DbPlanModel,
  DbProject,
  DbUser,
  KanbanColumn,
  PlanTypeKey,
  ProjectStatus,
} from '../db/types'
import { db } from '../db/database'
import {
  dateInputToIsoNoon,
  digitsOnly,
  formatCepDisplay,
  formatCnpjDisplay,
  formatPhoneBrDisplay,
} from '../lib/brazilFormat'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { upsertProjectToSupabase } from '../sync/supabaseDexieBridge'
import { createProjectFromPlan } from '../services/project'
import { normalizeProjectPlacement } from '../services/projectGovernance'
import { fetchCnpjFromBrasilApi } from '../services/brasilCnpj'
import { fetchCepViaViaCep } from '../services/viacep'
import { formatDurationHmFromHours } from '../lib/durationFormat'

function emptyToNull(s: string): string | null {
  const t = s.trim()
  return t ? t : null
}

function isoToDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return format(d, 'yyyy-MM-dd')
}

type PlanRow = Pick<DbPlanModel, 'id' | 'key' | 'name' | 'hoursContracted' | 'phaseCount'>

type Props = {
  open: boolean
  onClose: () => void
  user: DbUser
  plans: PlanRow[]
  analysts: DbAnalyst[]
  initialKanbanColumn: KanbanColumn
  /** Se definido, modal em modo edição (não recria tarefas). */
  projectToEdit?: DbProject | null
}

export function ProjectCreateModal({
  open,
  onClose,
  user,
  plans,
  analysts,
  initialKanbanColumn,
  projectToEdit = null,
}: Props) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const plansRef = useRef(plans)
  plansRef.current = plans

  const [projectName, setProjectName] = useState('')
  const [planKey, setPlanKey] = useState<PlanTypeKey>('master')
  const [analystId, setAnalystId] = useState('')
  const [startDate, setStartDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [dueDate, setDueDate] = useState('')

  const [cnpjDigits, setCnpjDigits] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [corporateEmail, setCorporateEmail] = useState('')

  const [cepDigits, setCepDigits] = useState('')
  const [addressStreet, setAddressStreet] = useState('')
  const [addressNumber, setAddressNumber] = useState('')
  const [addressComplement, setAddressComplement] = useState('')
  const [addressNeighborhood, setAddressNeighborhood] = useState('')
  const [addressCity, setAddressCity] = useState('')
  const [addressState, setAddressState] = useState('')

  const [implantationContactName, setImplantationContactName] = useState('')
  const [implantationPhoneDigits, setImplantationPhoneDigits] = useState('')
  const [clientApiId, setClientApiId] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [stateRegistration, setStateRegistration] = useState('')
  const [secondaryCnpjDigits, setSecondaryCnpjDigits] = useState('')
  const [secondaryRazaoSocial, setSecondaryRazaoSocial] = useState('')
  const [modulesDescription, setModulesDescription] = useState('')
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>('ativo')

  const [cnpjLoading, setCnpjLoading] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [lookupHint, setLookupHint] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const edit = projectToEdit
    if (edit) {
      setProjectName(edit.projectName)
      setPlanKey(edit.planType)
      setAnalystId(edit.analystId ?? '')
      setStartDate(isoToDateInput(edit.startDate))
      setDueDate(isoToDateInput(edit.dueDate))
      setCnpjDigits(edit.cnpj ?? '')
      setRazaoSocial(edit.razaoSocial ?? '')
      setTradeName(edit.tradeName ?? '')
      setCorporateEmail(edit.corporateEmail ?? '')
      setCepDigits(edit.cep ?? '')
      setAddressStreet(edit.addressStreet ?? '')
      setAddressNumber(edit.addressNumber ?? '')
      setAddressComplement(edit.addressComplement ?? '')
      setAddressNeighborhood(edit.addressNeighborhood ?? '')
      setAddressCity(edit.addressCity ?? '')
      setAddressState(edit.addressState ?? '')
      setImplantationContactName(edit.implantationContactName ?? '')
      setImplantationPhoneDigits(digitsOnly(edit.implantationContactPhone ?? ''))
      setClientApiId(edit.clientApiId ?? '')
      setInternalNotes(edit.internalNotes ?? '')
      setStateRegistration(edit.stateRegistration ?? '')
      setSecondaryCnpjDigits(edit.secondaryCnpj ?? '')
      setSecondaryRazaoSocial(edit.secondaryRazaoSocial ?? '')
      setModulesDescription(edit.modulesDescription ?? '')
      setProjectStatus(edit.status)
      setErr(null)
      setLookupHint(null)
      return
    }
    const p = plansRef.current
    setProjectName('')
    setPlanKey(p[0]?.key ?? 'master')
    setAnalystId('')
    setStartDate(format(new Date(), 'yyyy-MM-dd'))
    setDueDate('')
    setCnpjDigits('')
    setRazaoSocial('')
    setTradeName('')
    setCorporateEmail('')
    setCepDigits('')
    setAddressStreet('')
    setAddressNumber('')
    setAddressComplement('')
    setAddressNeighborhood('')
    setAddressCity('')
    setAddressState('')
    setImplantationContactName('')
    setImplantationPhoneDigits('')
    setClientApiId('')
    setInternalNotes('')
    setStateRegistration('')
    setSecondaryCnpjDigits('')
    setSecondaryRazaoSocial('')
    setModulesDescription('')
    setProjectStatus('ativo')
    setErr(null)
    setLookupHint(null)
  }, [open, projectToEdit?.id])

  useEffect(() => {
    if (plans.length === 0) return
    if (!plans.some((p) => p.key === planKey)) setPlanKey(plans[0].key)
  }, [plans, planKey])

  const scrollToSection = (id: string) => {
    const root = bodyRef.current
    const el = root?.querySelector(`#${id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function onLookupCnpj() {
    setErr(null)
    setLookupHint(null)
    setCnpjLoading(true)
    try {
      const data = await fetchCnpjFromBrasilApi(cnpjDigits)
      setCnpjDigits(data.cnpjDigits)
      setRazaoSocial(data.razaoSocial === '—' ? '' : data.razaoSocial)
      setTradeName(data.tradeName ?? '')
      if (data.cepDigits) setCepDigits(data.cepDigits)
      if (data.addressStreet) setAddressStreet(data.addressStreet)
      if (data.addressNumber) setAddressNumber(data.addressNumber)
      if (data.addressComplement) setAddressComplement(data.addressComplement)
      if (data.addressNeighborhood) setAddressNeighborhood(data.addressNeighborhood)
      if (data.addressCity) setAddressCity(data.addressCity)
      if (data.addressState) setAddressState(data.addressState)
      setLookupHint('Dados preenchidos a partir da Brasil API (referência pública). Confira antes de salvar.')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro na consulta CNPJ.')
    } finally {
      setCnpjLoading(false)
    }
  }

  async function onLookupCep() {
    setErr(null)
    setLookupHint(null)
    setCepLoading(true)
    try {
      const data = await fetchCepViaViaCep(cepDigits)
      setCepDigits(data.cepDigits)
      if (data.addressStreet) setAddressStreet(data.addressStreet)
      if (data.addressNeighborhood) setAddressNeighborhood(data.addressNeighborhood)
      if (data.addressCity) setAddressCity(data.addressCity)
      if (data.addressState) setAddressState(data.addressState)
      if (data.addressComplement && !addressComplement.trim()) setAddressComplement(data.addressComplement)
      setLookupHint('Endereço preenchido via ViaCEP. Ajuste número e complemento se necessário.')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro na consulta CEP.')
    } finally {
      setCepLoading(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    const name = projectName.trim()
    if (name.length < 2) {
      setErr('Informe o nome do projeto.')
      return
    }
    setSaving(true)
    try {
      const cnpj = cnpjDigits.length === 14 ? cnpjDigits : null
      const cep = cepDigits.length === 8 ? cepDigits : null
      const secondaryCnpj = secondaryCnpjDigits.length === 14 ? secondaryCnpjDigits : null
      const common = {
        projectName: name,
        analystId: analystId || null,
        startDate: dateInputToIsoNoon(startDate) ?? projectToEdit?.startDate ?? new Date().toISOString(),
        dueDate: dateInputToIsoNoon(dueDate || null),
        cnpj,
        razaoSocial: emptyToNull(razaoSocial),
        tradeName: emptyToNull(tradeName),
        cep,
        addressStreet: emptyToNull(addressStreet),
        addressNumber: emptyToNull(addressNumber),
        addressComplement: emptyToNull(addressComplement),
        addressNeighborhood: emptyToNull(addressNeighborhood),
        addressCity: emptyToNull(addressCity),
        addressState: emptyToNull(addressState)?.toUpperCase().slice(0, 2) ?? null,
        implantationContactName: emptyToNull(implantationContactName),
        implantationContactPhone:
          implantationPhoneDigits.length > 0 ? formatPhoneBrDisplay(implantationPhoneDigits) : null,
        corporateEmail: emptyToNull(corporateEmail),
        clientApiId: emptyToNull(clientApiId),
        internalNotes: emptyToNull(internalNotes),
        stateRegistration: emptyToNull(stateRegistration),
        secondaryCnpj,
        secondaryRazaoSocial: emptyToNull(secondaryRazaoSocial),
        modulesDescription: emptyToNull(modulesDescription),
      }

      if (projectToEdit) {
        const placement = normalizeProjectPlacement({
          status: projectStatus,
          kanbanColumn: projectToEdit.kanbanColumn,
        })
        const patch = { ...common, ...placement }
        if (isSupabaseConfigured()) {
          const nextRow: DbProject = { ...projectToEdit, ...patch }
          await upsertProjectToSupabase(nextRow)
        }
        await db.projects.update(projectToEdit.id, patch)
      } else {
        await createProjectFromPlan({
          ...common,
          planKey,
          ownerId: user.id,
          createdBy: user.id,
          kanbanColumn: initialKanbanColumn,
        })
      }
      onClose()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : projectToEdit ? 'Erro ao salvar' : 'Erro ao criar')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const isEdit = !!projectToEdit

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => !saving && onClose()}>
      <div
        className="modal modal--project-create"
        role="dialog"
        aria-modal
        aria-labelledby="project-create-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="project-create-title" className="modal__title">
          {isEdit ? 'Editar projeto e cliente' : 'Novo projeto e cliente'}
        </h2>
        <p className="muted project-create-modal__lead">
          {isEdit
            ? 'Altere dados cadastrais e operacionais. O plano contratado e as tarefas geradas não são recriados ao salvar.'
            : 'Cadastro unificado: empresa, endereço, contrato e contato na operação. O plano gera fases e tarefas automaticamente.'}
        </p>

        <nav className="project-create-modal__jump" aria-label="Ir para seção">
          <button type="button" className="project-create-modal__jump-btn" onClick={() => scrollToSection('pf-empresa')}>
            <Building2 size={16} strokeWidth={2} aria-hidden />
            Empresa
          </button>
          <button type="button" className="project-create-modal__jump-btn" onClick={() => scrollToSection('pf-endereco')}>
            <MapPin size={16} strokeWidth={2} aria-hidden />
            Endereço
          </button>
          <button type="button" className="project-create-modal__jump-btn" onClick={() => scrollToSection('pf-projeto')}>
            <Rocket size={16} strokeWidth={2} aria-hidden />
            Projeto
          </button>
        </nav>

        <div className="project-create-modal__body" ref={bodyRef}>
          <form className="stack project-create-form" onSubmit={onSubmit}>
            <section className="project-form-section" id="pf-empresa">
              <div className="project-form-section__head">
                <Building2 className="project-form-section__icon" size={20} strokeWidth={1.75} aria-hidden />
                <div>
                  <h3 className="project-form-section__title">Empresa</h3>
                  <p className="project-form-section__sub muted">CNPJ e razão social (consulta pública Brasil API).</p>
                </div>
              </div>
              <div className="project-form-grid">
                <label className="field field--span2">
                  <span>CNPJ</span>
                  <div className="field-row">
                    <input
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="00.000.000/0000-00"
                      value={formatCnpjDisplay(cnpjDigits)}
                      onChange={(e) => setCnpjDigits(digitsOnly(e.target.value).slice(0, 14))}
                    />
                    <button
                      type="button"
                      className="btn btn--ghost field-row__btn"
                      disabled={cnpjLoading || cnpjDigits.length !== 14}
                      onClick={() => void onLookupCnpj()}
                    >
                      {cnpjLoading ? <Loader2 className="spin" size={18} /> : null}
                      {cnpjLoading ? 'Consultando…' : 'Buscar dados'}
                    </button>
                  </div>
                </label>
                <label className="field field--span2">
                  <span>Razão social</span>
                  <input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} placeholder="Nome jurídico" />
                </label>
                <label className="field field--span2">
                  <span>Nome fantasia</span>
                  <input value={tradeName} onChange={(e) => setTradeName(e.target.value)} placeholder="Opcional" />
                </label>
                <label className="field field--span2">
                  <span>Inscrição estadual (IE)</span>
                  <input
                    value={stateRegistration}
                    onChange={(e) => setStateRegistration(e.target.value)}
                    placeholder="Somente números ou formato da UF"
                  />
                </label>
                <label className="field field--span2">
                  <span>E-mail corporativo</span>
                  <input
                    type="email"
                    value={corporateEmail}
                    onChange={(e) => setCorporateEmail(e.target.value)}
                    placeholder="contato@empresa.com.br"
                  />
                </label>
                <div className="project-form-section__subhead field--span2">CNPJ secundário (opcional)</div>
                <label className="field field--span2">
                  <span>CNPJ secundário</span>
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="00.000.000/0000-00"
                    value={formatCnpjDisplay(secondaryCnpjDigits)}
                    onChange={(e) => setSecondaryCnpjDigits(digitsOnly(e.target.value).slice(0, 14))}
                  />
                </label>
                <label className="field field--span2">
                  <span>Razão social (CNPJ secundário)</span>
                  <input
                    value={secondaryRazaoSocial}
                    onChange={(e) => setSecondaryRazaoSocial(e.target.value)}
                    placeholder="Ex.: empresa para faturamento separado"
                  />
                </label>
              </div>
            </section>

            <section className="project-form-section" id="pf-endereco">
              <div className="project-form-section__head">
                <MapPin className="project-form-section__icon" size={20} strokeWidth={1.75} aria-hidden />
                <div>
                  <h3 className="project-form-section__title">Endereço</h3>
                  <p className="project-form-section__sub muted">CEP com preenchimento automático (ViaCEP).</p>
                </div>
              </div>
              <div className="project-form-grid">
                <label className="field">
                  <span>CEP</span>
                  <div className="field-row">
                    <input
                      inputMode="numeric"
                      placeholder="00000-000"
                      value={formatCepDisplay(cepDigits)}
                      onChange={(e) => setCepDigits(digitsOnly(e.target.value).slice(0, 8))}
                    />
                    <button
                      type="button"
                      className="btn btn--ghost field-row__btn"
                      disabled={cepLoading || cepDigits.length !== 8}
                      onClick={() => void onLookupCep()}
                    >
                      {cepLoading ? <Loader2 className="spin" size={18} /> : null}
                      {cepLoading ? 'Buscando…' : 'Buscar CEP'}
                    </button>
                  </div>
                </label>
                <label className="field">
                  <span>UF</span>
                  <input
                    value={addressState}
                    onChange={(e) =>
                      setAddressState(
                        e.target.value
                          .toUpperCase()
                          .replace(/[^A-Z]/g, '')
                          .slice(0, 2),
                      )
                    }
                    placeholder="SP"
                    maxLength={2}
                  />
                </label>
                <label className="field field--span2">
                  <span>Logradouro</span>
                  <input value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} placeholder="Rua, avenida…" />
                </label>
                <label className="field">
                  <span>Número</span>
                  <input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} />
                </label>
                <label className="field">
                  <span>Complemento</span>
                  <input value={addressComplement} onChange={(e) => setAddressComplement(e.target.value)} />
                </label>
                <label className="field">
                  <span>Bairro</span>
                  <input value={addressNeighborhood} onChange={(e) => setAddressNeighborhood(e.target.value)} />
                </label>
                <label className="field">
                  <span>Município</span>
                  <input value={addressCity} onChange={(e) => setAddressCity(e.target.value)} />
                </label>
              </div>
            </section>

            <section className="project-form-section" id="pf-projeto">
              <div className="project-form-section__head">
                <Rocket className="project-form-section__icon" size={20} strokeWidth={1.75} aria-hidden />
                <div>
                  <h3 className="project-form-section__title">Projeto e implantação</h3>
                  <p className="project-form-section__sub muted">Plano, analista, prazos e contato no cliente.</p>
                </div>
              </div>
              <div className="project-form-grid">
                <label className="field field--span2">
                  <span>Nome do projeto</span>
                  <input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    required
                    minLength={2}
                    placeholder="Ex.: Implantação ERP — Loja Centro"
                  />
                </label>
                <label className="field field--span2">
                  <span>Plano contratado</span>
                  <select value={planKey} onChange={(e) => setPlanKey(e.target.value)} disabled={isEdit}>
                    {plans.map((pl) => (
                      <option key={pl.id} value={pl.key}>
                        {pl.name} — {formatDurationHmFromHours(pl.hoursContracted)} · {pl.phaseCount} fases
                      </option>
                    ))}
                  </select>
                  {isEdit ? (
                    <span className="field__hint muted">Troca de plano não altera tarefas já geradas; ajuste manual se necessário.</span>
                  ) : null}
                </label>
                {isEdit ? (
                  <label className="field field--span2">
                    <span>Situação do projeto</span>
                    <select value={projectStatus} onChange={(e) => setProjectStatus(e.target.value as ProjectStatus)}>
                      <option value="ativo">Ativo</option>
                      <option value="pausado">Pausado</option>
                      <option value="finalizado">Finalizado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </label>
                ) : null}
                <label className="field field--span2">
                  <span>Analista responsável</span>
                  <select value={analystId} onChange={(e) => setAnalystId(e.target.value)}>
                    <option value="">— Definir depois</option>
                    {analysts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Data de início</span>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                </label>
                <label className="field">
                  <span>Previsão de término</span>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </label>
                <label className="field field--span2">
                  <span>Módulos / escopo contratado</span>
                  <textarea
                    rows={5}
                    value={modulesDescription}
                    onChange={(e) => setModulesDescription(e.target.value)}
                    placeholder="Liste módulos, integrações ou pacotes (PCP, fiscal, BI…)"
                  />
                </label>
                <label className="field field--span2">
                  <span>ID API / integração (cliente)</span>
                  <input
                    value={clientApiId}
                    onChange={(e) => setClientApiId(e.target.value)}
                    placeholder="Identificador no sistema do cliente, se houver"
                  />
                </label>
                <label className="field">
                  <span>Responsável pela implantação (no cliente)</span>
                  <input
                    value={implantationContactName}
                    onChange={(e) => setImplantationContactName(e.target.value)}
                    placeholder="Nome completo"
                  />
                </label>
                <label className="field">
                  <span>Telefone (cliente)</span>
                  <input
                    inputMode="tel"
                    placeholder="(00) 00000-0000"
                    value={formatPhoneBrDisplay(implantationPhoneDigits)}
                    onChange={(e) => setImplantationPhoneDigits(digitsOnly(e.target.value).slice(0, 11))}
                  />
                </label>
                <label className="field field--span2">
                  <span>Observações internas</span>
                  <textarea
                    rows={4}
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Contexto comercial, operação, decisões…"
                  />
                </label>
              </div>
            </section>

            {lookupHint ? <p className="project-create-modal__hint muted">{lookupHint}</p> : null}
            {err ? <p className="auth__error">{err}</p> : null}

            <div className="modal__actions modal__actions--sticky">
              <button type="button" className="btn btn--ghost" disabled={saving} onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar projeto'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
