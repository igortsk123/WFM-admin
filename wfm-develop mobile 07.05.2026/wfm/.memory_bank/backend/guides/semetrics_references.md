# Экспорт справочников в Semetrics

Semetrics хранит данные WFM в Semantic Layer и при ответе на запросы AI-агента
резолвит человекочитаемые сущности (магазины, сотрудники, назначения) через
CSV-справочники. Цель — не пускать PII в LLM-prompt: фильтрация имён/адресов
происходит на стороне Semetrics до отправки в модель.

WFM выгружает три файла:

| Файл | Содержит | Зачем нужен |
|------|----------|-------------|
| `users.csv` | `id, first_name, last_name, middle_name` | Резолв `events.user_id → ФИО` для UI и фильтр PII перед LLM |
| `stores.csv` | `id, name, address` | Резолв магазина по `store_id` |
| `assignments.csv` | `user_id, store_id, valid_from, valid_to, role` | Восстановление магазина пользователя на любую прошедшую дату — без него Semetrics не сможет ответить «события магазина X за период Y» (большинство событий пишут только `user_id`) |

Каталог-приёмник в Semetrics: `semantic/projects/wfm/references/`. Изменения
файлов подхватывает watchdog `svc_semantic` (см.
`backend/svc_semantic/app/services/dimension_resolver.py` в Semetrics-репо).

## Механизм

Реализовано как n8n workflow `backend/n8n/semetrics_references_csv.json`.
Подключение к БД — credential `users` (PostgreSQL `wfm_users`).

Webhook: `GET /webhook/semetrics?type={users|stores|assignments}`

- DEV: `https://dev.wfm.beyondviolet.com/webhook/semetrics?type=...`
- PROD: `https://wfm.beyondviolet.com/webhook/semetrics?type=...`

Ответ — CSV-файл с заголовком `Content-Disposition: attachment`.

Расписание: pull-модель — Semetrics-сторона забирает файлы по расписанию,
WFM-сторона **ничего не пушит**. Активация конвейера в n8n обязательна
(`active: true` в UI), JSON в репо хранится с `active: false` намеренно —
переключение на тестовом инстансе не должно ломать продовый.

## Схема `assignments.csv`

```
user_id,store_id,valid_from,valid_to,role
1,42,2025-01-01,,WORKER
1,17,2024-06-01,2024-12-31,WORKER
2,42,2025-02-15,,MANAGER
```

- `user_id` — текстовый id, совпадает с `events.user_id` и `users.csv:id`.
- `store_id` — текстовый id, совпадает со `stores.csv:id`.
- `valid_from` — `YYYY-MM-DD`. NULL в БД остаётся пустой ячейкой — историческая
  аномалия, Semetrics-сторона решит как трактовать.
- `valid_to` — `YYYY-MM-DD` или пусто (текущее активное назначение).
- `role` — `UPPER(roles.code)`, на момент 2026-05 это `WORKER` или `MANAGER`.
  Если у назначения нет position (NULL) — фоллбэчим в `WORKER` (бизнес-дефолт
  Position.role_id = 1, см. `001_create_reference_tables.py`).

### Источник в БД

```sql
SELECT
  a.user_id,
  a.store_id,
  TO_CHAR(a.date_start, 'YYYY-MM-DD') AS valid_from,
  TO_CHAR(a.date_end,   'YYYY-MM-DD') AS valid_to,
  COALESCE(UPPER(r.code), 'WORKER') AS role
FROM assignments a
LEFT JOIN positions p ON p.id = a.position_id
LEFT JOIN roles r     ON r.id = p.role_id
WHERE a.store_id IS NOT NULL
ORDER BY a.user_id, a.date_start NULLS FIRST, a.id;
```

Маппинг полей:

| Запрос Semetrics | Поле БД | Комментарий |
|------------------|---------|-------------|
| `valid_from` | `assignments.date_start` | NULL допустим |
| `valid_to` | `assignments.date_end` | NULL = активное назначение |
| `role` | `roles.code` через `positions.role_id` | приведено к UPPER |

Запись с `store_id IS NULL` (магазин был удалён, FK `SET NULL`) **исключается**
— по схеме Semetrics `store_id` обязателен. История удалённых магазинов в этом
справочнике не восстанавливается.

## Что это **не** покрывает

- Real-time-обогащение событий полем `store_id` на ingest. Это отдельная
  задача, требует доработки SDK и retro-обработки. Текущий справочник
  закрывает потребность аналитики через `WHERE user_id IN (...)`.
- Понятия «временное замещение» в WFM нет — модель `Assignment` этого не
  различает, в CSV пойдёт обычной строкой с `WORKER`/`MANAGER`.
- Overlapping assignments (один user одновременно в нескольких магазинах)
  модель допускает технически — Semetrics-сторона интерпретирует это сама.

## Связанные документы

- `.memory_bank/backend/services/svc_users.md` — модель `Assignment` и таблицы.
- Semetrics-репо: `domain/ai_layer.md` — обоснование PII-guardrail.
- Semetrics-репо: `.memory_bank/plans/plan_ai_resolve_entity.md` — потребитель
  этого справочника (итерация 2).
