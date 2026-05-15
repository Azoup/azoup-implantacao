# Changelog

> **Legado (Alfa/Beta):** entradas de versão **anteriores a v1.0.0** descrevem o ciclo de desenvolvimento sob o nome de código **VynTask** (fases Alfa/Beta). O texto abaixo foi **preservado** como histórico. A linha de produto atual é **Implantação Azoup**, com **semver** (`major.minor.patch`) e notas categorizadas (BUG FIX, MELHORIA, NOVA FUNÇÃO, etc.).

## v1.3.0 (2026-05-15)

### NOVA FUNÇÃO

- **Agenda — calendário estilo Google:** vista **Mês** (padrão), **Semana** e **Dia**; grade mensal com chips por analista; faixas contínuas para eventos **multi-dia / dia inteiro** (ex.: férias); painel lateral com mini-mês, filtros por **analista** (checkboxes) e projeto; botão no topo para **recolher/expandir** o painel (calendário em largura total quando fechado).
- **Agenda — layout:** `AgendaLayout` com abas Calendário / Em execução / Tarefas não agendadas; deep link e modal compartilhado; filtro de analistas persistido em `localStorage`.

### MELHORIA

- **Agenda — títulos:** compromissos exibidos e enviados ao Google como **EMPRESA — ASSUNTO** (sem prefixo `INTERNO` indevido); dedupe por `googleEventId` na grade.
- **Agenda — UX:** espaçamentos, alinhamento da barra superior e ritmo visual do painel + grade mensal.

### BUG FIX

- **Agenda:** navegação **Anterior/Próximo** mantém `monthCursor` na vista mês; **Dia** usa `activeDay` correto ao trocar de vista.

### INFRA

- **Supabase:** Edge Functions `calendar-*` (OAuth, push/pull, listagem); SQL `027`–`029`; script de manutenção `H_dedupe_agenda_google_twins.sql` para limpar eventos fantasma sem `google_event_id`.
- **Documentação:** ADR-001 (contratos da agenda, navegação e sync).

## v1.2.0 (2026-05-14)

### NOVA FUNÇÃO

- **Projetos — ciclo comercial:** campo `engagement_kind` (`operacao_padrao` / `upsell`) com rótulos **IMPLANTAÇÃO** e **UPSELL** na UI; backfill por nome com `[UPSELL]`; migration `029_projects_engagement_kind.sql`.
- **Agenda:** três rotas sob `/agenda` — **Calendário**, **Em execução** e **Tarefas não agendadas** (redirect de `/agenda` e legado `em-andamento`); modal de evento compartilhado no layout.
- **Google Calendar (base):** colunas em `events`, outbox, OAuth Edge (`calendar-oauth-*`), conta corporativa e mapeamento de sub-agenda por analista quando a flag e o SQL estiverem ativos; funções auxiliares de listagem/status.

### MELHORIA

- **Projetos — grade:** cards com zona de chips + situação estável, Último/Atual mais legíveis, ritmo e alinhamento na página hub.
- **Agenda — calendário:** tokens de grade, faixa de horários alinhada, eventos estreitos/sobrepostos mais legíveis (ícones e texto).
- **Login:** removido fluxo “Continuar com Google” na tela de entrada (mantém e-mail/senha).

### BUG FIX

- **Auth / router:** `AuthProvider` e `UnsavedChangesProvider` no layout raiz do data router, evitando `useAuth fora de AuthProvider` em `RequireAuth` e `Sidebar`.

### INFRA

- **Supabase:** scripts SQL de integração Calendar (027+) e engagement em projetos; ordem documentada em `supabase/sql/README_RUN_ORDER.txt`; Edge Functions `calendar-*` para OAuth, listagem e fila de sync.

## v1.1.1 (2026-05-12 — também 2026-05-13)

### BUG FIX

- **2026-05-13 — Supabase / projetos:** hook Dexie `projects.updating` passou a sincronizar com **PATCH parcial** em vez de **`upsert`** da linha inteira (alinhado ao sync de grafo), reduzindo **403** por RLS quando o perfil só pode atualizar parte dos campos.
- **2026-05-12 — Formulários** (`/formularios`): lista de projetos ordenada em memória em vez de `orderBy('projectName')` no Dexie (o índice `projectName` não existe na store `projects`), eliminando o erro ao abrir a página.

### MELHORIA

- **2026-05-13 — Detalhe do projeto (fases & tarefas):** colunas de fase e cartões mais largos; cartão com código, linha de status/chips e título em faixas (menos sobreposição com rail e ações); chip de próximo compromisso mostra **só data/hora**; botão concluir e espaçamentos refinados.
- **2026-05-13 — Menu lateral:** refinamento visual (cores, ativos, ferramentas); **recolhido:** notificação + tema **empilhados** e controles menores na faixa estreita.
- **2026-05-13 — Plano avulso:** board de fases no **layout horizontal** do catálogo (colunas roláveis).
- **2026-05-12 — Projetos:** borda verde nos cards **FINALIZADO** (`proj-card--done`).
- **2026-05-12 — Menu lateral:** sino de **notificações** com pendência de check-in (>7 dias) só para projetos **em andamento**; página **Projetos** com filtro padrão **EM ANDAMENTO**.
- **2026-05-12 — Projetos — filtros:** contraste maior entre chip selecionado e demais (opacidade, borda, sombra; analistas e grupos com `:has()`).
- **2026-05-12 — Notas de atualização:** lista **agrupada por dia** (Brasília); várias releases no mesmo dia mostram **horário** por versão; texto deixa claro que notas vêm de `releaseNotes.ts` / changelog, não do build automático.

## v1.1.0 (2026-05-12)

Entrega **diária** (várias mudanças agrupadas numa única versão). Política: versionar ao fechar o dia ou quando você pedir release para subir no Git — não a cada prompt.

### NOVA FUNÇÃO

- Página **Notas de atualização** (`/atualizacoes`): histórico, etiqueta de release, categorias e filtros (busca, etiqueta, intervalo de datas em Brasília, tipo de mudança).
- Página **Formulários** (`/formularios`): editor do formulário de boas-vindas por projeto (perguntas + link Google opcional), listagem de respostas sincronizadas do Supabase e pré-visualização do portal; o que salvar reflete em **Portal → Boas-vindas** do cliente.

### MELHORIA

- Identidade **Implantação Azoup** (logo Azoup, menu e título das notas); alinhamento de repositório (`package.json`, `.bat`, chaves `implantacao_azoup_*`, sync). Supabase: bucket/funções com id legado documentados onde não renomeados.
- **Semver** e `CHANGELOG.md` espelhado em `src/constants/releaseNotes.ts`.
- **Notas de atualização:** chips do filtro **Tipos de mudança** em versalete (maiúsculas via CSS), alinhados às tags da lista de cada release.

### BUG FIX

- Datas das notas no calendário de **Brasília** (`America/Sao_Paulo`), independentemente do fuso do navegador.

### DOCUMENTAÇÃO

- Changelog: versões **anteriores a v1.0.0** = ciclo Alfa/Beta (**VynTask**); histórico preservado.

## v3.12.1 (2026-05-11)

- **Sync Kanban / Supabase:** `syncProjectKanbanFromPlanState` gravava `kanbanColumn` no Dexie **fora** do mute do bridge, disparando o hook `updating` → **upsert POST** em `projects` (403 quando a RLS não permite insert em linhas alheias). O update local passou a ocorrer **dentro** de `withDexieSupabaseSyncMuted` junto com `updateProjectPartialInSupabase` (PATCH), eliminando a rajada de POST e o erro na reconciliação da Visão geral.

## v3.12.0 (2026-05-11)

- **Visão geral (kanban):** colunas **Congelados** e **Inadimplentes**; projetos com situação `congelado` ou `inadimplente` passam a aparecer nessas colunas (derivação alinhada ao cancelado → Cancelados). Movimento manual para essas colunas atualiza situação + `kanbanColumn`; reconciliação automática grava `congelados` / `inadimplentes` no Dexie/Supabase. **SQL:** `026_projects_kanban_congelados_inadimplentes.sql` amplia o `CHECK` de `projects.kanban_column` no Postgres.
- **Congelar / descongelar:** após descongelar pela grade ou detalhe, roda `syncProjectKanbanFromPlanState` para recolocar o cartão na fase correta do plano (evita ficar preso na coluna Congelados após `kanban_column` sincronizado).

## v3.11.9 (2026-05-11)

- **Projetos — alerta operacional:** no ícone `(!)` do card, **popover em atalho** (`createPortal`) com o mesmo fluxo do modal (ver texto, editar, remover, mín. 12 caracteres), **sem abrir** “Editar projeto”; opção **Abrir edição completa…** leva ao modal. Persistência via `applyManualAttentionOnlyPatch` (Dexie + `updateProjectPartialInSupabase` + auditoria).

## v3.11.8 (2026-05-11)

- **Projetos — sincronização pendente:** no **3.º toque** no ícone de reenvio (`RotateCcw`), abre confirmação para **limpar a fila** local (sem novo POST) ou **continuar tentando**; tooltip indica quantos toques faltam. Nova API `discardPendingProjectGraphSync` no bridge. O **403 / RLS** continua exigindo ajuste nas policies ou vínculo do usuário no Supabase — limpar a fila só interrompe as tentativas automáticas na sessão.

## v3.11.7 (2026-05-11)

- **Projetos — alerta manual:** ícone do filtro e ícone ativo no card passam de **círculo** para **quadrado com cantos arredondados** (mesmo raio dos outros controles: `var(--vt-toolbar-control-radius)` na barra, `9px` nos ícones do card), mantendo borda **pontilhada** vermelha.

## v3.11.6 (2026-05-11)

- **Alerta manual — visual:** filtro `(!)` na barra de Projetos com **círculo** e borda **pontilhada** vermelha; cards com alerta (grade Projetos e kanban Visão geral) com **borda pontilhada** em vermelho em vez do anel sólido por `box-shadow`; ícone de alerta no **rodapé do card** ativo com contorno **vermelho pontilhado** e formato circular (antes amarelo sólido).

## v3.11.5 (2026-05-11)

- **Cards de projeto:** badge de **situação** com `text-transform: uppercase` e `letter-spacing` alinhado aos chips de filtro (Projetos, Visão geral, detalhe do projeto).

## v3.11.4 (2026-05-11)

- **Projetos — barra de filtros:** layout em **duas faixas** (ordenar/analistas | plano/tipo de cliente; depois situação + alerta manual | busca + pendências), **separador** fino entre analistas e chips de plano, **grid** na segunda linha para alinhar busca à direita; **tipografia** dos chips unificada (`--vt-toolbar-chip-fs` / letter-spacing); ícone de **alerta manual** com borda **sólida** e estados hover/selecionado mais limpos; ajustes de **padding**, **raio** e breakpoint (~960px / ~640px).

## v3.11.3 (2026-05-11)

- **Modal Editar projeto:** alerta operacional manual virou **ícone** (`CircleAlert`) — **vermelho** quando há texto (similar ao destaque ciano do congelar na grade). **Hover** ou **clique** abre **popover** com o texto, **Editar texto**, **Remover** (com confirmação) ou fluxo para escrever novo alerta; **Aplicar** mantém a regra de mínimo 12 caracteres. Popover em **`position: fixed`** para não ser cortado pelo scroll do modal.

## v3.11.2 (2026-05-11)

- **Projetos — barra de filtros:** chips de situação em **MAIÚSCULAS** alinhados aos planos; toolbar mais **compacta** (altura 32px, gaps menores); **“Com alerta manual”** vira só **ícone** (`CircleAlert`) com `aria-label`; limpar filtros vira **botão X**; **Pendências** vira ícone + número com tooltip/aria descrevendo o recorte; **busca** e **ordenar (A Z)** com fonte/altura alinhadas à toolbar.

## v3.11.1 (2026-05-11)

- **UI — tipo de cliente GENÉRICO:** paleta **âmbar/amarelo** (em contraste com o roxo da CONFECÇÃO) nos chips da página Projetos, nos badges dos cards e no tema escuro.

## v3.11.0 (2026-05-11)

- **Projetos — data de cancelamento:** campo `cancelledAt` (Dexie v25 + Supabase [`025_projects_cancelled_at.sql`](supabase/sql/025_projects_cancelled_at.sql)); ao marcar **Cancelado** no modal de edição ou ao mover para **Cancelados** na Visão geral, **data editável** com padrão **hoje**; no detalhe do projeto, **Cancelar** abre o mesmo tipo de fluxo (data + motivo mín. 8 caracteres) e grava motivo nas observações internas.
- **Grade Projetos / Kanban:** linha **Data de cancelamento** nos cards cancelados; cartões cancelados com visual mais **“negativo”** (saturação/brilho, borda e faixa de destaque).
- **Detalhe do projeto:** KPI **Data de cancelamento** quando a situação é cancelada.

## v3.10.2 (2026-05-11)

- **Projetos:** o subtítulo do cabeçalho mostra **projetos filtrados vs total** quando há busca ou chip de filtro ativo (ex.: `10 projetos filtrados de 66 cadastrados`); sem filtros, mantém o texto único de cadastros.

## v3.10.1 (2026-05-11)

- **Sync Supabase:** erros 400 (schema/CHECK) passam a orientar migrations (`023` freeze_timeline, `019`/`022`/`024` status); log do console usa texto legível em vez de `[object Object]`.

## v3.10.0 (2026-05-11)

- **Projetos — situação Inadimplente:** novo valor `inadimplente` no status (Supabase [`024_projects_status_inadimplente.sql`](supabase/sql/024_projects_status_inadimplente.sql)); entra nos fluxos operacionais como **Em andamento** para KPIs/listas “em andamento”, com **borda quente** (laranja/vermelho) nos cards e badge dedicada.
- **Nomenclatura:** `ativo` exibido como **Em andamento**; legado `inativo` normalizado para **`cancelado`** (Dexie + ponte Supabase); sem sinônimo “inativo” na UI.
- **Cancelado:** cards com **tom apagado** (saturação/brilho) e **borda âmbar**; badge de cancelado passa a **âmbar** (distinto do vermelho de inadimplência).
- **Congelado:** mantém **borda/badge ciano** (“gelo”).
- **Testes:** cobertura de `normalizeRemoteProjectStatus` e KPI “projetos em andamento” incluindo inadimplente.

## v3.9.0 (2026-05-11)

- **Projetos — congelar pela grade:** ícone de **floco de neve** no card (Projetos) e atalho **Congelar / Descongelar** no detalhe; projeto **congelado** destaca o ícone em **ciano**; **descongelar** pede confirmação + justificativa (mín. 8 caracteres); **congelar** pede motivo. Eventos ficam em **`freeze_timeline`** no projeto (Postgres `freeze_timeline` jsonb + Dexie v23) e o detalhe exibe o **histórico**; também grava no **log de auditoria**.

## v3.8.4 (2026-05-11)

- **Projetos — situação:** ao salvar edição com **Ativo** ou **Congelado**, o app não força mais **Cancelado** só porque o kanban ainda estava em `cancelados` (`normalizeProjectPlacement` dava prioridade à coluna). Agora dá para **reativar** ou **congelar** de novo após um cancelamento acidental.
- **Projetos — cancelamento:** ao escolher **Cancelado** no modal de edição, abre o fluxo **com justificativa** (mín. 8 caracteres, como no kanban) e grava uma linha nas **observações internas**; cancelar o diálogo mantém a situação anterior.

## v3.8.3 (2026-05-11)

- **Projetos — edição:** no modal, projeto **plano avulso** (`custom`) mostrava o primeiro plano do catálogo (ex.: Basic) porque a opção “Plano avulso” só existia no fluxo de criação; em edição a opção correta passa a aparecer e `planType` legado `avulso` é normalizado para `custom`.

## v3.8.2 (2026-05-11)

- **UI — tipo de cliente:** cores mais fortes e distintas para as tags **CONFECÇÃO** (violeta) e **GENÉRICO** (azul céu) nos cards, no kanban e no detalhe; filtros na página Projetos ganham o mesmo par de cores e destaque ao selecionar.

## v3.8.1 (2026-05-11)

- **Projetos — alerta manual:** ícone **atenção** (`CircleAlert`) ao lado do check-in no card, no mesmo estilo de botão; com alerta ativo o botão ganha destaque **warning**; clique abre a edição do projeto com rolagem e foco no campo **Alerta operacional**.

## v3.8.0 (2026-05-11)

- **Projetos — frescor removido:** “Frescor”/classificações SLA (Neutro/Em dia/Atenção/Atrasado/Crítico) saem da UI; passa a exibir apenas **status de check-in** via **`Atualizado em:`**.
- **Pendências de check-in:** lista agora apenas projetos **sem check-in há mais de 7 dias**.
- **AI assistente:** alerta de “sem atualização” passa a usar staleness de check-in (em vez de frescor SLA).
- **Código:** adicionada `src/services/projectCheckin.ts` para calcular staleness de check-in.

## v3.7.0 (2026-05-11)

- **Projetos — status:** unifica `pausado` e `congelado` em **apenas `congelado`** (UI: remove seleção/filtros de Pausado; Dexie upgrade converte dados antigos; Supabase migration converte registros e atualiza `CHECK`).
- **Supabase:** [`022_projects_pausado_merged_to_congelado.sql`](supabase/sql/022_projects_pausado_merged_to_congelado.sql).

## v3.6.1 (2026-05-11)

- **CNPJ (produção / Vercel):** consulta “Buscar dados” passa sempre por `/api/brasilapi` e `/api/receitaws` (mesma origem); [`vercel.json`](vercel.json) ganha rewrites para esses prefixos, eliminando falhas por CORS e o fallback via `allorigins` que também era bloqueado no browser.

## v3.6.0 (2026-05-11)

- **Projetos — tipo do cliente:** campo `client_type` (`confeccao` | `generico`) em Postgres, Dexie e sync; seleção no cadastro/edição; chips na grade Projetos, no kanban da Visão geral e no cabeçalho do detalhe; filtros multi-chip **CONFECÇÃO** / **GENÉRICO**; busca por nome ou por texto do tipo (inclui sinônimos).
- **Supabase:** migration [`021_projects_client_type.sql`](supabase/sql/021_projects_client_type.sql).

## v3.5.1 (2026-05-11)

- **Supabase / sync:** `refreshSupabaseDexieCache` só roda com `auth.getSession()` válido, coalesce chamadas concorrentes e o bootstrap Dexie (`initializeSupabaseDexieBridge`) deixa de disparar refresh completo duplicado antes do `AuthContext` validar o perfil — reduz rajadas de GET e 403 em `/rest/v1/labels` por requisição sem JWT estável.
- **Supabase (SQL):** [`020_labels_authenticated_grants.sql`](supabase/sql/020_labels_authenticated_grants.sql) reforça `GRANT` em `public.labels` para `authenticated` em projetos onde isso faltou.

## v3.5.0 (2026-05-11)

- **Projetos — status Congelado:** novo valor `congelado` em `ProjectStatus` (Postgres + Dexie + sync), badge e borda “gelo” nos cards da grade Projetos e no kanban da Visão geral; filtro por situação na barra de Projetos.
- **Projetos — alerta operacional manual:** campos `manual_attention_note` / `_at` / `_by` (texto não vazio = alerta ativo); edição no modal de projeto com validação mínima de 12 caracteres, limpar com confirmação; pill **Alerta** + destaque vermelho no card (distinto do frescor SLA “Atenção”); filtro **Com alerta manual**; detalhe do projeto mostra situação e alerta.
- **Supabase:** migration [`019_projects_congelado_manual_attention.sql`](supabase/sql/019_projects_congelado_manual_attention.sql) (CHECK de `status` + colunas de alerta).

## v3.4.6 (2026-05-11)

- **Check-in manual:** PATCH para `projects` passa a incluir `last_manual_checkin_at` / `last_manual_checkin_by` sempre que o patch traz esses campos (antes, sem `VITE_SYNC_PROJECT_MANUAL_CHECKIN=1`, o corpo ia vazio, a nuvem não atualizava e o próximo sync apagava o valor no IndexedDB após F5).
- **Dev:** removidos `fetch` de debug para `127.0.0.1:7771` em `UiFeedbackContext` e `SettingsPage` (evita `ERR_CONNECTION_REFUSED` no console).

## v3.4.5 (2026-05-11)

- **Navegador:** título da aba e texto de carregamento inicial passam a **Implantação - Azoup** (alinha `index.html`, `APP_BROWSER_DOCUMENT_TITLE` e `main.tsx`).

## v3.4.4 (2026-05-11)

- **CI:** ESLint em `PlanModelsPage` — remoção de `toastError` não usado e dependência `toastMutationSuccess` em `onPhaseSave` (`react-hooks/exhaustive-deps`).

## v3.4.3 (2026-05-11)

- **Projetos:** no card da grade, linha discreta **Início** + data (ícone calendário) logo abaixo do nome; usa `start_date` do projeto e, se ausente, a data de cadastro (`created_at`) como fallback.

## v3.4.2 (2026-05-11)

- **Logs de auditoria:** alterações pelo modal **Editar projeto e cliente** (nome, datas, endereço, analista, situação etc.) passam a registrar entrada `alteracao` em **projeto** com resumo campo a campo quando há diferença real em relação ao estado anterior.

## v3.4.1 (2026-05-11)

- **Edição de projeto (nuvem):** ao salvar com Supabase ativo, a UI aguarda a confirmação da gravação no PostgREST antes de fechar o modal e mostrar sucesso; se a nuvem falhar (RLS, sessão, rede), o erro aparece no formulário e o toast de erro substitui o falso positivo de antes (o salvamento local em Dexie já tinha ocorrido em background).

## v3.4.0 (2026-05-11)

- **Feedback global (sucesso/erro):** mensagens contextuais padronizadas para operacoes de criar/alterar/salvar/excluir/ativar/inativar/sincronizar, com camada central no `UiFeedbackContext` e aplicacao nas telas de lacuna (tarefas, analistas, modelos de plano e cadastro de projeto).
- **Protecao de edicao:** confirmacao ao fechar com alteracoes nao gravadas (cancelar, clique fora e ESC) com opcoes de continuar editando, descartar ou gravar e sair em modais criticos (`Agenda`, `Projeto`, `Analistas`, `PlanPhaseModal`, `PlanTaskModal` e `RegisterHoursModal`).

## v3.3.12 (2026-05-11)

- **Logs de auditoria:** coluna **Projeto** na grade, resolvida a partir da entidade (tarefa, fase, timer, comentário, exclusão de projeto etc.) e fallback para texto antigo quando a tarefa já foi removida mas o log traz o nome do projeto em `details`.

## v3.3.11 (2026-05-11)

- **Navegador:** título da aba **Implantação Azoup** (em vez de marca + versão) e favicon igual ao logo bolinha laranja da Azoup (`Logo_Bolinha_Laranja_AZOUP.ico`, mesmo do menu lateral).

## v3.3.10 (2026-05-10)

- **Dashboard / Resumo — KPIs**: cartões mais compactos na vertical (padding, gaps entre grupos/cards, número e rótulo menores, ícone 36px); rótulo com no máximo **2 linhas** para alinhar altura entre Projetos / Tarefas / Viradas. Sem mudança de cores, filtros ou dados.

## v3.3.9 (2026-05-10)

- **Dashboard / Projetos em andamento**: recolhido continua mostrando só **1** projeto; o botão volta a ser **Mostrar tudo** e expande a **lista completa** de uma vez (com scroll na área da lista), em vez de revelar de 2 em 2.

## v3.3.8 (2026-05-10)

- **Detalhe do projeto / cartões de tarefa (Fases & tarefas)**: visual mais limpo — removidos o badge “INFORMATIVA” duplicado e a linha de texto repetindo o mesmo; **uma única** `TaskScheduleChip` com tooltip explicando horas de contrato. Chips de agenda no cartão ficaram **menores** (padding, raio, ícone); **Sem agenda** com tom neutro (menos “bloco”); **Informativa** com estilo tracejado discreto.

## v3.3.7 (2026-05-10)

- **Dashboard / Projetos em andamento**: estado inicial mostra só **1** cartão; **Mostrar mais** acrescenta **2** projetos por clique (em vez de alternar para a lista inteira). **Mostrar menos** volta ao primeiro cartão.

## v3.3.6 (2026-05-10)

- **Dashboard / KPIs de viradas (Hoje, Semana, Mês)**: o escopo deixou de cruzar com o período da consulta (`metrics.scopedProjects` por `startDate` do projeto). Agora segue o mesmo critério do chip **Total** — só filtros de facet; o recorte temporal é só a janela KPI — para viradas e tarefas aparecerem quando o evento cai no período, mesmo com projeto iniciado fora do preset da consulta.
- **Dashboard / filtro Mês**: barra do seletor de mês com trilho visual (ícone de calendário, bloco agrupado, hierarquia mais clara).

## v3.3.5 (2026-05-10)

- **Dashboard / Projetos em andamento (painel Resumo)**: a lista deixa de usar `metrics.scopedProjects` (recorte por **período da consulta** + facet), que esvaziava ou distorcia cartões ao mudar preset/KPI; passa a listar **todos** os projetos ativos em andamento no workspace. A aba **Consulta** mantém a lista filtrada pelo recorte. Estado inicial **recolhido** (5 itens + **Mostrar mais**), ordenação restaurada; botão renomeado para **Mostrar mais (N)**.

## v3.3.4 (2026-05-10)

- **Dashboard / Resumo**: removido o KPI **Tarefas a agendar**; permanecem os KPIs de tarefas: novas no período, agendadas, concluídas e agendas canceladas.
- **Dashboard / KPI “Projetos em andamento”**: passa a refletir projetos **operacionais em curso** (`status` ativo, coluna derivada do plano diferente de finalizados/cancelados — alinhado aos cartões “Em execução”), **excluindo pausados** e projetos cuja coluna kanban é finalizados mesmo com status ainda “ativo”. O escopo usa só filtros de facet (analista, status, plano, cliente) para esse KPI — **sem** recorte pelo período da consulta nem pela janela Hoje/semana/mês, para não zerar contagens de projetos antigos ainda em execução.

## v3.3.3 (2026-05-10)

- **Detalhe do projeto / Fases & tarefas**: linha de tarefa com grid (`minmax(0,1fr)` + trilho fixo), chips de agenda com texto que pode quebrar para não invadir avatar/ações; trilho com mais espaço entre avatar e grupo de ícones; áreas de toque dos controles ligeiramente maiores (`--pd-task-control`).

## v3.3.2 (2026-05-10)

- **Agenda**: hierarquia visual e legibilidade — barra de período em superfície com borda/sombra leve; cabeçalhos de dia da grade com ênfase em “hoje”; cartões de evento com raio/padding/sombra alinhados ao tema escuro; ícones de Meet/Google com área de toque maior em touch; estados vazios estruturados (execução + tarefas não agendadas); painel “Execução de hoje” e lateral com tipografia de display consistente.

## v3.3.1 (2026-05-10)

- **Dashboard / KPI “Total”**: contagens e drilldown passam a usar o escopo só por filtros de facet (analista, status, plano, cliente), **sem** recorte do período da consulta (`periodPreset`/datas custom). Corrige números que pareciam limitados ao mês mesmo com o chip Total.

## v3.3.1 (2026-05-10)

- **Kanban / detalhe do projeto**: cadeias legadas `rescheduledToTaskId` passam a mostrar **um único cartão por tarefa lógica** (folha da cadeia); predecessores somem do quadro por fase. Horas reais e eventos/comentários das cópias são **agregados** na folha; chip de agenda aceita eventos mesclados e destaca quando há **agenda futura após cancelamento** anterior. Link rápido para **Migração de cadeias** em Configurações (admin). Ver `src/lib/rescheduleChainKanban.ts`.
- **Tarefas** (`TarefasViews`): mesma regra de ocultação nas visões Prazo e Fase para evitar duplicatas.
- **Sidebar**: ícones e rótulos PT-BR mais intuitivos (sem mudar escopos).
- **Workspace**: raio de cartão/colunas do board alinhado a tokens (`--pd-card-radius`), link admin no resumo operacional.
- **Portal**: estado vazio da home do portal com hierarquia mais clara.
- **Documentação**: `docs/product-vision-roadmap.md` — visão “centro de implantações” por fases.

## v3.2.0 (2026-05-10)

**Reformulação Tarefa : N Agendas** — refundação do modelo de tarefas no VYNTASK, alinhando o dashboard, a agenda e o detalhe de projeto a um único conceito: cada tarefa tem 1 entidade, com 0..N agendas (eventos) vinculadas. Cancelamento de agenda nunca mais cancela a tarefa.

- **Dashboard / KPIs** (`src/lib/metrics/dashboardKpiBreakdown.ts`):
  - "Tarefas agendadas" agora exige `≥1 DbEvent agendado` no recorte temporal. Corrige o bug histórico que contava tarefas com status `pendente/em_andamento` mesmo sem agenda real.
  - "Tarefas concluídas" passa a derivar de `≥1 DbEvent realizado` no recorte (ou de conclusão manual auditada).
  - "Agendas canceladas" (renomeado de "Tarefas canceladas") agora conta EVENTOS cancelados no recorte — uma tarefa pode contar várias vezes.
  - Novo KPI **"Tarefas a agendar"**: backlog de tarefas no escopo sem nenhum evento, excluindo informativas e canceladas manualmente.
- **FilterBar** (`src/components/dashboard/DashboardFilterBar.tsx`): chips `Hoje · Essa semana · Mês · Total` com seletor mês/ano embutido (aparece apenas quando "Mês" está ativo), incluindo setas `‹ ›` para navegar entre meses, com atalhos para teclado e acessibilidade.
- **Domínio**:
  - Novos campos em `DbTask`: `completedManualOverride`, `completedManualOverrideReason`, `cancelledManually`.
  - Campos legados (`rescheduledFromTaskId`, `rescheduledToTaskId`, `cancellationReason`, `cancelledAt`) marcados `@deprecated`; serão dropados em 4.0.0.
  - Novo `recomputeTaskStatus(taskId)` — ponto único de derivação a partir dos eventos.
  - Novas funções em `src/services/events.ts`: `cancelEventNoHours`, `cancelEventWithHours`, `markEventRealized`, `rescheduleEvent`.
  - Novas funções em `src/services/tasks.ts`: `setTaskCompletedManualOverride`, `clearTaskCompletedManualOverride`, `removeTaskFromScope`, `deriveTaskStatusFromEvents`.
- **Atendimento** (`src/services/attendanceRegistration.ts`): removido `createRescheduledCopy`. No fluxo "não compareceu", a tarefa permanece aberta — um novo `DbEvent` agendado é criado para a mesma tarefa (via `attachNewScheduledEvent`/`rescheduleEvent`). Cancelamentos consomem horas pelo `TimeLog` sem mexer no status da tarefa.
- **Override manual de conclusão**: novo `ManualCompleteTaskModal` exigindo justificativa obrigatória quando o usuário tenta concluir uma tarefa sem nenhum evento `realizado`. Persiste o motivo em `completedManualOverrideReason` e gera entrada em `auditLogs`.
- **TaskScheduleChip** (`src/components/TaskScheduleChip.tsx`): chip único e reaproveitável com 6 estados visuais (Sem agenda · Agendada · Em sessão · Concluída · Concluída (manual) · Removida do escopo · Informativa), aplicado em `ProjectDetailPage`.
- **Migração admin** (`src/services/rescheduleChainMigration.ts` + `RescheduleChainMigrationPanel`): painel em `Configurações > Console` para consolidar cadeias de reagendamento legadas em uma única tarefa-raiz, mesclando eventos/horas/comentários/sessões. Três estágios obrigatórios: Diagnosticar (read-only) → Backup JSON → Executar. Idempotente via marker em `auditLogs`. Quarentena automática para cadeias com ciclo ou bifurcação.
- **Schema Dexie**: nova versão `v19` adicionando `completedManualOverride`/`cancelledManually` em `tasks` e índice `status` em `events`.
- **Testes**: matriz de `dashboardKpiBreakdown` reescrita com cenários explícitos do novo modelo (9 testes cobrindo cancelamento sem cancelar tarefa, múltiplos cancelamentos, override manual e "a agendar"); todos os 20 testes da suíte passam.

## v3.1.11 (2026-05-08)

- Build: teste `manualsSearch` atualizado com `category` em `ManualDef` (corrige `tsc` na Vercel).

## v3.1.10 (2026-05-08)

- Manuais: novas ações **Baixar PDF** e **Imprimir** no cabeçalho do leitor (toolbar em pílula com botão primário accent). O PDF é gerado pelo diálogo nativo do navegador ("Salvar como PDF"), funcionando offline e sem dependências extras.
- Manuais (PDF): cabeçalho institucional ("letterhead") só visível em impressão — logo Azoup, marca **VynTask by Azoup vX.Y.Z**, trilha da categoria, título do manual, carimbo de uso (interno/cliente) e data de geração — e rodapé com nome do produto / título / `azoup.com.br`.
- Manuais (PDF): folha de estilo `@media print` completa — esconde sidebar, índice, tabs, busca; força A4 retrato com margens; remove sombras; garante quebras `page-break-inside: avoid` em figuras, fases e cards de motivação; mantém highlights coloridos com `print-color-adjust: exact`.
- Pré-carregamento: clique em "Baixar PDF" força carregamento eager de todas as imagens lazy do manual antes de abrir o diálogo (timeout de segurança de 2,5s) para evitar PDF com figuras em branco; também ajusta `document.title` durante o print, fazendo o PDF default ficar com o nome do manual.

## v3.1.9 (2026-05-08)

- Manual **Google Drive (FTP-AZOUP)**: nova seção destacada **"Por que sua Conta Google precisa ser a @azoup"** explicando os dois motivos com prints de evidência — exigência do Google ao tentar compartilhar com e-mail sem Conta Google e rastreabilidade na coluna "Modificado por" do Drive Compartilhado.
- Estilos novos `.manual-section--rationale` e `.manual-rationale` (cards lado a lado com índice numerado), tornando o bloco motivacional reutilizável em outros manuais.
- Conteúdo: prints `compartilhar-exige-conta-google.png` e `auditoria-modificador-drive.png` adicionados em `public/manuals/drive-ftp/`; sumário do manual atualizado para incluir o atalho.

## v3.1.8 (2026-05-08)

- Manuais: novo manual interno **Google Drive (FTP-AZOUP) no Windows Explorer** — passo a passo para criar Conta Google `@azoup.com.br` (link `signupwithoutgmail`), instalar o **Drive para Desktop** e acessar o Drive Compartilhado direto pelo Explorer (`G:\Drives compartilhados\FTP-AZOUP`), com aviso para falar com o admin liberar o acesso.
- Manuais (UI): índice lateral agora agrupa os documentos em **categorias tipo pastinha** (`Internos > Configurações PC`, `Internos > Integrações`, `Operacional`, `Onboarding`), com cabeçalho de grupo, ícone de pasta e contagem; cabeçalho do leitor exibe a "trilha" da categoria.
- Catálogo: `ManualDef` ganhou `category: ManualCategoryId`; ordenação e rótulos centralizados em `MANUAL_CATEGORIES` / `MANUAL_CATEGORY_ORDER`.
- Conteúdo: prints estáticos do manual em `public/manuals/drive-ftp/`; estilos novos para link inline com ícone (`.manual-link`) e teclas (`<kbd>`).

## v3.1.7 (2026-05-07)

- Datas de projeto (`start_date`/`due_date`) corrigidas para não sofrer deslocamento de fuso (`-1 dia`) ao editar, exibir ou ordenar após sincronização.
- Frontend: novo parser centralizado para campos `date` (sem timezone) e ajuste dos pontos críticos (modal de projeto, dashboard, portal e regras de prazo).
- Persistência/sync: mantido contrato SQL com colunas `date` e envio em `YYYY-MM-DD`, garantindo fidelidade entre formulário, Dexie e Supabase.

## v3.1.6 (2026-05-07)

- Dashboard (Consulta): correção da busca por período para aplicar o intervalo também na listagem de projetos filtrados, inclusive em período personalizado (início/fim).
- Dashboard (Resumo): novo filtro visual de `Mês/Ano` no topo para recorte personalizado rápido, integrado aos KPIs e ao período de consulta.

## v3.1.5 (2026-05-06)

- Quadro **Fases & tarefas**: cada card mostra um resumo fixo **horas consumidas / horas previstas** (ícone + valores), inclusive em tarefas concluídas; tarefas informativas exibem texto explicativo; barra fina de progresso só quando aplicável.

## v3.1.4 (2026-05-06)

- Menu: item **Implantação** renomeado para **Jornada do cliente** (rota `/implantacao` inalterada); ícone `Route`.
- Página da jornada: layout mais enxuto (hero compacto, faixa de destaque fina, cards intro em grelha 2 colunas, etapas só com trilho + cartão); ícones pequenos no título de cada passo; ações **Imprimir**, **PDF** e **HTML** com rótulo + ícone.

## v3.1.3 (2026-05-06)

- Sidebar recolhida: botão de tema (claro/escuro) passa a ficar abaixo do logo, evitando sobreposição com o badge.

## v3.1.2 (2026-05-06)

- Remoção da integração TeliScript no VynTask (ferramenta permanece como app Python separado).

## v3.1.1 (2026-05-06)

- TeliScript: UI alinhada ao fluxo do app desktop (perfil Firebird, analisar/sugerir/ver grupos, prévia de grades, prévia SQL, log, importação direta) com visual VynTask (cards, accent, tipografia).
- TeliScript API: endpoints `analyze`, `suggest-colors`, `suggest-groups`, `groups-report`, `grades-preview`, `test-connection`, `execute-sql`; `generate` aceita `grade_overrides_json` e relatório com linhas ignoradas quando aplicável; dependência `firebird-driver` em `requirements-api.txt`.

## v3.1.0 (2026-05-06)

- TeliScript: nova rota `/teliscript` (escopo `projects.view`) para gerar `importacao_firebird.sql`, `reversao_firebird.sql` e relatório a partir de `.xlsx`/`.csv`, reutilizando o gerador Python existente.
- TeliScript: API FastAPI em `TeliScript/api` com proxy de desenvolvimento em `/api/teliscript` (porta local padrão `8765`).

## v3.0.13 (2026-05-06)

- Assistente IA: nova tela funcional em `/assistente` com consulta em linguagem natural, resposta executiva de projeto e tratamento de ambiguidades por similaridade de nome.
- Assistente IA: serviço determinístico de snapshot com próximos passos, última conclusão, progresso, horas e alertas (atraso, orçamento, sem atualização), com confiança de match.
- Assistente IA: integração opcional com backend LLM via feature flag (`VITE_AI_ASSISTANT_ENABLE_LLM`) e fallback automático para resumo determinístico.
- Observabilidade: telemetria de uso da assistente registrada em auditoria (`auditLogs`) para sucesso, ambiguidade, não encontrado e erro.

## v3.0.12 (2026-05-06)

- Correção de regressão visual no login: badge do ícone antigo voltou a ancorar corretamente no bloco da marca (não fica mais “solto” no canto da tela).
- Logo/bordas do lockup em sidebar/login ajustados para o padrão estável semelhante ao visual da versão v3.0.5.

## v3.0.11 (2026-05-06)

- Branding: retorno ao logotipo bolinha da Azoup no lockup principal, com badge VynTask sobreposto como no estilo de referência do sidebar.
- Ajustes no sidebar/login para manter alinhamento visual da composição bolinha + badge em moldura quadrada arredondada.

## v3.0.10 (2026-05-06)

- Logo principal (sidebar/login): aplicado recorte com zoom no símbolo Azoup dentro da moldura quadrada arredondada, no mesmo padrão visual de avatar emoldurado.
- Lockup mantido simples (sem badge extra), priorizando leitura do ícone principal e consistência com o estilo pedido.

## v3.0.9 (2026-05-06)

- Branding principal (sidebar/login): lockup alinhado ao estilo da Implantação com moldura escura limpa, borda clara e sombra única para leitura mais sólida do logo principal.
- Proporção e espaçamento refinados no bloco de marca (sidebar e card de login), com ícone maior e composição mais próxima da referência visual.

## v3.0.8 (2026-05-06)

- Branding principal (sidebar/login): logo passou a usar moldura no mesmo estilo da página de Implantação, com recorte interno e presença visual mais forte no cabeçalho.
- Lockup simplificado: removido badge secundário do logo principal para manter assinatura mais limpa e consistente com a referência visual.

## v3.0.7 (2026-05-06)

- Sidebar (colapsada): logo quadrado recebeu moldura mais forte e recorte interno para ficar maior, mais sólido e próximo do visual de referência.
- Tema: removido definitivamente o estilo de interruptor; o botão voltou ao ícone simples sol/lua no cabeçalho, com troca de tema e ícone ao clique.

## v3.0.6 (2026-05-06)

- Branding (sidebar/login): lockup refinado para visual mais clean com ícone quadrado arredondado consistente entre estados expandido/colapsado e card de autenticação.
- Ajustes incrementais de margens, bordas e alinhamento no header da marca para melhorar leitura e equilíbrio visual sem introduzir dependências.

## v3.0.5 (2026-05-06)

- Sidebar (colapsada): botão de tema simples (sol/lua) reposicionado para a base final do rodapé (abaixo do CTA), reduzindo ruído no topo e mantendo leitura rápida do estado.
- Ajuste fino de espaçamento do ícone de tema no colapsado para um fechamento visual mais limpo.

## v3.0.4 (2026-05-06)

- Sidebar: no estado colapsado, o toggle de tema agora usa botão de ícone simples (sol/lua) reposicionado no fim da barra lateral, enquanto o switch visual completo permanece no estado expandido.

## v3.0.3 (2026-05-06)

- Login: removido o logo secundário sobreposto no bloco de marca para manter somente a marca principal e preservar alinhamento/margens do cabeçalho do card.

## v3.0.2 (2026-05-06)

- Sidebar: toggle de tema redesenhado com visual mais criativo e premium (trilho orbital, thumb com microbrilho e estados dark/light com identidade própria) mantendo legibilidade em tamanho compacto.
- Tema: feedback de interação refinado no botão (hover/focus/active) com contraste melhor e microanimações discretas alinhadas ao branding Azoup.

## v3.0.1 (2026-05-06)

- Refino visual do branding no sidebar para um lockup mais premium: ajustes de alinhamento, margens e proporções entre orb Azoup, badge VynTask, tipografia e controles.
- Consistência expandido/colapsado reforçada no header lateral, com melhor respiração no divisor e equilíbrio entre bloco de marca e toggle de tema.

## v3.0.0 (2026-05-06)

- Marco major da nova fase do produto com identidade **VynTask by Azoup**, consolidando rebranding visual, assinatura institucional e preparação para migração de repositório no GitHub.
- Estrutura de versão reiniciada para ciclo de mudanças amplas planejadas (produto, marca e operação), mantendo compatibilidade operacional do app atual.

## v2.10.30 (2026-05-06)

- Rebranding visual (epic): cabeçalho agora usa o símbolo **bolinha laranja Azoup** como marca principal do lockup, com selo secundário do ícone VynTask para manter a assinatura do produto.
- Sidebar e login receberam composição de marca reforçada (`VynTask by AZOUP`) com hierarquia mais forte para Azoup, mantendo `VynTask` como nome principal.
- Refino visual de proporção/hierarquia: lockup ampliado, integração melhor entre orb Azoup e badge VynTask, endorsement mais limpo e hover mais sóbrio para sensação premium.
- Metadados/versionamento atualizados para refletir o novo lockup.

## v2.10.29 (2026-05-06)

- Branding: co-brand oficial aplicado para **VynTask by Azoup**, preservando `VynTask` como marca principal e adicionando assinatura visual `by Azoup` em áreas-chave (sidebar e login).
- Identidade visual: lockup textual com separador (`VynTask • by Azoup`) e inclusão do logotipo laranja da Azoup no card de autenticação para reforço institucional sem poluir a leitura operacional.
- Metadados: título base da aplicação atualizado para `VynTask by Azoup`.

## v2.10.28 (2026-05-06)

- Atendimento de no-show: ao registrar ausência com reagendamento, a tarefa original agora salva `cancellationReason=client_no_show` e vínculo explícito com a nova tarefa (`rescheduledToTaskId` / `rescheduledFromTaskId`) para rastreabilidade operacional.
- Dashboard (tarefas): KPI de canceladas mantém o comportamento operacional e segue contabilizando o cancelamento por no-show mesmo quando houver reagendamento, com leitura visual reforçada no detalhe do projeto.
- Tarefas (lista): novos badges visuais **No-show** e **Reagendada** para identificação rápida; sync opcional com Supabase via `VITE_SYNC_TASK_NO_SHOW_FIELDS` + script `supabase/sql/018_tasks_no_show_fields.sql`.

## v2.10.27 (2026-05-06)

- Dashboard (KPIs de tarefas): correção de contagem para refletir operação real — **concluídas** seguem `completedAt` por janela, **canceladas** passam a usar `cancelledAt` no recorte temporal e **agendadas** passam a considerar tarefas ativas (`pendente` + `em_andamento`) no escopo.
- Sync Supabase de tarefas: payload agora envia `completed_at` e `cancelled_at`, evitando perda de timestamp após refresh/sincronização e mantendo consistência do KPI “Hoje”.
- Supabase SQL: novo script `supabase/sql/017_tasks_status_timestamps.sql` adiciona colunas/índices em `tasks` para suportar as métricas temporais com integridade.

## v2.10.26 (2026-05-05)

- Cadastro/edição de projeto: texto de ajuda em **Data de início do projeto** esclarece que o valor é o início operacional (ex.: primeiro contato), não a data de criação do registro no app; indica correção posterior em **Projeto → Editar**.

## v2.10.25 (2026-05-05)

- **Dashboard (KPIs Hoje / semana / mês):** “Tarefas concluídas” passa a usar a **data de conclusão** (`completedAt`), não a data de criação da tarefa — tarefas informativas (e demais) concluídas no período entram no contador. Persistência local em Dexie + preenchimento retroativo a partir de **logs de auditoria** quando existir “para concluida”. Ajustes em `setTaskStatus`, movimentos de kanban em lote e ordenação do detalhe “concluídas” por data de conclusão.

## v2.10.24 (2026-05-05)

- Manuais: imagens do manual WooCommerce com **ampliar ao clicar** (lightbox em portal, fundo escuro, legenda, fechar por botão X, clique fora ou **Escape**); selo **Ampliar** com ícone de lupa no hover.

## v2.10.23 (2026-05-05)

- Supabase: novo script `supabase/sql/016_projects_manual_checkin.sql` (`last_manual_checkin_at`, `last_manual_checkin_by` em `projects`) + documentação em `README_RUN_ORDER`, `supabase/README.md`, `.env.example` e `VITE_SYNC_PROJECT_MANUAL_CHECKIN` em `vite-env.d.ts`.

## v2.10.22 (2026-05-05)

- **Manuais**: busca por título, descrição e `keywords` no catálogo; toolbar com contador de resultados e limpar busca.
- Manual WooCommerce: **sumário** (atalhos âncora), pré-requisitos/fluxo em **cartões**, três **fases numeradas** com subpassos em lista estilizada; painéis finais em duas colunas no desktop; tipografia do leitor mais confortável (`1.0625rem` / `1.68`).
- Utilitário `manualMatchesQuery` + testes em `manualsSearch.test.ts`.

## v2.10.21 (2026-05-05)

- Imagens do manual WooCommerce: fonte em `docs/manuais/prints/` (`woocommerce1.png`, `woocommerce2.png`) com cópia para `public/manuals/woocommerce/`; `copiar-prints.ps1` ganha `-FromDocs` para sincronizar. Texto do manual atualizado com esse fluxo.

## v2.10.20 (2026-05-05)

- Manual **WooCommerce** reclassificado como **`audience: internal`** (somente equipe Azoup); texto reforça que não é material para cliente final.
- Portal: removido `manuals.view` dos escopos padrão de usuários **cliente** (mantém-se apenas se concedido explicitamente no perfil).
- Página **Manuais**: cabeçalho com faixa e ícone, **segmented control** para abas, índice com selo “Interno”, leitor com faixa de meta + badge **Uso interno** / **Cliente**, corpo com largura máxima para leitura; abas **Interno/Clientes** só aparecem quando existir manual nas duas categorias.

## v2.10.19 (2026-05-05)

- Manual WooCommerce: texto alinhado aos **prints reais** (caminho 1–5 no WordPress, abas ZPFGerencial, checkboxes e F2 Gravar), nota sobre **recorte** de banners e **mascaramento** de chaves, `ManualFigure` com fallback se PNG ausente, script `public/manuals/woocommerce/copiar-prints.ps1` para substituir imagens localmente.

## v2.10.18 (2026-05-05)

- Manual **WooCommerce + Azoup** reestruturado: fluxo em 3 etapas, texto enxuto, duas figuras de referência (`public/manuals/woocommerce/`) com legendas, blocos de segurança e troubleshooting; estilos de figura e disclaimer no leitor de manuais.

## v2.10.17 (2026-05-05)

- **Manuais** visível e rota `/manuais` acessível para o time interno que já tem **Projetos** (`projects.view`), além de quem tem `manuals.view` — evita menu vazio quando o perfil no Supabase tem lista explícita de permissões sem o novo escopo.

## v2.10.16 (2026-05-05)

- Nova área **Manuais** (`/manuais`) no menu lateral, com abas **Interno — Azoup** e **Clientes**; usuários portal recebem o escopo `manuals.view` por padrão para acessar materiais voltados ao cliente.
- Primeiro manual publicado: **Configuração da integração e-commerce (WooCommerce)** — geração de chaves REST API no WordPress e cadastro no ERP Azoup (URL `wc/v2`, Consumer Key/Secret, parâmetros e sincronização).

## v2.10.15 (2026-05-05)

- Check-in manual de projetos consolidado com fonte única em `DbProject` (`lastManualCheckinAt`/`lastManualCheckinBy`), removendo dependência de `localStorage` para evitar divergência entre telas e dispositivos.
- Regras de frescor alinhadas ao plano operacional (`Neutro`, `Em dia`, `Atenção`, `Atrasado`, `Crítico`) com thresholds 80/100/200 do SLA e uso unificado em `Projetos`, `Detalhe do projeto` e cards de projetos no `Dashboard`.
- Entrega de plano único consolidado em `docs/plano-entrega-vyntask-integrado.md` para execução integrada de produto/arquitetura/UX/frontend/backend/QA.

## v2.10.14 (2026-05-05)

- MVP de check-in manual de projetos com ação de 1 clique (com confirmação) na lista de projetos e no detalhe do projeto, mantendo baixo risco com persistência local.
- Inclusão de "último check-in manual" e status de frescor (`Neutro`, `Em dia`, `Atenção`, `Atrasado`, `Crítico`) em áreas principais: cards da lista, KPIs do detalhe e cards de projetos em andamento no Dashboard.
- Novo aviso de pendências via modal simples na lista de projetos, com foco em projetos sem check-in recente (neutro/atrasado/crítico) para priorização rápida.

## v2.10.13 (2026-05-05)

- Criado plano unico e executavel de entrega integrada em `docs/plano-entrega-vyntask-integrado.md`, consolidando backlog priorizado, sequencia de execucao, criterios de aceite e rollout.
- Estruturacao orientada a operacao real de implantacao, com gates por fase, estrategia de rollback e responsabilidades cross-funcionais (Produto, Arquitetura, UX, Frontend, Backend e QA).
- Camada de dados de projeto ampliada com `lastManualCheckinAt` e `lastManualCheckinBy`, incluindo migração Dexie (`v16`) com backfill seguro para `null`.
- Novo serviço reutilizável de frescor por SLA (`src/services/projectFreshness.ts`) com padrão semanal e classificação 80/100/200 (`saudavel`, `atencao`, `vencido`, `critico`).
- Novo serviço de check-in manual (`registerProjectManualCheckin`) integrado ao fluxo local-first e com sync Supabase protegido por feature flag `VITE_SYNC_PROJECT_MANUAL_CHECKIN` para não quebrar ambientes sem colunas remotas.

## v2.10.12 (2026-05-05)

- Dashboard (light mode): reforço de contraste e hierarquia visual nos cards de KPI, painéis e blocos de consulta, com fundo/borda/sombra mais legíveis sem alterar estrutura funcional.
- Dashboard (light mode): melhoria da separação visual entre seções e cards de resumo/projetos/agenda, incluindo ajustes de tipografia secundária para leitura mais clara.
- Preservação explícita do dark mode por meio de overrides direcionados a `:root[data-theme='light']` e uso prioritário de tokens (`--surface`, `--text`, `--border`, `--accent`, etc.).

## v2.10.11 (2026-05-05)

- Dashboard: removido o rótulo textual de janela no topo (ex.: `Janela ...`) para deixar o cabeçalho mais limpo e direto.
- Harmonização visual do bloco de controles (`Resumo/Consulta` + `Hoje/Essa semana/Esse mês/Total`) com alinhamento e espaçamento consistentes em uma única linha de leitura.
- Ajustes responsivos no topo para manter alinhamento entre tabs, filtros e cards em desktop/mobile sem mudar comportamento funcional.

## v2.10.10 (2026-05-05)

- Dashboard (Resumo): removido o texto contextual `Janela: ...` para reduzir redundância e limpar o topo do conteúdo.
- Dashboard (topo): tabs `Resumo/Consulta` e chips `Hoje/Essa semana/Esse mês/Total` foram harmonizados no mesmo padrão de controle (altura, borda, estados e foco), reforçando consistência visual.
- Refino incremental de hierarquia/ritmo dos cards de KPI e cards de consulta com ajustes de raio, sombra e densidade para melhorar escaneabilidade sem alterar comportamento.

## v2.10.9 (2026-05-05)

- Dashboard (topo): tabs principais e filtro temporal agora ficam em dois níveis claros (`Navegação` e `Janela KPI`), melhorando leitura sequencial e reduzindo sensação de desalinhamento.
- Refino de espaçamento/alinhamento no header do Dashboard para manter eixo visual consistente entre título, tabs e controle de janela KPI em desktop e mobile.
- Ajuste estritamente visual (CSS + microcopy), sem alteração de comportamento funcional do Dashboard.

## v2.10.8 (2026-05-05)

- Dashboard (cards KPI): removidos metadados visuais repetitivos nos cards para voltar ao padrão limpo (ícone + valor + label), eliminando o ruído apontado no resumo.
- Contexto temporal do filtro agora aparece em um único ponto discreto na seção (`Janela: ...`), em vez de repetir texto dentro de todos os cards.
- Limpeza de CSS legado relacionado ao meta dos cards para manter consistência e reduzir complexidade visual.

## v2.10.7 (2026-05-05)

- Dashboard (KPI cards): removido o texto secundário sob os labels para reduzir ruído visual e manter leitura mais direta dos indicadores.
- Labels dos KPIs de "novos" foram simplificados (sem "no periodo" fixo), preservando o contexto de janela atual no `aria-label` para acessibilidade e drilldown.

## v2.10.6 (2026-05-05)

- Dashboard (`Projetos em andamento`): comportamento invertido para iniciar com **todos os projetos visíveis** e rolagem ativa por padrão.
- Ação principal do toggle passa a ser **Mostrar menos**, mantendo opção de voltar ao modo resumido com 5 itens.
- Ajuste de contador contextual para refletir estado expandido (`Mostrando todos`) e modo reduzido (`Mostrando X de Y`), incluindo rolagem também no mobile expandido.

## v2.10.5 (2026-05-05)

- Dashboard (Resumo): cards KPI de `Projetos`, `Tarefas` e `Viradas` receberam reforço visual de borda/sombra e contêiner de seção com mais presença para melhorar hierarquia e consistência com os demais painéis.
- Títulos de grupo agora exibem ícones semânticos e estilo de cápsula, enquanto os cards ganharam hover/ativo mais evidentes e labels com contraste refinado para leitura rápida.
- Ajustes focados em UI (CSS + markup mínimo), preservando comportamento, regras de negócio, acessibilidade e responsividade existentes.

## v2.10.4 (2026-05-05)

- Dashboard (`Projetos em andamento`): lista agora inicia com **5 projetos visíveis** e ação de **Ver todos/Mostrar menos** para controlar densidade sem perder acesso ao restante.
- Inclusão de contador contextual (`Mostrando X de Y`) e toggle acessível (`aria-expanded`/`aria-controls`) para feedback claro da expansão.
- No desktop, modo expandido passa a usar rolagem interna suave quando necessário; no mobile, a lista expandida segue a rolagem natural da página.

## v2.10.3 (2026-05-05)

- Dashboard (topo): refinado o ritmo vertical entre header, tabs e barra de janela KPI para leitura mais compacta e contínua.
- Tabs e chips com densidade reduzida (altura, padding, gap e tipografia), mantendo o mesmo estilo visual do produto.
- Barra de chips alinhada ao início da coluna de conteúdo para reforçar hierarquia e consistência de eixo visual.

## v2.10.2 (2026-05-05)

- Dashboard (topo): compactação de espaçamento no header da página (título + data) e redução de respiro vertical entre blocos iniciais.
- Alinhamento do topo refinado com tabs principais (`Resumo`/`Consulta`) e barra/chips de janela KPI (`Hoje`, `Essa semana`, `Esse mês`, `Total`) iniciando no mesmo eixo visual.
- Ajustes estritamente visuais e responsivos no CSS, sem alteração de regras de negócio.

## v2.10.1 (2026-05-05)

- Dashboard (Resumo): bloco **Projetos em andamento** voltou para leitura compacta, removendo ruído visual (sem linha de marco no card compacto e sem contagem de tarefas na linha principal).
- Hierarquia visual refinada para o layout legado da lista (cards mais enxutos, espaçamentos menores e progressão mais direta), aproximando o comportamento visual do modelo anterior.
- Cabeçalho do painel simplificado para foco no conteúdo da lista.

## v2.10.0 (2026-04-30)

- Agenda de hoje evoluída para fluxo operacional com CTA dinâmico por contexto (`Entrar`, `Iniciar`, `Pausar`) e exibição de contexto de projeto/tarefa no próprio card.
- Novo fechamento guiado da reunião direto no Dashboard com captura de resultado, próximo passo, atualização opcional de status da tarefa e lançamento manual de horas no mesmo fluxo.
- Contrato de `events` expandido com campos operacionais (`executionState`, `outcomeSummary`, `nextStep`, `closedAt`, `loggedHours`) para rastreabilidade incremental de execução.
- Refinos visuais na Agenda de hoje para melhorar hierarquia, densidade e leitura de estado (chips de contexto/timer e modal de conclusão).

## v2.9.16 (2026-04-30)

- Dashboard KPI de tarefas atualizado de **Tarefas em andamento** para **Tarefas agendadas**, com ajuste funcional para contar tarefas pendentes no recorte do KPI.
- Correção do KPI **Projetos em andamento** para refletir todos os projetos abertos no escopo dos filtros (não finalizados e não cancelados), sem restringir por janela temporal de criação.
- Mantida reconciliação entre card e drilldown com os novos critérios de leitura operacional.

## v2.9.15 (2026-04-30)

- Dashboard evoluido para **12 KPIs** em tres blocos (Projetos, Tarefas e Viradas), incluindo estados de *novos no periodo*, *em andamento/agendadas*, *concluidos* e *cancelados* com drilldown dedicado por card.
- Fonte unica de contagem/listagem no breakdown: os cards e a Consulta usam os mesmos conjuntos por KPI, eliminando divergencias entre numero e lista.
- Regra expandida de **tarefas canceladas**: considera tarefa com status cancelado e tambem tarefa impactada por evento cancelado vinculado, com deduplicacao por 	ask.id para evitar contagem dupla.
- Refino visual da grade KPI para 12 cards com agrupamento por dominio e estado visual padronizado (info/warning/success/danger), mantendo foco em escaneabilidade.

## v2.9.14 (2026-04-30)

- Revisao da regra de viradas no Dashboard: KPI e drilldown agora contam apenas eventos classificados como virada real (tags de cutover/virada ou texto de virada no evento/tarefa vinculada), evitando incluir agendas comuns por engano.
- Alinhamento entre Resumo e Consulta para viradas agendadas/realizadas/canceladas usando o mesmo classificador de virada, reduzindo divergencia entre numero e lista.

## v2.9.13 (2026-04-29)

- **KPIs clicáveis no Resumo:** cada um dos 9 cards abre a **Consulta** na sub-aba certa (Projetos, Tarefas ou Viradas) com a **listagem exata** dos itens que compõem o número, usando o mesmo recorte da janela KPI (Hoje / Semana / Mês / Total) e o escopo dos filtros da consulta.
- Banner de contexto com contagem, janela temporal e botão **Fechar detalhe**; cards do resumo ganham estado ativo e affordance de clique.
- Nova sub-aba **Tarefas** na consulta para exibir drilldown de tarefas; viradas agendadas listam data, horário, projeto (direto ou via tarefa) e status do evento.

## v2.9.12 (2026-04-29)

- Resumo do Dashboard: **Projetos em andamento** com toolbar (atalho à agenda, alternância cartão compacto/detailed, ordenação por data ou A–Z) e modo **compacto** alinhado ao painel antigo (linha única de horas/fase/tarefas + marcos e barra).
- **Agenda de hoje** com abas *Todos* / *Com link*, todos os status do dia (incl. encerrados), selo de situação e ações *Sem link*, *Editar*, *Concluir* e *Agenda* (link da reunião ou modelo Google Calendar).
- KPIs: ícones compostos (timer / check / X) sobre pasta, lista e chave; ajuste de espaçamento e alinhamento da grade 3×3 e do bloco de resumo.
- ESLint: cleanup do efeito em `AuthContext` (incremento de sequência na desmontagem) para satisfazer `react-hooks/exhaustive-deps`.

## v2.9.11 (2026-04-29)

- Remoção temporária dos blocos e da subaba de alertas no Dashboard para abrir espaço para a reformulação futura da experiência.
- Restauração do foco da tela de resumo em `Projetos em andamento` e `Agenda de hoje`, removendo os painéis intermediários de ações imediatas/viradas do resumo.
- Ajuste dos cards de KPI para um visual com cores mais vivas, aproximando a leitura do estilo anterior sem perder a nova organização.

## v2.9.10 (2026-04-29)

- Reestilização do filtro de janela do Dashboard no mesmo padrão visual da toolbar de `Projetos`, com container dedicado, borda suave e acabamento arredondado.
- Melhoria dos chips `Hoje`, `Essa semana`, `Esse mês` e `Total` com estados de hover/ativo/foco mais claros e consistentes com o design system.
- Ajuste responsivo do bloco de filtros para manter legibilidade e usabilidade no mobile sem quebrar layout.

## v2.9.9 (2026-04-29)

- Refinamento visual dos KPIs do Dashboard com estética mais clean: cards com contraste equilibrado, menos brilho e hierarquia tipográfica ajustada para leitura rápida.
- Padronização dos ícones por domínio solicitado: projetos com pastinha, tarefas com composição lista + agenda e viradas com key/check, mantendo semântica por status.
- Ajuste dos chips de janela (`Hoje`, `Essa semana`, `Esse mês`, `Total`) para estilo neutro e consistente com o tema do produto, removendo o destaque vermelho fixo.

## v2.9.8 (2026-04-28)

- Refatoração do bloco "Projetos em andamento" para derivar dados dos cards via `useMemo` no `DashboardPage`, reduzindo recomputações por card e preservando responsividade da listagem.
- Restauração e reforço dos detalhes operacionais por projeto com composição de utilitários existentes (`PlanLabelRow`, `AnalystAvatar`, `projectProgressPercent`, `formatDurationHmFromHours`) para manter consistência visual e semântica.
- Manutenção explícita dos elementos críticos no resumo (nome com link, horas feito/previsto, fases/labels último+atual quando houver, badge do plano, avatar do responsável, barra de progresso e percentual).

## v2.9.7 (2026-04-28)

- Reforço visual dos cards de "Projetos em andamento" no Dashboard Command Center com hierarquia em blocos operacionais (responsável, tempo gasto/previsto, fase atual e último marco) sem perda de densidade.
- Preservação explícita dos dados críticos do resumo legado: nome do projeto, etiquetas de fase (último/atual), plano, avatar do responsável quando houver, barra de progresso e percentual.
- Refino de legibilidade e consistência com o design system (contraste, tipografia utilitária e agrupamento semântico) mantendo comportamento responsivo em desktop e mobile.

## v2.9.6 (2026-04-28)

- Reorganização da seção "Projetos em andamento" no Dashboard para leitura operacional em até 2 minutos: cabeçalho com identificação, linha de responsável, resumo rápido (horas, fase atual, último marco), progresso e fechamento de contexto.
- Microcopy orientada a varredura rápida com labels explícitos ("Responsável", "Fase atual", "Tarefas concluídas"), reduzindo ambiguidade sem sacrificar densidade de dados.
- Ajustes de CSS para hierarquia visual e escaneabilidade (grid semântico de metadados, truncamento seguro do último marco, separação por blocos e responsividade com coluna única no mobile).

## v2.9.5 (2026-04-28)

- Padronização visual dos cards de "Projetos em andamento" no Dashboard (Resumo e Consulta), com preservação explícita de nome, horas gasto/previsto, etiquetas de fase (último/atual), plano, responsável, barra e percentual.
- Melhoria de hierarquia e consistência com o design system existente ao reutilizar `PlanLabelRow`, `AnalystAvatar`, `planPill` e progress bar em ambos os contextos do Command Center.
- Ajuste de legibilidade operacional sem quebrar responsividade, unificando a densidade dos cards e removendo variações visuais que perdiam informação.

## v2.9.4 (2026-04-28)

- Redesign completo do Dashboard para o formato Command Center com abas principais (`Resumo` e `Consulta`) e sub-abas operacionais para projetos, riscos/bloqueios e viradas.
- Nova experiência visual de alto contraste com cards executivos mais coloridos e hierarquia reforçada para leitura rápida dos indicadores críticos.
- Inclusão de busca avançada opcional na aba de consulta (período, analista, status, plano e cliente) com drilldown direto para os projetos.
- Restauração dos detalhes no bloco "Projetos em andamento" do resumo com horas feito/previsto, etiquetas de fase (último/atual), badge de plano, avatar do responsável e barra de progresso com percentual.

## v2.9.3 (2026-04-28)

- Correção de robustez visual no dashboard: `DashboardPage` agora importa `part03-dashboard-kanban.css` diretamente para evitar dependência frágil da cadeia global de `@import`.
- Ajustes de fallback no CSS do dashboard para preservar herança de cor nos links internos e cobertura visual do estado neutro dos cards KPI.

## v2.9.2 (2026-04-28)

- Correção crítica das métricas do dashboard: viradas de sistema agora contam somente eventos com tag estruturada de virada concluída, evitando falso positivo por texto livre.
- Ajuste de integridade no vínculo de viradas por fallback `taskId -> projectId`, garantindo que eventos realizados sem `projectId` explícito não desapareçam dos números.
- Correção de período customizado para parse local seguro (sem deslocamento por timezone) e normalização de intervalos invertidos.

## v2.9.1 (2026-04-28)

- Refinamento visual incremental do dashboard de implantações com melhor hierarquia entre resumo, gestão do período e blocos operacionais.
- Novo recorte temporal com melhor affordance (chips + intervalo personalizado) e cartões gerenciais para inícios, viradas e riscos acionáveis.
- Ajustes de legibilidade e responsividade dos blocos de apoio para preservar consistência visual do VynTask sem alterar comportamento funcional.

## v2.9.0 (2026-04-28)

- Release de consolidação com melhorias amplas na autenticação, páginas de agenda/dashboard/projetos, sincronização local/nuvem e serviços de negócio.
- Ajustes visuais e de UX em modais, portal do cliente e estilos globais para maior consistência e estabilidade da experiência.
- Hardening e evolução da camada SQL do Supabase com novos scripts de permissão, segurança e checagens pós-ajuste.

## v2.6.0 (2026-04-23)

- **Reestruturação frontend:** rotas em lazy loading com fallback dedicado, divisão de estilos em módulos (`src/styles/part*.css`) e cleanup de imports dinâmicos no Dexie.
- **Qualidade de código:** migração para ESLint flat + Vitest, warning budget zerado (`eslint . --max-warnings 0`) e pipeline CI no GitHub Actions rodando lint/test/build em push/PR.
- **Portal cliente e tipagem:** novas páginas/serviços do portal, tipos dedicados para payloads de submissão/arquivos e redução de `any` em pontos críticos.
- **Relatórios:** botão de exportação CSV por aba (executivo, operação, horas) para compartilhamento rápido de indicadores.
- **Operação/migração:** script `backup_unique_files.ps1` para backup deduplicado por hash na troca de notebook.

## v2.5.2 (2026-04-22)

- **Bugfix (Configurações/Permissões):** ajustes de permissões e status de usuário agora usam RPCs administrativas (`admin_set_profile_permissions` e `admin_set_profile_status`), evitando falhas por trigger/RLS no update direto de `profiles`.
- **Bugfix (Registrar atendimento):** erros de gravação no modal de atendimento agora aparecem de forma confiável em tela (`toast`) e também são enviados ao Console Admin (diagnóstico runtime), sem depender de F12.
- **Resiliência de UX:** operações críticas do registro de atendimento ganharam timeout defensivo para evitar estado preso em `Salvando...`.
- **Operação Supabase:** novo script `supabase/sql/maintenance/E_admin_profile_rpc.sql`.

## v2.5.1 (2026-04-22)

- **Auth híbrido e governança:** novos cadastros entram como `pending`; login bloqueia usuário pendente/inativo com mensagem explícita; fluxo de aprovação centralizado para admin.
- **Segurança de permissões/RLS:** hardening em `profiles` (proteção de alteração de `role/status/permissions`) e auditoria (`audit_logs`/`project_deletion_logs`) com update/delete restrito para admin ativo.
- **Console Admin de diagnóstico:** nova aba em Configurações com status de sessão/sync/realtime, fila pendente, ações de recuperação (refresh cache, pull incremental, reabrir realtime) e stream de erros operacionais.
- **Robustez cross-browser:** instrumentação de falhas em storage/cursors/BroadcastChannel/WebSocket, captura global de erros JS e diagnóstico de capacidades do navegador para troubleshooting em Comet/Brave/Chrome.
- **Operação Supabase:** scripts de manutenção para correção de CRUD em documentação, hardening de auth/auditoria e promoção de admins por e-mail.

## v2.4.7 (2026-04-21)

- **Implantação:** correção de crash em `splitUrls` / `IntroRich` quando texto vem `undefined` (página da jornada não quebra mais).
- **Sidebar:** ícones mais distintos (Gauge, Kanban, Map, etc.), rótulo **Planos**, tema sol/lua no cabeçalho ao lado da marca; refinamentos de **alinhamento** (marca + tema), **coluna fixa** para labels, **SVGs** com tamanho e traço uniformes, paddings e rodapé/CTA mais equilibrados; estado ativo sem “caixa dupla”; `spellCheck={false}` na versão exibida para evitar artefatos do corretor.
- **Metadados:** `index.html` e `package-lock` alinhados à versão exibida no app (`APP_VERSION_DISPLAY`).

## v2.4.1 (2026-04-20)

- **Jornada de implantação (cliente Azoup):** nova rota `/implantacao` com leitura da jornada (HTML/PDF em `public/docs`), dados estruturados em `implantationJourney`, marca `AzoupLogoMark`, estilos dedicados.
- **Navegação:** item “Implantação” na sidebar; escopo alinhado a `projects.view`; integrações leves em Dashboard, Visão Geral, Projetos e detalhe de projeto conforme o fluxo da jornada.
- **Assets:** logos e cópias em `docs/` e `public/branding` / `public/docs` para referência e servir estático no deploy.

## v2.4.0 (2026-04-20)

- **Sync multi-aba e tempo real (Supabase):** canal `BroadcastChannel` para outras abas dispararem pull incremental leve; inscrição Realtime em `projects`, `phases` e `tasks` aplicando mudanças no Dexie com mute nos hooks (evita loop Dexie→nuvem).
- **Pull incremental:** após refresh completo, cursores em `localStorage` por tabela; polling (~2 min) e filtro `.gt('updated_at', cursor)` quando a coluna existir no Postgres.
- **Versionamento local:** `remoteUpdatedAt` em projeto/fase/tarefa (Dexie v14); merge conservador se o cache local já tiver timestamp mais novo que o evento remoto.
- **Hooks Dexie→PostgREST:** retry com backoff (mesma política de tentativas do sync de grafo) e `CustomEvent` `implantacao-azoup-sync-failure` com toast limitado por tabela no `UiFeedbackProvider`.
- **Operação:** script opcional `supabase/sql/optional/D_domain_row_versioning_updated_at.sql` adiciona `updated_at`, triggers, índices e `REPLICA IDENTITY FULL` para DELETE via Realtime; habilitar replicação das três tabelas no painel Supabase.

## v2.3.4 (2026-04-20)

- **Correção (nuvem — plano avulso):** exclusão de fase ou tarefa sumia só no Dexie; no `upsertProjectGraphFromDexie` o app só fazia **UPSERT** das linhas locais e **não apagava** registros órfãos no Supabase, então após **F5** a fase/tarefa “voltava”. Agora, antes dos upserts, reconciliamos **tarefas** e **fases** remotas do projeto que não existem mais no Dexie (DELETE em lotes).

## v2.3.3 (2026-04-20)

- **Modal de projeto:** rodapé fora do formulário com `form` associado; estilos de `.project-create-modal__footer` e padding do corpo para evitar sobreposição; confirmação de UI com `z-index` acima do modal; ao ajustar contrato (plano avulso), o campo de horas sincroniza com o valor confirmado.
- **Nova/editar tarefa (`PlanTaskModal`):** horas estimadas em decimal com vírgula ou ponto (ex.: `1,5`) ou relógio (`1:30`); helper `formatDecimalHoursForBrInput`; layout `modal--plan-task` com corpo rolável e rodapé fixo; espaçamento e dica de campo.

## v2.3.2 (2026-04-20)

- **Correção:** erro React #310 ao abrir detalhe do projeto — `useRegisterUnsavedChanges` estava **depois** dos `return` de carregamento, mudando a quantidade de hooks entre renders. Hook e flags de “dirty” foram movidos para **antes** dos early returns; `enabled` considera `user` e `project`.

## v2.3.1 (2026-04-20)

- **Correção crítica (tela preta):** `useBlocker` no shell exige *data router*. A app voltou a usar `createBrowserRouter` + `RouterProvider` em vez de `BrowserRouter`, eliminando o crash ao entrar na área logada.

## v2.3.0 (2026-04-20)

- **Plano avulso (custom):** criação de projeto sem clonar modelo do catálogo; fases e tarefas no próprio projeto; estimativas faturáveis; política híbrida B (teto de horas contratadas com confirmação para elevar contrato quando a soma das previsões ultrapassa); edição de fases/tarefas e KPI no detalhe; listagens com rótulo explícito (Plano avulso / AVULSO).
- **Tema e visual:** paletas controladas (Neo, Blue Ops, Pulse, Growth, Minimal), tokens em `palettes.css` / `index.css`, hierarquia Neo Light, cores de analista no calendário e avatares, logo tokenizada, Settings alinhado aos temas.
- **Agenda:** no “Novo evento”, seleção de projeto e tarefa; filtro de projeto na lateral que também filtra a grade; busca em tarefas não agendadas; cards clicáveis para abrir o compromisso já vinculado; fluxo + Criar com formulário limpo.
- **Navegação:** diálogo de alterações não salvas (`UnsavedLeaveDialog`) integrado ao fluxo de saída com alterações pendentes na agenda.

## v2.2.15 (2026-04-20)

- **Confiabilidade de criação (nuvem):** cadastro de projeto não bloqueia mais a operação local quando houver timeout de rede no Supabase; o grafo (`projects`/`phases`/`tasks`) passa a entrar em fila persistente para re-sync automático.
- **Auto-recuperação de sync:** adicionada fila em `localStorage` para projetos pendentes de sincronização e flush automático ao iniciar bridge, ao voltar online e ao focar a janela.
- **Diagnóstico técnico:** tentativas de sync com retry exponencial (até 3) e logs mais detalhados (`projectId`, `operation`, `attempts`, `errorMessage`) para troubleshooting de produção.

## v2.2.12 (2026-04-17)

- **Nuvem (projetos):** gravações leves usam `PATCH` só nas colunas alteradas (`updateProjectPartialInSupabase`), evitando reenviar `plan_snapshot` inteiro a cada salvamento — reduz timeout e carga no PostgREST.
- **Cliente HTTP:** `fetch` do Supabase com limite de tempo (~70s) para não pendurar indefinidamente; escrita de projeto com corrida de timeout ajustada (60s) e mensagem citando RLS/rede/projeto pausado.
- **Sync:** modal de projeto, kanban leve, horas usadas, placement e cancelamento alinham nuvem + Dexie com `withDexieSupabaseSyncMuted`.

## v2.2.11 (2026-04-17)

- **Edição de projeto (nuvem):** salvamento com Supabase usa `withDexieSupabaseSyncMuted` para evitar upsert duplicado (explícito + hook Dexie) e normaliza `start_date`/`due_date` para `YYYY-MM-DD` no payload.
- **UX:** timeout de 45s no `upsert` de projeto com mensagem clara se a requisição não concluir (evita “Salvando…” indefinido por rede/Supabase pendente).

## v2.2.10 (2026-04-17)

- Bump de versão para disparar novo deploy (Vercel) e alinhar artefatos ao release **v2.2.10**.

## v2.2.9 (2026-04-17)

- **Segurança de dados (crítico):** o refresh do cache Dexie não apaga mais tabelas de domínio quando a API Supabase devolve **0 linhas** mas o IndexedDB ainda tem dados (cenário típico: RLS, sessão ou leitura vazia). Evita “sumir” todos os projetos na tela local. Para forçar substituição por vazio: `sessionStorage['implantacao_azoup_force_empty_remote_cache.v1'] = '1'` + reload (uso raro).
- **Perfis:** se `profiles` vier vazio da API, não limpamos mais a tabela local de usuários quando já existia cache.
- **Operação:** script SQL de diagnóstico em `supabase/sql/optional/B_diagnostics_readonly.sql`.

## v2.2.8 (2026-04-17)

- **Correção crítica de nuvem:** no Dexie 4, hooks `creating`/`updating` não aguardam `Promise`; o sync via hook para o Supabase era ignorado e a UI gravava só no IndexedDB. Hooks passam a ser best-effort em background; **gravação de projeto (e criação com fases/tarefas) agora faz `upsert` explícito no Supabase** antes ou após a mutação, com erro visível se RLS/rede falhar.
- **Tabelas opcionais:** erros PostgREST do tipo “Could not find the table … schema cache” (`audit_logs`, `project_deletion_logs`) são tratados como tabela ausente, sem abortar o restante do cache.

## v2.2.7 (2026-04-17)

- **Persistência em produção:** modo de dados padrão passa a ser nuvem (`cloud`) quando Supabase está configurado; `VITE_DATA_MODE=local` continua explícito para sandbox.
- **Modo teste local:** garantia de usuário admin local com senha quando não há login Dexie (após sync/cache só nuvem).
- **Configurações:** seção de persistência (nuvem x teste) para admin em localhost; override de modo com reload.
- **Operação Supabase:** orientação alinhada a RLS — analistas precisam de `can_edit_project` que inclua `analyst_id` (ou equivalente) para edições persistirem no banco.

## v2.2.3 (2026-04-16)

Release ampla após `v2.1.12`: documentação do projeto com edição (autor) e exclusão (autor/admin) com justificativa e trilha em logs de auditoria; paleta de fases/labels/kanban revisada para cores distintas e legíveis no tema escuro; demais melhorias acumuladas no período.


