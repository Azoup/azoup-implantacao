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
  /** Tag Git ou release (ex.: v1.1.0). */
  tag: string
  /**
   * Dia da publicação no calendário de Brasília. Use ISO com meio-dia em `-03:00` quando só houver a data
   * (ex.: `2026-05-12T12:00:00-03:00`) para ordenação estável. A UI mostra só **dd/MM/yyyy**.
   */
  releasedAt: string
  items: ReleaseNoteItem[]
}

/**
 * Uma entrada por **dia de entrega** (ou por evento que você versionar explicitamente ao subir no Git).
 * Várias mudanças do mesmo dia ficam como itens desta lista, sem micro‑versão por prompt.
 */
export const RELEASE_NOTES: ReleaseNoteBundle[] = [
  {
    versionDisplay: 'v1.1.1',
    tag: 'v1.1.1',
    releasedAt: '2026-05-12T16:00:00-03:00',
    items: [
      {
        category: 'BUG_FIX',
        text: '**Formulários** (`/formularios`): correção do crash ao carregar a lista de projetos (Dexie não indexa `projectName`); ordenação por nome feita após `toArray()`.',
      },
    ],
  },
  {
    versionDisplay: 'v1.1.0',
    tag: 'v1.1.0',
    releasedAt: '2026-05-12T12:00:00-03:00',
    items: [
      {
        category: 'NOVA_FUNCAO',
        text: 'Página **Notas de atualização** (`/atualizacoes`): histórico por versão, etiqueta de release, selos por tipo de mudança e **filtros** (busca, etiqueta, intervalo de datas no calendário de Brasília, tipos de mudança) com contagem de resultados.',
      },
      {
        category: 'NOVA_FUNCAO',
        text: 'Página **Formulários** (`/formularios`): montar e editar o formulário de boas-vindas por projeto, ver **respostas** (submissões no Supabase) e abrir o portal como cliente; o schema salvo é o mesmo usado em **Portal → Boas-vindas**.',
      },
      {
        category: 'MELHORIA',
        text: 'Identidade **Implantação Azoup** com logotipo Azoup (laranja); menu e título **Notas de atualização**; remoção da marca anterior nas telas.',
      },
      {
        category: 'MELHORIA',
        text: 'Repositório e artefatos alinhados ao nome **Implantação Azoup** (`package.json`, scripts `.bat`, chaves `implantacao_azoup_*`, canais sync). Legado IndexedDB / bucket Supabase com id antigo documentado onde não foi renomeado.',
      },
      {
        category: 'MELHORIA',
        text: 'Política **semver** (`major.minor.patch`), `CHANGELOG.md` e espelho em `releaseNotes.ts` com categorias (BUG FIX, MELHORIA, NOVA FUNÇÃO, etc.).',
      },
      {
        category: 'MELHORIA',
        text: '**Notas de atualização:** chips do filtro **Tipos de mudança** em **versalete** (maiúsculas via CSS), alinhados às tags coloridas de cada item da lista.',
      },
      {
        category: 'BUG_FIX',
        text: 'Datas das notas calculadas no calendário de **Brasília** (`America/Sao_Paulo`), sem depender do fuso do navegador.',
      },
      {
        category: 'DOCUMENTACAO',
        text: 'Changelog: aviso de que versões **anteriores a v1.0.0** correspondem ao ciclo Alfa/Beta (**VynTask**); histórico preservado.',
      },
    ],
  },
]
