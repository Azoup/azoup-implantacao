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

export type ToastTone = 'info' | 'error' | 'warn'

export type ConfirmOptions = {
  message: string
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Estilo destrutivo (ex.: excluir) */
  danger?: boolean
}

type PendingConfirm = {
  opts: ConfirmOptions
  resolve: (value: boolean) => void
}

type ToastItem = { id: string; message: string; tone: ToastTone }

type UiFeedbackContextValue = {
  toast: (message: string, tone?: ToastTone) => void
  toastError: (message: string) => void
  toastWarn: (message: string) => void
  requestConfirm: (options: ConfirmOptions) => Promise<boolean>
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
  const cancelBtnRef = useRef<HTMLButtonElement>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [dialogOpts, setDialogOpts] = useState<ConfirmOptions | null>(null)
  const pendingRef = useRef<PendingConfirm | null>(null)
  const queueRef = useRef<PendingConfirm[]>([])

  const closeDialog = useCallback((result: boolean) => {
    const p = pendingRef.current
    pendingRef.current = null
    p?.resolve(result)
    const next = queueRef.current.shift()
    if (next) {
      pendingRef.current = next
      setDialogOpts(next.opts)
    } else {
      setDialogOpts(null)
    }
  }, [])

  const requestConfirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        const item: PendingConfirm = { opts: options, resolve }
        if (!pendingRef.current) {
          pendingRef.current = item
          setDialogOpts(options)
        } else {
          queueRef.current.push(item)
        }
      }),
    [],
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

  const value = useMemo(
    () => ({ toast, toastError, toastWarn, requestConfirm }),
    [toast, toastError, toastWarn, requestConfirm],
  )

  useEffect(() => {
    if (!dialogOpts) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeDialog(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [dialogOpts, closeDialog])

  useEffect(() => {
    if (!dialogOpts) return
    const id = window.requestAnimationFrame(() => cancelBtnRef.current?.focus())
    return () => window.cancelAnimationFrame(id)
  }, [dialogOpts])

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
      {dialogOpts ? (
        <div className="ui-confirm-backdrop" role="presentation" onClick={() => closeDialog(false)}>
          <div
            className="ui-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby={confirmTitleId}
            aria-describedby={confirmMessageId}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={confirmTitleId} className="ui-confirm__title">
              {dialogOpts.title ?? 'Confirmar'}
            </h2>
            <p id={confirmMessageId} className="ui-confirm__message">
              {dialogOpts.message}
            </p>
            <div className="ui-confirm__actions">
              <button
                ref={cancelBtnRef}
                type="button"
                className="btn btn--ghost"
                onClick={() => closeDialog(false)}
              >
                {dialogOpts.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                type="button"
                className={dialogOpts.danger ? 'btn btn--danger' : 'btn btn--primary'}
                onClick={() => closeDialog(true)}
              >
                {dialogOpts.confirmLabel ?? 'OK'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </UiFeedbackContext.Provider>
  )
}
