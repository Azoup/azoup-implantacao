import { describe, expect, it } from 'vitest'
import { buildFeedbackErrorMessage, buildFeedbackSuccessMessage } from './feedbackMessages'

describe('feedbackMessages', () => {
  it('monta mensagem de sucesso contextual feminina', () => {
    expect(
      buildFeedbackSuccessMessage({
        action: 'update',
        target: 'Tarefa',
        gender: 'f',
      }),
    ).toBe('Tarefa alterada com sucesso.')
  })

  it('monta mensagem de sucesso contextual masculina', () => {
    expect(
      buildFeedbackSuccessMessage({
        action: 'save',
        target: 'Projeto',
        gender: 'm',
      }),
    ).toBe('Projeto salvo com sucesso.')
  })

  it('monta mensagem de erro contextual', () => {
    expect(
      buildFeedbackErrorMessage({
        action: 'delete',
        target: 'o projeto',
      }),
    ).toBe('Nao foi possivel excluir o projeto.')
  })

  it('usa fallback generico sem alvo', () => {
    expect(buildFeedbackErrorMessage({ action: 'sync' })).toBe('Nao foi possivel sincronizar.')
  })
})
