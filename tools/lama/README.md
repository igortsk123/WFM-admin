# LAMA snapshot tools

Накопление исторических данных задач из live LAMA API
(`https://wfm-smart.lama70.ru/api`). Используется для пересчёта
fallback-блоков на /tasks/distribute и улучшения медиан.

## Почему snapshot'ы

LAMA API не отдаёт историю — только tasks за сегодня (через
`GET /tasks/?shift_id=N` для каждой активной смены). История tasks
endpoint'ов нет (404 на `/tasks/history/`, `/reports/tasks/` и т.п.).

Решение: ежедневно запускать fetch вручную, накапливать snapshot'ы
в `.lama_snapshots/{YYYY-MM-DD}.json`, потом агрегировать статистику
по всему датасету.

## Использование

```bash
# Дёрнуть свежие данные (5-10 мин на 21 магазин из-за rate-limit)
python tools/lama/fetch-snapshot.py

# Только конкретные магазины (для теста или dry-run)
python tools/lama/fetch-snapshot.py --shop-codes 0001,0002

# Пересчитать медианы по всем накопленным snapshot'ам
python tools/lama/merge-stats.py
```

## Что делать со статистикой

После `merge-stats.py` появится `.lama_snapshots/_merged-stats.json` с
парами `(work_type, zone) → {median, mean, min, max, samples, shops, snapshots}`.

Эти медианы можно вставить в `lib/api/distribution.ts` функцию
`generateDefaultBlocksForStore` — обновляет дефолтные блоки для магазинов
без LAMA-данных более точными числами по большой выборке.

## Где лежат snapshot'ы

`.lama_snapshots/` — в .gitignore (через `.tmp_*` не подходит, добавим явно).
Не коммитятся — это live-данные клиента, могут быть чувствительными.
Локально хранятся столько, сколько нужно для подсчёта медиан.

## Когда дёргать

Раз в неделю-две вручную пока mockуемся. Когда mobile-backend
дотянет endpoint `/tasks/unassigned-blocks/sync` (см. MIGRATION-NOTES.md) —
LAMA будет лить блоки прямо в backend через n8n, snapshot'ы перестанут
быть нужны.
