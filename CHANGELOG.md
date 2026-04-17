# Changelog

## v2.2.7 (2026-04-17)

- **Persistência em produção:** modo de dados padrão passa a ser nuvem (`cloud`) quando Supabase está configurado; `VITE_DATA_MODE=local` continua explícito para sandbox.
- **Modo teste local:** garantia de usuário admin local com senha quando não há login Dexie (após sync/cache só nuvem).
- **Configurações:** seção de persistência (nuvem x teste) para admin em localhost; override de modo com reload.
- **Operação Supabase:** orientação alinhada a RLS — analistas precisam de `can_edit_project` que inclua `analyst_id` (ou equivalente) para edições persistirem no banco.

## v2.2.3 (2026-04-16)

Release ampla após `v2.1.12`: documentação do projeto com edição (autor) e exclusão (autor/admin) com justificativa e trilha em logs de auditoria; paleta de fases/labels/kanban revisada para cores distintas e legíveis no tema escuro; demais melhorias acumuladas no período.
