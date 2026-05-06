# Manager Home Screen — Главная экран для управляющего

Описание пользовательского опыта и интерфейса главного экрана управляющего магазина.

**Этот документ описывает:**
1. Главный экран управляющего (ManagerHomeScreen / ManagerHomeView)
2. Шапка с профилем (переиспользуемый компонент ProfileHeader)
3. Карточка смены (переиспользуемая из Home экрана)
4. Секция "Задачи на проверку"
5. Pull-to-Refresh поведение
6. Навигация
7. API интеграция

**Важно:** С марта 2025 используется **тот же HomeViewModel**, что и для работника, с параметром `role = .manager` / `MANAGER`. См. раздел "Унификация с Home экраном работника" ниже.

**Связанные документы:**
- `.memory_bank/domain/task_model.md` — модель задач, типы, review_state
- `.memory_bank/domain/task_states.md` — состояния задач
- `.memory_bank/backend/api_tasks.md` — API endpoints задач
- `.memory_bank/backend/api_users.md` — API endpoint `/me`
- `.memory_bank/mobile/ui/ui_patterns.md` — UI паттерны (Pull-to-Refresh)

---

## 1. Экран: Главная управляющего (ManagerHomeScreen / ManagerHomeView)

### Цель
Показать управляющему обзор магазина: приветствие с датой и список задач, требующих проверки.

### Дизайн из Figma
**Node ID:** `3580-11835`

### Структура экрана

**1. Шапка с профилем** (ProfileHeaderView / ProfileHeader — фиксированная, переиспользуемый компонент)
**2. Прокручиваемый контент:**
   - Карточка смены (ShiftCardView / ShiftCard — переиспользуемая из Home экрана)
   - Секция "Задачи на проверку" (если есть задачи со статусом COMPLETED)

### Компоненты

#### Шапка с профилем (ProfileHeaderView / ProfileHeader)

**Переиспользуемый компонент** из Home экрана работника.

**Props / Parameters:**
- `greetingName: String` — имя пользователя
- `formattedDate: String` — форматированная дата
- `avatarUrl: String?` / `photoUrl: String?` — URL фото профиля

**Layout:**
- Horizontal Row/HStack: Аватар + Текст приветствия
- Фон: `colors.surfaceBase`
- Padding:
  - Horizontal: `WFMSpacing.L` / `WfmSpacing.L`
  - Vertical: `WFMSpacing.S` / `WfmSpacing.S`
- Разделитель снизу: `colors.borderSecondary`, толщина 1dp

**Аватар:**
- Размер: 40×40dp/pt, круглый
- Источник: Kingfisher (iOS) / Coil (Android)
- Placeholder: круг с иконкой Person

**Текст:**
- "Привет, {greetingName}" (Headline16Bold, textPrimary)
- {formattedDate} (Body14Regular, textSecondary)

**Подробнее:** см. раздел "Компоненты" в `.memory_bank/mobile/ui/design_system_components.md`

#### Карточка смены (ShiftCardView / ShiftCard)

**Переиспользуемый компонент** из Home экрана работника.

Показывает ту же карточку смены, что и у работника:
- Состояния: NEW, DELAY, IN_PROGRESS, DONE, NO_DATA, EMPTY
- Кнопки открытия/закрытия смены
- CloseShiftBottomSheet при закрытии смены

**Подробнее:** см. `.memory_bank/mobile/feature_home/home_screen.md` → раздел "Карточка смены"

#### Секция "Задачи на проверку" (TasksToReviewSection)

**Условие показа:**
- Секция отображается, только если `completedTasks.isNotEmpty()`
- `completedTasks` — задачи со статусом `state = COMPLETED` (загружаются из API `GET /tasks/list?state=COMPLETED`)

**Layout:**
- Vertical VStack/Column
- Padding:
  - Top: `WFMSpacing.S` / `WfmSpacing.S`
  - Bottom: `WFMSpacing.L` / `WfmSpacing.L`
- Spacing между элементами: 12dp

**Заголовок секции:**
- Horizontal Row/HStack:
  - Текст "Задачи на проверку" + Spacer + Кнопка "Все"
- Padding horizontal: `WFMSpacing.L` / `WfmSpacing.L`
- Текст:
  - Стиль: `Headline18Bold`
  - Цвет: `cardTextPrimary`
- Кнопка "Все":
  - Layout: HStack/Row — текст "Все" + иконка `ic-chevron-right`
  - Spacing: `WFMSpacing.XXXS` / `WfmSpacing.XXXS`
  - Цвет текста и иконки: `textBrand`
  - Размер иконки: 12×12
  - Стиль текста: `Body12Medium` (iOS) / `Headline12Medium` (Android)
  - Padding: horizontal `WFMSpacing.S`, vertical `WFMSpacing.XXS`
  - Скругление: 12dp (RoundedCornerShape)
  - Действие: `onShowAllTasks` — навигация на экран "Контроль задач" (ManagerTasksListScreen)

**Горизонтальный скролл с карточками:**
- iOS: `GeometryReader` + `ScrollView(.horizontal)` + `HStack`
- Android: `LazyRow`
- Spacing между карточками: 8dp
- Padding horizontal: `WFMSpacing.L` / `WfmSpacing.L`
- Ширина карточки: `screenWidth - 62dp/pt` (учитывает padding и spacing)
- Высота контейнера: 100dp/pt (Android явно), iOS автоматически через GeometryReader
- Карточка: `ManagerTaskCardView` (см. ниже)

**ManagerTaskCardView:**
- Компонент для отображения задачи в компактном виде
- **Обязательные поля:**
  - `task.title` — заголовок задачи
  - `task.assignee` — имя сотрудника (если есть)
  - `task.planned_minutes` — плановое время выполнения
  - `task.state` — статус задачи (для бейджа)
- **Layout:** Вертикальный стек с текстом, бейджем статуса, информацией о сотруднике
- **Клик:** `onTap` — навигация на детальный экран задачи
- **Подробнее:** реализация в `mobile/{android,ios}/app/src/main/.../managerhome/components/ManagerTaskCardView`

### Состояния экрана

#### Pull-to-Refresh
- Доступен всегда (даже если секция задач пуста)
- Действие: `viewModel.loadUser()` / `viewModel.refreshData()`
- Обновляет данные пользователя и список задач на проверку
- iOS: `.refreshable { await viewModel.refreshData() }`
- Android: `PullToRefreshBox(isRefreshing, onRefresh)`

#### Пустое состояние
- Если `completedTasks.isEmpty()` — секция просто не отображается
- Остаётся только шапка с профилем
- Pull-to-Refresh всё равно доступен (пустой прокручиваемый контент)

### Поведение

**При первом открытии экрана:**
- iOS: `.task { await viewModel.onAppear() }` — проверяет данные и загружает только если нужно
- Android: вызов `loadUser()` в `init` блоке ViewModel или при переходе на таб

**При возврате на экран:**
- iOS: проверка в `onAppear`, перезагрузка при необходимости
- Android: аналогично при возврате на таб

**Навигация:**
- Кнопка "Все" в секции "Задачи на проверку":
  - iOS: `onShowAllTasks()` — навигация на `ManagerTasksListView`
  - Android: `onShowAllTasks()` — навигация на `ManagerTasksListScreen`
- Клик на карточку задачи:
  - iOS: `onTaskTap(task)` — навигация на детальный экран задачи (ещё не реализован)
  - Android: `onTaskClick(task.id)` — навигация на детальный экран задачи (ещё не реализован)

---

## 2. Унификация с Home экраном работника

**С марта 2025** используется **тот же HomeViewModel**, что и для работника.

### Ключевые изменения

**1. Общий ViewModel:**
- `HomeViewModel` инициализируется с параметром `role: .manager` / `MANAGER`
- Для управляющего добавлено свойство `tasksForReview: [Task]` / `StateFlow<List<Task>>`
- DI: `makeHomeViewModel(role: .manager)` / `koinViewModel { parametersOf(HomeUserRole.MANAGER) }`

**2. Переиспользуемые компоненты:**
- `ProfileHeaderView` / `ProfileHeader` — шапка профиля
- `ShiftCardView` / `ShiftCard` — карточка смены
- `ShiftTimeCalculator` — утилита расчета времени смен

**3. Локальное копирование данных:**
- Используется та же техника локального копирования из UserManager
- Предотвращает отмену запросов при изменении `@Published` свойств

**4. Предотвращение отмены запросов:**
- `Task.detached` в `.refreshable` и `onRefresh`
- `.id()` модификаторы на TabView

### Публичные свойства

**Общие (из Home):**
- `role: HomeUserRole` — роль пользователя (.worker / .manager)
- `localCurrentShift` — локальная копия смены
- `localCurrentUser` — локальная копия пользователя
- `localCurrentAssignment` — локальная копия назначения
- `greetingName`, `formattedDate`, `avatarUrl` — computed properties

**Для управляющего:**
- `@Published var tasksForReview: [Task]` (iOS) / `StateFlow<List<Task>>` (Android)

### Методы

**Общие:**
- `onAppear()` — проверка данных, загрузка при необходимости
- `refreshData()` — принудительная загрузка данных пользователя и смены
- `openShift(force: Bool)` — открытие/закрытие смены

**Для управляющего:**
- `loadTasksForReview()` — загрузка завершённых задач (`GET /tasks/list?state=COMPLETED`)

**Подробнее:** см. `.memory_bank/mobile/feature_home/home_screen.md` → раздел "Унификация ViewModel"

---

## 3. API интеграция

### Эндпоинты

**1. GET /users/me**
- Получение данных текущего пользователя
- Используется: `UserManager.loadUser()`
- Поля: `id`, `firstName`, `lastName`, `preferredName`, `photoUrl`, `role`, `storeId`, etc.

**2. GET /tasks/list?state=COMPLETED**
- Получение завершённых задач магазина (для управляющего)
- Фильтр: `state=COMPLETED` — задачи, ожидающие проверки
- Возвращает: массив задач со всеми полями (title, assignee, planned_minutes, state, review_state, etc.)
- **Примечание:** только управляющий может видеть все задачи магазина

### Обработка ошибок

**Ошибка загрузки пользователя:**
- Не блокирует экран
- Toast с ошибкой (опционально)
- Пустые данные в шапке

**Ошибка загрузки задач:**
- Не блокирует экран
- Секция "Задачи на проверку" не отображается
- Pull-to-refresh доступен для повторной попытки

---

## 4. Платформенные особенности

### iOS

**Навигация:**
- Встроен в `NavigationStack` основного таба
- `.navigationBarHidden(true)` — используется кастомная шапка

**Шапка:**
- Не прокручивается, фиксирована сверху
- Разделитель реализован через `.overlay(Rectangle()...)`

**Pull-to-Refresh:**
- `.refreshable { await Task.detached { @MainActor in await viewModel.refreshData() }.value }`
- Используется `Task.detached` для предотвращения отмены запроса
- Работает с пустым состоянием

**Изображения:**
- Аватар загружается через `KFImage` из Kingfisher
- Иконка chevron — `WFMIcons.chevronRight`

### Android

**Навигация:**
- Встроен в `BottomNavigationBar` основного таба
- Кастомная шапка без ActionBar

**Шапка:**
- Фиксирована сверху
- Разделитель через `HorizontalDivider`
- Фон: `colors.surfaceTertiary` (соответствует iOS)

**Pull-to-Refresh:**
- `PullToRefreshBox` обёрнут вокруг `Column` с `verticalScroll`
- Работает с пустым состоянием через `BoxWithConstraints`

**Изображения:**
- Аватар загружается через `AsyncImage` из Coil
- Иконка chevron — `com.beyondviolet.wfm.ui.R.drawable.ic_chevron_right`

**Status Bar:**
- В `PullToRefreshBox` учитывается `.statusBarsPadding()` в шапке

---

## 5. Файлы

**iOS:**
- `Features/ManagerHomeFlow/ManagerHomeView.swift` — экран управляющего
- `Features/Home/HomeViewModel.swift` — универсальная логика (worker + manager)
- `Features/Home/Components/ShiftCardView.swift` — карточка смены
- `Features/Home/Components/ProfileHeaderView.swift` — шапка профиля
- `Features/ManagerHomeFlow/Components/ManagerTaskCardView.swift` — карточка задачи для проверки
- `Core/Models/ShiftTimeCalculator.swift` — утилита расчета времени

**Android:**
- `features/managerhome/ManagerHomeScreen.kt` — экран управляющего
- `features/home/HomeViewModel.kt` — универсальная логика (worker + manager)
- `features/home/components/ShiftCard.kt` — карточка смены
- `features/home/components/ProfileHeader.kt` — шапка профиля
- `features/managerhome/components/ManagerTaskCardView.kt` — карточка задачи для проверки
- `core/models/ShiftTimeCalculator.kt` — утилита расчета времени

---

## Связанные документы

- **Home Screen (работник):** `.memory_bank/mobile/feature_home/home_screen.md`
- **ShiftTimeCalculator:** `.memory_bank/mobile/utilities/shift_time_calculator.md`
- **UI компоненты:** `.memory_bank/mobile/ui/design_system_components.md`
- **Модель задач:** `.memory_bank/domain/task_model.md`
