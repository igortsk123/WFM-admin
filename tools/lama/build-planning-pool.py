"""LAMA snapshot → daily reverse-distribution planning pool.

Берёт самый свежий snapshot из .lama_snapshots/, фильтрует tasks которые
ещё в работе (status ∈ {Created, InProgress, Suspended}), стрипает
distribution-поля (_employee_id / _employee_name / _eis_id) и группирует
по магазину. Для каждого магазина прикладывает список доступных
сотрудников (из снимка employees, в этом же магазине).

Результат — `lib/mock-data/_lama-planning-pool.ts` (TS export). Идея:
директор открывает «авто-распределение на сегодня» в admin-демо, видит
сегодняшние реальные задачи без assignee, жмёт «авто-распределить» — наша
логика расставляет, и можно сравнить с реальным LAMA-распределением (оно
лежит в `_lama-real.ts` / связанных моках).

Использование:
    python tools/lama/build-planning-pool.py [--snapshot YYYY-MM-DD]

По умолчанию — самый свежий snapshot (excluding служебные _*.json).
Snapshot'ы создаются `tools/lama/fetch-snapshot-async.py`.
"""
import argparse
import io
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_DIR = ROOT / ".lama_snapshots"
OUT_FILE = ROOT / "lib" / "mock-data" / "_lama-planning-pool.ts"

# Status'ы которые означают «ещё в работе, нуждается в распределении».
# Completed/Accepted — уже сделано / принято, не планируем.
# Suspended (приостановлено) — добавляем: задача актуальна, нужна повторная распланировка.
PLANNABLE_STATUSES = {"Created", "InProgress", "Suspended", "Completed", "Accepted"}
# Демо-логика: «утренняя картина дня» — берём ВСЕ задачи дня (включая уже
# Accepted/Completed которые LAMA фактически распределил и закрыл), стрипаем
# assignee. Директор открывает экран как будто в 06:00 AM до старта дня:
# видит весь объём → сравнивает наш auto-distribute vs ручное распределение.
# Также baseline для backtest «наш алго vs реальность» формируется из этой же
# полной картины (real assignment в _lama-backtest-baseline.ts).


def latest_snapshot() -> Path:
    """Самый свежий snapshot — *.json без префикса `_` (служебные)."""
    candidates = sorted(
        p for p in SNAPSHOT_DIR.glob("*.json") if not p.name.startswith("_")
    )
    if not candidates:
        raise FileNotFoundError(
            f"No snapshots in {SNAPSHOT_DIR} (excluding _*.json)"
        )
    return candidates[-1]


def load_snapshot(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def ts_string_literal(s: str) -> str:
    """JS-строка с двойными кавычками + эскейп `\\` и `"`."""
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def ts_optional_string(s) -> str:
    """Если пусто/None → null, иначе строковый литерал."""
    if s is None or s == "":
        return "null"
    return ts_string_literal(str(s))


def ts_optional_number(n) -> str:
    if n is None:
        return "null"
    return str(int(n))


def build_pool(snapshot: dict) -> tuple[dict, dict]:
    """Строит planning pool по shop_code → {shop_name, tasks, employees}.

    Сотрудник попадает в pool только если у него есть task в snapshot
    с `_employee_id == emp_id` и `_shop_code == sc`. Без данных за день
    — пустой массив; UI покажет «нет данных», ничего не достраиваем.

    Returns:
        (pool, stats)
    """
    # 1. Pre-pass tasks → today_emp_ids_per_shop = {sc: {emp_id, ...}}
    today_emp_ids_per_shop: dict[str, set[int]] = defaultdict(set)
    for t in snapshot.get("tasks", []):
        sc = t.get("_shop_code")
        eid = t.get("_employee_id")
        if sc and isinstance(eid, int):
            today_emp_ids_per_shop[sc].add(eid)

    # 2. Сотрудники по магазину — только те у кого есть task сегодня.
    employees_by_shop: dict[str, list[dict]] = defaultdict(list)
    seen_emp_ids_per_shop: dict[str, set[int]] = defaultdict(set)
    skipped_not_on_shift = 0
    for e in snapshot.get("employees", []):
        sc = e.get("shop_code")
        emp_id = e.get("employee_id")
        if not sc or emp_id is None:
            continue
        if emp_id not in today_emp_ids_per_shop.get(sc, set()):
            skipped_not_on_shift += 1
            continue
        if emp_id in seen_emp_ids_per_shop[sc]:
            continue
        seen_emp_ids_per_shop[sc].add(emp_id)
        employees_by_shop[sc].append({
            "employee_id": int(emp_id),
            "name": e.get("name") or "",
            "eis_id": e.get("eis_id"),
            "position_role": e.get("position_role") or "",
            "position_name": e.get("position_name") or "",
            "rank": e.get("rank") or "",
        })

    # Tasks по магазину — только plannable, без assignee.
    tasks_by_shop: dict[str, list[dict]] = defaultdict(list)
    shop_names: dict[str, str] = {}
    skipped_status: dict[str, int] = defaultdict(int)
    skipped_no_shop = 0
    total_tasks = 0
    for t in snapshot.get("tasks", []):
        total_tasks += 1
        status = t.get("status")
        if status not in PLANNABLE_STATUSES:
            skipped_status[status or "<none>"] += 1
            continue
        sc = t.get("_shop_code")
        if not sc:
            skipped_no_shop += 1
            continue
        shop_names.setdefault(sc, t.get("_shop_name") or sc)

        tasks_by_shop[sc].append({
            "id": int(t["id"]) if t.get("id") is not None else 0,
            "priority": int(t.get("priority") or 5),
            "operation_work": t.get("operation_work") or "",
            "operation_zone": t.get("operation_zone"),
            "category": t.get("category"),
            "duration": int(t.get("duration") or 0),
            "time_start": t.get("time_start") or "",
            "time_end": t.get("time_end") or "",
            "status": status,
            "shop_code": sc,
            "shop_name": t.get("_shop_name") or sc,
            "shift_id": t.get("_shift_id"),
        })

    # Финальная сборка.
    # Магазин попадает в pool если у него есть ЛИБО планируемые задачи,
    # ЛИБО хотя бы один сотрудник со сменой сегодня. Это нужно чтобы
    # /tasks/distribute показывал команду даже если задачи на день уже
    # распределены/завершены — пустая таблица «нет смен» путает директора.
    pool: dict[str, dict] = {}
    all_shop_codes = set(tasks_by_shop.keys()) | set(employees_by_shop.keys())
    for sc in sorted(all_shop_codes):
        tasks = tasks_by_shop.get(sc, [])
        emps_raw = employees_by_shop.get(sc, [])
        if not tasks and not emps_raw:
            continue  # ни задач, ни команды — магазин неактивен сегодня
        # Сортировка задач: priority asc (1=critical), потом time_start.
        tasks.sort(key=lambda x: (x["priority"], x["time_start"], x["id"]))
        # Сотрудники: Administrator первым, потом Executor, потом по name.
        emps = sorted(
            emps_raw,
            key=lambda e: (
                0 if e["position_role"] == "Administrator" else 1,
                e["name"],
            ),
        )
        pool[sc] = {
            "shop_name": shop_names.get(sc) or sc,
            "tasks_to_distribute": tasks,
            "available_employees": emps,
        }

    stats = {
        "total_tasks": total_tasks,
        "skipped_status": dict(skipped_status),
        "skipped_no_shop": skipped_no_shop,
        "skipped_not_on_shift": skipped_not_on_shift,
        "n_shops": len(pool),
        "n_tasks": sum(len(p["tasks_to_distribute"]) for p in pool.values()),
        "n_employees": sum(len(p["available_employees"]) for p in pool.values()),
    }
    return pool, stats


def render_task(t: dict) -> str:
    return (
        "      { "
        f'id: {t["id"]}, '
        f'priority: {t["priority"]}, '
        f'operation_work: {ts_string_literal(t["operation_work"])}, '
        f'operation_zone: {ts_optional_string(t["operation_zone"])}, '
        f'category: {ts_optional_string(t["category"])}, '
        f'duration: {t["duration"]}, '
        f'time_start: {ts_string_literal(t["time_start"])}, '
        f'time_end: {ts_string_literal(t["time_end"])}, '
        f'status: {ts_string_literal(t["status"])}, '
        f'shop_code: {ts_string_literal(t["shop_code"])}, '
        f'shop_name: {ts_string_literal(t["shop_name"])}, '
        f'shift_id: {ts_optional_number(t["shift_id"])} '
        "},"
    )


def render_employee(e: dict) -> str:
    return (
        "      { "
        f'employee_id: {e["employee_id"]}, '
        f'name: {ts_string_literal(e["name"])}, '
        f'eis_id: {ts_optional_number(e["eis_id"])}, '
        f'position_role: {ts_string_literal(e["position_role"])}, '
        f'position_name: {ts_string_literal(e["position_name"])}, '
        f'rank: {ts_string_literal(e["rank"])} '
        "},"
    )


def write_pool_file(pool: dict, source_date: str, stats: dict) -> None:
    built_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    n_shops = stats["n_shops"]
    n_tasks = stats["n_tasks"]
    n_emps = stats["n_employees"]

    header = f'''/**
 * AUTO-GENERATED by tools/lama/build-planning-pool.py — do not edit by hand.
 *
 * Daily reverse-distribution: today's LAMA tasks без assignee, готовые для
 * нашего auto-distribute UI demo. Берём задачи которые сегодня уже были
 * распределены LAMA (status ∈ {{Created, InProgress, Suspended}}), стрипаем
 * employee_id / employee_name / eis_id и группируем по магазину. Сравнить
 * с реальным распределением можно через `_lama-real.ts` и связанные моки.
 *
 * Source snapshot: {source_date}
 * Built at: {built_at}
 *
 * {n_shops} shops, {n_tasks} tasks-to-distribute, {n_emps} available-employees.
 */

export interface PlanningTask {{
  id: number;
  priority: number;
  operation_work: string;
  operation_zone: string | null;
  category: string | null;
  duration: number;
  time_start: string;
  time_end: string;
  status: string;
  shop_code: string;
  shop_name: string;
  shift_id: number | null;
}}

export interface PlanningEmployee {{
  employee_id: number;
  name: string;
  eis_id: number | null;
  position_role: string;
  position_name: string;
  rank: string;
}}

export interface ShopPlanningPool {{
  shop_name: string;
  tasks_to_distribute: PlanningTask[];
  available_employees: PlanningEmployee[];
}}

export const LAMA_PLANNING_POOL: Record<string, ShopPlanningPool> = {{
'''

    lines: list[str] = [header]
    for sc in sorted(pool.keys()):
        entry = pool[sc]
        lines.append(f"  {ts_string_literal(sc)}: {{\n")
        lines.append(f"    shop_name: {ts_string_literal(entry['shop_name'])},\n")
        lines.append("    tasks_to_distribute: [\n")
        for t in entry["tasks_to_distribute"]:
            lines.append(render_task(t) + "\n")
        lines.append("    ],\n")
        lines.append("    available_employees: [\n")
        for e in entry["available_employees"]:
            lines.append(render_employee(e) + "\n")
        lines.append("    ],\n")
        lines.append("  },\n")
    lines.append("};\n\n")

    lines.append(f'export const PLANNING_POOL_BUILT_AT = {ts_string_literal(built_at)};\n')
    lines.append(f'export const PLANNING_POOL_SOURCE_DATE = {ts_string_literal(source_date)};\n')

    OUT_FILE.write_text("".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--snapshot",
        type=str,
        default=None,
        help="Snapshot date (YYYY-MM-DD). По умолчанию — самый свежий.",
    )
    args = parser.parse_args()

    print("=== LAMA planning-pool builder ===", file=sys.stderr)

    if args.snapshot:
        path = SNAPSHOT_DIR / f"{args.snapshot}.json"
        if not path.exists():
            print(f"ERR: snapshot not found: {path}", file=sys.stderr)
            sys.exit(1)
    else:
        try:
            path = latest_snapshot()
        except FileNotFoundError as e:
            print(f"ERR: {e}", file=sys.stderr)
            sys.exit(1)

    source_date = path.stem  # `YYYY-MM-DD` или `_bench-async`
    print(f"Source snapshot: {path.name}", file=sys.stderr)

    snapshot = load_snapshot(path)
    pool, stats = build_pool(snapshot)
    write_pool_file(pool, source_date, stats)

    print("", file=sys.stderr)
    print(f"Total tasks in snapshot: {stats['total_tasks']}", file=sys.stderr)
    print(f"  Skipped by status: {stats['skipped_status']}", file=sys.stderr)
    print(f"  Skipped (no _shop_code): {stats['skipped_no_shop']}", file=sys.stderr)
    print(f"  Filtered employees (not on shift today): {stats['skipped_not_on_shift']}", file=sys.stderr)
    print("", file=sys.stderr)
    print(
        f"{stats['n_shops']} shops, {stats['n_tasks']} tasks-to-distribute, "
        f"{stats['n_employees']} available-employees (только сегодня на смене)",
        file=sys.stderr,
    )
    print(f"Wrote: {OUT_FILE.relative_to(ROOT)}", file=sys.stderr)


if __name__ == "__main__":
    main()
