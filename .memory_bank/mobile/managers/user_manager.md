# UserManager — Управление данными пользователя (Mobile)

Документ описывает архитектуру и реализацию UserManager для мобильных приложений (iOS и Android).

**Связанные документы:**
- `.memory_bank/domain/user_roles.md` — доменная модель ролей и привилегий (ОБЯЗАТЕЛЬНО прочитать для контекста)
- `.memory_bank/backend/api_users.md` — API контракты для работы с пользователями (роли, привилегии, профили)

---

## 1. Обзор

**Проблема:** Согласно доменной модели (см. `.memory_bank/domain/user_roles.md`), пользователь может иметь одну из двух ролей: MANAGER или WORKER. Роль определяет, какие экраны и функции доступны пользователю. MANAGER видит панель управления, WORKER — список своих задач. Также необходимо хранить профильные данные пользователя (имя, email, телефон) для отображения в UI.

**Решение:** UserManager — компонент для управления данными текущего пользователя в мобильном приложении.

**Основные функции:**
- Загрузка данных пользователя с сервера при старте приложения (роль, профиль, привилегии, магазин)
- Хранение данных локально (StateFlow/Observable)
- Проверка наличия роли (isManager/isWorker)
- Условная навигация на основе роли
- Предоставление профильных данных для UI
- Очистка данных при logout

---

## 2. Архитектура

### Компоненты

```
┌─────────────────────────────────────────┐
│         Navigation / AppNavigation      │
│  (условная навигация на основе роли)    │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│           UserManager                   │
│  - loadCurrentRole()                    │
│  - refresh()                            │
│  - isManager(): Boolean                 │
│  - isWorker(): Boolean                  │
│  - clear()                              │
│  - currentUser: StateFlow<UserMe?>      │
└─────────┬──────────────────────────────┘
          │
┌─────────▼─────────┐
│   UserService     │
│   (API client)    │
│   GET /users/me   │
└───────────────────┘
```

---

## 3. API интеграция

UserManager использует endpoint `GET /users/me` для получения полных данных текущего пользователя.

**Формат ответа (модель UserMe):**
- `id` — UUID пользователя
- `phone` — телефон пользователя
- `first_name` — имя
- `last_name` — фамилия
- `email` — email (опционально)
- `photo_url` — URL фото профиля (опционально)
- `assignments` — массив назначений (каждое содержит `position.role`, объект `store`)
- `permissions` — массив привилегий (пустой для MANAGER, заполнен для WORKER)

**Подробнее:** `.memory_bank/backend/api_users.md`

---

## 4. Логика выбора текущего assignment

Пользователь может иметь несколько назначений (работа в разных магазинах с разными должностями). Приложение должно знать, какой assignment является "текущим" для определения роли, магазина и отображения правильной должности в UI.

**Workflow выбора assignment:**

1. **При загрузке пользователя (`loadCurrentRole`):**
   - Проверяется наличие сохраненного `selectedAssignmentId` в локальных преференсах (TokenStorage)
   - Если ID сохранен и найден в списке `user.assignments` — используется этот assignment
   - Если ID не сохранен или не найден в списке — выбирается первый assignment из списка
   - Выбранный assignment ID сохраняется в преференсах
   - `currentAssignment` StateFlow/@Published обновляется

2. **При переключении assignment пользователем (`switchAssignment`):**
   - Новый assignment ID сохраняется в преференсах
   - Вызывается `loadCurrentRole()` для перезагрузки данных
   - `currentAssignment` обновляется новым assignment

3. **При logout (`clear`):**
   - `selectedAssignmentId` удаляется из преференсов
   - `currentAssignment` сбрасывается в null

**Хранение:**
- **Android:** `TokenStorage.saveSelectedAssignmentId(Int)` → DataStore Preferences
- **iOS:** `TokenStorage.saveSelectedAssignmentId(Int)` → UserDefaults

**Использование в UI:**
- Везде используется `userManager.currentAssignment`, а не `user.assignments.first()`
- Роль определяется из `currentAssignment.position.role`
- Магазин — из `currentAssignment.store` (объект `Store` с полями `id`, `name`, `address`)
- Должность для отображения — из `currentAssignment.position.name`

**Важно:** `assignments.first()` используется только как fallback при первом выборе assignment, если ID не был сохранен. Во всех остальных случаях — только `currentAssignment`.

---

## 5. Реализация

### Android (Kotlin + Jetpack Compose)

**Расположение:** `app/src/main/java/com/wfm/core/managers/UserManager.kt`

**Технологии:**
- StateFlow для реактивного состояния
- Coroutines для асинхронных операций
- Koin для DI

**Основные методы:**
- `suspend fun loadCurrentRole()` — загружает данные пользователя с сервера, выбирает текущий assignment, обновляет StateFlow
- `suspend fun refresh()` — перезагружает данные пользователя
- `suspend fun switchAssignment(assignmentId: Int)` — переключает текущий assignment, сохраняет в преференсах, перезагружает данные
- `suspend fun getCurrentAssignment(): Assignment?` — получает текущий выбранный assignment
- `suspend fun checkShiftStatus()` — проверяет и обновляет текущую смену через ShiftsService
- `suspend fun openShift(planId: Int, assignmentId: Int?)` — открыть смену
- `suspend fun closeShift()` — закрыть смену
- `fun isManager(): Boolean` — проверяет, является ли пользователь управляющим
- `fun isWorker(): Boolean` — проверяет, является ли пользователь работником
- `suspend fun clear()` — очищает состояние при logout (включая selectedAssignmentId)

**Состояние:**
- `currentUser: StateFlow<UserMe?>` — данные текущего пользователя (null если не загружены)
- `currentAssignment: StateFlow<Assignment?>` — текущий выбранный assignment (null если не выбран)
- `currentShift: StateFlow<CurrentShift?>` — текущая смена пользователя (null если нет открытой смены)
- `isLoading: StateFlow<Boolean>` — индикатор загрузки
- `error: StateFlow<String?>` — сообщение об ошибке
- `roleNotAssigned: StateFlow<Boolean>` — флаг "роль не назначена" (для отображения специального экрана)

**DI регистрация:** `AppModule.kt`
- Singleton instance
- Инжектится UserService

---

### iOS (Swift + SwiftUI)

**Расположение:** `WFMCore/Managers/UserManager.swift`

**Технологии:**
- @Published properties для реактивного состояния
- async/await для асинхронных операций
- ObservableObject для интеграции со SwiftUI

**Основные методы:**
- `func loadCurrentRole() async` — загружает данные пользователя с сервера, выбирает текущий assignment
- `func refresh() async` — перезагружает данные пользователя
- `func switchAssignment(assignmentId: Int) async` — переключает текущий assignment, сохраняет в преференсах, перезагружает данные
- `func getCurrentAssignment() async -> Assignment?` — получает текущий выбранный assignment
- `func checkShiftStatus() async` — проверяет и обновляет текущую смену через ShiftsService
- `func openShift(planId: Int, assignmentId: Int?) async throws` — открыть смену
- `func closeShift() async throws` — закрыть смену
- `func isManager() -> Bool` — проверяет роль MANAGER
- `func isWorker() -> Bool` — проверяет роль WORKER
- `func clear() async` — очищает состояние (включая selectedAssignmentId)

**Состояние:**
- `@Published var currentUser: UserMe?` — данные текущего пользователя
- `@Published var currentAssignment: Assignment?` — текущий выбранный assignment (nil если не выбран)
- `@Published var currentShift: CurrentShift?` — текущая смена пользователя (nil если нет открытой смены)
- `@Published var isLoading: Bool` — индикатор загрузки
- `@Published var error: String?` — сообщение об ошибке
- `@Published var roleNotAssigned: Bool` — флаг "роль не назначена" (для отображения специального экрана)

---

## 6. Интеграция с навигацией

### Workflow при старте приложения

```
1. Пользователь успешно авторизуется
   ↓
2. TokenStorage сохраняет JWT токены
   ↓
3. Навигация показывает экран Loading
   ↓
4. UserManager.loadCurrentRole() вызывается
   ↓
5. Получен ответ от сервера:
   - Success: данные пользователя сохранены в currentUser
   - Error: установлен error state
   ↓
6. Условная навигация на основе роли:
   - MANAGER → ManagerDashboard
   - WORKER → MainTabs (главная с табами)
   - Error → MainTabs (временно, до деплоя API)
```

### Android Navigation

**Расположение:** `app/src/main/java/com/wfm/navigation/AppNavigation.kt`

**Логика:**
- Loading screen подписывается на `userManager.currentUser` и `userManager.error`
- При изменении данных пользователя → навигация на соответствующий экран
- При ошибке → временно навигация на MainTabs (fallback)
- Использует `LaunchedEffect` для реактивной навигации

---

### iOS Navigation

**Расположение:** `WFM/Navigation/AppCoordinator.swift`

**Логика:**
- Root view подписывается на `userManager.currentUser`
- При изменении данных пользователя → обновление navigation stack
- Использует `onChange` modifier для реактивной навигации

---

## 7. Использование в UI

### Условный доступ к функциям

**Принцип:** UI компоненты проверяют роль через `userManager.isManager()` или `userManager.isWorker()` для условного отображения элементов.

**Примеры использования:**
- Показать кнопку "Создать задачу" только для MANAGER
- Показать карточку "Управление работниками" только для MANAGER
- Фильтровать API запросы на основе роли (MANAGER видит все задачи магазина, WORKER только свои)
- Отобразить имя пользователя в заголовке: `userManager.currentUser.value?.firstName`

---

### Реактивность

**Android:**
- Используется `collectAsState()` для подписки на StateFlow
- UI автоматически перерисовывается при изменении роли

**iOS:**
- Используется `@StateObject` или `@EnvironmentObject` для UserManager
- SwiftUI автоматически обновляет view при изменении @Published свойств

---

## 8. Обработка ошибок

### Ошибки API

| Ошибка | Причина | Действие |
|--------|---------|----------|
| 401 Unauthorized | Невалидный токен | Logout, переход на Auth |
| 404 Not Found | Роль не назначена | Показать экран "Роль не назначена" |
| 403 Forbidden | Нет прав доступа | Показать ошибку |
| Network error | Нет интернета | **Временно**: переход на MainTabs; **Будущее**: показать retry screen |

### Временное решение (до деплоя API)

При ошибке загрузки данных пользователя приложение перенаправляет на экран MainTabs (WORKER), чтобы избежать бесконечной загрузки.

**TODO:** После деплоя backend с API пользователей — заменить на экран с сообщением об ошибке и кнопкой "Повторить".

---

## 9. Lifecycle

### При входе в приложение

```
1. После успешной авторизации
   ↓
2. UserManager.loadCurrentRole()
   ↓
3. Навигация на основе роли
```

### При logout

```
1. TokenStorage.clearTokens()
   ↓
2. UserManager.clear()
   ↓
3. Навигация на AuthScreen
```

---

## 10. Безопасность

### Проверка прав

- **Client-side:** UserManager проверяет роль перед отображением UI элементов (UX оптимизация)
- **Server-side:** Backend всегда проверяет права доступа при каждом API запросе (security enforcement)

### Кеширование

- Данные пользователя хранятся только в памяти (StateFlow/@Published)
- При перезапуске приложения данные загружаются заново с сервера
- Нет долговременного хранения (DataStore/UserDefaults не используются для профиля и роли)

---

## 11. Управление сменами

UserManager также отвечает за управление текущей сменой работника. Это упрощает интеграцию с другими компонентами (TasksListViewModel не нужна зависимость от ShiftsService).

### Методы работы со сменой

**`checkShiftStatus()`** — проверка и обновление текущей смены:
- Вызывает `GET /shifts/current?assignment_id={id}` через ShiftsService
- Обновляет `currentShift` StateFlow/@Published
- Не критично если смена не загружается — ошибка логируется, но не показывается пользователю
- Используется в TasksListViewModel при ошибках API для синхронизации состояния

**`openShift(planId: Int, assignmentId: Int?)`** — открытие смены:
- Вызывает `POST /shifts/open` через ShiftsService
- При успехе обновляет `currentShift`
- При ошибке бросает исключение — обработка на стороне вызывающего кода

**`closeShift()`** — закрытие смены:
- Вызывает `POST /shifts/close` через ShiftsService
- При успехе обновляет `currentShift`
- При ошибке бросает исключение — обработка на стороне вызывающего кода

### Использование в других компонентах

**TasksListViewModel:**
- Подписывается на `userManager.currentShift` для вычисления `hasOpenShift` (derived state)
- При ошибке загрузки задач вызывает `userManager.checkShiftStatus()` для синхронизации
- Использует `currentShift.assignmentId` для запроса задач

**HomeViewModel:**
- Использует `userManager.currentShift` для отображения информации о смене
- Вызывает `userManager.openShift()` / `closeShift()` для управления сменой

---

## 12. Паттерн координации для ViewModels

**Проблема:** ViewModel загружает данные, которые зависят от UserManager (например, `currentUser`, `currentShift`). Если UserManager еще не загрузил данные или произошла ошибка, ViewModel должен корректно синхронизироваться.

**Решение:** Единый 3-шаговый алгоритм координации.

### Алгоритм

**Шаг 1:** Проверить наличие данных
- Если `currentUser` и `currentShift` есть → загрузить данные
- Если данные загрузились успешно → завершить
- Если ошибка → перейти к шагу 2

**Шаг 2:** Синхронизация с UserManager
- Если UserManager загружается (`isLoading = true`) → ждать завершения
- Если UserManager не загружается → перезапросить `loadCurrentRole()`
- После завершения → проверить данные снова

**Шаг 3:** Загрузить данные с полученными данными
- Если данных все еще нет → показать Empty State
- Если данные есть → загрузить и показать

### Паттерн iOS

```swift
private func loadTasksInternal() async {
    // Отменяем предыдущую загрузку
    loadTasksTask?.cancel()

    // Шаг 1: Проверяем наличие данных
    if let currentUser = userManager.currentUser,
       let currentShift = userManager.currentShift,
       currentShift.status.isActive {
        let success = await loadTasksWithAssignment(currentShift.assignmentId)
        if success { return }
    }

    // Шаг 2: Синхронизация с UserManager
    if userManager.isLoading {
        while userManager.isLoading {
            try? await _Concurrency.Task.sleep(nanoseconds: 100_000_000) // 100ms
        }
    } else {
        await userManager.loadCurrentRole()
    }

    // Шаг 3: Проверяем данные снова
    guard userManager.currentUser != nil else {
        tasks = []
        return
    }

    guard let currentShift = userManager.currentShift,
          currentShift.status.isActive else {
        tasks = []
        return
    }

    await loadTasksWithAssignment(currentShift.assignmentId)
}
```

### Паттерн Android

```kotlin
private suspend fun loadTasksInternal() {
    // Отменяем предыдущую загрузку
    loadTasksJob?.cancel()

    // Шаг 1: Проверяем наличие данных
    if (userManager.currentUser.value != null &&
        userManager.currentShift.value != null &&
        userManager.currentShift.value?.status?.isActive() == true) {

        val success = loadTasksWithAssignment(userManager.currentShift.value!!.assignmentId)
        if (success) return
    }

    // Шаг 2: Синхронизация с UserManager
    if (userManager.isLoading.value) {
        while (userManager.isLoading.value) {
            delay(100) // 100ms
        }
    } else {
        userManager.loadCurrentRole()
    }

    // Шаг 3: Проверяем данные снова
    if (userManager.currentUser.value == null ||
        userManager.currentShift.value == null ||
        !userManager.currentShift.value!!.status.isActive()) {
        _uiState.value = UiState.Success(emptyList())
        return
    }

    loadTasksWithAssignment(userManager.currentShift.value!!.assignmentId)
}
```

### Когда использовать

✅ **Используй этот паттерн когда:**
- ViewModel загружает данные на основе `currentUser` или `currentShift`
- Данные критичны для работы экрана (без них нельзя загрузить основной контент)
- Нужна синхронизация с UserManager при ошибках

**Примеры:** TasksListViewModel, ManagerTasksListViewModel

### Ключевые правила

- ✅ Проверяй наличие данных у UserManager перед загрузкой
- ✅ При ошибке загрузки → синхронизируйся с UserManager
- ✅ Если UserManager загружается → жди завершения
- ✅ Если не загружается → перезапрашивай данные
- ✅ Возвращай `true`/`false` из метода загрузки для отслеживания успеха
- ✅ Отменяй предыдущий запрос перед новым (`cancel()`)

---

## 13. Итог

**Ключевые моменты:**
- ✅ UserManager — менеджер для управления данными текущего пользователя (профиль, роль, привилегии, смена, текущий assignment)
- ✅ Загружает данные с сервера (`GET /users/me`) при старте приложения
- ✅ Управляет выбором текущего assignment для пользователей с несколькими назначениями
- ✅ Сохраняет выбранный assignment ID в локальных преференсах
- ✅ Управляет текущей сменой работника через ShiftsService (checkShiftStatus, openShift, closeShift)
- ✅ Хранит данные в StateFlow (Android) или @Published (iOS)
- ✅ Предоставляет методы для проверки роли (isManager/isWorker)
- ✅ Предоставляет профильные данные (имя, email, телефон) для отображения в UI
- ✅ Предоставляет данные о текущем assignment (currentAssignment) для UI компонентов
- ✅ Предоставляет данные о текущей смене (currentShift) для других компонентов
- ✅ Интегрируется с навигацией для условной маршрутизации
- ✅ Очищает состояние (включая selectedAssignmentId) при logout


**Обоснование архитектуры:**
Согласно `.memory_bank/domain/user_roles.md`, у пользователя только одна роль (MANAGER или WORKER), роли взаимоисключающие. UserManager централизует всю информацию о пользователе в одном месте, избегая дублирования логики загрузки между разными компонентами.
