# План: Система подсказок к работе в зоне (hints)

**Статус:** Выполнено
**Создан:** 2026-04-20
**Последнее обновление:** 2026-04-20

## Цель

Добавить таблицу `hints` для хранения подсказок к выполнению работы по комбинации (work_type + zone). Подсказки редактируются вручную (в будущем — через админку). Подсказки в таблице `operations` (hint_1..hint_6) являются исходным материалом, но не связаны напрямую с новой таблицей.

## Контекст

- Таблицы: `work_types`, `zones`, `operations` (с полями hint_1..hint_6) — уже существуют в `svc_tasks`
- Роутер `references.py` уже есть: `GET /references/work-types`, `GET /references/zones`, `GET /references/operations`
- Последняя миграция: `020_add_partner_id_to_shifts_plan.py`
- Новые эндпоинты добавляем в тот же `references.py`

## Задачи

### Backend

- [x] **021** — Создать миграцию `021_add_hints_table.py` — 2026-04-20
- [x] Добавить SQLAlchemy модель `Hint` в `app/domain/models.py` — 2026-04-20
- [x] Добавить Pydantic схемы `HintResponse`, `HintCreate`, `HintUpdate`, `HintListData` в `app/domain/schemas.py` — 2026-04-20
- [x] Создать `app/api/hints.py` (GET, POST, PATCH, DELETE) и подключить в `app/main.py` — 2026-04-20

### Документация Memory Bank

- [x] Создать `.memory_bank/backend/apis/api_hints.md` — 2026-04-20
- [x] Обновить `CLAUDE.md` — раздел Tasks API, подраздел "Подсказки" — 2026-04-20

## Примечание о связи с operations

Поле `operations.hint_1..hint_6` — исходный материал (сырые подсказки из LAMA), из которого формируются лаконичные подсказки в таблице `hints`. Прямой FK-связи нет намеренно: подсказки в `hints` редактируются вручную и могут отличаться от исходных.

## Лог выполнения

### 2026-04-20
- Создан план
- Реализовано: миграция 021, модель Hint, схемы, роутер hints.py, подключение в main.py, документация
