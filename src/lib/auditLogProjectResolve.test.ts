import { describe, expect, it } from 'vitest'
import type { DbProject, DbTask } from '../db/types'
import {
  AUDIT_TASK_CONSOLIDATED_MARKER,
  parseProjectNameFromTaskAuditDetails,
  resolveAuditLogProjectDisplay,
  type AuditProjectResolveMaps,
} from './auditLogProjectResolve'

function emptyMaps(over: Partial<AuditProjectResolveMaps> = {}): AuditProjectResolveMaps {
  return {
    projectById: new Map(),
    taskById: new Map(),
    phaseById: new Map(),
    sessionById: new Map(),
    commentById: new Map(),
    ...over,
  }
}

describe('parseProjectNameFromTaskAuditDetails', () => {
  it('extrai nome na exclusão de tarefa', () => {
    expect(
      parseProjectNameFromTaskAuditDetails(
        'Exclusão da tarefa 0.1 (ACME LTDA). Título: Instalação.',
      ),
    ).toBe('ACME LTDA')
  })

  it('extrai nome na alteração de tarefa', () => {
    expect(
      parseProjectNameFromTaskAuditDetails(
        'Alteração na tarefa do projeto (Beta SA). Código mudou de X para Y.',
      ),
    ).toBe('Beta SA')
  })
})

describe('resolveAuditLogProjectDisplay', () => {
  it('resolve tarefa pelo task.projectId', () => {
    const p: Pick<DbProject, 'projectName'> = { projectName: 'Proj A' }
    const t: Pick<DbTask, 'projectId'> = { projectId: 'pid-1' }
    const maps = emptyMaps({
      projectById: new Map([['pid-1', p]]),
      taskById: new Map([['tid-1', t]]),
    })
    expect(
      resolveAuditLogProjectDisplay(
        { entity: 'tarefa', entityId: 'tid-1', entityLabel: 'x', details: '' },
        maps,
      ),
    ).toBe('Proj A')
  })

  it('remove sufixo de consolidação no entityId da tarefa', () => {
    const p: Pick<DbProject, 'projectName'> = { projectName: 'P' }
    const t: Pick<DbTask, 'projectId'> = { projectId: 'p1' }
    const maps = emptyMaps({
      projectById: new Map([['p1', p]]),
      taskById: new Map([['root-id', t]]),
    })
    expect(
      resolveAuditLogProjectDisplay(
        {
          entity: 'tarefa',
          entityId: `root-id${AUDIT_TASK_CONSOLIDATED_MARKER}`,
          entityLabel: 'chain',
          details: '',
        },
        maps,
      ),
    ).toBe('P')
  })

  it('usa details quando a tarefa já não existe', () => {
    const maps = emptyMaps({ projectById: new Map(), taskById: new Map() })
    expect(
      resolveAuditLogProjectDisplay(
        {
          entity: 'tarefa',
          entityId: 'gone',
          entityLabel: '0.1 X',
          details: 'Exclusão da tarefa 0.1 (Fantasma). Título: X.',
        },
        maps,
      ),
    ).toBe('Fantasma')
  })

  it('projeto usa entityLabel se o projeto sumiu do Dexie', () => {
    const maps = emptyMaps()
    expect(
      resolveAuditLogProjectDisplay(
        {
          entity: 'projeto',
          entityId: 'pid-x',
          entityLabel: 'Nome no log',
          details: '',
        },
        maps,
      ),
    ).toBe('Nome no log')
  })

  it('outro assistente_ia usa entityId como projeto', () => {
    const maps = emptyMaps({
      projectById: new Map([['p2', { projectName: 'Alvo' }]]),
    })
    expect(
      resolveAuditLogProjectDisplay(
        {
          entity: 'outro',
          entityId: 'p2',
          entityLabel: 'assistente_ia',
          details: '[query_success] ok',
        },
        maps,
      ),
    ).toBe('Alvo')
  })
})
