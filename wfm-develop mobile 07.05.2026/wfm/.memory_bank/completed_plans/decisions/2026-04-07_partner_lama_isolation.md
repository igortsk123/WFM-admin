# ADR: Изоляция партнёров от LAMA-данных через `partner_id`

**Дата:** 2026-04-07
**Режим:** FULL
**Owner:** Pavel Karpychev
**Review trigger:** появление третьего партнёра (помимо LAMA и Beyond Violet) или необходимости поддержать несколько LAMA-инстансов; запрос на cross-partner аналитику.

## Контекст

До этого момента вся синхронизация с LAMA молча предполагала «один партнёр на всю БД». С появлением партнёрских пользователей вне LAMA (Beyond Violet и др.) обнаружилось четыре течи: магазины создавались с `partner_id=null`, ежедневный sync `get_all_store_codes()` затягивал в LAMA-обход магазины чужих партнёров, `UNIQUE(external_code)` в `stores` мешал двум партнёрам иметь магазины с одинаковым внешним кодом, а определить «эта смена — LAMA?» в svc_tasks можно было только цепочкой `shift → assignment → store → partner` через cross-service запрос.

## Решение

Все LAMA-специфичные пути (создание магазинов, `get_all_store_codes`, upsert ShiftPlan) фильтруются и проставляют `partner_id = settings.LAMA_PARTNER_ID = 2`, а `partner_id` денормализован в `shifts_plan` — потому что без явного признака партнёра любая «общая» ручка либо тянет данные за чужого партнёра, либо требует JOIN через сервисную границу.

## Альтернативы

- **Отдельная БД / схема для каждого партнёра:** отвергнуто — операционно тяжелее (миграции × N, бэкапы × N), а доменные модели у нас одинаковые.
- **Тип пользователя/scope в JWT вместо `partner_id` в данных:** отвергнуто — JWT решает «кто запрашивает», но не «чьи данные»; при batch-синхронизации (cron) JWT отсутствует, а фильтр всё равно нужен.
- **Идти по цепочке `shift → assignment → store → partner` без денормализации:** отвергнуто — это cross-service запрос (svc_tasks → svc_users) на каждом upsert смены; денормализация `shifts_plan.partner_id` локализует решение в svc_tasks.
- **Глобальный `UNIQUE(external_code)` + префикс партнёра в строке кода:** отвергнуто — внешние коды приходят от партнёров «как есть», добавлять префикс на нашей стороне = ломать обратную интеграцию по этому же коду.

## Экономическое/архитектурное обоснование

- Один `LAMA_PARTNER_ID` в settings — одна точка для будущей замены (например, при тестовом окружении со своим partner_id).
- `UNIQUE(external_code, partner_id)` в Postgres работает корректно с `NULL`, поэтому магазины без `external_code` (внутренние, не из LAMA) продолжают существовать без конфликтов.
- Денормализация `partner_id` в `shifts_plan` стоит одного целочисленного поля, но снимает межсервисный JOIN с горячего пути upsert смены и любых будущих фильтров «LAMA / не LAMA» внутри svc_tasks.
- Lazy sync смен и `if task.external_id:` в state transitions уже корректны (не-LAMA сущности не имеют `external_id`), поэтому фикс точечный: только batch-пути и создание магазинов.

## Принятые риски

- **Hardcoded `LAMA_PARTNER_ID = 2`.** Привязка к конкретному id в таблице partners; при сидировании другой БД (демо, тесты) нужно либо повторить тот же id, либо переопределить env-переменную.
- **Денормализация рассинхронизируется.** `shifts_plan.partner_id` обновляется только в `ShiftLamaService.sync_shift`; ручное создание ShiftPlan другим путём может оставить `partner_id=NULL` и сломать фильтр.
- **Существующие строки `shifts_plan` остались с `partner_id=NULL`.** Миграция 020 не делает backfill — допущено для MVP, поскольку «сейчас все из LAMA», но в будущем ручка-фильтр должна знать про NULL.
- **Партнёр != тенант.** Текущая модель не обеспечивает row-level security; пользователь с правильным JWT теоретически может запросить данные другого партнёра, если ручка не фильтрует. Изоляция — на уровне application code, не БД.

## Future hook

- `partner_id` уже на ShiftPlan — добавить partner-фильтр в `/tasks/list` или в lazy sync второго партнёра можно без миграций.
- `partners` как отдельная таблица оставлена расширяемой (id, name, created_at) — туда можно дописать `webhook_secret`, `api_base_url` и сделать LAMA одним из множества подключений вместо «зашитого второго».
- Документ `.memory_bank/backend/partners.md` зафиксировал паттерн фильтрации — следующий партнёр повторяет тот же скелет (свой `partner_id`, своя ветка sync).

## Связанные документы

- План: `.memory_bank/completed_plans/partner_lama_isolation.md`
- Концепция: `.memory_bank/backend/partners.md`
- Миграции: `backend/svc_users/alembic/versions/011_fix_store_external_code_unique.py`, `backend/svc_tasks/alembic/versions/020_add_partner_id_to_shifts_plan.py`
- Реализация: `backend/svc_users/app/services/lama_service.py`, `backend/svc_users/app/api/internal.py`, `backend/svc_users/app/repositories/store_repository.py`, `backend/svc_tasks/app/services/shift_lama_service.py`
- Связанные ADR: `.memory_bank/completed_plans/decisions/2026-03-19_lama_integration_evolution.md`, `.memory_bank/completed_plans/decisions/2026-04-08_non_lama_users_path.md`
