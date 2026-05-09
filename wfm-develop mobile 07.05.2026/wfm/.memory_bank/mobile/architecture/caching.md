# HTTP Кэширование

Полная документация по работе с HTTP кэшем в мобильных приложениях.

**Базовая информация:** См. также `.memory_bank/mobile/architecture/networking.md` для общей архитектуры API клиентов.

**📖 КОМПЛЕКСНОЕ РЕШЕНИЕ REQUEST CANCELLATION:** `.memory_bank/mobile/architecture/request_cancellation.md`

Этот документ описывает HTTP кэширование. Для полного решения проблем с отменой запросов (cancelled errors) см. `request_cancellation.md` — там описаны ВСЕ паттерны работы с Task/Job cancellation, isRefreshing флагами, и координацией между onAppear/refreshable.

---

## Паттерн: Stale-While-Revalidate

Система использует паттерн **stale-while-revalidate** для оптимизации UX:

1. **Проверка кэша** — если есть валидный кэш → возвращаем немедленно
2. **Запрос к серверу** — делаем запрос в фоне параллельно
3. **Обновление кэша** — сохраняем свежие данные
4. **Возврат свежих данных** — обновляем UI

**Преимущества:**
- Мгновенная отрисовка (данные из кэша)
- Актуальные данные (автоматическое обновление с сервера)
- Offline-режим (работа без интернета на кэше)

---

## Параметры кэша

### TTL (Time-To-Live)
- **Время жизни:** 7 дней
- **Проверка:** При каждом чтении из кэша
- **Истёкший кэш:** Автоматически удаляется и запрашивается заново

### Размеры кэша

**iOS:**
- In-memory: 50 МБ (NSCache)
- Disk: 100 МБ (FileManager)

**Android:**
- In-memory: без ограничений (ConcurrentHashMap)
- Disk: 50 МБ (File)

### Генерация ключа

Ключ кэша = `path + sorted_query_params`

**Примеры:**
- `/tasks/my?assignment_id=123&state=NEW`
- `/tasks/abc123` (без query params)

Query параметры сортируются для нормализации ключа.

---

## Использование

### iOS: AsyncStream<CachedResult<T>>

**getCached возвращает AsyncStream с тремя типами результатов:**

```swift
func loadTasks() async {
    isLoading = true

    let stream = tasksService.getMyTasks(assignmentId: assignmentId, state: filterState)

    for await result in stream {
        switch result {
        case .cached(let loadedTasks):
            // 1. Данные из кэша - показываем немедленно
            tasks = loadedTasks
            isLoading = false

        case .fresh(let loadedTasks):
            // 2. Свежие данные с сервера - обновляем UI
            tasks = loadedTasks

        case .error(let error):
            // 3. Ошибка обновления (кэш уже показан если был)
            if tasks.isEmpty {
                // Кэша не было - показываем ошибку
                toastManager.show(message: error.localizedDescription, state: .error)
            } else if error.shouldShowToUser {
                // Кэш был, критичная ошибка - показываем
                toastManager.show(message: error.localizedDescription, state: .error)
            }
            // Сетевую ошибку игнорируем если есть кэш
        }
    }
}
```

**CachedResult enum:**
```swift
enum CachedResult<T> {
    case cached(T)      // Данные из кэша
    case fresh(T)       // Свежие данные с сервера
    case error(Error)   // Ошибка загрузки
}
```

### Android: Flow<ApiResponse<T>>

**getCached возвращает Flow с флагом isCached:**

```kotlin
fun loadTasks() {
    viewModelScope.launch {
        tasksService.getMyTasks(assignmentId, _filterState.value).collect { response ->
            when (response) {
                is ApiResponse.Success -> {
                    val allTasks = response.data
                    _allTasks.value = allTasks
                    _uiState.value = TasksListUiState.Success(filteredTasks)

                    if (response.isCached) {
                        // 1. Данные из кэша - убираем лоадер
                        // isLoading уже false после первого Success
                    }
                    // 2. Свежие данные - UI автоматически обновляется через StateFlow
                }

                is ApiResponse.Error -> {
                    // 3. Ошибка обновления (кэш уже показан если был)
                    if (_allTasks.value.isEmpty()) {
                        // Кэша не было - показываем ошибку
                        toastManager.show(response.message, state = WfmToastState.ERROR)
                    } else if (response.shouldShowToUser()) {
                        // Кэш был, критичная ошибка - показываем
                        toastManager.show(response.message, state = WfmToastState.ERROR)
                    }
                    // Сетевую ошибку игнорируем если есть кэш
                }
            }
        }
    }
}
```

**ApiResponse.Success с полем isCached:**
```kotlin
data class Success<T>(
    val data: T,
    val isCached: Boolean = false  // true если из кэша
) : ApiResponse<T>()
```

---

## Ручная запись в кэш (updateCache)

В `APIClient` (iOS) и `ApiClient` (Android) есть метод `updateCache`, позволяющий записать произвольное значение под ключом GET-запроса. Это **не паттерн** — применяется только там, где программист явно решил это сделать.

**Метод:**
- **iOS:** `apiClient.updateCache(path: String, value: T) async` — в `APIClient` (actor)
- **Android:** `apiClient.updateCache(path: String, value: T)` — в `ApiClient` (inline reified)

**Ключ:** совпадает с ключом `getCached(path:)` без query params.

**Где применяется сейчас:**
- `TasksService` — методы `startTask`, `pauseTask`, `resumeTask`, `completeTask`, `completeTaskWithPhoto` записывают ответ сервера в кэш `GET /tasks/{id}`. Это нужно чтобы при выходе с экрана деталей задачи и повторном входе кэш сразу отдавал актуальное состояние задачи, а не предыдущее.

**Когда добавлять в новых местах:** только по явному решению — например, когда POST/PATCH возвращает полный объект и важно чтобы следующий GET-запрос сразу видел актуальные данные без сетевого запроса.

---

## Request Cancellation (обязательно!)

### Проблема: Race Condition

При использовании stale-while-revalidate возникает race condition если пользователь делает несколько быстрых обновлений:

```
1. Pull-to-refresh #1 → cached_data_1, затем fresh_data_1
2. Pull-to-refresh #2 → cached_data_2, затем fresh_data_2
3. fresh_data_1 приходит ПОСЛЕ fresh_data_2
4. UI показывает устаревшие данные!
```

### Решение: Task/Job Cancellation

**При каждом новом запросе отменяем предыдущий:**

#### iOS (Swift + async/await)

```swift
class TasksListViewModel: ObservableObject {
    // Храним ссылку на текущую задачу загрузки
    private var loadTasksTask: _Concurrency.Task<Void, Never>?

    private func loadTasksInternal() async {
        // 1. Отменяем предыдущую загрузку
        loadTasksTask?.cancel()

        let stream = tasksService.getMyTasks(...)

        // 2. Создаём новую задачу и сохраняем ссылку
        loadTasksTask = _Concurrency.Task {
            for await result in stream {
                // Обработка cached/fresh/error
            }
        }

        // 3. Ждём завершения задачи
        await loadTasksTask?.value
    }
}
```

#### Android (Kotlin + Coroutines)

```kotlin
class TasksListViewModel(...) : ViewModel() {
    // Храним ссылку на текущий Job загрузки
    private var loadTasksJob: Job? = null

    private suspend fun loadTasksInternal() {
        // 1. Отменяем предыдущую загрузку
        loadTasksJob?.cancel()

        // 2. Создаём новый Job и сохраняем ссылку
        loadTasksJob = viewModelScope.launch {
            tasksService.getMyTasks(...).collect { response ->
                // Обработка Success/Error
            }
        }

        // 3. Ждём завершения Job
        loadTasksJob?.join()
    }
}
```

### Где применять

**Обязательно** для всех методов, которые:

1. ✅ Используют AsyncStream (iOS) или Flow (Android) с кэшированием
2. ✅ Могут быть вызваны повторно до завершения предыдущего вызова
3. ✅ Обновляют UI state (@Published / StateFlow)

**Примеры:**
- `loadTasks()` - pull-to-refresh, фильтры, смена табов
- `loadTask(id)` - refresh деталей задачи
- `loadEmployees()` - фильтры сотрудников
- `loadFilters()` - обновление доступных фильтров

### Как работает

#### iOS: Task.cancel()

- Отменяет Task и все child tasks
- `for await` loop прекращает итерацию
- `await task?.value` ждёт завершения (даже если отменён)
- **Не блокирует UI** — функция помечена `async`

#### Android: Job.cancel()

- Отменяет coroutine и все child coroutines
- `.collect {}` прекращает сбор элементов Flow
- `job?.join()` ждёт завершения (даже если отменён)
- **Не блокирует UI** — функция помечена `suspend`, выполняется в viewModelScope

### Checklist

При добавлении нового ViewModel с кэшированием:

- [ ] Добавлена переменная `loadXxxTask` (iOS) или `loadXxxJob` (Android)
- [ ] В начале метода: `loadXxxTask?.cancel()` / `loadXxxJob?.cancel()`
- [ ] Stream/Flow обёрнут: `loadXxxTask = _Concurrency.Task { ... }` / `loadXxxJob = launch { ... }`
- [ ] В конце метода: `await loadXxxTask?.value` / `loadXxxJob?.join()`

---

## Предотвращение отмены запросов в Pull-to-Refresh (iOS)

### Проблема: Автоматическая отмена Task при изменении View

При использовании `.refreshable` или `.task` в SwiftUI возникает проблема автоматической отмены Task:

1. Пользователь инициирует Pull-to-Refresh
2. ViewModel загружает данные, обновляет `@Published` свойства
3. Изменения `@Published` триггерят `objectWillChange` в ViewModel
4. SwiftUI ре-рендерит View
5. **SwiftUI автоматически отменяет Task** из `.refreshable` / `.task`
6. Запрос отменяется с ошибкой "отменено"

**Когда проявляется:**
- Pull-to-Refresh в `.refreshable { await viewModel.refresh() }`
- Обновление данных в `ShiftCardView.onRefresh { Task { await viewModel.refresh() } }`
- Любой асинхронный вызов внутри `.task { }` который изменяет @Published во время выполнения

### Решение: Task.detached

Используйте `Task.detached` для создания Task, который **не наследует отмену** от родительского контекста:

**iOS:**
```swift
.refreshable {
    // ❌ НЕ используйте обычный Task - отменится при изменении View
    // await viewModel.refreshData()

    // ✅ Используйте Task.detached
    await Task.detached { @MainActor in
        await viewModel.refreshData()
    }.value
}

// Для callback-style refresh:
onRefresh: {
    Task.detached { @MainActor in
        await viewModel.refreshData()
    }
}
```

**Ключевые моменты:**
- `Task.detached` создает полностью независимый Task
- Не отменяется при ре-рендере View
- Требует явного указания `@MainActor` для вызова методов ViewModel
- `.value` для ожидания завершения Task (в `.refreshable`)
- Без `.value` для fire-and-forget callback (в `onRefresh`)

### Дополнительная защита: .id() на TabView

Добавьте `.id()` модификаторы к TabView для предотвращения их пересоздания при ре-рендере родителя:

```swift
MainTabView()
    .id("worker-tab-view")
```

Это предотвращает отмену `.task` при изменении `@Published` свойств в родительских View.

### Где применять

**Обязательно** для:
- ✅ Pull-to-Refresh в экранах с UserManager (Home, Manager Home, Settings)
- ✅ Callback `onRefresh` в карточках смены
- ✅ Любые асинхронные вызовы, которые изменяют @Published во время выполнения

**Не нужно** для:
- ❌ Обычные button actions (не внутри .refreshable)
- ❌ Android (на Android используется другой подход через viewModelScope)

---

## Когда использовать кэширование

### ✅ Используйте getCached для

- **Списки задач** — getMyTasks(), getTasksList()
- **Детали задачи** — getTask(id)
- **Данные пользователя** — getCurrentUser()
- **Фильтры и справочники** — getTaskListFilters(), getTaskListUsers()
- **Информация о сменах** — getCurrentShift()
- **Любые GET запросы** где актуальны устаревшие данные на несколько секунд

### ❌ НЕ используйте для

- **POST/PATCH/DELETE запросов** — кэш только для GET
- **Мутирующие операции** — создание, обновление, удаление
- **Критичные данные real-time** — требующие абсолютной актуальности
- **Авторизация и токены** — используйте TokenStorage

---

## Обработка ошибок

### Определение типа ошибки

**Зачем:** Не показывать пользователю сетевые ошибки если есть кэш (работаем offline).

#### iOS

```swift
extension Error {
    var isNetworkError: Bool {
        if let urlError = self as? URLError {
            switch urlError.code {
            case .timedOut, .cannotFindHost, .cannotConnectToHost,
                 .networkConnectionLost, .dnsLookupFailed:
                return true
            default:
                return false
            }
        }
        return false
    }

    var shouldShowToUser: Bool {
        return !isNetworkError
    }
}
```

#### Android

```kotlin
fun ApiResponse.Error.isNetworkError(): Boolean {
    return when {
        message.contains("timeout", ignoreCase = true) -> true
        message.contains("UnknownHost", ignoreCase = true) -> true
        message.contains("Connection refused", ignoreCase = true) -> true
        message.contains("Network is unreachable", ignoreCase = true) -> true
        else -> false
    }
}

fun ApiResponse.Error.shouldShowToUser(): Boolean = !isNetworkError()
```

### Правила отображения ошибок

1. **Кэша не было + любая ошибка** → показываем Toast
2. **Кэш был + критичная ошибка (не сетевая)** → показываем Toast
3. **Кэш был + сетевая ошибка** → НЕ показываем (работаем offline)

**Пример (iOS):**
```swift
case .error(let error):
    if tasks.isEmpty {
        // Кэша не было - показываем любую ошибку
        toastManager.show(message: error.localizedDescription, state: .error)
    } else if error.shouldShowToUser {
        // Кэш был, но это критичная ошибка (не сетевая) - показываем
        toastManager.show(message: error.localizedDescription, state: .error)
    }
    // Сетевую ошибку не показываем если есть кэш
```

**Пример (Android):**
```kotlin
is ApiResponse.Error -> {
    if (_allTasks.value.isEmpty()) {
        // Кэша не было - показываем любую ошибку
        toastManager.show(response.message, state = WfmToastState.ERROR)
    } else if (response.shouldShowToUser()) {
        // Кэш был, но это критичная ошибка - показываем
        toastManager.show(response.message, state = WfmToastState.ERROR)
    }
    // Сетевую ошибку не показываем если есть кэш
}
```

### Обработка ошибок десериализации

**Проблема:** При обновлении моделей данных (добавление/удаление полей) старый кэш становится невалидным.

**Решение:** CacheManager автоматически удаляет устаревший кэш при `DecodingError` / `SerializationException`.

#### iOS

```swift
do {
    return try JSONDecoder().decode(T.self, from: entry.data)
} catch is DecodingError {
    // Схема данных изменилась - удаляем из кэша
    logger.warning("⚠️ Schema changed, clearing cache for: \(key)")
    memoryCache.removeObject(forKey: key as NSString)
    try? FileManager.default.removeItem(at: fileURL)
    return nil
} catch {
    // Другие ошибки (например IO) - не удаляем кэш
    logger.error("❌ Failed to decode: \(error)")
    return nil
}
```

#### Android

```kotlin
try {
    Json.decodeFromString<T>(entry.data)
} catch (e: kotlinx.serialization.SerializationException) {
    // Схема данных изменилась - удаляем из кэша
    Log.w(TAG, "⚠️ Schema changed, clearing cache for: $key")
    memoryCache.remove(key)
    cacheFile.delete()
    null
} catch (e: Exception) {
    // Другие ошибки - не удаляем кэш
    Log.e(TAG, "❌ Failed to decode: ${e.message}")
    null
}
```

**Правило:** Удаляем кэш **только** при ошибках десериализации (схема изменилась), при других ошибках (IO, сеть) — оставляем кэш.

---

## Очистка кэша

### iOS

```swift
await apiClient.clearCache()
```

Удаляет весь кэш (memory + disk).

### Android

```kotlin
apiClient.clearCache()
```

Удаляет весь кэш (memory + disk).

**Когда использовать:**
- При логауте пользователя
- При смене assignment (магазина)
- При критичных ошибках данных

---

## Реализация

### iOS

**Файлы:**
- `Core/Networking/CacheManager.swift` — управление кэшем
- `Core/Networking/APIClient.swift` — метод getCached()

**Технологии:**
- In-memory: NSCache
- Disk: FileManager
- Serialization: JSONEncoder/JSONDecoder

### Android

**Файлы:**
- `core/network/CacheManager.kt` — управление кэшем
- `core/network/ApiClient.kt` — метод getCached()

**Технологии:**
- In-memory: ConcurrentHashMap
- Disk: File API
- Serialization: kotlinx.serialization

---

## Связанные документы

- **Networking:** `.memory_bank/mobile/architecture/networking.md` — базовая архитектура API
- **UI Patterns:** `.memory_bank/mobile/ui/ui_patterns.md` — Pull-to-Refresh паттерн
- **iOS Stack:** `.memory_bank/mobile/architecture/ios_stack.md`
- **Android Stack:** `.memory_bank/mobile/architecture/android_stack.md`
