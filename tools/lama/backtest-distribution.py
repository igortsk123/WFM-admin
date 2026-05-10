"""Backtest pipeline: наш auto-distribute алгоритм vs реальная LAMA-история.

Идея:
    1. Берём `_lama-backtest-baseline.ts` (ground truth: task -> real employee).
    2. Группируем по (date, shop_code) — для каждого shop/day строим
       «pre-distribution state»: те же задачи без employee_id.
    3. Кандидатов берём из `_lama-planning-pool.ts` (доступные сотрудники
       магазина) — это «текущий план», ближе всего к тому что увидел бы
       директор открывший /tasks/distribute.
    4. Зоны/work_types сотрудников — из `_lama-employee-zones.ts` и
       `_lama-employee-work-types.ts` (LAMA history).
    5. Affinity tiebreaker — из `_lama-distribution-stats.ts::EMPLOYEE_STATS`.
    6. Гоним greedy distribute (port `lib/api/distribution.ts::autoDistribute`).
    7. Per-task: совпал ли наш предложенный с real?
       Совпадение если real_employee_id ∈ allocations_userIds.
    8. Считаем match% per shop, per day, median по магазинам.
    9. Output:
       - `tools/lama/backtest-results/YYYY-MM-DD-summary.md` (full report)
       - `lib/mock-data/_backtest-summary.ts` (минимальный — match_rate per shop)
       - stdout summary

Запуск:
    python tools/lama/backtest-distribution.py

Это manual run script — не cron'им (раз в неделю достаточно).

Замечания о точности порта:
    * Synthetic shift = 12h × N employees = пул свободного времени = 720*N мин.
    * Caveat: без реальных смен мы не знаем кто реально был на смене в каждый
      из дней. Используем planning-pool snapshot (current day) как proxy для
      всех дат — это первая аппроксимация.
    * `assigned_min` per emp на старте = 0 (как в planning pool).
    * `priority` для каждой задачи считаем по minutes (как `calc_priority`
      в regenerate-from-snapshots.py).
    * Метрика «совпадение» по userId-set, не по точному split минут — это
      достаточно для понимания насколько алгоритм попадает в правильного
      исполнителя.
"""
from __future__ import annotations

import io
import json
import re
import statistics
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

# UTF-8 stdout/stderr (Windows)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[2]
MOCK_DATA = ROOT / "lib" / "mock-data"
SNAPSHOT_DIR = ROOT / ".lama_snapshots"

BASELINE_FILE = MOCK_DATA / "_lama-backtest-baseline.ts"
ZONES_FILE = MOCK_DATA / "_lama-employee-zones.ts"
WORK_TYPES_FILE = MOCK_DATA / "_lama-employee-work-types.ts"
STATS_FILE = MOCK_DATA / "_lama-distribution-stats.ts"
POOL_FILE = MOCK_DATA / "_lama-planning-pool.ts"

OUT_RESULTS_DIR = ROOT / "tools" / "lama" / "backtest-results"
OUT_SUMMARY_TS = MOCK_DATA / "_backtest-summary.ts"


def load_employee_positions() -> dict[int, str]:
    """Читает snapshots → {employee_id: position_name}.

    Используется в iter#2 scoring (rank_seniority по position keyword).
    Если у emp_id меняется position между snapshot'ами — берём latest.
    """
    out: dict[int, str] = {}
    snap_files = sorted(
        f for f in SNAPSHOT_DIR.glob("*.json") if not f.name.startswith("_")
    )
    for sf in snap_files:
        try:
            data = json.loads(sf.read_text(encoding="utf-8-sig"))
        except Exception:
            continue
        for e in data.get("employees", []):
            eid = e.get("employee_id")
            pos = e.get("position_name") or ""
            if isinstance(eid, int) and pos:
                out[eid] = pos
    return out


# ─────────────────────────────────────────────────────────────────────
# Iter#2 scoring weights (mirror of TS lib/api/distribution.ts).
# ─────────────────────────────────────────────────────────────────────
SCORE_WEIGHT_ZONE = 0.41
SCORE_WEIGHT_WTYPE = 0.37
SCORE_WEIGHT_BALANCE = 0.11
SCORE_WEIGHT_RANK = 0.11


def minmax_norm(value: float, lo: float, hi: float) -> float:
    if hi <= lo:
        return 1.0 if value > 0 else 0.0
    return (value - lo) / (hi - lo)

# ─────────────────────────────────────────────────────────────────────
# TS parsing — primitive regex extraction (TS файлы auto-generated, легко
# распарсить через регулярки + json.loads на массивах).
# ─────────────────────────────────────────────────────────────────────


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig")


def parse_string_array(text: str, var_name: str) -> list[str]:
    """Парсит `export const VAR_NAME: ... = ["a","b",...]`."""
    pattern = re.compile(
        rf'export const {re.escape(var_name)}[^=]*=\s*(\[.*?\]);', re.DOTALL
    )
    m = pattern.search(text)
    if not m:
        raise ValueError(f"Couldn't find array {var_name}")
    raw = m.group(1)
    # Already valid JSON
    return json.loads(raw)


def parse_backtest_by_date(text: str) -> dict[str, list[list[int]]]:
    """Парсит `export const BACKTEST_BY_DATE = {"2026-05-07": [[..],..], ...}`."""
    # Find start of the BACKTEST_BY_DATE block
    start_pat = re.compile(
        r'export const BACKTEST_BY_DATE[^=]*=\s*\{', re.DOTALL
    )
    m = start_pat.search(text)
    if not m:
        raise ValueError("Couldn't find BACKTEST_BY_DATE")
    pos = m.end()  # position right after opening `{`

    out: dict[str, list[list[int]]] = {}
    # Iterate date keys
    date_pat = re.compile(r'"(\d{4}-\d{2}-\d{2})":\s*\[')
    while True:
        # Skip whitespace/commas
        while pos < len(text) and text[pos] in " \t\n\r,":
            pos += 1
        # End of object?
        if pos < len(text) and text[pos] == "}":
            break
        m = date_pat.match(text, pos)
        if not m:
            break
        date = m.group(1)
        pos = m.end()
        # Now read tuples until matching ]
        tuples: list[list[int]] = []
        while True:
            while pos < len(text) and text[pos] in " \t\n\r,":
                pos += 1
            if pos < len(text) and text[pos] == "]":
                pos += 1  # consume `]`
                break
            # Expect [
            if text[pos] != "[":
                raise ValueError(f"Expected `[` at pos {pos}: {text[pos:pos+50]!r}")
            end = text.index("]", pos)
            tup_str = text[pos : end + 1]
            tuples.append(json.loads(tup_str))
            pos = end + 1
        out[date] = tuples

    return out


def parse_employee_arrays(text: str, var_name: str) -> dict[int, list[str]]:
    """Парсит `export const VAR: Record<number, string[]> = { 301: ["a","b"], ... }`."""
    start_pat = re.compile(
        rf'export const {re.escape(var_name)}[^=]*=\s*\{{', re.DOTALL
    )
    m = start_pat.search(text)
    if not m:
        raise ValueError(f"Couldn't find {var_name}")
    pos = m.end()

    out: dict[int, list[str]] = {}
    entry_pat = re.compile(r'(\d+):\s*\[')
    while True:
        while pos < len(text) and text[pos] in " \t\n\r,":
            pos += 1
        if pos < len(text) and text[pos] == "}":
            break
        m = entry_pat.match(text, pos)
        if not m:
            break
        emp_id = int(m.group(1))
        pos = m.end() - 1  # pos at `[`
        end = text.index("]", pos)
        arr_str = text[pos : end + 1]
        out[emp_id] = json.loads(arr_str)
        pos = end + 1

    return out


def parse_employee_stats_zone_affinity(text: str) -> dict[int, dict[str, int]]:
    """Парсит zone_affinity per emp из EMPLOYEE_STATS.

    Returns { emp_id -> { zone_name: count } }.
    """
    start_pat = re.compile(r'export const EMPLOYEE_STATS[^=]*=\s*\{', re.DOTALL)
    m = start_pat.search(text)
    if not m:
        return {}
    body_start = m.end()
    depth = 1
    pos = body_start
    while pos < len(text) and depth > 0:
        c = text[pos]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                break
        pos += 1
    body = text[body_start:pos]

    out: dict[int, dict[str, int]] = {}
    entry_pat = re.compile(r'\n  (\d+):\s*\{')
    matches = list(entry_pat.finditer(body))
    for m in matches:
        emp_id = int(m.group(1))
        entry_start = m.end() - 1
        depth = 1
        p = entry_start + 1
        while p < len(body) and depth > 0:
            c = body[p]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    break
            p += 1
        entry_body = body[entry_start + 1 : p]
        za_match = re.search(r'zone_affinity:\s*\{', entry_body)
        if not za_match:
            continue
        za_start = za_match.end() - 1
        d = 1
        q = za_start + 1
        while q < len(entry_body) and d > 0:
            c = entry_body[q]
            if c == "{":
                d += 1
            elif c == "}":
                d -= 1
                if d == 0:
                    break
            q += 1
        za_body = entry_body[za_start + 1 : q]
        zn_pat = re.compile(r'"([^"]+)":\s*(\d+)')
        zone_aff: dict[str, int] = {}
        for zn_m in zn_pat.finditer(za_body):
            zone_aff[zn_m.group(1)] = int(zn_m.group(2))
        if zone_aff:
            out[emp_id] = zone_aff
    return out


def rank_seniority(position_name: str) -> int:
    """Same logic as TS `rankSeniority` in `lib/api/distribution.ts`."""
    p = (position_name or "").lower()
    if "управляющий магазином" in p:
        return 8
    if "заместитель управляющего" in p:
        return 7
    if "старший смены" in p:
        return 5
    if "старший" in p:
        return 4
    if "заместитель" in p:
        return 4
    if "администратор" in p:
        return 3
    if "универсал" in p:
        return 2
    return 1


def parse_employee_stats_affinity(text: str) -> dict[int, dict[str, int]]:
    """Парсит EMPLOYEE_STATS, возвращает только { emp_id -> { work_type: count } }.

    Полный объект тяжёлый — нам нужен только affinity.count для tiebreaker.
    """
    # Find EMPLOYEE_STATS block
    start_pat = re.compile(
        r'export const EMPLOYEE_STATS[^=]*=\s*\{', re.DOTALL
    )
    m = start_pat.search(text)
    if not m:
        raise ValueError("Couldn't find EMPLOYEE_STATS")
    body_start = m.end()
    # Walk to balanced closing }
    depth = 1
    pos = body_start
    while pos < len(text) and depth > 0:
        c = text[pos]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                break
        pos += 1
    body = text[body_start:pos]

    # Split entries: top-level emp_id -> { ... } pairs
    out: dict[int, dict[str, int]] = {}
    # Simple approach: find each `\n  NNN: {` and parse forward to balanced }
    entry_pat = re.compile(r'\n  (\d+):\s*\{')
    matches = list(entry_pat.finditer(body))
    for i, m in enumerate(matches):
        emp_id = int(m.group(1))
        entry_start = m.end() - 1  # at `{`
        depth = 1
        p = entry_start + 1
        while p < len(body) and depth > 0:
            c = body[p]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    break
            p += 1
        entry_body = body[entry_start + 1 : p]
        # Find `affinity: { ... }` inside
        aff_match = re.search(r'affinity:\s*\{', entry_body)
        if not aff_match:
            continue
        aff_start = aff_match.end() - 1  # `{`
        d = 1
        q = aff_start + 1
        while q < len(entry_body) and d > 0:
            c = entry_body[q]
            if c == "{":
                d += 1
            elif c == "}":
                d -= 1
                if d == 0:
                    break
            q += 1
        aff_body = entry_body[aff_start + 1 : q]
        # Parse `"WorkType": { count: N, median_duration: M }` per work_type
        wt_pat = re.compile(
            r'"([^"]+)":\s*\{\s*count:\s*(\d+),\s*median_duration:\s*\d+\s*\}'
        )
        affinity: dict[str, int] = {}
        for wt_m in wt_pat.finditer(aff_body):
            affinity[wt_m.group(1)] = int(wt_m.group(2))
        if affinity:
            out[emp_id] = affinity

    return out


def parse_planning_pool(text: str) -> dict[str, list[int]]:
    """Парсит LAMA_PLANNING_POOL, возвращает { shop_code: [emp_id1, emp_id2, ...] }."""
    start_pat = re.compile(
        r'export const LAMA_PLANNING_POOL[^=]*=\s*\{', re.DOTALL
    )
    m = start_pat.search(text)
    if not m:
        raise ValueError("Couldn't find LAMA_PLANNING_POOL")
    pos = m.end()
    # Walk until balanced
    depth = 1
    body_start = pos
    while pos < len(text) and depth > 0:
        c = text[pos]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                break
        pos += 1
    body = text[body_start:pos]

    # Find shop blocks: `"NNNN": { ... }` at top level
    out: dict[str, list[int]] = {}
    shop_pat = re.compile(r'\n  "(\d+)":\s*\{')
    for shop_m in shop_pat.finditer(body):
        shop_code = shop_m.group(1)
        shop_start = shop_m.end() - 1  # `{`
        d = 1
        p = shop_start + 1
        while p < len(body) and d > 0:
            c = body[p]
            if c == "{":
                d += 1
            elif c == "}":
                d -= 1
                if d == 0:
                    break
            p += 1
        shop_body = body[shop_start + 1 : p]
        # Find available_employees array
        ae_match = re.search(r'available_employees:\s*\[', shop_body)
        if not ae_match:
            continue
        ae_start = ae_match.end() - 1  # `[`
        d2 = 1
        q = ae_start + 1
        while q < len(shop_body) and d2 > 0:
            c = shop_body[q]
            if c == "[":
                d2 += 1
            elif c == "]":
                d2 -= 1
                if d2 == 0:
                    break
            q += 1
        ae_body = shop_body[ae_start + 1 : q]
        # Extract employee_id values
        emp_ids = [int(x) for x in re.findall(r'employee_id:\s*(\d+)', ae_body)]
        out[shop_code] = emp_ids
    return out


# ─────────────────────────────────────────────────────────────────────
# Domain types
# ─────────────────────────────────────────────────────────────────────


@dataclass
class Task:
    id: int
    work_type: str
    zone: str | None
    duration_min: int  # planned/remaining minutes
    priority: int


@dataclass
class Employee:
    id: int
    zones: list[str]
    work_types: list[str]
    shift_total_min: int = 720  # 12h synthetic
    free_min: int = 720
    position_name: str = ""  # для rank_seniority в iter#2 scoring


@dataclass
class ShopDay:
    date: str
    shop_code: str
    tasks: list[Task]
    real_assignments: dict[int, int]  # task_id -> real_employee_id
    candidates: list[Employee]


def calc_priority(total_minutes: int) -> int:
    """1=critical, 5=lowest. Mirror of `regenerate-from-snapshots.py::calc_priority`."""
    if total_minutes >= 480:
        return 1
    if total_minutes >= 240:
        return 2
    if total_minutes >= 120:
        return 3
    if total_minutes >= 60:
        return 4
    return 5


# ─────────────────────────────────────────────────────────────────────
# Algorithm port — `lib/api/distribution.ts::autoDistribute`
# ─────────────────────────────────────────────────────────────────────

PREFERRED_CHUNK = 60
MIN_CHUNK = 30
FREE_RATIO_TIE_EPSILON = 0.05


def auto_distribute(
    tasks: list[Task],
    employees: list[Employee],
    affinity: dict[int, dict[str, int]],
    zone_affinity: dict[int, dict[str, int]] | None = None,
) -> dict[int, list[tuple[int, int]]]:
    """Returns { task_id: [(emp_id, minutes), ...] }.

    Mirror of TS `autoDistribute` (iter#2) — weighted scoring:
    zone 41% / wtype 37% / balance 11% / rank 11%.
    """
    zone_affinity = zone_affinity or {}
    # Mutable per-employee free time
    free_by = {e.id: max(0, e.shift_total_min - 0) for e in employees}
    by_id: dict[int, Employee] = {e.id: e for e in employees}

    # Sort tasks priority asc, then zone alpha
    sorted_tasks = sorted(
        [t for t in tasks if t.duration_min > 0],
        key=lambda t: (t.priority, t.zone or ""),
    )

    plan: dict[int, list[tuple[int, int]]] = {}

    for task in sorted_tasks:
        remaining = task.duration_min
        allocations: list[tuple[int, int]] = []
        has_zone = bool(task.zone) and task.zone != "Без зоны"
        has_wt = bool(task.work_type)

        candidates: list[Employee] = []
        if has_zone:
            candidates = [
                e for e in employees
                if task.zone in e.zones and free_by.get(e.id, 0) > 0
            ]
        if not candidates and has_wt:
            candidates = [
                e for e in employees
                if task.work_type in e.work_types and free_by.get(e.id, 0) > 0
            ]
        if not candidates:
            candidates = [e for e in employees if free_by.get(e.id, 0) > 0]

        # Iter#2 weighted scoring (mirror of TS lib/api/distribution.ts).
        def zone_aff_for(e: Employee) -> int:
            if not task.zone:
                return 0
            return zone_affinity.get(e.id, {}).get(task.zone, 0)

        def wt_aff_for(e: Employee) -> int:
            return affinity.get(e.id, {}).get(task.work_type, 0)

        def load_for(e: Employee) -> float:
            if e.shift_total_min <= 0:
                return 1.0
            return 1.0 - free_by.get(e.id, 0) / e.shift_total_min

        zone_vals = [zone_aff_for(e) for e in candidates]
        wt_vals = [wt_aff_for(e) for e in candidates]
        load_vals = [load_for(e) for e in candidates]
        rank_vals = [rank_seniority(e.position_name) for e in candidates]
        z_lo, z_hi = (min(zone_vals), max(zone_vals)) if zone_vals else (0, 0)
        w_lo, w_hi = (min(wt_vals), max(wt_vals)) if wt_vals else (0, 0)
        l_lo, l_hi = (min(load_vals), max(load_vals)) if load_vals else (0.0, 0.0)
        r_lo, r_hi = (min(rank_vals), max(rank_vals)) if rank_vals else (0, 0)

        def score_of(e: Employee) -> float:
            z = minmax_norm(zone_aff_for(e), z_lo, z_hi)
            w = minmax_norm(wt_aff_for(e), w_lo, w_hi)
            l = minmax_norm(load_for(e), l_lo, l_hi)
            r = minmax_norm(rank_seniority(e.position_name), r_lo, r_hi)
            return (
                SCORE_WEIGHT_ZONE * z
                + SCORE_WEIGHT_WTYPE * w
                + SCORE_WEIGHT_BALANCE * (1.0 - l)
                + SCORE_WEIGHT_RANK * r
            )

        ranked = sorted(candidates, key=lambda e: -score_of(e))

        allocated: set[int] = set()

        # Pass 1: preferred chunks ≥60 мин
        for emp in ranked:
            if remaining <= 0:
                break
            if emp.id in allocated:
                continue
            free = free_by.get(emp.id, 0)
            if free <= 0:
                continue
            if free < PREFERRED_CHUNK and remaining >= PREFERRED_CHUNK:
                continue
            allocate = min(remaining, free)
            allocations.append((emp.id, allocate))
            free_by[emp.id] = free - allocate
            remaining -= allocate
            allocated.add(emp.id)

        # Pass 2: relaxed ≥30 мин
        if remaining > 0:
            for emp in ranked:
                if remaining <= 0:
                    break
                if emp.id in allocated:
                    continue
                free = free_by.get(emp.id, 0)
                if free <= 0:
                    continue
                if free < MIN_CHUNK and remaining >= MIN_CHUNK:
                    continue
                allocate = min(remaining, free)
                allocations.append((emp.id, allocate))
                free_by[emp.id] = free - allocate
                remaining -= allocate
                allocated.add(emp.id)

        if allocations:
            plan[task.id] = allocations

    return plan


# ─────────────────────────────────────────────────────────────────────
# Build shop-day buckets from baseline
# ─────────────────────────────────────────────────────────────────────


def build_shop_days(
    baseline_records: list[dict],
    pool: dict[str, list[int]],
    zones_map: dict[int, list[str]],
    work_types_map: dict[int, list[str]],
    positions_map: dict[int, str] | None = None,
) -> list[ShopDay]:
    """Группирует baseline по (date, shop) и формирует ShopDay объекты.

    Кандидаты (employees) — union of:
      * all employees in planning pool for this shop (если есть)
      * all employees that actually got a task in this (date, shop) — это
        гарантирует что real assignee всегда есть в кандидатах (иначе мы
        просто никогда не угадаем, потому что real-выбора нет в пуле).

    Логика последнего правила: на момент дня X сотрудник был на смене
    (LAMA дала ему задачу), а planning pool — это snapshot текущего дня.
    Без второго merge мы получили бы 0% на старых датах.
    """
    by_key: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for r in baseline_records:
        by_key[(r["date"], r["shop_code"])].append(r)

    shop_days: list[ShopDay] = []
    for (date, shop_code), recs in by_key.items():
        # Кандидаты: union(pool, real_assignees)
        candidate_ids: set[int] = set(pool.get(shop_code, []))
        for r in recs:
            candidate_ids.add(r["employee_id"])
        # Build employee objects
        candidates: list[Employee] = []
        for eid in candidate_ids:
            zones = list(zones_map.get(eid, []))
            wts = list(work_types_map.get(eid, []))
            pos_name = (positions_map or {}).get(eid, "")
            candidates.append(
                Employee(
                    id=eid,
                    zones=zones,
                    work_types=wts,
                    shift_total_min=720,
                    free_min=720,
                    position_name=pos_name,
                )
            )

        tasks: list[Task] = []
        real_assigns: dict[int, int] = {}
        for r in recs:
            tid = r["task_id"]
            tasks.append(
                Task(
                    id=tid,
                    work_type=r["work_type"],
                    zone=r["zone"],
                    duration_min=int(r["duration"]),
                    priority=calc_priority(int(r["duration"])),
                )
            )
            real_assigns[tid] = r["employee_id"]

        shop_days.append(
            ShopDay(
                date=date,
                shop_code=shop_code,
                tasks=tasks,
                real_assignments=real_assigns,
                candidates=candidates,
            )
        )

    return shop_days


# ─────────────────────────────────────────────────────────────────────
# Compare + report
# ─────────────────────────────────────────────────────────────────────


@dataclass
class Mismatch:
    date: str
    shop_code: str
    task_id: int
    work_type: str
    zone: str | None
    duration: int
    real_emp: int
    proposed_emps: list[int]
    reason: str


@dataclass
class ShopDayResult:
    date: str
    shop_code: str
    total_tasks: int
    matched: int
    mismatches: list[Mismatch] = field(default_factory=list)

    @property
    def match_pct(self) -> float:
        return (self.matched / self.total_tasks * 100) if self.total_tasks else 0.0


def classify_mismatch(
    task: Task,
    real_emp: int,
    proposed_emps: list[int],
    candidates_by_id: dict[int, Employee],
    affinity: dict[int, dict[str, int]],
) -> str:
    """Эвристика: почему мы выбрали не того кого LAMA."""
    if not proposed_emps:
        return "NO_CANDIDATES_FOUND"
    real = candidates_by_id.get(real_emp)
    if real is None:
        return "REAL_EMP_NOT_IN_POOL"
    proposed = candidates_by_id.get(proposed_emps[0])
    if proposed is None:
        return "PROPOSED_EMP_MISSING_DATA"

    # Did real have the zone affinity that proposed didn't?
    has_zone = bool(task.zone) and task.zone != "Без зоны"
    if has_zone:
        real_has = task.zone in real.zones
        prop_has = task.zone in proposed.zones
        if real_has and not prop_has:
            return "REAL_HAS_ZONE_PROPOSED_DOES_NOT"
        if not real_has and prop_has:
            return "PROPOSED_HAS_ZONE_REAL_DOES_NOT"

    # Work type affinity differential
    real_aff = affinity.get(real_emp, {}).get(task.work_type, 0)
    prop_aff = affinity.get(proposed_emps[0], {}).get(task.work_type, 0)
    if real_aff > prop_aff + 2:
        return "REAL_HIGHER_WORKTYPE_AFFINITY"
    if prop_aff > real_aff + 2:
        return "PROPOSED_HIGHER_WORKTYPE_AFFINITY"

    return "BALANCE_RANKING_DIFFERENCE"


def evaluate(
    shop_days: list[ShopDay],
    affinity: dict[int, dict[str, int]],
    zone_affinity: dict[int, dict[str, int]] | None = None,
) -> list[ShopDayResult]:
    results: list[ShopDayResult] = []
    for sd in shop_days:
        plan = auto_distribute(sd.tasks, sd.candidates, affinity, zone_affinity)
        candidates_by_id = {e.id: e for e in sd.candidates}
        matched = 0
        mismatches: list[Mismatch] = []
        for task in sd.tasks:
            real = sd.real_assignments[task.id]
            proposed_pairs = plan.get(task.id, [])
            proposed_ids = [pid for pid, _ in proposed_pairs]
            if real in proposed_ids:
                matched += 1
            else:
                reason = classify_mismatch(
                    task, real, proposed_ids, candidates_by_id, affinity
                )
                mismatches.append(
                    Mismatch(
                        date=sd.date,
                        shop_code=sd.shop_code,
                        task_id=task.id,
                        work_type=task.work_type,
                        zone=task.zone,
                        duration=task.duration_min,
                        real_emp=real,
                        proposed_emps=proposed_ids,
                        reason=reason,
                    )
                )
        results.append(
            ShopDayResult(
                date=sd.date,
                shop_code=sd.shop_code,
                total_tasks=len(sd.tasks),
                matched=matched,
                mismatches=mismatches,
            )
        )
    return results


# ─────────────────────────────────────────────────────────────────────
# Output renderers
# ─────────────────────────────────────────────────────────────────────


def render_md_report(
    results: list[ShopDayResult],
    date_range: tuple[str, str],
    days: int,
    total_tasks: int,
    employee_names: dict[int, str],
) -> str:
    """Markdown report."""
    today_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Aggregate per-shop (across all days)
    by_shop: dict[str, list[ShopDayResult]] = defaultdict(list)
    for r in results:
        by_shop[r.shop_code].append(r)

    shop_aggs: list[tuple[str, int, int, float]] = []
    for shop, runs in by_shop.items():
        total = sum(r.total_tasks for r in runs)
        matched = sum(r.matched for r in runs)
        pct = (matched / total * 100) if total else 0.0
        shop_aggs.append((shop, total, matched, pct))
    shop_aggs.sort(key=lambda x: x[3], reverse=True)

    pcts = [a[3] for a in shop_aggs if a[1] > 0]
    median_pct = statistics.median(pcts) if pcts else 0.0
    overall_total = sum(a[1] for a in shop_aggs)
    overall_matched = sum(a[2] for a in shop_aggs)
    overall_pct = (overall_matched / overall_total * 100) if overall_total else 0.0

    # Mismatch reasons
    reasons: dict[str, int] = defaultdict(int)
    all_mm: list[Mismatch] = []
    for r in results:
        for mm in r.mismatches:
            reasons[mm.reason] += 1
            all_mm.append(mm)
    reasons_sorted = sorted(reasons.items(), key=lambda x: x[1], reverse=True)
    total_mm = sum(reasons.values()) or 1

    lines: list[str] = []
    lines.append(f"# Backtest results — {today_iso}")
    lines.append("")
    lines.append(
        f"Source: {days} day(s) × {len(by_shop)} shops = {total_tasks} comparisons"
    )
    lines.append(f"Date range: {date_range[0]} to {date_range[1]}")
    lines.append("")
    lines.append(f"**Overall match:** {overall_matched}/{overall_total} = {overall_pct:.1f}%")
    lines.append(f"**Median match per shop:** {median_pct:.1f}%")
    lines.append("")
    lines.append("## Match per shop (sorted by match% desc)")
    lines.append("")
    lines.append("| Shop code | Tasks | Match | % |")
    lines.append("|---|---|---|---|")
    for shop, total, matched, pct in shop_aggs:
        lines.append(f"| {shop} | {total} | {matched} | {pct:.0f}% |")
    lines.append("")

    lines.append("## Patterns of mismatch (sample 20)")
    lines.append("")
    sample = all_mm[:20]
    for mm in sample:
        proposed_str = (
            f"emp {mm.proposed_emps[0]} ({employee_names.get(mm.proposed_emps[0], '?')})"
            if mm.proposed_emps else "—"
        )
        real_str = f"emp {mm.real_emp} ({employee_names.get(mm.real_emp, '?')})"
        zone = mm.zone or "—"
        lines.append(
            f"- Task {mm.task_id} «{mm.work_type}» [{zone}, {mm.duration}мин] "
            f"at shop {mm.shop_code} ({mm.date}): our → {proposed_str}, real → {real_str} "
            f"[{mm.reason}]"
        )
    lines.append("")

    lines.append(f"## Top reasons for mismatch (of {total_mm} total)")
    lines.append("")
    for reason, n in reasons_sorted:
        pct = n / total_mm * 100
        lines.append(f"1. `{reason}` — {n} cases ({pct:.0f}%)")
    lines.append("")

    return "\n".join(lines)


def render_summary_ts(
    results: list[ShopDayResult],
    median_pct: float,
    overall_pct: float,
    built_at_iso: str,
) -> str:
    """Минимальный TS-файл — match_rate per shop + overall median."""
    by_shop: dict[str, list[ShopDayResult]] = defaultdict(list)
    for r in results:
        by_shop[r.shop_code].append(r)

    shop_entries: list[tuple[str, int, int, float]] = []
    for shop, runs in by_shop.items():
        total = sum(r.total_tasks for r in runs)
        matched = sum(r.matched for r in runs)
        pct = (matched / total * 100) if total else 0.0
        shop_entries.append((shop, total, matched, pct))
    shop_entries.sort(key=lambda x: x[3], reverse=True)

    lines: list[str] = []
    lines.append("/**")
    lines.append(" * AUTO-GENERATED by tools/lama/backtest-distribution.py — do not edit by hand.")
    lines.append(" *")
    lines.append(" * Match rate нашего auto-distribute алгоритма vs реальная LAMA-история.")
    lines.append(" * Per shop: сколько из всех задач shop'а наш алгоритм поручил бы тому")
    lines.append(" * же сотруднику что и LAMA фактически выбрала. Median по shop'ам —")
    lines.append(" * эталонная метрика «насколько мы попадаем в ground truth».")
    lines.append(" *")
    lines.append(f" * Built at: {built_at_iso}")
    lines.append(" */")
    lines.append("")
    lines.append("export interface BacktestShopMatch {")
    lines.append("  shop_code: string;")
    lines.append("  total_tasks: number;")
    lines.append("  matched: number;")
    lines.append("  match_pct: number;")
    lines.append("}")
    lines.append("")
    lines.append("export const BACKTEST_SHOP_MATCH: readonly BacktestShopMatch[] = [")
    for shop, total, matched, pct in shop_entries:
        lines.append(
            f'  {{ shop_code: "{shop}", total_tasks: {total}, matched: {matched}, match_pct: {pct:.1f} }},'
        )
    lines.append("];")
    lines.append("")
    lines.append(f"export const BACKTEST_OVERALL_MATCH_PCT = {overall_pct:.1f};")
    lines.append(f"export const BACKTEST_MEDIAN_MATCH_PCT = {median_pct:.1f};")
    lines.append(f'export const BACKTEST_SUMMARY_BUILT_AT = "{built_at_iso}";')
    lines.append("")
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────
# Helper: extract employee names from EMPLOYEE_STATS (for report readability)
# ─────────────────────────────────────────────────────────────────────


def parse_employee_names(text: str) -> dict[int, str]:
    """Из EMPLOYEE_STATS вытаскивает { emp_id: name }."""
    out: dict[int, str] = {}
    pat = re.compile(
        r'\n  (\d+):\s*\{\s*\n\s*employee_id:\s*\d+,\s*\n\s*name:\s*"([^"]+)"'
    )
    for m in pat.finditer(text):
        out[int(m.group(1))] = m.group(2)
    return out


# ─────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────


def materialize_baseline(
    by_date: dict[str, list[list[int]]],
    shops: list[str],
    work_types: list[str],
    zones: list[str],
    statuses: list[str],
) -> list[dict]:
    """Из compact tuples — flat records. Mirror of `_materializeBacktestBaseline` в TS."""
    out: list[dict] = []
    for date, recs in by_date.items():
        for t in recs:
            zone_idx = t[6]
            out.append({
                "date": date,
                "task_id": t[0],
                "shop_code": shops[t[1]] if 0 <= t[1] < len(shops) else "",
                "employee_id": t[2],
                "eis_id": t[3],
                "shift_id": t[4],
                "work_type": work_types[t[5]] if 0 <= t[5] < len(work_types) else "",
                "zone": zones[zone_idx] if zone_idx >= 0 and zone_idx < len(zones) else None,
                "duration": t[7],
                "status": statuses[t[8]] if 0 <= t[8] < len(statuses) else "",
            })
    return out


def main() -> int:
    print(f"[backtest] Loading TS data from {MOCK_DATA}/...", file=sys.stderr)
    baseline_text = read_text(BASELINE_FILE)
    zones_text = read_text(ZONES_FILE)
    wt_text = read_text(WORK_TYPES_FILE)
    stats_text = read_text(STATS_FILE)
    pool_text = read_text(POOL_FILE)

    shops = parse_string_array(baseline_text, "BACKTEST_SHOPS")
    work_types_arr = parse_string_array(baseline_text, "BACKTEST_WORK_TYPES")
    zones_arr = parse_string_array(baseline_text, "BACKTEST_ZONES")
    statuses_arr = parse_string_array(baseline_text, "BACKTEST_STATUSES")
    by_date = parse_backtest_by_date(baseline_text)
    print(
        f"[backtest] Baseline: {len(by_date)} day(s), shops={len(shops)}, "
        f"wt={len(work_types_arr)}, zones={len(zones_arr)}",
        file=sys.stderr,
    )

    records = materialize_baseline(by_date, shops, work_types_arr, zones_arr, statuses_arr)
    print(f"[backtest] Baseline records: {len(records)}", file=sys.stderr)

    zones_map = parse_employee_arrays(zones_text, "LAMA_EMPLOYEE_ZONES")
    work_types_map = parse_employee_arrays(wt_text, "LAMA_EMPLOYEE_WORK_TYPES")
    print(
        f"[backtest] Employee zones: {len(zones_map)}, work_types: {len(work_types_map)}",
        file=sys.stderr,
    )

    affinity = parse_employee_stats_affinity(stats_text)
    zone_affinity = parse_employee_stats_zone_affinity(stats_text)
    employee_names = parse_employee_names(stats_text)
    print(
        f"[backtest] EMPLOYEE_STATS wtype-aff: {len(affinity)}, "
        f"zone-aff: {len(zone_affinity)}, names: {len(employee_names)}",
        file=sys.stderr,
    )

    positions_map = load_employee_positions()
    print(f"[backtest] Employee positions (from snapshots): {len(positions_map)}", file=sys.stderr)

    pool = parse_planning_pool(pool_text)
    print(f"[backtest] Planning pool: {len(pool)} shops", file=sys.stderr)

    shop_days = build_shop_days(records, pool, zones_map, work_types_map, positions_map)
    print(f"[backtest] Shop-days to evaluate: {len(shop_days)}", file=sys.stderr)

    print("[backtest] Running auto-distribute (iter#2) against ground truth...", file=sys.stderr)
    results = evaluate(shop_days, affinity, zone_affinity)

    # Aggregations
    by_shop: dict[str, list[ShopDayResult]] = defaultdict(list)
    for r in results:
        by_shop[r.shop_code].append(r)
    shop_pcts: list[float] = []
    overall_total = 0
    overall_matched = 0
    for shop, runs in by_shop.items():
        total = sum(r.total_tasks for r in runs)
        matched = sum(r.matched for r in runs)
        overall_total += total
        overall_matched += matched
        if total:
            shop_pcts.append(matched / total * 100)
    median_pct = statistics.median(shop_pcts) if shop_pcts else 0.0
    overall_pct = (overall_matched / overall_total * 100) if overall_total else 0.0

    # Date range
    dates = sorted(by_date.keys())
    date_range = (dates[0], dates[-1]) if dates else ("?", "?")

    # Render outputs
    today_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    built_at_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    md = render_md_report(
        results, date_range, len(dates), len(records), employee_names
    )
    md_path = OUT_RESULTS_DIR / f"{today_iso}-summary.md"
    OUT_RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    md_path.write_text(md, encoding="utf-8")

    ts = render_summary_ts(results, median_pct, overall_pct, built_at_iso)
    OUT_SUMMARY_TS.write_text(ts, encoding="utf-8")

    # Stdout summary
    print()
    print("=" * 60)
    print(f"BACKTEST RESULTS — {date_range[0]}..{date_range[1]} ({len(dates)} days)")
    print("=" * 60)
    print(f"Total comparisons: {overall_total}")
    print(f"Overall match: {overall_matched}/{overall_total} = {overall_pct:.1f}%")
    print(f"Median match per shop: {median_pct:.1f}%")
    print()

    # Top 3 shops by match%
    shop_aggs: list[tuple[str, int, int, float]] = []
    for shop, runs in by_shop.items():
        total = sum(r.total_tasks for r in runs)
        matched = sum(r.matched for r in runs)
        pct = (matched / total * 100) if total else 0.0
        shop_aggs.append((shop, total, matched, pct))
    shop_aggs.sort(key=lambda x: x[3])
    print("Top 3 worst shops (lowest match%):")
    for shop, total, matched, pct in shop_aggs[:3]:
        print(f"  {shop}: {matched}/{total} = {pct:.1f}%")
    print()
    print("Top 3 best shops:")
    for shop, total, matched, pct in shop_aggs[-3:][::-1]:
        print(f"  {shop}: {matched}/{total} = {pct:.1f}%")
    print()

    # Top reasons
    reasons: dict[str, int] = defaultdict(int)
    for r in results:
        for mm in r.mismatches:
            reasons[mm.reason] += 1
    total_mm = sum(reasons.values()) or 1
    print(f"Top reasons for mismatch (of {total_mm}):")
    for reason, n in sorted(reasons.items(), key=lambda x: x[1], reverse=True)[:5]:
        pct = n / total_mm * 100
        print(f"  {reason}: {n} ({pct:.0f}%)")
    print()
    print(f"Report: {md_path.relative_to(ROOT)}")
    print(f"TS summary: {OUT_SUMMARY_TS.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
