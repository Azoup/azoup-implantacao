"""
Gera SQL de recuperação de documentação/comentários por projeto
do dataset antigo (Lovable) para o schema atual.

Saída:
  supabase/import/legacy_restore_project_docs_comments.sql
"""
from __future__ import annotations

import csv
from pathlib import Path

SRC = Path(r"C:\Users\teste\Downloads\lovable_old_vyntask\dados_old")
OUT = Path(__file__).resolve().parents[1] / "supabase" / "import" / "legacy_restore_project_docs_comments.sql"


def rd(name: str) -> list[dict[str, str]]:
    with (SRC / name).open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))


def c(v: str | None) -> str:
    return (v or "").strip().replace("\t", "")


def sq(v: str | None) -> str:
    val = c(v)
    if not val:
        return "NULL"
    return "'" + val.replace("'", "''") + "'"


def sqnn(v: str | None, default: str = "") -> str:
    val = c(v) or default
    return "'" + val.replace("'", "''") + "'"


comments = rd("comments-export-2026-04-14_12-29-13.csv")
tasks = rd("tasks-export-2026-04-14_12-30-10.csv")
task_to_project = {c(t["id"]): c(t["projeto_id"]) for t in tasks if c(t.get("id")) and c(t.get("projeto_id"))}

project_rows = [r for r in comments if c(r.get("target_type")) == "project"]
task_rows = [r for r in comments if c(r.get("target_type")) == "task"]

lines: list[str] = []


def w(*args: str) -> None:
    lines.extend(args)


w(
    "-- ============================================================",
    "-- VynTask — Restore documentação/comentários de projetos (old -> new)",
    "-- Gerado por: scripts/gen_project_docs_sql.py",
    "-- Seguro para reexecução: ON CONFLICT (id) DO UPDATE",
    "-- ============================================================",
    "",
    f"-- Comentários de projeto: {len(project_rows)}",
    f"-- Comentários de tarefa  : {len(task_rows)} (também recuperados)",
    "",
    "-- Mapeamento de usuários (old -> new, com fallback)",
    "DROP TABLE IF EXISTS _user_map;",
    "CREATE TEMP TABLE _user_map (old_id uuid, new_id uuid);",
    "DO $$",
    "DECLARE",
    "  fallback_id uuid;",
    "BEGIN",
    "  SELECT id INTO fallback_id FROM auth.users ORDER BY created_at LIMIT 1;",
    "  IF fallback_id IS NULL THEN",
    "    RAISE EXCEPTION 'Nenhum usuário em auth.users. Crie pelo menos um usuário antes de importar.';",
    "  END IF;",
    "  INSERT INTO _user_map (old_id, new_id) VALUES",
    "    ('1b3f0696-10f9-4f50-a276-fb0f308914e4'::uuid, COALESCE((SELECT id FROM auth.users WHERE email='admin@azoup.com' LIMIT 1), fallback_id)),",
    "    ('f455b795-4baf-41af-8d95-7aedf28c24dd'::uuid, COALESCE((SELECT id FROM auth.users WHERE email='vinicius.azoup@gmail.com' LIMIT 1), fallback_id)),",
    "    ('9db00f78-2ff2-4f31-9367-063789a92e52'::uuid, COALESCE((SELECT id FROM auth.users WHERE email='anderson.telis@azoup.com.br' LIMIT 1), fallback_id)),",
    "    ('502e71ad-4bc3-4b77-ba8e-bff120652d31'::uuid, COALESCE((SELECT id FROM auth.users WHERE email='flavio@azoup.com.br' LIMIT 1), fallback_id));",
    "END $$;",
    "",
    "CREATE OR REPLACE FUNCTION _map_user(p_old_id uuid) RETURNS uuid AS $$",
    "  SELECT COALESCE(",
    "    (SELECT new_id FROM _user_map WHERE old_id = p_old_id),",
    "    (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)",
    "  );",
    "$$ LANGUAGE sql;",
    "",
    "-- ============================================================",
    "-- Inserção de comentários/documentação",
    "-- ============================================================",
)

# 1) Project comments (main docs)
for r in project_rows:
    cid = c(r.get("id"))
    content = sqnn(r.get("conteudo"), "")
    created_at = sq(c(r.get("created_at")))
    old_author = c(r.get("created_by"))
    project_id = c(r.get("project_id")) or c(r.get("target_id"))
    if not cid or not project_id:
        continue
    w(
        "INSERT INTO public.comments",
        "  (id, content, author_id, project_id, task_id, event_id, created_at, updated_at, doc_links, doc_attachments)",
        "VALUES",
        f"  ('{cid}', {content}, _map_user('{old_author}'), '{project_id}', NULL, NULL, {created_at}, NULL, '[]'::jsonb, '[]'::jsonb)",
        "ON CONFLICT (id) DO UPDATE SET",
        "  content = EXCLUDED.content,",
        "  project_id = EXCLUDED.project_id,",
        "  updated_at = now();",
        "",
    )

# 2) Task comments (preserve project relationship too)
for r in task_rows:
    cid = c(r.get("id"))
    content = sqnn(r.get("conteudo"), "")
    created_at = sq(c(r.get("created_at")))
    old_author = c(r.get("created_by"))
    task_id = c(r.get("task_id")) or c(r.get("target_id"))
    project_id = c(r.get("project_id"))
    if not project_id and task_id:
        project_id = task_to_project.get(task_id, "")
    if not cid or not task_id:
        continue
    proj_sql = f"'{project_id}'" if project_id else "NULL"
    w(
        "INSERT INTO public.comments",
        "  (id, content, author_id, project_id, task_id, event_id, created_at, updated_at, doc_links, doc_attachments)",
        "VALUES",
        f"  ('{cid}', {content}, _map_user('{old_author}'), {proj_sql}, '{task_id}', NULL, {created_at}, NULL, '[]'::jsonb, '[]'::jsonb)",
        "ON CONFLICT (id) DO UPDATE SET",
        "  content = EXCLUDED.content,",
        "  project_id = EXCLUDED.project_id,",
        "  task_id = EXCLUDED.task_id,",
        "  updated_at = now();",
        "",
    )

w(
    "-- Verificação",
    "SELECT p.project_name, count(c.id) AS qtd_docs",
    "FROM public.projects p",
    "LEFT JOIN public.comments c ON c.project_id = p.id",
    "GROUP BY p.project_name",
    "ORDER BY qtd_docs DESC, p.project_name;",
    "",
    "DROP FUNCTION IF EXISTS _map_user(uuid);",
    "DROP TABLE IF EXISTS _user_map;",
)

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text("\n".join(lines), encoding="utf-8")
print(f"Gerado: {OUT}")
print(f"Projeto comments: {len(project_rows)} | Task comments: {len(task_rows)}")
