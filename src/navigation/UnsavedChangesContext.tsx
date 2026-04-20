import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'

export type UnsavedChangesSpec = {
  /** Texto opcional exibido no diálogo */
  message?: string
  isDirty: () => boolean
  /** Se ausente, o usuário só pode sair sem gravar ou cancelar */
  onSave?: () => Promise<void>
}

type UnsavedChangesContextValue = {
  register: (spec: UnsavedChangesSpec | null) => void
  getActive: () => UnsavedChangesSpec | null
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null)

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const specRef = useRef<UnsavedChangesSpec | null>(null)

  const register = useCallback((spec: UnsavedChangesSpec | null) => {
    specRef.current = spec
  }, [])

  const getActive = useCallback(() => specRef.current, [])

  const value = useMemo(() => ({ register, getActive }), [register, getActive])

  return <UnsavedChangesContext.Provider value={value}>{children}</UnsavedChangesContext.Provider>
}

export function useUnsavedChanges(): UnsavedChangesContextValue {
  const ctx = useContext(UnsavedChangesContext)
  if (!ctx) throw new Error('useUnsavedChanges fora de UnsavedChangesProvider')
  return ctx
}

/**
 * Registra alterações não salvas na rota atual. Apenas uma página/modal deve registrar por vez (último ganha).
 * Passe `isDirty` e `onSave` estáveis (`useCallback`) quando possível.
 */
export function useRegisterUnsavedChanges(spec: {
  enabled?: boolean
  isDirty: () => boolean
  onSave?: () => Promise<void>
  message?: string
}): void {
  const { register } = useUnsavedChanges()
  const specRef = useRef(spec)
  specRef.current = spec
  const enabled = spec.enabled !== false

  useLayoutEffect(() => {
    if (!enabled) {
      register(null)
      return () => register(null)
    }
    register({
      message: specRef.current.message,
      isDirty: () => specRef.current.isDirty(),
      onSave: specRef.current.onSave ? () => specRef.current.onSave!() : undefined,
    })
    return () => register(null)
  }, [enabled, register, spec.message])
}
