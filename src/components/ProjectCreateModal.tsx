import { FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Building2, Loader2, MapPin, Rocket, Sparkles } from 'lucide-react'
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
import {
  enqueuePendingProjectGraphSync,
  updateProjectPartialInSupabase,
  withDexieSupabaseSyncMuted,
} from '../sync/supabaseDexieBridge'
import { dispatchSyncFailure } from '../sync/syncFailure'
import { CUSTOM_PLAN_TYPE } from '../constants/customPlan'
import { createCustomProject, createProjectFromPlan } from '../services/project'
import { getUserForAudit, writeAuditLog } from '../services/auditLogs'
import { describeProjectPersistPatchDiff } from '../lib/projectEditAuditDiff'
import { getBillableEstimatedSumForProject } from '../services/customProjectHours'
import { normalizeProjectPlacement } from '../services/projectGovernance'
import { useUnsavedCloseGuard } from '../navigation/useUnsavedCloseGuard'
import { useUiFeedback } from '../ui/UiFeedbackContext'
import { fetchCnpjFromBrasilApi } from '../services/brasilCnpj'
import { fetchCepViaViaCep } from '../services/viacep'
import { formatDurationHmFromHours } from '../lib/durationFormat'
import { AiFormatModal } from './AiFormatModal'
import { toDateInputValue } from '../lib/dates'

function mapProjectCreateError(raw: unknown, isEdit: boolean): string {
  const fallback = isEdit ? 'Erro ao salvar projeto.' : 'Erro ao criar projeto.'
  const message = raw instanceof Error ? raw.message : ''
  if (!message) return fallback

  const diagnostic = message.match(/(PRJ_CREATE_[A-Z_]+)\|op=([a-z]+)\|type=([a-z]+)\|reason=([^|]+)\|action=(.+)$/i)
  if (diagnostic) {
    const [, code, operation, type, reason, action] = diagnostic
    const operationLabel = operation === 'projects' ? 'projeto' : operation === 'phases' ? 'fases' : 'tarefas'
    const headlineByType: Record<string, string> = {
      timeout: 'Sincronização com a nuvem excedeu o tempo limite.',
      policy: 'Permissão negada para sincronizar com a nuvem (RLS).',
      auth: 'Sessão expirada ou inválida para sincronização com a nuvem.',
      network: 'Falha de rede ou indisponibilidade temporária do Supabase.',
      conflict: 'Conflito de dados durante a sincronização na nuvem.',
      ambiguous: 'A nuvem não confirmou a gravação (resposta sem linha afetada).',
      unknown: 'Falha inesperada na sincronização com a nuvem.',
    }
    const headline = headlineByType[type.toLowerCase()] ?? headlineByType.unknown
    const partial = !isEdit
      ? ' O projeto pode ter sido salvo no cache local; recarregue a tela para confirmar se entrou na nuvem e tente sincronizar novamente.'
      : ''
    return `${headline} Etapa afetada: ${operationLabel}. ${reason.trim()} ${action.trim()}${partial} Código: ${code}.`
  }

  if (!message.includes('PRJ_CREATE_')) {
    return message
  }

  const codeMatch = message.match(/PRJ_CREATE_[A-Z_]+/)
  const code = codeMatch?.[0] ?? 'PRJ_CREATE_SYNC'
  const byCode: Record<string, string> = {
    PRJ_CREATE_TIMEOUT:
      'Não foi possível concluir o cadastro no tempo esperado (PRJ_CREATE_TIMEOUT). Verifique sua conexão e se o projeto Supabase está ativo.',
    PRJ_CREATE_RLS:
      'Permissão negada para gravar no Supabase (PRJ_CREATE_RLS). Confirme as policies RLS e o vínculo do seu perfil.',
    PRJ_CREATE_AUTH:
      'Sua sessão expirou ou não está autenticada (PRJ_CREATE_AUTH). Entre novamente e tente criar o projeto.',
    PRJ_CREATE_NETWORK:
      'Falha de rede ao sincronizar com o Supabase (PRJ_CREATE_NETWORK). Aguarde alguns segundos e tente de novo.',
    PRJ_CREATE_CONFLICT:
      'Conflito de dados na sincronização (PRJ_CREATE_CONFLICT). Atualize os dados e tente novamente.',
    PRJ_CREATE_AMBIGUOUS:
      'Alteração salva localmente; a nuvem não confirmou a escrita (PRJ_CREATE_AMBIGUOUS). Use Sincronizar ou verifique sessão e RLS.',
    PRJ_CREATE_SYNC:
      'Erro inesperado ao sincronizar o cadastro com a nuvem (PRJ_CREATE_SYNC). Se persistir, acione o suporte.',
    PRJ_CREATE_CLOUD_SYNC:
      'Projeto salvo localmente, mas houve falha na sincronização com a nuvem (PRJ_CREATE_CLOUD_SYNC).',
  }
  return byCode[code] ?? `Falha ao criar projeto na nuvem (${code}).`
}

function emptyToNull(s: string): string | null {
  const t = s.trim()
  return t ? t : null
}

function handleProjectPatchSyncFailure(projectId: string, opId: string, syncErr: unknown): never {
  const msg = syncErr instanceof Error ? syncErr.message : String(syncErr)
  const code = msg.match(/PRJ_CREATE_[A-Z_]+/)?.[0] ?? 'PRJ_CREATE_SYNC'
  enqueuePendingProjectGraphSync(projectId, {
    opId,
    lastErrorCode: code,
    lastErrorMessage: msg,
  })
  dispatchSyncFailure({
    table: 'projects',
    operation: 'upsert',
    message: `Falha ao gravar na nuvem após salvar localmente. ${msg}`,
  })
  console.warn('[Supabase] edição de projeto não confirmada na nuvem', {
    projectId,
    opId,
    error: msg,
  })
  throw syncErr instanceof Error ? syncErr : new Error(msg)
}

function isoToDateInput(iso: string | null | undefined): string {
  return toDateInputValue(iso)
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
  onDirtyChange?: (dirty: boolean) => void
}

export function ProjectCreateModal({
  open,
  onClose,
  user,
  plans,
  analysts,
  initialKanbanColumn,
  projectToEdit = null,
  onDirtyChange,
}: Props) {
  const { requestConfirm, toastMutationSuccess, toastMutationError } = useUiFeedback()
  const bodyRef = useRef<HTMLDivElement>(null)
  const plansRef = useRef(plans)
  plansRef.current = plans

  const [projectName, setProjectName] = useState('')
  const [planKey, setPlanKey] = useState<PlanTypeKey>('master')
  /** Teto de horas (plano avulso — política híbrida B). */
  const [customContractHours, setCustomContractHours] = useState(40)
  const [analystId, setAnalystId] = useState('')
  const [startDate, setStartDate] = useState(() => toDateInputValue(new Date()))
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
  const [aiOpenField, setAiOpenField] = useState<'modules' | 'notes' | null>(null)
  const [modalBaseline, setModalBaseline] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSaving(false)
    setCnpjLoading(false)
    setCepLoading(false)
    setAiOpenField(null)
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
      setCustomContractHours(Math.max(0, Math.round(edit.hoursContracted)))
      setErr(null)
      setLookupHint(null)
      return
    }
    const p = plansRef.current
    setProjectName('')
    setPlanKey(p[0]?.key ?? 'master')
    setAnalystId('')
    setStartDate(toDateInputValue(new Date()))
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
    setCustomContractHours(40)
    setErr(null)
    setLookupHint(null)
  }, [open, projectToEdit])

  useEffect(() => {
    if (planKey === CUSTOM_PLAN_TYPE) return
    if (plans.length === 0) return
    if (!plans.some((p) => p.key === planKey)) setPlanKey(plans[0].key)
  }, [plans, planKey])

  const modalSnapshot = useMemo(
    () =>
      JSON.stringify({
        projectName,
        planKey,
        customContractHours,
        analystId,
        startDate,
        dueDate,
        cnpjDigits,
        razaoSocial,
        tradeName,
        corporateEmail,
        cepDigits,
        addressStreet,
        addressNumber,
        addressComplement,
        addressNeighborhood,
        addressCity,
        addressState,
        implantationContactName,
        implantationPhoneDigits,
        clientApiId,
        internalNotes,
        stateRegistration,
        secondaryCnpjDigits,
        secondaryRazaoSocial,
        modulesDescription,
        projectStatus,
      }),
    [
      projectName,
      planKey,
      customContractHours,
      analystId,
      startDate,
      dueDate,
      cnpjDigits,
      razaoSocial,
      tradeName,
      corporateEmail,
      cepDigits,
      addressStreet,
      addressNumber,
      addressComplement,
      addressNeighborhood,
      addressCity,
      addressState,
      implantationContactName,
      implantationPhoneDigits,
      clientApiId,
      internalNotes,
      stateRegistration,
      secondaryCnpjDigits,
      secondaryRazaoSocial,
      modulesDescription,
      projectStatus,
    ],
  )

  useLayoutEffect(() => {
    if (!open) {
      setModalBaseline(null)
      return
    }
    setModalBaseline((prev) => prev ?? modalSnapshot)
  }, [open, modalSnapshot])

  const modalDirty = useMemo(() => {
    if (!open || modalBaseline === null) return false
    return modalSnapshot !== modalBaseline
  }, [open, modalSnapshot, modalBaseline])

  useEffect(() => {
    onDirtyChange?.(open && modalDirty)
  }, [open, modalDirty, onDirtyChange])

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

  async function persistProject() {
    if (saving) return
    setErr(null)
    const name = projectName.trim()
    if (name.length < 2) {
      setErr('Informe o nome do projeto.')
      return
    }

    /** Horas de contrato já validadas (plano avulso em edição). Confirmação roda antes de "Salvando…". */
    let customHoursForPatch: number | undefined
    if (projectToEdit?.planType === CUSTOM_PLAN_TYPE) {
      let nextH = Math.max(0, Math.round(customContractHours))
      const sumEst = await getBillableEstimatedSumForProject(projectToEdit.id)
      if (nextH < sumEst) {
        const ok = await requestConfirm({
          title: 'Contrato abaixo das previsões',
          message: `A soma das estimativas das tarefas não informativas é ${sumEst}h. O contrato não pode ficar menor que essa soma. Ajustar o contrato para ${sumEst}h?`,
          confirmLabel: `Ajustar para ${sumEst}h`,
          cancelLabel: 'Voltar',
        })
        if (!ok) return
        nextH = sumEst
        setCustomContractHours(nextH)
      }
      customHoursForPatch = nextH
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
        const patch: Record<string, unknown> = { ...common, ...placement }
        if (projectToEdit.planType === CUSTOM_PLAN_TYPE && customHoursForPatch !== undefined) {
          patch.hoursContracted = customHoursForPatch
          patch.planSnapshot = {
            ...projectToEdit.planSnapshot,
            hoursContracted: customHoursForPatch,
          }
        }
        const auditDetails = describeProjectPersistPatchDiff(projectToEdit, patch, {
          analystNameById: new Map(analysts.map((a) => [a.id, a.name])),
        })
        if (isSupabaseConfigured()) {
          const opId = crypto.randomUUID()
          await withDexieSupabaseSyncMuted(async () => {
            await db.projects.update(projectToEdit.id, patch as Partial<DbProject>)
          })
          try {
            await updateProjectPartialInSupabase(projectToEdit.id, patch as Partial<DbProject>, opId)
          } catch (syncErr) {
            handleProjectPatchSyncFailure(projectToEdit.id, opId, syncErr)
          }
          setLookupHint('Alterações salvas e confirmadas na nuvem.')
        } else {
          await db.projects.update(projectToEdit.id, patch as Partial<DbProject>)
        }
        if (auditDetails) {
          const actor = await getUserForAudit(user.id)
          await writeAuditLog({
            action: 'alteracao',
            entity: 'projeto',
            entityId: projectToEdit.id,
            entityLabel: name.trim(),
            details: auditDetails,
            user: actor,
          })
        }
      } else if (planKey === CUSTOM_PLAN_TYPE) {
        await createCustomProject({
          ...common,
          hoursContracted: Math.max(0, Math.round(customContractHours)),
          ownerId: user.id,
          createdBy: user.id,
          kanbanColumn: initialKanbanColumn,
        })
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
      toastMutationSuccess({
        action: projectToEdit ? 'update' : 'create',
        target: 'Projeto',
        gender: 'm',
      })
    } catch (ex) {
      const message = mapProjectCreateError(ex, !!projectToEdit)
      setErr(message)
      toastMutationError(
        { action: projectToEdit ? 'update' : 'create', target: 'o projeto', gender: 'm' },
        message,
      )
    } finally {
      setSaving(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    await persistProject()
  }

  const attemptClose = useUnsavedCloseGuard({
    isDirty: () => modalDirty,
    onSave: persistProject,
    onDiscard: onClose,
    message: 'Ha alteracoes nao gravadas no formulario do projeto. Deseja gravar antes de sair?',
  })

  useEffect(() => {
    if (!open) return
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape' || saving) return
      ev.preventDefault()
      void attemptClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, saving, attemptClose])

  if (!open) return null

  const isEdit = !!projectToEdit
  const aiSourceText = aiOpenField === 'modules' ? modulesDescription : aiOpenField === 'notes' ? internalNotes : ''

  function onApplyAiText(next: string, mode: 'replace' | 'append') {
    if (!aiOpenField) return
    const current = aiOpenField === 'modules' ? modulesDescription : internalNotes
    const merged = mode === 'replace' ? next : [current.trim(), next.trim()].filter(Boolean).join('\n\n')
    if (aiOpenField === 'modules') setModulesDescription(merged)
    else setInternalNotes(merged)
    setAiOpenField(null)
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => (!saving ? void attemptClose() : undefined)}>
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
            : 'Cadastro unificado: empresa, endereço, contrato e contato na operação. Escolha um modelo de plano (fases/tarefas do catálogo) ou plano avulso (estrutura montada no projeto).'}
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
          <form
            id="vyntask-project-create-form"
            className="stack project-create-form"
            onSubmit={onSubmit}
          >
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
                    {!isEdit ? (
                      <option value={CUSTOM_PLAN_TYPE}>
                        Plano avulso — fases e tarefas no projeto · teto de horas configurável
                      </option>
                    ) : null}
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
                {!isEdit && planKey === CUSTOM_PLAN_TYPE ? (
                  <label className="field field--span2">
                    <span>Horas contratadas (teto inicial)</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={customContractHours}
                      onChange={(e) => setCustomContractHours(Number(e.target.value))}
                    />
                    <span className="field__hint muted">
                      Política híbrida: você define o teto; ao somar previsões nas tarefas, o app pede confirmação para
                      elevá-lo quando ultrapassar o contrato ({formatDurationHmFromHours(customContractHours)}).
                    </span>
                  </label>
                ) : null}
                {isEdit && projectToEdit?.planType === CUSTOM_PLAN_TYPE ? (
                  <label className="field field--span2">
                    <span>Horas contratadas (teto)</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={customContractHours}
                      onChange={(e) => setCustomContractHours(Number(e.target.value))}
                    />
                    <span className="field__hint muted">
                      Não pode ficar abaixo da soma das estimativas das tarefas operacionais; ao salvar, ajustamos se
                      necessário.
                    </span>
                  </label>
                ) : null}
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
                  <span>Data de início do projeto</span>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                  <span className="field__hint muted">
                    Início operacional (ex.: primeiro contato ou e-mail do cliente). O padrão é hoje só por conveniência —
                    não é a data em que o cadastro foi feito no VynTask. Ajuste aqui na criação ou depois em{' '}
                    <strong>Projeto → Editar</strong>.
                  </span>
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
                  <div className="project-create-modal__ai">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setAiOpenField('modules')}
                      disabled={saving || !modulesDescription.trim()}
                    >
                      <Sparkles size={14} strokeWidth={2} />
                      Formatar IA
                    </button>
                  </div>
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
                  <div className="project-create-modal__ai">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setAiOpenField('notes')}
                      disabled={saving || !internalNotes.trim()}
                    >
                      <Sparkles size={14} strokeWidth={2} />
                      Formatar IA
                    </button>
                  </div>
                </label>
              </div>
            </section>

            {lookupHint ? <p className="project-create-modal__hint muted">{lookupHint}</p> : null}
          </form>
        </div>

        <div className="project-create-modal__footer">
          {err ? <p className="auth__error project-create-modal__footer-err">{err}</p> : null}
          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" disabled={saving} onClick={() => void attemptClose()}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" form="vyntask-project-create-form" disabled={saving}>
              {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar projeto'}
            </button>
          </div>
        </div>
      </div>
      {aiOpenField ? (
        <AiFormatModal
          open
          title={aiOpenField === 'modules' ? 'Formatar módulos/escopo' : 'Formatar observações internas'}
          text={aiSourceText}
          intent="project_doc"
          onClose={() => setAiOpenField(null)}
          onApply={onApplyAiText}
        />
      ) : null}
    </div>
  )
}
