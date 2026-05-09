# Экран "Уведомления" (Notifications List)

## Назначение

Экран списка уведомлений пользователя. Доступен из раздела "Профиль" (Settings Tab).
Показывает все уведомления с индикацией прочитанности; тап помечает уведомление прочитанным.

**Статус:** В работе (iOS реализован, Android — в плане)

## Точка входа

Кнопка "Уведомления" в `SettingsView` / `SettingsScreen` — первая в списке действий.
Открывается через `fullScreenCover` (iOS) / навигацию (Android).

## Функциональность

- **Полный список** уведомлений пользователя (`GET /notifications/list`)
- **Индикатор прочитанности** — фиолетовая точка (brand500) слева у непрочитанных
- **Тап по ячейке** — оптимистично помечает непрочитанное уведомление прочитанным (`POST /{id}/read`)
- **Фильтр "Только сегодня"** — чип (WFMChip), при активации передаёт `date_from` равный началу текущего дня (UTC)
- **Pull-to-Refresh** — обновляет список
- **Empty state** — разный текст для фильтра и полного списка

## Формат ячейки уведомления

- Фиолетовая точка слева (brand500) — для непрочитанных, прозрачная для прочитанных
- `title` (body14Bold), `body` (body14Regular, textSecondary)
- Дата/время справа (body12Regular, textSecondary): "HH:mm" (сегодня), "вчера", "d MMM"
- Фон ячейки: `surfaceBase` (одинаковый для прочитанных и непрочитанных)
- Разделитель: `borderSecondary`, отступ слева 36pt (от начала контента)

## API

- `GET /notifications/list?limit=50&offset=0[&date_from=ISO8601]`
- `POST /notifications/{id}/read`

Подробнее: `.memory_bank/backend/api_notifications.md`

## Паттерны реализации

- **ViewModel:** `@Published notifications`, `isLoading`, `filterTodayOnly`
- **Оптимистичное обновление:** при тапе точка исчезает немедленно, откат при ошибке
- **Pull-to-Refresh:** `refresh()` не трогает `isLoading` (iOS паттерн)
- **date_from:** `Calendar.current.startOfDay(for: Date())` при активном фильтре

## Файлы

**iOS:**
- View: `WFMApp/Features/Notifications/NotificationsListView.swift`
- ViewModel: `WFMApp/Features/Notifications/NotificationsListViewModel.swift`
- Сервис: `WFMApp/Core/Notifications/NotificationsAPIService.swift` (расширен методами fetchNotifications, fetchUnreadCount, markAsRead)
- DI: `makeNotificationsListViewModel()` в `DependencyContainer`

**Android:** планируется в `features/notifications/`

## Связанные документы

- **Settings экран:** `.memory_bank/mobile/feature_settings/settings_screen.md`
- **API бекенда:** `.memory_bank/backend/api_notifications.md`
- **WebSocket:** `.memory_bank/mobile/feature_notifications/notifications_websocket.md`
