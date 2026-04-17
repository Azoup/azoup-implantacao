# Supabase SQL — VynTask

**Índice principal:** `sql/README_RUN_ORDER.txt` (ordem de execução, risco, import legado).

## Pipeline base (novo ambiente)

Na pasta `sql/`, na ordem numérica até `008`:

1. `001_profiles.sql`
2. `002_core_domain.sql`
3. `003_storage.sql`
4. `004_realtime.sql`
5. `005_audit_logs.sql`
6. `006_seed_builtin_plan_models.sql`
7. `007_seed_plan_phases_tasks.sql` — idempotente (`ON CONFLICT … DO UPDATE`)
8. `008_analysts_profile_link.sql` — coluna `analysts.profile_id` e função `can_edit_project`

## Opcional / pontual / manutenção

- `sql/optional/` — catálogo extra (Upsell), diagnósticos somente leitura.
- `sql/one_time/` — scripts específicos de ambiente (ex.: merge de analistas); **editar antes**.
- `sql/maintenance/` — `UPDATE` em dados (ex.: deduplicar título de tarefa).

## Import legado (alto risco se mal configurado)

Pasta `import/`:

1. `legacy_full_import_with_user_map.sql` — ajustar `_user_map` no topo.
2. `legacy_restore_project_docs_comments.sql` — só se precisar repor docs/comentários.

**Não** restaure um dump antigo por cima de dados já atualizados pelo app; use clone de projeto ou export seletivo.

## Geradores

Em `scripts/`: `gen_plan_templates_sql.py`, `gen_migration_sql.py`, `gen_project_docs_sql.py` — saídas alinhadas aos nomes atuais dos `.sql`.
