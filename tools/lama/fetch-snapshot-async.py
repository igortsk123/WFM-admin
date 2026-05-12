"""LAMA snapshot fetcher — asyncio + httpx по backend production pattern.

Backend mobile использует именно это в `daily_sync_service.sync_store()`
(workflow lama_daily_sync_v2):
- Магазины sequential (не Semaphore — backend откатился с агрессивной v1)
- Внутри одного shop: asyncio.Semaphore(3) для shifts+tasks параллельно
- httpx.AsyncClient с keep-alive — переиспользует TCP соединение,
  это даёт лучше perf чем threading + urllib (GIL не мешает I/O в asyncio)

Использование:
    python tools/lama/fetch-snapshot-async.py
    python tools/lama/fetch-snapshot-async.py --shop-codes 0001,0002
    python tools/lama/fetch-snapshot-async.py --limit 5
    python tools/lama/fetch-snapshot-async.py --concurrency 5  # пул внутри shop

Если LAMA начнёт ругаться 429 — снизь --concurrency до 2 или вернись на
sequential fetch-snapshot.py.

Требует httpx (apt install python3-httpx).
"""
import argparse
import asyncio
import io
import json
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

import httpx

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

BASE = "https://wfm-smart.lama70.ru/api"
ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_DIR = ROOT / ".lama_snapshots"
SNAPSHOT_DIR.mkdir(exist_ok=True)


async def get(client: httpx.AsyncClient, path: str, retries: int = 1):
    for attempt in range(retries + 1):
        try:
            r = await client.get(path, timeout=30)
            if r.status_code in (404, 409):
                if attempt == 0:
                    print(f"  ERR {path}: HTTP {r.status_code}", file=sys.stderr, flush=True)
                return None
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            if attempt < retries:
                await asyncio.sleep(1.5)
                continue
            print(f"  ERR {path}: HTTP {e.response.status_code}", file=sys.stderr, flush=True)
            return None
        except Exception as e:
            if attempt < retries:
                await asyncio.sleep(1.5)
                continue
            print(f"  ERR {path}: {e}", file=sys.stderr, flush=True)
            return None
    return None


async def fetch_active_shop_codes(client: httpx.AsyncClient) -> list[str]:
    print("Fetching shop list from /shops/...", file=sys.stderr, flush=True)
    raw = await get(client, "/shops/")
    if not isinstance(raw, list):
        print("  ERR: /shops/ не вернул list, fallback на 0001-0185", file=sys.stderr)
        return [f"{n:04d}" for n in range(1, 186)]
    active = [s.get("code", "") for s in raw if s.get("is_active") and s.get("code")]
    active = [c for c in active if c != "7"]
    return sorted(set(active))


async def fetch_shift_and_tasks(
    client: httpx.AsyncClient,
    eis: int,
    sem: asyncio.Semaphore,
) -> tuple[dict | None, list]:
    """Внутри shop concurrent: get /shift/ → если есть, get /tasks/?shift_id=."""
    async with sem:
        shift_data = await get(client, f"/shift/?employee_in_shop_id={eis}")
        if not isinstance(shift_data, dict) or "id" not in shift_data:
            return None, []
        tasks_data = await get(client, f"/tasks/?shift_id={shift_data['id']}")
        if isinstance(tasks_data, dict):
            tasks_list = tasks_data.get("result")
            tasks_list = tasks_list if isinstance(tasks_list, list) else []
        elif isinstance(tasks_data, list):
            tasks_list = tasks_data
        else:
            tasks_list = []
        return shift_data, tasks_list


async def fetch_shop(
    client: httpx.AsyncClient,
    code: str,
    concurrency: int,
) -> dict:
    """Sync один shop: employees → for each (shift, tasks) parallel."""
    emps = await get(client, f"/employee/?shop_code={code}")
    if not isinstance(emps, list) or not emps:
        return {"code": code, "shop_name": None, "employees": [], "tasks": [], "n_emps": 0}

    first_pos = (emps[0].get("positions") or [{}])[0]
    shop_name = first_pos.get("shop_name", "?")

    # Все employee_in_shop_id для этого магазина
    eis_jobs = []
    for e in emps:
        for pos in e.get("positions", []):
            if pos.get("employee_in_shop_id") is not None:
                eis_jobs.append((e, pos))

    sem = asyncio.Semaphore(concurrency)
    results = await asyncio.gather(
        *[fetch_shift_and_tasks(client, p["employee_in_shop_id"], sem) for (_, p) in eis_jobs],
        return_exceptions=True,
    )

    employees_records = []
    tasks = []
    shifts = []
    for (e, pos), result in zip(eis_jobs, results):
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

        if isinstance(result, Exception):
            continue
        shift_data, tasks_list = result
        if not shift_data:
            continue
        # Сохраняем полный shift record — нужен для алго (shift-time alignment)
        # и для понимания «кто реально на смене сегодня» с часами.
        shifts.append({
            "shift_id": shift_data["id"],
            "employee_id": e.get("employee_id"),
            "employee_name": e.get("employee_name"),
            "shop_code": code,
            "shop_name": pos.get("shop_name"),
            "eis_id": eis,
            "position_code": pos.get("position_code"),
            "position_name": pos.get("position_name"),
            "time_start": shift_data.get("time_start"),
            "time_end": shift_data.get("time_end"),
            "planned_start": shift_data.get("planned_start"),
            "planned_end": shift_data.get("planned_end"),
            "actual_start": shift_data.get("actual_start"),
            "actual_end": shift_data.get("actual_end"),
            "status": shift_data.get("status"),
            "date": shift_data.get("date"),
        })
        if not tasks_list:
            continue
        for t in tasks_list:
            t["_employee_id"] = e["employee_id"]
            t["_employee_name"] = e["employee_name"]
            t["_shop_code"] = code
            t["_shop_name"] = pos.get("shop_name")
            t["_eis_id"] = eis
            t["_shift_id"] = shift_data["id"]
            tasks.append(t)

    return {
        "code": code,
        "shop_name": shop_name,
        "employees": employees_records,
        "tasks": tasks,
        "shifts": shifts,
        "n_emps": len(emps),
    }


async def main_async(codes: list[str], concurrency: int, out_path: Path):
    shops = []
    employees_records = []
    tasks = []
    shifts = []
    t0 = time.time()

    # httpx с keep-alive (HTTP/2 если поддерживается LAMA, иначе HTTP/1.1)
    limits = httpx.Limits(max_keepalive_connections=concurrency + 2, max_connections=concurrency * 2)
    async with httpx.AsyncClient(
        base_url=BASE,
        headers={"Accept": "application/json"},
        limits=limits,
        timeout=30,
    ) as client:
        # Resolve list of codes if needed (passed empty)
        if not codes:
            codes = await fetch_active_shop_codes(client)

        print(
            f"Fetching {len(codes)} shops → {out_path.name} (concurrency={concurrency})",
            file=sys.stderr,
            flush=True,
        )

        # Sequential per shop (backend v2 pattern)
        for idx, code in enumerate(codes, start=1):
            shop_data = await fetch_shop(client, code, concurrency)
            if not shop_data["employees"]:
                continue
            shops.append(code)
            employees_records.extend(shop_data["employees"])
            tasks.extend(shop_data["tasks"])
            shifts.extend(shop_data.get("shifts", []))
            elapsed = time.time() - t0
            print(
                f"  [{idx}/{len(codes)}] {code}: {shop_data['shop_name']} "
                f"({shop_data['n_emps']} emps, {len(shop_data['employees'])} positions, "
                f"{len(shop_data['tasks'])} tasks, {len(shop_data.get('shifts', []))} shifts) "
                f"— elapsed {elapsed:.0f}s",
                file=sys.stderr,
                flush=True,
            )

    snapshot = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "shops": shops,
        "employees": employees_records,
        "tasks": tasks,
        "shifts": shifts,
    }
    out_path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")

    elapsed = time.time() - t0
    print(
        f"\nSaved: {out_path}",
        f"  shops={len(shops)} employees={len(employees_records)} tasks={len(tasks)} shifts={len(shifts)}",
        f"  elapsed {elapsed:.0f}s ({elapsed / 60:.1f} мин)",
        sep="\n",
        file=sys.stderr,
        flush=True,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--shop-codes", help="Comma-separated shop codes")
    parser.add_argument("--limit", type=int, help="Ограничить число магазинов")
    parser.add_argument(
        "--concurrency",
        type=int,
        default=3,
        help="Параллельных запросов внутри магазина (default 3, по backend production)",
    )
    parser.add_argument("--out", help="Output filename")
    args = parser.parse_args()

    codes = args.shop_codes.split(",") if args.shop_codes else []

    # MSK (UTC+3) дата — иначе cron в 01:00 MSK создаёт файл «вчера»
    # потому что в UTC ещё предыдущий день.
    msk_now = datetime.now(timezone.utc) + timedelta(hours=3)
    out_name = args.out or f"{msk_now.strftime('%Y-%m-%d')}.json"
    out_path = SNAPSHOT_DIR / out_name

    async def run():
        nonlocal codes
        if codes and args.limit:
            codes = codes[: args.limit]
        elif not codes and args.limit:
            # Resolve внутри main_async, но с limit'ом
            limits = httpx.Limits(max_keepalive_connections=2, max_connections=2)
            async with httpx.AsyncClient(
                base_url=BASE, headers={"Accept": "application/json"},
                limits=limits, timeout=30,
            ) as client:
                codes = await fetch_active_shop_codes(client)
            codes = codes[: args.limit]
        await main_async(codes, args.concurrency, out_path)

    asyncio.run(run())


if __name__ == "__main__":
    main()
