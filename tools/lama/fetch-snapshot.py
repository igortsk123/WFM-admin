"""LAMA snapshot fetcher — sequential pull всех 21 магазина с rate-limit.

Сохраняет snapshot в .lama_snapshots/{YYYY-MM-DD}.json. Каждый snapshot —
полные employees + tasks на этот день. Накапливаем — потом lama-stats.py
агрегирует медианы по всей истории.

Использование:
    python tools/lama/fetch-snapshot.py
    python tools/lama/fetch-snapshot.py --shop-codes 0001,0002

Rate-limit: 2 сек между запросами /employee/, 1.5 сек между /shift/ /tasks/.
LAMA блокирует за parallel burst, sequential ОК.
Полный fetch ~5-10 мин на 21 магазин.
"""
import argparse, urllib.request, json, sys, io, time
from datetime import datetime, timezone
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE = "https://wfm-smart.lama70.ru/api"
ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_DIR = ROOT / ".lama_snapshots"
SNAPSHOT_DIR.mkdir(exist_ok=True)


def get(path: str, delay: float = 1.5):
    time.sleep(delay)
    try:
        req = urllib.request.Request(BASE + path)
        req.add_header("Accept", "application/json")
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception as e:
        print(f"  ERR {path}: {e}", file=sys.stderr, flush=True)
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--shop-codes", help="Comma-separated shop codes (default: 0001-0030)")
    parser.add_argument("--out", help="Output filename (default: today YYYY-MM-DD.json)")
    args = parser.parse_args()

    if args.shop_codes:
        codes = args.shop_codes.split(",")
    else:
        codes = [f"{n:04d}" for n in range(1, 31)]

    out_name = args.out or f"{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.json"
    out_path = SNAPSHOT_DIR / out_name

    print(f"Fetching {len(codes)} shops → {out_path.name}", file=sys.stderr, flush=True)

    shops = []
    employees = []
    tasks = []

    for code in codes:
        emps = get(f"/employee/?shop_code={code}", delay=2.0)
        if not isinstance(emps, list) or len(emps) == 0:
            continue
        first_emp = emps[0]
        first_pos = (first_emp.get("positions") or [{}])[0]
        shop_name = first_pos.get("shop_name", "?")
        shops.append(code)
        print(f"  {code}: {shop_name} ({len(emps)} emps)", file=sys.stderr, flush=True)

        for e in emps:
            for pos in e.get("positions", []):
                eis = pos.get("employee_in_shop_id")
                if eis is None:
                    continue
                rec = {
                    "shop_code": code,
                    "shop_name": pos.get("shop_name"),
                    "employee_id": e.get("employee_id"),
                    "name": e.get("employee_name"),
                    "eis_id": eis,
                    "position_code": pos.get("position_code"),
                    "position_name": pos.get("position_name"),
                    "position_role": pos.get("position_role", "Executor"),
                    "rank": pos.get("rank_code", "N/A"),
                }
                employees.append(rec)

                shift_data = get(f"/shift/?employee_in_shop_id={eis}", delay=1.5)
                if not isinstance(shift_data, dict) or "id" not in shift_data:
                    continue
                shift_id = shift_data["id"]

                tasks_data = get(f"/tasks/?shift_id={shift_id}", delay=1.5)
                tasks_list = tasks_data.get("result") if isinstance(tasks_data, dict) else (
                    tasks_data if isinstance(tasks_data, list) else []
                )
                if not tasks_list:
                    continue
                for t in tasks_list:
                    t["_employee_id"] = e["employee_id"]
                    t["_employee_name"] = e["employee_name"]
                    t["_shop_code"] = code
                    t["_shop_name"] = pos.get("shop_name")
                    t["_eis_id"] = eis
                    t["_shift_id"] = shift_id
                    tasks.append(t)

    snapshot = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "shops": shops,
        "employees": employees,
        "tasks": tasks,
    }

    out_path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"\nSaved: {out_path}",
        f"  shops={len(shops)} employees={len(employees)} tasks={len(tasks)}",
        sep="\n",
        file=sys.stderr,
        flush=True,
    )


if __name__ == "__main__":
    main()
