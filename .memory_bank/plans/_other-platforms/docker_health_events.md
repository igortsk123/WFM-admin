# План: Docker health_status события в мониторинге

**Статус:** В работе
**Создан:** 2026-04-24
**Последнее обновление:** 2026-04-24

## Цель

Расширить `docker_events.py` — помимо жизненного цикла контейнера (`start`, `stop`, `die`, `restart`) отслеживать события **здоровья контейнера** (`health_status`).

В Docker health-событие выглядит так:
- `Action` = `"health_status: healthy"` | `"health_status: unhealthy"` | `"health_status: starting"`
- Значение статуса (`healthy`/`unhealthy`) встроено прямо в строку `Action` после `": "`, **не** в атрибутах

**Важно:** реальный формат `"health_status: healthy"` (через двоеточие), а не просто `"health_status"`. Поэтому нужно парсить `action.split(": ", 1)`, а не читать атрибуты.

## Задачи

- [x] Добавить `"health_status"` в `TRACKED_ACTIONS` — выполнено 2026-04-24
- [x] В ветке обработки события: если `base_action == "health_status"` — извлечь статус из строки `action.split(": ", 1)[1]` и добавить в `props["health_status"]` — исправлено 2026-04-24
- [x] Убедиться, что `exit_code` добавляется только для `"die"` (уже так, ничего не ломаем) — подтверждено 2026-04-24
- [x] Обновить `.memory_bank/analytics/server_events.md` — выполнено 2026-04-24
- [ ] Вручную проверить событие: добавить HEALTHCHECK в один из сервисов docker-compose и убедиться, что событие трекается в Semetrics

## Детали реализации

Файл: `backend/svc_monitoring/app/docker_events.py`

Изменения:
1. `TRACKED_ACTIONS` расширить до `{"start", "stop", "die", "restart", "health_status"}`
2. Парсить `base_action = action.split(":")[0].strip()` — Docker отправляет `"health_status: healthy"`, а не просто `"health_status"`
3. Для health_status: статус берётся из строки action, а не из атрибутов:
   ```python
   base_action = action.split(":")[0].strip()
   if base_action not in TRACKED_ACTIONS: continue
   ...
   if base_action == "health_status":
       parts = action.split(": ", 1)
       props["health_status"] = parts[1] if len(parts) > 1 else "unknown"
   ```

## Лог выполнения

### 2026-04-24
- Создан план после анализа `docker_events.py`
- Реализованы все кодовые изменения: `TRACKED_ACTIONS` расширен, добавлена ветка `health_status`
- Осталась ручная проверка на живом окружении (HEALTHCHECK в docker-compose)
