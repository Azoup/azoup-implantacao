================================================================================
VynTask — Supabase SQL: ordem de execução e nível de risco
================================================================================

LEIA ANTES DE RODAR QUALQUER SCRIPT EM PRODUÇÃO.

- Backup (snapshot / pg_dump) é recomendado, mas NÃO restaure um dump antigo por cima
  de um banco que já recebeu dados novos da aplicação — você perderia trabalho atual.
  Use backup para ROLLBACK pontual ou ambiente paralelo (clone do projeto Supabase).

--------------------------------------------------------------------------------
A) PIPELINE BASE (novo projeto ou schema do zero) — pasta supabase/sql/, raiz
   Efeito: cria estrutura + seeds idempotentes. Sem DELETE em massa.
   Ordem fixa:

   1. 001_profiles.sql
   2. 002_core_domain.sql
   3. 003_storage.sql
   4. 004_realtime.sql
   5. 005_audit_logs.sql
   6. 006_seed_builtin_plan_models.sql
   7. 007_seed_plan_phases_tasks.sql
   8. 008_analysts_profile_link.sql   ← coluna analysts.profile_id + RLS can_edit_project

   Em banco JÁ em uso: rode só os arquivos que ainda não foram aplicados (ex.: só 008).

--------------------------------------------------------------------------------
B) OPCIONAL — pasta supabase/sql/optional/
   Não altera dados operacionais, exceto onde indicado.

   - A_seed_upsell_plan_from_lovable.sql  → INSERT catálogo extra (key upsell).
   - B_diagnostics_readonly.sql           → só SELECT / relatórios (seguro).

--------------------------------------------------------------------------------
C) PONTUAL / ALTO RISCO — pasta supabase/sql/one_time/
   Leia o cabeçalho de CADA arquivo. Podem conter UUIDs de UM ambiente específico.

   - A_merge_vinicius_ANALYST_EDIT_UUIDs_before_run.sql
     EXEMPLO de merge de analistas duplicados — EDITE os UUIDs ou não rode.

--------------------------------------------------------------------------------
D) MANUTENÇÃO DE DADOS — pasta supabase/sql/maintenance/
   Altera conteúdo (UPDATE). Revise WHERE, faça SELECT de pré-checagem, rode em janela controlada.

   - A_dedupe_task_title_remove_code_prefix.sql  → limpa prefixo redundante em title.

--------------------------------------------------------------------------------
E) IMPORT LEGADO (Lovable) — pasta supabase/import/
   Carga massiva + mapeamento de usuários. Risco de duplicar ou misturar donos se o mapa
   estiver errado. NÃO é idempotente para todo o dataset (ON CONFLICT em partes).

   1. legacy_full_import_with_user_map.sql
      → Ajuste o bloco _user_map (emails / UUIDs) ANTES de rodar.
   2. legacy_restore_project_docs_comments.sql
      → Só se precisar repor docs/comentários; pode sobrescrever conteúdo se reexecutado mal.

--------------------------------------------------------------------------------
Geradores Python (regeneram arquivos acima a partir de CSVs):

   scripts/gen_plan_templates_sql.py   → sql/007_seed_plan_phases_tasks.sql
   scripts/gen_migration_sql.py        → import/legacy_full_import_with_user_map.sql
   scripts/gen_project_docs_sql.py     → import/legacy_restore_project_docs_comments.sql

================================================================================
