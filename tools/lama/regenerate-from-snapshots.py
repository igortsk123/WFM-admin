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
OUT_WORK_TYPES = ROOT / "lib" / "mock-data" / "_lama-employee-work-types.ts"
OUT_MEDIANS = ROOT / "lib" / "mock-data" / "_lama-fallback-medians.ts"

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


def write_medians_file(
    per_day_minutes: dict[tuple[str, int, int, int], int],
    shop_dates: dict[int, set[str]],
) -> None:
    """Генерирует fallback-медианы per (work_type_id, zone_id) для магазинов
    без LAMA-данных. Используется в generateDefaultBlocksForStore().

    Алгоритм: для каждой пары (wt, zone) собираем все per-day-totals по shop'ам
    (где у магазина в этот день была эта пара), берём median.
    Округляем до 15 мин для опрятности (магазины планируют слотами по 15).
    """
    from statistics import median
    # (wt_id, zone_id) → list[per-day-minutes-across-shops]
    samples: dict[tuple[int, int], list[int]] = defaultdict(list)
    for (snap_date, store_id, wt_id, z_id), minutes in per_day_minutes.items():
        if minutes > 0:
            samples[(wt_id, z_id)].append(minutes)

    # Median + округление до 15
    medians: list[dict] = []
    for (wt_id, z_id), vals in samples.items():
        if len(vals) < 3:
            continue  # Слишком маленькая выборка — не доверяем
        m = round(median(vals) / 15) * 15
        if m < 15:
            continue
        medians.append({
            "wt_id": wt_id,
            "wt_name": WORK_TYPES.get(wt_id, "?"),
            "zone_id": z_id,
            "zone_name": ZONES.get(z_id, "?"),
            "minutes": m,
            "samples": len(vals),
        })

    # Sort: priority asc (по minutes desc — большие задачи в начале)
    medians.sort(key=lambda r: (-r["minutes"], r["wt_id"], r["zone_id"]))

    n_pairs = len(medians)
    header = f'''/**
 * Fallback-медианы per (work_type, zone) — для магазинов БЕЗ LAMA-данных
 * (например, базовые СПАР/Abricos моки которые не прошли через LAMA fetch).
 * Используется в generateDefaultBlocksForStore() как шаблон блоков.
 *
 * Median minutes посчитаны по всем shop-day observations из снимков:
 * для пары (wt, zone) собираем суммы за день по магазинам, берём median,
 * округляем до 15 мин. Включаем только пары где >= 3 sample (для надёжности).
 *
 * Сгенерировано из всех snapshot'ов в .lama_snapshots/.
 * Регенерация: python tools/lama/regenerate-from-snapshots.py.
 *
 * {n_pairs} пар (work_type × zone).
 */
export interface LamaMedianBlock {{
  wt_id: number;
  wt_name: string;
  zone_id: number;
  zone_name: string;
  minutes: number;
  samples: number;
}}

export const LAMA_FALLBACK_MEDIANS: LamaMedianBlock[] = [
'''
    lines = [header]
    for m in medians:
        line = (
            "  { "
            f'wt_id: {m["wt_id"]}, '
            f'wt_name: {ts_string_literal(m["wt_name"])}, '
            f'zone_id: {m["zone_id"]}, '
            f'zone_name: {ts_string_literal(m["zone_name"])}, '
            f'minutes: {m["minutes"]}, '
            f'samples: {m["samples"]} '
            "},\n"
        )
        lines.append(line)
    lines.append("];\n")
    OUT_MEDIANS.write_text("".join(lines), encoding="utf-8")


def write_work_types_file(wt_by_user: dict[int, list[str]]) -> None:
    n_users = len(wt_by_user)
    all_wts = set()
    for ws in wt_by_user.values():
        all_wts.update(ws)
    n_wts = len(all_wts)

    header = f'''/**
 * Типы работ сотрудников из LAMA-истории — какие work_type человек уже
 * выполнял (хоть 1 task этого типа → значит знает как).
 *
 * Сгенерировано из всех snapshot'ов в .lama_snapshots/.
 * Используется в DistributionSheet для фильтра «только подходящие
 * сотрудники» когда у задачи нет зоны (Касса/КСО/Менеджерские) —
 * fallback с zone-match на work-type-match.
 *
 * {n_users} сотрудников, {n_wts} уникальных типов работ.
 */
export const LAMA_EMPLOYEE_WORK_TYPES: Record<number, string[]> = {{
'''
    lines = [header]
    for user_id in sorted(wt_by_user.keys()):
        ws = wt_by_user[user_id]
        ws_literal = ", ".join(ts_string_literal(w) for w in ws)
        lines.append(f"  {user_id}: [{ws_literal}],\n")
    lines.append("};\n")
    OUT_WORK_TYPES.write_text("".join(lines), encoding="utf-8")


def write_zones_file(
    zones_by_user: dict[int, list[str]],
    inferred_ids: set[int] | None = None,
) -> None:
    inferred_ids = inferred_ids or set()
    n_users = len(zones_by_user)
    n_inferred = sum(1 for uid in zones_by_user if uid in inferred_ids)
    n_real = n_users - n_inferred
    all_zones = set()
    for zs in zones_by_user.values():
        all_zones.update(zs)
    n_zones = len(all_zones)
    avg_zones = (
        sum(len(zs) for zs in zones_by_user.values()) / max(n_users, 1)
    )

    header = f'''/**
 * Зоны сотрудников из LAMA-истории — какие зоны человек реально
 * выполнял (хоть 1 task в зоне → значит работает там).
 *
 * Сгенерировано из всех snapshot'ов в .lama_snapshots/.
 * Ключ — admin user_id когда сотрудник есть в `_lama-real.ts`,
 * иначе LAMA employee_id (для shop'ов вне выборки REAL_LAMA_USERS).
 * Используется в getStoreEmployeesUtilization для проставления реальных
 * зон вместо fallback'а на дефолтные. Включает peer-inferred entries
 * для сотрудников без собственной истории — на основе зон, которые
 * выполняли peers того же `position_name` в том же магазине (cap 6 зон).
 *
 * {n_users} сотрудников ({n_real} с реальной историей, {n_inferred} peer-inferred),
 * {n_zones} уникальных зон, среднее {avg_zones:.1f} зон/сотрудник.
 */
export const LAMA_EMPLOYEE_ZONES: Record<number, string[]> = {{
'''
    lines = [header]
    for user_id in sorted(zones_by_user.keys()):
        zs = zones_by_user[user_id]
        zs_literal = ", ".join(ts_string_literal(z) for z in zs)
        marker = " // inferred" if user_id in inferred_ids else ""
        lines.append(f"  {user_id}: [{zs_literal}],{marker}\n")
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

    # 6. Агрегация зон + work_types по сотрудникам — по ВСЕМ snapshot'ам, по ВСЕМ статусам.
    # Ключ — `resolved_id`: admin user_id если есть в user_map, иначе LAMA employee_id.
    # Это покрывает все 132 магазина (включая те которых нет в `_lama-real.ts`
    # как REAL_LAMA_USERS — там только 593 user'а из stores 200-229).
    # Используется в getStoreEmployeesUtilization (по shift.user_id) и в
    # toUtilizationFromPlanning (по resolved id из planning pool).
    #
    # Дополнительно: после прохода по реальной истории — peer-inference:
    # для сотрудника без личной истории зон берём пересечение зон same-position-name
    # peers в том же shop (директор/универсал в same shop ≈ same зон ассортимент).
    # Помечаем такие записи как `inferred` через отдельный set.
    #
    # Также собираем positions_by_emp + emp_to_shop для peer-inference.
    zones_by_resolved: dict[int, set[str]] = defaultdict(set)
    work_types_by_resolved: dict[int, set[str]] = defaultdict(set)
    emp_to_shop: dict[int, str] = {}
    emp_to_position: dict[int, str] = {}
    emp_resolved_id: dict[int, int] = {}
    shop_to_emps: dict[str, set[int]] = defaultdict(set)
    unmapped_employees: dict[int, int] = defaultdict(int)

    # 6.1 Сбор position/shop из employees секции snapshot'ов (latest wins)
    for _, snap in snaps:
        for e in snap.get("employees", []):
            emp_id = e.get("employee_id")
            sc = e.get("shop_code")
            if emp_id is None or not sc:
                continue
            emp_to_shop[emp_id] = sc
            emp_to_position[emp_id] = _normalize(e.get("position_name") or "")
            emp_resolved_id[emp_id] = user_map.get(emp_id, emp_id)
            shop_to_emps[sc].add(emp_id)

    # 6.2 Реальная история назначений — zones + work_types по фактическому
    # `_employee_id` task'ов (все статусы: `responsible_id` валидно везде).
    for _, snap in snaps:
        for t in snap.get("tasks", []):
            emp_id = t.get("_employee_id")
            if emp_id is None:
                continue
            # Resolve id: admin user_id если есть, иначе LAMA employee_id
            if emp_id not in user_map:
                unmapped_employees[emp_id] += 1
            resolved_id = user_map.get(emp_id, emp_id)
            # Бэкфилл shop/position если employee есть в task'ах но не было в employees секции
            if emp_id not in emp_resolved_id:
                emp_resolved_id[emp_id] = resolved_id
                sc = t.get("_shop_code")
                if sc:
                    emp_to_shop[emp_id] = sc
                    shop_to_emps[sc].add(emp_id)

            zone_raw = t.get("operation_zone")
            if zone_raw and zone_raw != "N/A":
                zones_by_resolved[resolved_id].add(_normalize(zone_raw))

            work_raw = t.get("operation_work")
            if work_raw:
                work_types_by_resolved[resolved_id].add(_normalize(work_raw))

    # 6.3 Peer-inference для сотрудников БЕЗ собственной истории зон.
    # Идея: same-position-name peers в same shop ≈ same зон ассортимент.
    # «Продавец-универсал» в shop X выкладывает примерно те же зоны что и
    # другие продавцы-универсалы того же shop. Мы НЕ даём ВСЕ зоны магазина —
    # только те которые реально работали peers того же position_name.
    # Ограничение: max 6 inferred zones per emp (чтобы фильтр не стал no-op).
    #
    # Helper: per-shop-per-position → union of peer zones
    INFERENCE_CAP = 6
    inferred_emps: set[int] = set()
    # peer_zone_pool[(shop_code, position_name)] = set[str]
    peer_zone_pool: dict[tuple[str, str], set[str]] = defaultdict(set)
    for emp_id, resolved_id in emp_resolved_id.items():
        sc = emp_to_shop.get(emp_id)
        pos = emp_to_position.get(emp_id, "")
        if not sc or not pos:
            continue
        z = zones_by_resolved.get(resolved_id, set())
        if z:
            peer_zone_pool[(sc, pos)].update(z)

    # Применяем pool к employees без zones
    inferred_count = 0
    for emp_id, resolved_id in emp_resolved_id.items():
        if zones_by_resolved.get(resolved_id):
            continue  # уже есть собственная история
        sc = emp_to_shop.get(emp_id)
        pos = emp_to_position.get(emp_id, "")
        if not sc:
            continue
        # Сначала пробуем same-position-in-same-shop pool
        pool = peer_zone_pool.get((sc, pos), set())
        if not pool and pos:
            # Фолбэк: same-shop любые peers (если ни один peer того же position
            # не работал — например уникальная роль в магазине). Это даёт хотя
            # бы какой-то signal, иначе фильтр всё равно сломается.
            pool = set()
            for (psc, _ppos), pz in peer_zone_pool.items():
                if psc == sc:
                    pool.update(pz)
        if not pool:
            continue
        # Cap inferred zones
        z_sorted = sorted(pool)[:INFERENCE_CAP]
        zones_by_resolved[resolved_id].update(z_sorted)
        inferred_emps.add(resolved_id)
        inferred_count += 1

    print(
        f"Zone inference: {inferred_count} employees got peer-inferred zones "
        f"(same-position-in-same-shop)",
        file=sys.stderr,
    )

    zones_by_user_sorted = {
        uid: sorted(z) for uid, z in zones_by_resolved.items()
    }
    work_types_by_user_sorted = {
        uid: sorted(w) for uid, w in work_types_by_resolved.items()
    }

    # 7. Запись файлов
    write_blocks_file(blocks, latest_date, len(snaps))
    write_zones_file(zones_by_user_sorted, inferred_emps)
    write_work_types_file(work_types_by_user_sorted)
    write_medians_file(per_day_minutes, shop_dates)

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
    print(f"  {OUT_WORK_TYPES.relative_to(ROOT)} — {len(work_types_by_user_sorted)} users, "
          f"{len({w for ws in work_types_by_user_sorted.values() for w in ws})} unique work_types",
          file=sys.stderr)
    # Подсчёт сколько пар попало в medians (для отчёта)
    from statistics import median as _median  # noqa: F401 (use re-import чтоб посчитать)
    median_pairs = sum(1 for v in {(wt, z): True for (_, _, wt, z) in per_day_minutes.keys()})
    print(f"  {OUT_MEDIANS.relative_to(ROOT)} — fallback-медианы для magazinov без LAMA",
          file=sys.stderr)
    if new_entries_log:
        print("", file=sys.stderr)
        print("New WORK_TYPES/ZONES added during run:", file=sys.stderr)
        for s in new_entries_log:
            print(f"  + {s}", file=sys.stderr)


if __name__ == "__main__":
    main()
