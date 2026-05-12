# Supabase SQL — Implantação Azoup

**Índice principal:** `sql/README_RUN_ORDER.txt` (ordem de execução, risco, import legado).

## Identificadores legados no banco (não renomeados automaticamente)

Para não quebrar ambientes já provisionados, estes nomes **podem continuar como `vyntask`** até você planejar migração:

| Onde | Id legado | O que fazer se quiser renomear |
|------|-----------|--------------------------------|
| **Storage** | Bucket `vyntask` | Criar novo bucket, copiar objetos, atualizar políticas RLS e todo `storage.from('…')` no app; depois remover o antigo. |
| **Postgres** | Função `public.vyntask_set_updated_at` | `ALTER FUNCTION` / triggers que referenciam o nome; coordenar com `010_public_functions_search_path.sql` e `optional/D_domain_row_versioning_updated_at.sql`. |
| **IndexedDB (só no browser)** | Nome `vyntask_db` | Definido em `src/db/database.ts`; mudar sem rotina de migração **apaga** dados offline locais. |

Nada disso é obrigatório só por causa do rebranding — só se você quiser **100%** sem o termo nos identificadores.

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

Após o pipeline base, em bancos já em uso, aplique também conforme necessidade:

- `009_tasks_is_ad_hoc.sql` — depois: `VITE_SYNC_TASK_IS_AD_HOC=1` no app.
- `016_projects_manual_checkin.sql` — depois: `VITE_SYNC_PROJECT_MANUAL_CHECKIN=1` no app (senão check-in fica só no IndexedDB).

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
