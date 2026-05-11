import { useCallback } from 'react'
import { useUiFeedback } from '../ui/UiFeedbackContext'

type UseUnsavedCloseGuardInput = {
  isDirty: () => boolean
  onDiscard: () => void
  onSave?: () => Promise<void>
  message?: string
}

/**
 * Reusa o mesmo vocabulário do guard global para fechar modais/formulários locais.
 */
export function useUnsavedCloseGuard(input: UseUnsavedCloseGuardInput): () => Promise<void> {
  const { requestConfirm, toastError } = useUiFeedback()

  return useCallback(async () => {
    if (!input.isDirty()) {
      input.onDiscard()
      return
    }

    if (!input.onSave) {
      const discard = await requestConfirm({
        title: 'Alteracoes nao gravadas',
        message:
          input.message ??
          'Existem alteracoes ainda nao gravadas. Deseja descartar e sair?',
        confirmLabel: 'Descartar alteracoes',
        cancelLabel: 'Continuar editando',
        danger: true,
      })
      if (discard) input.onDiscard()
      return
    }

    const choice = await requestConfirm({
      title: 'Alteracoes nao gravadas',
      message:
        input.message ??
        'Existem alteracoes ainda nao gravadas. Deseja gravar antes de sair ou descartar?',
      dismissLabel: 'Descartar alteracoes',
      cancelLabel: 'Continuar editando',
      confirmLabel: 'Gravar e sair',
      danger: false,
    })

    if (choice === false) return
    if (choice === null) {
      input.onDiscard()
      return
    }

    try {
      await input.onSave()
      input.onDiscard()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Nao foi possivel gravar antes de sair.')
    }
  }, [input, requestConfirm, toastError])
}
