# WFM Memory Bank

Добро пожаловать в Memory Bank проекта **WFM** — централизованный источник знаний для команд backend, mobile, web и AI-агентов.

Здесь собрано всё, что нужно:
- доменные модели,
- описания сервисов,
- API-контракты,
- сценарии поведения.

Memory Bank служит:
1. **источником правды** для всех команд,
2. базой для генерации кода (SwiftUI, Compose, FastAPI, React),
3. опорой для AI-ассистентов (Claude / ChatGPT),
4. инструментом для согласования фич между web/mobile/backend.

---

## Что внутри

### 📄 product_roadmap.md
**Куда идёт продукт — роадмап M0–M6 и архитектурные импликации.**
Стратегическое видение, 7 микропроектов, гейты, и — самое важное —
почему `task_events`, `work_types`, `acceptance_policy` нельзя срезать.
Читать при принятии любых архитектурных решений.

### 📄 product_brief.md
**Описание продукта с точки зрения бизнеса.**
Бизнес-цели, целевая аудитория, конкурентные отличия, ключевые функции WFM.
Обязательно к прочтению для понимания контекста разработки.

### 📁 domain/
Единая доменная модель WFM.
- `task_model.md` — **модель задачи (Task), типы задач (PLANNED/ADDITIONAL), система отчётов**
- `task_states.md` — состояния задач и переходы между ними
- `user_model.md` — модель пользователя
- `user_roles.md` — **система ролей (MANAGER/WORKER), привилегии работников (CASHIER, SALES_FLOOR, WAREHOUSE, SELF_CHECKOUT)**
- `shift_model.md` — модель смен (плановые и фактические)
- `auth/auth_flow.md` — **сценарии авторизации и регистрации, диаграммы состояний**
- `auth/auth_validation.md` — **правила валидации (телефон, код, поля регистрации, таймеры)**
- `auth/impersonation.md` — логин под другим пользователем (для поддержки)

### 📁 backend/
Описание backend инфраструктуры, сервисов и API.

#### 📁 backend/services/
Описания микросервисов:
- `shared.md` — **общий модуль (формат ответов API, exception handlers, JWT аутентификация)**
- `svc_tasks.md` — сервис задач (также обслуживает shifts API)
- `svc_users.md` — сервис пользователей
- `svc_notifications.md` — сервис уведомлений (WebSocket, FCM/HMS, preferences)
- `svc_monitoring.md` — сервис мониторинга хоста и Docker (in-memory state + WS канал к ESP32 + приём 5xx ошибок; параллельно шлёт события в Semetrics)
- `svc_shifts.md` — ~~сервис смен~~ (устарел: объединён с svc_tasks 2026-03-12)

#### 📁 backend/apis/
API контракты:
- `api_tasks.md` — **API endpoints для работы с задачами**
- `api_users.md` — **API endpoints для работы с пользователями**
- `api_roles.md` — **API endpoints для работы с ролями и привилегиями**
- `api_shifts.md` — **API endpoints для работы со сменами**
- `api_notifications.md` — **API endpoints для уведомлений (list, read, WebSocket, FCM tokens)**
- `api_monitoring.md` — **API endpoints svc_monitoring (state, WS events, /internal/errors)**
- `external/api_bv.md` — Auth API от Beyond Violet (OAuth2 провайдер)
- `external/api_lama.md` — интеграция с LAMA API (синхронизация задач)

#### 📁 backend/patterns/
Паттерны и стандарты:
- `api_response_format.md` — **стандартный формат ответов API**
- `service_endpoints.md` — **стандарт служебных endpoints (/health, /)**
- `inter_service_communication.md` — **межсервисное взаимодействие (HTTP через Docker-сеть)**

#### 📁 backend/guides/
Руководства по разработке и деплою:
- `cicd.md` — **CI/CD pipeline (GitVerse, Docker Registry, Watchtower)**
- `nginx.md` — **конфигурация nginx reverse proxy**
- `token_validation.md` — **валидация JWT токенов (RS256, Beyond Violet)**
- `database_migrations.md` — **миграции БД (Alembic): правила, workflow, именование**
- `partners.md` — работа с партнёрскими пользователями

### 📁 web/
Документация для веб-платформ.

#### 📁 web/admin/
- `tech_stack.md` — рекомендации по стеку веб-админки (Next.js, shadcn/ui)

> **PWA:** наработки по PWA-версии приложения перенесены в `/exps/pwa/` (апрель 2026).
> Код, документация и план реализации сохранены там для возможного возобновления.

### 📁 mobile/
Требования к архитектуре мобильных приложений (iOS + Android).

#### 📁 mobile/architecture/
- `app_structure.md` — **структура приложения, Tab Bar, DI, точка входа**
- `networking.md` — **API клиенты, Services, обработка ошибок**
- `caching.md` — HTTP кеширование (stale-while-revalidate)
- `request_cancellation.md` — **решение проблем с отменой запросов**
- `ios_stack.md` — стек iOS (Swift, SwiftUI, SPM)
- `android_stack.md` — стек Android (Kotlin, Compose, Koin)
- `ios_module_extraction.md` — вынос фичи в Swift Package Manager модуль
- `android_module_extraction.md` — вынос фичи в Gradle модуль
- `navigation.md` — навигация Android (Navigation Compose)
- `screen_orientation.md` — блокировка ориентации экрана
- `multi_platform_builds.md` — мультиплатформенные сборки

#### 📁 mobile/managers/
- `user_manager.md` — **менеджер данных пользователя (профиль, роль, привилегии)**
- `token_storage.md` — **хранение и автоматическое обновление JWT токенов**
- `bottom_sheet_manager.md` — менеджер BottomSheet

#### 📁 mobile/ui/
- `design_system_components.md` — **компоненты дизайн-системы (цвета, кнопки, поля)**
- `ui_patterns.md` — **UI паттерны (Pull-to-Refresh, Loading/Empty/Error, Environment Keys)**
- `bottomsheet.md` — правила использования BottomSheet
- `figma_assets.md` — **правила экспорта ассетов из Figma**
- `toast.md` — компонент Toast / WFMToast
- `color_generation.md` — генерация цветовых токенов

#### 📁 mobile/utilities/
- `click_debouncer.md` — **Android: защита от двойных кликов на навигационных кнопках**
- `image_compression.md` — сжатие изображений перед отправкой
- `time_date_formatting.md` — форматирование времени, дат, длительностей
- `shift_time_calculator.md` — расчёт времени смены
- `crashlytics.md` — Firebase Crashlytics

#### 📁 mobile/feature_*/
Документация по конкретным фичам:
- `feature_auth/` — экраны авторизации
- `feature_home/` — главный экран работника
- `feature_tasks/` — экраны задач работника (список, детали, ShiftInfoBlock)
- `feature_managerhome/` — главный экран управляющего
- `feature_managertasks/` — экраны задач управляющего (список, фильтры)
- `feature_notifications/` — WebSocket и push-уведомления
- `feature_settings/` — экран профиля и настроек

### 📁 device/
Физический ESP32-монитор инфраструктуры. Прошивка лежит в `backend/svc_monitoring/firmware/` (PlatformIO + Arduino). Серверная сторона — `backend/svc_monitoring/`.
- `README.md` — зачем нужно устройство, два сценария использования (pocket / desk), общие принципы
- `hardware_specs.md` — характеристики устройств (тестовая платформа и целевой AMOLED)
- `JC4827W543N_specs.md` — полная спецификация активного устройства
- `display_design_brief.md` — визуальные правила и раскладки секций dashboard
- `ws_protocol.md` — **формат WS-сообщений `state`/`alert` (источник правды контракта)**
- `design_handoff/` — прототипы дизайна (HTML + JSX) от Claude Design

### 📁 analytics/
Аналитика использования — документация для разработчиков и аналитиков.

- `README.md` — обзор системы аналитики, архитектура, Firebase + Semetrics
- `rules.md` — **правила для разработчиков**: когда и как добавлять события
- `mobile_events.md` — **полный реестр событий** мобильного приложения
- `task_events_backend.md` — типы событий аудит-лога задач (`task_events` в БД); раздел «Покрытие потребностей аналитики» — что уже даёт схема без реструктуризации
- `dt_metric.md` — **концепт метрики Δt** (длительность управленческого цикла); не реализована, зафиксированы определение и источники данных
- `firebase_guide.md` — руководство по Firebase Console для аналитиков
- `semetrics_guide.md` — интеграция Semetrics (iOS + Android)

### 📁 strategy/
Архитектурные обоснования и политики, которые объясняют **почему** текущие решения именно такие. Не план реализации, не roadmap — справочник.

- `theoretical_foundation.md` — модель EIM (S→I→D→T→E→F→L) и Δt как опора для будущих аналитических слоёв; связь с текущей моделью данных
- `ai_oversight_policy.md` — политика человеческого надзора над AI: матрица «что AI / что человек», чеклист до мерджа AI-фич
- `decision_modes.md` — режимы работы FAST / STANDARD / FULL и маппинг на типичные задачи WFM
- `decision_record.md` — формат ADR (Decision Record) для архитектурных решений

### 📁 guides/
Общие рекомендации и стандарты разработки:
- `documentation_style.md` — **стиль написания документации Memory Bank**
- `lang.md` — правила написания документации (русский язык)
- `github_mirror.md` — зеркалирование репозитория в GitHub

### 📁 patterns/
Паттерны и общие решения:
- `security_hcaptcha.md` — интеграция hCaptcha для защиты от ботов

### 📁 plans/ / completed_plans/
Активные и выполненные планы разработки.
- `plans/` — текущие планы (в работе)
- `completed_plans/` — архив выполненных планов
- `completed_plans/decisions/` — **ADR (Architecture Decision Records)** для FULL-режима: 17 решений по сервисам, доменной модели, интеграциям, инфраструктуре. Формат и правила — в `strategy/decision_record.md`.

---

## Принципы Memory Bank

- **Минимум сложности, максимум пользы.**
  Пока модель упрощена, позже расширится.

- **Одно место правды.**
  Фронт, бэкенд и мобильные не расходятся в терминологии.

- **Платформенная нейтральность.**
  Единая доменная модель для всех платформ.

- **Экологичность решений.**
  Мы избегаем перегрузки команд, делаем только то, что даёт ценность.

---
