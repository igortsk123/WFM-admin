"""LAMA snapshot → admin mock-data regenerator.

Перегенерирует:
  1. lib/mock-data/_lama-unassigned-blocks.ts — нераспределённые блоки
     (work_type, zone) → суммарные минуты по магазинам, на основе самого
     свежего snapshot из .lama_snapshots/.
  2. lib/mock-data/_lama-employee-zones.ts — карта user_id → реальные зоны,
     агрегированная из ВСЕЙ истории snapshot'ов.

Маппинг shop_code → store_id и employee_id → user_id берётся из
lib/mock-data/_lama-real.ts (single source of truth для admin), через
regex по литералам массивов (не парсим TS — читаем построчно).

Использование:
    python tools/lama/regenerate-from-snapshots.py

Snapshot'ы создаются tools/lama/fetch-snapshot.py.
Stats по медианам — tools/lama/merge-stats.py.
"""
import io
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_DIR = ROOT / ".lama_snapshots"
LAMA_REAL = ROOT / "lib" / "mock-data" / "_lama-real.ts"
OUT_BLOCKS = ROOT / "lib" / "mock-data" / "_lama-unassigned-blocks.ts"
OUT_ZONES = ROOT / "lib" / "mock-data" / "_lama-employee-zones.ts"

# Стандартный набор LAMA-консистентных id'шников (см. требования задачи)
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

# Status'ы которые означают «уже выполнено / не нуждается в распределении».
COMPLETED_STATUSES = {"Completed", "Закрыт"}


def _normalize(s: str) -> str:
    """Нормализация для матчинга — collapse whitespace, strip."""
    return re.sub(r"\s+", " ", s.strip()) if s else s


def parse_lama_real() -> tuple[dict[str, tuple[int, str]], dict[int, int]]:
    """Парсит lib/mock-data/_lama-real.ts.

    Returns:
        (shop_map, user_map)
        - shop_map: external_code (4-digit string) → (store_id, store_name)
        - user_map: lama_employee_id (int) → admin user_id (int)
    """
    text = LAMA_REAL.read_text(encoding="utf-8")
    shop_map: dict[str, tuple[int, str]] = {}
    user_map: dict[int, int] = {}

    # Stores: { id: 200, name: "...", external_code: "0001", ...
    # Имя может содержать кавычки/спец-символы — берём всё между name: " и ", external_code:
    # Но проще: захватываем поле name отдельно через нелояльный матч до ближайшего ", и потом external_code в той же строке.
    shop_re = re.compile(
        r'\{\s*id:\s*(\d+)\s*,\s*name:\s*"([^"]+)"\s*,\s*[^}]*?external_code:\s*"(\d{4})"'
    )
    for m in shop_re.finditer(text):
        store_id = int(m.group(1))
        store_name = m.group(2)
        shop_code = m.group(3)
        # Если один shop_code маппится на несколько store_id (теоретически
        # возможный bug в _lama-real) — берём первый.
        if shop_code not in shop_map:
            shop_map[shop_code] = (store_id, store_name)

    # Users: { id: 300, external_id: 2058, ...
    user_re = re.compile(r"\{\s*id:\s*(\d+)\s*,\s*external_id:\s*(\d+)\s*,")
    for m in user_re.finditer(text):
        user_id = int(m.group(1))
        external_id = int(m.group(2))
        # external_id (lama_employee_id) → admin user_id; первый wins.
        if external_id not in user_map:
            user_map[external_id] = user_id

    return shop_map, user_map


def load_snapshots() -> list[tuple[str, dict]]:
    """Все snapshot'ы из .lama_snapshots/*.json (кроме служебных _*.json).

    Returns:
        [(date_str, snapshot_dict), ...] sorted by date ascending.
    """
    paths = sorted(p for p in SNAPSHOT_DIR.glob("*.json") if not p.name.startswith("_"))
    snaps = []
    for p in paths:
        date = p.stem  # YYYY-MM-DD
        try:
            data = json.loads(p.read_text(encoding="utf-8-sig"))
        except Exception as e:
            print(f"  ERR {p.name}: {e}", file=sys.stderr)
            continue
        snaps.append((date, data))
    return snaps


def calc_priority(total_minutes: int) -> int:
    """1=critical, 5=lowest."""
    if total_minutes >= 480:
        return 1
    if total_minutes >= 240:
        return 2
    if total_minutes >= 120:
        return 3
    if total_minutes >= 60:
        return 4
    return 5


def resolve_work_type(
    work: str,
    work_to_id: dict[str, int],
    next_id_holder: list[int],
    new_log: list[str],
) -> tuple[int, str]:
    norm = _normalize(work)
    if norm in work_to_id:
        wt_id = work_to_id[norm]
        return wt_id, WORK_TYPES.get(wt_id, norm)
    # Новый work_type — добавим
    wt_id = next_id_holder[0]
    next_id_holder[0] += 1
    work_to_id[norm] = wt_id
    WORK_TYPES[wt_id] = norm
    new_log.append(f"work_type id={wt_id} '{norm}'")
    return wt_id, norm


def resolve_zone(
    zone,
    zone_to_id: dict[str, int],
    next_id_holder: list[int],
    new_log: list[str],
) -> tuple[int, str]:
    if zone is None or zone == "N/A":
        return 112, ZONES[112]  # «Без зоны»
    norm = _normalize(zone)
    if norm in zone_to_id:
        z_id = zone_to_id[norm]
        return z_id, ZONES.get(z_id, norm)
    z_id = next_id_holder[0]
    next_id_holder[0] += 1
    zone_to_id[norm] = z_id
    ZONES[z_id] = norm
    new_log.append(f"zone id={z_id} '{norm}'")
    return z_id, norm


def ts_string_literal(s: str) -> str:
    """JS string literal (двойные кавычки) с эскейпом " и \\."""
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def write_blocks_file(blocks: list[dict], snapshot_date: str, n_snaps: int) -> None:
    n_blocks = len(blocks)
    n_stores = len({b["store_id"] for b in blocks})
    header = f'''/**
 * Нераспределённые блоки задач из LAMA — типичная дневная нагрузка
 * (work_type, zone) на каждый магазин (mean per-day across snapshots).
 *
 * Источник: усреднение по {n_snaps} snapshot'ам в .lama_snapshots/.
 * Date в записях — самый свежий snapshot ({snapshot_date}); если магазин
 * имел tasks хотя бы в одном snapshot'e, он попадает в выборку.
 * Регенерация: python tools/lama/regenerate-from-snapshots.py
 *
 * {n_blocks} блоков по {n_stores} магазинам.
 */
import type {{ UnassignedTaskBlock }} from "@/lib/types";

export const MOCK_UNASSIGNED_BLOCKS: UnassignedTaskBlock[] = [
'''
    lines = [header]
    for i, b in enumerate(blocks, start=1):
        bid = f"block-{i:04d}"
        line = (
            "  { "
            f'id: {ts_string_literal(bid)}, '
            f'store_id: {b["store_id"]}, '
            f'store_name: {ts_string_literal(b["store_name"])}, '
            f'date: {ts_string_literal(b["date"])}, '
            f'work_type_id: {b["work_type_id"]}, '
            f'work_type_name: {ts_string_literal(b["work_type_name"])}, '
            f'zone_id: {b["zone_id"]}, '
            f'zone_name: {ts_string_literal(b["zone_name"])}, '
            f'title: {ts_string_literal(b["title"])}, '
            f'total_minutes: {b["total_minutes"]}, '
            f'distributed_minutes: 0, '
            f'remaining_minutes: {b["total_minutes"]}, '
            f'priority: {b["priority"]}, '
            f'source: "LAMA", '
            f'created_at: {ts_string_literal(b["created_at"])}, '
            f'is_distributed: false, '
            f'spawned_task_ids: [] '
            "},\n"
        )
        lines.append(line)
    lines.append("];\n")
    OUT_BLOCKS.write_text("".join(lines), encoding="utf-8")


def write_zones_file(zones_by_user: dict[int, list[str]]) -> None:
    n_users = len(zones_by_user)
    all_zones = set()
    for zs in zones_by_user.values():
        all_zones.update(zs)
    n_zones = len(all_zones)

    header = f'''/**
 * Зоны сотрудников из LAMA-истории — какие зоны человек реально
 * выполнял (хоть 1 task в зоне → значит работает там).
 *
 * Сгенерировано из всех snapshot'ов в .lama_snapshots/.
 * Используется в getStoreEmployeesUtilization для проставления
 * реальных зон вместо fallback'а на дефолтные.
 *
 * {n_users} сотрудников, {n_zones} уникальных зон.
 */
export const LAMA_EMPLOYEE_ZONES: Record<number, string[]> = {{
'''
    lines = [header]
    for user_id in sorted(zones_by_user.keys()):
        zs = zones_by_user[user_id]
        zs_literal = ", ".join(ts_string_literal(z) for z in zs)
        lines.append(f"  {user_id}: [{zs_literal}],\n")
    lines.append("};\n")
    OUT_ZONES.write_text("".join(lines), encoding="utf-8")


def main() -> None:
    print("=== LAMA snapshot regenerator ===", file=sys.stderr)

    # 1. Парсинг _lama-real.ts
    shop_map, user_map = parse_lama_real()
    print(
        f"_lama-real.ts: {len(shop_map)} shops, {len(user_map)} users",
        file=sys.stderr,
    )

    # 2. Загрузка snapshot'ов
    snaps = load_snapshots()
    if not snaps:
        print("ERR: no snapshots in .lama_snapshots/", file=sys.stderr)
        sys.exit(1)
    print(f"Loaded {len(snaps)} snapshots: {[d for d, _ in snaps]}", file=sys.stderr)

    latest_date = snaps[-1][0]
    print(f"Aggregating blocks across all {len(snaps)} snapshots (avg per day)", file=sys.stderr)

    # 3. Подготовка reverse-словарей и счётчиков для новых ID
    work_to_id = {v: k for k, v in WORK_TYPES.items()}
    zone_to_id = {v: k for k, v in ZONES.items()}
    next_wt_id = [max(WORK_TYPES.keys()) + 1]
    next_zone_id = [max(ZONES.keys()) + 1]
    new_entries_log: list[str] = []

    # 4. Агрегация блоков по ВСЕМ snapshot'ам
    # Стратегия: для каждого магазина усредняем минуты по дням, в которых
    # этот магазин имел tasks. Шаги:
    #   a) per-day sums: (date, store_id, wt_id, zone_id) → minutes
    #   b) per-shop dates: store_id → set of dates shop had data
    #   c) blocks: (store_id, wt_id, zone_id) → mean(per-day-sum) over distinct dates
    # Это даёт типичную дневную нагрузку магазина, не зависит от попадания
    # магазина в самый свежий fetch (выходной день / 404 от LAMA / etc).
    per_day_minutes: dict[tuple[str, int, int, int], int] = defaultdict(int)
    shop_dates: dict[int, set[str]] = defaultdict(set)
    block_meta: dict[tuple[int, int, int], dict] = {}
    unmapped_shops: dict[str, int] = defaultdict(int)
    skipped_completed = 0
    total_tasks_seen = 0

    for snap_date, snap in snaps:
        for t in snap.get("tasks", []):
            total_tasks_seen += 1
            status = t.get("status")
            if status in COMPLETED_STATUSES:
                skipped_completed += 1
                continue
            sc = t.get("_shop_code")
            if not sc:
                continue
            if sc not in shop_map:
                unmapped_shops[sc] += 1
                continue
            store_id, store_name = shop_map[sc]

            work = t.get("operation_work")
            if not work:
                continue
            wt_id, wt_name = resolve_work_type(work, work_to_id, next_wt_id, new_entries_log)

            zone_raw = t.get("operation_zone")
            z_id, z_name = resolve_zone(zone_raw, zone_to_id, next_zone_id, new_entries_log)

            duration_sec = t.get("duration") or 0
            minutes = duration_sec // 60
            if minutes <= 0:
                continue

            shop_dates[store_id].add(snap_date)
            per_day_minutes[(snap_date, store_id, wt_id, z_id)] += minutes

            block_meta[(store_id, wt_id, z_id)] = {
                "store_id": store_id,
                "store_name": store_name,
                "work_type_id": wt_id,
                "work_type_name": wt_name,
                "zone_id": z_id,
                "zone_name": z_name,
                "title": f"{wt_name}: {z_name}",
            }

    # Средние по дням для каждой пары
    block_avg: dict[tuple[int, int, int], int] = defaultdict(int)
    for (snap_date, store_id, wt_id, z_id), minutes in per_day_minutes.items():
        block_avg[(store_id, wt_id, z_id)] += minutes
    for key in block_avg:
        store_id = key[0]
        n_days = len(shop_dates[store_id]) or 1
        block_avg[key] = round(block_avg[key] / n_days)

    # 5. Сортируем блоки и собираем финальные записи. Date в карточке —
    # самая свежая дата snapshot'а (это логически «блок на сегодня»).
    blocks = []
    for key, meta in sorted(block_meta.items()):
        minutes = block_avg[key]
        if minutes <= 0:
            continue
        blocks.append({
            **meta,
            "date": latest_date,
            "total_minutes": minutes,
            "created_at": f"{latest_date}T22:00:00+07:00",
            "priority": calc_priority(minutes),
        })

    # 6. Агрегация зон по сотрудникам — по ВСЕМ snapshot'ам
    zones_by_employee: dict[int, set[str]] = defaultdict(set)
    unmapped_employees: dict[int, int] = defaultdict(int)
    for date, snap in snaps:
        for t in snap.get("tasks", []):
            emp_id = t.get("_employee_id")
            zone_raw = t.get("operation_zone")
            if emp_id is None:
                continue
            if not zone_raw or zone_raw == "N/A":
                continue
            if emp_id not in user_map:
                unmapped_employees[emp_id] += 1
                continue
            user_id = user_map[emp_id]
            zones_by_employee[user_id].add(_normalize(zone_raw))

    zones_by_user_sorted = {
        uid: sorted(z) for uid, z in zones_by_employee.items()
    }

    # 7. Запись файлов
    write_blocks_file(blocks, latest_date, len(snaps))
    write_zones_file(zones_by_user_sorted)

    # 8. Отчёт
    print("", file=sys.stderr)
    print(f"Tasks across all snapshots: {total_tasks_seen}", file=sys.stderr)
    print(f"  Skipped (completed status): {skipped_completed}", file=sys.stderr)
    print(f"  Unmapped shop_codes: {dict(unmapped_shops) if unmapped_shops else 'none'}", file=sys.stderr)
    print(f"  Unmapped employee_ids: {len(unmapped_employees)} unique", file=sys.stderr)
    if unmapped_employees:
        sample = dict(list(unmapped_employees.items())[:5])
        print(f"    sample: {sample}", file=sys.stderr)
    print("", file=sys.stderr)
    print(f"Generated:", file=sys.stderr)
    print(f"  {OUT_BLOCKS.relative_to(ROOT)} — {len(blocks)} blocks, "
          f"{len({b['store_id'] for b in blocks})} stores", file=sys.stderr)
    print(f"  {OUT_ZONES.relative_to(ROOT)} — {len(zones_by_user_sorted)} users, "
          f"{len({z for zs in zones_by_user_sorted.values() for z in zs})} unique zones",
          file=sys.stderr)
    if new_entries_log:
        print("", file=sys.stderr)
        print("New WORK_TYPES/ZONES added during run:", file=sys.stderr)
        for s in new_entries_log:
            print(f"  + {s}", file=sys.stderr)


if __name__ == "__main__":
    main()
