# ADR: Реструктуризация связки shifts / stores / users через assignment

**Дата:** 2026-03-08
**Режим:** FULL
**Owner:** Pavel Karpychev
**Review trigger:** при появлении второго владельца справочника магазинов помимо svc_users; при отказе от концепции `Assignment` или замене её другой моделью членства; при разделении svc_tasks и shifts (если shifts вернётся в отдельный сервис).

## Контекст

Связка «пользователь → смена → магазин → задача» исторически была размазана между сервисами и таблицами. Эволюция шла тремя итерациями:

1. **2026-02-20 (`refactor_shifts_tasks_linking`)** — у `ShiftFact` дублировались `role_id` и `store_id` (фактически копии плановой смены); в `Task` использовался `shift_external_id` (строка LAMA) и `assignment_id`. Связь смен план/факт была неявной.
2. **2026-03-08 (`remove_user_id_from_shifts`)** — в `shifts_plan` и `shifts_fact` оставался легаси `user_id` (SSO UUID), хотя `assignment_id` уже содержал ту же информацию через таблицу `assignments`. Параллельно жил устаревший `GET /list`.
3. **2026-03-08 (`move_stores_to_users`)** — справочник `stores` находился в `svc_shifts`, но реальным владельцем был `Assignment.store_id` в svc_users; после удаления `user_id` и `assignment_id` из shifts магазины «висели в воздухе».

## Решение

Делаем `Assignment` единственным «склеивающим» агрегатом, потому что именно он связывает пользователя, должность, роль и магазин — а смена и задача относятся к работе на конкретном месте, а не к человеку напрямую.

Итоговая модель:

- **stores** — в `svc_users` (рядом с `assignments`, своим единственным реальным потребителем). svc_shifts получает магазин через `users_client.get_store_by_assignment(assignment_id)`.
- **shifts** — связаны с пользователем через `assignment_id` (а не через `user_id` напрямую). `shifts_fact` ссылается на `shifts_plan` через `plan_id`. `role_id` и `store_id` из shifts удалены.
- **tasks ↔ shifts** — связь через `shift_id` (внутренний int, не LAMA-строка); `assignment_id` из `Task` удалён, потому что выводится через смену.
- **межсервисное общение** — HTTP через Docker-сеть, префикс `/internal/`, без JWT.

## Альтернативы

- **A: Оставить `user_id` в shifts (быстрее на JOIN'ы, не требует смены клиентов)** — отвергнуто: блокирует pre-provisioning (смена должна существовать до создания SSO-аккаунта работника), и хранение SSO UUID в shifts ломается при пересоздании пользователя.
- **B: Оставить `stores` в svc_shifts** — отвергнуто: владелец `Assignment.store_id` — svc_users, а кросс-БД FK невозможен; пришлось бы держать копию справочника или внешний кэш.
- **C: Сделать общий «shared schema» с stores/users/assignments** — отвергнуто: ломает изоляцию сервисов и осложняет независимый деплой.
- **D: Оставить `assignment_id` в `Task`** — отвергнуто: дублирование данных (`assignment_id` уже есть в смене), при переназначении работника на другую смену задача оказывалась бы в неконсистентном состоянии.

## Экономическое/архитектурное обоснование

Концентрация владения справочниками (stores, users, assignments) в одном сервисе упрощает миграции и позволяет сделать pre-provisioning (смены и магазины существуют до появления реального пользователя в SSO). Связка через `assignment_id` корректно моделирует ситуацию «один человек работает в разных магазинах с разными ролями» — что является основным сценарием для платформы подработчиков и самозанятых (см. бизнес-цели в CLAUDE.md). Удаление дублирующих полей сокращает поверхность для рассинхронизации.

## Принятые риски

- **Усложнение JOIN'ов**: чтобы получить магазин задачи, нужна цепочка `task → shift → assignment → store` с двумя кросс-сервисными вызовами. Для нагрузочных сценариев (отчёты по магазину) это узкое место.
- **Жёсткая зависимость svc_tasks/svc_shifts от svc_users**: при недоступности svc_users задачи и смены не могут показать данные магазина (фоллбек `store=null` в `/internal/current-shift`).
- **Breaking change для всех потребителей**: мобильные клиенты (iOS, Android), все межсервисные клиенты — пришлось рефакторить одновременно. Окно совместимости отсутствовало.
- **`/internal/store-by-id` оставлен «впрок»**, хотя сейчас никем не используется — рискует превратиться в мёртвый код.

## Future hook

`Assignment` теперь единственная точка расширения для атрибутов «работа в магазине»: добавление `team_id`, `manager_id`, `priority` не потребует трогать shifts или tasks. Если понадобится мульти-магазинная задача (один работник видит задачи нескольких магазинов одной смены) — `assignment_id` готов выступить ключом группировки. Pre-provisioning смен (без `user_id`) разблокирован: смену можно завести заранее и привязать к assignment, как только работник зарегистрируется.

## Связанные документы

- Планы:
  - `.memory_bank/completed_plans/refactor_shifts_tasks_linking.md` (2026-02-20)
  - `.memory_bank/completed_plans/remove_user_id_from_shifts.md` (2026-03-08)
  - `.memory_bank/completed_plans/move_stores_to_users.md` (2026-03-08)
- `.memory_bank/domain/shift_model.md` — итоговая модель смен
- `.memory_bank/domain/task_model.md` — связь задач со сменами
- `.memory_bank/domain/user_roles.md` — роль через цепочку User → Assignment → Position → Role
- `.memory_bank/backend/apis/api_users.md` — stores endpoints и internal API
- `.memory_bank/backend/apis/api_shifts.md` — изменённые endpoints открытия/закрытия смены
- `.memory_bank/backend/patterns/inter_service_communication.md` — HTTP /internal/

> **Примечание:** к моменту написания ADR `svc_shifts` объединён с `svc_tasks` (см. MEMORY.md, изменения 2026-03-12) — таблицы shifts_plan/shifts_fact живут в БД wfm_tasks. Решения данного ADR это не отменяет: межсервисный контракт через `users_client.get_store_by_assignment` сохраняется, изменился только хост обработчика shifts-endpoints.
