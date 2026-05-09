# Аналитика WFM

Документация аналитической системы WFM. Папка содержит всё необходимое для разработчиков и аналитиков.

> **Для аналитика/дизайнера:** эту папку можно скопировать в отдельный проект с AI-ассистентом — он объяснит, как получить нужные данные, построить воронки и сегменты на основе этих документов.

---

## Архитектура

Аналитика разделена на три независимых источника:

| Источник | Провайдер | Что содержит |
|---|---|---|
| Мобильное приложение | Firebase Analytics + Semetrics | Действия пользователей в интерфейсе |
| Сервер (svc_monitoring + сервисы) | Semetrics | Метрики инфраструктуры, бизнес-события с бэкенда |
| Backend (svc_tasks) | PostgreSQL (таблица `task_events`) | Аудит-лог событий задач |

### Мобильная аналитика

Мобильные приложения (iOS, Android) отправляют события через единый интерфейс `AnalyticsService`. Все события уходят **параллельно** в двух провайдеров через `CompositeAnalyticsService`.

**GMS флейвор (iOS + Android GMS):**
```
Экран/ViewModel → AnalyticsService (протокол/интерфейс)
                        ↓
            CompositeAnalyticsService
            ↙                       ↘
FirebaseAnalyticsService    SemetricsAnalyticsService
```

**HMS флейвор (Android Huawei):**
```
Экран/ViewModel → AnalyticsService
                        ↓
            CompositeAnalyticsService
            ↙                       ↘
AppMetricaAnalyticsService  SemetricsAnalyticsService
```

Имена событий и параметры идентичны во всех провайдерах — добавлять новое событие нужно один раз в `AnalyticsEvent`, все сервисы подхватят его (но маппинг нужно прописать в каждом).

### Идентификация пользователя

При входе в приложение устанавливается `userId` = внутренний `user_id` из БД проекта (целое число).

- **Firebase:** `userId` + user property `user_role = "worker" | "manager"`
- **Semetrics:** `userId` передаётся как поле `user_id` в каждом событии (Semetrics не поддерживает глобальный userId, поэтому `SemetricsAnalyticsService` хранит его локально и добавляет к каждому вызову `track()`)

При выходе из приложения `userId` сбрасывается в обоих провайдерах.

Подробнее о работе с Firebase — в `firebase_guide.md`, о Semetrics — в `semetrics_guide.md`.

---

## Документы

| Файл | Для кого | Содержание |
|---|---|---|
| `rules.md` | Разработчик | Правила добавления событий, приватность, именование |
| `mobile_events.md` | Разработчик / Аналитик | Реестр Semetrics/Firebase событий мобильного приложения |
| `server_events.md` | Разработчик / Аналитик | Реестр Semetrics событий серверной части (инфра + бизнес) |
| `task_events_backend.md` | Разработчик | Аудит-лог задач в PostgreSQL (внутренний, не Semetrics) |
| `firebase_guide.md` | Аналитик / Дизайнер | Как смотреть данные и строить воронки в Firebase |
| `semetrics_guide.md` | Разработчик / Аналитик | Интеграция Semetrics SDK, архитектура, особенности |

---

## Реализация в коде

- **iOS:** `mobile/ios/WFMApp/Core/Analytics/`
- **Android:** `mobile/android/app/src/main/java/com/beyondviolet/wfm/core/analytics/`
