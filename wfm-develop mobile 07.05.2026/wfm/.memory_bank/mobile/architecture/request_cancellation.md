# Request Cancellation — единый паттерн для iOS и Android

Этот документ описывает единый универсальный паттерн работы с запросами на iOS и Android без ошибок "cancelled".

**Проблема:** Запросы отменяются при загрузке данных или pull-to-refresh → пользователь видит ошибки.

**Решение:** Используй единый паттерн Task/Job cancellation для всех экранов.

---

## iOS: Единый паттерн для всех экранов

**Используй для:** Любого экрана с загрузкой данных (с HTTP кэшем или без).

**Примеры:** TasksListView, SettingsView, HomeView, ManagerTasksListView, ManagerHomeView

### ViewModel

```swift
class TasksListViewModel: ObservableObject {
    @Published var tasks: [Task] = []
    @Published var isLoading = false

    // Храним Task для отмены предыдущих запросов
    private var loadTasksTask: _Concurrency.Task<Void, Never>?

    func loadTasks() async {
        // Отменяем предыдущую загрузку
        loadTasksTask?.cancel()

        isLoading = true

        loadTasksTask = _Concurrency.Task {
            // Вариант 1: С HTTP кэшем (AsyncStream)
            let stream = tasksService.getMyTasks(assignmentId: assignmentId)

            for await result in stream {
                switch result {
                case .cached(let cachedTasks):
                    tasks = cachedTasks
                    isLoading = false

                case .fresh(let freshTasks):
                    tasks = freshTasks

                case .error(let error):
                    // Игнорируем CancellationError
                    if error is CancellationError { break }

                    if tasks.isEmpty {
                        toastManager.show(message: error.localizedDescription, state: .error)
                    }
                }
            }

            // Вариант 2: Без HTTP кэша (обычный async throws)
            // await userManager.refresh()
            //
            // if let error = userManager.error {
            //     if currentUser == nil {
            //         toastManager.show(message: error, state: .error)
            //     }
            // }
        }

        await loadTasksTask?.value
        isLoading = false
    }

    func refresh() async {
        await loadTasks()
    }
}
```

### View

```swift
ScrollView {
    // контент
}
.task {
    await viewModel.loadTasks()
}
.refreshable {
    await viewModel.refresh()
}
```

### Ключевые правила

- ✅ Всегда используй `.task` для загрузки данных
- ✅ Всегда используй `.refreshable` для pull-to-refresh
- ✅ Создай поле: `private var loadTask: _Concurrency.Task<Void, Never>?`
- ✅ Отменяй предыдущий запрос: `loadTask?.cancel()`
- ✅ Оборачивай в Task: `loadTask = _Concurrency.Task { ... }`
- ✅ Жди завершения: `await loadTask?.value`
- ✅ Игнорируй CancellationError при использовании AsyncStream: `if error is CancellationError { break }`
- ✅ Метод `refresh()` просто вызывает основной метод загрузки: `await loadTasks()`

### Отличия Service с кэшем и без кэша

**С HTTP кэшем (stale-while-revalidate):**
```swift
// Service возвращает AsyncStream
func getMyTasks() -> AsyncStream<CachedResult<[Task]>> {
    return await apiClient.getCached(path: "/tasks/my")
}

// ViewModel обрабатывает stream
let stream = tasksService.getMyTasks()
for await result in stream {
    switch result {
    case .cached(let data): // кэш
    case .fresh(let data):  // свежие данные
    case .error(let error): // ошибка
    }
}
```

**Без HTTP кэша (обычный async/await):**
```swift
// Service возвращает обычный async throws
func getMe() async throws -> UserMe {
    return try await apiClient.get(path: "/users/me")
}

// ViewModel вызывает напрямую
await userManager.refresh() // внутри вызывает userService.getMe()

if let error = userManager.error {
    toastManager.show(message: error, state: .error)
}
```

**Оба варианта используют одинаковый паттерн в View** — `.task` + `.refreshable` + Task cancellation.

---

## Android: Единый паттерн для всех экранов

**Используй для:** Любого экрана с загрузкой данных.

**Примеры:** TasksListViewModel, ManagerTasksListViewModel, SettingsViewModel

### ViewModel

```kotlin
class TasksListViewModel(
    private val tasksService: TasksService,
    private val toastManager: ToastManager
) : ViewModel() {

    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val _allTasks = MutableStateFlow<List<Task>>(emptyList())

    // Храним Job для отмены предыдущих запросов
    private var loadTasksJob: Job? = null

    fun loadTasks() {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            loadTasksInternal()
        }
    }

    fun refresh() {
        viewModelScope.launch {
            try {
                _isRefreshing.value = true
                loadTasksInternal()
            } finally {
                delay(200)  // UI обработает состояние
                _isRefreshing.value = false
            }
        }
    }

    private suspend fun loadTasksInternal() {
        // Отменяем предыдущую загрузку
        loadTasksJob?.cancel()

        val assignmentId = userManager.getCurrentAssignment()?.id ?: return

        loadTasksJob = viewModelScope.launch {
            tasksService.getMyTasks(assignmentId, filterState).collect { response ->
                when (response) {
                    is ApiResponse.Success -> {
                        _allTasks.value = response.data
                        _uiState.value = UiState.Success(response.data)
                    }

                    is ApiResponse.Error -> {
                        if (_allTasks.value.isEmpty()) {
                            toastManager.show(response.message, state = WfmToastState.ERROR)
                        } else if (response.shouldShowToUser()) {
                            toastManager.show(response.message, state = WfmToastState.ERROR)
                        }
                    }
                }
            }
        }

        loadTasksJob?.join()
    }
}
```

### Composable

```kotlin
@Composable
fun TasksListScreen(viewModel: TasksListViewModel) {
    val uiState by viewModel.uiState.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadTasks()
    }

    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = { viewModel.refresh() },
        modifier = Modifier.fillMaxSize()
    ) {
        // контент
    }
}
```

### Ключевые правила

- ✅ Создай поле: `private var loadJob: Job? = null`
- ✅ Отменяй предыдущий запрос: `loadJob?.cancel()`
- ✅ Оборачивай в launch: `loadJob = viewModelScope.launch { ... }`
- ✅ Жди завершения: `loadJob?.join()`
- ✅ Используй `finally` для сброса `isRefreshing`
- ✅ `viewModelScope.launch` автоматически отменяется при onCleared()
- ✅ Используй `LaunchedEffect(Unit)` для первой загрузки

---

## Последовательная загрузка нескольких ресурсов

**Используй когда:** Экран работает с несколькими независимыми ресурсами.

**Пример:** ManagerTasksListViewModel (filters, tasks)

### Логика загрузки

**При создании ViewModel (init):**
```swift
init(...) {
    _Concurrency.Task {
        await loadFilters()
        await loadTasks()
    }
}
```

**При входе на экран (onAppear / LaunchedEffect):**
```swift
.task {
    await viewModel.loadTasks()  // Только задачи
}
```

**Pull-to-refresh (обновить все):**
```swift
func refresh() async {
    isRefreshing = true
    await loadFilters()
    await loadTasks()
    isRefreshing = false
}
```

### iOS ViewModel

```swift
class ManagerTasksListViewModel: ObservableObject {
    @Published var filterGroups: [TaskFilterGroup] = []
    @Published var tasks: [Task] = []
    @Published var isRefreshing = false

    // Task для каждого ресурса
    private var loadFiltersTask: _Concurrency.Task<Void, Never>?
    private var loadTasksTask: _Concurrency.Task<Void, Never>?

    func loadFilters() async {
        loadFiltersTask?.cancel()
        loadFiltersTask = _Concurrency.Task {
            for await result in stream { /* ... */ }
        }
        await loadFiltersTask?.value
    }

    func loadTasks() async {
        // ... аналогично
    }

    func refresh() async {
        isRefreshing = true
        await loadFilters()
        await loadTasks()
        isRefreshing = false
    }
}
```

### Android ViewModel

```kotlin
class ManagerTasksListViewModel(...) : ViewModel() {

    private var loadFiltersJob: Job? = null
    private var loadTasksJob: Job? = null

    suspend fun loadFiltersSuspend() {
        loadFiltersJob?.cancel()
        loadFiltersJob = viewModelScope.launch { /* ... */ }
        loadFiltersJob?.join()
    }

    suspend fun loadTasksSuspend() {
        loadTasksJob?.cancel()
        // ... аналогично
        loadTasksJob?.join()
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            try {
                loadFiltersSuspend()
                loadTasksSuspend()
            } finally {
                _isRefreshing.value = false
            }
        }
    }
}
```

### Ключевые правила

**iOS:**
- ✅ Отдельный Task для каждого ресурса
- ✅ В init загружай все ресурсы последовательно
- ✅ В `.task` на экране загружай только нужный ресурс
- ✅ В `refresh()` загружай все ресурсы последовательно

**Android:**
- ✅ Отдельный Job для каждого ресурса
- ✅ Suspend методы с суффиксом `Suspend`
- ✅ `.join()` для ожидания перед следующим ресурсом
- ✅ `try/finally` для гарантированного сброса `isRefreshing`
- ✅ В init загружай все ресурсы последовательно

---

## Сравнительная таблица

| Платформа | Инструменты | View модификаторы |
|-----------|-------------|-------------------|
| **iOS** | `Task<Void, Never>?`, `task?.cancel()`, `await task?.value` | `.task`, `.refreshable` |
| **Android** | `Job?`, `job?.cancel()`, `job?.join()`, `viewModelScope.launch` | `LaunchedEffect`, `PullToRefreshBox` |

---

## Чеклист перед коммитом

### iOS — Любой экран

- [ ] Добавил `private var loadTask: _Concurrency.Task<Void, Never>?`
- [ ] Вызываю `loadTask?.cancel()` перед новым запросом
- [ ] Оборачиваю в Task: `loadTask = _Concurrency.Task { ... }`
- [ ] Жду завершения: `await loadTask?.value`
- [ ] Игнорирую CancellationError если используется AsyncStream: `if error is CancellationError { break }`
- [ ] Использую `.task` в View для первой загрузки
- [ ] Использую `.refreshable` в View для pull-to-refresh
- [ ] Метод `refresh()` вызывает основной метод загрузки

### Android — Любой экран

- [ ] Добавил `private var loadJob: Job? = null`
- [ ] Вызываю `loadJob?.cancel()` перед новым запросом
- [ ] Оборачиваю в launch: `loadJob = viewModelScope.launch { ... }`
- [ ] Жду завершения: `loadJob?.join()`
- [ ] Использую `finally` для сброса `isRefreshing`
- [ ] Использую `LaunchedEffect(Unit)` для первой загрузки

### iOS/Android — Последовательная загрузка (несколько ресурсов)

- [ ] Отдельный Task/Job для каждого ресурса
- [ ] В init загружаю все ресурсы последовательно
- [ ] На каждом экране загружаю только нужный ресурс через `.task`
- [ ] В `refresh()` загружаю все ресурсы последовательно
- [ ] (Android) Suspend методы с суффиксом `Suspend`
- [ ] (Android) `.join()` после каждой операции
- [ ] (Android) `try/finally` для сброса флагов

---

## Быстрые ответы на частые вопросы

**Q: Нужно ли использовать Task.detached на iOS?**
A: Нет. Используй обычный Task через поле `private var loadTask` + `.task` модификатор в View. Это работает для всех случаев.

**Q: Когда использовать .task, а когда .onAppear?**
A: Всегда используй `.task` для загрузки данных. `.onAppear` только для аналитики или side-effects не связанных с загрузкой.

**Q: Что делать если View перерисовывается и отменяет Task в .refreshable?**
A: Это больше не проблема. Используй обычный `.refreshable { await viewModel.refresh() }` без Task.detached.

**Q: Нужно ли отменять Job при onCleared на Android?**
A: Нет. `viewModelScope.launch` автоматически отменяется при onCleared().

**Q: Как обрабатывать CancellationError?**
A: При использовании AsyncStream: игнорируй с `if error is CancellationError { break }`. При обычном async throws — не требуется, ошибка не пробрасывается.

**Q: В чём разница между HTTP кэшем и без кэша?**
A: Только в типе возврата Service. С кэшем — `AsyncStream<CachedResult<T>>`, без кэша — `async throws -> T`. Паттерн в View и Task cancellation одинаковый.

---

## Связанная документация

- **HTTP Кэширование:** `.memory_bank/mobile/architecture/caching.md`
- **UI Паттерны:** `.memory_bank/mobile/ui/ui_patterns.md`
- **Networking:** `.memory_bank/mobile/architecture/networking.md`
- **Stacks:** `.memory_bank/mobile/architecture/ios_stack.md`, `android_stack.md`

---

**Последнее обновление:** 2026-03-23
