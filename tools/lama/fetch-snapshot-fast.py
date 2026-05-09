"""LAMA snapshot fetcher — concurrent within shop (per-employee parallel).

Стратегия: магазины обрабатываются последовательно (LAMA-friendly,
не выглядит как bulk-burst), но внутри одного магазина запросы
/shift/ + /tasks/ для разных employees идут параллельно через
ThreadPoolExecutor(max_workers=4). Это даёт ~3-5x ускорение (30 мин
sequential → 8-12 мин concurrent) без риска rate-limit.

Между магазинами — короткая пауза 0.5 сек (не 2 сек как в sequential)
поскольку нагрузка распределяется внутри thread-pool.

Использование:
    python tools/lama/fetch-snapshot-fast.py
    python tools/lama/fetch-snapshot-fast.py --shop-codes 0001,0002
    python tools/lama/fetch-snapshot-fast.py --limit 5
    python tools/lama/fetch-snapshot-fast.py --workers 6   # увеличить пул

Если LAMA начнёт ругаться 429 — снизь --workers до 2 или вернись на sequential
fetch-snapshot.py.
"""
import argparse
import io
import json
import sys
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

BASE = "https://wfm-smart.lama70.ru/api"
ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_DIR = ROOT / ".lama_snapshots"
SNAPSHOT_DIR.mkdir(exist_ok=True)


def get(path: str, retries: int = 1):
    """HTTP GET с минимальной retry-логикой. Без time.sleep — concurrency
    сама по себе ограничивает RPS."""
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(BASE + path)
            req.add_header("Accept", "application/json")
            with urllib.request.urlopen(req, timeout=15) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            # 404/409 — типичные «нет данных»/conflict, не ретраим
            if e.code in (404, 409):
                if attempt == 0:
                    print(f"  ERR {path}: HTTP {e.code}", file=sys.stderr, flush=True)
                return None
            # 429/5xx — попробуем повторить с backoff
            if attempt < retries:
                time.sleep(1.5)
                continue
            print(f"  ERR {path}: HTTP {e.code}", file=sys.stderr, flush=True)
            return None
        except Exception as e:
            if attempt < retries:
                time.sleep(1.5)
                continue
            print(f"  ERR {path}: {e}", file=sys.stderr, flush=True)
            return None
    return None


def fetch_active_shop_codes() -> list[str]:
    print("Fetching shop list from /shops/...", file=sys.stderr, flush=True)
    raw = get("/shops/")
    if not isinstance(raw, list):
        print("  ERR: /shops/ не вернул list, fallback на 0001-0185", file=sys.stderr)
        return [f"{n:04d}" for n in range(1, 186)]
    active = [s.get("code", "") for s in raw if s.get("is_active") and s.get("code")]
    active = [c for c in active if c != "7"]
    return sorted(set(active))


def fetch_employee_shift_and_tasks(eis: int) -> tuple[dict | None, list]:
    """Параллельно: для одного employee_in_shop_id — get /shift/ → если есть,
    get /tasks/?shift_id=. Возвращает (shift_dict, tasks_list)."""
    shift_data = get(f"/shift/?employee_in_shop_id={eis}")
    if not isinstance(shift_data, dict) or "id" not in shift_data:
        return None, []
    tasks_data = get(f"/tasks/?shift_id={shift_data['id']}")
    tasks_list = (
        tasks_data.get("result")
        if isinstance(tasks_data, dict)
        else (tasks_data if isinstance(tasks_data, list) else [])
    )
    return shift_data, tasks_list or []


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--shop-codes", help="Comma-separated shop codes")
    parser.add_argument("--limit", type=int, help="Ограничить число магазинов")
    parser.add_argument("--workers", type=int, default=4, help="Параллельных запросов внутри магазина (default 4)")
    parser.add_argument("--out", help="Output filename")
    args = parser.parse_args()

    if args.shop_codes:
        codes = args.shop_codes.split(",")
    else:
        codes = fetch_active_shop_codes()
    if args.limit:
        codes = codes[: args.limit]

    out_name = args.out or f"{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.json"
    out_path = SNAPSHOT_DIR / out_name

    print(
        f"Fetching {len(codes)} shops → {out_path.name} (workers={args.workers})",
        file=sys.stderr,
        flush=True,
    )

    shops = []
    employees_records = []
    tasks = []
    t0 = time.time()

    for idx, code in enumerate(codes, start=1):
        # /employee/ — single call per shop (sequential)
        emps = get(f"/employee/?shop_code={code}")
        if not isinstance(emps, list) or len(emps) == 0:
            continue
        first_pos = (emps[0].get("positions") or [{}])[0]
        shop_name = first_pos.get("shop_name", "?")
        shops.append(code)

        # Собираем все employee_in_shop_id для этого магазина
        # (один employee может иметь несколько positions = несколько eis_id)
        shop_eis_jobs: list[tuple[dict, dict]] = []  # (employee_obj, position_obj)
        for e in emps:
            for pos in e.get("positions", []):
                if pos.get("employee_in_shop_id") is not None:
                    shop_eis_jobs.append((e, pos))

        # Параллельный fetch /shift/ + /tasks/ для каждого eis в этом магазине
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            futures = {
                ex.submit(fetch_employee_shift_and_tasks, pos["employee_in_shop_id"]):
                (e, pos)
                for (e, pos) in shop_eis_jobs
            }

            for fut in futures:
                e, pos = futures[fut]
                eis = pos["employee_in_shop_id"]
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
                employees_records.append(rec)

                shift_data, tasks_list = fut.result()
                if not shift_data or not tasks_list:
                    continue
                for t in tasks_list:
                    t["_employee_id"] = e["employee_id"]
                    t["_employee_name"] = e["employee_name"]
                    t["_shop_code"] = code
                    t["_shop_name"] = pos.get("shop_name")
                    t["_eis_id"] = eis
                    t["_shift_id"] = shift_data["id"]
                    tasks.append(t)

        elapsed = time.time() - t0
        print(
            f"  [{idx}/{len(codes)}] {code}: {shop_name} "
            f"({len(emps)} emps, {len(shop_eis_jobs)} positions) — "
            f"elapsed {elapsed:.0f}s",
            file=sys.stderr,
            flush=True,
        )

        # Короткая пауза между магазинами (не parallel batch)
        time.sleep(0.5)

    snapshot = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "shops": shops,
        "employees": employees_records,
        "tasks": tasks,
    }
    out_path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")

    elapsed = time.time() - t0
    print(
        f"\nSaved: {out_path}",
        f"  shops={len(shops)} employees={len(employees_records)} tasks={len(tasks)}",
        f"  elapsed {elapsed:.0f}s ({elapsed / 60:.1f} мин)",
        sep="\n",
        file=sys.stderr,
        flush=True,
    )


if __name__ == "__main__":
    main()
