# Navigation — Навигация в мобильном приложении

Система навигации в iOS (SwiftUI NavigationStack) и Android (Jetpack Navigation Compose) приложениях WFM.

---

## Общие принципы

**Подход:** Declarative navigation — навигация основана на состоянии, а не на императивных вызовах.

**Архитектурные концепции:**
- Type-safe маршруты (enum для iOS, sealed class для Android)
- Централизованное управление навигацией
- Вложенные графы для логических групп экранов (Auth flow, Manager flow)
- Shared ViewModel для связанных экранов
- Реактивная навигация на основе изменения состояния UI

**Основная структура маршрутов:**
- **Auth flow**: PhoneInput → CodeInput → Registration
- **Main flow (работник)**: Home, Tasks, Profile (Settings), TaskDetail
- **Manager flow (управляющий)**: ManagerHome, ManagerTasks, Profile (Settings), TaskDetail

---

## iOS: SwiftUI NavigationStack

### Стек технологий

- **SwiftUI NavigationStack** (iOS 16+)
- **AppRouter** (ObservableObject) — централизованное управление навигацией
- **Route enum** — type-safe маршруты с Hashable
- **NavigationPath** — стек навигации

**Файлы:**
- `Core/Navigation/AppRouter.swift` — централизованный роутер
- `Core/Navigation/Route.swift` — определение всех маршрутов приложения

### Маршруты (Route enum)

**Auth Flow:**
- `phoneInput` — ввод номера телефона
- `codeInput` — ввод кода подтверждения
- `registration` — регистрация нового пользователя

**Main Flow (работник):**
- `taskDetail(taskId: String)` — детальный экран задачи
- `settings` — настройки и профиль

**Manager Flow (управляющий):**
- `taskDetail(taskId: String)` — детальный экран задачи
- `employeeFilter` — фильтр сотрудников (полноэкранный)
- `settings` — настройки и профиль

**Важно:** Associated values используются только для передачи ID, не объектов.

### AppRouter

**Публичные свойства:**
- `@Published var authPath: NavigationPath` — стек для Auth flow
- `@Published var mainPath: NavigationPath` — стек для Main flow
- `@Published var isAuthenticated: Bool` — состояние авторизации
- `@Published var isCheckingAuth: Bool` — проверка токенов при старте

**Методы навигации:**
- `navigateToCodeInput()` — переход на ввод кода
- `navigateToRegistration()` — переход на регистрацию
- `navigateToTaskDetail(taskId:)` — переход на детальный экран задачи
- `pop()` — возврат назад
- `login()` — переход в Main flow (очищает authPath)
- `logout()` — выход (очищает mainPath, сбрасывает токены)

### Реактивная навигация

**Паттерн:** `.onChange(of: viewModel.uiState)` + флаг `navigationHandled`

**Защита от повторной навигации:**
- Флаг `navigationHandled` предотвращает дублирование навигации
- Сброс флага при переходе в `.idle`, `.loading`, `.error` состояния
- Установка флага перед вызовом `router.navigate...()`

### Shared ViewModel для Auth

**Проблема:** PhoneInput, CodeInput, Registration должны делить данные (номер телефона, код).

**Решение:**
- Создать `@StateObject var viewModel: AuthViewModel` в `AuthFlowView`
- Передавать тот же экземпляр во все вложенные экраны через параметры
- ViewModel живёт, пока жив `AuthFlowView`
- При переходе в Main flow → `AuthFlowView` уничтожается → ViewModel тоже

### Навигация для управляющего

**ManagerTabView** — отдельный Tab Bar для управляющего.

**Фильтры задач** открываются через `TaskFiltersBottomSheet.show()` — без навигации, через BottomSheet.

**Связанные документы:**
- `.memory_bank/mobile/feature_managertasks/manager_tasks_screens.md`
- `.memory_bank/mobile/ui/bottomsheet.md`

### Передача параметров

**Рекомендуется:** Передавайте только ID через associated values.
- Определение: `case taskDetail(taskId: String)`
- Навигация: `router.navigateToTaskDetail(taskId: task.id.uuidString)`
- Получение: `case .taskDetail(let taskId): TaskDetailView(taskId: ...)`

**Не рекомендуется:** Передача объектов (нарушает Hashable, раздувает Route enum).

### Очистка стека

**При login:**
- `authPath = NavigationPath()` — сброс Auth стека
- `isAuthenticated = true` — переключение на Main flow

**При logout:**
- `mainPath = NavigationPath()` — сброс Main стека
- `isAuthenticated = false` — переключение на Auth flow
- `tokenStorage.clearTokens()` — удаление токенов

---

## Android: Jetpack Navigation Compose

### Стек технологий

- **Jetpack Navigation Compose**
- **NavController** — управление навигацией
- **NavHost** — контейнер для графа навигации
- **Screen sealed class** — type-safe маршруты

**Файлы:**
- `com.wfm.navigation.AppNavigation` — главный граф навигации
- `com.wfm.navigation.Screen` — определение маршрутов

### Маршруты (Screen sealed class)

**Основные маршруты:**
- `Splash` — экран загрузки
- `Welcome` — экран приветствия
- `Auth` — вложенный граф для авторизации
- `Loading` — экран определения роли пользователя
- `MainTabs` — главный экран с табами (работник)
- `ManagerMainTabs` — главный экран с табами (управляющий)
- `TaskDetails` — детальный экран задачи (с параметром taskId)

### Вложенная навигация (Nested Navigation)

**Auth flow** использует вложенный граф с общим ViewModel:
- `navigation(startDestination = Screen.PhoneInput.route, route = Screen.Auth.route)`
- Все экраны (PhoneInput, CodeInput, Registration) внутри одного графа
- Изолированный backstack для авторизации

**Преимущества:**
- Единый `AuthViewModel` для всех экранов auth flow
- Сохранение состояния (номер телефона, код) между экранами
- Автоматическая очистка при выходе из графа

### Shared ViewModel через ViewModelStoreOwner

**Проблема:** PhoneInput, CodeInput, Registration должны делить данные.

**Решение:**
- Получить `backStackEntry` родительского графа `Auth`
- Использовать его как `ViewModelStoreOwner` при создании ViewModel
- Koin возвращает один и тот же экземпляр `AuthViewModel` для всех экранов в графе

**Жизненный цикл:**
- Вход в Auth граф → AuthViewModel создан
- PhoneInput → CodeInput → Registration (один экземпляр ViewModel)
- Выход из Auth графа → AuthViewModel уничтожен

### Реактивная навигация

**Паттерн:** `LaunchedEffect(uiState)` + callback навигации

**Ключевые правила:**
- Навигация не вызывается напрямую из ViewModel (anti-pattern)
- Composable функция слушает `uiState` через `LaunchedEffect`
- При изменении состояния вызывается callback (например, `onCodeSent()`)
- Callback содержит `navController.navigate(...)`

**Ключ LaunchedEffect:**
- `LaunchedEffect(uiState)` — перезапускается при изменении состояния
- `LaunchedEffect(Unit)` — выполняется только один раз (не подходит для реактивности)

### Навигация для управляющего

**ManagerMainTabScreen** — отдельный экран с табами для управляющего.

**Фильтры задач** открываются через `TaskFiltersBottomSheetContent` — встроен в Screen, без навигации.

**Связанные документы:**
- `.memory_bank/mobile/feature_managertasks/manager_tasks_screens.md`
- `.memory_bank/mobile/ui/bottomsheet.md`

### Передача параметров

**Текущая реализация:** Все данные передаются через общий `AuthViewModel`.

**Для других экранов (TaskDetail):**
- Определение: `data object TaskDetail : Screen("task_detail/{taskId}")`
- Helper метод: `fun createRoute(taskId: String) = "task_detail/$taskId"`
- Регистрация: `composable(route, arguments = listOf(navArgument("taskId") { ... }))`
- Навигация: `navController.navigate(Screen.TaskDetail.createRoute(task.id))`

### Очистка backstack

**При успешной авторизации:**
- `navController.navigate(Screen.TasksList.route) { popUpTo(Screen.Auth.route) { inclusive = true } }`
- Результат: Auth граф полностью удаляется, `TasksList` становится root

**При logout:**
- `navController.navigate(Screen.Auth.route) { popUpTo(0) { inclusive = true } }`
- Результат: Полная очистка backstack, `Auth` становится единственным экраном

### Обработка системной кнопки Back

**По умолчанию:** Navigation Compose автоматически обрабатывает системную кнопку Back.

**Кастомное поведение:** Используйте `BackHandler { ... }` для перехвата.

---

## Отличия между платформами

**Основные различия:**

| Аспект | iOS | Android |
|--------|-----|---------|
| Библиотека | SwiftUI NavigationStack | Jetpack Navigation Compose |
| Роутер | AppRouter | NavController |
| Маршруты | Route enum | Screen sealed class |
| Реактивность | `.onChange(of:)` | `LaunchedEffect(key)` |

**Детали:**
- **Shared ViewModel:** iOS — `@StateObject` в parent view, Android — `ViewModelStoreOwner`
- **Защита от дублирования:** iOS — флаг `navigationHandled`, Android — ключ `LaunchedEffect`
- **Вложенные графы:** iOS — вложенные NavigationStack, Android — `navigation { }` блок
- **Очистка стека:** iOS — `path = NavigationPath()`, Android — `popUpTo(route) { inclusive = true }`

---

## Best Practices

### ✅ DO

- Используйте централизованное управление навигацией (AppRouter / NavController)
- Определяйте все маршруты в едином месте (Route enum / Screen sealed class)
- Очищайте стек при смене flow (auth → main, logout)
- Используйте флаги/ключи для защиты от повторной навигации
- Передавайте только ID, загружайте данные в ViewModel по ID
- Используйте вложенные графы для логических групп экранов (Auth, Manager)
- Используйте Shared ViewModel для связанных экранов

### ❌ DON'T

- Не вызывайте навигацию напрямую из ViewModel
- Не передавайте callback'и вниз (onSuccess, onDismiss) — используйте реактивность
- Не храните большие объекты в маршрутах (enum/sealed class)
- Не забывайте очищать стек при logout
- iOS: Не используйте `@State` для глобальной навигации
- iOS: Не сравнивайте enum с associated values через `!=` без полного Equatable
- Android: Не используйте `LaunchedEffect(Unit)` для реактивной навигации

---

## Связанные документы

**Общее:**
- `.memory_bank/mobile/architecture/app_structure.md` — структура приложения, Tab Bar, DI

**Auth:**
- `.memory_bank/mobile/feature_auth/feature_auth_screens.md` — экраны авторизации

**Manager:**
- `.memory_bank/mobile/feature_managerhome/manager_home_screen.md` — главная управляющего
- `.memory_bank/mobile/feature_managertasks/manager_tasks_screens.md` — контроль задач
- `.memory_bank/mobile/ui/bottomsheet.md` — BottomSheet фильтров

**Стеки:**
- `.memory_bank/mobile/architecture/ios_stack.md`
- `.memory_bank/mobile/architecture/android_stack.md`
