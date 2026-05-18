import { describe, expect, it } from 'vitest'
import type { DbEvent } from '../db/types'
import {
  type CalendarTitleProject,
  extractEmpresaFromProject,
  formatAgendaDisplayTitle,
  formatGoogleCalendarTitle,
  parseEmpresaAssuntoFromTitle,
  stripLeadingBracketTags,
  stripTaskCodePrefix,
} from './calendarEventTitle'

function ev(partial: Partial<DbEvent> & Pick<DbEvent, 'title'>): DbEvent {
  return {
    id: 'e1',
    description: '',
    startTime: '2026-05-15T12:00:00.000Z',
    endTime: '2026-05-15T13:00:00.000Z',
    status: 'agendado',
    projectId: null,
    taskId: null,
    analystId: null,
    meetingLink: null,
    recordingLink: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

function project(partial: Partial<CalendarTitleProject> & Pick<CalendarTitleProject, 'projectName'>): CalendarTitleProject {
  return {
    tradeName: null,
    razaoSocial: null,
    ...partial,
  }
}

describe('stripTaskCodePrefix', () => {
  it('remove 1.2. e 1.1 com espaço', () => {
    expect(stripTaskCodePrefix('1.2. Configurações')).toBe('Configurações')
    expect(stripTaskCodePrefix('1.1 Alinhamento')).toBe('Alinhamento')
    expect(stripTaskCodePrefix('2.3 Treinamento')).toBe('Treinamento')
  })
})

describe('stripLeadingBracketTags', () => {
  it('remove [UPSELL] do início', () => {
    expect(stripLeadingBracketTags('[UPSELL] SANTINI')).toBe('SANTINI')
    expect(stripLeadingBracketTags('[upsell] Destak')).toBe('Destak')
  })
})

describe('extractEmpresaFromProject', () => {
  it('usa projectName e ignora sufixo após hífen', () => {
    const p = project({
      tradeName: 'Santini',
      razaoSocial: 'SANTINI LTDA',
      projectName: '[UPSELL] SANTINI - módulo extra',
    })
    expect(extractEmpresaFromProject(p)).toBe('SANTINI')
  })

  it('prefere projectName em vez de razão social', () => {
    const p = project({
      projectName: 'G21 SPORTS CONFECÇÕES',
      razaoSocial: 'MARIEBELLA INDUSTRIA E COMERCIO DE ROUPAS LTDA',
      tradeName: null,
    })
    expect(extractEmpresaFromProject(p)).toBe('G21 SPORTS CONFECÇÕES')
  })

  it('limpa [UPSELL] do projectName quando não há tradeName', () => {
    const p = project({ projectName: '[UPSELL] DESTAK - expansão' })
    expect(extractEmpresaFromProject(p)).toBe('DESTAK')
  })

  it('usa tradeName só quando projectName estiver vazio', () => {
    const p = project({ projectName: '', tradeName: 'Brand Confecção' })
    expect(extractEmpresaFromProject(p)).toBe('BRAND CONFECÇÃO')
  })
})

describe('parseEmpresaAssuntoFromTitle', () => {
  it('extrai empresa e assunto de título Google', () => {
    expect(parseEmpresaAssuntoFromTitle('Brand Confecção - Instalação do Sistema')).toEqual({
      empresa: 'BRAND CONFECÇÃO',
      assunto: 'INSTALAÇÃO DO SISTEMA',
    })
  })

  it('ignora prefixo INTERNO legado', () => {
    expect(parseEmpresaAssuntoFromTitle('INTERNO - Treinamento')).toBeNull()
  })
})

describe('formatAgendaDisplayTitle', () => {
  it('formata tarefa do plano com projeto SANTINI', () => {
    const e = ev({
      title: '1.2. Configurações',
      projectId: 'p1',
    })
    const p = project({ projectName: 'SANTINI', tradeName: 'Santini' })
    expect(formatAgendaDisplayTitle(e, p)).toBe('SANTINI - CONFIGURAÇÕES')
    expect(formatGoogleCalendarTitle(e, p)).toBe('SANTINI - CONFIGURAÇÕES')
  })

  it('usa projeto passado mesmo sem projectId no evento (import Google)', () => {
    const e = ev({ title: '1.2 Configurações', projectId: null, taskId: 't1' })
    const p = project({ projectName: 'BRAND CONFECÇÃO', tradeName: 'Brand Confecção' })
    expect(
      formatAgendaDisplayTitle(e, p, { code: '1.2', title: 'Instalação do Sistema' }),
    ).toBe('BRAND CONFECÇÃO - INSTALAÇÃO DO SISTEMA')
  })

  it('sem projeto: só assunto (sem prefixo INTERNO)', () => {
    const e = ev({ title: 'Treinamento de consignado' })
    expect(formatAgendaDisplayTitle(e)).toBe('TREINAMENTO DE CONSIGNADO')
  })

  it('preserva título já formatado vindo do Google', () => {
    const e = ev({ title: 'BRAND CONFECÇÃO - Ordem de Produção' })
    expect(formatAgendaDisplayTitle(e)).toBe('BRAND CONFECÇÃO - ORDEM DE PRODUÇÃO')
  })

  it('remove código da tarefa vinculada no título', () => {
    const e = ev({
      title: '1.2 Configurações',
      projectId: 'p1',
      taskId: 't1',
    })
    const p = project({ projectName: 'SANTINI' })
    expect(formatAgendaDisplayTitle(e, p, { code: '1.2', title: 'Configurações' })).toBe(
      'SANTINI - CONFIGURAÇÕES',
    )
  })

  it('não reaplica INTERNO em título legado', () => {
    const e = ev({ title: 'INTERNO - Reunião de alinhamento' })
    expect(formatAgendaDisplayTitle(e)).toBe('REUNIÃO DE ALINHAMENTO')
  })
})
