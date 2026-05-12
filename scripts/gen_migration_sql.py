"""
Gera supabase/import/legacy_full_import_with_user_map.sql a partir dos CSVs do projeto antigo.
Execução: python scripts/gen_migration_sql.py
"""
from __future__ import annotations
import csv
import re
from collections import defaultdict
from pathlib import Path

SRC = Path(r"C:\Users\teste\Downloads\lovable_old_vyntask\dados_old")
OUT_DIR = Path(__file__).resolve().parents[1] / "supabase" / "import"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_SQL = OUT_DIR / "legacy_full_import_with_user_map.sql"


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
CODE_RE = re.compile(r"^(\d+(?:\.\d+)*)")


def rd(name: str) -> list[dict[str, str]]:
    p = SRC / name
    with p.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f, delimiter=";"))


def c(v: str | None) -> str:
    return (v or "").strip().replace("\t", "")


def sq(v: str | None) -> str:
    """SQL single-quoted string or NULL."""
    val = c(v)
    if not val:
        return "NULL"
    val = val.replace("'", "''")
    return f"'{val}'"


def sqnn(v: str | None, default: str = "") -> str:
    """SQL single-quoted string, never NULL (for NOT NULL text columns)."""
    val = c(v)
    if not val:
        val = default
    val = val.replace("'", "''")
    return f"'{val}'"


def sqbool(v: str | None) -> str:
    return "true" if c(v).lower() in ("true", "1", "t", "yes") else "false"


def sqnum(v: str | None, default: str = "0") -> str:
    val = c(v).replace("\t", "").replace(",", ".")
    try:
        float(val)
        return val
    except (ValueError, TypeError):
        return default


def extract_code(title: str, fallback: str) -> str:
    m = CODE_RE.match(c(title))
    return m.group(1) if m else fallback


# ---------------------------------------------------------------------------
# load CSVs
# ---------------------------------------------------------------------------
projects  = rd("projects-export-2026-04-14_12-29-42.csv")
phases    = rd("phases-export-2026-04-14_12-29-29.csv")
tasks     = rd("tasks-export-2026-04-14_12-30-10.csv")
events    = rd("events-export-2026-04-14_12-29-20.csv")
tlogs     = rd("time_logs-export-2026-04-14_12-29-06.csv")
contacts  = rd("contacts-export-2026-04-14_12-28-23.csv")
plabels   = rd("project_labels-export-2026-04-14_12-28-51.csv")
comments  = rd("comments-export-2026-04-14_12-29-13.csv")
analysts  = rd("analysts-export-2026-04-14_12-28-07.csv")
pmodels   = rd("plan_templates-export-2026-04-14_12-28-43.csv")
pphases   = rd("phase_templates-export-2026-04-14_12-28-29.csv")
ptasks    = rd("task_templates-export-2026-04-14_12-29-00.csv")

counts = {
    "projects": len(projects),
    "phases": len(phases),
    "tasks": len(tasks),
    "events": len(events),
    "time_logs": len(tlogs),
    "project_contacts": len(contacts),
    "labels": len(plabels),
    "comments": len(comments),
    "analysts": len(analysts),
    "plan_models": len(pmodels),
    "plan_phases": len(pphases),
    "plan_tasks": len(ptasks),
}

for k, v in counts.items():
    print(f"  {k}: {v}")

# ---------------------------------------------------------------------------
# build SQL
# ---------------------------------------------------------------------------
lines: list[str] = []

def w(*args: str) -> None:
    lines.extend(args)


w(
    "-- ============================================================",
    "-- Implantação Azoup — Legacy import (antigo Lovable → novo schema)",
    "-- Gerado por: scripts/gen_migration_sql.py",
    "-- Como usar:",
    "--   1. Abra o Supabase SQL Editor do NOVO projeto.",
    "--   2. Cole e rode este arquivo COMPLETO (ou em blocos na ordem abaixo).",
    "--   3. Antes de rodar, preencha a seção USER MAPPING abaixo com os",
    "--      UUIDs dos usuários no NOVO projeto (consulte auth.users).",
    "-- ============================================================",
    "",
    "-- PASSO 0: mapeamento de usuários antigos → novos",
    "-- Fallback automático: usa o primeiro user real do novo projeto quando o email não existir",
    "DROP TABLE IF EXISTS _user_map;",
    "CREATE TEMP TABLE _user_map (old_id uuid, new_id uuid);",
    "",
    "DO $$",
    "DECLARE",
    "  fallback_id uuid;",
    "BEGIN",
    "  SELECT id INTO fallback_id FROM auth.users ORDER BY created_at LIMIT 1;",
    "  IF fallback_id IS NULL THEN",
    "    RAISE EXCEPTION 'Nenhum usuário em auth.users. Crie pelo menos um usuário antes de importar.';",
    "  END IF;",
    "  RAISE NOTICE 'Fallback user ID: %', fallback_id;",
    "  INSERT INTO _user_map (old_id, new_id) VALUES",
    "    ('1b3f0696-10f9-4f50-a276-fb0f308914e4'::uuid,",
    "     COALESCE((SELECT id FROM auth.users WHERE email='admin@azoup.com' LIMIT 1), fallback_id)),",
    "    ('f455b795-4baf-41af-8d95-7aedf28c24dd'::uuid,",
    "     COALESCE((SELECT id FROM auth.users WHERE email='vinicius.azoup@gmail.com' LIMIT 1), fallback_id)),",
    "    ('9db00f78-2ff2-4f31-9367-063789a92e52'::uuid,",
    "     COALESCE((SELECT id FROM auth.users WHERE email='anderson.telis@azoup.com.br' LIMIT 1), fallback_id)),",
    "    ('502e71ad-4bc3-4b77-ba8e-bff120652d31'::uuid,",
    "     COALESCE((SELECT id FROM auth.users WHERE email='flavio@azoup.com.br' LIMIT 1), fallback_id));",
    "END $$;",
    "",
    "SELECT old_id, new_id FROM _user_map;",
    "",
    "CREATE OR REPLACE FUNCTION _map_user(p_old_id uuid) RETURNS uuid AS $$",
    "  SELECT COALESCE(",
    "    (SELECT new_id FROM _user_map WHERE old_id = p_old_id),",
    "    (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)",
    "  );",
    "$$ LANGUAGE sql;",
    "",
)

# ---------------------------------------------------------------------------
# ANALYSTS
# ---------------------------------------------------------------------------
w(
    "-- ============================================================",
    "-- 1. ANALYSTS",
    "-- ============================================================",
    "INSERT INTO public.analysts (id, name, avatar_url, color, active, created_at)",
    "VALUES",
)
analyst_vals = []
for r in analysts:
    analyst_vals.append(
        f"  ({sq(c(r['id']))}, {sq(c(r['nome']))}, {sq(c(r.get('avatar','')))}, {sq(c(r.get('color','#6366f1')) or '#6366f1')}, {sqbool(r.get('ativo','true'))}, {sq(c(r.get('created_at')))})"
    )
w(",\n".join(analyst_vals) + "\nON CONFLICT (id) DO UPDATE SET")
w("  name = EXCLUDED.name,")
w("  avatar_url = EXCLUDED.avatar_url,")
w("  color = EXCLUDED.color,")
w("  active = EXCLUDED.active;")
w("")

# ---------------------------------------------------------------------------
# PLAN MODELS / PHASES / TASKS — PULADOS INTENCIONALMENTE
# O novo projeto já tem estes templates seedados corretamente via
# supabase/sql/006_seed_builtin_plan_models.sql com UUIDs fixos.
# Inserir novamente causaria conflito na constraint UNIQUE(key).
# Os dados operacionais (projects, phases, tasks) não referenciam
# plan_model_id — usam plan_type (text) diretamente.
# ---------------------------------------------------------------------------
w(
    "-- ============================================================",
    "-- 2-4. PLAN MODELS / PLAN PHASES / PLAN TASKS",
    "-- PULADOS: use no SQL Editor, NESTA ORDEM (ver supabase/sql/README_RUN_ORDER.txt):",
    "--   supabase/sql/006_seed_builtin_plan_models.sql  (basic / pro / master)",
    "--   supabase/sql/007_seed_plan_phases_tasks.sql    (14 fases + 72 tarefas)",
    "-- Opcional — 4º catálogo \"Upsell\" espelhando dados_old (Lovable):",
    "--   supabase/sql/optional/A_seed_upsell_plan_from_lovable.sql",
    "-- Os CSVs em dados_old/plan_templates*, phase_templates*, task_templates*",
    "-- alimentaram o gerador do 007 (IDs de fase/tarefa dos 3 planos batem com o export).",
    "-- ============================================================",
    "",
)

# ---------------------------------------------------------------------------
# PROJECTS
# ---------------------------------------------------------------------------
w(
    "-- ============================================================",
    "-- 5. PROJECTS",
    f"-- {len(projects)} projetos",
    "-- ============================================================",
)

def kanban_from_status(status: str) -> str:
    s = c(status).lower()
    if s == "finalizado":
        return "finalizados"
    if s == "cancelado":
        return "cancelados"
    return "novos"


for r in projects:
    project_id = c(r["id"])
    project_name = sq(c(r["nome_projeto"]))
    plan_type = sq(c(r["tipo_plano"]))
    hours_c = sqnum(r.get("horas_contratadas", "0"))
    hours_u = sqnum(r.get("horas_utilizadas", "0"))
    start_d = sq(c(r.get("data_inicio", "")))
    due_d = sq(c(r.get("data_previsao", "")))
    status = c(r.get("status", "ativo"))
    owner_id = c(r.get("owner_id", ""))
    created_by = c(r.get("created_by", owner_id))
    created_at = sq(c(r.get("created_at", "")))
    kanban = sq(kanban_from_status(status))
    cnpj = sq(c(r.get("cnpj", "")))
    state_reg = sq(c(r.get("inscricao_estadual", "")))
    addr_rua = sq(c(r.get("endereco_rua", "")))
    addr_num = sq(c(r.get("endereco_numero", "")))
    addr_bairro = sq(c(r.get("endereco_bairro", "")))
    addr_cidade = sq(c(r.get("endereco_cidade", "")))
    addr_estado = sq(c(r.get("endereco_estado", "")))
    addr_cep = sq(c(r.get("endereco_cep", "")))
    addr_comp = sq(c(r.get("endereco_complemento", "")))
    w(
        f"INSERT INTO public.projects",
        f"  (id, project_name, plan_type, hours_contracted, hours_used, start_date, due_date, status,",
        f"   owner_id, created_by, created_at, kanban_column,",
        f"   cnpj, state_registration, address_street, address_number, address_neighborhood,",
        f"   address_city, address_state, cep, address_complement)",
        f"VALUES",
        f"  ('{project_id}', {project_name}, {plan_type}, {hours_c}, {hours_u}, {start_d}, {due_d}, '{status}',",
        f"   _map_user('{owner_id}'), _map_user('{created_by}'), {created_at}, {kanban},",
        f"   {cnpj}, {state_reg}, {addr_rua}, {addr_num}, {addr_bairro},",
        f"   {addr_cidade}, {addr_estado}, {addr_cep}, {addr_comp})",
        f"ON CONFLICT (id) DO UPDATE SET",
        f"  project_name = EXCLUDED.project_name,",
        f"  hours_contracted = EXCLUDED.hours_contracted,",
        f"  hours_used = EXCLUDED.hours_used,",
        f"  status = EXCLUDED.status;",
        "",
    )

# ---------------------------------------------------------------------------
# PHASES
# ---------------------------------------------------------------------------
w(
    "-- ============================================================",
    f"-- 6. PHASES ({len(phases)} fases)",
    "-- ============================================================",
    "INSERT INTO public.phases (id, project_id, name, order_index, status)",
    "VALUES",
)
ph_vals = []
for r in phases:
    ph_vals.append(
        f"  ({sq(c(r['id']))}, {sq(c(r['projeto_id']))}, {sq(c(r['nome']))}, {sqnum(r.get('ordem','0'))}, {sq(c(r.get('status','bloqueada')))})"
    )
w(",\n".join(ph_vals) + "\nON CONFLICT (id) DO UPDATE SET")
w("  name = EXCLUDED.name,")
w("  order_index = EXCLUDED.order_index,")
w("  status = EXCLUDED.status;")
w("")

# ---------------------------------------------------------------------------
# TASKS
# ---------------------------------------------------------------------------
w(
    "-- ============================================================",
    f"-- 7. TASKS ({len(tasks)} tarefas)",
    "-- ============================================================",
)
task_sort: dict[str, int] = defaultdict(int)
for r in tasks:
    task_id = c(r["id"])
    title = c(r["titulo"])
    phase_id = c(r["fase_id"])
    task_sort[phase_id] += 1
    code = extract_code(title, str(task_sort[phase_id]))
    desc = sqnn(c(r.get("descricao", "")))
    project_id = c(r["projeto_id"])
    status = c(r.get("status", "pendente"))
    # map old status 'cancelado' → 'cancelado' (new schema has it), em_andamento ok, concluida ok
    priority = c(r.get("prioridade", "media"))
    est_h = sqnum(r.get("horas_estimadas", "0"))
    act_h = sqnum(r.get("horas_realizadas", "0"))
    due_d = sq(c(r.get("prazo", "")))
    is_info = sqbool(r.get("is_informational", "false"))
    created_at = sq(c(r.get("created_at", "")))
    w(
        f"INSERT INTO public.tasks",
        f"  (id, title, description, project_id, phase_id, status, priority,",
        f"   estimated_hours, actual_hours, due_date, is_informational, created_at, code, sort_order)",
        f"VALUES",
        f"  ({sq(task_id)}, {sq(title)}, {desc}, '{project_id}', '{phase_id}', '{status}', '{priority}',",
        f"   {est_h}, {act_h}, {due_d}, {is_info}, {created_at}, {sq(code)}, {task_sort[phase_id]})",
        f"ON CONFLICT (id) DO NOTHING;",
        "",
    )

# ---------------------------------------------------------------------------
# EVENTS
# ---------------------------------------------------------------------------
w(
    "-- ============================================================",
    f"-- 8. EVENTS ({len(events)} eventos)",
    "-- ============================================================",
)
for r in events:
    eid = c(r["id"])
    title = sq(c(r["titulo"]))
    desc = sqnn(c(r.get("descricao", "")))
    start = sq(c(r["data_inicio"]))
    end = sq(c(r["data_fim"]))
    status = c(r.get("status", "agendado"))
    proj = c(r.get("projeto_id", ""))
    task = c(r.get("tarefa_id", ""))
    meet = sq(c(r.get("link_reuniao", "")))
    rec = sq(c(r.get("link_gravacao", "")))
    cat = sq(c(r.get("created_at", "")))
    proj_sql = f"'{proj}'" if proj else "NULL"
    task_sql = f"'{task}'" if task else "NULL"
    w(
        f"INSERT INTO public.events",
        f"  (id, title, description, start_time, end_time, status, project_id, task_id, meeting_link, recording_link, created_at)",
        f"VALUES",
        f"  ('{eid}', {title}, {desc}, {start}, {end}, '{status}', {proj_sql}, {task_sql}, {meet}, {rec}, {cat})",
        f"ON CONFLICT (id) DO NOTHING;",
        "",
    )

# ---------------------------------------------------------------------------
# TIME LOGS
# ---------------------------------------------------------------------------
w(
    "-- ============================================================",
    f"-- 9. TIME LOGS ({len(tlogs)} registros)",
    "-- ============================================================",
)
for r in tlogs:
    lid = c(r["id"])
    task_id = c(r["tarefa_id"])
    user_id = c(r.get("responsavel_id", "") or r.get("created_by", ""))
    hours = sqnum(r.get("horas", "0"))
    log_type = c(r.get("status", "executado"))
    notes = sqnn(c(r.get("notas", "")))
    exec_date = sq(c(r.get("data_execucao", "")))
    locked = sqbool(r.get("is_locked", "false"))
    # validate hours – skip entries with crazy values (like 30 that were test data)
    try:
        h_val = float(hours)
    except ValueError:
        h_val = 0
    if abs(h_val) > 24:
        hours = "0"
    w(
        f"INSERT INTO public.time_logs",
        f"  (id, task_id, user_id, hours, log_type, notes, execution_date, is_locked)",
        f"VALUES",
        f"  ('{lid}', '{task_id}', _map_user('{user_id}'), {hours}, '{log_type}', {notes}, {exec_date}, {locked})",
        f"ON CONFLICT (id) DO NOTHING;",
        "",
    )

# ---------------------------------------------------------------------------
# PROJECT CONTACTS
# ---------------------------------------------------------------------------
w(
    "-- ============================================================",
    f"-- 10. PROJECT CONTACTS ({len(contacts)} contatos)",
    "-- ============================================================",
)
if contacts:
    pc_vals = []
    for r in contacts:
        phone_raw = c(r.get("telefone", ""))
        pc_vals.append(
            f"  ({sq(c(r['id']))}, {sq(c(r['projeto_id']))}, {sqnn(c(r['nome']))}, {sqnn(phone_raw)}, {sqnn(c(r.get('cargo','')))})"
        )
    w(
        "INSERT INTO public.project_contacts (id, project_id, name, phone, role)",
        "VALUES",
    )
    w(",\n".join(pc_vals) + "\nON CONFLICT (id) DO NOTHING;")
    w("")

# ---------------------------------------------------------------------------
# LABELS (project_labels)
# ---------------------------------------------------------------------------
w(
    "-- ============================================================",
    f"-- 11. LABELS ({len(plabels)} labels)",
    "-- ============================================================",
)
status_map = {"not_started": "not_started", "in_progress": "in_progress", "completed": "completed"}
label_vals = []
for r in plabels:
    old_status = c(r.get("status", "not_started")).lower()
    new_status = status_map.get(old_status, "not_started")
    label_vals.append(
        f"  ({sq(c(r['id']))}, {sq(c(r['projeto_id']))}, {sqnn(c(r['codigo']))}, {sqnn(c(r['texto']))}, '{new_status}')"
    )
w(
    "INSERT INTO public.labels (id, project_id, code, name, status)",
    "VALUES",
)
w(",\n".join(label_vals) + "\nON CONFLICT (id) DO NOTHING;")
w("")

# ---------------------------------------------------------------------------
# COMMENTS
# ---------------------------------------------------------------------------
w(
    "-- ============================================================",
    f"-- 12. COMMENTS ({len(comments)} comentários)",
    "-- ============================================================",
)
for r in comments:
    cid = c(r["id"])
    content = sqnn(c(r.get("conteudo", "")))
    author_id = c(r.get("created_by", ""))
    proj = c(r.get("project_id", ""))
    task = c(r.get("task_id", ""))
    event = c(r.get("event_id", ""))
    cat = sq(c(r.get("created_at", "")))
    proj_sql = f"'{proj}'" if proj else "NULL"
    task_sql = f"'{task}'" if task else "NULL"
    event_sql = f"'{event}'" if event else "NULL"
    w(
        f"INSERT INTO public.comments",
        f"  (id, content, author_id, project_id, task_id, event_id, created_at)",
        f"VALUES",
        f"  ('{cid}', {content}, _map_user('{author_id}'), {proj_sql}, {task_sql}, {event_sql}, {cat})",
        f"ON CONFLICT (id) DO NOTHING;",
        "",
    )

# ---------------------------------------------------------------------------
# cleanup
# ---------------------------------------------------------------------------
w(
    "-- ============================================================",
    "-- Limpeza e verificação",
    "-- ============================================================",
    "DROP FUNCTION IF EXISTS _map_user(uuid);",
    "DROP TABLE IF EXISTS _user_map;",
    "",
    "-- Rode para verificar:",
    "SELECT 'projects'        AS t, count(*) FROM public.projects",
    "UNION ALL SELECT 'phases',         count(*) FROM public.phases",
    "UNION ALL SELECT 'tasks',          count(*) FROM public.tasks",
    "UNION ALL SELECT 'events',         count(*) FROM public.events",
    "UNION ALL SELECT 'time_logs',      count(*) FROM public.time_logs",
    "UNION ALL SELECT 'project_contacts', count(*) FROM public.project_contacts",
    "UNION ALL SELECT 'labels',         count(*) FROM public.labels",
    "UNION ALL SELECT 'comments',       count(*) FROM public.comments",
    "UNION ALL SELECT 'analysts',       count(*) FROM public.analysts",
    "UNION ALL SELECT 'plan_models',    count(*) FROM public.plan_models",
    "UNION ALL SELECT 'plan_phases',    count(*) FROM public.plan_phases",
    "UNION ALL SELECT 'plan_tasks',     count(*) FROM public.plan_tasks",
    "ORDER BY t;",
)

# ---------------------------------------------------------------------------
# write file
# ---------------------------------------------------------------------------
sql_content = "\n".join(lines)
OUT_SQL.write_text(sql_content, encoding="utf-8")
print(f"\nGerado: {OUT_SQL}")
print(f"Linhas SQL: {len(lines)}")
for k, v in counts.items():
    print(f"  {k}: {v}")
