"""LAMA snapshot → distribution-history analytics.

Читает ВСЕ snapshot'ы (`.lama_snapshots/*.json` без префикса `_`) и строит
расширенные статы для тюнинга auto-distribute алгоритма:

  1. Per (work_type, shop_code):
       - median_duration, count_total, count_completed, success_rate.
  2. Per employee_id:
       - total_tasks, success_rate, zones_worked,
       - affinity[work_type] = {count, median_duration},
       - daily_load_hours[].
  3. Per shop_code:
       - daily_workload_hours[],
       - peak_hour_distribution (час дня → объём задач),
       - work_type_mix (top-5 работ по частоте).

Результат — `lib/mock-data/_lama-distribution-stats.ts` (TS strict, без `any`).

Использование:
    python tools/lama/analyze-distribution.py

Входные данные — `_employee_id` в snapshot'е = «как LAMA фактически
распределил задачу сегодня». Это наша ground truth для скоринга.
"""
import io
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import median

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_DIR = ROOT / ".lama_snapshots"
OUT_FILE = ROOT / "lib" / "mock-data" / "_lama-distribution-stats.ts"

# Status'ы которые означают «задача успешно выполнена / принята».
# Created/InProgress/Suspended — ещё в работе, не считаем за success/fail.
COMPLETED_STATUSES = {"Completed", "Accepted"}
# Cancelled и подобные → broken/skipped. Created/InProgress/Suspended считаем
# в total, но не в completed.
SKIP_STATUSES = {"Cancelled", "Отменён", "Отменено"}


def load_snapshots() -> list[tuple[str, dict]]:
    """Все snapshot'ы из .lama_snapshots/*.json (кроме служебных _*.json).

    Returns:
        [(date_str, snapshot_dict), ...] sorted by date ascending.
    """
    paths = sorted(p for p in SNAPSHOT_DIR.glob("*.json") if not p.name.startswith("_"))
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


def parse_hour(time_str: str) -> int | None:
    """`'08:30:00'` → `8`. None / пустая → None."""
    if not time_str:
        return None
    try:
        # Принимаем `HH:MM:SS` или `HH:MM`.
        h = int(time_str.split(":", 1)[0])
        if 0 <= h <= 23:
            return h
    except (ValueError, IndexError):
        pass
    return None


def ts_string_literal(s: str) -> str:
    """JS string literal (двойные кавычки) с эскейпом `\\` и `"`."""
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def round1(x: float) -> float:
    """Округление до 1 знака после запятой."""
    return round(x, 1)


def render_number_array(arr: list[float]) -> str:
    """`[1.5, 2.0, 3.25]` → `'[1.5, 2, 3.25]'` (TS-friendly)."""
    parts: list[str] = []
    for v in arr:
        if v == int(v):
            parts.append(str(int(v)))
        else:
            parts.append(str(v))
    return "[" + ", ".join(parts) + "]"


def main() -> None:
    print("=== LAMA distribution-history analyzer ===", file=sys.stderr)

    snaps = load_snapshots()
    if not snaps:
        print(
            "ERR: no snapshots in .lama_snapshots/ (excluding _*.json)",
            file=sys.stderr,
        )
        sys.exit(1)

    date_from = snaps[0][0]
    date_to = snaps[-1][0]
    n_days = len(snaps)
    print(
        f"Loaded {n_days} snapshots: {date_from} .. {date_to}",
        file=sys.stderr,
    )

    # ─────────────────────────── Aggregators ───────────────────────────

    # work_type × shop_code → list[duration_seconds], counts.
    wt_shop_durations: dict[tuple[str, str], list[int]] = defaultdict(list)
    wt_shop_total: dict[tuple[str, str], int] = defaultdict(int)
    wt_shop_completed: dict[tuple[str, str], int] = defaultdict(int)

    # employee_id → totals.
    emp_total: dict[int, int] = defaultdict(int)
    emp_completed: dict[int, int] = defaultdict(int)
    emp_zones: dict[int, set[str]] = defaultdict(set)
    emp_name: dict[int, str] = {}
    # employee × work_type → durations + count.
    emp_wt_durations: dict[tuple[int, str], list[int]] = defaultdict(list)
    emp_wt_count: dict[tuple[int, str], int] = defaultdict(int)
    # employee × zone → count (для zone_affinity скоринга в iter#2).
    emp_zone_count: dict[tuple[int, str], int] = defaultdict(int)
    # employee × shop × work_type → count (peer-trust per-shop в iter#5).
    emp_shop_wt_count: dict[tuple[int, str, str], int] = defaultdict(int)
    # Per-day stickiness: для каждой даты — словарь (shop, zone, wt) → emp_id.
    # Алгоритм для дня N берёт stickiness за день N-1 (предыдущий) — это
    # имитирует «вчера в этом магазине Машa делала Молочку, сегодня скорее
    # ей же». Без data leak: предсказание на 5-10 не использует данные 5-10.
    stickiness_by_date: dict[str, dict[tuple[str, str, str], int]] = defaultdict(dict)
    # Shift-time alignment: shift_id → time_start (для слоя 3 — задача в N часов
    # утра идёт тому у кого смена с N часов).
    shift_start_by_id: dict[int, str] = {}
    # Per-(employee, date) shift start time — основной look-up для алго.
    emp_date_shift_start: dict[str, dict[int, str]] = defaultdict(dict)
    # employee × date → seconds (для daily_load).
    emp_day_seconds: dict[tuple[int, str], int] = defaultdict(int)

    # shop_code → totals.
    shop_day_seconds: dict[tuple[str, str], int] = defaultdict(int)
    shop_hour_count: dict[tuple[str, int], int] = defaultdict(int)
    shop_wt_count: dict[tuple[str, str], int] = defaultdict(int)
    shop_dates: dict[str, set[str]] = defaultdict(set)

    skipped_status = 0
    skipped_no_data = 0
    total_tasks_seen = 0

    for snap_date, snap in snaps:
        for t in snap.get("tasks", []):
            total_tasks_seen += 1
            status = t.get("status") or ""
            if status in SKIP_STATUSES:
                skipped_status += 1
                continue

            work = t.get("operation_work") or ""
            shop_code = t.get("_shop_code") or ""
            if not work or not shop_code:
                skipped_no_data += 1
                continue

            duration = int(t.get("duration") or 0)
            if duration <= 0:
                skipped_no_data += 1
                continue

            is_completed = status in COMPLETED_STATUSES

            # 1. work_type × shop_code
            wt_shop_durations[(work, shop_code)].append(duration)
            wt_shop_total[(work, shop_code)] += 1
            if is_completed:
                wt_shop_completed[(work, shop_code)] += 1

            # 2. employee
            emp_id = t.get("_employee_id")
            if isinstance(emp_id, int):
                emp_total[emp_id] += 1
                if is_completed:
                    emp_completed[emp_id] += 1
                if not emp_name.get(emp_id):
                    name = t.get("_employee_name")
                    if isinstance(name, str) and name:
                        emp_name[emp_id] = name
                zone = t.get("operation_zone")
                if isinstance(zone, str) and zone and zone != "N/A":
                    emp_zones[emp_id].add(zone)
                    emp_zone_count[(emp_id, zone)] += 1
                emp_wt_durations[(emp_id, work)].append(duration)
                emp_wt_count[(emp_id, work)] += 1
                emp_shop_wt_count[(emp_id, shop_code, work)] += 1
                emp_day_seconds[(emp_id, snap_date)] += duration

                # Per-day stickiness: записываем под snap_date.
                zone_key = zone if isinstance(zone, str) and zone and zone != "N/A" else ""
                stick_key = (shop_code, zone_key, work)
                stickiness_by_date[snap_date][stick_key] = emp_id

                # Shift-time fallback (если в snapshot нет полных shift records):
                # time_start первой task в shift'е ≈ старт смены.
                shift_id = t.get("_shift_id")
                time_start = t.get("time_start") or ""
                if isinstance(shift_id, int) and time_start:
                    prev_ts = shift_start_by_id.get(shift_id)
                    if prev_ts is None or time_start < prev_ts:
                        shift_start_by_id[shift_id] = time_start

        # Iter#6: реальные shift records из snapshot.shifts[] (если есть).
        # Перезаписывает fallback values полученные через tasks.
        for sh in snap.get("shifts", []):
            sid = sh.get("shift_id")
            ts = sh.get("time_start")
            eid = sh.get("employee_id")
            if isinstance(sid, int) and isinstance(ts, str) and ts:
                shift_start_by_id[sid] = ts
            if isinstance(eid, int) and isinstance(ts, str) and ts:
                emp_date_shift_start[snap_date][eid] = ts

            # 3. shop
            shop_dates[shop_code].add(snap_date)
            shop_day_seconds[(shop_code, snap_date)] += duration
            shop_wt_count[(shop_code, work)] += 1
            hour = parse_hour(t.get("time_start") or "")
            if hour is not None:
                shop_hour_count[(shop_code, hour)] += 1

    # ─────────────────────────── Build output rows ───────────────────────────

    # 1. WORK_TYPE_STATS — keyed by `${work_type}::${shop_code}`.
    wt_stats_rows: list[dict] = []
    for (work, shop_code), durations in sorted(wt_shop_durations.items()):
        total = wt_shop_total[(work, shop_code)]
        completed = wt_shop_completed[(work, shop_code)]
        med_dur = int(median(durations)) if durations else 0
        success_rate = round1(completed / total) if total else 0.0
        wt_stats_rows.append(
            {
                "work_type": work,
                "shop_code": shop_code,
                "median_duration": med_dur,
                "count_total": total,
                "count_completed": completed,
                "success_rate": success_rate,
            }
        )

    # 2. EMPLOYEE_STATS.
    emp_stats_rows: list[dict] = []
    for emp_id in sorted(emp_total.keys()):
        total = emp_total[emp_id]
        completed = emp_completed[emp_id]
        success_rate = round1(completed / total) if total else 0.0
        zones = sorted(emp_zones.get(emp_id, set()))

        # affinity[work_type]
        affinity: dict[str, dict] = {}
        for (eid, wt), cnt in emp_wt_count.items():
            if eid != emp_id:
                continue
            durations = emp_wt_durations[(eid, wt)]
            affinity[wt] = {
                "count": cnt,
                "median_duration": int(median(durations)) if durations else 0,
            }

        # zone_affinity[zone] = count (для weighted scoring в auto-distribute).
        zone_affinity: dict[str, int] = {}
        for (eid, zn), cnt in emp_zone_count.items():
            if eid != emp_id:
                continue
            zone_affinity[zn] = cnt

        # daily_load_hours = sorted by date, hours per active day.
        daily_pairs = sorted(
            (date, sec) for (eid, date), sec in emp_day_seconds.items() if eid == emp_id
        )
        daily_load_hours = [round1(sec / 3600) for _, sec in daily_pairs]

        emp_stats_rows.append(
            {
                "employee_id": emp_id,
                "name": emp_name.get(emp_id, ""),
                "total_tasks": total,
                "count_completed": completed,
                "success_rate": success_rate,
                "zones_worked": zones,
                "affinity": affinity,
                "zone_affinity": zone_affinity,
                "daily_load_hours": daily_load_hours,
            }
        )

    # 3. SHOP_STATS.
    shop_stats_rows: list[dict] = []
    for shop_code in sorted(shop_dates.keys()):
        # daily_workload_hours — sorted by date.
        daily_pairs = sorted(
            (date, sec)
            for (sc, date), sec in shop_day_seconds.items()
            if sc == shop_code
        )
        daily_hours = [round1(sec / 3600) for _, sec in daily_pairs]

        # peak_hour_distribution: {hour: count}.
        hour_dist: dict[int, int] = {}
        for (sc, hour), cnt in shop_hour_count.items():
            if sc == shop_code:
                hour_dist[hour] = cnt

        # work_type_mix: top-5 by count desc.
        wt_pairs = [
            (wt, cnt) for (sc, wt), cnt in shop_wt_count.items() if sc == shop_code
        ]
        wt_pairs.sort(key=lambda p: (-p[1], p[0]))
        top5 = wt_pairs[:5]

        shop_stats_rows.append(
            {
                "shop_code": shop_code,
                "daily_workload_hours": daily_hours,
                "peak_hour_distribution": hour_dist,
                "work_type_mix": [
                    {"work_type": wt, "count": cnt} for wt, cnt in top5
                ],
            }
        )

    # ─────────────────────────── Render TS ───────────────────────────

    built_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    n_employees = len(emp_stats_rows)
    n_work_types = len({wt for (wt, _) in wt_shop_durations.keys()})
    n_shops = len(shop_stats_rows)
    n_combinations = len(wt_stats_rows)
    total_completed_tasks = sum(emp_completed.values())  # tasks-with-employee
    # Plus tasks with no employee_id but valid duration (still counted in wt_shop)
    total_with_dur = sum(wt_shop_total.values())

    header = f'''/**
 * AUTO-GENERATED by tools/lama/analyze-distribution.py — do not edit by hand.
 *
 * Distribution history analytics from {n_days} daily LAMA snapshots.
 * Used by auto-distribute algorithm to score (task → employee) candidates:
 *
 *   - WORK_TYPE_STATS — typical duration / success rate per (work_type × shop)
 *   - EMPLOYEE_STATS  — workload, affinity by work_type, zones worked
 *   - SHOP_STATS      — daily workload, hour-of-day curve, top work types
 *
 * Built at: {built_at}
 * Source date range: {date_from} to {date_to} ({n_days} days)
 *
 * {n_employees} unique employees, {n_work_types} unique work_types,
 * {n_combinations} (work_type × shop) combinations, {n_shops} shops.
 */

export interface WorkTypeStats {{
  work_type: string;
  shop_code: string;
  median_duration: number;
  count_total: number;
  count_completed: number;
  success_rate: number;
}}

export interface EmployeeAffinity {{
  count: number;
  median_duration: number;
}}

export interface EmployeeStats {{
  employee_id: number;
  name: string;
  total_tasks: number;
  count_completed: number;
  success_rate: number;
  zones_worked: string[];
  affinity: Record<string, EmployeeAffinity>;
  /** Per-zone task count from real history — для weighted scoring в auto-distribute. */
  zone_affinity: Record<string, number>;
  daily_load_hours: number[];
}}

export interface ShopWorkTypeMixEntry {{
  work_type: string;
  count: number;
}}

export interface ShopWorkloadStats {{
  shop_code: string;
  daily_workload_hours: number[];
  peak_hour_distribution: Record<number, number>;
  work_type_mix: ShopWorkTypeMixEntry[];
}}

'''

    lines: list[str] = [header]

    # WORK_TYPE_STATS — Record<string, WorkTypeStats> keyed by `${work_type}::${shop_code}`.
    lines.append(
        f"// {n_combinations} (work_type × shop) combinations.\n"
    )
    lines.append("export const WORK_TYPE_STATS: Record<string, WorkTypeStats> = {\n")
    for r in wt_stats_rows:
        key = f"{r['work_type']}::{r['shop_code']}"
        lines.append(
            f"  {ts_string_literal(key)}: {{ "
            f"work_type: {ts_string_literal(r['work_type'])}, "
            f"shop_code: {ts_string_literal(r['shop_code'])}, "
            f"median_duration: {r['median_duration']}, "
            f"count_total: {r['count_total']}, "
            f"count_completed: {r['count_completed']}, "
            f"success_rate: {r['success_rate']} "
            "},\n"
        )
    lines.append("};\n\n")

    # EMPLOYEE_STATS — Record<number, EmployeeStats>.
    lines.append(f"// {n_employees} unique employees.\n")
    lines.append(
        "export const EMPLOYEE_STATS: Record<number, EmployeeStats> = {\n"
    )
    for r in emp_stats_rows:
        lines.append(f"  {r['employee_id']}: {{\n")
        lines.append(f"    employee_id: {r['employee_id']},\n")
        lines.append(f"    name: {ts_string_literal(r['name'])},\n")
        lines.append(f"    total_tasks: {r['total_tasks']},\n")
        lines.append(f"    count_completed: {r['count_completed']},\n")
        lines.append(f"    success_rate: {r['success_rate']},\n")
        zones_lit = ", ".join(ts_string_literal(z) for z in r["zones_worked"])
        lines.append(f"    zones_worked: [{zones_lit}],\n")
        # affinity
        if not r["affinity"]:
            lines.append("    affinity: {},\n")
        else:
            lines.append("    affinity: {\n")
            for wt in sorted(r["affinity"].keys()):
                aff = r["affinity"][wt]
                lines.append(
                    f"      {ts_string_literal(wt)}: {{ "
                    f"count: {aff['count']}, "
                    f"median_duration: {aff['median_duration']} "
                    "},\n"
                )
            lines.append("    },\n")
        # zone_affinity
        if not r["zone_affinity"]:
            lines.append("    zone_affinity: {},\n")
        else:
            lines.append("    zone_affinity: {\n")
            for zn in sorted(r["zone_affinity"].keys()):
                lines.append(
                    f"      {ts_string_literal(zn)}: {r['zone_affinity'][zn]},\n"
                )
            lines.append("    },\n")
        lines.append(
            f"    daily_load_hours: {render_number_array(r['daily_load_hours'])},\n"
        )
        lines.append("  },\n")
    lines.append("};\n\n")

    # SHOP_STATS — Record<string, ShopWorkloadStats>.
    lines.append(f"// {n_shops} unique shops.\n")
    lines.append(
        "export const SHOP_STATS: Record<string, ShopWorkloadStats> = {\n"
    )
    for r in shop_stats_rows:
        lines.append(f"  {ts_string_literal(r['shop_code'])}: {{\n")
        lines.append(f"    shop_code: {ts_string_literal(r['shop_code'])},\n")
        lines.append(
            f"    daily_workload_hours: {render_number_array(r['daily_workload_hours'])},\n"
        )
        # peak_hour_distribution
        if not r["peak_hour_distribution"]:
            lines.append("    peak_hour_distribution: {},\n")
        else:
            lines.append("    peak_hour_distribution: {\n")
            for hour in sorted(r["peak_hour_distribution"].keys()):
                lines.append(
                    f"      {hour}: {r['peak_hour_distribution'][hour]},\n"
                )
            lines.append("    },\n")
        # work_type_mix
        if not r["work_type_mix"]:
            lines.append("    work_type_mix: [],\n")
        else:
            lines.append("    work_type_mix: [\n")
            for entry in r["work_type_mix"]:
                lines.append(
                    f"      {{ work_type: {ts_string_literal(entry['work_type'])}, "
                    f"count: {entry['count']} }},\n"
                )
            lines.append("    ],\n")
        lines.append("  },\n")
    lines.append("};\n\n")

    # ─── Iter#5 stickiness + per-shop affinity + shift-times ───
    # STICKINESS_BY_DATE[date]["${shop}::${zone}::${wt}"] = emp_id
    # Алгоритм для дня N использует данные за день N-1. Без data leak.
    total_stick_keys = sum(len(d) for d in stickiness_by_date.values())
    lines.append(
        f"// Per-day stickiness ({len(stickiness_by_date)} dates, "
        f"{total_stick_keys} total keys).\n"
    )
    lines.append(
        "export const STICKINESS_BY_DATE: Record<string, Record<string, number>> = {\n"
    )
    for date in sorted(stickiness_by_date.keys()):
        day_map = stickiness_by_date[date]
        lines.append(f"  {ts_string_literal(date)}: {{\n")
        for key in sorted(day_map.keys()):
            sc, zone, wt = key
            composite = f"{sc}::{zone}::{wt}"
            lines.append(
                f"    {ts_string_literal(composite)}: {day_map[key]},\n"
            )
        lines.append("  },\n")
    lines.append("};\n\n")

    # SHIFT_START_BY_ID[shift_id] = "HH:MM:SS"
    lines.append(
        f"// Shift start times ({len(shift_start_by_id)} shift_ids).\n"
    )
    lines.append(
        "export const SHIFT_START_BY_ID: Record<number, string> = {\n"
    )
    for sid in sorted(shift_start_by_id.keys()):
        lines.append(
            f"  {sid}: {ts_string_literal(shift_start_by_id[sid])},\n"
        )
    lines.append("};\n\n")

    # Iter#6: EMPLOYEE_SHIFT_START_BY_DATE[date][emp_id] = "HH:MM:SS"
    # Прямой реальный shift start, из endpoint /shift/?employee_in_shop_id.
    total_emp_shifts = sum(len(d) for d in emp_date_shift_start.values())
    lines.append(
        f"// Per-(date, emp) shift start times ({len(emp_date_shift_start)} dates, "
        f"{total_emp_shifts} entries).\n"
    )
    lines.append(
        "export const EMPLOYEE_SHIFT_START_BY_DATE: "
        "Record<string, Record<number, string>> = {\n"
    )
    for date in sorted(emp_date_shift_start.keys()):
        day_map = emp_date_shift_start[date]
        lines.append(f"  {ts_string_literal(date)}: {{\n")
        for eid in sorted(day_map.keys()):
            lines.append(f"    {eid}: {ts_string_literal(day_map[eid])},\n")
        lines.append("  },\n")
    lines.append("};\n\n")

    # SHOP_EMPLOYEE_WT_COUNT[`${shop}::${emp_id}::${work_type}`] = count
    # Per-shop affinity — учитывает локальные предпочтения директора этого
    # магазина. У одного шопа Молочка → Свете, у другого → Маше.
    lines.append(
        f"// Per-shop employee × work_type counts ({len(emp_shop_wt_count)} keys).\n"
    )
    lines.append(
        "export const SHOP_EMPLOYEE_WT_COUNT: Record<string, number> = {\n"
    )
    for key in sorted(emp_shop_wt_count.keys()):
        eid, sc, wt = key
        composite = f"{sc}::{eid}::{wt}"
        lines.append(
            f"  {ts_string_literal(composite)}: {emp_shop_wt_count[key]},\n"
        )
    lines.append("};\n\n")

    # Constants.
    lines.append(f"export const ANALYSIS_BUILT_AT = {ts_string_literal(built_at)};\n")
    lines.append(f"export const ANALYSIS_SOURCE_DAYS = {n_days};\n")
    lines.append(
        f"export const ANALYSIS_SOURCE_DATE_FROM = {ts_string_literal(date_from)};\n"
    )
    lines.append(
        f"export const ANALYSIS_SOURCE_DATE_TO = {ts_string_literal(date_to)};\n"
    )

    OUT_FILE.write_text("".join(lines), encoding="utf-8")

    # ─────────────────────────── Summary ───────────────────────────

    print("", file=sys.stderr)
    print(f"Total tasks across snapshots: {total_tasks_seen}", file=sys.stderr)
    print(f"  Skipped (status in SKIP_STATUSES): {skipped_status}", file=sys.stderr)
    print(
        f"  Skipped (no work/shop/duration): {skipped_no_data}", file=sys.stderr
    )
    print(f"  Counted (with valid work + duration): {total_with_dur}", file=sys.stderr)
    print("", file=sys.stderr)
    print(
        f"analyzed {n_days} snapshots ({date_from} .. {date_to}), "
        f"{n_employees} unique employees, {n_work_types} unique work_types, "
        f"total tasks: {total_with_dur}",
        file=sys.stderr,
    )
    print(f"Wrote: {OUT_FILE.relative_to(ROOT)}", file=sys.stderr)


if __name__ == "__main__":
    main()
