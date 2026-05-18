import { describe, expect, it } from 'vitest'
import type { DbEvent, DbTask } from '../db/types'
import { buildWhatsAppScheduleText } from './scheduleExport'

function task(partial: Partial<DbTask> & Pick<DbTask, 'id' | 'title'>): DbTask {
  return {
    description: '',
    projectId: 'p1',
    phaseId: 'ph1',
    status: 'pendente',
    priority: 'media',
    estimatedHours: 1,
    actualHours: 0,
    assignedTo: null,
    dueDate: null,
    isInformational: false,
    createdAt: '2026-01-01',
    code: '1.1',
    sortOrder: 0,
    ...partial,
  }
}

function event(partial: Partial<DbEvent> & Pick<DbEvent, 'startTime' | 'endTime'>): DbEvent {
  return {
    id: 'e1',
    title: 'PROJ - Instalação',
    description: '',
    status: 'agendado',
    projectId: 'p1',
    taskId: 't1',
    analystId: 'a1',
    meetingLink: null,
    recordingLink: null,
    createdAt: '2026-01-01',
    ...partial,
  }
}

describe('buildWhatsAppScheduleText', () => {
  it('monta texto no formato WhatsApp', () => {
    const text = buildWhatsAppScheduleText(
      { projectName: 'Boutique dos Uniformes' },
      [
        event({
          id: 'e1',
          taskId: 't1',
          startTime: '2026-05-20T12:00:00.000Z',
          endTime: '2026-05-20T13:30:00.000Z',
        }),
      ],
      [task({ id: 't1', title: '1.1 Instalação do Sistema' })],
    )
    expect(text).toContain('AZOUP & BOUTIQUE DOS UNIFORMES')
    expect(text).toContain('Instalação do Sistema')
    expect(text).toContain('> Conexão remota via TeamViewer, sem reunião')
    expect(text).not.toContain('meet.google.com')
  })

  it('inclui link Meet em treinamento e virada quando existir', () => {
    const text = buildWhatsAppScheduleText(
      { projectName: 'Loja Teste' },
      [
        event({
          id: 'e1',
          taskId: 't1',
          startTime: '2026-05-20T12:00:00.000Z',
          endTime: '2026-05-20T13:30:00.000Z',
          meetingLink: 'https://meet.google.com/abc-defg-hij',
        }),
        event({
          id: 'e2',
          taskId: 't2',
          startTime: '2026-05-21T12:00:00.000Z',
          endTime: '2026-05-21T13:30:00.000Z',
          meetingLink: 'meet.google.com/xyz-abcd-efg',
        }),
      ],
      [
        task({ id: 't1', title: '1.2 Cadastros' }),
        task({ id: 't2', title: '2.1 Virada de Sistema: Vendas' }),
      ],
    )
    expect(text).toContain('> https://meet.google.com/abc-defg-hij')
    expect(text).toContain('> https://meet.google.com/xyz-abcd-efg')
  })
})
