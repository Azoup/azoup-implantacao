import { describe, expect, it } from 'vitest'
import {
  inferSessionType,
  resolveSessionType,
  sessionTypeDescription,
  shouldAddGoogleMeetForTask,
} from './sessionType'

describe('inferSessionType', () => {
  it('classifica instalação e configurações como técnica', () => {
    expect(inferSessionType('Instalação do Sistema')).toBe('technical')
    expect(inferSessionType('Configurações')).toBe('technical')
  })

  it('classifica virada como handover', () => {
    expect(inferSessionType('Virada de Sistema: Vendas')).toBe('handover')
  })

  it('demais títulos como treinamento', () => {
    expect(inferSessionType('Cadastros')).toBe('training')
    expect(inferSessionType('NF-e')).toBe('training')
  })
})

describe('resolveSessionType', () => {
  it('respeita valor gravado na tarefa', () => {
    expect(resolveSessionType('Cadastros', 'technical')).toBe('technical')
  })

  it('usa inferência quando null', () => {
    expect(sessionTypeDescription('Instalação', null)).toContain('TeamViewer')
  })
})

describe('shouldAddGoogleMeetForTask', () => {
  it('não gera Meet para instalação e configuração', () => {
    expect(shouldAddGoogleMeetForTask('Instalação do Sistema')).toBe(false)
    expect(shouldAddGoogleMeetForTask('Configurações')).toBe(false)
  })

  it('gera Meet para treinamento e virada', () => {
    expect(shouldAddGoogleMeetForTask('Cadastros')).toBe(true)
    expect(shouldAddGoogleMeetForTask('Virada de Sistema: Vendas')).toBe(true)
  })
})
