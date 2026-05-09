# План: События открытия и закрытия смены

**Статус:** Выполнено
**Создан:** 2026-04-03
**Последнее обновление:** 2026-04-03

## Цель
Отслеживать когда пользователь открывает и закрывает смену — для понимания паттернов работы со сменами и частоты этих действий в разрезе ролей.

## События

### shift_open_completed
- **Имя:** `shift_open_completed`
- **Параметры:** `shift_id: Int`, `role: String` (`"worker"` / `"manager"`)
- **Где трекать:** `HomeViewModel.openShift()` — после успешного `userManager.openShift()`

### shift_close_completed
- **Имя:** `shift_close_completed`
- **Параметры:** `shift_id: Int`, `role: String` (`"worker"` / `"manager"`)
- **Где трекать:** `HomeViewModel.openShift()` — после успешного `userManager.closeShift()`

## Задачи

### Документация
- [x] Обновить `mobile_events.md` — добавить события в реестр — выполнено 2026-04-03

### iOS
- [x] Добавить кейсы в `AnalyticsEvent` (AnalyticsService.swift)
- [x] Добавить маппинг в `FirebaseAnalyticsService.swift`
- [x] Добавить маппинг в `SemetricsAnalyticsService.swift`
- [x] Вызвать `analyticsService.track(...)` в `HomeViewModel.openShift()`

### Android
- [x] Добавить кейсы в `AnalyticsEvent` (AnalyticsService.kt)
- [x] Добавить маппинг в `FirebaseAnalyticsService.kt` (GMS)
- [x] Добавить маппинг в `HmsAnalyticsService.kt` (HMS)
- [x] Добавить маппинг в `SemetricsAnalyticsService.kt`
- [x] Вызвать `analyticsService.track(...)` в `HomeViewModel.openShift()`

## Лог выполнения
### 2026-04-03
- Составлен план
- Выполнена полная реализация: документация, iOS, Android (GMS + HMS + Semetrics)
