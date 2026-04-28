# Changelog

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
