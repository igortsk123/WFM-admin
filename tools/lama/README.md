# LAMA snapshot tools

Ежедневный забор данных из live LAMA API (`https://wfm-smart.lama70.ru/api`)
для генерации mock-данных фронта (задачи, зоны, типы работ, медианы).

## Поток данных (источник правды)

```
LAMA API ──fetch──▶ JSON snapshot ──regenerate──▶ TS mocks ──git push──▶ репо
                       (server)                    (in repo)
```

**Где что лежит:**

| Артефакт | Путь | В git? | Назначение |
|---|---|---|---|
| Полный JSON snapshot дня | `/opt/wfm-admin/.lama_snapshots/{YYYY-MM-DD}.json` (server) | ❌ нет | Сырые данные LAMA. ~1.5 МБ × 365 = слишком жирно для гита, копится локально |
| `_lama-unassigned-blocks.ts` | `lib/mock-data/` | ✅ да | Главный мок: список нераспределённых задач для UI распределения |
| `_lama-employee-zones.ts` | `lib/mock-data/` | ✅ да | Привязка сотрудник → зоны магазина |
| `_lama-employee-work-types.ts` | `lib/mock-data/` | ✅ да | Привязка сотрудник → разрешённые типы работ |
| `_lama-fallback-medians.ts` | `lib/mock-data/` | ✅ да | Медианы (work_type, zone) → длительность для генерации блоков на магазинах без данных |
| Лог всех запусков | `/var/log/lama-fetch.log` (server) | ❌ нет | История START/PUSHED/NO CHANGES |
| Полная история снапшотов | `/opt/wfm-admin/.lama_snapshots/` (server) | ❌ нет | Если нужно перепрогнать regenerate с новой логикой |

## Cron

```cron
0 22 * * * /opt/wfm-admin/tools/lama/cron-daily.sh
```

22:00 UTC = **5:00 утра Tomsk** (UTC+7) = время когда LAMA уже опубликовала
план дня, а магазины ещё не открылись (рабочий день в FMCG начинается с 8-9).

`cron-daily.sh` (versioned копия в `tools/lama/cron-daily.sh`):
1. `git pull origin main` — синк с remote
2. `python3 tools/lama/fetch-snapshot-async.py --concurrency 3` — забор всех активных магазинов
3. `python3 tools/lama/regenerate-from-snapshots.py` — пересчёт TS-моков из накопленной истории
4. `git add lib/mock-data/_lama-*.ts` (только TS, JSON не коммитим)
5. Если diff не пустой → `git commit && git push origin main` через deploy key 150919456
6. END с маркером времени в логе

Полный проход: ~55 минут на 132 магазина (бенчмарк 2026-05-09).

## Скрипты

| Файл | Что делает | Когда использовать |
|---|---|---|
| `fetch-snapshot-async.py` | Production fetcher: httpx + `asyncio.Semaphore(3)` per shop, sequential per shop. Копия [backend моб v2](../../wfm-develop%20mobile%2007.05.2026/wfm/backend/svc_tasks/app/services/daily_sync_service.py). | **По умолчанию.** Запускается cron'ом. |
| `fetch-snapshot.py` | Старый sequential (`urllib`, без параллели). 30+ мин на полный проход. | Deprecated. Только если async лажает. |
| `fetch-snapshot-fast.py` | `ThreadPoolExecutor(workers=4)` per shop. Был промежуточный вариант. | Не использовать — async быстрее (нет GIL для I/O) |
| `regenerate-from-snapshots.py` | Читает все `.lama_snapshots/*.json`, агрегирует, пишет 4 TS-мока в `lib/mock-data/`. | Запускается cron'ом после fetch. Можно запустить вручную для re-gen без нового fetch. |
| `merge-stats.py` | Пересчёт медиан по всему датасету для `_lama-fallback-medians.ts`. | Используется внутри `regenerate-from-snapshots.py`. |
| `cron-daily.sh` | Обёртка для cron'а. Versioned копия server-side скрипта. | Только на сервере по абсолютному пути `/opt/wfm-admin/tools/lama/cron-daily.sh` |

## Ручной запуск (на сервере или локально)

```bash
# Полный проход всех активных магазинов
python tools/lama/fetch-snapshot-async.py

# Только конкретные магазины (для теста)
python tools/lama/fetch-snapshot-async.py --shop-codes 0001,0002 --limit 5

# С другой concurrency (default 3, как у backend моб)
python tools/lama/fetch-snapshot-async.py --concurrency 5

# Регенерировать TS-моки из накопленных снапшотов (без нового fetch)
python tools/lama/regenerate-from-snapshots.py
```

## Endpoint'ы LAMA, которые мы дёргаем

- `GET /shops/` — список магазинов (один вызов в начале для resolve активных)
- `GET /employee/?shop_code=X` — сотрудники магазина (один вызов на магазин)
- `GET /shift/?employee_in_shop_id=X` — смена сегодня (один вызов на каждого сотрудника, **без date param** — LAMA сама понимает «сегодня»)
- `GET /tasks/?shift_id=X` — задачи смены (один вызов на каждую найденную смену)

Batch endpoint'ов нет, `with_shifts=true` параметр LAMA игнорирует — потому такая
архитектура с миллионом мелких запросов через `Semaphore(3)`.

## Что делать если cron сломался

```bash
ssh root@193.160.208.41
tail -100 /var/log/lama-fetch.log    # смотрим ошибку
ps aux | grep fetch-snapshot          # убедиться нет зависшего процесса
bash /opt/wfm-admin/tools/lama/cron-daily.sh  # руками запустить
```

Если LAMA отдаёт массово 429 (rate-limit) — снизить `--concurrency` с 3 до 2 в `cron-daily.sh`.

## История эволюции

- 2026-05-07: ручной sequential fetcher, 30+ мин на проход, запускался по запросу
- 2026-05-08: ThreadPool variant (`fetch-snapshot-fast.py`), не сильно быстрее
- 2026-05-09: async fetcher по backend моб v2 паттерну, cron на 22:00 UTC, autocommit/push
