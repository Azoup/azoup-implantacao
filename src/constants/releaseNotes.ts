/** Classificação das mudanças nas notas de atualização e no changelog. */
export type ReleaseNoteCategory =
  | 'BUG_FIX'
  | 'MELHORIA'
  | 'NOVA_FUNCAO'
  | 'DOCUMENTACAO'
  | 'SEGURANCA'
  | 'INFRA'

export type ReleaseNoteItem = {
  category: ReleaseNoteCategory
  text: string
}

/** Notas exibidas na página Notas de atualização (fonte única; espelhar entradas novas no CHANGELOG.md). */
export type ReleaseNoteBundle = {
  versionDisplay: string
  /** Tag Git ou release (ex.: v1.0.1). */
  tag: string
  /** ISO 8601 (UTC ou com offset); usado para ordenação e exibição localizada. */
  releasedAt: string
  items: ReleaseNoteItem[]
}

export const RELEASE_NOTES: ReleaseNoteBundle[] = [
  {
    versionDisplay: 'v1.0.2',
    tag: 'v1.0.2',
    releasedAt: '2026-05-12T21:00:00.000Z',
    items: [
      {
        category: 'BUG_FIX',
        text: 'Página de notas: data/hora de publicação passa a ser formatada sempre em **horário de Brasília** (`America/Sao_Paulo`), independentemente do fuso do navegador.',
      },
      {
        category: 'MELHORIA',
        text: 'Menu e título da página renomeados para **Notas de atualização** (equivalente a patch notes em português).',
      },
    ],
  },
  {
    versionDisplay: 'v1.0.1',
    tag: 'v1.0.1',
    releasedAt: '2026-05-12T20:00:00.000Z',
    items: [
      {
        category: 'MELHORIA',
        text: 'Alinhamento do repositório ao nome **Implantação Azoup** (scripts .bat, package npm, identificadores internos e comentários). Nome técnico IndexedDB e bucket de storage legados documentados onde não foram renomeados.',
      },
    ],
  },
  {
    versionDisplay: 'v1.0.0',
    tag: 'v1.0.0',
    releasedAt: '2026-05-12T18:00:00.000Z',
    items: [
      {
        category: 'NOVA_FUNCAO',
        text: 'Nova página de notas de atualização (`/atualizacoes`): histórico legível para qualquer usuário, com data/hora de publicação, etiqueta de versão e tipo de mudança (correção, melhoria, nova função, etc.).',
      },
      {
        category: 'MELHORIA',
        text: 'Identidade visual com o logotipo oficial Azoup (laranja) e nome unificado Implantação Azoup; remoção da marca anterior nas telas do aplicativo.',
      },
      {
        category: 'MELHORIA',
        text: 'Política de versionamento em semver (major.minor.patch), com changelog e notas categorizadas (BUG FIX, MELHORIA, NOVA FUNÇÃO, etc.).',
      },
      {
        category: 'DOCUMENTACAO',
        text: 'Changelog: aviso de que versões anteriores a v1.0.0 correspondem ao ciclo Alfa/Beta (nome de código legado preservado no histórico).',
      },
    ],
  },
]
