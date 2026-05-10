"""LAMA hourly status refresh for review queue.

Daily snapshot (fetch-snapshot-async.py) делает полный fetch shop+employees+
tasks один раз в сутки. Но менеджеру в admin нужно видеть свежие задачи
ON_REVIEW в течение дня — работники сдают завершённые задачи постоянно,
не только в 22:00 UTC.

Этот скрипт делает lightweight refresh: для всех уникальных shift_id из
сегодняшнего snapshot'а делает GET /tasks/?shift_id=X (тот же endpoint,
который daily fetch вызывает per-employee), вытаскивает новые статусы
задач, обновляет snapshot in-place. Дальше build-review-tasks.py
перегенерирует _lama-review-tasks.ts.

Ожидаемая стоимость: ~100-300 shifts × 0.5s ≈ 1-3 мин hourly.

Использование:
    python tools/lama/refresh-review-statuses.py [--snapshot YYYY-MM-DD]
"""
import argparse
import asyncio
import io
import json
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import httpx

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

BASE = "https://wfm-smart.lama70.ru/api"
ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_DIR = ROOT / ".lama_snapshots"


def latest_snapshot() -> Path:
    candidates = sorted(
        p for p in SNAPSHOT_DIR.glob("*.json") if not p.name.startswith("_")
    )
    if not candidates:
        raise FileNotFoundError(
            f"No snapshots in {SNAPSHOT_DIR} (excluding _*.json)"
        )
    return candidates[-1]


async def get(client: httpx.AsyncClient, path: str, retries: int = 1):
    for attempt in range(retries + 1):
        try:
            r = await client.get(path, timeout=30)
            if r.status_code in (404, 409):
                return None
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            if attempt < retries:
                await asyncio.sleep(1.5)
                continue
            print(
                f"  ERR {path}: HTTP {e.response.status_code}",
                file=sys.stderr,
                flush=True,
            )
            return None
        except Exception as e:
            if attempt < retries:
                await asyncio.sleep(1.5)
                continue
            print(f"  ERR {path}: {e}", file=sys.stderr, flush=True)
            return None
    return None


async def fetch_shift_tasks(
    client: httpx.AsyncClient,
    shift_id: int,
    sem: asyncio.Semaphore,
) -> list[dict]:
    async with sem:
        data = await get(client, f"/tasks/?shift_id={shift_id}")
        if isinstance(data, dict):
            tasks = data.get("result")
            return tasks if isinstance(tasks, list) else []
        if isinstance(data, list):
            return data
        return []


async def refresh(snapshot_path: Path, concurrency: int) -> dict:
    snap = json.loads(snapshot_path.read_text(encoding="utf-8-sig"))
    tasks = snap.get("tasks", [])
    if not tasks:
        print("Snapshot has no tasks; nothing to refresh.", file=sys.stderr)
        return {"changed": 0, "shifts": 0, "tasks_seen": 0}

    # task_id → existing record (mutate in-place after fetching)
    by_id: dict[int, dict] = {int(t["id"]): t for t in tasks if t.get("id") is not None}
    shift_ids = sorted({int(t["_shift_id"]) for t in tasks if t.get("_shift_id") is not None})
    print(
        f"Refreshing {len(shift_ids)} unique shifts ({len(by_id)} known tasks)",
        file=sys.stderr,
        flush=True,
    )

    t0 = time.time()
    limits = httpx.Limits(
        max_keepalive_connections=concurrency + 2,
        max_connections=concurrency * 2,
    )
    changed_count = 0
    seen_count = 0
    new_tasks: list[dict] = []
    status_before: Counter = Counter()
    status_after: Counter = Counter()

    async with httpx.AsyncClient(
        base_url=BASE,
        headers={"Accept": "application/json"},
        limits=limits,
        timeout=30,
    ) as client:
        sem = asyncio.Semaphore(concurrency)
        # Build shift_id → meta (shop_code/_employee_id) for new tasks
        shift_meta: dict[int, dict] = {}
        for t in tasks:
            sid = t.get("_shift_id")
            if sid is None:
                continue
            shift_meta.setdefault(int(sid), {
                "_shop_code": t.get("_shop_code"),
                "_shop_name": t.get("_shop_name"),
                "_employee_id": t.get("_employee_id"),
                "_employee_name": t.get("_employee_name"),
                "_eis_id": t.get("_eis_id"),
                "_shift_id": int(sid),
            })

        results = await asyncio.gather(
            *[fetch_shift_tasks(client, sid, sem) for sid in shift_ids],
            return_exceptions=True,
        )

        for sid, result in zip(shift_ids, results):
            if isinstance(result, Exception):
                print(f"  ERR shift={sid}: {result}", file=sys.stderr)
                continue
            if not result:
                continue
            for t in result:
                tid = t.get("id")
                if tid is None:
                    continue
                seen_count += 1
                tid_int = int(tid)
                new_status = t.get("status")
                meta = shift_meta.get(sid, {})

                if tid_int in by_id:
                    existing = by_id[tid_int]
                    old_status = existing.get("status")
                    status_before[old_status or "<none>"] += 1
                    status_after[new_status or "<none>"] += 1
                    if old_status != new_status:
                        changed_count += 1
                        existing["status"] = new_status
                    # Обновим динамические поля (могут поменяться).
                    for fld in ("priority", "duration", "time_start", "time_end", "operation_zone", "operation_work", "category", "allow_edit"):
                        if fld in t:
                            existing[fld] = t[fld]
                else:
                    # Новая задача — добавляем с метаданными смены
                    new_rec = dict(t)
                    new_rec["_shop_code"] = meta.get("_shop_code")
                    new_rec["_shop_name"] = meta.get("_shop_name")
                    new_rec["_employee_id"] = meta.get("_employee_id")
                    new_rec["_employee_name"] = meta.get("_employee_name")
                    new_rec["_eis_id"] = meta.get("_eis_id")
                    new_rec["_shift_id"] = sid
                    new_tasks.append(new_rec)
                    status_after[new_status or "<none>"] += 1
                    changed_count += 1

    if new_tasks:
        snap["tasks"] = list(by_id.values()) + new_tasks
    else:
        snap["tasks"] = list(by_id.values())

    snap["refreshed_at"] = datetime.now(timezone.utc).isoformat()

    snapshot_path.write_text(
        json.dumps(snap, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    elapsed = time.time() - t0
    print(
        f"Refresh done in {elapsed:.0f}s — {seen_count} tasks fetched, "
        f"{changed_count} changed (incl. {len(new_tasks)} new)",
        file=sys.stderr,
        flush=True,
    )
    print(f"  Status distribution AFTER: {dict(status_after)}", file=sys.stderr)
    return {
        "changed": changed_count,
        "shifts": len(shift_ids),
        "tasks_seen": seen_count,
        "new_tasks": len(new_tasks),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--snapshot",
        type=str,
        default=None,
        help="Snapshot date (YYYY-MM-DD). По умолчанию — самый свежий.",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=4,
        help="Параллельных запросов к LAMA /tasks/?shift_id=. Default 4.",
    )
    args = parser.parse_args()

    print("=== LAMA review-status refresh ===", file=sys.stderr)

    if args.snapshot:
        path = SNAPSHOT_DIR / f"{args.snapshot}.json"
        if not path.exists():
            print(f"ERR: snapshot not found: {path}", file=sys.stderr)
            sys.exit(1)
    else:
        try:
            path = latest_snapshot()
        except FileNotFoundError as e:
            print(f"ERR: {e}", file=sys.stderr)
            sys.exit(1)

    print(f"Snapshot: {path.name}", file=sys.stderr)
    asyncio.run(refresh(path, args.concurrency))


if __name__ == "__main__":
    main()
