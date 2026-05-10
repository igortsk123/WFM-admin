"""Per-store backtest pattern analysis.

Что делает: для каждого магазина с tasks в нескольких snapshot-днях
проходимся по реальным task→responsible назначениям и оцениваем какая
metric лучше всего предсказывает выбор директора:

  1. zone_affinity — chosen имеет наибольший past-task-count в этой зоне?
  2. work_type_affinity — chosen имеет наибольший past-task-count по типу работы?
  3. load_balance — chosen имеет наименьшее уже-assigned минут на момент?
  4. rank/seniority — chosen имеет высший разряд/позицию?

Aggregate по магазину: процент случаев когда top metric совпал с выбором.
Top-level summary: что доминирует, есть ли rank pattern, какие weights
предложить в iter#2.

Output:
- console table top-25 магазинов с dominant pattern
- tools/lama/per-store-patterns.json — для consume алгоритмом
- tools/lama/PER-STORE-PATTERNS.md — markdown report

Usage:
    python tools/lama/per-store-pattern-analysis.py
"""
import io
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_DIR = ROOT / ".lama_snapshots"
OUT_JSON = ROOT / "tools" / "lama" / "per-store-patterns.json"
OUT_MD = ROOT / "tools" / "lama" / "PER-STORE-PATTERNS.md"

# Минимум дней с tasks в магазине чтобы попасть в анализ (4=строго все 4 дня).
MIN_DAYS = 2

# Rank → numeric score (higher = senior). Position name keywords тоже
# учитываем — некоторые «старшие» позиции не имеют формального разряда.
RANK_TO_SCORE = {
    "Разряд 1": 1,
    "Разряд 2": 2,
    "Разряд 3": 3,
    "Разряд 4": 4,
    "Разряд 5": 5,
}

# Position name → seniority bonus (admin/senior/lead → +N points поверх ранка).
# Помогает когда rank=N/A (Administrator-роли всегда N/A).
POSITION_SENIORITY = [
    ("управляющий магазином", 8),  # Manager
    ("заместитель управляющего", 7),
    ("заместитель директора", 7),
    ("заведующий", 6),
    ("администратор", 6),
    ("старший", 5),
    ("менеджер", 5),
    ("мастер", 4),
]


def normalize(s: str) -> str:
    return (s or "").strip().lower()


def seniority_score(emp: dict) -> float:
    """Combined seniority: rank разряд + position keyword bonus.

    Returns float (rank 1-5 + position bonus 0-8). Senior > junior.
    """
    score = 0.0
    rank = emp.get("rank") or ""
    if rank in RANK_TO_SCORE:
        score += RANK_TO_SCORE[rank]
    pos_lower = normalize(emp.get("position_name", ""))
    # Берём max bonus (нет смысла суммировать «старший» + «менеджер» если позиция
    # «старший менеджер» — это одна роль).
    bonus = 0
    for keyword, b in POSITION_SENIORITY:
        if keyword in pos_lower and b > bonus:
            bonus = b
    score += bonus
    return score


def load_snapshots() -> list[tuple[str, dict]]:
    paths = sorted(p for p in SNAPSHOT_DIR.glob("*.json") if not p.name.startswith("_"))
    snaps = []
    for p in paths:
        date = p.stem
        try:
            data = json.loads(p.read_text(encoding="utf-8-sig"))
        except Exception as e:
            print(f"  ERR {p.name}: {e}", file=sys.stderr)
            continue
        snaps.append((date, data))
    return snaps


def analyze_shop(
    shop_code: str,
    shop_name: str,
    employees: list[dict],
    tasks: list[dict],
) -> dict:
    """Анализ одного магазина: для каждого task→responsible назначения
    оцениваем что определило выбор и что было top по разным metric'ам.

    Iterating tasks в порядке time_start (как директор раздавал бы их утром
    последовательно). Это важно для load_balance расчёта — он смотрит
    «assigned до текущего момента».

    Returns: dict с aggregated stats.
    """
    # Index emp by id
    emp_by_id = {e["employee_id"]: e for e in employees}
    seniority = {eid: seniority_score(e) for eid, e in emp_by_id.items()}

    # Build per-emp histories ACROSS ALL DAYS for this shop (zone+wtype counts)
    # Это даёт «опыт сотрудника в этой зоне/типе работы» — proxy для affinity.
    zone_count = defaultdict(lambda: defaultdict(int))  # emp_id → zone → count
    wtype_count = defaultdict(lambda: defaultdict(int))  # emp_id → wtype → count
    for t in tasks:
        emp_id = t.get("_employee_id")
        if emp_id is None or emp_id not in emp_by_id:
            continue
        z = t.get("operation_zone") or ""
        w = t.get("operation_work") or ""
        if z and z != "N/A":
            zone_count[emp_id][z] += 1
        if w:
            wtype_count[emp_id][w] += 1

    # Iterate tasks, per task оцениваем chosen vs alternatives
    n_decisions = 0
    n_unmappable = 0  # employee не в employees секции
    top_zone = 0
    top_wtype = 0
    lowest_load = 0
    top_rank = 0
    is_admin = 0
    random_pick = 0  # ни одна metric не выделила chosen

    # Per-decision дамп для отладки
    decisions: list[dict] = []

    # Сортируем tasks по time_start чтобы load posthoc симулировал
    # последовательное распределение
    sorted_tasks = sorted(
        tasks, key=lambda t: (t.get("time_start") or "", t.get("id") or 0)
    )
    cum_load: dict[int, int] = defaultdict(int)  # emp_id → assigned minutes so far

    for t in sorted_tasks:
        chosen_id = t.get("_employee_id")
        if chosen_id is None:
            continue
        if chosen_id not in emp_by_id:
            n_unmappable += 1
            continue
        n_decisions += 1
        z = t.get("operation_zone") or ""
        w = t.get("operation_work") or ""
        duration = (t.get("duration") or 0) // 60

        # Vote по каждой metric: top по этой metric среди ВСЕХ employees shop
        # — chosen ли это? (если ничья — chosen зачитываем как top).
        all_ids = list(emp_by_id.keys())

        # 1. Zone affinity — past-task-count в этой zone
        zone_score = {eid: zone_count[eid].get(z, 0) for eid in all_ids}
        max_zone = max(zone_score.values()) if zone_score else 0
        zone_top_set = {eid for eid, s in zone_score.items() if s == max_zone}
        zone_match = chosen_id in zone_top_set and max_zone > 0

        # 2. Work_type affinity
        wtype_score = {eid: wtype_count[eid].get(w, 0) for eid in all_ids}
        max_wt = max(wtype_score.values()) if wtype_score else 0
        wt_top_set = {eid for eid, s in wtype_score.items() if s == max_wt}
        wt_match = chosen_id in wt_top_set and max_wt > 0

        # 3. Load balance — chosen ли это employee с lowest cumulative load?
        load_score = {eid: cum_load.get(eid, 0) for eid in all_ids}
        min_load = min(load_score.values()) if load_score else 0
        load_top_set = {eid for eid, s in load_score.items() if s == min_load}
        load_match = chosen_id in load_top_set

        # 4. Rank/seniority — chosen ли с highest seniority?
        rank_score = {eid: seniority[eid] for eid in all_ids}
        max_rank = max(rank_score.values()) if rank_score else 0
        rank_top_set = {eid for eid, s in rank_score.items() if s == max_rank}
        rank_match = chosen_id in rank_top_set and max_rank > 0

        # Is chosen Admin role?
        chosen_emp = emp_by_id[chosen_id]
        admin_match = chosen_emp.get("position_role") == "Administrator"

        if zone_match:
            top_zone += 1
        if wt_match:
            top_wtype += 1
        if load_match:
            lowest_load += 1
        if rank_match:
            top_rank += 1
        if admin_match:
            is_admin += 1
        if not (zone_match or wt_match or load_match or rank_match):
            random_pick += 1

        decisions.append({
            "task_id": t.get("id"),
            "zone": z,
            "wtype": w,
            "duration_min": duration,
            "chosen_id": chosen_id,
            "chosen_pos": chosen_emp.get("position_name"),
            "chosen_rank": chosen_emp.get("rank"),
            "zone_match": zone_match,
            "wt_match": wt_match,
            "load_match": load_match,
            "rank_match": rank_match,
            "admin_match": admin_match,
        })

        # Update load
        cum_load[chosen_id] += duration

    if n_decisions == 0:
        return None

    pct = lambda v: round(100.0 * v / n_decisions, 1)
    return {
        "shop_code": shop_code,
        "shop_name": shop_name,
        "n_decisions": n_decisions,
        "n_employees": len(emp_by_id),
        "n_unmappable": n_unmappable,
        "top_zone_pct": pct(top_zone),
        "top_wtype_pct": pct(top_wtype),
        "lowest_load_pct": pct(lowest_load),
        "top_rank_pct": pct(top_rank),
        "is_admin_pct": pct(is_admin),
        "random_pct": pct(random_pick),
    }


def main() -> None:
    print("=== LAMA per-store pattern analysis ===", file=sys.stderr)
    snaps = load_snapshots()
    if not snaps:
        print("ERR: no snapshots", file=sys.stderr)
        sys.exit(1)
    print(f"Loaded {len(snaps)} snapshots: {[d for d, _ in snaps]}", file=sys.stderr)

    # Aggregate per shop_code: tasks + employees pooled across all days
    shop_tasks: dict[str, list[dict]] = defaultdict(list)
    shop_emps: dict[str, dict[int, dict]] = defaultdict(dict)
    shop_names: dict[str, str] = {}
    shop_days: dict[str, set[str]] = defaultdict(set)

    for date, snap in snaps:
        for t in snap.get("tasks", []):
            sc = t.get("_shop_code")
            if not sc:
                continue
            shop_names[sc] = t.get("_shop_name") or sc
            shop_tasks[sc].append(t)
            if t.get("_employee_id") is not None:
                shop_days[sc].add(date)
        for e in snap.get("employees", []):
            sc = e.get("shop_code")
            eid = e.get("employee_id")
            if not sc or eid is None:
                continue
            # Latest snapshot wins (employees can be added/removed between days)
            shop_emps[sc][eid] = e

    # Filter: shops with assigned tasks ≥ MIN_DAYS days
    qualifying_shops = sorted(sc for sc, days in shop_days.items() if len(days) >= MIN_DAYS)
    print(f"\nShops with assigned tasks in ≥{MIN_DAYS} days: {len(qualifying_shops)}", file=sys.stderr)

    # Analyze each
    results: list[dict] = []
    for sc in qualifying_shops:
        emps = list(shop_emps[sc].values())
        tasks = shop_tasks[sc]
        if not emps or not tasks:
            continue
        res = analyze_shop(sc, shop_names.get(sc, sc), emps, tasks)
        if res is None:
            continue
        res["n_days"] = len(shop_days[sc])
        results.append(res)

    # Aggregate metrics across all shops (weighted by n_decisions)
    total_dec = sum(r["n_decisions"] for r in results)
    if total_dec == 0:
        print("No decisions to analyze!", file=sys.stderr)
        sys.exit(0)

    weighted = lambda key: round(
        sum(r[key] * r["n_decisions"] for r in results) / total_dec, 1
    )
    aggregate = {
        "n_shops": len(results),
        "n_decisions": total_dec,
        "top_zone_pct": weighted("top_zone_pct"),
        "top_wtype_pct": weighted("top_wtype_pct"),
        "lowest_load_pct": weighted("lowest_load_pct"),
        "top_rank_pct": weighted("top_rank_pct"),
        "is_admin_pct": weighted("is_admin_pct"),
        "random_pct": weighted("random_pct"),
    }

    # Console table — top 25 by n_decisions
    print("", file=sys.stderr)
    print("=" * 110, file=sys.stderr)
    print(
        f"{'shop':6} {'name':35} {'days':4} {'dec':4} {'zone%':6} {'wt%':5} {'load%':6} {'rank%':6} {'admin%':6}",
        file=sys.stderr,
    )
    print("-" * 110, file=sys.stderr)
    for r in sorted(results, key=lambda x: -x["n_decisions"])[:25]:
        name_short = r["shop_name"][:35]
        print(
            f"{r['shop_code']:6} {name_short:35} {r['n_days']:4} {r['n_decisions']:4} "
            f"{r['top_zone_pct']:5}% {r['top_wtype_pct']:4}% {r['lowest_load_pct']:5}% "
            f"{r['top_rank_pct']:5}% {r['is_admin_pct']:5}%",
            file=sys.stderr,
        )
    print("=" * 110, file=sys.stderr)

    # Aggregate
    print("", file=sys.stderr)
    print(f"AGGREGATE across {aggregate['n_shops']} shops, {aggregate['n_decisions']} decisions:", file=sys.stderr)
    print(f"  top_zone_pct        : {aggregate['top_zone_pct']}% (chosen — top по past-zone-count)", file=sys.stderr)
    print(f"  top_wtype_pct       : {aggregate['top_wtype_pct']}% (chosen — top по past-work-type-count)", file=sys.stderr)
    print(f"  lowest_load_pct     : {aggregate['lowest_load_pct']}% (chosen — наименее загруженный на момент)", file=sys.stderr)
    print(f"  top_rank_pct        : {aggregate['top_rank_pct']}% (chosen — высший разряд/позиция)", file=sys.stderr)
    print(f"  is_admin_pct        : {aggregate['is_admin_pct']}% (chosen — Administrator role)", file=sys.stderr)
    print(f"  random_pct          : {aggregate['random_pct']}% (никакая metric не объясняет — \"чистый\" random)", file=sys.stderr)

    # Determine dominant per-shop pattern
    for r in results:
        scores = {
            "zone": r["top_zone_pct"],
            "wtype": r["top_wtype_pct"],
            "load": r["lowest_load_pct"],
            "rank": r["top_rank_pct"],
        }
        r["dominant"] = max(scores, key=scores.get)
        r["dominant_pct"] = scores[r["dominant"]]

    dom_dist = Counter(r["dominant"] for r in results)
    print("", file=sys.stderr)
    print(f"Dominant pattern distribution across shops:", file=sys.stderr)
    for d, c in dom_dist.most_common():
        print(f"  {d}: {c} shops ({100*c/len(results):.1f}%)", file=sys.stderr)

    # JSON dump
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with OUT_JSON.open("w", encoding="utf-8") as f:
        json.dump(
            {"aggregate": aggregate, "shops": results, "dominant_distribution": dict(dom_dist)},
            f,
            ensure_ascii=False,
            indent=2,
        )
    print(f"\nJSON written: {OUT_JSON.relative_to(ROOT)}", file=sys.stderr)

    # Markdown report
    write_markdown_report(aggregate, results, dom_dist)
    print(f"Markdown written: {OUT_MD.relative_to(ROOT)}", file=sys.stderr)


def write_markdown_report(
    aggregate: dict, results: list[dict], dom_dist: Counter
) -> None:
    """Markdown report высокоуровневых findings."""
    n_shops = len(results)
    sorted_results = sorted(results, key=lambda x: -x["n_decisions"])

    # Веса для iter#2: пропорционально aggregate проценту, нормированы.
    # «random» отбрасываем — это noise. Берём 4 metrics, normalize sum=100.
    raw = {
        "zone_affinity": aggregate["top_zone_pct"],
        "work_type_affinity": aggregate["top_wtype_pct"],
        "balance_load": aggregate["lowest_load_pct"],
        "rank_seniority": aggregate["top_rank_pct"],
    }
    s = sum(raw.values())
    weights = {k: round(100 * v / s, 1) if s > 0 else 0 for k, v in raw.items()}

    lines = []
    lines.append("# Per-Store Distribution Patterns — Backtest Findings\n")
    lines.append(f"Source: 4 LAMA snapshots (`.lama_snapshots/2026-05-07..10.json`).  ")
    lines.append(f"Анализ: для каждого `task → responsible_id` из реальной истории")
    lines.append(f"оцениваем — какая metric лучше предсказывает выбор директора.\n")
    lines.append("## Aggregate (по всем магазинам, weighted by n_decisions)\n")
    lines.append(f"- Shops с tasks в ≥{MIN_DAYS} днях: **{n_shops}**")
    lines.append(f"- Total decisions: **{aggregate['n_decisions']}**\n")
    lines.append("| Metric | Match rate | Что значит |")
    lines.append("|---|---|---|")
    lines.append(f"| zone_affinity | **{aggregate['top_zone_pct']}%** | chosen — top по past-task-count в этой zone |")
    lines.append(f"| work_type_affinity | **{aggregate['top_wtype_pct']}%** | chosen — top по past-task-count по work_type |")
    lines.append(f"| lowest_load | **{aggregate['lowest_load_pct']}%** | chosen — наименее загруженный на момент |")
    lines.append(f"| top_rank | **{aggregate['top_rank_pct']}%** | chosen — высший разряд/seniority |")
    lines.append(f"| is_admin | **{aggregate['is_admin_pct']}%** | chosen — Administrator role |")
    lines.append(f"| random | **{aggregate['random_pct']}%** | никакая metric не объясняет |\n")
    lines.append("## Dominant pattern по магазинам\n")
    for d, c in dom_dist.most_common():
        lines.append(f"- **{d}**: {c} магазинов ({100*c/n_shops:.1f}%)")
    lines.append("")

    lines.append("## Top-25 магазинов (by n_decisions)\n")
    lines.append("| shop | name | days | dec | zone% | wt% | load% | rank% | admin% | dominant |")
    lines.append("|---|---|---|---|---|---|---|---|---|---|")
    for r in sorted_results[:25]:
        name_short = (r["shop_name"][:30] + "…") if len(r["shop_name"]) > 30 else r["shop_name"]
        lines.append(
            f"| {r['shop_code']} | {name_short} | {r['n_days']} | {r['n_decisions']} | "
            f"{r['top_zone_pct']}% | {r['top_wtype_pct']}% | {r['lowest_load_pct']}% | "
            f"{r['top_rank_pct']}% | {r['is_admin_pct']}% | **{r['dominant']}** |"
        )
    lines.append("")

    lines.append("## Findings\n")
    # Auto-derived findings
    domsorted = sorted(raw.items(), key=lambda x: -x[1])
    top_metric, top_pct = domsorted[0]
    second_metric, second_pct = domsorted[1]
    lines.append(f"1. **{top_metric}** доминирует ({top_pct}%) — это primary signal: "
                 f"директор предпочитает сотрудника с наибольшим past-experience по этой metric.")
    lines.append(f"2. **{second_metric}** — secondary ({second_pct}%). Часто confounded с первым "
                 f"(zone и work_type сильно коррелируют — кто часто выкладывает Бакалею знает Выкладку).")
    lines.append(f"3. **rank/seniority** — {raw['rank_seniority']}% — {'значимый сигнал' if raw['rank_seniority'] > 25 else 'слабый сигнал отдельно'}.")
    if aggregate["is_admin_pct"] > 30:
        lines.append(f"4. **Administrators** часто берут на себя задачи ({aggregate['is_admin_pct']}%) — "
                     f"возможно нужен бонус роли в scoring.")
    lines.append(f"5. **balance** ({aggregate['lowest_load_pct']}%) — {'значимый отрицательный signal' if aggregate['lowest_load_pct'] < 25 else 'умеренный'}: "
                 f"директор НЕ балансирует загрузку первым приоритетом — концентрирует работу.\n")

    lines.append("## Предложение для iter#2 (scoring weights)\n")
    lines.append(f"Пропорционально aggregate match rates, нормировано к 100%:\n")
    lines.append("```")
    for k, w in weights.items():
        lines.append(f"  {k:25s}: {w:5}%")
    lines.append("```\n")
    lines.append(
        "Эти weights — отправная точка. На практике иter#2 сначала фильтрует по "
        "constraint'ам (зона/work_type whitelist), потом применяет weighted score:\n"
    )
    lines.append("```")
    lines.append("score(emp, task) = ")
    lines.append(f"    {weights['zone_affinity']/100:.2f} * zone_affinity_norm(emp, task.zone)")
    lines.append(f"  + {weights['work_type_affinity']/100:.2f} * work_type_affinity_norm(emp, task.wtype)")
    lines.append(f"  + {weights['balance_load']/100:.2f} * (1 - load_norm(emp))")
    lines.append(f"  + {weights['rank_seniority']/100:.2f} * rank_norm(emp)")
    lines.append("```\n")
    lines.append(
        "`*_norm` — minmax-normalization среди eligible candidates для этого task. "
        "`load_norm` инвертирован (low load = high score), но weight `{:.2f}` "
        "минимален — балансировка не доминирует, как реальность показывает.\n".format(
            weights["balance_load"] / 100
        )
    )
    lines.append("## Что ещё проверить в iter#3\n")
    lines.append("- Position_role bonus (Administrator-роли подхватывают «менеджерские операции» — explicit weight)")
    lines.append("- Zone-stickiness: тот кто выкладывал Фреш 1 в день N часто выкладывает её и в день N+1 → boost recent-history")
    lines.append("- Магазины разные: shop_code-specific weights (на основе per-store dominant column из таблицы выше)")

    OUT_MD.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
