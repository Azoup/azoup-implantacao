"""
Gera supabase/sql/007_seed_plan_phases_tasks.sql
Popula plan_phases e plan_tasks usando os dados reais do projeto antigo,
remapeando os plan_model_ids para os UUIDs fixos do novo projeto.

Execução: python scripts/gen_plan_templates_sql.py
"""
from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path
import re

SRC = Path(r"C:\Users\teste\Downloads\lovable_old_vyntask\dados_old")
OUT = Path(__file__).resolve().parents[1] / "supabase" / "sql" / "007_seed_plan_phases_tasks.sql"

# Mapeamento: UUID antigo do plan_template → UUID fixo do novo plan_model
OLD_TO_NEW_MODEL: dict[str, str] = {
    "adb2ede0-ea69-431c-81a8-dc488b7399e5": "a1111111-1111-4111-8111-111111111111",  # Basic  30h
    "367f22a3-8e2d-4984-86f1-ab3103168481": "a2222222-2222-4222-8222-222222222222",  # Pró    50h
    "2e45228f-6820-45ee-844d-8c95e924b6ad": "a3333333-3333-4333-8333-333333333333",  # Master 70h
    # "8acf86d8-121f-4f00-80e7-f1d3dc6ba81a" → Upsell (customizado, não incluído)
}

CODE_RE = re.compile(r"^(\d+(?:\.\d+)*)")


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


def sqbool(v: str | None) -> str:
    return "true" if c(v).lower() in ("true", "1", "t", "yes") else "false"


def sqnum(v: str | None) -> str:
    val = c(v).replace(",", ".")
    try:
        float(val)
        return val
    except (ValueError, TypeError):
        return "0"


def extract_code(title: str, fallback: str) -> str:
    m = CODE_RE.match(c(title))
    return m.group(1) if m else fallback


# ---------------------------------------------------------------------------
pphases = rd("phase_templates-export-2026-04-14_12-28-29.csv")
ptasks  = rd("task_templates-export-2026-04-14_12-29-00.csv")

# Filtrar apenas fases dos 3 planos padrão (ignorar Upsell)
pphases_filtered = [r for r in pphases if c(r["plan_template_id"]) in OLD_TO_NEW_MODEL]
# Coletar IDs das fases incluídas para filtrar tarefas órfãs
included_phase_ids = {c(r["id"]) for r in pphases_filtered}
ptasks_filtered = [r for r in ptasks if c(r["phase_template_id"]) in included_phase_ids]

print(f"Fases modelo (planos padrão): {len(pphases_filtered)} de {len(pphases)} total")
print(f"Tarefas modelo: {len(ptasks_filtered)} de {len(ptasks)} total")

# ---------------------------------------------------------------------------
lines: list[str] = []


def w(*args: str) -> None:
    lines.extend(args)


w(
    "-- ============================================================",
    "-- VynTask — Seed: fases e tarefas dos modelos de plano",
    "-- Gerado por: scripts/gen_plan_templates_sql.py",
    "-- Fonte: dados reais do projeto antigo (Lovable)",
    "-- Pré-requisito: 005_seed_builtin_plan_models.sql já rodado",
    "-- Seguro rodar novamente: ON CONFLICT DO NOTHING",
    "-- ============================================================",
    "",
    "-- Quantidades esperadas:",
    f"-- plan_phases : {len(pphases_filtered)}",
    f"-- plan_tasks  : {len(ptasks_filtered)}",
    "",
)

# ---------------------------------------------------------------------------
# PLAN PHASES
# ---------------------------------------------------------------------------
w(
    "-- ------------------------------------------------------------",
    "-- PLAN PHASES",
    "-- ------------------------------------------------------------",
    "INSERT INTO public.plan_phases (id, plan_model_id, name, order_index)",
    "VALUES",
)
phase_rows: list[str] = []
for r in pphases_filtered:
    old_model_id = c(r["plan_template_id"])
    new_model_id = OLD_TO_NEW_MODEL[old_model_id]
    phase_rows.append(
        f"  ({sq(c(r['id']))}, '{new_model_id}', {sq(c(r['nome']))}, {sqnum(r.get('ordem', '0'))})"
    )
w(",\n".join(phase_rows))
w("ON CONFLICT (id) DO UPDATE SET")
w("  name = EXCLUDED.name,")
w("  order_index = EXCLUDED.order_index;")
w("")

# ---------------------------------------------------------------------------
# PLAN TASKS
# ---------------------------------------------------------------------------
w(
    "-- ------------------------------------------------------------",
    "-- PLAN TASKS",
    "-- ------------------------------------------------------------",
    "INSERT INTO public.plan_tasks",
    "  (id, plan_phase_id, code, title, description, estimated_hours, is_informational, sort_order)",
    "VALUES",
)
sort_by_phase: dict[str, int] = defaultdict(int)
task_rows: list[str] = []
for r in ptasks_filtered:
    phase_id = c(r["phase_template_id"])
    sort_by_phase[phase_id] += 1
    title = c(r["titulo"])
    code = extract_code(title, str(sort_by_phase[phase_id]))
    task_rows.append(
        f"  ({sq(c(r['id']))}, {sq(phase_id)}, {sq(code)}, {sq(title)}, "
        f"{sq(c(r.get('descricao', '')))}, {sqnum(r.get('horas_estimadas', '0'))}, "
        f"{sqbool(r.get('is_informational', 'false'))}, {sort_by_phase[phase_id]})"
    )
w(",\n".join(task_rows))
w("ON CONFLICT (id) DO UPDATE SET")
w("  title = EXCLUDED.title,")
w("  description = EXCLUDED.description,")
w("  estimated_hours = EXCLUDED.estimated_hours,")
w("  is_informational = EXCLUDED.is_informational,")
w("  sort_order = EXCLUDED.sort_order;")
w("")

# ---------------------------------------------------------------------------
# Verificação
# ---------------------------------------------------------------------------
w(
    "-- ------------------------------------------------------------",
    "-- Verificação (rode após o insert)",
    "-- ------------------------------------------------------------",
    "SELECT",
    "  pm.key,",
    "  pm.name  AS plano,",
    "  pp.name  AS fase,",
    "  pp.order_index,",
    "  count(pt.id) AS qtd_tarefas,",
    "  sum(pt.estimated_hours) AS horas_estimadas",
    "FROM public.plan_models pm",
    "JOIN public.plan_phases pp ON pp.plan_model_id = pm.id",
    "LEFT JOIN public.plan_tasks pt ON pt.plan_phase_id = pp.id",
    "GROUP BY pm.key, pm.name, pp.name, pp.order_index",
    "ORDER BY pm.key, pp.order_index;",
)

# ---------------------------------------------------------------------------
OUT.write_text("\n".join(lines), encoding="utf-8")
print(f"\nGerado: {OUT}")
print(f"Linhas SQL: {len(lines)}")
