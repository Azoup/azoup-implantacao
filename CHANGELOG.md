# Changelog

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
