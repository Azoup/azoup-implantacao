# Supabase SQL Flow

Ordem recomendada para um ambiente novo:

1. `sql/001_profiles.sql`
2. Demais arquivos estruturais da pasta `sql/` (na ordem numérica)
3. `sql/005_seed_builtin_plan_models.sql`
4. `sql/007_seed_plan_phases_tasks.sql`
5. `sql/008_audit_logs.sql`

## Migração de legado (quando aplicável)

Depois da estrutura base:

1. `import/006_legacy_import.sql` (carga principal de dados legados)
2. `import/008_restore_project_docs_comments.sql` (reparo/restauração de comentários/documentação)

## Notas operacionais

- `007_seed_plan_phases_tasks.sql` é idempotente via `ON CONFLICT (id) DO UPDATE`.
- `008_audit_logs.sql` cria as tabelas `audit_logs` e `project_deletion_logs` (com RLS e grants)
  usadas para sincronizar trilha de auditoria entre app local e Supabase.
- `008_restore_project_docs_comments.sql` deve ser usado quando houver necessidade de restaurar
  documentação/comentários após carga principal.
- Os geradores Python em `scripts/` podem ser usados para regenerar SQLs de import quando a base
  de origem mudar.
