# Semetrics — интеграция в WFM iOS

## Что такое Semetrics

Semetrics — платформа продуктовой аналитики с акцентом на семантический слой и AI-доступ к данным. WFM — первый клиент платформы. SDK: https://github.com/trombocit/semetrics-ios

## Архитектура интеграции (iOS)

События из WFM уходят параллельно в Firebase и Semetrics через `CompositeAnalyticsService`. Всё настроено на уровне `DependencyContainer` — остальной код приложения ничего не знает про конкретных провайдеров.

Ключевые файлы:
- `WFMApp/Core/Analytics/CompositeAnalyticsService.swift` — fan-out к обоим сервисам
- `WFMApp/Core/Analytics/SemetricsAnalyticsService.swift` — реализация под Semetrics
- `WFMApp/Core/DI/DependencyContainer.swift` — инициализация `SemetricsClient.configure()` + сборка `CompositeAnalyticsService`
- `WFMApp/Core/DI/AppConfiguration.swift` — `semetricsApiKey`, `semetricsEndpoint`

## Особенности SDK

**userId — per-event, не глобальный.** В отличие от Firebase, Semetrics принимает `userId` как поле каждого отдельного события. `SemetricsAnalyticsService` хранит текущий `userId: String?` локально и передаёт его в каждый вызов `track()`.

**Инициализация.** `SemetricsClient.configure()` должен быть вызван до первого `track()`. В WFM это делается в `DependencyContainer.init()` — до создания `SemetricsAnalyticsService`. Не переносить в AppDelegate: порядок выполнения относительно создания DependencyContainer не гарантирован.

**Очередь с персистентностью.** SDK буферизует события в UserDefaults и отправляет батчами по 50 штук каждые 5 секунд. При уходе в background и возврате в foreground — принудительный flush. События не теряются при перезапуске.

**Баг в SDK (исправлен).** Оригинальный SDK использовал `static var shared = { fatalError() }()`. В Swift getter такого свойства всегда запускает dispatch_once с инициализатором, даже если `configure()` уже записал значение. Исправлено на computed property с приватным `_shared: SemetricsClient?` в файле `SemetricsClient.swift` в репозитории SDK.

## Конфигурация

- **API ключ:** `sm_live_0925497d1bf44a9c8dd6b84288772648`
- **Endpoint:** `https://semetrics.ru/events` (батчи уходят на `/ingest/batch`)
- **SPM:** `https://github.com/trombocit/semetrics-ios`

## Имена событий

Имена событий и параметры идентичны Firebase (`snake_case`). Маппинг находится в `private extension AnalyticsEvent` в `SemetricsAnalyticsService.swift`. При добавлении нового события — обновлять оба файла (`FirebaseAnalyticsService` и `SemetricsAnalyticsService`).

## Событие `api_request_completed`

Телеметрия сети — трекается автоматически из `APIClient` / `ApiClient` для каждого HTTP-запроса.

| Параметр | Тип | Описание |
|----------|-----|---------|
| `path` | String | Нормализованный путь (`/tasks/{id}/start`) |
| `method` | String | `GET` / `POST` / `PATCH` |
| `http_status` | Int | HTTP статус (0 = сетевая ошибка) |
| `duration_ms` | Int | Время ответа, мс |
| `store_id` | String | ID магазина или `"unknown"` |
| `is_error` | Boolean | `true` для 5xx / таймаут / сетевая ошибка |
| `error_type` | String? | `"timeout"` / `"server_error"` / `"bad_gateway"` / `"network_error"` / `null` |

Подробнее: `.memory_bank/mobile/architecture/networking.md` → раздел "Телеметрия сети".

---

## Формат батча

`POST https://semetrics.ru/events/ingest/batch`

```json
{
  "events": [
    {
      "event_name": "task_start_tapped",
      "user_id": "42",
      "platform": "ios",
      "sdk_version": "0.1.0",
      "client_ts": "2026-03-30T10:00:00.000Z",
      "properties": {}
    }
  ]
}
```
