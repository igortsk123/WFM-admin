# Manager Tasks List Screen — Экран контроля задач для управляющего

Описание пользовательского опыта и интерфейса экрана управления и проверки задач для управляющего магазина.

**Этот документ описывает:**
- Экран "Контроль задач" (ManagerTasksListScreen / ManagerTasksListView)
- Pull-to-Refresh поведение
- Навигация
- API интеграция

**Связанные документы:**
- `.memory_bank/domain/task_model.md` — модель задач, типы, review_state
- `.memory_bank/domain/task_states.md` — состояния задач
- `.memory_bank/backend/api_tasks.md` — API endpoints задач
- `.memory_bank/mobile/ui/ui_patterns.md` — UI паттерны (Pull-to-Refresh)
- `.memory_bank/mobile/ui/design_system_components.md` — компоненты (WfmSegmentedControl)
- `.memory_bank/mobile/ui/bottomsheet.md` — BottomSheet фильтров (зоны, типы работ, сотрудники)

---

## Экран: Контроль задач (ManagerTasksListScreen / ManagerTasksListView)

### Цель
Отобразить управляющему список задач для проверки с фильтрацией и сегментацией "Проверить" / "Принятые".

### Дизайн из Figma
**Node ID:** `3601-12843`

### Структура экрана

**1. Кастомная шапка** (CustomHeader — фиксированная)
   - Заголовок "Контроль задач" + кнопка фильтра с индикатором

**2. Прокручиваемый контент с Pull-to-Refresh:**
   - Segmented Control ("Проверить" / "Принятые")
   - Список карточек задач

---

## Компоненты

### Кастомная шапка (CustomHeader)

**Layout:**
- Horizontal HStack/Row
- Фон: `colors.surfaceSecondary`
- Padding: `WFMSpacing.L` / `WfmSpacing.L`
- iOS: системный safe area. Android: `.statusBarsPadding()`

**Содержимое:**
- Текст "Контроль задач" (weight = 1, растягивается)
  - Стиль: `Headline20Bold`
  - Цвет: `textPrimary`
- Кнопка фильтра (IconButton, 40×40):
  - Иконка: `ic-filter`, 20×20, цвет `iconDefault`
  - Рамка: `cardBorderSecondary`, 1dp, радиус `WFMRadius.L` / `WfmRadius.L`
  - Индикатор: маленькая точка `badgeBrandBgBright` (8×8, offset topTrailing) — отображается если `hasActiveFilters == true`
  - Действие: открывает `TaskFiltersBottomSheet`

### Основной контент

**Pull-to-Refresh:**
- iOS: `.refreshable { await viewModel.refresh() }`
- Android: `PullToRefreshBox(isRefreshing, onRefresh)`

**Segmented Control:**
- Компонент: `WFMSegmentedControl` / `WfmSegmentedControl`
- Опции: ["Проверить", "Принятые"]
- Padding: `WFMSpacing.L` / `WfmSpacing.L`
- "Проверить" (index 0): `review_state = ON_REVIEW`
- "Принятые" (index 1): `review_state = ACCEPTED`

**Список карточек задач:**
- Spacing: `WFMSpacing.S` / `WfmSpacing.S`
- Padding: `WFMSpacing.L` / `WfmSpacing.L`
- Фон: `colors.surfaceBase`
- Карточка: `ManagerTaskCardView`
- Клик: открывает `TaskReviewSheet`

---

## Состояния экрана

### Ошибка (Error State)
**Figma Node ID:** `4329-25348`
- Когда: ошибка загрузки и нет кэша (`errorMessage != nil`)
- Featured icon `futered-info` 56×56 + заголовок + описание + кнопка "Обновить"
- Кнопка вызывает `viewModel.refresh()`

### Пустое состояние с активными фильтрами
**Figma Node ID:** `4329-24663`
- Когда: список пуст и `hasActiveFilters == true`
- Заголовок зависит от таба ("Нет задач на проверку" / "Нет принятых задач")
- Описание: "Чтобы посмотреть больше задач, попробуйте очистить фильтры"
- Кнопка "Сбросить фильтры": сбрасывает все фильтры и перезагружает список

### Пустое состояние без фильтров — таб "Проверить"
**Figma Node ID:** `4329-24717`
- Кнопка "К своим задачам": переключает на таб Задачи

### Пустое состояние без фильтров — таб "Принятые"
**Figma Node ID:** `4329-25302`
- Кнопки: "Проверить" (→ сегмент 0) и "К своим задачам" (→ таб Задачи)

---

## Поведение

### При первом открытии
- iOS: `.task { await viewModel.loadTasks() }`
- Android: `LaunchedEffect(Unit) { viewModel.onAppear() }`
- Фильтры загружаются автоматически в `init` ViewModel

### При изменении сегмента
- `viewModel.onSegmentChanged(index)` → `loadTasks()`

### При клике на кнопку фильтра
- Открывается `TaskFiltersBottomSheet` с текущими `filterGroups` и `taskFilterIndices`
- После нажатия "Показать" → вызывается `viewModel.applyFilters(updatedGroups)`
- ViewModel пересчитывает enabled-состояние и перезагружает задачи

### После approve/reject в TaskReviewSheet
- Вызывается `viewModel.loadTasks()` — только задачи, фильтры не перезапрашиваются

### Pull-to-Refresh
- `viewModel.refresh()` — загружает фильтры + задачи

---

## ViewModel: ManagerTasksListViewModel

### Зависимости
- `TasksService` — загрузка задач и фильтров
- `UserManager` — получение `assignmentId`
- `ToastManager` — отображение ошибок
- `AnalyticsService` — трекинг событий

### Публичные свойства

**iOS:**
- `@Published var tasks: [Task] = []`
- `@Published var isRefreshing: Bool = false`
- `@Published var selectedSegmentIndex: Int = 0`
- `@Published var filterGroups: [TaskFilterGroup] = []`
- `@Published var showFilters: Bool = false`
- `private(set) var taskFilterIndices: [[Int]] = []`
- `@Published var errorMessage: String? = nil`

**Android:**
- `val tasks: StateFlow<List<Task>>`
- `val isRefreshing: StateFlow<Boolean>`
- `val selectedSegmentIndex: StateFlow<Int>`
- `val filterGroups: StateFlow<List<TaskFilterGroup>>`
- `val showFilters: StateFlow<Boolean>`
- `val taskFilterIndices: StateFlow<List<List<Int>>>`
- `val errorMessage: StateFlow<String?>`

### Методы

**`loadTasks()` / `loadTasksSuspend()`** (public):
- Запрашивает `/tasks/list/v2` с текущим сегментом и выбранными фильтрами из `filterGroups`
- Все группы фильтров (включая сотрудников) передаются через `filters: Map<String, List<Int>>`

**`loadFilters()` / `loadFiltersSuspend()`** (public):
- Запрашивает `/tasks/list/filters/v2`
- Сохраняет `taskFilterIndices` и `filterGroups`
- Восстанавливает ранее выбранные элементы
- Вызывает `recomputeEnabledState()`

**`applyFilters(updatedFilterGroups)`:**
- Обновляет `filterGroups`
- Вызывает `recomputeEnabledState()` и `loadTasks()`

**`recomputeEnabledState()`** (private):
- Делегирует в `recomputeFilterEnabledState(filterGroups:taskFilterIndices:)` из `TaskFiltersBottomSheet`

**`refresh()`:**
- `loadFiltersSuspend()` + `loadTasksSuspend()` последовательно

**`hasActiveFilters: Bool/Boolean`:**
- `true` если хотя бы один элемент в любой группе выбран

---

## API интеграция

**GET /tasks/list/filters/v2** (`getTaskListFiltersV2`):
- Фильтры для BottomSheet + маска `taskFilterIndices`
- Параметр: `assignment_id`

**GET /tasks/list/v2** (`getTasksListV2`):
- Список задач с AND-пересечением фильтров
- Параметры: `assignment_id`, `state`, `review_state`, динамические `filters`

---

## Платформенные особенности

### iOS
- `ManagerTasksListView` встроен в `NavigationStack` таба
- `.navigationBarHidden(true)` — кастомная шапка
- Фильтры открываются через `TaskFiltersBottomSheet.show()` (не navigationDestination)

### Android
- `ManagerTasksListScreen` встроен в `BottomNavigationBar` таба
- `.statusBarsPadding()` в шапке
- `TaskFiltersBottomSheetContent` встроен напрямую в Screen (без отдельной навигации)

---

## Файлы реализации

### iOS
`mobile/ios/WFMApp/Features/ManagerTasksFlow/ManagerTasksListView.swift`
`mobile/ios/WFMApp/Features/ManagerTasksFlow/ManagerTasksListViewModel.swift`
`mobile/ios/WFMApp/Features/ManagerTasksFlow/TaskFiltersBottomSheet.swift`

### Android
`mobile/android/app/src/main/java/com/beyondviolet/wfm/features/managertasks/ManagerTasksListScreen.kt`
`mobile/android/app/src/main/java/com/beyondviolet/wfm/features/managertasks/ManagerTasksListViewModel.kt`
`mobile/android/app/src/main/java/com/beyondviolet/wfm/features/managertasks/TaskFiltersBottomSheet.kt`
