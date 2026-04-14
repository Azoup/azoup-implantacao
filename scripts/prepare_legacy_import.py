"""
Fluxo alternativo/manual para preparar CSVs normalizados de legado.

Uso recomendado no projeto atual:
- Preferir os SQLs versionados em `supabase/import/` para migração padrão.
- Usar este script quando for necessário regenerar insumos CSV intermediários.
"""

from __future__ import annotations

import csv
import re
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = Path(r"C:\Users\teste\Downloads")
OUTPUT_DIR = ROOT / "supabase" / "import" / "legacy_2026_04_14"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle, delimiter=";")
        return list(reader)


def write_csv(path: Path, rows: list[dict[str, str]], columns: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, delimiter=";")
        writer.writeheader()
        for row in rows:
            writer.writerow({col: row.get(col, "") for col in columns})


def clean(value: str | None) -> str:
    return (value or "").strip()


def map_project_status_to_kanban(status: str) -> str:
    normalized = clean(status).lower()
    if normalized == "finalizado":
        return "finalizados"
    if normalized == "cancelado":
        return "cancelados"
    return "novos"


CODE_RE = re.compile(r"^(\d+(?:\.\d+)*)")


def extract_code_from_title(title: str, fallback: str) -> str:
    match = CODE_RE.match(clean(title))
    if match:
        return match.group(1)
    return fallback


def normalize_projects(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for row in rows:
        created_at = clean(row.get("created_at"))
        status = clean(row.get("status")) or "ativo"
        normalized.append(
            {
                "id": clean(row.get("id")),
                "project_name": clean(row.get("nome_projeto")),
                "plan_type": clean(row.get("tipo_plano")),
                "hours_contracted": clean(row.get("horas_contratadas")) or "0",
                "hours_used": clean(row.get("horas_utilizadas")) or "0",
                "start_date": clean(row.get("data_inicio")),
                "due_date": clean(row.get("data_previsao")),
                "status": status,
                "owner_id": clean(row.get("owner_id")),
                "analyst_id": "",
                "created_by": clean(row.get("created_by")) or clean(row.get("owner_id")),
                "created_at": created_at,
                "kanban_column": map_project_status_to_kanban(status),
                "cnpj": clean(row.get("cnpj")),
                "razao_social": "",
                "trade_name": "",
                "cep": clean(row.get("endereco_cep")),
                "address_street": clean(row.get("endereco_rua")),
                "address_number": clean(row.get("endereco_numero")),
                "address_complement": clean(row.get("endereco_complemento")),
                "address_neighborhood": clean(row.get("endereco_bairro")),
                "address_city": clean(row.get("endereco_cidade")),
                "address_state": clean(row.get("endereco_estado")),
                "implantation_contact_name": "",
                "implantation_contact_phone": "",
                "corporate_email": "",
                "client_api_id": "",
                "internal_notes": "",
                "state_registration": clean(row.get("inscricao_estadual")),
                "secondary_cnpj": "",
                "secondary_razao_social": "",
                "modules_description": "",
                "plan_snapshot_captured_at": created_at,
                "plan_snapshot": "{}",
            }
        )
    return normalized


def normalize_analysts(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for row in rows:
        normalized.append(
            {
                "id": clean(row.get("id")),
                "name": clean(row.get("nome")),
                "avatar_url": clean(row.get("avatar")),
                "color": clean(row.get("color")) or "#6366f1",
                "active": clean(row.get("ativo")) or "true",
                "created_at": clean(row.get("created_at")),
            }
        )
    return normalized


def normalize_plan_models(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for row in rows:
        plan_type = clean(row.get("tipo")).lower()
        normalized.append(
            {
                "id": clean(row.get("id")),
                "key": plan_type,
                "name": clean(row.get("nome")),
                "hours_contracted": clean(row.get("horas_totais")) or "0",
                "phase_count": "0",
                "active": clean(row.get("ativo")) or "true",
                "presentation_url": "",
                "client_description": "",
            }
        )
    return normalized


def normalize_plan_phases(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for row in rows:
        normalized.append(
            {
                "id": clean(row.get("id")),
                "plan_model_id": clean(row.get("plan_template_id")),
                "name": clean(row.get("nome")),
                "order_index": clean(row.get("ordem")) or "0",
            }
        )
    return normalized


def normalize_plan_tasks(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    order_by_phase: dict[str, int] = defaultdict(int)
    normalized: list[dict[str, str]] = []
    for row in rows:
        phase_id = clean(row.get("phase_template_id"))
        order_by_phase[phase_id] += 1
        title = clean(row.get("titulo"))
        normalized.append(
            {
                "id": clean(row.get("id")),
                "plan_phase_id": phase_id,
                "code": extract_code_from_title(title, str(order_by_phase[phase_id])),
                "title": title,
                "description": clean(row.get("descricao")),
                "estimated_hours": clean(row.get("horas_estimadas")) or "0",
                "is_informational": clean(row.get("is_informational")) or "false",
                "sort_order": str(order_by_phase[phase_id]),
            }
        )
    return normalized


def normalize_phases(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for row in rows:
        normalized.append(
            {
                "id": clean(row.get("id")),
                "project_id": clean(row.get("projeto_id")),
                "name": clean(row.get("nome")),
                "order_index": clean(row.get("ordem")) or "0",
                "status": clean(row.get("status")) or "bloqueada",
            }
        )
    return normalized


def normalize_tasks(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    order_by_phase: dict[str, int] = defaultdict(int)
    normalized: list[dict[str, str]] = []
    for row in rows:
        phase_id = clean(row.get("fase_id"))
        order_by_phase[phase_id] += 1
        title = clean(row.get("titulo"))
        normalized.append(
            {
                "id": clean(row.get("id")),
                "title": title,
                "description": clean(row.get("descricao")),
                "project_id": clean(row.get("projeto_id")),
                "phase_id": phase_id,
                "status": clean(row.get("status")) or "pendente",
                "priority": clean(row.get("prioridade")) or "media",
                "estimated_hours": clean(row.get("horas_estimadas")) or "0",
                "actual_hours": clean(row.get("horas_realizadas")) or "0",
                "assigned_to": "",
                "due_date": clean(row.get("prazo")),
                "is_informational": clean(row.get("is_informational")) or "false",
                "created_at": clean(row.get("created_at")),
                "code": extract_code_from_title(title, str(order_by_phase[phase_id])),
                "sort_order": str(order_by_phase[phase_id]),
            }
        )
    return normalized


def normalize_events(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for row in rows:
        normalized.append(
            {
                "id": clean(row.get("id")),
                "title": clean(row.get("titulo")),
                "description": clean(row.get("descricao")),
                "start_time": clean(row.get("data_inicio")),
                "end_time": clean(row.get("data_fim")),
                "status": clean(row.get("status")) or "agendado",
                "project_id": clean(row.get("projeto_id")),
                "task_id": clean(row.get("tarefa_id")),
                "analyst_id": "",
                "meeting_link": clean(row.get("link_reuniao")),
                "recording_link": clean(row.get("link_gravacao")),
                "created_at": clean(row.get("created_at")),
            }
        )
    return normalized


def normalize_time_logs(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for row in rows:
        normalized.append(
            {
                "id": clean(row.get("id")),
                "task_id": clean(row.get("tarefa_id")),
                "user_id": clean(row.get("responsavel_id")) or clean(row.get("created_by")),
                "hours": clean(row.get("horas")).replace("\t", "") or "0",
                "log_type": clean(row.get("status")) or "executado",
                "notes": clean(row.get("notas")),
                "execution_date": clean(row.get("data_execucao")),
                "is_locked": clean(row.get("is_locked")) or "false",
            }
        )
    return normalized


def normalize_project_contacts(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for row in rows:
        normalized.append(
            {
                "id": clean(row.get("id")),
                "project_id": clean(row.get("projeto_id")),
                "name": clean(row.get("nome")),
                "phone": clean(row.get("telefone")).replace("\t", ""),
                "role": clean(row.get("cargo")),
            }
        )
    return normalized


def normalize_labels(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    status_map = {
        "not_started": "not_started",
        "in_progress": "in_progress",
        "completed": "completed",
    }
    normalized: list[dict[str, str]] = []
    for row in rows:
        old_status = clean(row.get("status")).lower()
        normalized.append(
            {
                "id": clean(row.get("id")),
                "project_id": clean(row.get("projeto_id")),
                "code": clean(row.get("codigo")),
                "name": clean(row.get("texto")),
                "status": status_map.get(old_status, "not_started"),
            }
        )
    return normalized


def normalize_comments(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for row in rows:
        normalized.append(
            {
                "id": clean(row.get("id")),
                "content": clean(row.get("conteudo")),
                "author_id": clean(row.get("created_by")),
                "project_id": clean(row.get("project_id")),
                "task_id": clean(row.get("task_id")),
                "event_id": clean(row.get("event_id")),
                "created_at": clean(row.get("created_at")),
                "updated_at": "",
                "doc_links": "[]",
                "doc_attachments": "[]",
            }
        )
    return normalized


def write_import_guide(path: Path, counters: dict[str, int]) -> None:
    lines = [
        "-- Legacy import guide generated by scripts/prepare_legacy_import.py",
        "-- 1) Supabase Studio -> Table Editor -> Import data for each CSV below.",
        "-- 2) Import order (important due to FKs):",
        "--    analysts, plan_models, plan_phases, plan_tasks, projects, phases, tasks, events, time_logs, project_contacts, labels, comments",
        "-- 3) Use separator ';' when asked.",
        "-- 4) For idempotency, prefer empty destination tables before first load.",
        "--",
        "-- Generated row counts:",
    ]
    for key, value in counters.items():
        lines.append(f"--   {key}: {value}")
    lines.append("")
    lines.append("-- Validation query (run after import):")
    lines.append("select 'projects' as table_name, count(*) as total from public.projects")
    lines.append("union all select 'phases', count(*) from public.phases")
    lines.append("union all select 'tasks', count(*) from public.tasks")
    lines.append("union all select 'events', count(*) from public.events")
    lines.append("union all select 'time_logs', count(*) from public.time_logs")
    lines.append("union all select 'project_contacts', count(*) from public.project_contacts")
    lines.append("union all select 'labels', count(*) from public.labels")
    lines.append("union all select 'comments', count(*) from public.comments")
    lines.append("union all select 'plan_models', count(*) from public.plan_models")
    lines.append("union all select 'plan_phases', count(*) from public.plan_phases")
    lines.append("union all select 'plan_tasks', count(*) from public.plan_tasks")
    lines.append("order by table_name;")
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    projects = normalize_projects(read_csv(SOURCE_DIR / "projects-export-2026-04-14_12-29-42.csv"))
    phases = normalize_phases(read_csv(SOURCE_DIR / "phases-export-2026-04-14_12-29-29.csv"))
    tasks = normalize_tasks(read_csv(SOURCE_DIR / "tasks-export-2026-04-14_12-30-10.csv"))
    events = normalize_events(read_csv(SOURCE_DIR / "events-export-2026-04-14_12-29-20.csv"))
    time_logs = normalize_time_logs(read_csv(SOURCE_DIR / "time_logs-export-2026-04-14_12-29-06.csv"))
    project_contacts = normalize_project_contacts(read_csv(SOURCE_DIR / "contacts-export-2026-04-14_12-28-23.csv"))
    labels = normalize_labels(read_csv(SOURCE_DIR / "project_labels-export-2026-04-14_12-28-51.csv"))
    comments = normalize_comments(read_csv(SOURCE_DIR / "comments-export-2026-04-14_12-29-13.csv"))
    analysts = normalize_analysts(read_csv(SOURCE_DIR / "analysts-export-2026-04-14_12-28-07.csv"))
    plan_models = normalize_plan_models(read_csv(SOURCE_DIR / "plan_templates-export-2026-04-14_12-28-43.csv"))
    plan_phases = normalize_plan_phases(read_csv(SOURCE_DIR / "phase_templates-export-2026-04-14_12-28-29.csv"))
    plan_tasks = normalize_plan_tasks(read_csv(SOURCE_DIR / "task_templates-export-2026-04-14_12-29-00.csv"))

    write_csv(
        OUTPUT_DIR / "analysts.csv",
        analysts,
        ["id", "name", "avatar_url", "color", "active", "created_at"],
    )
    write_csv(
        OUTPUT_DIR / "plan_models.csv",
        plan_models,
        ["id", "key", "name", "hours_contracted", "phase_count", "active", "presentation_url", "client_description"],
    )
    write_csv(
        OUTPUT_DIR / "plan_phases.csv",
        plan_phases,
        ["id", "plan_model_id", "name", "order_index"],
    )
    write_csv(
        OUTPUT_DIR / "plan_tasks.csv",
        plan_tasks,
        ["id", "plan_phase_id", "code", "title", "description", "estimated_hours", "is_informational", "sort_order"],
    )
    write_csv(
        OUTPUT_DIR / "projects.csv",
        projects,
        [
            "id",
            "project_name",
            "plan_type",
            "hours_contracted",
            "hours_used",
            "start_date",
            "due_date",
            "status",
            "owner_id",
            "analyst_id",
            "created_by",
            "created_at",
            "kanban_column",
            "cnpj",
            "razao_social",
            "trade_name",
            "cep",
            "address_street",
            "address_number",
            "address_complement",
            "address_neighborhood",
            "address_city",
            "address_state",
            "implantation_contact_name",
            "implantation_contact_phone",
            "corporate_email",
            "client_api_id",
            "internal_notes",
            "state_registration",
            "secondary_cnpj",
            "secondary_razao_social",
            "modules_description",
            "plan_snapshot_captured_at",
            "plan_snapshot",
        ],
    )
    write_csv(
        OUTPUT_DIR / "phases.csv",
        phases,
        ["id", "project_id", "name", "order_index", "status"],
    )
    write_csv(
        OUTPUT_DIR / "tasks.csv",
        tasks,
        [
            "id",
            "title",
            "description",
            "project_id",
            "phase_id",
            "status",
            "priority",
            "estimated_hours",
            "actual_hours",
            "assigned_to",
            "due_date",
            "is_informational",
            "created_at",
            "code",
            "sort_order",
        ],
    )
    write_csv(
        OUTPUT_DIR / "events.csv",
        events,
        [
            "id",
            "title",
            "description",
            "start_time",
            "end_time",
            "status",
            "project_id",
            "task_id",
            "analyst_id",
            "meeting_link",
            "recording_link",
            "created_at",
        ],
    )
    write_csv(
        OUTPUT_DIR / "time_logs.csv",
        time_logs,
        ["id", "task_id", "user_id", "hours", "log_type", "notes", "execution_date", "is_locked"],
    )
    write_csv(
        OUTPUT_DIR / "project_contacts.csv",
        project_contacts,
        ["id", "project_id", "name", "phone", "role"],
    )
    write_csv(
        OUTPUT_DIR / "labels.csv",
        labels,
        ["id", "project_id", "code", "name", "status"],
    )
    write_csv(
        OUTPUT_DIR / "comments.csv",
        comments,
        ["id", "content", "author_id", "project_id", "task_id", "event_id", "created_at", "updated_at", "doc_links", "doc_attachments"],
    )

    counters = {
        "analysts": len(analysts),
        "plan_models": len(plan_models),
        "plan_phases": len(plan_phases),
        "plan_tasks": len(plan_tasks),
        "projects": len(projects),
        "phases": len(phases),
        "tasks": len(tasks),
        "events": len(events),
        "time_logs": len(time_logs),
        "project_contacts": len(project_contacts),
        "labels": len(labels),
        "comments": len(comments),
    }
    write_import_guide(OUTPUT_DIR / "IMPORT_GUIDE.sql", counters)

    print("Legacy import files generated at:", OUTPUT_DIR)
    for key, value in counters.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    main()
