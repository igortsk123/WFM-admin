# ADR: review_state, acceptance_policy и task_events как фундамент контроля качества и аудита

**Дата:** 2026-02-27
**Режим:** FULL
**Owner:** Pavel Karpychev
**Review trigger:** при первом предложении ввести AI-вердикт по задаче (проверить, не дублируется ли `review_state`); при появлении второй внешней системы-источника помимо LAMA.

## Контекст

В системе задач execution state (NEW → IN_PROGRESS → PAUSED → COMPLETED) описывал только факт исполнения, без явной модели приёмки и без истории переходов. Менеджеру негде было фиксировать вердикт «принято/отклонено», KPI считались по любому COMPLETED, а причины пауз и rejection'ов не сохранялись. Параллельно нужно было корректно синхронизировать вердикт с LAMA (Accepted / Returned).

## Решение

Вводим три взаимосвязанные сущности — `review_state` (NONE / ON_REVIEW / ACCEPTED / REJECTED) как отдельное измерение от execution `state`, `acceptance_policy` (AUTO / MANUAL) как политику приёмки на уровне задачи и таблицу `task_events` как аудит-лог переходов с `actor_id`, `actor_role`, `comment`, `meta` — потому что приёмка концептуально ортогональна исполнению и без аудит-лога теряется контекст принятия решений (в том числе для будущих аналитических слоёв).

## Альтернативы

- **A: Расширить TaskState значениями ON_REVIEW / ACCEPTED / REJECTED** — отвергнуто: смешивает два независимых измерения (что делает работник vs что решает менеджер), ломает интуитивность state machine и усложняет переходы (например, REJECTED должен возвращать в PAUSED — это уже не один переход, а два).
- **B: Хранить только `is_accepted: bool` без полного аудит-лога** — отвергнуто: нет истории «кто и когда отклонил», теряется причина возврата, нет основы для Δt и для будущих AI-вердиктов; задним числом обогатить S-сигнал (см. `.memory_bank/strategy/theoretical_foundation.md`) невозможно.
- **C: Складывать события в общий лог приложения (logs/Sentry)** — отвергнуто: нет реляционной связи с задачей, нельзя считать аналитику, нельзя гарантировать сохранность.

## Экономическое/архитектурное обоснование

Контроль качества — обязательное требование клиента (только подтверждённые задачи учитываются в KPI), без `review_state` нельзя честно посчитать ROI «снижение ФОТ». `acceptance_policy` даёт развилку для разных типов работ (рутинные операции — AUTO, ответственные — MANUAL) и одновременно служит явным маркером «есть ли human-in-the-loop» для будущих AI-фич. `task_events` — это S-шаг модели EIM: материал для будущей машинной интерпретации, для метрики Δt и для разбора инцидентов.

## Принятые риски

- Рост таблицы `task_events`: при активном использовании каждая задача порождает 5–10+ событий; при росте магазинов потребуется партиционирование или архивация.
- Обход state machine для `REJECTED → PAUSED` через отдельный метод `reject_to_paused` — допущенное исключение из общего правила, легко сделать кейс «задача в COMPLETED, но state=PAUSED» при ошибке в коде.
- Расхождение с LAMA: исходящая синхронизация теперь требует явного `lama_status` от вызывающего кода — каждый новый endpoint обязан помнить про маппинг.
- Накопление ON_REVIEW задач, которые никто не разбирает (особенно при текучке менеджеров).

## Future hook

Эти три поля — **намеренный фундамент** для будущих слоёв:

- **AI-вердикт** ляжет поверх `review_state` (новое значение `acceptance_policy = RULES` или actor_role=`ai`), не требуя миграции схемы. Перед добавлением AI-вердикта обязательна проверка `.memory_bank/strategy/ai_oversight_policy.md`.
- **Метрика Δt** (см. `.memory_bank/analytics/dt_metric.md`) считается по `task_events` для задач с `review_state = ACCEPTED` — без аудит-лога её нельзя реализовать.
- **EIM S→I→D→T→E→F→L** (см. `.memory_bank/strategy/theoretical_foundation.md`): `task_events` — это S, `review_state` — это F.

**Срезание любого из трёх полей в будущих рефакторингах = потеря аналитического фундамента.** Историю задним числом не восстановить.

## Связанные документы

- План: `.memory_bank/completed_plans/task_review_state_and_audit_log.md`
- `.memory_bank/domain/task_states.md` — state machine (исполнение + приёмка)
- `.memory_bank/domain/task_model.md` — поля задачи и TaskEvent
- `.memory_bank/backend/apis/api_tasks.md` — endpoints approve/reject/events, маппинг LAMA
- `.memory_bank/backend/services/svc_tasks.md` — схема БД и task_events
- `.memory_bank/analytics/task_events_backend.md` — структура аудит-лога
- `.memory_bank/strategy/theoretical_foundation.md` — обоснование «почему срезать нельзя»
- `.memory_bank/strategy/ai_oversight_policy.md` — политика для будущего AI-вердикта
- `.memory_bank/analytics/dt_metric.md` — Δt
