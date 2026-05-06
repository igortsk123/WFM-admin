# CLAUDE.md

Этот файл содержит рекомендации для Claude Code (claude.ai/code) при работе с кодом в данном репозитории.

## Обзор проекта

**WFM** — система управления рабочей силой (Workforce Management), построенная на архитектуре "Memory Bank" — централизованного источника знаний, который служит единым источником правды для backend, web, mobile команд и AI-агентов.

Memory Bank (`.memory_bank/`) содержит:
- Доменные модели и спецификации бизнес-логики
- API-контракты и описания сервисов
- Рекомендации по стеку технологий для каждой платформы

Эта архитектура обеспечивает:
- Генерацию кода для SwiftUI, Jetpack Compose и FastAPI
- Единую терминологию на всех платформах
- AI-разработку с чёткими ограничениями
- Согласованность фич между web/mobile/backend командами

## Бизнес-контекст

**Целевой рынок**: FMCG-ритейл с высокой операционной нагрузкой (магазины шаговой доступности, супермаркеты, дискаунтеры).

**Ключевые бизнес-цели**:
- Снижение ФОТ на 5–10% за счёт оптимизации задач и учёта реальной трудоёмкости
- Повышение продуктивности сотрудников на 5–15% благодаря контролю, геймификации и подсказкам
- Улучшение качества магазина (выкладка, ценники, просрочка, чистота) → рост продаж
- Создание платформы гибкого подбора персонала (подработчики, самозанятые)

**Типичные задачи в системе** (примеры из ритейла):
- Выкладка товара на полки (мерчендайзинг)
- Переоценка товаров (ценообразование)
- Проверка срока годности продукции
- Уборка торгового зала
- Приемка товара на склад
- Инвентаризация остатков
- Обслуживание покупателей на кассе
- Обучение новых сотрудников

**Целевая аудитория**:
- Ритейлеры FMCG: сети с 20–300+ магазинов
- Операционные директора, HR, финансовые директора
- Директора магазинов (нужен минимум времени на управление)
- Сотрудники магазинов (кассиры, универсалы, мерчендайзеры, кладовщики)
- Подработчики / внешние исполнители (студенты, самозанятые)

Подробнее см. `.memory_bank/product_brief.md`

## Доменная модель

### Основная сущность: Task

Система построена вокруг задач со следующим workflow:

**Состояния**: NEW → IN_PROGRESS → PAUSED → COMPLETED

**Ключевые правила**:
- Сотрудник может иметь только 1 активную задачу одновременно
- Переходы между состояниями валидируются на сервере
- Недопустимые переходы возвращают HTTP 409 Conflict

**Модель Task**:
```
id: UUID
title: string
description: string
type: TaskType (PLANNED | ADDITIONAL, default: PLANNED) — сейчас все задачи PLANNED
planned_minutes: int
creator_id: integer (внутренний int ID пользователя-создателя)
assignee_id: integer | null (внутренний int ID назначенного работника)
state: TaskState (NEW | IN_PROGRESS | PAUSED | COMPLETED)
review_state: TaskReviewState (NONE | ON_REVIEW | ACCEPTED | REJECTED)
acceptance_policy: AcceptancePolicy (AUTO | MANUAL, default: MANUAL)
comment: string | null (произвольный комментарий от создателя/редактора)
review_comment: string | null (комментарий при reject)
requires_photo: boolean (обязательно ли фото при завершении, default: false)
report_text: string | null (текстовый комментарий работника при завершении)
report_image_url: string | null (URL фото в S3, сохраняется при complete)
created_at: datetime
updated_at: datetime
```

**Назначение задач**:
- Задача назначается конкретному работнику через `assignee_id`

**Отчёт о выполнении**:
- Endpoint `POST /{id}/complete` принимает `multipart/form-data`
- `report_text` (string) — текстовый комментарий, всегда опционален
- `report_image` (file) — одно фото; API загружает его в S3 и сохраняет URL в `report_image_url`
- Если `task.requires_photo = true` и фото не передано → 400 Validation Error
- `requires_photo` по умолчанию `false`; задаётся при создании/редактировании задачи

**Разрешённые переходы между состояниями**:
- NEW → IN_PROGRESS (начать задачу)
- IN_PROGRESS → PAUSED (приостановить задачу)
- PAUSED → IN_PROGRESS (возобновить задачу)
- IN_PROGRESS → COMPLETED (завершить задачу)
- PAUSED → COMPLETED (завершить задачу из паузы)

**Система отчётов и проверки**:
- Работник добавляет результаты (`report_text`, `report_image`) опционально при завершении задачи
- Если `requires_photo = true` — фото обязательно
- Управляющий проверяет завершённые задачи: **подтверждает** (`POST /{id}/approve`) или **отклоняет** (`POST /{id}/reject`)
- При отклонении задача возвращается в PAUSED с указанием причины, работник исправляет и завершает заново
- Только подтверждённые задачи (`review_state = ACCEPTED`) учитываются в KPI

### Роли пользователей и привилегии

Система построена на **2 взаимоисключающих ролях** и системе **привилегий** для работников.

**Роли** (одна на пользователя):
- **MANAGER (Управляющий)** — управление магазином, персоналом и задачами:
  - Создаёт задачи (плановые и дополнительные)
  - Назначает задачи работникам
  - Управляет привилегиями работников
  - Видит **все задачи магазина**
  - Проверяет и подтверждает/отклоняет отчёты
  - Просматривает аналитику магазина

- **WORKER (Работник)** — выполнение задач в магазине:
  - Видит **только свои задачи** (assignee_id = user_id)
  - Выполняет задачи (start/pause/complete)
  - Предоставляет отчёты по задачам
  - Имеет набор **привилегий**, назначенных управляющим

**Привилегии работников** (назначаются управляющим):
- **CASHIER** — работа на кассе
- **SALES_FLOOR** — работа в торговом зале (выкладка, переоценка, уборка)
- **SELF_CHECKOUT** — работа на кассе самообслуживания
- **WAREHOUSE** — работа на складе (приёмка, инвентаризация)

**Ключевые правила**:
- Роль определяется через должность: `User → Assignment → Position → Role`
- По умолчанию все должности имеют `role_id = 1` (worker), для управляющих — `role_id = 2` (manager) устанавливается вручную
- Привилегии назначаются **только работникам** (MANAGER не имеет привилегий)
- Привилегии **не блокируют** назначение задач — это индикаторы компетенций для управляющего
- Магазин пользователя определяется через `assignments.store_id`
- Пользователь без назначения не видит задачи (экран "Ожидание назначения роли")

**Модель Position** (содержит role_id):
```
id: INTEGER (автоинкремент)
code: string (уникальный код)
name: string
description: string | null
role_id: INTEGER (FK на Role, NOT NULL, default=1 — worker)
```

**Модель WorkerPermission**:
```
id: UUID
user_id: INTEGER (FK на users.id, CASCADE DELETE)
permission: PermissionType (CASHIER | SALES_FLOOR | SELF_CHECKOUT | WAREHOUSE)
granted_at: datetime
granted_by: INTEGER (внутренний int ID управляющего)
revoked_at: datetime | null (soft delete)
```

Подробнее см. `.memory_bank/domain/user_roles.md`

## Архитектура

### Backend Stack

- **Платформа**: Ubuntu 24.04
- **Язык**: Python 3.12
- **Фреймворк**: FastAPI
- **База данных**: PostgreSQL 16
- **Развёртывание**: docker-compose
- **Reverse Proxy**: nginx (конфигурация в `backend/nginx/`)

### Web Stack (рекомендации)

- **Фреймворк**: Next.js 15 (App Router)
- **Язык**: TypeScript
- **UI**: shadcn/ui
- **Работа с данными**: React Query
- **Валидация**: Zod
- **Мониторинг**: Posthog или Sentry

### iOS Stack

- **Язык**: Swift 5.0+ (рекомендуется Swift 5.10+)
- **UI**: SwiftUI
- **Архитектура**: MVVM
- **DI**: Лёгкий DI контейнер (DependencyContainer)
- **Сеть**: URLSession
- **Хранилище**: UserDefaults (в будущем SwiftData)
- **Модули**: Swift Package Manager (WFMAuth, WFMUI)
- **Библиотеки**: Kingfisher, HCaptcha

Подробнее см. `.memory_bank/mobile/architecture/ios_stack.md`

### Android Stack

- **Язык**: Kotlin 2.1.0
- **UI**: Jetpack Compose + Material3
- **Архитектура**: MVVM + Clean Architecture
- **DI**: Koin 4.0.0
- **Сеть**: Ktor Client 3.0.2 (OkHttp engine)
- **Хранилище**: DataStore Preferences
- **Модули**: Gradle (app, feature-auth, ui)
- **Библиотеки**: Coil, hCaptcha, Chucker, Kotlinx Serialization

Подробнее см. `.memory_bank/mobile/architecture/android_stack.md`

## Nginx Reverse Proxy

Все backend сервисы доступны через nginx reverse proxy. Конфигурация хранится в `backend/nginx/`.

**Структура:**
```
backend/nginx/
├── sites-available/default    # Основной конфиг (SSL, домен)
└── services/
    ├── tasks.conf             # Прокси для svc_tasks (→ localhost:8000/)
    ├── users.conf             # Прокси для svc_users (→ localhost:8001/)
    └── shifts.conf            # Прокси для shifts API (→ localhost:8000/shifts/)
```

**URL доступа (DEV сервер):**
- **n8n**: `https://dev.wfm.beyondviolet.com/`
- **Tasks API**: `https://dev.wfm.beyondviolet.com/tasks/`
- **Users API**: `https://dev.wfm.beyondviolet.com/users/`
- **Shifts API**: `https://dev.wfm.beyondviolet.com/shifts/`
- **Notifications API**: `https://dev.wfm.beyondviolet.com/notifications/`
- **Notifications WS**: `wss://dev.wfm.beyondviolet.com/notifications/ws`

**URL доступа (PROD сервер):**
- **n8n**: `https://wfm.beyondviolet.com/`
- **Tasks API**: `https://wfm.beyondviolet.com/tasks/`
- **Users API**: `https://wfm.beyondviolet.com/users/`
- **Shifts API**: `https://wfm.beyondviolet.com/shifts/`
- **Notifications API**: `https://wfm.beyondviolet.com/notifications/`
- **Notifications WS**: `wss://wfm.beyondviolet.com/notifications/ws`

**URL доступа (local development):**
- **Tasks API**: `http://localhost:8000/tasks/`
- **Users API**: `http://localhost:8001/users/`
- **Shifts API**: `http://localhost:8000/shifts/` (обслуживает svc_tasks)
- **Notifications API**: `http://localhost:8003/notifications/`
- **Notifications WS**: `ws://localhost:8003/notifications/ws`

**Swagger документация:**
- **Tasks + Shifts**: `/tasks/docs` (ReDoc: `/tasks/redoc`)
- **Users**: `/users/docs` (ReDoc: `/users/redoc`)
- **Notifications**: `/notifications/docs` (ReDoc: `/notifications/redoc`)

При добавлении нового сервиса см. `.memory_bank/backend/nginx.md`

### Дизайн-система WFM

Токены и компоненты из Figma. Всё берём из UI-модуля — не хардкодим цвета, отступы и стили в экранах.

❌ **Нельзя** использовать `.opacity()` для изменения цвета — только для теней и оверлеев.

**Документация:** `.memory_bank/mobile/ui/design_system_components.md`

## API Endpoints

### Tasks API (FastAPI)

**Base URL:** `/tasks/`

**CRUD и управление состояниями**:
- `GET /list/filters` - Фильтры для списка задач (MANAGER; зоны и типы работ по сменам сегодня; требует assignment_id)
- `GET /list/users` - Сотрудники с плановой сменой сегодня (MANAGER; требует assignment_id)
- `GET /list` - Список задач (фильтры: assignment_id, state, review_state, assignee_ids, zone_ids, work_type_ids)
- `GET /my` - Мои задачи (обязательный assignment_id, опциональный state; текущая смена из локальной БД)
- `POST /` - Создать задачу (assignee_id — integer ID работника)
- `GET /{id}` - Получить задачу по ID
- `PATCH /{id}` - Обновить поля задачи (включая переназначение)
- `POST /{id}/start` - Переход в IN_PROGRESS
- `POST /{id}/pause` - Переход в PAUSED
- `POST /{id}/resume` - Возврат в IN_PROGRESS
- `POST /{id}/complete` - Переход в COMPLETED (multipart/form-data: report_text опционален, report_image опционален если requires_photo=false)

**Проверка задач**:
- `POST /{id}/approve` - Подтвердить выполнение задачи (только MANAGER)
- `POST /{id}/reject` - Отклонить выполнение задачи с указанием причины (только MANAGER)

**Подсказки**:
- `GET /hints?work_type_id=X&zone_id=Y` - Список подсказок для типа работы и зоны (сортировка по id)
- `POST /hints` - Создать подсказку (только MANAGER)
- `PATCH /hints/{hint_id}` - Обновить текст подсказки (только MANAGER)
- `DELETE /hints/{hint_id}` - Удалить подсказку (только MANAGER)

### Users API (FastAPI)

**Base URL:** `/users/`

**Пользователи**:
- `GET /me` - Получить полную информацию о текущем пользователе (локальные данные + SSO + LAMA)
- `GET /{user_id}` - Получить данные пользователя (только MANAGER, тот же магазин)
- `PATCH /{user_id}` - Обновить данные пользователя (только MANAGER, тот же магазин)

**Управление привилегиями**:
- `GET /{user_id}/permissions` - Получить привилегии работника (только MANAGER)
- `POST /{user_id}/permissions` - Назначить привилегию работнику (только MANAGER)
- `DELETE /{user_id}/permissions/{permission_id}` - Отозвать привилегию (только MANAGER)
- `GET /me/permissions` - Получить свои привилегии (только WORKER)

### Shifts API (FastAPI)

**Base URL:** `/shifts/`

> **Примечание:** Обслуживается `svc_tasks` (порт 8000). Nginx: `/shifts/` → `http://localhost:8000/shifts/`.

**Управление сменами**:
- `POST /open` - Открыть смену (требует plan_id — ссылка на shifts_plan)
- `POST /close` - Закрыть смену (установить closed_at)
- `GET /current?assignment_id=X` - Получить текущую смену (assignment_id обязательный; приоритет: shifts_fact → shifts_plan)
- `GET /{id}` - Получить смену по ID

**Статусы смены**: NEW (план), OPENED (открыта), CLOSED (закрыта)

**Ключевые правила**:
- У работника может быть только одна открытая смена одновременно
- Каждая фактическая смена привязана к плановой через `plan_id`
- assignment_id хранится в shifts_plan, shifts_fact ссылается через plan_id
- get_current сначала ищет в shifts_fact, потом в shifts_plan

### Notifications API (FastAPI)

**Base URL:** `/notifications/`

**Public API (JWT):**
- `GET /list` — уведомления пользователя (только visibility=USER; params: is_read, limit, offset)
- `GET /unread-count` — количество непрочитанных
- `POST /{id}/read` — отметить как прочитанное
- `POST /read-all` — отметить все прочитанными
- `POST /devices/tokens` — зарегистрировать FCM-токен устройства
- `DELETE /devices/tokens/{token}` — деактивировать токен (при логауте)
- `GET /preferences` — настройки уведомлений
- `PATCH /preferences` — обновить настройки

**WebSocket:**
- `WS /ws?token={jwt}` — real-time уведомления; клиент отвечает ACK

**Internal API (без JWT, только Docker-сеть):**
- `POST /internal/send` — отправить уведомление (используют svc_tasks и другие сервисы)
- `POST /internal/test` — тестовая отправка

### Межсервисное взаимодействие

**Паттерн**: Прямой HTTP через внутреннюю Docker-сеть (httpx).

- `svc_tasks → svc_users` — получение int user_id, данных магазина, external_id сотрудника
- `svc_tasks → svc_notifications` — отправка уведомлений при изменении состояний задач
- Внутренние эндпоинты: префикс `/internal/`, без JWT авторизации
- Не проксируются через nginx (доступны только из Docker-сети)
- Формат ответа: стандартный `ApiResponse`
- Конфигурация: `USERS_SERVICE_URL`, `USERS_SERVICE_TIMEOUT` env vars

Подробнее см. `.memory_bank/backend/patterns/inter_service_communication.md`

## Принципы Memory Bank

При работе с этим кодом:

1. **Memory Bank — источник правды** - Всегда обращайтесь к `.memory_bank/` перед реализацией функций
2. **Платформенная нейтральность** - Доменные модели не зависят от платформы
3. **Минимальная сложность** - Начинаем просто, расширяем позже (текущая модель ориентирована на MVP)
4. **Согласованность между платформами** - Backend, web и mobile должны использовать идентичную терминологию и state machine
5. **Валидация состояний** - Backend проверяет все правила переходов; клиенты должны обрабатывать 409 ответы
6. **Одна активная задача на работника** - Работник может иметь только одну задачу в состоянии IN_PROGRESS; это ограничение применяется во всех UI и API
7. **Роль через должность** - Роль определяется через цепочку `User → Assignment → Position → Role`; по умолчанию worker, manager устанавливается вручную
8. **Привилегии — индикаторы компетенций** - Привилегии работников не блокируют назначение задач, а помогают управляющему принимать решения
9. **Назначение задачи работнику** - Задача назначается конкретному работнику через `assignee_id` (внутренний integer ID)
10. **Результаты в задаче** - Работник добавляет report_text и report_images прямо при завершении задачи; для ADDITIONAL задач хотя бы одно поле обязательно
11. **Контроль качества** - Управляющий подтверждает или отклоняет завершённые задачи; только подтверждённые учитываются в KPI

## Руководство по разработке

- Обращайтесь к `.memory_bank/domain/` для бизнес-логики и моделей данных
  - `task_model.md` — модель задач, типы задач (PLANNED/ADDITIONAL), система отчётов
  - `task_states.md` — состояния задач и state machine
  - `user_roles.md` — система ролей (MANAGER/WORKER), привилегии работников, бизнес-правила
  - `shift_model.md` — модель смен (плановые и фактические), магазины
  - `auth/` — авторизация (auth_flow.md, auth_validation.md)
- Обращайтесь к `.memory_bank/backend/` для спецификаций сервисов и API-контрактов
  - `api_tasks.md` — API endpoints задач и отчётов
  - `apis/api_operations.md` — API операций (/operations): список, модерация, выполненные операции в задаче
  - `api_users.md` — API endpoints управления пользователями (профили, интеграция с SSO)
  - `api_roles.md` — API endpoints ролей и привилегий
  - `api_shifts.md` — API endpoints смен и магазинов
  - `api_notifications.md` — API уведомлений (список, прочтение, токены, WebSocket)
- Обращайтесь к `.memory_bank/web/` для требований к веб-платформе
- Обращайтесь к `.memory_bank/mobile/` для требований к iOS/Android платформам
  - `architecture/app_structure.md` — структура, точка входа, Tab Bar, DI, ссылки на всё остальное
  - `architecture/networking.md` — API клиенты (APIClient/ApiClient), Services, обработка ошибок
  - `architecture/request_cancellation.md` — **КОМПЛЕКСНОЕ РЕШЕНИЕ** проблем с отменой запросов (cancelled errors): Task/Job cancellation, isRefreshing флаги, координация onAppear/refreshable, все паттерны iOS/Android
  - `architecture/caching.md` — HTTP кэширование (stale-while-revalidate), TTL, обработка ошибок
  - `ui/design_system_components.md` — компоненты, цвета, типографика, кнопки, отступы
  - `ui/ui_patterns.md` — поведение экранов: Pull-to-Refresh, Loading/Empty/Error state, UiState паттерн
  - `ui/bottomsheet.md` — правила использования BottomSheet, затемнение фона, все специфичные компоненты
  - `managers/user_manager.md` — менеджер данных текущего пользователя
  - `managers/token_storage.md` — хранение токенов авторизации
  - `utilities/image_compression.md` — сжатие изображений перед отправкой (iOS/Android)
  - `utilities/click_debouncer.md` — **ОБЯЗАТЕЛЬНО** для Android: защита от двойных кликов на навигационных кнопках
  - `utilities/crashlytics.md` — Firebase Crashlytics для логирования ошибок (архитектура, flavor-specific реализации, использование); ⚠️ iOS: Run Script для dSYM uploading отключен, требует исправления в будущем
  - `feature_auth/feature_auth_screens.md` — экраны авторизации (PhoneInput, CodeInput, Registration)
  - `feature_home/home_screen.md` — главный экран работника (информация о пользователе)
  - `feature_tasks/feature_tasks_screens.md` — экраны задач работника (TasksList, TaskCard, Empty State)
  - `feature_tasks/task_detail_screen.md` — экран деталей задачи (управление состояниями, обработка CONFLICT)
  - `feature_managerhome/manager_home_screen.md` — главный экран управляющего (задачи на проверку)
  - `feature_managertasks/manager_tasks_screens.md` — экран контроля задач для управляющего
  - `feature_managertasks/employee_filter_screen.md` — экран фильтра сотрудников
  - `feature_settings/settings_screen.md` — экран профиля и настроек
  - `feature_notifications/notifications_list.md` — экран списка уведомлений (iOS реализован, Android — в плане)
- Обращайтесь к `.memory_bank/guides/` для общих рекомендаций по разработке
  - `documentation_style.md` — стиль написания документации (без длинных примеров кода и ASCII-зарисовок)
  - `lang.md` — правила языка документации
  - `ci_cd.md` — CI/CD рекомендации
- Обращайтесь к `.memory_bank/mobile/` для мобильных инструкций
  - `ui/figma_assets.md` — правила экспорта иконок и изображений из Figma (форматы, именование, структура)
  - `architecture/ios_module_extraction.md` — вынос фичи в отдельный Swift Package Manager модуль
  - `architecture/android_module_extraction.md` — вынос фичи в отдельный Gradle модуль
- Все переходы состояний должны следовать flow, определённому в `task_states.md`
- Реализация API должна соответствовать контрактам из `api_tasks.md` и `api_users.md`
- При работе с UI компонентами следуй правилам из `mobile/ui/design_system_components.md`
- При сомнениях в доменной логике сначала обращайтесь к документации Memory Bank

### UI Правила и паттерны (ОБЯЗАТЕЛЬНАЯ ПРОВЕРКА)

❗ **ПЕРЕД созданием нового экрана или ViewModel — ОБЯЗАТЕЛЬНО проверь нужные файлы:**

| Задача | Файл |
|--------|------|
| Экран загружает данные | `ui/ui_patterns.md` — Pull-to-Refresh, Loading/Empty/Error |
| Request Cancellation (cancelled errors) | `architecture/request_cancellation.md` — **ВСЕ паттерны**: Task/Job cancellation, isRefreshing, .task vs .onAppear |
| **Android: навигация назад (кнопки, карточки)** | `utilities/click_debouncer.md` — **ОБЯЗАТЕЛЬНО** использовать ClickDebouncer для всех навигационных действий |
| HTTP кэширование данных | `architecture/caching.md` — stale-while-revalidate |
| Координация с UserManager | `managers/user_manager.md` → раздел "Паттерн координации для ViewModels" — 3-шаговый алгоритм |
| Environment Keys (передача действий) | `ui/ui_patterns.md` → раздел "Environment Keys для передачи действий" |
| Singleton ViewModels в DI | `architecture/app_structure.md` → раздел "DI (Dependency Injection)" |
| Навигация, Tab Bar | `architecture/app_structure.md` |
| Цвета, компоненты, отступы | `ui/design_system_components.md` |
| Текстовые поля | `ui/design_system_components.md` → раздел WFMTextField |
| BottomSheet (модальные окна) | `ui/bottomsheet.md` — использование, showOverlay, специфичные компоненты |
| Форматирование времени/дат/длительностей | `utilities/time_date_formatting.md` — справочник методов + как добавить новый |
| Сжатие изображений перед отправкой | `utilities/image_compression.md` — параметры, использование, обработка ошибок |
| Глобальные данные (пользователь, токены) | `managers/` |
| API запросы, обработка ошибок | `architecture/networking.md` |
| Экраны задач работника | `feature_tasks/feature_tasks_screens.md`, `feature_tasks/task_detail_screen.md` |
| Экраны управляющего | `feature_managerhome/`, `feature_managertasks/` |
| Главный экран работника | `feature_home/home_screen.md` |
| Настройки и профиль | `feature_settings/settings_screen.md` |

### Android: Обязательное использование ClickDebouncer

❗ **КРИТИЧНО для Android:** Все навигационные действия (кнопки "назад", клики на карточки с переходом на новый экран) ОБЯЗАТЕЛЬНО должны использовать ClickDebouncer.

**Проблема без debounce:**
- Быстрый двойной клик на кнопку "назад" → множественный `popBackStack()` → закрытие всего navigation stack → белый экран
- Быстрый двойной клик на карточку → дублирование экранов в back stack

**Решение:**
```kotlin
// Кнопка назад в TopAppBar
val (backButtonEnabled, debouncedNavigateBack) = rememberDebouncedClick(
    debounceTime = 500L,
    onClick = onNavigateBack
)
IconButton(onClick = debouncedNavigateBack, enabled = backButtonEnabled) { ... }

// Карточка с навигацией
Column(modifier = Modifier.clickableDebounced(onClick = onDetail)) { ... }
```

**Где применять:**
- ✅ Все кнопки "назад" в TopAppBar
- ✅ Все клики на карточки с навигацией (TaskCardView и подобные)
- ✅ Все кнопки с вызовом `navController.navigate()` или `popBackStack()`

**Документация:** `.memory_bank/mobile/utilities/click_debouncer.md`

### Написание документации Memory Bank

При создании или обновлении документации в `.memory_bank/`:

❗ **ОБЯЗАТЕЛЬНО следуйте правилам из `.memory_bank/guides/documentation_style.md`**

Ключевые принципы (Mobile/Domain):
- ✅ Концепции, термины, паттерны — объясняйте **что и почему**, а не **как именно**
- ✅ Ссылки на файлы реализации и связанные документы
- ✅ Таблицы сравнений (до 5 строк), краткие списки
- ❌ Длинные примеры кода (более 5 строк)
- ❌ ASCII-зарисовки экранов
- ❌ Полные реализации классов

Особенности для Backend:
- ✅ Примеры API запросов/ответов допустимы
- ✅ Форматы JSON и структуры данных
- ❌ Полный код handlers и Pydantic моделей

**Правило:** Документация — это справочник концепций, не tutorial.

### Работа с Figma MCP

При любом обращении к Figma через MCP (получение дизайна, скриншотов, токенов, компонентов):

❗ **ОБЯЗАТЕЛЬНО прочитать `.memory_bank/mobile/ui/design_system_components.md` перед тем, как писать код по дизайну.**

Ключевые требования (подробнее в файле):
- Цвета брать **только** из `WFMColors.swift` / `WfmColors.kt` — они являются материализованной JSON-выгрузкой токенов
- Запрещено подбирать цвет визуально по скриншоту или Figma Inspect
- Если токен указан в Figma — использовать его как есть, не менять
- При любой неопределённости с токенами — **сообщить пользователю и уточнить**, не принимать решение самостоятельно

### Работа с ассетами из Figma

При добавлении иконок и изображений из Figma:

**ОБЯЗАТЕЛЬНО следуйте инструкции:** `.memory_bank/mobile/ui/figma_assets.md`

Основные правила:
- **Иконки** → экспортируем в **SVG** (масштабируются без потери качества)
- **Большие картинки/иллюстрации** → экспортируем в **PNG** (с поддержкой 1x/2x/3x для iOS)
- **iOS**: SVG иконки добавляются в Asset Catalog с `"template-rendering-intent": "original"` для цветных иконок или `"template"` для монохромных
- **Android**: SVG конвертируются в VectorDrawable через Android Studio
- Именование: `kebab-case` на iOS, `snake_case` на Android (иконки с префиксом `ic_`)

### iOS: Вынос флоу в отдельный модуль

Если пользователь хочет вынести флоу (авторизация, онбординг, профиль и т.д.) в отдельный Swift Package Manager фреймворк:

**ОБЯЗАТЕЛЬНО следуйте инструкции:** `.memory_bank/mobile/architecture/ios_module_extraction.md`

Эта инструкция содержит:
- Пошаговый процесс создания модуля
- Структуру папок и файлов
- Настройку DI контейнера
- Интеграцию в основное приложение
- Checklist для проверки
- Пример на основе WFMAuth модуля

### Android: Вынос фичи в отдельный модуль

Если пользователь хочет вынести фичу (авторизация, онбординг, профиль и т.д.) в отдельный Gradle модуль:

**ОБЯЗАТЕЛЬНО следуйте инструкции:** `.memory_bank/mobile/architecture/android_module_extraction.md`

Эта инструкция содержит:
- Пошаговый процесс создания Gradle модуля
- Структуру модуля (Clean Architecture)
- Настройку build.gradle.kts и AndroidManifest.xml
- Создание Koin DI модуля для фичи
- Создание Navigation Graph
- Интеграцию в основное приложение
- Checklist для проверки
- Пример структуры feature-auth модуля
- Типичные ошибки и их решения

## Управление планами

**ВАЖНО: При начале каждой сессии проверь папку `.memory_bank/plans/`**

### Структура папок
```
.memory_bank/
├── plans/              # Активные планы (в работе)
└── completed_plans/    # Выполненные планы (архив)
```

### Workflow работы с планами

1. **При старте сессии**:
   - Проверь наличие файлов в `.memory_bank/plans/`
   - Если есть незавершённые планы — предложи пользователю продолжить выполнение
   - Покажи список планов и их текущий статус

2. **Формат файла плана** (`.memory_bank/plans/{название}.md`):
   ```markdown
   # План: {Название}

   **Статус:** В работе
   **Создан:** {дата}
   **Последнее обновление:** {дата}

   ## Цель
   {Описание цели}

   ## Задачи

   - [ ] Задача 1
   - [ ] Задача 2
   - [x] Задача 3 — выполнено {дата}, {краткое описание если нужно}

   ## Лог выполнения

   ### {дата}
   - Выполнено: {что сделано}
   - Проблемы: {если были}
   ```

3. **При выполнении пункта**:
   - Поставь галочку `[x]` вместо `[ ]`
   - Добавь дату и краткое описание если нужно
   - Обнови "Последнее обновление" в шапке
   - Добавь запись в "Лог выполнения"

4. **При завершении плана**:
   - Измени статус на "Выполнено"
   - Добавь дату выполнения
   - Перемести файл из `plans/` в `completed_plans/`

### Пример проверки при старте

```
Claude проверяет .memory_bank/plans/:
→ Найден план: deep_link_telegram.md (3/5 задач выполнено)

"У тебя есть незавершённый план 'Deep Link для Telegram'.
Продолжить выполнение? Осталось 2 задачи."
```

## Язык документации

**Вся документация в проекте должна быть на русском языке.**

Полное описание правил и примеров см. в `.memory_bank/guides/lang.md`

Краткая выжимка:
- ✅ README файлы, комментарии в коде, Memory Bank документы - **на русском**
- ❌ Названия переменных/функций, технические термины, команды - **на английском**
- Подробности, примеры и исключения - в Memory Bank
