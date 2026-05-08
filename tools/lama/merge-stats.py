"""LAMA stats aggregator — объединяет ВСЕ snapshots в .lama_snapshots/
и считает медианы minutes per shop по парам (work_type, zone).

Используется чтобы пересчитать fallback-блоки (lib/api/distribution.ts:
generateDefaultBlocksForStore TEMPLATE) на основе расширенного датасета.

Использование:
    python tools/lama/merge-stats.py

Выводит топ-20 пар + сохраняет .lama_snapshots/_merged-stats.json.
"""
import json, sys, io, statistics
from collections import defaultdict
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_DIR = ROOT / ".lama_snapshots"

snaps = sorted(SNAPSHOT_DIR.glob("*.json"))
snaps = [p for p in snaps if not p.name.startswith("_")]
if not snaps:
    print("No snapshots found in .lama_snapshots/. Run fetch-snapshot.py first.", file=sys.stderr)
    sys.exit(1)

print(f"Loading {len(snaps)} snapshots...", file=sys.stderr)

# Per snapshot: shop -> (wt, zone) -> total_minutes
all_observations = defaultdict(list)  # (wt, zone) -> list of (snapshot_date, shop_code, minutes)

for path in snaps:
    snap_date = path.stem
    snap = json.loads(path.read_text(encoding="utf-8"))
    shop_totals = defaultdict(lambda: defaultdict(int))
    for t in snap.get("tasks", []):
        sc = t.get("_shop_code")
        wt = t.get("operation_work")
        zone = t.get("operation_zone")
        if not (sc and wt and zone):
            continue
        shop_totals[sc][(wt, zone)] += t.get("duration", 0) // 60

    for sc, totals in shop_totals.items():
        for (wt, zone), minutes in totals.items():
            all_observations[(wt, zone)].append((snap_date, sc, minutes))

# Aggregate
merged = {}
for (wt, zone), obs in sorted(all_observations.items()):
    minutes_list = [m for _, _, m in obs if m > 0]
    if not minutes_list:
        continue
    merged[(wt, zone)] = {
        "median": int(statistics.median(minutes_list)),
        "mean": int(statistics.mean(minutes_list)),
        "min": min(minutes_list),
        "max": max(minutes_list),
        "samples": len(minutes_list),
        "shops": len(set(s for _, s, _ in obs)),
        "snapshots": len(set(d for d, _, _ in obs)),
    }

# Save merged
out_path = SNAPSHOT_DIR / "_merged-stats.json"
out_path.write_text(
    json.dumps(
        {f"{k[0]}|{k[1]}": v for k, v in merged.items()},
        ensure_ascii=False,
        indent=2,
    ),
    encoding="utf-8",
)
print(f"\nWrote {out_path.name} ({len(merged)} pairs)", file=sys.stderr)
print(f"\n{'work_type':<22} | {'zone':<25} | {'samples':>7} | {'shops':>5} | {'median':>6} | {'mean':>5}")
print("-" * 90)
for (wt, zone), v in sorted(merged.items(), key=lambda x: -x[1]["median"]):
    print(f"  {wt[:22]:<22} | {zone[:25]:<25} | {v['samples']:>7} | {v['shops']:>5} | {v['median']:>6} | {v['mean']:>5}")
