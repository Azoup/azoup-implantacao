import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { SYNC_FAILURE_EVENT, type SyncFailureDetail } from '../sync/syncFailure'
import { pushRuntimeDiagnostic } from '../diagnostics/runtimeDiagnostics'
import {
  buildFeedbackErrorMessage,
  buildFeedbackSuccessMessage,
  type FeedbackAction,
  type FeedbackGender,
} from '../lib/feedbackMessages'

export type ToastTone = 'info' | 'error' | 'warn'

export type ConfirmOptions = {
  message: string
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Botão à esquerda: encerra o fluxo sem confirmar nem cancelar no sentido “secundário” (`null` na Promise). */
  dismissLabel?: string
  /** Estilo destrutivo (ex.: excluir) */
  danger?: boolean
}

/** Confirmação com justificativa no mesmo diálogo (padrão visual do app). */
export type DestructiveWithReasonOptions = {
  message: string
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  reasonLabel: string
  reasonPlaceholder?: string
  reasonMinLength: number
}

type DialogQueueItem =
  | { kind: 'confirm'; opts: ConfirmOptions; resolve: (value: boolean | null) => void }
  | { kind: 'destructiveReason'; opts: DestructiveWithReasonOptions; resolve: (value: string | null) => void }

type ToastItem = { id: string; message: string; tone: ToastTone }

type UiFeedbackContextValue = {
  toast: (message: string, tone?: ToastTone) => void
  toastError: (message: string) => void
  toastWarn: (message: string) => void
  toastMutationSuccess: (input: { action: FeedbackAction; target?: string; gender?: FeedbackGender }) => void
  toastMutationError: (
    input: { action: FeedbackAction; target?: string; gender?: FeedbackGender },
    fallback?: string,
  ) => void
  requestConfirm: (options: ConfirmOptions) => Promise<boolean | null>
  requestDestructiveWithReason: (options: DestructiveWithReasonOptions) => Promise<string | null>
}

const UiFeedbackContext = createContext<UiFeedbackContextValue | null>(null)

export function useUiFeedback(): UiFeedbackContextValue {
  const ctx = useContext(UiFeedbackContext)
  if (!ctx) {
    throw new Error('useUiFeedback deve ser usado dentro de UiFeedbackProvider')
  }
  return ctx
}

export function UiFeedbackProvider({ children }: { children: ReactNode }) {
  const confirmTitleId = useId()
  const confirmMessageId = useId()
  const reasonInputId = useId()
  const cancelBtnRef = useRef<HTMLButtonElement>(null)
  const dismissBtnRef = useRef<HTMLButtonElement>(null)
  const reasonRef = useRef<HTMLTextAreaElement>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [activeDialog, setActiveDialog] = useState<DialogQueueItem | null>(null)
  const [reasonDraft, setReasonDraft] = useState('')
  const pendingRef = useRef<DialogQueueItem | null>(null)
  const queueRef = useRef<DialogQueueItem[]>([])

  const openNext = useCallback(() => {
    const next = queueRef.current.shift()
    if (next) {
      pendingRef.current = next
      setActiveDialog(next)
    } else {
      pendingRef.current = null
      setActiveDialog(null)
    }
  }, [])

  const finishConfirm = useCallback(
    (value: boolean | null) => {
      const p = pendingRef.current
      if (!p || p.kind !== 'confirm') return
      pendingRef.current = null
      p.resolve(value)
      openNext()
    },
    [openNext],
  )

  const finishDestructive = useCallback(
    (value: string | null) => {
      const p = pendingRef.current
      if (!p || p.kind !== 'destructiveReason') return
      pendingRef.current = null
      p.resolve(value)
      setReasonDraft('')
      openNext()
    },
    [openNext],
  )

  const enqueue = useCallback((item: DialogQueueItem) => {
    if (!pendingRef.current) {
      pendingRef.current = item
      setActiveDialog(item)
    } else {
      queueRef.current.push(item)
    }
  }, [])

  const requestConfirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean | null>((resolve) => {
        enqueue({ kind: 'confirm', opts: options, resolve })
      }),
    [enqueue],
  )

  const requestDestructiveWithReason = useCallback(
    (options: DestructiveWithReasonOptions) =>
      new Promise<string | null>((resolve) => {
        enqueue({ kind: 'destructiveReason', opts: options, resolve })
      }),
    [enqueue],
  )

  const toast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4200)
  }, [])

  const toastError = useCallback((message: string) => toast(message, 'error'), [toast])
  const toastWarn = useCallback((message: string) => toast(message, 'warn'), [toast])
  const toastMutationSuccess = useCallback(
    (input: { action: FeedbackAction; target?: string; gender?: FeedbackGender }) => {
      toast(buildFeedbackSuccessMessage(input), 'info')
    },
    [toast],
  )
  const toastMutationError = useCallback(
    (
      input: { action: FeedbackAction; target?: string; gender?: FeedbackGender },
      fallback?: string,
    ) => {
      toastError(fallback || buildFeedbackErrorMessage(input))
    },
    [toastError],
  )

  const value = useMemo(
    () => ({
      toast,
      toastError,
      toastWarn,
      toastMutationSuccess,
      toastMutationError,
      requestConfirm,
      requestDestructiveWithReason,
    }),
    [
      toast,
      toastError,
      toastWarn,
      toastMutationSuccess,
      toastMutationError,
      requestConfirm,
      requestDestructiveWithReason,
    ],
  )

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7771/ingest/ced2954a-7cb6-4d8d-ae61-f349b908d868',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'077059'},body:JSON.stringify({sessionId:'077059',runId:'pre-fix',hypothesisId:'H0',location:'UiFeedbackContext.tsx:mount',message:'UiFeedbackProvider mounted',data:{ok:true},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [])

  useEffect(() => {
    const lastByTable = new Map<string, number>()
    const toFriendlySyncMessage = (table: string, raw: string): string => {
      const msg = String(raw || '')
      if (msg.includes('PRJ_CREATE_RLS') || /policy|permission denied|row-level security/i.test(msg)) {
        return `Permissão de nuvem negada para ${table}. Verifique vínculo do usuário no projeto (owner/analista) ou perfil admin.`
      }
      if (msg.includes('PRJ_CREATE_TIMEOUT') || /timeout|tempo esgotado/i.test(msg)) {
        return `Sincronização da nuvem está lenta para ${table}. Alteração local foi mantida e o retry será tentado.`
      }
      return `Falha de sincronização na nuvem (${table}): ${msg}`
    }
    const onFail = (ev: Event) => {
      const ce = ev as CustomEvent<SyncFailureDetail>
      const d = ce.detail
      if (!d?.table || !d.message) return
      // #region agent log
      fetch('http://127.0.0.1:7771/ingest/ced2954a-7cb6-4d8d-ae61-f349b908d868',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'077059'},body:JSON.stringify({sessionId:'077059',runId:'pre-fix',hypothesisId:'H2',location:'UiFeedbackContext.tsx:syncFailureListener',message:'SYNC_FAILURE_EVENT received',data:{table:d.table,operation:d.operation,message:d.message},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const now = Date.now()
      const prev = lastByTable.get(d.table) ?? 0
      if (now - prev < 25_000) return
      lastByTable.set(d.table, now)
      toastWarn(toFriendlySyncMessage(d.table, d.message))
    }
    window.addEventListener(SYNC_FAILURE_EVENT, onFail as EventListener)
    return () => window.removeEventListener(SYNC_FAILURE_EVENT, onFail as EventListener)
  }, [toastWarn])

  useEffect(() => {
    const onUnhandledRejection = (ev: PromiseRejectionEvent) => {
      const reason = ev.reason instanceof Error ? ev.reason.message : String(ev.reason ?? 'Erro desconhecido')
      // #region agent log
      fetch('http://127.0.0.1:7771/ingest/ced2954a-7cb6-4d8d-ae61-f349b908d868',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'077059'},body:JSON.stringify({sessionId:'077059',runId:'pre-fix',hypothesisId:'H3',location:'UiFeedbackContext.tsx:onUnhandledRejection',message:'Unhandled rejection captured',data:{reason},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      pushRuntimeDiagnostic({
        source: 'window.unhandledrejection',
        level: 'error',
        message: 'Promise rejeitada sem tratamento.',
        details: reason,
      })
    }
    const onWindowError = (ev: ErrorEvent) => {
      pushRuntimeDiagnostic({
        source: 'window.error',
        level: 'error',
        message: ev.message || 'Erro global capturado',
        details: ev.filename ? `${ev.filename}:${ev.lineno}:${ev.colno}` : undefined,
      })
    }
    window.addEventListener('unhandledrejection', onUnhandledRejection)
    window.addEventListener('error', onWindowError)
    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
      window.removeEventListener('error', onWindowError)
    }
  }, [])

  useEffect(() => {
    if (activeDialog?.kind === 'destructiveReason') {
      setReasonDraft('')
    }
  }, [activeDialog])

  useEffect(() => {
    if (!activeDialog) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (activeDialog.kind === 'confirm')
          finishConfirm(activeDialog.opts.dismissLabel ? null : false)
        else finishDestructive(null)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [activeDialog, finishConfirm, finishDestructive])

  useEffect(() => {
    if (!activeDialog) return
    const id = window.requestAnimationFrame(() => {
      if (activeDialog.kind === 'destructiveReason') {
        reasonRef.current?.focus()
      } else if (activeDialog.kind === 'confirm' && activeDialog.opts.dismissLabel) {
        dismissBtnRef.current?.focus()
      } else {
        cancelBtnRef.current?.focus()
      }
    })
    return () => window.cancelAnimationFrame(id)
  }, [activeDialog])

  const destructiveOpts = activeDialog?.kind === 'destructiveReason' ? activeDialog.opts : null
  const destructiveOk =
    destructiveOpts != null && reasonDraft.trim().length >= destructiveOpts.reasonMinLength

  return (
    <UiFeedbackContext.Provider value={value}>
      {children}
      <div className="ui-toast-stack" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`ui-toast ui-toast--${t.tone}`} role="status">
            {t.message}
          </div>
        ))}
      </div>
      {activeDialog?.kind === 'confirm' ? (
        <div
          className="ui-confirm-backdrop"
          role="presentation"
          onClick={() => finishConfirm(activeDialog.opts.dismissLabel ? null : false)}
        >
          <div
            className="ui-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby={confirmTitleId}
            aria-describedby={confirmMessageId}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={confirmTitleId} className="ui-confirm__title">
              {activeDialog.opts.title ?? 'Confirmar'}
            </h2>
            <p id={confirmMessageId} className="ui-confirm__message">
              {activeDialog.opts.message}
            </p>
            <div className={'ui-confirm__actions' + (activeDialog.opts.dismissLabel ? ' ui-confirm__actions--with-dismiss' : '')}>
              {activeDialog.opts.dismissLabel ? (
                <button
                  ref={dismissBtnRef}
                  type="button"
                  className="btn btn--ghost ui-confirm__dismiss"
                  onClick={() => finishConfirm(null)}
                >
                  {activeDialog.opts.dismissLabel}
                </button>
              ) : null}
              <button
                ref={cancelBtnRef}
                type="button"
                className="btn btn--ghost"
                onClick={() => finishConfirm(false)}
              >
                {activeDialog.opts.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                type="button"
                className={activeDialog.opts.danger ? 'btn btn--danger' : 'btn btn--primary'}
                onClick={() => finishConfirm(true)}
              >
                {activeDialog.opts.confirmLabel ?? 'OK'}
              </button>
            </div>
          </div>
        </div>
      ) : activeDialog?.kind === 'destructiveReason' && destructiveOpts ? (
        <div className="ui-confirm-backdrop" role="presentation" onClick={() => finishDestructive(null)}>
          <div
            className="ui-confirm ui-confirm--with-reason"
            role="dialog"
            aria-modal="true"
            aria-labelledby={confirmTitleId}
            aria-describedby={confirmMessageId}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={confirmTitleId} className="ui-confirm__title">
              {destructiveOpts.title ?? 'Confirmar exclusão'}
            </h2>
            <p id={confirmMessageId} className="ui-confirm__message">
              {destructiveOpts.message}
            </p>
            <div className="ui-confirm__field">
              <label htmlFor={reasonInputId} className="ui-confirm__field-label">
                {destructiveOpts.reasonLabel}
              </label>
              <textarea
                ref={reasonRef}
                id={reasonInputId}
                className="input ui-confirm__textarea"
                rows={3}
                value={reasonDraft}
                onChange={(e) => setReasonDraft(e.target.value)}
                placeholder={destructiveOpts.reasonPlaceholder}
                autoComplete="off"
              />
              <p className="ui-confirm__hint muted">
                Mínimo de {destructiveOpts.reasonMinLength} caracteres para confirmar.
              </p>
            </div>
            <div className="ui-confirm__actions">
              <button
                ref={cancelBtnRef}
                type="button"
                className="btn btn--ghost"
                onClick={() => finishDestructive(null)}
              >
                {destructiveOpts.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                type="button"
                className="btn btn--danger"
                disabled={!destructiveOk}
                onClick={() => finishDestructive(reasonDraft.trim())}
              >
                {destructiveOpts.confirmLabel ?? 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </UiFeedbackContext.Provider>
  )
}
