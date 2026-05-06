# Структура мобильного приложения WFM

## Обзор

WFM — мобильное приложение для управления рабочей силой в ритейле. iOS и Android с единой логикой и дизайном.

**Паттерн:** MVVM
**Основные слои:** Views → ViewModels → Managers/Services → Models

---

## Точка входа

### iOS

**Файл:** `mobile/ios/WFMApp/WFMApp.swift`

1. Инициализация `DependencyContainer` (DI)
2. Создание `AppRouter` (навигация)
3. Начальный экран:
   - Токен есть → `MainTabView`
   - Токена нет → `PhoneInputView`

### Android

**Файл:** `mobile/android/app/src/main/java/com/wfm/MainActivity.kt`

1. Инициализация Koin (DI)
2. Создание `NavController`
3. Начальный экран:
   - Токен есть → `MainTabScreen`
   - Токена нет → `PhoneInputScreen`

---

## Tab Bar

Нижняя навигация с 3 табами. Стартовый таб — **Главная**.

**Существует 2 версии Tab Bar в зависимости от роли пользователя:**

### Tab Bar для работника (MainTabScreen / MainTabView)

| # | Таб | Иконка | Экран |
|---|-----|--------|-------|
| 1 | Главная | `ic-tab-home` | Информация о работнике (HomeScreen) |
| 2 | Задачи | `ic-tab-tasks` | Список задач работника (TasksListScreen) |
| 3 | Профиль | `ic-tab-profile` | Профиль, версия, выход (SettingsScreen) |

**Файлы:**
- iOS: `WFMApp/Features/MainFlow/MainTabView.swift`
- Android: `features/main/MainTabScreen.kt`

### Tab Bar для управляющего (ManagerMainTabScreen / ManagerTabView)

| # | Таб | Иконка | Экран |
|---|-----|--------|-------|
| 1 | Главная | `ic-tab-home` | Обзор магазина с задачами на проверку (ManagerHomeScreen) |
| 2 | Задачи | `ic-tab-tasks` | Контроль задач с фильтрацией (ManagerTasksListScreen) |
| 3 | Профиль | `ic-tab-profile` | Профиль, версия, выход (SettingsScreen) |

**Файлы:**
- iOS: `WFMApp/Features/MainFlow/ManagerTabView.swift`
- Android: `features/main/ManagerMainTabScreen.kt`

**Поведение:**
- Tab Bar скрывается при навигации на вложенный экран (TaskDetailView, и т.д.)
- iOS: Комбинированный подход — `!router.mainPath.isEmpty || hideTabBar` (preference `HideTabBarPreferenceKey`)
- Android: Аналогично iOS — проверка navigation stack + state переменные
- Определение роли: через `UserManager.isManager()` — загружается при старте приложения из API `/users/me`

**Механизм скрытия Tab Bar (iOS):**
1. Экран устанавливает `.preference(key: HideTabBarPreferenceKey.self, value: true)`
2. `MainTabView` / `ManagerTabView` слушают preference через `.onPreferenceChange()`
3. Обновляется `hideTabBar` state → Tab Bar скрывается
4. Дополнительно проверяется `router.mainPath.isEmpty` для автоматического скрытия при NavigationStack переходах

**Файл preference key:** `WFMApp/Core/Utils/HideTabBarPreferenceKey.swift`

**Связанные документы:**
- `.memory_bank/domain/user_roles.md` — роли (MANAGER / WORKER)
- `.memory_bank/mobile/feature_managerhome/manager_home_screen.md` — экран "Главная" управляющего
- `.memory_bank/mobile/feature_managertasks/manager_tasks_screens.md` — экраны контроля задач

---

## DI (Dependency Injection)

**iOS:** `DependencyContainer` — собственный легкий контейнер, singleton + factory методы
Файл: `WFMApp/Core/DI/DependencyContainer.swift`

**Android:** Koin — декларативный DSL, ViewModels через `koinViewModel()`
Файл: `app/src/main/java/com/wfm/core/di/AppModule.kt`

### Singleton ViewModels для главных экранов

**Проблема:** При навигации между табами ViewModels пересоздаются → потеря состояния, лишние запросы к серверу, сброс UI.

**Решение:** Singleton ViewModels для главных экранов (TabBar navigation).

#### iOS

Используем `lazy var` для создания синглтон-экземпляров:

```swift
class DependencyContainer: ObservableObject {
    // Singleton ViewModels — создаются один раз при первом обращении
    private(set) lazy var homeViewModelWorker: HomeViewModel = {
        HomeViewModel(role: .worker, userManager: userManager, ...)
    }()

    private(set) lazy var homeViewModelManager: HomeViewModel = {
        HomeViewModel(role: .manager, userManager: userManager, ...)
    }()

    private(set) lazy var tasksListViewModel: TasksListViewModel = {
        TasksListViewModel(tasksService: tasksService, ...)
    }()

    private(set) lazy var managerTasksListViewModel: ManagerTasksListViewModel = {
        ManagerTasksListViewModel(userManager: userManager, ...)
    }()

    // Factory методы — создают новый экземпляр при каждом вызове
    func makeTaskDetailViewModel(task: Task) -> TaskDetailViewModel {
        return TaskDetailViewModel(task: task, ...)
    }
}
```

**Когда использовать:**
- ✅ **Singleton** — главные экраны TabBar (HomeView, TasksListView, ManagerTasksListView, SettingsView)
- ✅ **Factory** — детальные экраны (TaskDetailView, CreateTaskView)

**Файл:** `WFMApp/Core/DI/DependencyContainer.swift`

#### Android

Используем параметризированные ViewModels через Koin:

```kotlin
val appModule = module {
    // Singleton ViewModels с параметрами
    viewModel { (role: HomeUserRole) ->
        HomeViewModel(role = role, userManager = get(), ...)
    }

    viewModel { TasksListViewModel(get(), get(), ...) }
    viewModel { ManagerTasksListViewModel(get(), get(), ...) }

    // Factory ViewModels
    viewModel { (taskId: String) -> TaskDetailsViewModel(get(), taskId, ...) }
}
```

На Android ViewModels по умолчанию являются singleton в рамках lifecycle scope (Activity/Fragment). Navigation Component автоматически кэширует ViewModels при переключении между TabBar экранами.

**Параметризация:** Используй `parametersOf()` для передачи параметров: `koinViewModel { parametersOf(role) }`

**Файлы:** `app/src/main/java/com/wfm/core/di/AppModule.kt`

---

## Глобальные менеджеры

Сервисы, доступные на любом экране через DI.

**UserManager** — данные текущего пользователя (профиль, роль, магазин)
→ подробнее: [`managers/user_manager.md`](../managers/user_manager.md)

**TokenStorage** — хранение и управление токенами авторизации
→ подробнее: [`managers/token_storage.md`](../managers/token_storage.md)

---

## Дизайн-система

Общий UI-модуль для обеих платформ: цвета, типографика, компоненты, отступы.

- **iOS:** SPM модуль `WFMUI`
- **Android:** Gradle модуль `ui`

→ подробнее: [`ui/design_system_components.md`](../ui/design_system_components.md)

---

## Связанные документы

- **Навигация:** [`architecture/navigation.md`](./navigation.md)
- **Стек iOS:** [`architecture/ios_stack.md`](./ios_stack.md)
- **Стек Android:** [`architecture/android_stack.md`](./android_stack.md)
- **UI паттерны:** [`ui/ui_patterns.md`](../ui/ui_patterns.md)
- **Request Cancellation:** [`architecture/request_cancellation.md`](./request_cancellation.md) — решение проблем с отменой запросов
- **HTTP Кэширование:** [`architecture/caching.md`](./caching.md)
- **Networking:** [`architecture/networking.md`](./networking.md)
