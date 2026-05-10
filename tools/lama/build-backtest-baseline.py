"""LAMA snapshots → 30-day rolling backtest baseline.

Берёт последние 30 дневных snapshot'ов из `.lama_snapshots/` и собирает
компактную «реальную картину» LAMA-распределения для backtest-скриптов
(сравнение «как наш алгоритм распределил бы» vs «как LAMA фактически
распределили»).

Формат — id-only, без redundant строк (work_type / zone / shop_code / status
ходят через индексные таблицы), сгруппированно по дате. На ~1300 tasks/day
× 30 days получается ~1.5 МБ TS-файл (vs ~9 МБ flat-array).

Помимо компактного хранилища экспортируем:
  * `BacktestTaskRecord` interface (как просит спецификация),
  * `LAMA_BACKTEST_BASELINE` — lazy-getter, материализующий записи из
    компактного представления.

Использование:
    python tools/lama/build-backtest-baseline.py [--days 30]

Snapshot'ы создаются `tools/lama/fetch-snapshot-async.py`.
Output: `lib/mock-data/_lama-backtest-baseline.ts`.
"""
import argparse
import io
import json
import sys
from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_DIR = ROOT / ".lama_snapshots"
OUT_FILE = ROOT / "lib" / "mock-data" / "_lama-backtest-baseline.ts"

# Status'ы которые означают «отменено» — их мы выбрасываем (нет ground truth).
SKIP_STATUSES = {"Cancelled", "Отменён", "Отменено"}

DEFAULT_DAYS = 30


def load_snapshots(days: int) -> list[tuple[str, dict]]:
    """Последние `days` snapshot'ов из .lama_snapshots/*.json (без _*.json).

    Returns:
        [(date_str, snapshot_dict), ...] sorted ascending by date.
    """
    paths = sorted(p for p in SNAPSHOT_DIR.glob("*.json") if not p.name.startswith("_"))
    if not paths:
        return []
    paths = paths[-days:]
    snaps: list[tuple[str, dict]] = []
    for p in paths:
        date = p.stem  # YYYY-MM-DD
        try:
            data = json.loads(p.read_text(encoding="utf-8-sig"))
        except Exception as e:
            print(f"  ERR {p.name}: {e}", file=sys.stderr)
            continue
        snaps.append((date, data))
    return snaps


def ts_string_literal(s: str) -> str:
    """JS string literal с двойными кавычками + эскейп `\\` и `"`."""
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def render_string_table(items: list[str]) -> str:
    """`["a", "b", "c"]` без пробелов между элементами (компактно)."""
    return "[" + ",".join(ts_string_literal(s) for s in items) + "]"


def index_or_add(table: list[str], idx_map: dict[str, int], value: str) -> int:
    """Возвращает индекс `value` в string-table; добавляет если новый."""
    cached = idx_map.get(value)
    if cached is not None:
        return cached
    idx = len(table)
    table.append(value)
    idx_map[value] = idx
    return idx


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--days",
        type=int,
        default=DEFAULT_DAYS,
        help=f"Сколько последних дней включать (default: {DEFAULT_DAYS}).",
    )
    args = parser.parse_args()

    print("=== LAMA backtest-baseline builder ===", file=sys.stderr)

    snaps = load_snapshots(args.days)
    if not snaps:
        print(
            f"ERR: no snapshots in {SNAPSHOT_DIR} (excluding _*.json)",
            file=sys.stderr,
        )
        sys.exit(1)

    date_from = snaps[0][0]
    date_to = snaps[-1][0]
    n_days = len(snaps)
    print(
        f"Loaded {n_days} snapshot(s): {date_from} .. {date_to}",
        file=sys.stderr,
    )

    # ─────────────────────────── String tables ───────────────────────────
    # Одни и те же строки повторяются десятки тысяч раз — выносим в
    # отдельные const-массивы и храним только индексы.
    shop_table: list[str] = []
    shop_idx: dict[str, int] = {}
    work_table: list[str] = []
    work_idx: dict[str, int] = {}
    zone_table: list[str] = []
    zone_idx: dict[str, int] = {}
    status_table: list[str] = []
    status_idx: dict[str, int] = {}

    # date → list[tuple-record]. Tuple layout:
    #   [task_id, shop_idx, emp_id, eis_id, shift_id, wt_idx, zone_idx, duration_min, status_idx]
    # zone_idx = -1 означает null (нет зоны).
    by_date: "OrderedDict[str, list[list[int]]]" = OrderedDict()

    skipped_status = 0
    skipped_no_emp = 0
    skipped_no_dur = 0
    skipped_no_meta = 0
    total_seen = 0
    total_kept = 0

    for snap_date, snap in snaps:
        recs: list[list[int]] = []
        for t in snap.get("tasks", []):
            total_seen += 1

            status = t.get("status") or ""
            if status in SKIP_STATUSES:
                skipped_status += 1
                continue

            emp_id = t.get("_employee_id")
            if not isinstance(emp_id, int):
                skipped_no_emp += 1
                continue

            duration_sec = t.get("duration")
            if not isinstance(duration_sec, int) or duration_sec <= 0:
                skipped_no_dur += 1
                continue
            duration_min = duration_sec // 60
            if duration_min <= 0:
                skipped_no_dur += 1
                continue

            shop_code = t.get("_shop_code")
            work = t.get("operation_work")
            task_id = t.get("id")
            if not shop_code or not work or not isinstance(task_id, int):
                skipped_no_meta += 1
                continue

            eis_raw = t.get("_eis_id")
            eis = int(eis_raw) if isinstance(eis_raw, int) else 0
            shift_raw = t.get("_shift_id")
            shift = int(shift_raw) if isinstance(shift_raw, int) else 0

            zone_raw = t.get("operation_zone")
            if isinstance(zone_raw, str) and zone_raw and zone_raw != "N/A":
                z_idx = index_or_add(zone_table, zone_idx, zone_raw)
            else:
                z_idx = -1  # encodes null

            sh_idx = index_or_add(shop_table, shop_idx, shop_code)
            w_idx = index_or_add(work_table, work_idx, work)
            st_idx = index_or_add(status_table, status_idx, status)

            recs.append(
                [task_id, sh_idx, emp_id, eis, shift, w_idx, z_idx, duration_min, st_idx]
            )
            total_kept += 1

        # Сортируем для детерминизма (диффы в git будут чистые).
        recs.sort(key=lambda r: (r[1], r[0]))  # by shop_idx, then task_id
        by_date[snap_date] = recs

    # ─────────────────────────── Render TS ───────────────────────────
    built_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    n_shops = len(shop_table)
    n_work_types = len(work_table)
    n_zones = len(zone_table)
    n_statuses = len(status_table)

    header = f'''/**
 * AUTO-GENERATED by tools/lama/build-backtest-baseline.py — do not edit by hand.
 *
 * 30-day rolling history of LAMA distribution outcomes — compact id-only.
 * Used by tools/lama/backtest-distribution.py to compare our algo vs reality.
 *
 * Storage layout: per-date arrays of int tuples + 4 string-tables
 * (shop_code / work_type / zone / status) → ~6x compression vs flat array.
 * Use {{@link LAMA_BACKTEST_BASELINE}} to materialize records as objects.
 *
 * Built at: {built_at}
 * Date range: {date_from} to {date_to} ({n_days} day(s))
 *
 * {total_kept} records, {n_shops} shops, {n_work_types} work_types,
 * {n_zones} zones, {n_statuses} statuses.
 */

export interface BacktestTaskRecord {{
  /** "YYYY-MM-DD" — день LAMA-снимка. */
  date: string;
  task_id: number;
  /** shop_code (4-digit), не shop_name — резолвить через _lama-real.ts. */
  shop_code: string;
  /** Ground truth — кто реально получил task в LAMA. */
  employee_id: number;
  eis_id: number;
  shift_id: number;
  /** operation_work из снапшота, like "Касса", "Выкладка: Бакалея". */
  work_type: string;
  /** operation_zone (null если задача без зоны). */
  zone: string | null;
  /** Минуты (округлено вниз из секунд снапшота). */
  duration: number;
  /** "Completed" / "Accepted" / "Suspended" / "InProgress" / "Created". */
  status: string;
}}

/**
 * Compact tuple — фиксированный layout:
 *   [task_id, shop_idx, employee_id, eis_id, shift_id,
 *    work_type_idx, zone_idx, duration_min, status_idx]
 * `zone_idx === -1` означает `zone: null`.
 */
export type BacktestTuple = [
  number, number, number, number, number, number, number, number, number,
];

export const BACKTEST_SHOPS: readonly string[] = {render_string_table(shop_table)};

export const BACKTEST_WORK_TYPES: readonly string[] = {render_string_table(work_table)};

export const BACKTEST_ZONES: readonly string[] = {render_string_table(zone_table)};

export const BACKTEST_STATUSES: readonly string[] = {render_string_table(status_table)};

/** date → tuples (compact storage; используйте {{@link LAMA_BACKTEST_BASELINE}}). */
export const BACKTEST_BY_DATE: Readonly<Record<string, readonly BacktestTuple[]>> = {{
'''

    lines: list[str] = [header]
    for date, recs in by_date.items():
        lines.append(f"  {ts_string_literal(date)}: [\n")
        for r in recs:
            # zone_idx → -1 stays as `-1`; downstream decoder maps to null.
            lines.append(
                "    [" + ",".join(str(v) for v in r) + "],\n"
            )
        lines.append("  ],\n")
    lines.append("};\n\n")

    # Eager-materialized array. Декодируем int-tuples в полные объекты при
    # импорте модуля — ~30K записей × pure-обращение к таблице, миллисекунды.
    # Серверные потребители (tools/lama/backtest-distribution.py) импортируют
    # массив объектов; компактное хранилище (BACKTEST_BY_DATE) остаётся для тех
    # кому хочется не материализовывать всё.
    lines.append(
        '''function _materializeBacktestBaseline(): BacktestTaskRecord[] {
  const out: BacktestTaskRecord[] = [];
  for (const date of Object.keys(BACKTEST_BY_DATE)) {
    const recs = BACKTEST_BY_DATE[date];
    for (const t of recs) {
      const zoneIdx = t[6];
      out.push({
        date,
        task_id: t[0],
        shop_code: BACKTEST_SHOPS[t[1]] ?? "",
        employee_id: t[2],
        eis_id: t[3],
        shift_id: t[4],
        work_type: BACKTEST_WORK_TYPES[t[5]] ?? "",
        zone: zoneIdx === -1 ? null : (BACKTEST_ZONES[zoneIdx] ?? null),
        duration: t[7],
        status: BACKTEST_STATUSES[t[8]] ?? "",
      });
    }
  }
  return out;
}

/** Полностью развёрнутый массив записей (декодирован из {@link BACKTEST_BY_DATE}). */
export const LAMA_BACKTEST_BASELINE: readonly BacktestTaskRecord[] = _materializeBacktestBaseline();

'''
    )

    lines.append(f"export const BACKTEST_BUILT_AT = {ts_string_literal(built_at)};\n")
    lines.append(
        "export const BACKTEST_DATE_RANGE: { from: string; to: string; days: number } = "
        f"{{ from: {ts_string_literal(date_from)}, "
        f"to: {ts_string_literal(date_to)}, "
        f"days: {n_days} }};\n"
    )
    lines.append(f"export const BACKTEST_TOTAL_RECORDS = {total_kept};\n")

    OUT_FILE.write_text("".join(lines), encoding="utf-8")

    # ─────────────────────────── Summary ───────────────────────────
    file_size = OUT_FILE.stat().st_size
    avg_per_day = total_kept // max(1, n_days)

    print("", file=sys.stderr)
    print(f"Tasks across {n_days} snapshot(s): {total_seen}", file=sys.stderr)
    print(f"  Skipped (status in SKIP_STATUSES): {skipped_status}", file=sys.stderr)
    print(f"  Skipped (no _employee_id): {skipped_no_emp}", file=sys.stderr)
    print(f"  Skipped (no/zero duration): {skipped_no_dur}", file=sys.stderr)
    print(f"  Skipped (no shop/work/id): {skipped_no_meta}", file=sys.stderr)
    print("", file=sys.stderr)
    print(
        f"processed {n_days} days, {total_kept} total records "
        f"(~{avg_per_day}/day), {n_shops} shops, ~{file_size // 1024} KB output",
        file=sys.stderr,
    )
    print(f"Wrote: {OUT_FILE.relative_to(ROOT)}", file=sys.stderr)


if __name__ == "__main__":
    main()
