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
 * **Não** espelha automaticamente cada pedido no Cursor: ver `.cursor/rules/versioning-semver-autobump.mdc` e combine “fechar o dia” / “changelog” quando quiser documentar.
 */
export const RELEASE_NOTES: ReleaseNoteBundle[] = [
  {
    versionDisplay: 'v1.3.0',
    tag: 'v1.3.0',
    releasedAt: '2026-05-15T12:00:00-03:00',
    items: [
      {
        category: 'NOVA_FUNCAO',
        text: '**Agenda — calendário estilo Google:** vistas **Mês** (padrão), **Semana** e **Dia**; grade mensal; **faixas multi-dia** (férias, dia inteiro); painel com mini-mês, analistas (checkboxes) e filtro de projeto; ícone no topo para recolher o painel e ganhar largura na grade.',
      },
      {
        category: 'NOVA_FUNCAO',
        text: '**Agenda — layout:** abas Calendário / Em execução / Tarefas não agendadas; deep link; modal compartilhado; filtro de analistas em `localStorage`.',
      },
      {
        category: 'MELHORIA',
        text: '**Agenda — títulos:** **EMPRESA — ASSUNTO** na UI e no push Google; dedupe por `googleEventId`.',
      },
      {
        category: 'MELHORIA',
        text: '**Agenda — UX:** espaçamentos e alinhamento da barra, painel lateral e grade mensal.',
      },
      {
        category: 'BUG_FIX',
        text: '**Agenda:** setas Anterior/Próximo na vista mês; troca para vista Dia com dia ativo correto.',
      },
      {
        category: 'INFRA',
        text: '**Supabase:** Edge `calendar-*`, SQL 027–029; manutenção `H_dedupe_agenda_google_twins.sql` (remove eventos locais sem vínculo Google).',
      },
      {
        category: 'DOCUMENTACAO',
        text: '**ADR-001:** contratos da agenda, navegação e sincronização.',
      },
    ],
  },
  {
    versionDisplay: 'v1.2.0',
    tag: 'v1.2.0',
    releasedAt: '2026-05-14T12:00:00-03:00',
    items: [
      {
        category: 'NOVA_FUNCAO',
        text: '**Projetos — ciclo comercial:** campo **IMPLANTAÇÃO** vs **UPSELL** (`engagement_kind`), backfill por nome com `[UPSELL]`; migration `029_projects_engagement_kind.sql`.',
      },
      {
        category: 'NOVA_FUNCAO',
        text: '**Agenda:** rotas **Calendário**, **Em execução** e **Tarefas não agendadas** sob `/agenda` (redirect do índice e legado `em-andamento`); modal de evento no layout compartilhado.',
      },
      {
        category: 'NOVA_FUNCAO',
        text: '**Google Calendar (base):** colunas em eventos, outbox, Edge Functions de OAuth e sync; conta corporativa e sub-agenda por analista quando a flag e o SQL estiverem ativos.',
      },
      {
        category: 'MELHORIA',
        text: '**Projetos — grade:** cards com chips + situação estável, **Último**/**Atual** mais legíveis e alinhamento na página hub.',
      },
      {
        category: 'MELHORIA',
        text: '**Agenda — calendário:** grade e horários mais consistentes; eventos estreitos/sobrepostos mais legíveis.',
      },
      {
        category: 'MELHORIA',
        text: '**Login:** removido **Continuar com Google** na tela de entrada (mantém e-mail/senha).',
      },
      {
        category: 'BUG_FIX',
        text: '**Auth / router:** `AuthProvider` no layout raiz do data router — evita `useAuth fora de AuthProvider` em rotas protegidas e no menu.',
      },
      {
        category: 'INFRA',
        text: '**Supabase:** scripts SQL de Calendar (027+) e engagement em projetos; ordem em `supabase/sql/README_RUN_ORDER.txt`; Edge `calendar-*`.',
      },
    ],
  },
  {
    versionDisplay: 'v1.1.1',
    tag: 'v1.1.1',
    releasedAt: '2026-05-13T12:00:00-03:00',
    items: [
      {
        category: 'BUG_FIX',
        text: '**Supabase / projetos:** o hook Dexie `projects.updating` deixou de usar **`upsert`** com a linha inteira em `projects` (gerava **403** com RLS em vários perfis). Passa a **PATCH parcial** como no sync de grafo, sem reenviar `owner_id` / `created_*`.',
      },
      {
        category: 'MELHORIA',
        text: '**Detalhe do projeto — Fases & tarefas:** colunas de fase e cartões mais largos; cartão com **código** e **linha de status** separados do **título** (largura total); menos sobreposição entre chip de agenda, avatar e ações; botão **concluir** um pouco menor; chip de compromisso futuro mostra **só ícone + data/hora** (sem rótulo “Agendada”).',
      },
      {
        category: 'MELHORIA',
        text: '**Menu lateral:** refinamento de cores, opacidade e estados ativos; **recolhido:** notificação + alternância claro/escuro **empilhados** e controles menores para caber na barra estreita.',
      },
      {
        category: 'MELHORIA',
        text: '**Plano avulso — board:** fases no mesmo **layout horizontal** do catálogo (colunas com rolagem), em vez da coluna única larga anterior.',
      },
    ],
  },
  {
    versionDisplay: 'v1.1.1',
    tag: 'v1.1.1',
    releasedAt: '2026-05-12T16:00:00-03:00',
    items: [
      {
        category: 'BUG_FIX',
        text: '**Formulários** (`/formularios`): correção do crash ao carregar a lista de projetos (Dexie não indexa `projectName`); ordenação por nome feita após `toArray()`.',
      },
      {
        category: 'MELHORIA',
        text: '**Projetos:** cards com situação **FINALIZADO** ganham borda verde de conclusão (classe `proj-card--done`).',
      },
      {
        category: 'MELHORIA',
        text: '**Notificações** no menu lateral (ícone de sino): painel de avisos; pendência de check-in **acima de 7 dias** considera só projetos **em andamento**; filtro padrão da página **Projetos** passa a ser **EM ANDAMENTO** (removível).',
      },
      {
        category: 'MELHORIA',
        text: '**Projetos — barra de filtros:** destaque visual do que está selecionado (opacidade, borda e sombra nos chips de situação, plano e tipo de cliente; analistas).',
      },
      {
        category: 'MELHORIA',
        text: '**Notas de atualização** (`/atualizacoes`): releases **agrupadas por dia** no calendário de Brasília; no mesmo dia com várias versões, o cabeçalho do dia mostra a data e cada release exibe o **horário** (HH:mm). Texto explicando que as notas vêm de `releaseNotes.ts` / `CHANGELOG.md` e **não** são geradas só ao compilar.',
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
