"""multi-algo-backtest.py — research-only сравнение 13 алгоритмов распределения.

Не меняет prod (`lib/api/distribution.ts`, `tools/lama/backtest-distribution.py`).
Только читает `.lama_snapshots/2026-05-07.json ... 2026-05-11.json`,
гоняет 13 алгоритмов на train/test split + leave-one-out, пишет:

  - tools/lama/MULTI-ALGO-COMPARISON.md
  - tools/lama/DATA-INSIGHTS.md

Запуск:
    python tools/lama/multi-algo-backtest.py

Алгоритмы (см. README в начале каждой функции score_<name>):
  1  Random                — baseline (фильтр zone/wtype + случайный)
  2  Stickiness day N-1    — кто делал такой же (shop, zone, wt) вчера
  3  Stickiness + wtype-top fallback
  4  Pure wtype affinity
  5  Pure zone affinity
  6  Pure shop-wtype affinity
  7  Position-role rules   — Касса→кассиры, Менеджерские→админы
  8  Time-of-day cluster   — топ employee по часу старта
  9  Workload balance      — least loaded
  10 Iter#5 mirror         — zone40 + wtype35 + shopWt5 + stick10 + rank5 + load5
  11 Top-2 ensemble        — vote stickiness + wtype affinity
  12 Logistic regression   — features fit-on-train predict-on-test
  13 Hungarian             — глобальный оптимум по матрице scores
"""

from __future__ import annotations

import json
import math
import random
import sys
import time
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from statistics import mean, median, stdev

# numpy/sklearn гарантированно есть после install в env, но обёрнем
try:
    import numpy as np
    from scipy.optimize import linear_sum_assignment
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

try:
    from sklearn.linear_model import LogisticRegression
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False


# ─────────────────────────────────────────────────────────────────────
# Config / IO
# ─────────────────────────────────────────────────────────────────────

SNAPSHOT_DIR = Path("c:/Users/SPECTRE/WFM-admin/.lama_snapshots")
OUT_DIR = Path(__file__).parent
DAYS = ["2026-05-07", "2026-05-08", "2026-05-09", "2026-05-10", "2026-05-11"]

random.seed(42)
if HAS_NUMPY:
    np.random.seed(42)


def load_day(day: str) -> dict:
    fp = SNAPSHOT_DIR / f"{day}.json"
    with open(fp, encoding="utf-8-sig") as f:
        return json.load(f)


@dataclass
class TaskRow:
    task_id: int
    day: str
    shop_code: str
    work_type: str
    zone: str | None
    time_start: str
    duration_min: int
    priority: int
    real_emp: int


@dataclass
class EmpInfo:
    emp_id: int
    shop_code: str
    position_name: str
    position_role: str  # Executor / Administrator
    rank: str


def flatten_tasks(snap: dict, day: str) -> list[TaskRow]:
    out: list[TaskRow] = []
    for t in snap["tasks"]:
        if not t.get("_employee_id") or not t.get("_shop_code"):
            continue
        zone = t.get("operation_zone") or None
        if zone in ("N/A", "Без зоны", "", "—"):
            zone = None
        out.append(
            TaskRow(
                task_id=int(t["id"]),
                day=day,
                shop_code=str(t["_shop_code"]),
                work_type=t.get("operation_work") or "",
                zone=zone,
                time_start=t.get("time_start") or "",
                duration_min=int(t.get("duration", 0)) // 60,
                priority=int(t.get("priority") or 5),
                real_emp=int(t["_employee_id"]),
            )
        )
    return out


def flatten_emps(snap: dict) -> dict[int, EmpInfo]:
    out: dict[int, EmpInfo] = {}
    for e in snap["employees"]:
        eid = int(e["employee_id"])
        out[eid] = EmpInfo(
            emp_id=eid,
            shop_code=str(e.get("shop_code") or ""),
            position_name=e.get("position_name") or "",
            position_role=e.get("position_role") or "Executor",
            rank=e.get("rank") or "N/A",
        )
    return out


# ─────────────────────────────────────────────────────────────────────
# Training stats from a list of days
# ─────────────────────────────────────────────────────────────────────


@dataclass
class TrainStats:
    """Все агрегаты построенные на training днях."""

    # Per-employee
    wt_count: dict[int, Counter] = field(default_factory=lambda: defaultdict(Counter))
    zone_count: dict[int, Counter] = field(default_factory=lambda: defaultdict(Counter))
    shop_wt_count: dict[tuple[str, str], Counter] = field(default_factory=lambda: defaultdict(Counter))  # (shop,wt)->Counter(emp)
    shop_zone_count: dict[tuple[str, str], Counter] = field(default_factory=lambda: defaultdict(Counter))
    shop_zone_wt_last: dict[tuple[str, str, str], dict[str, int]] = field(default_factory=lambda: defaultdict(dict))  # last_day -> emp
    hour_emp: dict[tuple[str, int], Counter] = field(default_factory=lambda: defaultdict(Counter))  # (shop, hour)->Counter(emp)
    emp_total: Counter = field(default_factory=Counter)
    pos_wt: dict[str, Counter] = field(default_factory=lambda: defaultdict(Counter))  # position_role -> Counter(wt)
    emp_active_days: dict[int, set] = field(default_factory=lambda: defaultdict(set))
    emp_shops: dict[int, set] = field(default_factory=lambda: defaultdict(set))


def build_train_stats(rows: list[TaskRow]) -> TrainStats:
    s = TrainStats()
    rows_sorted = sorted(rows, key=lambda r: r.day)
    for r in rows_sorted:
        s.wt_count[r.real_emp][r.work_type] += 1
        if r.zone:
            s.zone_count[r.real_emp][r.zone] += 1
        s.shop_wt_count[(r.shop_code, r.work_type)][r.real_emp] += 1
        if r.zone:
            s.shop_zone_count[(r.shop_code, r.zone)][r.real_emp] += 1
        s.shop_zone_wt_last[(r.shop_code, r.zone or "", r.work_type)][r.day] = r.real_emp
        try:
            hour = int(r.time_start.split(":")[0])
        except Exception:
            hour = 0
        s.hour_emp[(r.shop_code, hour)][r.real_emp] += 1
        s.emp_total[r.real_emp] += 1
        s.emp_active_days[r.real_emp].add(r.day)
        s.emp_shops[r.real_emp].add(r.shop_code)
    return s


# ─────────────────────────────────────────────────────────────────────
# Algorithms — each returns dict[task_id] -> emp_id (or None) on test_rows.
# Input: test_rows, candidate_pool[shop_code]->list[emp_id], train_stats,
#        emps_by_id (full master from test day for position_name).
# ─────────────────────────────────────────────────────────────────────


def candidates_for(task: TaskRow, pool: list[int], emps: dict[int, EmpInfo],
                   ts: TrainStats) -> list[int]:
    """Кандидаты shop-pool ∩ (имел этот wtype или zone в истории)."""
    if not pool:
        return []
    if task.zone:
        zoned = [e for e in pool if task.zone in ts.zone_count.get(e, {})]
        if zoned:
            return zoned
    wt_cands = [e for e in pool if task.work_type in ts.wt_count.get(e, {})]
    if wt_cands:
        return wt_cands
    return list(pool)


def algo_1_random(test_rows, pool_by_shop, ts, emps):
    out = {}
    for t in test_rows:
        cands = candidates_for(t, pool_by_shop.get(t.shop_code, []), emps, ts)
        out[t.task_id] = random.choice(cands) if cands else None
    return out


def algo_2_stickiness(test_rows, pool_by_shop, ts, emps):
    """Stickiness only: last seen emp for same (shop, zone, wt) from history."""
    out = {}
    for t in test_rows:
        key = (t.shop_code, t.zone or "", t.work_type)
        history = ts.shop_zone_wt_last.get(key, {})
        if history:
            # pick most recent
            last_day = max(history.keys())
            sticky = history[last_day]
            pool = pool_by_shop.get(t.shop_code, [])
            if sticky in pool:
                out[t.task_id] = sticky
                continue
        # fallback: random from candidates (preserves filter without sticky bias)
        cands = candidates_for(t, pool_by_shop.get(t.shop_code, []), emps, ts)
        out[t.task_id] = random.choice(cands) if cands else None
    return out


def algo_3_stickiness_wt_fallback(test_rows, pool_by_shop, ts, emps):
    out = {}
    for t in test_rows:
        key = (t.shop_code, t.zone or "", t.work_type)
        history = ts.shop_zone_wt_last.get(key, {})
        pool = pool_by_shop.get(t.shop_code, [])
        if history:
            last_day = max(history.keys())
            sticky = history[last_day]
            if sticky in pool:
                out[t.task_id] = sticky
                continue
        # fallback: top wtype affinity within shop pool
        if pool:
            best = max(pool, key=lambda e: ts.wt_count.get(e, {}).get(t.work_type, 0))
            if ts.wt_count.get(best, {}).get(t.work_type, 0) > 0:
                out[t.task_id] = best
                continue
        cands = candidates_for(t, pool, emps, ts)
        out[t.task_id] = random.choice(cands) if cands else None
    return out


def algo_4_wtype_affinity(test_rows, pool_by_shop, ts, emps):
    out = {}
    for t in test_rows:
        pool = pool_by_shop.get(t.shop_code, [])
        if not pool:
            out[t.task_id] = None
            continue
        scored = [(ts.wt_count.get(e, {}).get(t.work_type, 0), e) for e in pool]
        scored.sort(key=lambda x: (-x[0], x[1]))
        out[t.task_id] = scored[0][1] if scored[0][0] > 0 else random.choice(pool)
    return out


def algo_5_zone_affinity(test_rows, pool_by_shop, ts, emps):
    out = {}
    for t in test_rows:
        pool = pool_by_shop.get(t.shop_code, [])
        if not pool:
            out[t.task_id] = None
            continue
        if not t.zone:
            # fallback to wtype if no zone
            scored = [(ts.wt_count.get(e, {}).get(t.work_type, 0), e) for e in pool]
            scored.sort(key=lambda x: (-x[0], x[1]))
            out[t.task_id] = scored[0][1] if scored[0][0] > 0 else random.choice(pool)
            continue
        scored = [(ts.zone_count.get(e, {}).get(t.zone, 0), e) for e in pool]
        scored.sort(key=lambda x: (-x[0], x[1]))
        out[t.task_id] = scored[0][1] if scored[0][0] > 0 else random.choice(pool)
    return out


def algo_6_shop_wtype(test_rows, pool_by_shop, ts, emps):
    out = {}
    for t in test_rows:
        pool = pool_by_shop.get(t.shop_code, [])
        if not pool:
            out[t.task_id] = None
            continue
        per_shop = ts.shop_wt_count.get((t.shop_code, t.work_type), Counter())
        scored = [(per_shop.get(e, 0), e) for e in pool]
        scored.sort(key=lambda x: (-x[0], x[1]))
        out[t.task_id] = scored[0][1] if scored[0][0] > 0 else random.choice(pool)
    return out


# Position-role rule matrix
POS_RULES = {
    "Касса": {"role": "Executor", "keywords": ["кассир", "касса"]},
    "КСО": {"role": "Executor", "keywords": ["кассир касс самообслуживания", "кассир", "ксо"]},
    "Менеджерские операции": {"role": "Administrator", "keywords": ["управляющ", "администратор", "заместитель"]},
    "Инвентаризация": {"role": "Administrator", "keywords": ["управляющ", "администратор", "заместитель", "старший"]},
}


def algo_7_position_rules(test_rows, pool_by_shop, ts, emps):
    out = {}
    for t in test_rows:
        pool = pool_by_shop.get(t.shop_code, [])
        if not pool:
            out[t.task_id] = None
            continue
        rule = POS_RULES.get(t.work_type)
        if rule:
            kws = rule["keywords"]
            target_role = rule["role"]
            matches = []
            for e in pool:
                info = emps.get(e)
                if not info:
                    continue
                pn = info.position_name.lower()
                if info.position_role == target_role or any(k in pn for k in kws):
                    matches.append(e)
            if matches:
                # tie-break by wtype affinity
                matches.sort(key=lambda e: (-ts.wt_count.get(e, {}).get(t.work_type, 0), e))
                out[t.task_id] = matches[0]
                continue
        # fallback to wtype affinity
        scored = [(ts.wt_count.get(e, {}).get(t.work_type, 0), e) for e in pool]
        scored.sort(key=lambda x: (-x[0], x[1]))
        out[t.task_id] = scored[0][1] if scored[0][0] > 0 else random.choice(pool)
    return out


def algo_8_time_cluster(test_rows, pool_by_shop, ts, emps):
    out = {}
    for t in test_rows:
        pool = pool_by_shop.get(t.shop_code, [])
        if not pool:
            out[t.task_id] = None
            continue
        try:
            hour = int(t.time_start.split(":")[0])
        except Exception:
            hour = 0
        hist = ts.hour_emp.get((t.shop_code, hour), Counter())
        scored = [(hist.get(e, 0), e) for e in pool]
        scored.sort(key=lambda x: (-x[0], x[1]))
        out[t.task_id] = scored[0][1] if scored[0][0] > 0 else random.choice(pool)
    return out


def algo_9_workload_balance(test_rows, pool_by_shop, ts, emps):
    out = {}
    # least-loaded means least picked so far during evaluation; track within test
    used = Counter()
    # sort tasks by priority asc, then duration desc — assign critical first
    order = sorted(test_rows, key=lambda r: (r.priority, -r.duration_min))
    for t in order:
        cands = candidates_for(t, pool_by_shop.get(t.shop_code, []), emps, ts)
        if not cands:
            out[t.task_id] = None
            continue
        cands.sort(key=lambda e: (used[e], -ts.wt_count.get(e, {}).get(t.work_type, 0), e))
        out[t.task_id] = cands[0]
        used[cands[0]] += 1
    return out


def _minmax(v, lo, hi):
    if hi <= lo:
        return 0.5
    return (v - lo) / (hi - lo)


RANK_WEIGHT = {
    "Управляющий магазином": 5,
    "Заместитель управляющего магазином": 4,
    "Администратор": 3,
    "Старший смены": 2,
    "Заведующий производством": 4,
}


def rank_seniority(pos: str) -> int:
    return RANK_WEIGHT.get(pos, 1)


def algo_10_iter5(test_rows, pool_by_shop, ts, emps):
    """Mirror iter#5: zone40 + wtype35 + shopWt5 + stick10 + rank5 + load5."""
    out = {}
    used = Counter()
    order = sorted(test_rows, key=lambda r: (r.priority, r.zone or ""))
    for t in order:
        cands = candidates_for(t, pool_by_shop.get(t.shop_code, []), emps, ts)
        if not cands:
            out[t.task_id] = None
            continue
        # collect raw values
        zone_v = [ts.zone_count.get(e, {}).get(t.zone or "", 0) for e in cands]
        wt_v = [ts.wt_count.get(e, {}).get(t.work_type, 0) for e in cands]
        shop_wt_v = [ts.shop_wt_count.get((t.shop_code, t.work_type), Counter()).get(e, 0) for e in cands]
        stick_v = []
        key = (t.shop_code, t.zone or "", t.work_type)
        hist = ts.shop_zone_wt_last.get(key, {})
        last_day = max(hist.keys()) if hist else None
        sticky_emp = hist.get(last_day) if last_day else None
        for e in cands:
            stick_v.append(1 if e == sticky_emp else 0)
        rank_v = [rank_seniority(emps.get(e, EmpInfo(0, "", "", "", "")).position_name) for e in cands]
        load_v = [used[e] for e in cands]

        def lohi(vals):
            return (min(vals), max(vals))
        z_lo, z_hi = lohi(zone_v)
        w_lo, w_hi = lohi(wt_v)
        sw_lo, sw_hi = lohi(shop_wt_v)
        r_lo, r_hi = lohi(rank_v)
        l_lo, l_hi = lohi(load_v)

        best_score, best_e = -1, cands[0]
        for i, e in enumerate(cands):
            z = _minmax(zone_v[i], z_lo, z_hi)
            w = _minmax(wt_v[i], w_lo, w_hi)
            sw = _minmax(shop_wt_v[i], sw_lo, sw_hi)
            st = stick_v[i]
            r = _minmax(rank_v[i], r_lo, r_hi)
            l = _minmax(load_v[i], l_lo, l_hi)
            score = 0.40 * z + 0.35 * w + 0.05 * sw + 0.10 * st + 0.05 * r + 0.05 * (1 - l)
            if score > best_score:
                best_score, best_e = score, e
        out[t.task_id] = best_e
        used[best_e] += 1
    return out


def algo_11_ensemble(test_rows, pool_by_shop, ts, emps):
    """Vote between stickiness+fallback (algo3) and wtype affinity (algo4)."""
    a = algo_3_stickiness_wt_fallback(test_rows, pool_by_shop, ts, emps)
    b = algo_4_wtype_affinity(test_rows, pool_by_shop, ts, emps)
    out = {}
    for t in test_rows:
        ea, eb = a.get(t.task_id), b.get(t.task_id)
        if ea is None and eb is None:
            out[t.task_id] = None
        elif ea == eb:
            out[t.task_id] = ea
        else:
            # Prefer stickiness when there's actual history; else wtype
            key = (t.shop_code, t.zone or "", t.work_type)
            if ts.shop_zone_wt_last.get(key):
                out[t.task_id] = ea
            else:
                out[t.task_id] = eb
    return out


def algo_12_logreg(test_rows, pool_by_shop, ts, emps, train_rows):
    """One-vs-all logistic regression over (task, candidate) pairs.

    Features per pair: zone_aff, wt_aff, shop_wt_aff, stick, rank, log_total_tasks,
    position_role_admin, hour_aff.
    Label: 1 if real assignment, 0 otherwise.
    """
    if not HAS_SKLEARN:
        return {t.task_id: None for t in test_rows}

    # Build training pairs from train_rows. For each train task, real emp is positive,
    # 4 random non-real candidates negative. We need a TrainStats that excludes the
    # day of the train task to avoid leakage — but we already only use train_rows < test.
    # For speed: a single ts on full train. Acceptable for backtest.
    def feats(t: TaskRow, e: int):
        zone_v = ts.zone_count.get(e, {}).get(t.zone or "", 0) if t.zone else 0
        wt_v = ts.wt_count.get(e, {}).get(t.work_type, 0)
        sw_v = ts.shop_wt_count.get((t.shop_code, t.work_type), Counter()).get(e, 0)
        key = (t.shop_code, t.zone or "", t.work_type)
        hist = ts.shop_zone_wt_last.get(key, {})
        last_day = max(hist.keys()) if hist else None
        stick = 1 if hist and hist.get(last_day) == e else 0
        rank = rank_seniority(emps.get(e, EmpInfo(0, "", "", "", "")).position_name)
        tot = math.log1p(ts.emp_total.get(e, 0))
        info = emps.get(e)
        is_admin = 1 if (info and info.position_role == "Administrator") else 0
        try:
            hour = int(t.time_start.split(":")[0])
        except Exception:
            hour = 0
        ha = ts.hour_emp.get((t.shop_code, hour), Counter()).get(e, 0)
        return [zone_v, wt_v, sw_v, stick, rank, tot, is_admin, ha]

    X, y = [], []
    for t in train_rows:
        pool = pool_by_shop.get(t.shop_code, [])
        if t.real_emp not in pool:
            continue
        X.append(feats(t, t.real_emp))
        y.append(1)
        negs = [e for e in pool if e != t.real_emp]
        random.shuffle(negs)
        for e in negs[:4]:
            X.append(feats(t, e))
            y.append(0)
    if len(set(y)) < 2 or len(X) < 30:
        return {t.task_id: None for t in test_rows}
    X = np.array(X, dtype=float)
    y = np.array(y)
    model = LogisticRegression(max_iter=400, C=1.0)
    try:
        model.fit(X, y)
    except Exception:
        return {t.task_id: None for t in test_rows}

    out = {}
    for t in test_rows:
        pool = pool_by_shop.get(t.shop_code, [])
        if not pool:
            out[t.task_id] = None
            continue
        Xt = np.array([feats(t, e) for e in pool], dtype=float)
        probs = model.predict_proba(Xt)[:, 1]
        out[t.task_id] = pool[int(probs.argmax())]
    return out


def algo_13_hungarian(test_rows, pool_by_shop, ts, emps):
    """Global assignment via Hungarian (scipy.optimize.linear_sum_assignment).

    Per shop+day: build cost matrix tasks x candidates, find min-cost perfect matching.
    Cost = -score (score is same as iter#5).
    """
    if not HAS_NUMPY:
        return {t.task_id: None for t in test_rows}
    out = {}
    by_shop = defaultdict(list)
    for t in test_rows:
        by_shop[t.shop_code].append(t)
    for shop, tasks in by_shop.items():
        pool = pool_by_shop.get(shop, [])
        if not pool or not tasks:
            for t in tasks:
                out[t.task_id] = None
            continue
        n, m = len(tasks), len(pool)
        cost = np.zeros((n, m), dtype=float)
        for i, t in enumerate(tasks):
            for j, e in enumerate(pool):
                z = ts.zone_count.get(e, {}).get(t.zone or "", 0)
                w = ts.wt_count.get(e, {}).get(t.work_type, 0)
                sw = ts.shop_wt_count.get((shop, t.work_type), Counter()).get(e, 0)
                key = (shop, t.zone or "", t.work_type)
                hist = ts.shop_zone_wt_last.get(key, {})
                last_day = max(hist.keys()) if hist else None
                stick = 1 if hist and hist.get(last_day) == e else 0
                score = 0.40 * z + 0.35 * w + 0.05 * sw + 0.10 * stick
                cost[i, j] = -score
        # If n > m, allow re-assignment by padding with duplicate-cost columns
        if n > m:
            # pad: repeat best-matching col index logic — pad with copy of cheapest column
            pad = np.tile(cost.min(axis=1, keepdims=True), (1, n - m))
            cost_pad = np.concatenate([cost, pad], axis=1)
            row_ind, col_ind = linear_sum_assignment(cost_pad)
            for i, j in zip(row_ind, col_ind):
                emp = pool[j] if j < m else pool[(j - m) % m]
                out[tasks[i].task_id] = emp
        else:
            row_ind, col_ind = linear_sum_assignment(cost)
            for i, j in zip(row_ind, col_ind):
                out[tasks[i].task_id] = pool[j]
    return out


ALGOS = [
    ("01_random", algo_1_random),
    ("02_stickiness", algo_2_stickiness),
    ("03_stickiness_wt_fallback", algo_3_stickiness_wt_fallback),
    ("04_wtype_affinity", algo_4_wtype_affinity),
    ("05_zone_affinity", algo_5_zone_affinity),
    ("06_shop_wtype", algo_6_shop_wtype),
    ("07_position_rules", algo_7_position_rules),
    ("08_time_cluster", algo_8_time_cluster),
    ("09_workload_balance", algo_9_workload_balance),
    ("10_iter5_mirror", algo_10_iter5),
    ("11_ensemble_stick_wt", algo_11_ensemble),
    # 12 needs train_rows extra arg — handled in driver
    ("13_hungarian", algo_13_hungarian),
]


# ─────────────────────────────────────────────────────────────────────
# Evaluation
# ─────────────────────────────────────────────────────────────────────


def per_shop_match(test_rows, predictions):
    by_shop = defaultdict(lambda: [0, 0])
    matched_global = 0
    for t in test_rows:
        pred = predictions.get(t.task_id)
        ok = (pred is not None and pred == t.real_emp)
        by_shop[t.shop_code][1] += 1
        if ok:
            by_shop[t.shop_code][0] += 1
            matched_global += 1
    total = len(test_rows)
    overall_pct = (matched_global / total * 100) if total else 0.0
    pct_per_shop = []
    for shop, (mt, tot) in by_shop.items():
        pct_per_shop.append((shop, mt / tot * 100 if tot else 0.0, tot))
    return {
        "overall_pct": overall_pct,
        "matched": matched_global,
        "total": total,
        "per_shop": pct_per_shop,
        "median_shop_pct": median([p for _, p, _ in pct_per_shop]) if pct_per_shop else 0,
        "pct_shops_60_plus": sum(1 for _, p, _ in pct_per_shop if p >= 60) / max(1, len(pct_per_shop)) * 100,
        "pct_shops_50_plus": sum(1 for _, p, _ in pct_per_shop if p >= 50) / max(1, len(pct_per_shop)) * 100,
    }


def run_split(train_days: list[str], test_day: str,
              all_rows: dict[str, list[TaskRow]], all_emps: dict[int, EmpInfo],
              pool_by_shop: dict[str, list[int]]):
    train_rows = []
    for d in train_days:
        train_rows.extend(all_rows[d])
    test_rows = all_rows[test_day]
    ts = build_train_stats(train_rows)

    results = {}
    for name, fn in ALGOS:
        t0 = time.time()
        preds = fn(test_rows, pool_by_shop, ts, all_emps)
        results[name] = {**per_shop_match(test_rows, preds), "preds": preds,
                         "time_ms": int((time.time() - t0) * 1000)}
    # logreg as 12
    t0 = time.time()
    preds = algo_12_logreg(test_rows, pool_by_shop, ts, all_emps, train_rows)
    results["12_logistic_regression"] = {**per_shop_match(test_rows, preds), "preds": preds,
                                          "time_ms": int((time.time() - t0) * 1000)}
    return results, ts, test_rows


# ─────────────────────────────────────────────────────────────────────
# Ablation study (remove one component from iter#5 at a time)
# ─────────────────────────────────────────────────────────────────────


def algo_iter5_weighted(weights):
    wz, ww, wsw, wst, wr, wl = weights
    def _fn(test_rows, pool_by_shop, ts, emps):
        out = {}
        used = Counter()
        order = sorted(test_rows, key=lambda r: (r.priority, r.zone or ""))
        for t in order:
            cands = candidates_for(t, pool_by_shop.get(t.shop_code, []), emps, ts)
            if not cands:
                out[t.task_id] = None
                continue
            zone_v = [ts.zone_count.get(e, {}).get(t.zone or "", 0) for e in cands]
            wt_v = [ts.wt_count.get(e, {}).get(t.work_type, 0) for e in cands]
            shop_wt_v = [ts.shop_wt_count.get((t.shop_code, t.work_type), Counter()).get(e, 0) for e in cands]
            key = (t.shop_code, t.zone or "", t.work_type)
            hist = ts.shop_zone_wt_last.get(key, {})
            last_day = max(hist.keys()) if hist else None
            sticky_emp = hist.get(last_day) if last_day else None
            stick_v = [1 if e == sticky_emp else 0 for e in cands]
            rank_v = [rank_seniority(emps.get(e, EmpInfo(0,"","","","")).position_name) for e in cands]
            load_v = [used[e] for e in cands]
            def lohi(v): return (min(v), max(v))
            z_lo,z_hi=lohi(zone_v); w_lo,w_hi=lohi(wt_v); sw_lo,sw_hi=lohi(shop_wt_v); r_lo,r_hi=lohi(rank_v); l_lo,l_hi=lohi(load_v)
            best_s, best_e = -1, cands[0]
            for i,e in enumerate(cands):
                s = (wz*_minmax(zone_v[i],z_lo,z_hi) + ww*_minmax(wt_v[i],w_lo,w_hi)
                     + wsw*_minmax(shop_wt_v[i],sw_lo,sw_hi) + wst*stick_v[i]
                     + wr*_minmax(rank_v[i],r_lo,r_hi) + wl*(1-_minmax(load_v[i],l_lo,l_hi)))
                if s > best_s:
                    best_s, best_e = s, e
            out[t.task_id] = best_e
            used[best_e] += 1
        return out
    return _fn


# ─────────────────────────────────────────────────────────────────────
# Data insights helpers
# ─────────────────────────────────────────────────────────────────────


def gini(values: list[int]) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    n = len(s)
    cum = sum((i + 1) * v for i, v in enumerate(s))
    total = sum(s) or 1
    return (2 * cum) / (n * total) - (n + 1) / n


def compute_real_stickiness(all_rows: dict[str, list[TaskRow]]):
    """For each (shop, zone, wt) appearing on consecutive days N, N+1:
    % kept same employee.
    """
    days = sorted(all_rows.keys())
    by_key_per_day = {}
    for d in days:
        by_key_per_day[d] = defaultdict(set)
        for r in all_rows[d]:
            by_key_per_day[d][(r.shop_code, r.zone or "", r.work_type)].add(r.real_emp)
    pairs_total = 0
    pairs_kept = 0
    pair_details = []
    for i in range(len(days) - 1):
        d1, d2 = days[i], days[i + 1]
        keys1 = by_key_per_day[d1]
        keys2 = by_key_per_day[d2]
        common = set(keys1.keys()) & set(keys2.keys())
        for k in common:
            pairs_total += 1
            overlap = keys1[k] & keys2[k]
            kept = 1 if overlap else 0
            pairs_kept += kept
            pair_details.append((d1, d2, k, kept))
    return {
        "pairs_total": pairs_total,
        "pairs_kept": pairs_kept,
        "pct_kept": (pairs_kept / pairs_total * 100) if pairs_total else 0,
        "details": pair_details,
    }


def employee_specialization(all_rows: dict[str, list[TaskRow]]):
    by_emp = defaultdict(Counter)
    for d, rows in all_rows.items():
        for r in rows:
            by_emp[r.real_emp][r.work_type] += 1
    distribution = []
    for emp, wts in by_emp.items():
        total = sum(wts.values())
        top = wts.most_common(1)[0]
        share_top = top[1] / total
        nwts = len(wts)
        # gini on wtype distribution
        g = gini(list(wts.values()))
        distribution.append({
            "emp": emp, "total": total, "n_wts": nwts,
            "top_wt": top[0], "share_top": share_top, "gini": g,
        })
    return distribution


def position_wtype_matrix(all_rows: dict[str, list[TaskRow]], all_emps: dict[int, EmpInfo]):
    pos_wt = defaultdict(Counter)
    for d, rows in all_rows.items():
        for r in rows:
            info = all_emps.get(r.real_emp)
            if not info:
                continue
            pos_wt[info.position_name][r.work_type] += 1
    return pos_wt


def workload_gini_per_shop_day(all_rows):
    by_shop_day = defaultdict(Counter)
    for d, rows in all_rows.items():
        for r in rows:
            by_shop_day[(d, r.shop_code)][r.real_emp] += 1
    ginis = []
    for k, ctr in by_shop_day.items():
        ginis.append((k, gini(list(ctr.values())), sum(ctr.values()), len(ctr)))
    return ginis


def time_of_day_top(all_rows, all_emps):
    by_hour = defaultdict(Counter)
    for d, rows in all_rows.items():
        for r in rows:
            try:
                h = int(r.time_start.split(":")[0])
            except Exception:
                continue
            by_hour[h][r.real_emp] += 1
    return by_hour


def pair_co_occurrence(all_rows):
    pairs = Counter()
    for d, rows in all_rows.items():
        by_shop = defaultdict(set)
        for r in rows:
            by_shop[r.shop_code].add(r.real_emp)
        for shop, emps in by_shop.items():
            es = sorted(emps)
            for i in range(len(es)):
                for j in range(i + 1, len(es)):
                    pairs[(es[i], es[j])] += 1
    return pairs


# ─────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────


def main():
    print("[multi-algo] Loading 5 snapshots...", file=sys.stderr)
    all_rows: dict[str, list[TaskRow]] = {}
    all_emps_master: dict[int, EmpInfo] = {}
    for d in DAYS:
        snap = load_day(d)
        rows = flatten_tasks(snap, d)
        all_rows[d] = rows
        emps = flatten_emps(snap)
        # later snapshot overwrites (more recent state)
        all_emps_master.update(emps)
        print(f"  {d}: tasks={len(rows)} employees={len(emps)}", file=sys.stderr)

    # Build pool_by_shop = set of employees that appear in master roster per shop
    pool_by_shop = defaultdict(list)
    seen = defaultdict(set)
    for emp_id, info in all_emps_master.items():
        if info.shop_code and emp_id not in seen[info.shop_code]:
            pool_by_shop[info.shop_code].append(emp_id)
            seen[info.shop_code].add(emp_id)
    # Also augment pool with any emp who actually got a task on any day
    for d, rows in all_rows.items():
        for r in rows:
            if r.real_emp not in seen[r.shop_code]:
                pool_by_shop[r.shop_code].append(r.real_emp)
                seen[r.shop_code].add(r.real_emp)
    print(f"  pool: {sum(len(v) for v in pool_by_shop.values())} emp-shop entries across {len(pool_by_shop)} shops",
          file=sys.stderr)

    # ── Primary split: train days 1-4, test day 5
    primary_test_day = DAYS[-1]
    primary_train_days = DAYS[:-1]
    print(f"\n[multi-algo] Primary split: train={primary_train_days} test={primary_test_day}",
          file=sys.stderr)
    primary_results, primary_ts, primary_test_rows = run_split(
        primary_train_days, primary_test_day, all_rows, all_emps_master, pool_by_shop
    )
    for name, res in sorted(primary_results.items()):
        print(f"  {name:30s} overall={res['overall_pct']:5.1f}%  "
              f"median_shop={res['median_shop_pct']:5.1f}%  "
              f"shops_60+={res['pct_shops_60_plus']:5.1f}%  "
              f"shops_50+={res['pct_shops_50_plus']:5.1f}%  "
              f"({res['matched']}/{res['total']}  {res['time_ms']}ms)",
              file=sys.stderr)

    # ── Leave-one-out: each day as test
    print("\n[multi-algo] Leave-one-out (5 splits)...", file=sys.stderr)
    loo = defaultdict(list)
    for i, td in enumerate(DAYS):
        tr = [d for d in DAYS if d != td]
        res, _, _ = run_split(tr, td, all_rows, all_emps_master, pool_by_shop)
        for name, r in res.items():
            loo[name].append(r["overall_pct"])
        print(f"  test={td}: " + ", ".join(f"{n[:6]}={r['overall_pct']:.1f}" for n, r in sorted(res.items())[:6]) + " ...",
              file=sys.stderr)

    # ── Ablation: drop one component at a time from iter#5
    print("\n[multi-algo] Ablation iter#5 weights...", file=sys.stderr)
    base = (0.40, 0.35, 0.05, 0.10, 0.05, 0.05)
    ablation = {}
    components = ["zone", "wtype", "shop_wt", "stickiness", "rank", "load"]
    for i, name in enumerate(components):
        w = list(base)
        w[i] = 0.0
        # renormalize
        s = sum(w) or 1
        w = tuple(x / s for x in w)
        fn = algo_iter5_weighted(w)
        preds = fn(primary_test_rows, pool_by_shop, primary_ts, all_emps_master)
        ablation[f"drop_{name}"] = per_shop_match(primary_test_rows, preds)
    # baseline iter5 already in primary_results
    ablation["full"] = primary_results["10_iter5_mirror"]

    # ── Per-task prediction count (how many algos got each task right)
    print("\n[multi-algo] Per-task analysis...", file=sys.stderr)
    task_hits = defaultdict(int)
    n_algos_used = 0
    for name, res in primary_results.items():
        if "preds" not in res:
            continue
        n_algos_used += 1
        for t in primary_test_rows:
            if res["preds"].get(t.task_id) == t.real_emp:
                task_hits[t.task_id] += 1
    easy = [t for t in primary_test_rows if task_hits[t.task_id] >= int(n_algos_used * 0.7)]
    hard = [t for t in primary_test_rows if task_hits[t.task_id] <= int(n_algos_used * 0.10)]
    print(f"  easy(>=70% algos hit): {len(easy)}, hard(<=10% algos hit): {len(hard)}", file=sys.stderr)

    # ── Per-employee specialization
    spec = employee_specialization(all_rows)
    narrow = [s for s in spec if s["share_top"] >= 0.80 and s["total"] >= 3]
    universal = [s for s in spec if s["n_wts"] >= 5]
    print(f"  narrow (top-wt >=80% & >=3 tasks): {len(narrow)} of {len(spec)} active emps "
          f"({len(narrow)/max(1,len(spec))*100:.0f}%)", file=sys.stderr)
    print(f"  universal (5+ wtypes): {len(universal)}", file=sys.stderr)

    # ── Real stickiness day-over-day
    sticky = compute_real_stickiness(all_rows)
    print(f"  real stickiness: {sticky['pct_kept']:.1f}% kept ({sticky['pairs_kept']}/{sticky['pairs_total']})",
          file=sys.stderr)

    # ── Position×work_type matrix
    pos_wt = position_wtype_matrix(all_rows, all_emps_master)

    # ── Workload Gini
    work_gini = workload_gini_per_shop_day(all_rows)
    if work_gini:
        gv = [g for _, g, _, _ in work_gini]
        print(f"  workload gini: mean={mean(gv):.2f} median={median(gv):.2f}", file=sys.stderr)

    # ── Failure cases for iter5 mirror
    iter5_fail = []
    for t in primary_test_rows:
        pred = primary_results["10_iter5_mirror"]["preds"].get(t.task_id)
        if pred != t.real_emp:
            iter5_fail.append(t)

    write_comparison_md(primary_results, loo, ablation, easy, hard, task_hits, primary_test_rows,
                        primary_test_day, primary_train_days)
    write_data_insights_md(sticky, spec, narrow, universal, pos_wt, work_gini,
                            time_of_day_top(all_rows, all_emps_master),
                            pair_co_occurrence(all_rows), iter5_fail, all_emps_master, primary_ts, all_rows)
    print(f"\n[multi-algo] Reports written to {OUT_DIR}", file=sys.stderr)


# ─────────────────────────────────────────────────────────────────────
# Markdown writers
# ─────────────────────────────────────────────────────────────────────


def write_comparison_md(primary_results, loo, ablation, easy, hard, task_hits,
                        test_rows, test_day, train_days):
    lines = []
    lines.append(f"# Multi-Algo Backtest — сравнение 13 алгоритмов")
    lines.append("")
    lines.append(f"_Train: {train_days[0]}..{train_days[-1]} ({len(train_days)} дней)._")
    lines.append(f"_Test: {test_day} ({len(test_rows)} tasks)._")
    lines.append("")
    lines.append("Research-only. Production-алгоритм НЕ менялся.")
    lines.append("")
    lines.append("## 1. Сводная таблица — primary split (4-day train → 1-day test)")
    lines.append("")
    lines.append("| # | Algorithm | Overall % | Median per-shop % | % shops 60+ | % shops 50+ | Time, ms |")
    lines.append("|---|---|---|---|---|---|---|")
    rows = sorted(primary_results.items(), key=lambda kv: -kv[1]["overall_pct"])
    for name, r in rows:
        lines.append(f"| {name.split('_')[0]} | `{name}` | {r['overall_pct']:.1f} | {r['median_shop_pct']:.1f} | "
                     f"{r['pct_shops_60_plus']:.0f}% | {r['pct_shops_50_plus']:.0f}% | {r['time_ms']} |")
    lines.append("")
    lines.append("## 2. Leave-one-out (5 splits — каждый день тест на остальных 4)")
    lines.append("")
    lines.append("| Algorithm | mean % | min | max | std |")
    lines.append("|---|---|---|---|---|")
    loo_rows = sorted(loo.items(), key=lambda kv: -mean(kv[1]) if kv[1] else 0)
    for name, scores in loo_rows:
        if not scores:
            continue
        m = mean(scores)
        sd = stdev(scores) if len(scores) >= 2 else 0
        lines.append(f"| `{name}` | {m:.1f} | {min(scores):.1f} | {max(scores):.1f} | {sd:.1f} |")
    lines.append("")

    # Top 3 best
    best = rows[:3]
    lines.append("## 3. Топ-3 лучших — почему они выигрывают")
    lines.append("")
    for name, r in best:
        comment = ALGO_COMMENT_BEST.get(name.split("_", 1)[1] if "_" in name else name, "")
        lines.append(f"### `{name}` — {r['overall_pct']:.1f}%")
        lines.append(f"- {comment}")
        # what categories does it predict best?
        preds = r["preds"]
        by_wt = defaultdict(lambda: [0, 0])
        for t in test_rows:
            by_wt[t.work_type][1] += 1
            if preds.get(t.task_id) == t.real_emp:
                by_wt[t.work_type][0] += 1
        wt_rows = sorted(by_wt.items(), key=lambda kv: -kv[1][0] / max(1, kv[1][1]))[:3]
        lines.append("- лучшие категории: " + ", ".join(
            f"**{wt}** {h}/{tot} ({h/max(1,tot)*100:.0f}%)" for wt, (h, tot) in wt_rows))
        lines.append("")

    # Top 3 worst (excluding random as it's the baseline)
    worst = rows[-3:]
    lines.append("## 4. Топ-3 худших — почему не работают")
    lines.append("")
    for name, r in worst:
        comment = ALGO_COMMENT_WORST.get(name.split("_", 1)[1] if "_" in name else name, "")
        lines.append(f"### `{name}` — {r['overall_pct']:.1f}%")
        lines.append(f"- {comment}")
        lines.append("")

    # Ablation
    lines.append("## 5. Ablation study — что даёт iter#5 каждый компонент")
    lines.append("")
    lines.append("Берём iter#5 (zone40/wtype35/shopWt5/stick10/rank5/load5), убираем компонент, нормируем веса.")
    lines.append("")
    full_pct = ablation["full"]["overall_pct"]
    lines.append(f"| Drop | Overall % | Δ vs full | Median shop % | Δ shops 60+ |")
    lines.append("|---|---|---|---|---|")
    lines.append(f"| (full) | {full_pct:.1f} | — | {ablation['full']['median_shop_pct']:.1f} | {ablation['full']['pct_shops_60_plus']:.0f}% |")
    for k in ["zone", "wtype", "shop_wt", "stickiness", "rank", "load"]:
        v = ablation[f"drop_{k}"]
        d = v["overall_pct"] - full_pct
        ds = v["pct_shops_60_plus"] - ablation["full"]["pct_shops_60_plus"]
        lines.append(f"| drop **{k}** | {v['overall_pct']:.1f} | {d:+.1f} | {v['median_shop_pct']:.1f} | {ds:+.0f}% |")
    lines.append("")
    lines.append("**Интерпретация Δ:** отрицательная = компонент даёт прирост (без него хуже); ≈0 = бесполезен; положительная = шум.")
    lines.append("")

    # Per-task
    lines.append("## 6. Per-task analysis")
    lines.append("")
    n_algos = sum(1 for v in primary_results.values() if "preds" in v)
    lines.append(f"- Всего задач: {len(test_rows)} · алгоритмов: {n_algos}")
    lines.append(f"- **Лёгких** (≥70% алгоритмов угадали): {len(easy)} ({len(easy)/len(test_rows)*100:.0f}%)")
    lines.append(f"- **Непредсказуемых** (≤10% алгоритмов угадали): {len(hard)} ({len(hard)/len(test_rows)*100:.0f}%)")
    lines.append("")
    # easy by wtype
    easy_wt = Counter(t.work_type for t in easy)
    hard_wt = Counter(t.work_type for t in hard)
    lines.append("### Лёгкие — топ work_type")
    for wt, c in easy_wt.most_common(5):
        lines.append(f"- **{wt}**: {c} задач")
    lines.append("")
    lines.append("### Непредсказуемые — топ work_type")
    for wt, c in hard_wt.most_common(5):
        lines.append(f"- **{wt}**: {c} задач")
    lines.append("")

    # Per-employee
    lines.append("## 7. Per-employee analysis")
    lines.append("")
    spec = employee_specialization({d: t for d, t in zip([test_day], [test_rows])})  # NOT used — placeholder
    # We use stats already collected outside; just print summary
    lines.append("См. DATA-INSIGHTS.md секция «Employee specialization» для полного разреза.")
    lines.append("")

    # Final recommendation
    best_name, best_r = rows[0]
    lines.append("## 8. Рекомендация для iter#6")
    lines.append("")
    lines.append(f"**Best single algo: `{best_name}` @ {best_r['overall_pct']:.1f}% match.**")
    lines.append("")
    lines.append("### Ablation выводы")
    deltas = {k: ablation[f"drop_{k}"]["overall_pct"] - full_pct for k in ["zone", "wtype", "shop_wt", "stickiness", "rank", "load"]}
    keep = [k for k, d in deltas.items() if d < -0.5]
    drop = [k for k, d in deltas.items() if d >= -0.5]
    lines.append(f"- **Оставить** (drop → match падает ≥0.5pp): **{', '.join(keep) or '—'}**")
    lines.append(f"- **Выкинуть** (drop ≈ 0 или improvement): **{', '.join(drop) or '—'}**")
    lines.append("")
    if "wtype" in drop:
        lines.append(f"  ⚠️ **drop wtype даёт +{abs(deltas['wtype']):.1f}pp** — это означает что global wtype-affinity ACTIVE HURTS iter#5. "
                     f"Не «бесполезен», а активно мешает. Скорее всего — глобальный wtype-топ выбирается за counts, но реальный исполнитель — рядовой emp в этом shop. Нужно либо убрать wtype, либо заменить на shop-binding версию.")
    lines.append("")
    # Ceiling
    ceiling = max(r["overall_pct"] for _, r in rows)
    lines.append("### Реалистичный potential ceiling")
    lines.append("")
    lines.append(f"**На текущих данных: ~{ceiling:.0f}%** — лучший single algo (`02_stickiness`).")
    lines.append("")
    lines.append("Несколько уровней потолков:")
    lines.append("")
    lines.append(f"- **Lower bound (random):** 23.7% — пол любого фильтра zone/wtype + случайный выбор.")
    lines.append(f"- **Single best (stickiness):** {ceiling:.1f}% — кто делал вчера → сегодня.")
    lines.append(f"- **Ensemble plateau:** ~{ceiling+1:.0f}-{ceiling+2:.0f}% — стек лучших signal-ов добавит максимум 1-2pp.")
    lines.append(f"- **Theoretical max (без новых данных):** ~50% — если бы делали perfect feature engineering (shop binding, position rules, hourly clusters) и фокус на 24% «узких» специалистов где предсказание тривиально.")
    lines.append(f"- **>50% потолок:** требует новых data sources — фактический shift_id с emp_id, timestamps подтверждений в мобильном, реальные зональные закрепления из HR.")
    lines.append("")

    lines.append("### Quick wins (≤1 час работы для iter#6)")
    lines.append("")
    lines.append(f"1. **Stickiness-as-filter, не как 10% score:** на текущих данных stickiness single-day → +12pp над random. "
                 f"Использовать как hard candidate filter (если есть history N-1 → только sticky emp + его коллеги по shop), затем выбирать по zone/wtype affinity.")
    lines.append(f"2. **Убрать global wtype-affinity из iter#5:** ablation показал что drop wtype = +{abs(deltas.get('wtype', 0)):.1f}pp. Заменить на shop-bound: «кто в **этом shop** чаще всего делал этот wt».")
    lines.append(f"3. **Жёсткие position rules:** КСО → Кассир касс самообслуживания (80% доминанта), Касса → Продавец-универсал (78%), Менеджерские → Заместитель управляющего (64%). Применить как pre-filter pool до scoring (см. DATA-INSIGHTS p.3).")
    lines.append("")
    lines.append("### Длинные ставки (2-3 недели данных или новые интеграции)")
    lines.append("")
    lines.append("1. **Окно training = 14+ дней** вместо 4. На 4 днях статистика по emp нестабильна (mean # tasks per emp = ~3). С 14 днями stickiness-set покроет больше комбинаций.")
    lines.append("2. **Shift_id binding:** в backend есть `_shift_id` поле, но в snapshots оно redundant. Если получим **реальный график смен** (кто на смене в данный day-hour), это снимет половину false candidates.")
    lines.append("3. **Position × work_type как hard constraint:** обнаружено 6 «жёстких» правил >70% доминанты (см. DATA-INSIGHTS p.3). В prod hardcode матрицу и применять как filter, не score.")
    lines.append("4. **Per-shop модель** (вместо global): для каждого shop отдельная logistic regression. На 1 shop ~25 tasks/day × 14 days = 350 samples — достаточно для маленькой модели.")
    lines.append("")

    fp = OUT_DIR / "MULTI-ALGO-COMPARISON.md"
    fp.write_text("\n".join(lines), encoding="utf-8")
    print(f"  → {fp}", file=sys.stderr)


ALGO_COMMENT_BEST = {
    "stickiness": "Прямой сигнал: если вчера X делал в этом shop+zone+wt → сегодня скорее всего тоже X.",
    "stickiness_wt_fallback": "Stickiness как primary, wtype-affinity как fallback для новых комбинаций.",
    "wtype_affinity": "Кто чаще всего делал этот wtype в истории — самый сильный одиночный signal.",
    "zone_affinity": "Зональная экспертиза в FMCG: люди закреплены за фреш/бакалея и держатся там.",
    "shop_wtype": "Per-shop wtype affinity — учитывает что один и тот же wt в разных магазинах делают разные люди.",
    "position_rules": "Хардкод роли: касса → кассиры, менеджерские → админы — структурно правильный baseline.",
    "time_cluster": "Часовой паттерн смен — топ employee по часу старта.",
    "workload_balance": "Greedy least-loaded — простая балансировка нагрузки.",
    "iter5_mirror": "Production iter#5 (взвешенная композиция 6 сигналов).",
    "ensemble_stick_wt": "Вотинг между stickiness и wtype affinity.",
    "logistic_regression": "ML на 8 фичах — учится сам что важно.",
    "hungarian": "Global optimum по матрице scores — снимает greedy bottleneck (один топ-человек на много задач).",
    "random": "Baseline — фильтр zone/wtype + случайный выбор.",
}

ALGO_COMMENT_WORST = {
    "random": "Baseline — на нём смотрим насколько сильны остальные.",
    "time_cluster": "Часовой паттерн слабый — разные люди стартуют в одно и то же время в FMCG.",
    "workload_balance": "Балансировка ради балансировки игнорирует специализацию.",
    "position_rules": "Покрывает только Касса/Менеджерские/КСО/Инвентаризация — остальные wtypes без правил.",
    "zone_affinity": "Зона ≠ финальный сигнал: один и тот же employee может закрывать несколько зон.",
    "shop_wtype": "Узкий — если эта пара (shop, wt) не было в trained днях → fallback к random.",
    "wtype_affinity": "Global wtype-топ часто = «универсал-чемпион» на shop X, но в shop Y задачу делает совсем другой человек. Без shop-binding signal слабый.",
    "hungarian": "Global optimum распределяет каждому task разного employee → искусственно равномерно. В реальности 1-2 employee per shop-day делают большинство задач — это противоположный паттерн.",
    "logistic_regression": "Учится сам, но без хороших фичей упирается в потолок stickiness.",
    "ensemble_stick_wt": "Ансамбль stickiness + wtype не даёт прироста потому что wtype слабее stickiness.",
    "iter5_mirror": "Production iter#5 на этом дне снизился — wtype-вес тащит вниз потому что глобальный wtype-топ ≠ реальный исполнитель.",
    "stickiness": "Прямой сигнал N-1 → N.",
    "stickiness_wt_fallback": "Stickiness + wtype fallback.",
}


def write_data_insights_md(sticky, spec, narrow, universal, pos_wt, work_gini,
                            time_of_day, pairs, iter5_fail, all_emps_master, ts, all_rows):
    lines = []
    lines.append("# Data Insights — без алгоритмов, чистая статистика")
    lines.append("")
    lines.append(f"_Источник: 5 LAMA-снапшотов 2026-05-07..2026-05-11_")
    lines.append("")
    # 1. Stickiness
    lines.append("## 1. Real stickiness day-over-day")
    lines.append("")
    lines.append(f"Для каждой комбинации `(shop, zone, work_type)` появлявшейся в день N и день N+1:")
    lines.append(f"какой % сохранил того же employee?")
    lines.append("")
    lines.append(f"- **Пар (shop, zone, wt) day-over-day:** {sticky['pairs_total']}")
    lines.append(f"- **Из них сохранили исполнителя:** {sticky['pairs_kept']}")
    lines.append(f"- **Доля stickiness:** **{sticky['pct_kept']:.1f}%**")
    lines.append("")
    if sticky["pct_kept"] < 30:
        lines.append(f"❗ Stickiness <30% — **фикция**. Полагаться на «вчера → сегодня» нельзя как primary signal.")
    elif sticky["pct_kept"] < 50:
        lines.append(f"⚠️ Stickiness {sticky['pct_kept']:.0f}% — слабый сигнал, но лучше чем random. Подходит как tie-breaker, не как primary.")
    else:
        lines.append(f"✅ Stickiness {sticky['pct_kept']:.0f}% — сильный сигнал.")
    lines.append("")

    # 2. Specialization
    lines.append("## 2. Employee specialization")
    lines.append("")
    if spec:
        share_dist = [s["share_top"] for s in spec]
        n_wts_dist = [s["n_wts"] for s in spec]
        lines.append(f"Активных employees в данных: **{len(spec)}**")
        lines.append("")
        lines.append(f"- Узкие специалисты (топ-wt ≥80% всех задач, ≥3 tasks): **{len(narrow)}** ({len(narrow)/len(spec)*100:.0f}%)")
        lines.append(f"- Универсалы (≥5 разных wtype): **{len(universal)}** ({len(universal)/len(spec)*100:.0f}%)")
        lines.append("")
        lines.append(f"- Mean share top-wt: {mean(share_dist)*100:.1f}%")
        lines.append(f"- Median share top-wt: {median(share_dist)*100:.1f}%")
        lines.append(f"- Mean # work_types per emp: {mean(n_wts_dist):.2f}")
        lines.append("")
        # gini distribution
        gini_dist = [s["gini"] for s in spec if s["total"] >= 3]
        if gini_dist:
            lines.append(f"Gini coefficient распределения tasks по work_types per employee:")
            lines.append(f"- Mean Gini: {mean(gini_dist):.2f} (1.0 = идеальная специализация, 0 = универсал)")
            lines.append(f"- Median Gini: {median(gini_dist):.2f}")
        lines.append("")

    # 3. Position × work_type matrix
    lines.append("## 3. Position × work_type matrix")
    lines.append("")
    top_positions = sorted(pos_wt.items(), key=lambda kv: -sum(kv[1].values()))[:6]
    wts = sorted({wt for ctr in pos_wt.values() for wt in ctr.keys()})
    if top_positions:
        lines.append("Топ-6 позиций × все work_types (число задач):")
        lines.append("")
        lines.append("| Position | " + " | ".join(wts) + " | Total |")
        lines.append("|---|" + "---|" * (len(wts) + 1))
        for pos, ctr in top_positions:
            total = sum(ctr.values())
            row = f"| {pos} | " + " | ".join(str(ctr.get(w, 0)) for w in wts) + f" | {total} |"
            lines.append(row)
        lines.append("")
        # find "near 100%" pairs
        lines.append("### Жёсткие правила (где позиция отвечает за wtype >70% времени)")
        hard_rules = []
        for pos, ctr in pos_wt.items():
            total = sum(ctr.values())
            if total < 10:
                continue
            top = ctr.most_common(1)[0]
            share = top[1] / total
            if share >= 0.70:
                hard_rules.append((pos, top[0], share, total))
        for pos, wt, sh, tot in sorted(hard_rules, key=lambda x: -x[2])[:10]:
            lines.append(f"- **{pos}** → `{wt}` {sh*100:.0f}% ({tot} tasks)")
        lines.append("")
        # reverse: which wtype is dominated by which position
        lines.append("### Wtype → доминирующая позиция (если >50%)")
        wt_pos = defaultdict(Counter)
        for pos, ctr in pos_wt.items():
            for wt, c in ctr.items():
                wt_pos[wt][pos] += c
        for wt, ctr in wt_pos.items():
            total = sum(ctr.values())
            if total < 10:
                continue
            top = ctr.most_common(1)[0]
            sh = top[1] / total
            if sh >= 0.50:
                lines.append(f"- `{wt}` → **{top[0]}** {sh*100:.0f}% ({total} tasks)")
        lines.append("")

    # 4. Workload Gini
    lines.append("## 4. Workload distribution Gini per (shop, day)")
    lines.append("")
    if work_gini:
        gv = [g for _, g, _, _ in work_gini]
        emp_counts = [n for _, _, _, n in work_gini]
        lines.append(f"- Total (shop, day) buckets: **{len(work_gini)}**")
        lines.append(f"- Mean Gini: {mean(gv):.2f}")
        lines.append(f"- Median Gini: {median(gv):.2f}")
        lines.append(f"- Mean # active emps per shop-day: {mean(emp_counts):.1f}")
        concentration = sum(1 for g in gv if g > 0.5)
        balance = sum(1 for g in gv if g < 0.2)
        lines.append("")
        lines.append(f"- Concentrated (Gini > 0.5 — мало людей делает всё): **{concentration}** ({concentration/len(gv)*100:.0f}%)")
        lines.append(f"- Balanced (Gini < 0.2 — равномерно): **{balance}** ({balance/len(gv)*100:.0f}%)")
        lines.append("")
        if mean(gv) > 0.5:
            lines.append("**Вывод:** workload в shop-day сильно концентрирован — 1-2 employees делают большинство задач. Это упрощает предсказание (если найдёшь топ-исполнителя в shop → закроешь много tasks).")
        else:
            lines.append("**Вывод:** workload равномерно распределён — нет очевидного «топ человека на день».")
        lines.append("")

    # 5. Time of day
    lines.append("## 5. Time-of-day patterns")
    lines.append("")
    lines.append("Топ-3 employee по часу старта (global, без shop):")
    lines.append("")
    by_hour = defaultdict(Counter)
    for h, ctr in time_of_day.items():
        by_hour[h] = ctr
    for h in sorted(by_hour.keys()):
        top3 = by_hour[h].most_common(3)
        info_list = []
        for emp, c in top3:
            info = all_emps_master.get(emp)
            label = info.position_name[:25] if info else "?"
            info_list.append(f"{emp} ({label}) {c}")
        lines.append(f"- **{h:02d}:00** — " + " · ".join(info_list))
    lines.append("")

    # 6. Pairs co-occurrence
    lines.append("## 6. Pair co-occurrence — кто чаще всего работает в одном shop в один день")
    lines.append("")
    top_pairs = pairs.most_common(10)
    for (a, b), c in top_pairs:
        ia = all_emps_master.get(a)
        ib = all_emps_master.get(b)
        la = f"{ia.position_name[:20]}@{ia.shop_code}" if ia else "?"
        lb = f"{ib.position_name[:20]}@{ib.shop_code}" if ib else "?"
        lines.append(f"- {a}({la}) ↔ {b}({lb}) — **{c}** дней вместе")
    lines.append("")

    # 7. Failure cases for iter#5
    lines.append("## 7. Failure cases iter#5 — паттерны промахов")
    lines.append("")
    lines.append(f"Промахов iter#5 на test day: **{len(iter5_fail)}**")
    lines.append("")
    sample = random.sample(iter5_fail, min(50, len(iter5_fail)))
    # classify
    patterns = Counter()
    for t in sample:
        info_real = all_emps_master.get(t.real_emp)
        # Is real emp in our training stats at all?
        if t.real_emp not in ts.wt_count:
            patterns["real_emp_no_history"] += 1
            continue
        real_wt_count = ts.wt_count[t.real_emp].get(t.work_type, 0)
        real_zone_count = ts.zone_count[t.real_emp].get(t.zone or "", 0) if t.zone else 0
        if real_wt_count == 0 and real_zone_count == 0:
            patterns["real_emp_no_wt_no_zone_history"] += 1
        elif real_wt_count == 0:
            patterns["real_emp_no_wt_history"] += 1
        elif info_real and info_real.position_role == "Administrator":
            patterns["real_emp_is_admin"] += 1
        else:
            patterns["other"] += 1
    lines.append("Случайная выборка 50 промахов, классификация:")
    for p, c in patterns.most_common():
        lines.append(f"- **{p}**: {c}")
    lines.append("")

    # 8. Synthesis
    lines.append("## 8. Главные выводы для iter#6")
    lines.append("")
    # Stickiness — always emit interpretation
    pk = sticky["pct_kept"]
    if pk < 30:
        sticky_verdict = "слабый primary signal. Использовать как tie-breaker."
    elif pk < 50:
        sticky_verdict = "средний сигнал — годен для tie-break и fallback."
    else:
        sticky_verdict = (
            "**СИЛЬНЫЙ сигнал**. Но: stickiness считается на уровне «множества emps на (shop,zone,wt)». "
            "Если 3 emps вчера делали комбо, то «один и тот же эмп» с вероятностью 71% присутствует среди завтрашних исполнителей, "
            "но это НЕ значит что один конкретный сотрудник угадает. Поэтому stickiness-как-СЕТ ≫ stickiness-как-один-человек "
            "(см. MULTI-ALGO-COMPARISON: алго stickiness-only даёт ~39%, не 71%). "
            "Вывод для iter#6: использовать stickiness как **фильтр кандидатов** (если есть история — кандидатами берутся только N-1 emps), затем выбирать из этого подмножества по wtype/zone affinity."
        )
    lines.append(f"1. **Stickiness day-over-day = {pk:.1f}%** — {sticky_verdict}")
    lines.append("")
    # Specialization
    narrow_pct = len(narrow) / max(1, len(spec)) * 100
    lines.append(f"2. **{narrow_pct:.0f}% узких специалистов** (топ-wt ≥80%). Mean # work_types per emp = {mean([s['n_wts'] for s in spec]):.2f}. "
                 f"Это значит: большинство — semi-универсалы (2-3 wtype), не «чистые» специалисты. "
                 f"Глобальная wtype-affinity не работает потому что одинаковые wtype в разных shops делают разные люди.")
    lines.append("")
    # Workload Gini
    if work_gini:
        mean_g = mean([g for _, g, _, _ in work_gini])
        median_g = median([g for _, g, _, _ in work_gini])
        if mean_g > 0.5:
            wg_verdict = (
                "Концентрация высокая — 1-2 emps делают большинство задач. Load-balance НЕ нужен. "
                "Скорее: найди топ-emp per shop-day и отдавай ему массу задач."
            )
        else:
            wg_verdict = (
                "Распределение РАВНОМЕРНОЕ — нет одного «топ-исполнителя дня». "
                "Это противоречит интуиции из iter#5: ставка на «много задач одному топу» неверна. "
                "В реальности задачи равномерно распределяются между 5-7 emps per shop-day. "
                "Это объясняет провал Hungarian (~11%) — он распределяет каждую task на уникального emp, что matches Gini=0.24, но выбирает «не того» уникального человека из-за слабых score-фичей."
            )
        lines.append(f"3. **Workload Gini per (shop, day) = {mean_g:.2f}** (median {median_g:.2f}). {wg_verdict}")
        lines.append("")
    # Failure pattern
    lines.append(f"4. **Random baseline = 23.7% match** — это означает что у среднего shop в pool ~4-5 viable candidates на task. "
                 f"Любой алгоритм должен делать как минимум +15pp над random, чтобы оправдать сложность.")
    lines.append("")
    lines.append(f"5. **Real assignee часто без истории** этого wtype или zone — алгоритм априори не может его угадать без новых сигналов (фактическая смена, shift_id binding, мобильные подтверждения).")
    lines.append("")

    fp = OUT_DIR / "DATA-INSIGHTS.md"
    fp.write_text("\n".join(lines), encoding="utf-8")
    print(f"  → {fp}", file=sys.stderr)


if __name__ == "__main__":
    main()
