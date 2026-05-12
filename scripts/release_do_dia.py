#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Checklist para um release do dia — Implantação Azoup.

Uso:
  python scripts/release_do_dia.py
  python scripts/release_do_dia.py --minor

Não altera arquivos; só imprime data em Brasília, sugestão de semver
e lembretes para editar CHANGELOG.md, releaseNotes.ts, appMeta e package.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Brasília UTC−3 o ano todo (sem horário de verão desde 2019). Evita depender de tzdata no Windows.
BR_TZ = timezone(timedelta(hours=-3))


def read_package_version(root: Path) -> tuple[int, int, int]:
    pkg_path = root / "package.json"
    raw = json.loads(pkg_path.read_text(encoding="utf-8")).get("version", "1.0.0")
    parts = [int(x) for x in str(raw).strip().split(".") if x.isdigit()]
    while len(parts) < 3:
        parts.append(0)
    return parts[0], parts[1], parts[2]


def main() -> None:
    parser = argparse.ArgumentParser(description="Checklist release do dia (Implantacao Azoup)")
    parser.add_argument(
        "--minor",
        action="store_true",
        help="Sugerir proxima minor (x.y+1.0) em vez de patch (x.y.z+1)",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    major, minor, patch = read_package_version(root)
    if args.minor:
        suggested = f"{major}.{minor + 1}.0"
        kind = "minor"
    else:
        suggested = f"{major}.{minor}.{patch + 1}"
        kind = "patch"

    now = datetime.now(BR_TZ)
    date_br = now.strftime("%d/%m/%Y")
    iso_noon = now.strftime("%Y-%m-%dT12:00:00-03:00")

    print("=== Implantação Azoup — release do dia ===\n")
    print(f"Data (Brasília): {date_br}")
    print(f"Versão atual (package.json): {major}.{minor}.{patch}")
    print(f"Sugestão próxima versão ({kind}): v{suggested}\n")
    print("releasedAt sugerido em releaseNotes.ts (só calendário BR, ordenação estável):")
    print(f"  {iso_noon}\n")
    print("Checklist manual:")
    print("  1) Acrescente itens em src/constants/releaseNotes.ts (uma entrada por pacote do dia).")
    print("  2) Espelhe em CHANGELOG.md com subtítulos BUG FIX / MELHORIA / NOVA FUNÇÃO / …")
    print("  3) Alinhe package.json, package-lock.json (versão raiz), src/constants/appMeta.ts")
    print("  4) Opcional: commit_release.bat para patch + commit + push\n")


if __name__ == "__main__":
    main()
