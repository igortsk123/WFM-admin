# План: Расширение параметров task_start_tapped и task_complete_submitted

**Статус:** Выполнено
**Создан:** 2026-04-03
**Последнее обновление:** 2026-04-03

## Цель
Добавить контекст задачи к событиям старта и завершения — чтобы аналитика показывала по каким задачам (тип, ID, расписание) пользователи совершают действия.

## Задачи

### Документация
- [x] Обновить `mobile_events.md` — выполнено 2026-04-03

### iOS
- [x] Обновить кейс `taskStartTapped` в `AnalyticsService.swift`
- [x] Обновить кейс `taskCompleteSubmitted` в `AnalyticsService.swift`
- [x] Обновить маппинг в `FirebaseAnalyticsService.swift`
- [x] Обновить маппинг в `SemetricsAnalyticsService.swift`
- [x] Обновить вызовы `track(...)` в `TaskDetailViewModel.swift` (startTask, completeTask, completeTaskWithPhoto)

### Android
- [x] Обновить `TaskStartTapped` в `AnalyticsService.kt` (data object → data class)
- [x] Обновить `TaskCompleteSubmitted` в `AnalyticsService.kt`
- [x] Обновить маппинг в `FirebaseAnalyticsService.kt` (GMS)
- [x] Обновить маппинг в `HmsAnalyticsService.kt` (HMS)
- [x] Обновить маппинг в `SemetricsAnalyticsService.kt`
- [x] Обновить вызовы `track(...)` в `TaskDetailsViewModel.kt` (startTask, completeTask, completeTaskWithPhoto)

## Лог выполнения
### 2026-04-03
- Составлен план
- Реализовано полностью: iOS (3 файла аналитики + ViewModel), Android (4 файла аналитики + ViewModel)
