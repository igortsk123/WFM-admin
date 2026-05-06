# Реестр событий мобильного приложения

> ❗ **Этот файл — источник правды.** Любое изменение списка событий (добавление, удаление, переименование параметра) обязательно сопровождается обновлением этого документа.

Платформа: iOS + Android (одинаковые события на обеих платформах).

---

## Идентификация пользователя (User Properties)

Устанавливаются при входе, сбрасываются при выходе.

| Свойство | Значение | Описание |
|---|---|---|
| `userId` | целое число | Внутренний `user_id` из БД проекта |
| `user_role` | `"worker"` / `"manager"` | Роль пользователя |

---

## Авторизация

| Событие | Когда | Параметры |
|---|---|---|
| `phone_input_viewed` | Экран ввода телефона открыт | — |
| `phone_submitted` | Нажата кнопка «Продолжить» на вводе телефона | — |
| `code_input_viewed` | Экран ввода кода открыт | — |
| `code_submitted` | Нажата кнопка подтверждения кода | — |
| `registration_viewed` | Экран регистрации открыт | — |
| `registration_submitted` | Нажата кнопка завершения регистрации | — |
| `login_completed` | Вход успешно завершён (токен получен) | `role`: `"worker"` / `"manager"` |
| `logout_tapped` | Нажата кнопка выхода | — |

---

## Главный экран работника

| Событие | Когда | Параметры |
|---|---|---|
| `home_viewed` | Главный экран работника открыт | — |

---

## Задачи (работник)

| Событие | Когда | Параметры |
|---|---|---|
| `tasks_list_viewed` | Список задач открыт | `tasks_count`: число задач в списке |
| `task_card_tapped` | Нажата карточка задачи | `task_state`, `task_type` |
| `task_detail_viewed` | Экран деталей задачи открыт | `task_state`, `task_review_state`, `task_type` |
| `task_start_tapped` | Нажата кнопка «Начать» | `task_id`: String (UUID), `task_type`, `work_type`: String?, `time_start`: String?, `time_end`: String? |
| `task_pause_tapped` | Нажата кнопка «Пауза» | — |
| `task_resume_tapped` | Нажата кнопка «Продолжить» | — |
| `task_complete_sheet_opened` | Открыт листок завершения задачи | `requires_photo`: true / false |
| `task_complete_submitted` | Нажата кнопка «Завершить» в листке | `has_photo`: true / false, `has_text`: true / false, `task_id`: String (UUID), `task_type`, `work_type`: String?, `time_start`: String?, `time_end`: String? |

### Значения параметров задачи

- `task_state`: `"NEW"` / `"IN_PROGRESS"` / `"PAUSED"` / `"COMPLETED"`
- `task_review_state`: `"NONE"` / `"ON_REVIEW"` / `"ACCEPTED"` / `"REJECTED"`
- `task_type`: `"PLANNED"` / `"ADDITIONAL"`

---

## Подзадачи и подсказки (экран деталей задачи)

Актуально только для задач с `work_type.allow_new_operations = true`.

| Событие | Когда | Параметры |
|---|---|---|
| `subtask_select_sheet_opened` | Открыт Bottom Sheet выбора подзадач | `trigger`: `"manual"` / `"auto"`, `work_type`: String?, `operations_count`: Int |
| `subtask_search_used` | Пользователь начал вводить текст в строку поиска (первый символ) | — |
| `subtask_create_sheet_opened` | Нажата кнопка «Создать новую» в BS выбора | — |
| `subtask_created` | Пользователь подтвердил создание новой подзадачи | — |
| `hints_tab_viewed` | Переключился на вкладку «Подсказки» | `work_type`: String?, `zone`: String?, `hints_count`: Int |

### Значения параметров

- `trigger = "manual"` — пользователь сам нажал кнопку «Добавить подзадачу»
- `trigger = "auto"` — BS открылся автоматически при нажатии «Завершить», когда ни одна операция не выбрана
- `operations_count` — количество доступных операций в BS (0 означает пустой список)
- `hints_count` — количество подсказок, загруженных к моменту переключения на вкладку (0 если ещё не загружены или нет подсказок)

---

## Главный экран управляющего

| Событие | Когда | Параметры |
|---|---|---|
| `manager_home_viewed` | Главный экран управляющего открыт | `tasks_on_review_count`: число задач на проверке |
| `task_review_sheet_opened` | Открыт листок проверки задачи | `task_review_state` |
| `task_approved_tapped` | Нажата кнопка «Принять» | — |
| `task_rejected_tapped` | Нажата кнопка «Отклонить» | `has_comment`: true / false |

---

## Контроль задач (управляющий)

| Событие | Когда | Параметры |
|---|---|---|
| `manager_tasks_viewed` | Экран контроля задач открыт | — |
| `task_create_sheet_opened` | Открыт листок создания задачи | — |
| `task_create_submitted` | Задача создана | `has_assignee`: true / false, `requires_photo`: true / false, `planned_minutes`: число |
| `task_edit_sheet_opened` | Открыт листок редактирования задачи | — |

---

## Настройки

| Событие | Когда | Параметры |
|---|---|---|
| `settings_viewed` | Экран настроек/профиля открыт | — |

---

## Смены

| Событие | Когда | Параметры |
|---|---|---|
| `shift_open_completed` | Смена успешно открыта | `shift_id`: Int, `role`: `"worker"` / `"manager"` |
| `shift_close_completed` | Смена успешно закрыта | `shift_id`: Int, `role`: `"worker"` / `"manager"` |

---

## Push-уведомления

| Событие | Когда | Параметры |
|---|---|---|
| `push_notification_received` | Push или WS-уведомление получено приложением | `channel`, `notification_id`: String?, `task_id`: String? |
| `push_notification_tapped` | Пользователь нажал на системное уведомление | `channel`, `notification_id`: String?, `task_id`: String? |

### Значения параметров

- `channel`: `"fcm"` (Android GMS), `"hms"` (Android HMS), `"websocket"` (iOS + Android, приложение активно)
- `notification_id`: UUID уведомления из БД; есть всегда у WebSocket, у FCM/HMS — начиная с версии когда бэкенд добавил его в data-payload
- `task_id`: UUID задачи, если уведомление относится к конкретной задаче; `null` для системных уведомлений

---

## Системные / Ошибки

| Событие | Когда | Параметры |
|---|---|---|
| `no_assignment_viewed` | Экран «Ожидание назначения роли» открыт | — |
| `api_error` | Неожиданная ошибка API (не 409 Conflict) | `http_status`: код ответа |

---

## Телеметрия сети

Технические события для мониторинга стабильности и производительности сети. Трекаются автоматически из `APIClient` / `ApiClient` — без участия бизнес-логики.

| Событие | Когда | Параметры |
|---|---|---|
| `api_request_completed` | Завершён HTTP-запрос (успех или ошибка) | `path`, `method`, `http_status`, `duration_ms`, `store_id`, `is_error`, `error_type` |

### Параметры `api_request_completed`

| Параметр | Тип | Значения |
|---|---|---|
| `path` | String | Нормализованный путь: UUID и числовые ID заменены на `{id}`, например `/tasks/{id}/start` |
| `method` | String | `"GET"` / `"POST"` / `"PATCH"` |
| `http_status` | Int | HTTP статус-код; `0` = сетевая ошибка или таймаут |
| `duration_ms` | Int | Время ответа в миллисекундах |
| `store_id` | String | ID магазина; `"unknown"` до авторизации |
| `is_error` | Boolean | `true` для HTTP 5xx, таймаутов, сетевых ошибок; `false` для 2xx и 4xx |
| `error_type` | String? | `"timeout"` / `"server_error"` / `"bad_gateway"` / `"network_error"` / `null` |
