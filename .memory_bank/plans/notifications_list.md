# План: Экран списка уведомлений

**Статус:** Приостановлен
**Создан:** 2026-04-27
**Последнее обновление:** 2026-04-27

> ⏸ **Приостановлен.** Кнопка "Уведомления" в iOS Settings временно скрыта (TODO-комментарий).
> Код реализован, можно возобновить в любой момент.

---

## Цель

Добавить экран "Уведомления" в мобильное приложение (iOS → Android).
Кнопка входа — в разделе "Профиль" (Settings Tab).
Экран показывает все уведомления пользователя с индикацией прочитанности, фильтром "только сегодня" и пометкой прочитанным по тапу.

---

## Анализ бекенда (выполнено 2026-04-27)

### Что уже реализовано

**GET /notifications/list** — список уведомлений пользователя (только `visibility=USER`):
- Параметры: `is_read: bool | null`, `limit: int (50)`, `offset: int (0)`
- Возвращает: `notifications[]`, `total`, `unread_count`

**Поля `Notification`:** `id (UUID)`, `category`, `title`, `body`, `data (JSON)`, `is_read`, `read_at`, `created_at`

**Категории уведомлений:** `TASK_REVIEW`, `TASK_REJECTED`, `TASK_STATE_CHANGED`

**POST /notifications/{id}/read** — пометить как прочитанное (возвращает обновлённый объект)

**POST /notifications/read-all** — пометить все как прочитанные

**GET /notifications/unread-count** — счётчик непрочитанных

### Что нужно добавить на беке

Для фильтра "только сегодня": добавить параметр `date_from: datetime | null` в `GET /notifications/list`.
Без этого фильтр "только сегодня" при большом количестве уведомлений будет работать некорректно из-за пагинации.

---

## Задачи

### 1. Backend

- [x] Добавить параметр `date_from: Optional[datetime]` в `GET /notifications/list` — 2026-04-27, выполнено
- [ ] Проверить, что запрос `GET /notifications/list?date_from=2026-04-27T00:00:00` возвращает только сегодняшние уведомления

### 2. iOS — сервис и модель

- [x] Расширить `NotificationsAPIService` — добавить методы `fetchNotifications`, `fetchUnreadCount`, `markAsRead` — 2026-04-27
- [x] Добавить модели `NotificationItem`, `NotificationListData`, `UnreadCountData` в `NotificationsAPIService.swift` — 2026-04-27
- [x] Добавить `CodingKeys` для `snake_case` → `camelCase` — 2026-04-27

### 3. iOS — экран и ViewModel

- [x] Создать `NotificationsListViewModel.swift` в `WFMApp/Features/Notifications/` — 2026-04-27
- [x] Создать `NotificationsListView.swift` с `NotificationRow` — 2026-04-27
  - WFMChip для фильтра "Только сегодня"
  - Индикатор прочитанности: brand500 точка
  - Loading / Empty / List states, Pull-to-Refresh

### 4. iOS — интеграция в DI и Settings

- [x] Добавить `makeNotificationsListViewModel()` в `DependencyContainer.swift` — 2026-04-27
- [x] Добавить кнопку "Уведомления" в `SettingsView.swift`, `fullScreenCover` — 2026-04-27
- [ ] Добавить badge с количеством непрочитанных на кнопке "Уведомления" в Settings (требует `unreadCount` в `SettingsViewModel`)

### 5. Проверка iOS (после реализации)

- [ ] Проверить: список уведомлений загружается
- [ ] Проверить: фильтр "только сегодня" работает корректно
- [ ] Проверить: тап по непрочитанному уведомлению — точка исчезает (оптимистичное обновление)
- [ ] Проверить: Pull-to-Refresh обновляет список
- [ ] Проверить: Empty state когда уведомлений нет
- [ ] Проверить: badge с количеством непрочитанных в Settings

### 6. Android — сервис и модель

- [ ] Расширить `NotificationsApiService.kt` — добавить методы:
  - `suspend fun fetchNotifications(isRead: Boolean?, dateFrom: String?, limit: Int, offset: Int): NotificationListResponse`
  - `suspend fun markAsRead(notificationId: String): NotificationItem`
- [ ] Добавить data-классы `NotificationItem` и `NotificationListResponse` (Kotlinx Serialization)

### 7. Android — экран и ViewModel

- [ ] Создать `NotificationsListViewModel.kt` в `features/notifications/`
  - `StateFlow<UiState<List<NotificationItem>>> uiState`
  - `var filterTodayOnly: Boolean`
  - `fun loadNotifications()`, `fun refresh()`, `fun markAsRead(id: String)`
- [ ] Создать `NotificationsListScreen.kt` в `features/notifications/`
  - Scaffold с TopAppBar ("Уведомления" + кнопка назад с `rememberDebouncedClick`)
  - Тоггл/чип "Только сегодня"
  - `LazyColumn` со списком `NotificationRow`
  - `PullToRefreshBox` для pull-to-refresh
  - Loading / Empty / Error states
- [ ] Создать `NotificationRow` — ячейка:
  - Индикатор прочитанности (цветная точка), title, body, дата
  - `.clickableDebounced { onMarkAsRead(item.id) }`
- [ ] Добавить маршрут навигации в `AppNavigation.kt`
- [ ] Добавить кнопку "Уведомления" в `SettingsScreen.kt` с badge непрочитанных
- [ ] Добавить Koin DI для `NotificationsListViewModel` в `AppModule.kt`

### 8. Обновление Memory Bank

- [x] Обновить `.memory_bank/mobile/feature_settings/settings_screen.md` — добавлена кнопка "Уведомления" — 2026-04-27
- [x] Создать `.memory_bank/mobile/feature_notifications/notifications_list.md` — 2026-04-27
- [x] Создать `.memory_bank/backend/api_notifications.md` — полное описание API — 2026-04-27
- [ ] Обновить ссылки в `CLAUDE.md` — добавить `notifications_list.md` и `api_notifications.md`

---

## Лог выполнения

### 2026-04-27

- Анализ бекенда завершён: все нужные эндпоинты уже реализованы, нужно добавить только `date_from` для фильтра "сегодня"
- Составлен план: iOS первой (бек → iOS → проверка → Android)
- Backend: добавлен `date_from` параметр в `GET /notifications/list`
- iOS: реализован полный стек — модели, сервис, ViewModel, View, DI, интеграция в Settings
- Memory Bank: созданы `api_notifications.md`, `notifications_list.md`, обновлён `settings_screen.md`
- Осталось: badge с unreadCount в Settings, проверка iOS, затем Android
