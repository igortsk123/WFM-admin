# Networking — API клиенты

Обёртки над URLSession (iOS) и Ktor (Android) для работы с backend API.

---

## Архитектура

**Слои:**
1. **APIClient / ApiClient** — базовый HTTP клиент с авторизацией и обработкой ошибок
2. **Services** (TasksService, ShiftsService, UsersService) — доменные сервисы, использующие APIClient
3. **ViewModels** — вызывают методы Services

**Файлы:**
- iOS: `WFMApp/Core/Networking/APIClient.swift`
- Android: `app/src/main/java/com/beyondviolet/wfm/core/network/ApiClient.kt`

---

## APIClient / ApiClient

### Инициализация

**iOS:**
```swift
let apiClient = APIClient(baseURL: URL(string: "https://api.example.com")!)
```

**Android:**
```kotlin
val apiClient = ApiClient(baseURL = "https://api.example.com")
```

### Авторизация

- Автоматически добавляет `Authorization: Bearer {token}` ко всем запросам
- Токен берётся из `TokenStorage.getAccessToken()`
- iOS: `.setValue(token, forHTTPHeaderField: "Authorization")`
- Android: `headers.append("Authorization", "Bearer $token")`

### Хидер X-Auth-By (Impersonation)

Добавляется **только** если разработчик активировал режим «Войти как». Подробнее: `.memory_bank/domain/auth/impersonation.md`.

- Хидер: `X-Auth-By: <phone_number>`
- Хранение номера: iOS — `UserDefaults`, Android — `DataStore`
- Backend игнорирует хидер, если у пользователя нет `flags.dev = true` в JWT

### Обработка HTTP статус-кодов

**Все запросы проверяют HTTP статус перед парсингом ответа:**

| Статус | Обработка | Возвращаемая ошибка |
|--------|-----------|---------------------|
| 200-299 | OK, парсинг ответа | — |
| 401 | Unauthorized | `ApiResponse.Error("unauthorized", "Необходима авторизация")` |
| 502 | Bad Gateway | `ApiResponse.Error("server_update", "Обновление сервера")` |
| 500-599 | Server Error | `ApiResponse.Error("server_error", "Ошибка на сервере")` |
| Другое | Unknown Error | `ApiResponse.Error("unknown_error", "Неизвестная ошибка (Статус: {code})")` |

**Метод проверки (iOS):**
```swift
private func checkHttpStatus(_ statusCode: Int) -> ApiResponse<T>.Error? {
    switch statusCode {
    case 200...299:
        return nil  // OK
    case 401:
        return .init(code: "unauthorized", message: "Необходима авторизация")
    case 502:
        return .init(code: "server_update", message: "Обновление сервера")
    case 500...599:
        return .init(code: "server_error", message: "Ошибка на сервере")
    default:
        return .init(code: "unknown_error", message: "Неизвестная ошибка (Статус: \(statusCode))")
    }
}
```

**Метод проверки (Android):**
```kotlin
@PublishedApi
internal fun checkHttpStatus(response: HttpResponse): ApiResponse.Error? {
    return when (response.status.value) {
        in 200..299 -> null  // OK
        401 -> ApiResponse.Error("unauthorized", "Необходима авторизация")
        502 -> ApiResponse.Error("server_update", "Обновление сервера")
        in 500..599 -> ApiResponse.Error("server_error", "Ошибка на сервере")
        else -> ApiResponse.Error("unknown_error", "Неизвестная ошибка (Статус: ${response.status.value})")
    }
}
```

**Вызов проверки:**
- Вызывается **перед** парсингом ответа в каждом методе (get, post, patch, delete)
- Если статус не 200-299, возвращается ошибка без попытки парсинга

### Методы

#### GET запрос

**iOS:**
```swift
func get<T: Codable>(_ path: String) async -> ApiResponse<T>
```

**Android:**
```kotlin
suspend inline fun <reified T> get(path: String): ApiResponse<T>
```

**Использование:**
```swift
// iOS
let response: ApiResponse<[Task]> = await apiClient.get("/tasks/my")
```

```kotlin
// Android
val response: ApiResponse<List<Task>> = apiClient.get("/tasks/my")
```

#### POST запрос

**iOS:**
```swift
func post<T: Codable, B: Codable>(_ path: String, body: B) async -> ApiResponse<T>
```

**Android:**
```kotlin
suspend inline fun <reified T, reified B> post(path: String, body: B): ApiResponse<T>
```

#### PATCH запрос

**iOS:**
```swift
func patch<T: Codable, B: Codable>(_ path: String, body: B) async -> ApiResponse<T>
```

**Android:**
```kotlin
suspend inline fun <reified T, reified B> patch(path: String, body: B): ApiResponse<T>
```

#### DELETE запрос

**iOS:**
```swift
func delete<T: Codable>(_ path: String) async -> ApiResponse<T>
```

**Android:**
```kotlin
suspend inline fun <reified T> delete(path: String): ApiResponse<T>
```

### ApiResponse / ServerResponseError

Обёртка для ответов с двумя вариантами: Success и Error.

**iOS:**
```swift
enum ApiResponse<T> {
    case success(T)
    case error(ServerResponseError)
}

struct ServerResponseError {
    let code: String
    let message: String?

    // Проверка на конкретный тип ошибки
    func isError(_ errorCode: BVErrorCode) -> Bool

    // Извлекает UUID активной задачи из CONFLICT ошибки
    // Парсит: "У сотрудника уже есть активная задача: {uuid}"
    var activeTaskId: String?
}
```

**Android:**
```kotlin
sealed class ApiResponse<out T> {
    data class Success<T>(
        val data: T,
        val isCached: Boolean = false  // true если данные из кэша
    ) : ApiResponse<T>()

    data class Error(
        val code: String,
        val message: String
    ) : ApiResponse<Nothing>() {
        // Определяет сетевые ошибки (timeout, DNS, connection)
        fun isNetworkError(): Boolean

        // Определяет нужно ли показывать ошибку пользователю
        fun shouldShowToUser(): Boolean = !isNetworkError()

        // Извлекает UUID активной задачи из CONFLICT ошибки
        // Парсит: "У сотрудника уже есть активная задача: {uuid}"
        val activeTaskId: String?
    }
}
```

**Использование:**
```swift
// iOS
let response = await apiClient.get<[Task]>("/tasks/my")
switch response {
case .success(let tasks):
    // Обработка данных
case .error(let code, let message):
    // Обработка ошибки
}
```

```kotlin
// Android
val response = apiClient.get<List<Task>>("/tasks/my")
when (response) {
    is ApiResponse.Success -> {
        // Обработка данных
    }
    is ApiResponse.Error -> {
        // Обработка ошибки
    }
}
```

### Поддержка nullable/optional типов

APIClient/ApiClient поддерживает nullable/optional типы в Success ответах. Это полезно для эндпоинтов, которые могут вернуть `data: null` в случае успеха (например, при поиске ресурса который может отсутствовать).

**iOS:**
```swift
let response: ApiResponse<Resource?> = await service.getResource(id: id)
switch response {
case .success(let resource):
    // resource может быть nil - это валидный Success ответ
    if let resource = resource {
        // Ресурс найден
    } else {
        // Ресурс не найден (но это не ошибка)
    }
case .error(let code, let message):
    // Ошибка сети или сервера
}
```

**Android:**
```kotlin
val response: ApiResponse<Resource?> = service.getResource(id)
when (response) {
    is ApiResponse.Success -> {
        val resource = response.data  // может быть null
        if (resource != null) {
            // Ресурс найден
        } else {
            // Ресурс не найден (но это не ошибка)
        }
    }
    is ApiResponse.Error -> {
        // Ошибка сети или сервера
    }
}
```

**Логика обработки:**
- Если тип T nullable/optional и data == null → `ApiResponse.Success(null)`
- Если тип T НЕ nullable и data == null → `ApiResponse.Error("empty_data", "...")`

**Реализация (iOS):**
```swift
if let responseData = bvResponse.data {
    return responseData
} else {
    // Проверяем является ли T опциональным
    if isOptionalType(T.self) {
        return Optional<Any>.none as! T
    } else {
        throw APIError.invalidResponse
    }
}
```

**Реализация (Android):**
```kotlin
if (serverResponse.data != null) {
    ApiResponse.Success(serverResponse.data)
} else {
    // Проверяем является ли T nullable
    if (null is T) {
        @Suppress("UNCHECKED_CAST")
        ApiResponse.Success(null as T)
    } else {
        ApiResponse.Error("empty_data", "Data field is null for non-nullable type")
    }
}
```

---

## Services

Доменные сервисы инкапсулируют бизнес-логику работы с API и используют APIClient для запросов.

### Структура

**Каждый Service:**
- Принимает `APIClient` / `ApiClient` через DI
- Предоставляет типизированные методы для работы с конкретным доменом
- Обрабатывает специфичные для домена ошибки

**Примеры:**
- `TasksService` — работа с задачами (`/tasks/*`)
- `ShiftsService` — работа со сменами (`/shifts/*`)
- `UsersService` — работа с пользователями (`/users/*`)

### Пример: TasksService

**iOS:**
```swift
class TasksService {
    private let apiClient: APIClient

    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    func getMyTasks(assignmentId: UUID, state: TaskState? = nil) async -> ApiResponse<[Task]> {
        var queryItems = [URLQueryItem(name: "assignment_id", value: assignmentId.uuidString)]
        if let state = state {
            queryItems.append(URLQueryItem(name: "state", value: state.rawValue))
        }

        let path = "/tasks/my?" + queryItems.map { "\($0.name)=\($0.value ?? "")" }.joined(separator: "&")
        let response: ApiResponse<TasksResponse> = await apiClient.get(path)

        switch response {
        case .success(let data):
            return .success(data.tasks)
        case .error(let code, let message):
            return .error(code: code, message: message)
        }
    }
}
```

**Android:**
```kotlin
class TasksService(private val apiClient: ApiClient) {
    suspend fun getMyTasks(assignmentId: String, state: TaskState? = null): ApiResponse<List<Task>> {
        val queryParams = buildString {
            append("?assignment_id=$assignmentId")
            state?.let { append("&state=${it.name}") }
        }

        val response: ApiResponse<TasksResponse> = apiClient.get("/tasks/my$queryParams")

        return when (response) {
            is ApiResponse.Success -> ApiResponse.Success(response.data.tasks)
            is ApiResponse.Error -> response
        }
    }
}
```

---

## Обработка ошибок в ViewModels

**Рекомендуемый паттерн:**

1. Вызвать метод Service
2. Обработать `ApiResponse.Success` — обновить UI state
3. Обработать `ApiResponse.Error`:
   - Проверить `code` для специфичных ошибок
   - Показать toast с `message`
   - Обновить UI state (например, показать Error state)

**Пример (iOS):**
```swift
func loadTasks() async {
    isLoading = true

    let response = await tasksService.getMyTasks(assignmentId: assignmentId)

    switch response {
    case .success(let tasks):
        self.tasks = tasks
        isLoading = false

    case .error(let code, let message):
        if code == "unauthorized" {
            // Перенаправить на экран авторизации
        } else {
            toastManager.show(message: message, type: .error)
        }
        isLoading = false
    }
}
```

**Пример (Android):**
```kotlin
fun loadTasks() {
    viewModelScope.launch {
        _uiState.value = TasksListUiState.Loading

        val response = tasksService.getMyTasks(assignmentId = assignmentId)

        when (response) {
            is ApiResponse.Success -> {
                _allTasks.value = response.data
                _uiState.value = TasksListUiState.Success
            }

            is ApiResponse.Error -> {
                if (response.code == "unauthorized") {
                    // Перенаправить на экран авторизации
                } else {
                    toastManager.show(response.message, isError = true)
                }
                _uiState.value = TasksListUiState.Error
            }
        }
    }
}
```

---

## HTTP Кэширование

Система поддерживает HTTP кэширование с паттерном **stale-while-revalidate**:
1. Если есть кэш → возвращает данные немедленно
2. Делает запрос к серверу в фоне
3. Обновляет кэш и UI

**Преимущества:**
- Мгновенная отрисовка (данные из кэша)
- Актуальные данные (автоматическое обновление)
- Offline-режим (работа без интернета)

### Краткий пример

**iOS (AsyncStream):**
```swift
let stream = tasksService.getMyTasks(assignmentId: assignmentId)

for await result in stream {
    switch result {
    case .cached(let tasks):
        self.tasks = tasks  // Показать из кэша
    case .fresh(let tasks):
        self.tasks = tasks  // Обновить свежими данными
    case .error(let error):
        // Обработка ошибки
    }
}
```

**Android (Flow):**
```kotlin
tasksService.getMyTasks(assignmentId).collect { response ->
    when (response) {
        is ApiResponse.Success -> {
            _tasks.value = response.data
            // response.isCached показывает источник
        }
        is ApiResponse.Error -> {
            // Обработка ошибки
        }
    }
}
```

**📖 Полная документация:** `.memory_bank/mobile/architecture/caching.md`
- Параметры кэша (TTL, размеры)
- Request Cancellation (обязательно!)
- Обработка ошибок
- Best practices

---

---

## Телеметрия сети

APIClient/ApiClient автоматически трекает каждый завершённый HTTP-запрос через `AnalyticsService`.

### Событие `api_request_completed`

| Параметр | Тип | Описание |
|----------|-----|---------|
| `path` | String | Нормализованный путь (`/tasks/{id}/start`) |
| `method` | String | HTTP метод (`GET`, `POST`, `PATCH`) |
| `http_status` | Int | HTTP статус (0 = сетевая ошибка / таймаут) |
| `duration_ms` | Int | Время ответа в миллисекундах |
| `store_id` | String | ID магазина или `"unknown"` до авторизации |
| `is_error` | Boolean | `true` для 5xx, таймаутов, сетевых ошибок |
| `error_type` | String? | `"timeout"` / `"server_error"` / `"bad_gateway"` / `"network_error"` / `null` |

### Нормализация пути

UUID и числовые ID в путях заменяются на `{id}` для группировки:
- `/tasks/550e8400.../start` → `/tasks/{id}/start`
- `/shifts/123` → `/shifts/{id}`

Реализовано в `normalizePath()` / `normalizePath()` через regex.

### Паттерн storeIdProvider

`APIClient` создаётся до `UserManager` — прямая зависимость создала бы цикл. Решение: замыкание `storeIdProvider: (() -> String?)?`, устанавливаемое из `DependencyContainer` / `AppModule` после создания обоих объектов.

- iOS: `nonisolated(unsafe) var storeIdProvider` (доступен без `await`)
- Android: `var storeIdProvider: (() -> String?)?`, разрешает `UserManager` лениво через Koin `getOrNull<UserManager>()`

До авторизации возвращает `nil/null` → `store_id = "unknown"`.

### Что НЕ трекается

- Кэшированные ответы (первый эмит `getCached()`) — не сетевой запрос
- Запросы обновления токена (`/oauth/token/`) — не идут через основные методы клиента
- WebSocket соединения (другой протокол)
- `postForm` / `postFormFullUrl` — auth-флоу

---

## Связанные документы

- **HTTP Кэширование:** `.memory_bank/mobile/architecture/caching.md` — полная документация по кэшу
- **TokenStorage:** `.memory_bank/mobile/managers/token_storage.md`
- **iOS Stack:** `.memory_bank/mobile/architecture/ios_stack.md`
- **Android Stack:** `.memory_bank/mobile/architecture/android_stack.md`
- **API Endpoints:** `.memory_bank/backend/apis/` (api_tasks.md, api_shifts.md, api_users.md)
- **Аналитика:** `.memory_bank/analytics/semetrics_guide.md`
