# ADR: Эволюция интеграции с LAMA — от REST к webhook + REST fallback

**Дата:** 2026-03-19
**Режим:** FULL
**Owner:** Pavel Karpychev
**Review trigger:** появление второго внешнего источника задач/смен (помимо LAMA), либо переход LAMA на собственную событийную шину (Kafka/RabbitMQ); рост нагрузки, при которой ежедневный батч в 6:00 перестанет укладываться в окно.

## Контекст

Интеграция с LAMA развивалась тремя итерациями.

**Итерация 1 (2026-02-18, lazy REST).** Появилось первое внешнее API — LAMA. Реализован `shared/lama_client.py` (httpx + кэш `UserLamaCache` TTL 1 час) и LAMA-поля в моделях `User`, `Assignment`, `ShiftPlan`, `Task`. Синхронизация — лениво при `GET /me`, `GET /shifts/current`, `GET /tasks/list`. State transitions задач отправляли статусы обратно в LAMA через `POST /set_task_status`. Минусы: данные подтягивались только когда пользователь открыл экран, менеджер не видел чужих задач, а каждый запрос рисковал упереться в timeout LAMA.

**Итерация 2 (2026-03-12, ежедневный батч).** Добавлен `DailySyncService` в svc_tasks и n8n cron `lama_daily_sync.json` на 6:00. Один HTTP-вызов `POST /tasks/internal/sync-daily` идёт по всем магазинам (`asyncio.Semaphore(10)`), внутри по всем assignments (`Semaphore(20)`) синхронизирует смены и задачи. Появился `GET /employee/?shop_code=X` и preloaded-пользователи без SSO. Покрыло холодный старт дня, но изменения LAMA в течение дня по-прежнему ждали следующего утра.

**Итерация 3 (2026-03-19, webhook).** Публичный `GET /tasks/webhook/lama?shift_id=X&secret=...`: LAMA дёргает его при изменении задач смены, WFM немедленно вызывает `GET /tasks/?shift_id=X` и делает upsert. user_id берётся из существующих задач смены (`assignee_id`) либо через `svc_users /internal/store-assignments-by-assignment`.

## Решение

Финальный паттерн — **webhook от LAMA как основной канал доставки изменений + REST как fallback** (lazy sync при открытии экрана + ежедневный батч в 6:00), потому что webhook закрывает «здесь и сейчас», утренний батч — холодный старт и пропущенные webhook'и, lazy sync — крайний рубеж для случая, когда оба предыдущих не сработали.

## Альтернативы

- **Только polling без webhook (увеличить частоту cron до раз в 5 минут):** отвергнуто — нагрузка на LAMA × количество магазинов растёт линейно, а большинство опросов вернут «без изменений»; задержка 5 минут всё равно ощутима для менеджера.
- **Только webhook без батча:** отвергнуто — нет холодного старта (что синхронизировать утром, если webhook ещё не сработал), нет recovery после простоя нашей стороны или потерянной доставки.
- **Запрос данных LAMA на каждый client request без кэша:** отвергнуто уже в итерации 1 — `/me` и `/tasks/list` стали бы зависеть от latency LAMA на каждое касание экрана.
- **Push от LAMA с полным телом задачи (а не только `shift_id`):** отвергнуто — LAMA как контракт-источник остаётся authoritative, проще делать обратный pull одной и той же ручкой `GET /tasks/?shift_id=X`, чем поддерживать два формата задачи (push-формат и pull-формат).

## Экономическое/архитектурное обоснование

- Три механизма закрывают три разных сценария: webhook → реактивность, cron → детерминированный baseline, lazy → отказоустойчивость. Удаление любого из них оставляет дыру.
- `shared/lama_client.py` единый для всех сервисов и использует один маппинг статусов (`LAMA_TO_WFM_STATUS` / `WFM_TO_LAMA_STATUS`) — добавление нового места синхронизации стоит ~десяток строк.
- `LAMA_API_ENABLED=false` отключает интеграцию полностью без правок кода — позволяет работать партнёрам без LAMA и поднимать систему локально без зависимости от внешнего API.
- Webhook-ручка триггерит ту же `TaskLamaService.sync_tasks(shift_id)`, что и cron — единая точка upsert, без дублирования логики.

## Принятые риски

- **Зависимость от стабильности webhook-доставки.** LAMA может не дозвониться (network, наш downtime) — мы получим окно неактуальных задач до утреннего батча или до открытия задачи менеджером.
- **Дублирование событий.** Webhook может прийти несколько раз для одного `shift_id`; защита — upsert по `external_id` в `TaskLamaService`, но идемпотентность проверена не на всех граничных случаях (например, статус задачи поменялся между двумя webhook'ами).
- **Гонка webhook ↔ cron ↔ lazy sync.** Все три могут одновременно делать upsert одной и той же задачи; защищаемся транзакцией upsert по `external_id`, но при больших объёмах потенциально возможны deadlock'и.
- **Опциональный секрет webhook'а.** Если `LAMA_WEBHOOK_SECRET` пустой — endpoint открыт; компромисс ради низкого трения интеграции.
- **state transition pushes back в LAMA в той же транзакции.** Падение LAMA не должно ломать локальный переход; обёрнуто в try/except и логируется warning, но без retry-очереди.

## Future hook

- `webhook.py` принимает `shift_id` — при необходимости можно расширить до `task_id` / `employee_id` без изменения cron- и lazy-веток, поскольку обе ветки уже умеют ресинкать по любому из этих ключей.
- Маппинг статусов вынесен в `shared/lama_client.py` константой — добавление нового статуса (например, `Cancelled`) не трогает сервисы.
- `partner_id` в `shifts_plan`, добавленный в ADR `partner_lama_isolation`, изначально предполагает, что webhook/cron/lazy паттерн будет повторён для второго партнёра без слияния потоков.
- Очередь retry для outgoing `set_task_status` намеренно не заложена — будет добавлена, когда появится первый инцидент с потерей статуса.

## Связанные документы

- Планы: `.memory_bank/completed_plans/lama_api_integration.md`, `.memory_bank/completed_plans/lama_daily_sync.md`, `.memory_bank/completed_plans/lama_webhook.md`
- Контракт LAMA: `.memory_bank/backend/apis/external/api_lama.md`
- API: `.memory_bank/backend/apis/api_tasks.md` (секция webhook), `.memory_bank/backend/apis/api_shifts.md`
- Сервисы: `.memory_bank/backend/services/svc_tasks.md`, `.memory_bank/backend/services/svc_users.md`, `.memory_bank/backend/services/svc_shifts.md`
- Реализация: `backend/shared/lama_client.py`, `backend/svc_tasks/app/services/daily_sync_service.py`, `backend/svc_tasks/app/api/webhook.py`, `backend/n8n/lama_daily_sync.json`
- Связанный ADR: `.memory_bank/completed_plans/decisions/2026-04-07_partner_lama_isolation.md`
