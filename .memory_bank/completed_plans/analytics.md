# План: Аналитика использования (Analytics)

**Статус:** Выполнено
**Создан:** 2026-03-17
**Завершён:** 2026-03-17
**Ветка:** `feature/analytics`
**Последнее обновление:** 2026-03-17

## Цель

Добавить аналитику использования в мобильные приложения (iOS + Android) на базе Firebase с архитектурой, позволяющей легко сменить провайдера. Задокументировать все события в `.memory_bank/analytics/` так, чтобы дизайнер/аналитик мог работать с данными самостоятельно.

## Задачи

### Документация (`.memory_bank/analytics/`)

- [x] `README.md` — обзор аналитической системы: архитектура, провайдер (Firebase), как добавлять события, для кого какой документ — выполнено 2026-03-17
- [x] `rules.md` — правила для разработчиков: когда и как добавлять события, обязательные события для экранов, **запрещённые данные (приватность)**, идентификация пользователя в Firebase и сопоставление с БД проекта — выполнено 2026-03-17
- [x] `mobile_events.md` — полный каталог всех событий из мобильного приложения (строгий реестр, обновляется при изменениях) — выполнено 2026-03-17
- [x] `task_events_backend.md` — описание типов событий аудит-лога задач (`task_events` в БД svc_tasks) — выполнено 2026-03-17
- [x] `firebase_guide.md` — руководство для аналитика/дизайнера: как смотреть события, строить воронки, сегменты в Firebase Console — выполнено 2026-03-17

### iOS — обёртка аналитики

- [x] Создать `AnalyticsService` протокол + `AnalyticsEvent` enum — `WFMApp/Core/Analytics/` — выполнено 2026-03-17
- [x] Реализовать `NoOpAnalyticsService` (заглушка) и `FirebaseAnalyticsService` — выполнено 2026-03-17
- [x] Добавить Firebase SDK через Xcode SPM + GoogleService-Info.plist — выполнено 2026-03-17
- [x] Зарегистрировать `AnalyticsService` в DI контейнере — выполнено 2026-03-17
- [x] Реализовать все события из `mobile_events.md` по экранам — выполнено 2026-03-17

### Android — обёртка аналитики

- [x] Создать `AnalyticsService` интерфейс + `AnalyticsEvent` sealed class — `core/analytics/` — выполнено 2026-03-17
- [x] Реализовать `NoOpAnalyticsService` и `FirebaseAnalyticsService` — выполнено 2026-03-17
- [x] Добавить Firebase SDK через Gradle + google-services.json — выполнено 2026-03-17
- [x] Зарегистрировать `AnalyticsService` в Koin — выполнено 2026-03-17
- [x] Реализовать все события из `mobile_events.md` по экранам — выполнено 2026-03-17

## Лог выполнения

### 2026-03-17
- Создана ветка `feature/analytics`
- Изучены: EventType в svc_tasks, структура экранов iOS/Android, Mobile стек
- Написан план
- Создана папка `.memory_bank/analytics/` с 5 документами: README, rules, mobile_events, task_events_backend, firebase_guide
- Обновлён `.memory_bank/README.md` (добавлен раздел analytics)
- iOS: реализован полный analytics layer (AnalyticsService, NoOpAnalyticsService, FirebaseAnalyticsService)
- iOS: аналитика внедрена во все ViewModels и Auth модуль через callback
- iOS: трекинг login_completed + setUser в ContentView после router.login()
- Android: реализован analytics layer (AnalyticsService interface + AnalyticsEvent sealed class, NoOpAnalyticsService, FirebaseAnalyticsService)
- Android: зарегистрирован в Koin appModule
- Android: аналитика внедрена во все ViewModels (HomeVM, TasksListVM, TaskDetailsVM, ManagerHomeVM, ManagerTasksListVM, SettingsVM)
- Android: onTrack callback добавлен в AuthViewModel, передаётся через authNavGraph
- Android: screen views трекаются через LaunchedEffect(Unit) в composables
- Android: loginCompleted + setUser трекаются в AppNavigation после загрузки роли
- Android: TaskReviewSheet — трекинг open/approve/reject через analyticsService параметр
