# UI Паттерны — поведение экранов

Правила поведения экранов: загрузка, пустые состояния, ошибки, обновление данных.

Компоненты и дизайн-токены — в [`ui/design_system_components.md`](./design_system_components.md).
Структура навигации и Tab Bar — в [`architecture/app_structure.md`](../architecture/app_structure.md).

---

## Pull-to-Refresh

**Правило:** любой экран, загружающий данные с сервера, **обязан** поддерживать Pull-to-Refresh.

### iOS

```swift
ScrollView {
    // контент
}
.refreshable {
    await viewModel.refresh()
}
```

### Android

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
PullToRefreshBox(
    isRefreshing = isRefreshing,
    onRefresh = { viewModel.refresh() },
    modifier = Modifier.fillMaxSize()
) {
    LazyColumn { /* список */ }
    // или Box + verticalScroll для не-списковых экранов
}
```

⚠️ **Важно для Android:** `PullToRefreshBox` требует прокручиваемый контент внутри (`LazyColumn` или `verticalScroll`) — без него жест не распознаётся. Это касается в том числе состояний Loading и Empty.

⚠️ **Важно для iOS:** Pull-to-Refresh сбрасывается при использовании `.task` модификатора

**Проблема:**

Если View использует `.task` модификатор для первой загрузки данных и метод `refresh()` изменяет `@Published` свойства (например, `isLoading = true`), это триггерит перерисовку View, что перезапускает `.task` → новый запрос загрузки → конфликт с pull-to-refresh запросом.

```swift
// ❌ Неправильно
func refresh() async {
    isLoading = true  // перерисовывает View → перезапускает .task → сброс PTR
    await loadData()
    isLoading = false
}
```

**Решение:**

Разделить логику загрузки на два метода:
- `loadData()` — для первой загрузки, управляет `isLoading`
- `refresh()` — для pull-to-refresh, **НЕ меняет `isLoading`** (индикатор показывает SwiftUI)

```swift
// ✅ Правильно
@Published var isLoading = false

/// Первая загрузка данных
func loadData() async {
    isLoading = true
    await loadDataInternal()
    isLoading = false
}

/// Pull-to-Refresh
///
/// Не переключает isLoading — это убивает задачу .refreshable в SwiftUI.
/// Индикатор обновления показывает сам SwiftUI.
func refresh() async {
    await loadDataInternal()
}

/// Внутренняя логика загрузки (без управления isLoading)
private func loadDataInternal() async {
    // загрузка данных
}
```

**Примеры:** `HomeViewModel.swift`, `TasksListViewModel.swift`

### ViewModel

**Базовый паттерн:**

```kotlin
fun refresh() {
    viewModelScope.launch {
        _isRefreshing.value = true
        try {
            // загрузка данных
        } finally {
            _isRefreshing.value = false  // always reset
        }
    }
}
```

**Паттерн с кэшированием (stale-while-revalidate):**

Если сервис использует HTTP кэширование, индикатор должен оставаться активным пока показываются кэшированные данные. Это предотвращает ситуацию когда индикатор исчезает сразу после показа кэша, создавая ощущение что обновление не произошло.

**Ключевое правило:** `isRefreshing = false` только когда `!response.isCached`

**📖 Полная документация:** `.memory_bank/mobile/architecture/caching.md` — паттерн stale-while-revalidate, примеры кода, обработка ошибок

---

## Loading state

Показывается при первой загрузке (когда данных ещё нет).

**Правило:** контейнер должен быть прокручиваемым — для работы Pull-to-Refresh.

### iOS

```swift
if isLoading && data == nil {
    ProgressView()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
}
```

### Android

```kotlin
is UiState.Loading -> {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),  // обязательно для PTR
        contentAlignment = Alignment.Center
    ) {
        WfmLoader()
    }
}
```

---

## Empty state

Показывается когда данные загружены, но список пуст.

**Правило:** контейнер прокручиваемый — чтобы Pull-to-Refresh работал.

### iOS

```swift
if data.isEmpty {
    ScrollView {
        Text("Задач нет")
            .frame(maxWidth: .infinity, minHeight: geometry.size.height)
    }
}
```

### Android

```kotlin
is UiState.Success if state.items.isEmpty() -> {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        contentAlignment = Alignment.Center
    ) {
        Text("Задач нет")
    }
}
```

---

## Error state

**Правило:** ошибку **не показываем** в центре экрана. Пользователь обновляет данные через Pull-to-Refresh.

### Android

```kotlin
is UiState.Error -> {
    // пустой прокручиваемый контейнер — PTR доступен
    Box(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
    )
}
```

### iOS

```swift
// при ошибке данные не обновляются — пользователь делает pull-to-refresh
```

---

## Паттерн состояний UiState

Стандартная sealed-структура для экранов с загрузкой данных.

### Android

```kotlin
sealed class ScreenUiState {
    data object Loading : ScreenUiState()
    data class Success(val items: List<Item>) : ScreenUiState()
    data class Error(val message: String) : ScreenUiState()
}
```

```kotlin
private val _uiState = MutableStateFlow<ScreenUiState>(ScreenUiState.Loading)
val uiState: StateFlow<ScreenUiState> = _uiState.asStateFlow()

private val _isRefreshing = MutableStateFlow(false)
val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()
```

### iOS

```swift
enum ScreenUiState {
    case loading
    case success([Item])
    case error(String)
}

@Published var uiState: ScreenUiState = .loading
@Published var isRefreshing = false
```

---

## Request Cancellation при переключении табов (iOS)

### Проблема

При использовании `.task { await ... }` в SwiftUI, запрос отменяется если view быстро unmount'ится (например, при быстром переключении между табами). Это приводит к ошибкам вида "отменено" в логах.

```swift
// ❌ Неправильно — запрос отменяется при unmount
.task {
    await viewModel.onAppear()
}
```

### Решение

Для экранов где данные **не критичны** при каждом открытии (Settings, Home с уже загруженными данными):
- Использовать `.onAppear` вместо `.task`
- В ViewModel запускать загрузку через `_Concurrency.Task.detached` для предотвращения отмены

```swift
// ✅ Правильно — запрос продолжается в фоне
.onAppear {
    viewModel.onAppear()
}
```

**ViewModel:**
```swift
func onAppear() {
    analyticsService.track(.settingsViewed)

    // Запрос не отменяется при unmount view
    _Concurrency.Task.detached { [weak self] in
        await self?.userManager.refresh()
        if let error = await self?.userManager.error {
            await self?.toastManager.show(message: error, state: .error)
        }
    }
}
```

### Когда оставлять `.task`

Для экранов где данные **критичны** и должны загружаться при каждом открытии (ManagerTasksList, TasksList):
- Оставляем `.task { await viewModel.loadData() }`
- Используем HTTP кэширование (stale-while-revalidate) для мгновенного показа кэшированных данных
- Обрабатываем cancellation ошибки корректно (не показываем Toast)

**Примеры:**
- ✅ `.task` — ManagerTasksListView, TasksListView (критично свежие данные)
- ✅ `.onAppear` + `Task.detached` — SettingsView, HomeView (данные обновляются в фоне)

### Android

На Android проблемы нет — `viewModelScope.launch` не отменяется при переключении табов, lifecycle ViewModel не завершается.

---

## Android System Bars (Status Bar и Navigation Bar)

**Правило:** цвета системных баров (Status Bar, Navigation Bar) должны соответствовать фону экрана для бесшовного UI.

### Стандартная конфигурация

**MainActivity default:**
- Status Bar: прозрачный (`Color.TRANSPARENT`)
- Navigation Bar: белый (`#FFFFFF`) — для TabBar экранов
- Light icons: `isAppearanceLightStatusBars = true`, `isAppearanceLightNavigationBars = true`

Эти настройки подходят для большинства экранов (TabBar navigation).

### Временное изменение цвета (DisposableEffect)

Для fullscreen модальных экранов (AssignmentsListScreen) или экранов с кастомным фоном (ManagerTasksListScreen, TasksListScreen) нужно временно изменить цвет системных баров.

**Паттерн:**
- Используем `DisposableEffect(Unit)` для изменения цвета при входе на экран
- Сохраняем оригинальные значения через `window?.navigationBarColor` и `insetsController?.isAppearanceLightNavigationBars`
- Устанавливаем новый цвет через `window.navigationBarColor = colors.surfaceBase.toArgb()`
- Восстанавливаем оригинальные значения в `onDispose` при уходе с экрана

**Реализация:** см. `AssignmentsListScreen.kt`, `ManagerTasksListScreen.kt`, `TasksListScreen.kt`

### Примеры использования

**Navigation Bar (модальные экраны):**
- AssignmentsListScreen → `surfaceBase` (#F5F5FC)

**Status Bar (экраны с кастомным header):**
- ManagerTasksListScreen → `surfaceSecondary` (цвет header)
- TasksListScreen → `surfaceSecondary` (цвет header)

### Когда использовать

✅ **Используй DisposableEffect когда:**
- Экран fullscreen модальный (не в TabBar navigation)
- Фон экрана отличается от стандартного белого
- Header имеет отличающийся цвет (например, surfaceSecondary)

❌ **НЕ используй когда:**
- Экран находится в TabBar navigation с белым фоном (используй MainActivity defaults)
- Экран показывается через Navigation Component (может конфликтовать)

### iOS

На iOS цвета системных баров управляются глобально через Info.plist и не требуют временного изменения на уровне экранов. Status bar style (`light`/`dark`) устанавливается через `UIViewController.preferredStatusBarStyle` для каждого view controller.

---

## Environment Keys для передачи действий (iOS)

**Проблема:** View нужно вызвать действие из parent view (например, переключить таб или открыть модальное окно), но не хочется пробрасывать callback через все уровни иерархии.

**Решение:** Использовать Environment Keys для передачи действий.

### Паттерн

**1. Определить Environment Key:**

```swift
private struct OpenShiftKey: EnvironmentKey {
    static let defaultValue: () -> Void = {}
}

extension EnvironmentValues {
    var openShift: () -> Void {
        get { self[OpenShiftKey.self] }
        set { self[OpenShiftKey.self] = newValue }
    }
}
```

**2. Передать действие через Environment:**

```swift
// MainTabView
var body: some View {
    ZStack {
        switch selectedTab {
        case .tasks:
            TasksListView(viewModel: container.tasksListViewModel)
        }
    }
    .environment(\.openShift, { selectedTab = .home })
}
```

**3. Использовать в дочернем View:**

```swift
// TasksListView
struct TasksListView: View {
    @Environment(\.openShift) private var openShift

    var body: some View {
        if !hasOpenShift {
            EmptyStateView(
                title: "Список задач будет доступен после открытия смены",
                buttons: [
                    EmptyStateButton(
                        title: "Открыть смену",
                        action: openShift  // Вызываем действие из parent
                    )
                ]
            )
        }
    }
}
```

### Когда использовать

✅ **Используй когда:**
- Действие должно выполняться в parent view (переключение таба, открытие модального окна)
- Callback нужно пробросить через несколько уровней иерархии
- Действие одно и то же для всех дочерних views

❌ **НЕ используй когда:**
- Действие выполняется в самом view (используй обычный callback)
- Callback пробрасывается только через один уровень (проще передать напрямую)

### Android (CompositionLocal)

На Android аналогичный паттерн реализуется через `CompositionLocal`:

```kotlin
val LocalOpenShift = compositionLocalOf<() -> Unit> { {} }

// Parent composable
CompositionLocalProvider(LocalOpenShift provides { selectedTab = MainTab.Home }) {
    TasksListScreen(viewModel)
}

// Child composable
@Composable
fun TasksListScreen() {
    val openShift = LocalOpenShift.current

    if (!hasOpenShift) {
        EmptyStateView(
            title = "Список задач будет доступен после открытия смены",
            buttons = listOf(
                EmptyStateButton(
                    title = "Открыть смену",
                    onClick = openShift
                )
            )
        )
    }
}
```

### Доступные Environment Keys в проекте

**Файл определений (iOS):** `mobile/ios/WFMApp/Features/MainFlow/MainFlowView.swift`

#### openShift
- **Назначение:** Переключить на таб "Главная" (для открытия смены)
- **Используется в:** TasksListView (empty state "Нет открытой смены")
- **Действие:** `selectedTab = .home` (MainTabView / ManagerTabView)

#### switchToTasksTab
- **Назначение:** Переключить на таб "Задачи"
- **Используется в:** ManagerTasksListView, ManagerHomeView
- **Действие:** `selectedTab = .tasks` (MainTabView / ManagerTabView)

#### switchToControlTab
- **Назначение:** Переключить на таб "Контроль" (только для менеджера)
- **Используется в:** TasksListView (empty states для менеджера)
- **Действие:** `selectedTab = .control` (ManagerTabView)

---

## Связанная документация

**📖 Request Cancellation:** `.memory_bank/mobile/architecture/request_cancellation.md`
- Task Cancellation + AsyncStream (iOS, с кэшем)
- isRefreshing Flag + Task.detached (iOS, без кэша)
- Job Cancellation + Flow (Android, универсальный)
- Suspend методы для последовательных операций (Android)

**📖 UserManager координация:** `.memory_bank/mobile/managers/user_manager.md`
- Паттерн 3-шаговой синхронизации с UserManager
- Примеры для iOS и Android

**📖 DI Container:** `.memory_bank/mobile/architecture/app_structure.md`
- Singleton ViewModels для главных экранов
