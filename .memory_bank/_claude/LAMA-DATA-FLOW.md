# LAMA data flow — где живут данные

> Carte для admin frontend: какие mock-данные приходят из live LAMA API,
> где они лежат, как обновляются, что в гите а что нет.

## Краткая схема

```
LAMA API ──fetch──▶ JSON snapshot ──regenerate──▶ TS mocks ──autocommit──▶ репо
22:00 UTC daily    (server only)                   (in git)              (main + push)
```

## Что в гите, что не в гите

| Артефакт | Путь | В git? |
|---|---|---|
| Полный JSON snapshot дня | `/opt/wfm-admin/.lama_snapshots/{YYYY-MM-DD}.json` | ❌ только на сервере |
| `_lama-unassigned-blocks.ts` (главный, ~400 KB) | `lib/mock-data/` | ✅ в git |
| `_lama-employee-zones.ts` | `lib/mock-data/` | ✅ в git |
| `_lama-employee-work-types.ts` | `lib/mock-data/` | ✅ в git |
| `_lama-fallback-medians.ts` | `lib/mock-data/` | ✅ в git |
| Лог запусков | `/var/log/lama-fetch.log` (server) | ❌ только на сервере |

**Почему JSON-снапшоты не в гите:** ~1.5 МБ × 365 = >500 МБ мусора в год, при том что
TS-моки уже несут всё что нужно фронту. JSON остаётся на сервере для возможности перепрогнать
`regenerate-from-snapshots.py` с новой логикой.

## Cron на сервере

```cron
0 22 * * * /opt/wfm-admin/tools/lama/cron-daily.sh
```

22:00 UTC = **5:00 утра по Tomsk** (UTC+7) — после публикации плана дня в LAMA, до открытия магазинов.

`cron-daily.sh` (versioned копия в репо `tools/lama/cron-daily.sh`):
1. `git pull origin main`
2. `python3 tools/lama/fetch-snapshot-async.py --concurrency 3` — забор всех активных магазинов
3. `python3 tools/lama/regenerate-from-snapshots.py` — пересчёт TS из накопленной истории снапшотов
4. `git add lib/mock-data/_lama-*.ts` (только TS, JSON не трогаем)
5. Если diff не пустой → `git commit && git push origin main` через deploy key 150919456
6. END с маркером времени

Полный проход: ~55 минут на 132 магазина (бенч 2026-05-09).

Auto-commit формат: `chore(lama): daily snapshot {date} — {N} blocks / {M} stores (auto)`

## Как пересоздать TS-моки локально (без нового fetch)

Не получится — снапшоты лежат на сервере, локально их нет. Вариант:
```bash
ssh root@193.160.208.41
cd /opt/wfm-admin
python3 tools/lama/regenerate-from-snapshots.py
git add lib/mock-data/_lama-*.ts && git commit && git push
```

## Как сделать ручной полный fetch

```bash
ssh root@193.160.208.41
nohup bash /opt/wfm-admin/tools/lama/cron-daily.sh > /tmp/lama-manual.out 2>&1 &
tail -f /var/log/lama-fetch.log
```

Завершится сообщением `=== ... END ===` через ~55 минут.

## Скрипты (`tools/lama/`)

| Файл | Что делает |
|---|---|
| `fetch-snapshot-async.py` | **Production fetcher.** httpx + `asyncio.Semaphore(3)` per shop, sequential per shop. Копия [backend моб v2 паттерна](../../wfm-develop%20mobile%2007.05.2026/wfm/backend/svc_tasks/app/services/daily_sync_service.py) `sync_store()`. |
| `fetch-snapshot.py` | Старый sequential urllib. Deprecated. |
| `fetch-snapshot-fast.py` | ThreadPool. Медленнее async (GIL). Не использовать. |
| `regenerate-from-snapshots.py` | Читает все `.lama_snapshots/*.json`, агрегирует, пишет 4 TS-мока. |
| `merge-stats.py` | Пересчёт медиан (используется внутри `regenerate-from-snapshots.py`). |
| `cron-daily.sh` | Обёртка cron'а (versioned копия server-side). |

## Endpoint'ы LAMA

- `GET /shops/` — список магазинов (1 вызов в начале)
- `GET /employee/?shop_code=X` — сотрудники (1 вызов на магазин)
- `GET /shift/?employee_in_shop_id=X` — смена сегодня (без date — LAMA сама понимает «сегодня»)
- `GET /tasks/?shift_id=X` — задачи смены

Batch endpoint'ов нет, `with_shifts=true` LAMA игнорирует.

## Сервер

`root@193.160.208.41` через `~/.ssh/config`. Deploy key 150919456 для git push.

См. [tools/lama/README.md](../../tools/lama/README.md) — полный справочник по скриптам и trouble-shooting.
