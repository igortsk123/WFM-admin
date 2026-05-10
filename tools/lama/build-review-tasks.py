"""LAMA snapshot → review queue mock.

Берёт самый свежий snapshot из .lama_snapshots/, фильтрует tasks которые
сейчас ждут проверки менеджером (LAMA status="Completed" → WFM
review_state="ON_REVIEW") + историю принятых (Accepted → ACCEPTED) и
отклонённых (Rejected → REJECTED, если такой статус есть). Маппит
shop_code → store_id и employee_id → user_id через `_lama-real.ts`.

Результат — `lib/mock-data/_lama-review-tasks.ts` (TS export
`REAL_LAMA_REVIEW_TASKS: Task[]`). Этот массив подключается в
`lib/mock-data/tasks.ts` через spread, поэтому существующая фильтрация
`getTasks({review_state: "ON_REVIEW"})` сразу видит реальные ЛАМА-задачи.

Использование:
    python tools/lama/build-review-tasks.py [--snapshot YYYY-MM-DD]

По умолчанию — самый свежий snapshot (excluding служебные _*.json).
"""
import argparse
import io
import json
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_DIR = ROOT / ".lama_snapshots"
LAMA_REAL = ROOT / "lib" / "mock-data" / "_lama-real.ts"
OUT_FILE = ROOT / "lib" / "mock-data" / "_lama-review-tasks.ts"

# Стандартные work_type / zone id'шники из regenerate-from-snapshots.py.
# Если там не нашли — fallback id по индексу.
WORK_TYPES: dict[int, str] = {
    1: "Менеджерские операции",
    2: "Касса",
    3: "КСО",
    4: "Выкладка",
    5: "Переоценка",
    6: "Инвентаризация",
    7: "Другие работы",
}
ZONES: dict[int, str] = {
    100: "Фреш 1",
    101: "Фреш 2",
    102: "Бакалея",
    103: "Заморозка",
    104: "Бытовая химия",
    105: "NF",
    106: "Алкоголь",
    107: "ЗОЖ",
    108: "Кондитерка, чай, кофе",
    109: "Пиво, чипсы",
    110: "Напитки б/а",
    111: "ФРОВ",
    112: "Без зоны",
    114: "Зона КСО",
    117: "Кассовая зона",
    127: "Торговый зал (общая)",
    129: "Прикассовая зона",
}

# LAMA status → WFM (state, review_state) маппинг.
# Completed = работник завершил, ждёт менеджера → ON_REVIEW.
# Accepted  = менеджер принял → state=COMPLETED + review_state=ACCEPTED.
# Rejected  = менеджер вернул на доработку → review_state=REJECTED + state=PAUSED.
STATUS_MAP: dict[str, tuple[str, str]] = {
    "Completed": ("COMPLETED", "ON_REVIEW"),
    "Accepted": ("COMPLETED", "ACCEPTED"),
    "Rejected": ("PAUSED", "REJECTED"),
}

# Статусы которые мы вытаскиваем в review-queue mock (ON_REVIEW + история).
REVIEW_STATUSES = set(STATUS_MAP.keys())


def _normalize(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip()) if s else s


def latest_snapshot() -> Path:
    candidates = sorted(
        p for p in SNAPSHOT_DIR.glob("*.json") if not p.name.startswith("_")
    )
    if not candidates:
        raise FileNotFoundError(
            f"No snapshots in {SNAPSHOT_DIR} (excluding _*.json)"
        )
    return candidates[-1]


def parse_lama_real() -> tuple[
    dict[str, tuple[int, str]],
    dict[int, tuple[int, str]],
]:
    """Парсит lib/mock-data/_lama-real.ts.

    Returns:
        (shop_map, user_map)
        - shop_map: external_code (4-digit string) → (store_id, store_name)
        - user_map: lama_employee_id (int) → (admin user_id, full_name)
    """
    text = LAMA_REAL.read_text(encoding="utf-8")
    shop_map: dict[str, tuple[int, str]] = {}
    user_map: dict[int, tuple[int, str]] = {}

    shop_re = re.compile(
        r'\{\s*id:\s*(\d+)\s*,\s*name:\s*"([^"]+)"\s*,\s*[^}]*?external_code:\s*"(\d{4})"'
    )
    for m in shop_re.finditer(text):
        store_id = int(m.group(1))
        store_name = m.group(2)
        shop_code = m.group(3)
        if shop_code not in shop_map:
            shop_map[shop_code] = (store_id, store_name)

    # User: { id: 300, external_id: 2058, sso_id: "...", phone: "...", first_name: "...", last_name: "...", middle_name: "..."
    # Имя/фамилия/отчество идут в неpredсказуемом порядке относительно
    # external_id (между ними phone/sso_id), но всегда внутри одного объекта.
    # Стратегия: ищем external_id, а потом нужные поля в окне следующих 600 chars.
    user_re = re.compile(r'\{\s*id:\s*(\d+)\s*,\s*external_id:\s*(\d+)\s*,')
    name_first_re = re.compile(r'first_name:\s*"([^"]*)"')
    name_last_re = re.compile(r'last_name:\s*"([^"]*)"')
    name_middle_re = re.compile(r'middle_name:\s*"([^"]*)"')
    type_re = re.compile(r'type:\s*"([^"]*)"')
    for m in user_re.finditer(text):
        user_id = int(m.group(1))
        external_id = int(m.group(2))
        # Окно — до конца строки записи (ищем закрывающую скобку или новую запись)
        window = text[m.end():m.end() + 700]
        # Если в окне попался следующий объект — обрезаем
        next_obj = window.find("\n  { id:")
        if next_obj > 0:
            window = window[:next_obj]
        first_m = name_first_re.search(window)
        last_m = name_last_re.search(window)
        middle_m = name_middle_re.search(window)
        type_m = type_re.search(window)
        # Только сотрудники (type STAFF) — не магазины (у них нет first_name).
        if not first_m or not last_m or not type_m:
            continue
        if type_m.group(1) != "STAFF":
            continue
        first = first_m.group(1)
        last = last_m.group(1)
        middle = middle_m.group(1) if middle_m else ""
        full = f"{last} {first}"
        if middle:
            full = f"{last} {first} {middle}"
        if external_id not in user_map:
            user_map[external_id] = (user_id, full)

    return shop_map, user_map


def resolve_work_type(work: str) -> tuple[int, str]:
    norm = _normalize(work) or "Другие работы"
    inv = {v: k for k, v in WORK_TYPES.items()}
    if norm in inv:
        return inv[norm], norm
    # Fallback: 7 = «Другие работы»
    return 7, "Другие работы"


def resolve_zone(zone) -> tuple[int, str]:
    if zone is None or zone == "N/A" or zone == "":
        return 112, ZONES[112]  # «Без зоны»
    norm = _normalize(zone)
    inv = {v: k for k, v in ZONES.items()}
    if norm in inv:
        return inv[norm], norm
    return 112, ZONES[112]


def ts_string_literal(s: str) -> str:
    """JS string literal (двойные кавычки) с эскейпом " и \\."""
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def ts_optional_string(s) -> str:
    if s is None or s == "":
        return "undefined"
    return ts_string_literal(str(s))


def build_task_record(
    t: dict,
    shop_map: dict[str, tuple[int, str]],
    user_map: dict[int, tuple[int, str]],
    snapshot_date: str,
) -> dict | None:
    """Превращает LAMA task в admin Task record. None если не маппится."""
    sc = t.get("_shop_code")
    if not sc or sc not in shop_map:
        return None
    store_id, store_name = shop_map[sc]

    emp_id = t.get("_employee_id")
    if emp_id is None or emp_id not in user_map:
        return None
    user_id, user_name = user_map[emp_id]

    api_id = t.get("id")
    if api_id is None:
        return None

    status = t.get("status")
    if status not in STATUS_MAP:
        return None
    state, review_state = STATUS_MAP[status]

    work = t.get("operation_work") or "Другие работы"
    wt_id, wt_name = resolve_work_type(work)

    zone_raw = t.get("operation_zone")
    z_id, z_name = resolve_zone(zone_raw)

    duration_sec = t.get("duration") or 0
    planned_minutes = max(int(duration_sec) // 60, 1)

    # Title: "{work_type}: {zone}" — приближение к UI-формату из реальных
    # MOCK_TASKS («Выкладка: Бакалея» / «Переоценка»).
    if z_id == 112:  # «Без зоны» — короткий заголовок
        title = wt_name
        description = wt_name
    else:
        title = f"{wt_name}: {z_name}"
        description = f"{wt_name} в зоне «{z_name}»"

    priority = int(t.get("priority") or 5)

    # created_at / updated_at — LAMA не отдаёт точное время send_to_review,
    # используем snapshot_date + время начала task'а как updated_at (этого
    # достаточно для сортировки и UI «давно ждёт проверки»).
    time_start = t.get("time_start") or "08:00:00"
    time_end = t.get("time_end") or "23:00:00"
    # Приблизительный ISO для created_at (начало смены) и updated_at (конец).
    created_iso = f"{snapshot_date}T{time_start}+07:00"
    updated_iso = f"{snapshot_date}T{time_end}+07:00"

    return {
        "id": f"task-lama-review-{api_id}",
        "external_id": int(api_id),
        "title": title,
        "description": description,
        "type": "PLANNED",
        "kind": "SINGLE",
        "source": "PLANNED",
        "store_id": store_id,
        "store_name": store_name,
        "zone_id": z_id,
        "zone_name": z_name,
        "work_type_id": wt_id,
        "work_type_name": wt_name,
        "priority": priority,
        "editable_by_store": False,
        "creator_id": 1,
        "creator_name": "Директор магазина",
        "assignee_id": user_id,
        "assignee_name": user_name,
        "state": state,
        "review_state": review_state,
        "acceptance_policy": "MANUAL",
        "requires_photo": False,
        "archived": False,
        "planned_minutes": planned_minutes,
        "time_start": time_start,
        "time_end": time_end,
        "shift_id": t.get("_shift_id"),
        "created_at": created_iso,
        "updated_at": updated_iso,
    }


def render_task_line(rec: dict) -> str:
    parts = [
        f'id: {ts_string_literal(rec["id"])}',
        f'external_id: {rec["external_id"]}',
        f'title: {ts_string_literal(rec["title"])}',
        f'description: {ts_string_literal(rec["description"])}',
        f'type: {ts_string_literal(rec["type"])}',
        f'kind: {ts_string_literal(rec["kind"])}',
        f'source: {ts_string_literal(rec["source"])}',
        f'store_id: {rec["store_id"]}',
        f'store_name: {ts_string_literal(rec["store_name"])}',
        f'zone_id: {rec["zone_id"]}',
        f'zone_name: {ts_string_literal(rec["zone_name"])}',
        f'work_type_id: {rec["work_type_id"]}',
        f'work_type_name: {ts_string_literal(rec["work_type_name"])}',
        f'priority: {rec["priority"]}',
        f'editable_by_store: {"true" if rec["editable_by_store"] else "false"}',
        f'creator_id: {rec["creator_id"]}',
        f'creator_name: {ts_string_literal(rec["creator_name"])}',
        f'assignee_id: {rec["assignee_id"]}',
        f'assignee_name: {ts_string_literal(rec["assignee_name"])}',
        f'assigned_to_permission: null',
        f'state: {ts_string_literal(rec["state"])}',
        f'review_state: {ts_string_literal(rec["review_state"])}',
        f'acceptance_policy: {ts_string_literal(rec["acceptance_policy"])}',
        f'requires_photo: {"true" if rec["requires_photo"] else "false"}',
        f'archived: {"true" if rec["archived"] else "false"}',
        f'planned_minutes: {rec["planned_minutes"]}',
        f'time_start: {ts_string_literal(rec["time_start"])}',
        f'time_end: {ts_string_literal(rec["time_end"])}',
    ]
    if rec.get("shift_id") is not None:
        parts.append(f'shift_id: {int(rec["shift_id"])}')
    parts.append(f'created_at: {ts_string_literal(rec["created_at"])}')
    parts.append(f'updated_at: {ts_string_literal(rec["updated_at"])}')
    return "  { " + ", ".join(parts) + " },"


def write_file(records: list[dict], snapshot_date: str, stats: dict) -> None:
    built_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    n_review = stats["n_review"]
    n_accepted = stats["n_accepted"]
    n_rejected = stats["n_rejected"]
    n_shops = stats["n_shops"]

    header = f'''/**
 * AUTO-GENERATED by tools/lama/build-review-tasks.py — do not edit by hand.
 *
 * Реальные LAMA-задачи которые сейчас в очереди на проверку менеджером
 * (status="Completed" → review_state="ON_REVIEW") + история принятых /
 * отклонённых. Подключается в `lib/mock-data/tasks.ts` через spread,
 * поэтому `getTasks({{review_state: "ON_REVIEW"}})` сразу видит их.
 *
 * Source snapshot: {snapshot_date}
 * Built at: {built_at}
 *
 * {n_review} ON_REVIEW + {n_accepted} ACCEPTED + {n_rejected} REJECTED across {n_shops} shops.
 *
 * Регенерируется:
 *   - daily (cron-daily.sh) после fetch-snapshot-async.py
 *   - hourly (refresh-review-statuses.sh) после refresh статусов task'ов
 */
import type {{ Task }} from "@/lib/types";

export const REAL_LAMA_REVIEW_TASKS: Task[] = [
'''
    lines: list[str] = [header]
    for rec in records:
        lines.append(render_task_line(rec) + "\n")
    lines.append("];\n\n")
    lines.append(f'export const REVIEW_TASKS_BUILT_AT = {ts_string_literal(built_at)};\n')
    lines.append(f'export const REVIEW_TASKS_SOURCE_DATE = {ts_string_literal(snapshot_date)};\n')

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

    print("=== LAMA review-tasks builder ===", file=sys.stderr)

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

    source_date = path.stem
    print(f"Source snapshot: {path.name}", file=sys.stderr)

    snap = json.loads(path.read_text(encoding="utf-8-sig"))

    shop_map, user_map = parse_lama_real()
    print(
        f"_lama-real.ts: {len(shop_map)} shops, {len(user_map)} users",
        file=sys.stderr,
    )

    review_records: list[dict] = []
    accepted_records: list[dict] = []
    rejected_records: list[dict] = []
    skipped_unmapped_shop: dict[str, int] = defaultdict(int)
    skipped_unmapped_user: dict[int, int] = defaultdict(int)
    seen_total = 0
    by_status: dict[str, int] = defaultdict(int)

    for t in snap.get("tasks", []):
        status = t.get("status")
        if status not in REVIEW_STATUSES:
            continue
        seen_total += 1
        by_status[status] += 1

        sc = t.get("_shop_code")
        if sc and sc not in shop_map:
            skipped_unmapped_shop[sc] += 1
            continue

        emp_id = t.get("_employee_id")
        if emp_id is not None and emp_id not in user_map:
            skipped_unmapped_user[emp_id] += 1
            continue

        rec = build_task_record(t, shop_map, user_map, source_date)
        if rec is None:
            continue

        if rec["review_state"] == "ON_REVIEW":
            review_records.append(rec)
        elif rec["review_state"] == "ACCEPTED":
            accepted_records.append(rec)
        elif rec["review_state"] == "REJECTED":
            rejected_records.append(rec)

    # Итоговый порядок: ON_REVIEW первыми (sorted by store + user), потом
    # остальные. Это нужно чтобы review-queue не зависела от random ordering.
    def sort_key(r: dict) -> tuple:
        return (r["store_id"], r["assignee_id"], r["external_id"])

    review_records.sort(key=sort_key)
    accepted_records.sort(key=sort_key)
    rejected_records.sort(key=sort_key)

    all_records = review_records + accepted_records + rejected_records

    n_shops = len({r["store_id"] for r in all_records})
    stats = {
        "n_review": len(review_records),
        "n_accepted": len(accepted_records),
        "n_rejected": len(rejected_records),
        "n_shops": n_shops,
    }
    write_file(all_records, source_date, stats)

    print("", file=sys.stderr)
    print(
        f"LAMA-снимок: {seen_total} review-related tasks, by status: {dict(by_status)}",
        file=sys.stderr,
    )
    if skipped_unmapped_shop:
        print(
            f"  Skipped (unmapped shop_code): {dict(skipped_unmapped_shop)}",
            file=sys.stderr,
        )
    if skipped_unmapped_user:
        print(
            f"  Skipped (unmapped employee_id): {len(skipped_unmapped_user)} unique",
            file=sys.stderr,
        )
    print("", file=sys.stderr)
    print(
        f"{stats['n_review']} ON_REVIEW + {stats['n_accepted']} ACCEPTED + "
        f"{stats['n_rejected']} REJECTED across {stats['n_shops']} shops",
        file=sys.stderr,
    )
    print(f"Wrote: {OUT_FILE.relative_to(ROOT)}", file=sys.stderr)


if __name__ == "__main__":
    main()
