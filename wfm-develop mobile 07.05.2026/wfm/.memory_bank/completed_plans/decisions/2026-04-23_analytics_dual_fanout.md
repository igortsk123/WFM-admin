# ADR: Двойной fan-out аналитики — Firebase + Semetrics параллельно

**Дата:** 2026-04-23
**Режим:** FULL
**Owner:** Pavel Karpychev
**Review trigger:** Semetrics покрыл все use-case Firebase (Crashlytics, performance, A/B), либо Firebase стал недоступен/неприемлем по compliance, либо стоимость двойной отправки превысила пользу — тогда возможен полный переход на Semetrics или обратный откат.

## Контекст

WFM использовал Firebase Analytics во всех клиентах и не имел серверной аналитики вообще. Появилась потребность в собственной системе **Semetrics** (контроль над данными, кастомные дашборды, серверные события вроде `server_metrics` / `docker_container_event` / `api_error`, единая точка для бизнес-метрик из мобильных и backend). Полная замена Firebase разом — слишком рискованна: Firebase даёт Crashlytics и привычные funnel'ы, на которые завязаны существующие отчёты.

## Решение

События параллельно идут в Firebase **и** Semetrics через `CompositeAnalyticsService` (fan-out шина) на iOS, Android и backend — потому что это снимает риск ранней миграции (если Semetrics уронит данные/упадёт — Firebase продолжает писать), и позволяет поэтапно сравнивать данные двух систем на одном и том же потоке событий.

userId передаётся **per-event** в Semetrics SDK (а не глобально, как в Firebase), потому что таково ограничение SDK; `SemetricsAnalyticsService` хранит `currentUserId` локально и подставляет в каждый `track()`.

## Альтернативы

- **Только Firebase (статус-кво):** отвергнуто — нет контроля над хранением сырых событий, нельзя добавить серверные системные метрики (`server_metrics`, Docker events) в общий поток, дашборды ограничены возможностями Firebase Console.
- **Только Semetrics (полная замена):** отвергнуто на этом шаге — теряем Crashlytics, funnel'ы и привычные отчёты до того, как Semetrics проверен в продакшене на полном объёме событий. Откат после полной замены требует переинтеграции SDK во всех приложениях.
- **Событийная шина / message broker (Kafka, NATS) с раздачей на Firebase и Semetrics из бэкенда:** отвергнуто — для мобильных событий потребовало бы proxy-эндпоинт на бэкенде вместо прямого SDK, что добавляет latency, ломает офлайн-очередь Firebase SDK и удваивает trafic на наш бэкенд.
- **Один сервис с отправкой через REST в оба места из общего кода:** отвергнуто — SDK обоих провайдеров уже умеют офлайн-очередь, ретраи, батчинг и оптимизированную доставку; повторять это руками нерационально.

## Экономическое/архитектурное обоснование

- `CompositeAnalyticsService` — тривиальный fan-out (`services.forEach { $0.track(event) }`); добавление/удаление провайдера = одна строка в DI, без переделки кода вызывающих ViewModels.
- Маппинг `AnalyticsEvent → semetricsRepresentation` сделан как **отдельный** маппинг рядом с `firebaseRepresentation` — это сознательное дублирование: каждый сервис независим и может разойтись по схеме событий в будущем без ломания второго.
- На backend Semetrics SDK инициализируется в `lifespan` каждого сервиса (`svc_tasks`, `svc_users`, `svc_notifications`, `svc_monitoring`); общий middleware ловит 5xx → `api_error`. `svc_monitoring` дополнительно шлёт системные ряды (CPU/RAM/Disk + Docker events) — эти данные принципиально новые, в Firebase их не было.
- Firebase остаётся источником правды для funnel-отчётов на период миграции; Semetrics параллельно собирает копию для калибровки и построения собственных дашбордов.

## Принятые риски

- **Двойные расходы:** трафик SDK × 2, хранение и обработка в двух системах — оплачивается дважды.
- **Двойные маппинги событий:** при добавлении нового события (см. skill `add-analytics-event`) разработчик обязан описать его и для Firebase, и для Semetrics — забыть один из мапперов = тихая потеря данных в одной из систем.
- **Расхождение данных:** счётчики событий в Firebase и Semetrics могут расходиться (разные офлайн-очереди, разная политика ретраев, разные timezone'ы) — отчёты «по дням» из двух систем нельзя считать взаимозаменяемыми.
- **userId per-event на Semetrics — анти-паттерн SDK:** локально хранимый `currentUserId` может рассинхронизироваться при race condition между `setUser`/`resetUser` и `track`; на iOS поверх этого пришлось чинить баг в SDK (`shared` через computed property).
- **Порядок инициализации хрупок:** `SemetricsClient.configure()` обязан вызываться до создания `SemetricsAnalyticsService` (на iOS — в `DependencyContainer.init()`, не в `AppDelegate`; на Android — до `startKoin`). Перенос в неправильное место ломает аналитику молча.
- **Backend инициализация в `lifespan`:** требует, чтобы все сервисы использовали одинаковый паттерн (`app/core/analytics.py` singleton) — расхождение в одном сервисе = пропуск событий именно с него.

## Future hook

- `CompositeAnalyticsService` принимает `[AnalyticsService]` как массив — добавление третьего провайдера или, наоборот, отключение Firebase сводится к изменению списка в DI.
- Маппинг `semetricsRepresentation` физически отдельный от `firebaseRepresentation` — когда/если решим уйти от Firebase, маппинг Semetrics уже самодостаточен.
- На backend событийный поток Semetrics (`server_metrics`, `docker_container_event`, `task_*`, `user_login`, `api_error`) — это потенциальный источник для Δt-метрики (см. `.memory_bank/analytics/dt_metric.md`); поля событий заранее богаче, чем нужно сейчас, чтобы не пришлось расширять схему ретроспективно.

## Связанные документы

- Планы: `.memory_bank/completed_plans/semetrics_ios_integration.md`, `.memory_bank/completed_plans/semetrics_android_integration.md`, `.memory_bank/completed_plans/semetrics_backend_sdk.md`
- Документация: `.memory_bank/analytics/semetrics_guide.md`, `.memory_bank/analytics/dt_metric.md`
- iOS: `WFMApp/Core/Analytics/CompositeAnalyticsService.swift`, `SemetricsAnalyticsService.swift`, `FirebaseAnalyticsService.swift`, `WFMApp/Core/DI/AppConfiguration.swift`
- Android: `app/src/main/java/com/beyondviolet/wfm/core/analytics/CompositeAnalyticsService.kt`, `SemetricsAnalyticsService.kt`, `WFMApplication.kt`
- Backend: `backend/svc_*/app/core/analytics.py`, `backend/svc_monitoring/app/docker_events.py`, middleware `5xx → api_error` в `svc_tasks/svc_users/svc_notifications/app/main.py`
