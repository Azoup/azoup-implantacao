# Changelog

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
- **Hooks Dexie→PostgREST:** retry com backoff (mesma política de tentativas do sync de grafo) e `CustomEvent` `vyntask-sync-failure` com toast limitado por tabela no `UiFeedbackProvider`.
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

- **Segurança de dados (crítico):** o refresh do cache Dexie não apaga mais tabelas de domínio quando a API Supabase devolve **0 linhas** mas o IndexedDB ainda tem dados (cenário típico: RLS, sessão ou leitura vazia). Evita “sumir” todos os projetos na tela local. Para forçar substituição por vazio: `sessionStorage['vyntask_force_empty_remote_cache.v1'] = '1'` + reload (uso raro).
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


