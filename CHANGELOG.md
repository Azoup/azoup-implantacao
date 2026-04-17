# Changelog

## v2.2.9 (2026-04-17)

- **Segurança de dados (crítico):** o refresh do cache Dexie não apaga mais tabelas de domínio quando a API Supabase devolve **0 linhas** mas o IndexedDB ainda tem dados (cenário típico: RLS, sessão ou leitura vazia). Evita “sumir” todos os projetos na tela local. Para forçar substituição por vazio: `sessionStorage['vyntask_force_empty_remote_cache.v1'] = '1'` + reload (uso raro).
- **Perfis:** se `profiles` vier vazio da API, não limpamos mais a tabela local de usuários quando já existia cache.
- **Operação:** script SQL de diagnóstico em `supabase/sql/009_diagnostics_verification.sql`.

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
