# План: Аналитика стабильности сети

**Статус:** Выполнено
**Создан:** 2026-03-31
**Последнее обновление:** 2026-03-31

---

## Цель

Фиксировать для каждого HTTP-запроса метрики сети (время ответа, HTTP статус, тип ошибки) с привязкой к магазину (`store_id`). Это позволит доказательно разбирать жалобы: проблема на стороне клиента (плохой интернет) или деградация сервера, а также смотреть среднее время отклика в разрезе магазинов.

**Новый ивент:** `api_request_completed` — параметры: `path`, `method`, `http_status`, `duration_ms`, `store_id`, `is_error`, `error_type`

**Ключевые решения:**
- Мерить в `APIClient` / `ApiClient` на самом низком уровне (покрывает все типы запросов)
- `store_id` через `storeIdProvider: (() -> String?)?` — замыкание без циклической зависимости
- Не трекать: кэшированные ответы, запросы рефреша токена, WebSocket
- Нормализовать путь: UUID и числовые ID → `{id}` для группировки метрик

## Задачи

### iOS

- [x] Добавить ивент `ApiRequestCompleted` в `AnalyticsEvent` — выполнено 2026-03-31
- [x] Добавить маппинг `apiRequestCompleted` в `SemetricsAnalyticsService` — выполнено 2026-03-31
- [x] Добавить `analyticsService`, `storeIdProvider` и `normalizePath()` в `APIClient` — выполнено 2026-03-31
- [x] Добавить измерение времени и трекинг ивента в `perform()` — выполнено 2026-03-31
- [x] Прокинуть зависимости в `DependencyContainer`, установить `storeIdProvider` — выполнено 2026-03-31

### Android

- [x] Добавить `ApiRequestCompleted` в sealed class `AnalyticsEvent` — выполнено 2026-03-31
- [x] Добавить маппинг `ApiRequestCompleted` в `SemetricsAnalyticsService` — выполнено 2026-03-31
- [x] Добавить `analyticsService`, `storeIdProvider` и `normalizePath()` в `ApiClient` — выполнено 2026-03-31
- [x] Добавить измерение времени и трекинг в методы get/getDirect/post/postDirect/patch/patchDirect/postMultipart — выполнено 2026-03-31
- [x] Прокинуть зависимости в `AppModule` (Koin), установить `storeIdProvider` — выполнено 2026-03-31

### Memory Bank документация

- [x] Обновить `networking.md` — добавить раздел «Телеметрия сети» — выполнено 2026-03-31
- [x] Обновить `semetrics_guide.md` — добавить ивент `api_request_completed` — выполнено 2026-03-31

---

## Лог выполнения

### 2026-03-31

- Составлен план: изучена архитектура APIClient (iOS/Android), аналитики (Semetrics), UserManager
- Принято решение использовать `storeIdProvider` замыкание для избежания циклической зависимости
- Реализованы все задачи iOS и Android
- Обновлена документация Memory Bank
