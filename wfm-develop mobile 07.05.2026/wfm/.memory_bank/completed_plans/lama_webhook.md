# План: Вебхук для LAMA — синхронизация задач по запросу

**Статус:** Выполнено
**Создан:** 2026-03-19
**Последнее обновление:** 2026-03-19

## Цель

Добавить публичный endpoint в svc_tasks, который LAMA вызывает при изменении задач смены на своей стороне. При получении запроса WFM немедленно синхронизирует задачи этой смены из LAMA API — менеджер видит актуальную картину без ожидания утренней синхронизации.

## Контекст

Утренняя синхронизация (`POST /tasks/internal/sync-daily`) работает в 6:00 и синхронизирует задачи на весь день. Но LAMA может изменить задачи в течение дня — добавить новые, изменить статус, длительность. Менеджер об этом не знает.

Решение: LAMA дёргает наш webhook `GET /tasks/webhook/lama?shift_id=61003`, WFM вызывает `GET /tasks/?shift_id=61003` у LAMA и делает upsert задач смены.

## Технические решения

**URL:** `GET /tasks/webhook/lama?shift_id={lama_shift_id}`

**Безопасность:** Опциональный query-параметр `secret`. Если в настройках задан `LAMA_WEBHOOK_SECRET` — проверяем соответствие. Если пустой — endpoint открыт. Минимальное трение для LAMA.

**Получение user_id:** Смотрим существующие задачи смены → берём `assignee_id`. Если задач нет — вызываем svc_users `GET /internal/store-assignments-by-assignment?assignment_id=X` и фильтруем по нашему `assignment_id`.

## Задачи

- [x] 1. Создать `backend/svc_tasks/app/api/webhook.py` — новый роутер с `GET /lama` — 2026-03-19
- [x] 2. Обновить `backend/svc_tasks/app/core/config.py` — добавить `LAMA_WEBHOOK_SECRET` — 2026-03-19
- [x] 3. Обновить `backend/svc_tasks/app/main.py` — подключить webhook роутер — 2026-03-19
- [x] 4. Обновить `.memory_bank/backend/apis/api_tasks.md` — секция о webhook — 2026-03-19
- [x] 5. Создать `docs/lama_webhook.md` — документация для команды LAMA — 2026-03-19

## Критические файлы

| Файл | Действие |
|------|----------|
| `backend/svc_tasks/app/api/webhook.py` | Новый |
| `backend/svc_tasks/app/core/config.py` | Изменён (LAMA_WEBHOOK_SECRET) |
| `backend/svc_tasks/app/main.py` | Изменён (подключение роутера) |
| `.memory_bank/backend/apis/api_tasks.md` | Изменён (секция webhook) |
| `docs/lama_webhook.md` | Новый (документация для LAMA) |

## Лог выполнения

### 2026-03-19
- Создан план
- Реализованы все задачи: webhook.py, config, main.py, docs, memory bank
