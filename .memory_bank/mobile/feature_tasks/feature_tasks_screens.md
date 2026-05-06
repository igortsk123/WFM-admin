# Tasks Screens — UX и UI экранов задач

Описание пользовательского опыта и интерфейсов экранов управления задачами в мобильном приложении.

**Этот документ описывает:**
1. Список задач (TasksListScreen / TasksListView)
2. Блок информации о смене (ShiftInfoBlock)
3. Карточка задачи (TaskCardView)
4. Empty State компонент
5. Обработка состояний
6. Навигация
7. API интеграция

**Для экрана деталей задачи см.:** `.memory_bank/mobile/feature_tasks/task_detail_screen.md`
**Для компонента ShiftInfoBlock см.:** `.memory_bank/mobile/feature_tasks/shift_info_block.md`

**Связанные документы:**
- `.memory_bank/domain/task_model.md` — модель задач, типы, отчёты
- `.memory_bank/domain/task_states.md` — состояния задач и state machine
- `.memory_bank/backend/api_tasks.md` — API endpoints задач
- `.memory_bank/mobile/ui/ui_patterns.md` — UI паттерны (Pull-to-Refresh, Loading/Empty/Error state)

---

## 1. Экран: Список задач (TasksListScreen / TasksListView)

### Цель
Отобразить список задач текущей смены работника. Задачи загружаются из API по текущей смене (`GET /tasks/my`).

### Дизайн из Figma
**Node ID:** `3491-8535` (список карточек задач)

### Компоненты

**Заголовок:**
- Текст: "Список задач"
- Стиль: `WFMTypography.Headline20Bold` (iOS) / `WfmTypography.Headline20Bold` (Android)
- Фон: `colors.surfaceRaised`
- Padding: `WFMSpacing.L` / `WfmSpacing.L`
- Разделитель снизу: `colors.cardBorderSecondary`

**Блок информации о смене (ShiftInfoBlock):**
- Отображается между заголовком и списком задач
- Показывается только если смена открыта (`shift.status.isActive == true`)
- Содержит: дату смены, время с длительностью, прогресс выполнения задач
- Подробнее: `.memory_bank/mobile/feature_tasks/shift_info_block.md`

**Список карточек задач:**
- Компонент: `LazyVStack` (iOS) / `LazyColumn` (Android)
- Spacing между карточками: `WFMSpacing.S` / `WfmSpacing.S`
- Padding контейнера:
  - Horizontal: `WFMSpacing.L` / `WfmSpacing.L`
  - Vertical top: `WFMSpacing.M` / `WfmSpacing.M`
  - Vertical bottom: `WFMSpacing.L` / `WfmSpacing.L` + navigation bar padding (Android)
- Фон: `colors.surfaceBase`

**Pull-to-Refresh:**
- iOS: `.refreshable { await viewModel.refresh() }`
- Android: `PullToRefreshBox(isRefreshing, onRefresh)`
- Обновляет список задач из API
- Доступен во всех состояниях, включая Empty State (iOS: EmptyStateView обёрнут в GeometryReader + ScrollView для сохранения центрирования)

### Состояния экрана

#### 1. Loading (первая загрузка)
- Показать `ProgressView` (iOS) / `WfmLoader` (Android) по центру
- Фон: `colors.surfaceBase`
- Pull-to-refresh доступен

#### 2. Success (данные загружены)

**Подсостояние 2.1: Нет открытой смены** (`!hasOpenShift`)
- `hasOpenShift` — derived state от `userManager.currentShift` (проверка `shift?.status.isActive() == true`)
- Pull-to-refresh доступен (iOS: через GeometryReader + ScrollView)

**Вариант для работника:**
- Figma Node ID: исходный дизайн (без изменений)
- Featured icon: `futered-info` (56×56)
- Заголовок: "Список задач будет доступен после открытия смены" (Headline18Bold, textPrimary)
- Описание: отсутствует
- Кнопка: "Открыть смену" (primary style)
- Действие: `openShift` / `onOpenShift` callback

**Вариант для менеджера** (определяется по `currentAssignment?.position?.role?.id == 2`):
- Figma Node ID: `4329-24937`
- Featured icon: `futered-info` (56×56)
- Заголовок: "Смена не открыта" (Headline18Bold, textPrimary)
- Описание: "Задачи появятся, когда смена будет открыта. Сейчас доступна проверка сотрудников" (Body16Regular, cardTextSecondary)
- Кнопки:
  1. WFMLinkButton / WfmLinkButton "Проверить сотрудников" (size: medium)
  2. WFMPrimaryButton / WfmPrimaryButton "Открыть смену"
- Действия:
  - "Проверить сотрудников": переключает на таб "Контроль" (iOS: `switchToControlTab()`, Android: `onNavigateToControl()`)
  - "Открыть смену": `openShift` / `onOpenShift` callback

**Подсостояние 2.2: Пустой список задач** (`tasks.isEmpty()`)

**Вариант для работника:**
- Figma Node ID: `4252-41804`
- Featured icon: `futered-info` (56×56)
- Заголовок: "У вас нет задач" (Headline18Bold, textPrimary)
- Описание: "Обратитесь к руководителю для назначения задач" (Body16Regular, cardTextSecondary)
- Кнопки: нет

**Вариант для менеджера** (определяется по `currentAssignment?.position?.role?.id == 2`):
- Figma Node ID: `4329-25430`
- Featured icon: `futered-info` (56×56)
- Заголовок: "У вас нет задач" (Headline18Bold, textPrimary)
- Описание: "Вы можете проверить задачи сотрудников" (Body16Regular, cardTextSecondary)
- Кнопка: WFMSecondaryButton / WfmSecondaryButton "Проверить сотрудников"
- Действие: переключает на таб "Контроль" (iOS: `switchToControlTab()`, Android: `onNavigateToControl()`)

**Подсостояние 2.3: Список задач** (`tasks.isNotEmpty()`)
- Отображение списка карточек задач (см. секцию 2. TaskCardView)
- При клике на карточку: навигация на детальный экран задачи
  - iOS: `router.navigateToTaskDetail(taskId: task.id.uuidString)`
  - Android: `onTaskClick(task.id)`

#### 3. Error (ошибка загрузки)
**Когда показывается:** Произошла ошибка при загрузке данных и нет кэша (`errorMessage != null/nil`)
- Figma Node ID: `4329-25348`
- Featured icon: `futered-info` (56×56)
- Заголовок: "Данные не загрузились" (Headline18Bold, textPrimary)
- Описание: "Попробуйте проверить соединение или обновить страницу" (Body16Regular, cardTextSecondary)
- Кнопка: WFMSecondaryButton / WfmSecondaryButton "Обновить"
- Действие: перезагружает задачи (`viewModel.refresh()`)
- Pull-to-refresh доступен (iOS: через GeometryReader + ScrollView)

### Поведение

**При первом открытии экрана:**
- Вызывается `viewModel.loadTasks()` автоматически
  - iOS: `.task { await viewModel.loadTasks() }`
  - Android: `LaunchedEffect(Unit) { viewModel.loadTasks() }`
- ViewModel выполняет последовательно:
  1. Проверяет наличие currentUser, при необходимости загружает через `userManager.loadCurrentRole()`
  2. Проверяет наличие currentShift, при необходимости загружает через `userManager.checkShiftStatus()`
  3. Если смена активна и есть assignmentId, вызывает `GET /tasks/my?assignment_id={id}`

**При pull-to-refresh:**
- Вызывается `viewModel.refresh()`
- Обновляется список задач из API
- Индикатор загрузки на время запроса
- Задержка 200мс после завершения для корректной работы анимации
- Pull-to-refresh доступен во всех состояниях экрана, включая Empty State (iOS: через GeometryReader + ScrollView)

**При ошибке API:**
- При любой ошибке от сервера (непустой `code` в статусе)
- Автоматически вызывается `userManager.checkShiftStatus()` для синхронизации состояния смены
- Если смена обновилась (стала активной), делается повторная попытка загрузки задач
- Если смены нет или она не активна, показывается Empty State "Откройте смену"

**Навигация:**
- Клик на карточку задачи → Детальный экран задачи (передаётся `task.id`)

---

## 2. Компонент: Карточка задачи (TaskCardView)

### Цель
Компактно отобразить основную информацию о задаче в списке с отображением текущего состояния.

### Дизайн из Figma
**Node ID:** `3491-8538` (карточка задачи)

### Визуальная структура

**Контейнер карточки:**
- Фон: `colors.surfaceSecondary`
- Border:
  - Обычная карточка: `colors.cardBorderSecondary`, ширина 1px
  - **Отклонённая задача** (COMPLETED + rejectionReason): `colors.borderError`, ширина 1px
- Corner radius: `WFMRadius.XL`
- Padding внутри: `WFMSpacing.M` (top, horizontal, между блоками)
- Vertical spacing между блоками: `WFMSpacing.S`

**Структура вложенности:**
```
VStack/Column {
  VStack/Column (spacing: WFMSpacing.XXS) {
    Badge категории (если есть)
    Название зоны (с зачёркиванием для успешно завершённых)
  }

  WFMProgressBar (только для IN_PROGRESS и PAUSED)

  HStack/Row {  // скрыто для успешно завершённых (COMPLETED без rejection)
    Иконка + время
    Spacer
    Кнопка действия (текст зависит от состояния)
  }

  Rejection message block (только для отклонённых задач)
}
```

### Элементы карточки

#### 1. Верхний блок: Badge + Название зоны

**Контейнер:**
- Vertical spacing между badge и названием: `WFMSpacing.XXS`
- Badge и название находятся в одном вложенном VStack/Column

**Badge категории (опционально):**
- Источник данных: `task.category`
- Если `task.category != null` → показать badge
- Если `task.category == null` → скрыть badge
- Компонент: `WFMBadge` / `WfmBadge`
- Текст: `task.category.name` (примеры: "Выкладка", "Переоценка", "Приёмка товара")
- Цвет: маппинг по `category.id` (1→violet, 2→blue, 3→yellow, 4→pink, 5→orange, 6→green, 7→violet, default→blue)

**Название зоны:**
- Источник данных: `task.zone`
- Если `task.zone != null` → `task.zone.name` (примеры: "Торговый зал", "Склад", "Касса")
- Если `task.zone == null` → "N/A"
- Font: `WFMTypography.Headline14Medium` (iOS) / `WfmTypography.Headline14Medium` (Android)
- Color: `colors.cardTextPrimary`
- Max lines: 1
- Overflow: Ellipsis (обрезка с троеточием)
- **Зачёркивание:** если `task.safeState == .completed && !task.isRejected` (успешно завершённая задача)

**Реализация:**
- iOS: `task.categoryBadgeText()` → `String?`, `task.categoryBadgeColor()` → `BadgeColor`, `task.zoneDisplayName()` → `String`
- Android: `task.categoryBadgeText()` → `String?`, `task.categoryBadgeScheme()` → `BadgeColor`, `task.zoneDisplayName()` → `String`

#### 2. Прогресс-бар (только для IN_PROGRESS и PAUSED)

**Компонент:** `WFMProgressBar` / `WfmProgressBar`

**Отображается если:**
- `task.safeState == .inProgress` ИЛИ `task.safeState == .paused`

**Параметры:**
- `progress`: вычисляется через `task.calculateProgress()` (0.0 - 1.0)
- `type`: `.solid` (сплошная заливка)
- `state`:
  - `.paused` если `task.safeState == .paused` (заштрихованный паттерн)
  - `.normal` если `task.safeState == .inProgress` (обычный)
- `showText`: `false` (не показываем текст процента)

**Расчёт прогресса:**
- Используется `historyBrief.duration` (время в работе в секундах) и `plannedMinutes`
- Для IN_PROGRESS дополнительно учитывается elapsed time с момента последнего обновления (`historyBrief.timeStateUpdated`)
- Для PAUSED используется только `duration` без добавления elapsed time
- Результат: `(duration + elapsed) / (plannedMinutes * 60)`, ограничен максимумом 1.0
- Реализовано через extension методы: `calculateProgress()` на Task (iOS) / `Task.calculateProgress()` (Android)

#### 3. Нижний блок: Время выполнения + Кнопка действия

**Отображается если:**
- `task.safeState != .completed` ИЛИ `task.isRejected`
- **Скрывается** только для успешно завершённых задач (COMPLETED без rejectionReason)

**Источник данных:** `task.timeStart`, `task.timeEnd`, `task.plannedMinutes`

**Формат времени:**
- Если `timeStart` и `timeEnd` указаны: `"8:00-9:00 (1 час)"`
- Если НЕ указаны: `"120 мин"`

**Визуальное оформление:**
- Иконка часов (`ic-time`), цвет `colors.cardTextTertiary`, размер 12dp/12pt
- Текст справа от иконки, spacing `WFMSpacing.XXXS`
- Font: `WFMTypography.Caption12Regular` (iOS) / `WfmTypography.Caption12Regular` (Android)
- Color: `colors.cardTextTertiary`

**Реализация:**
- iOS: `task.formattedTimeRange()` → `String`
- Android: `task.formattedTimeRange()` → `String`

#### 4. Кнопка действия

**Текст кнопки (зависит от состояния задачи):**

| Состояние задачи | Текст кнопки |
|------------------|--------------|
| NEW | "К задаче" |
| IN_PROGRESS | "В работе" |
| PAUSED | "Приостановлена" |
| COMPLETED (с rejectionReason) | "Возвращена" |
| COMPLETED (без rejectionReason) | "Завершена" |

**Реализация:**
- Extension методы: `actionButtonText()` на Task (iOS) / `Task.actionButtonText()` (Android)

**Стиль:**
- Secondary neutral button, height 24dp/24pt
- Padding: `WFMSpacing.S`, radius: `WFMRadius.S`
- Background: `colors.bgSecondaryNeutral`, text: `colors.textPrimary`
- Font: `WFMTypography.Body12Medium` (Android) / `WFMTypography.headline12Medium` (iOS)

#### 5. Блок с сообщением об отклонении (только для отклонённых задач)

**Отображается если:**
- `task.safeState == .completed` И `task.rejectionReason != null`

**Визуальное оформление:**
- Текст: `task.rejectionReason`
- Font: `WFMTypography.Caption12Regular` (iOS) / `WfmTypography.Caption12Regular` (Android)
- Color: `colors.cardTextPrimary`
- Max lines: 1
- Overflow: Ellipsis (обрезка с троеточием)
- Background: `colors.badgeRedBgLight` (розовый фон)
- Padding: horizontal `WFMSpacing.M`, vertical `WFMSpacing.S`
- Располагается внизу карточки, за пределами основного контейнера с padding

### Интерактивность

**Клик на карточку:**
- Вызывается callback `onDetail()` / `onDetail`
- Навигация на детальный экран задачи

**Визуальная обратная связь:**
- iOS: `.contentShape(Rectangle())` + `.onTapGesture`
- Android: стандартный Material ripple effect

---

## 3. Empty State компонент

### Использование
Показывается в трёх сценариях:
1. **Нет открытой смены** — предложение открыть смену
2. **Пустой список задач** — рекомендации для работника
3. **Ошибка загрузки** — пустой прокручиваемый контейнер (для pull-to-refresh)

### Компонент
- iOS: `EmptyStateView` (структура с title, description, buttons)
- Android: `EmptyState` (компонент с title, description, buttons)

### Структура
**Title:**
- Основной текст (обязательный)
- Font: `WFMTypography.Headline16Medium` (примерно)
- Color: `colors.textPrimary`

**Description:**
- Дополнительный текст (опциональный)
- Font: `WFMTypography.Body14Regular`
- Color: `colors.textSecondary`

**Buttons:**
- Массив кнопок `[EmptyStateButton]`
- Стили: `.primary`, `.secondary`, `.link`
- Действие: callback `action`

---

## 4. Обработка состояний

### Loading
- Показать индикатор загрузки по центру
- Экран остаётся прокручиваемым для работы pull-to-refresh

### Success
- Проверка `hasOpenShift`:
  - `false` → Empty state "Откройте смену"
  - `true` → проверка `tasks.isEmpty()`:
    - `true` → Empty state "У вас нет задач"
    - `false` → список карточек задач

### Error
- Пустой прокручиваемый контейнер
- Пользователь может обновить через pull-to-refresh
- TODO: В будущем показывать сообщение об ошибке

---

## 5. Навигация

### Входящая навигация
- Tab Bar → вкладка "Задачи" (Tasks tab)
- Home screen → "Список задач"

### Исходящая навигация
- Карточка задачи → Детальный экран задачи (передаётся `task.id`)
- Empty state → "Открыть смену" (callback `openShift` / `onOpenShift`)
- Empty state → "Регламенты" (TODO)
- Empty state → "Сообщить директору" (TODO)

---

## 6. API интеграция

### Endpoint
`GET /tasks/my?assignment_id={assignment_id}&state={state}`

**Параметры:**
- `assignment_id` — ID назначения работника (обязательный)
- `state` — фильтр по состоянию задачи (опциональный, default: все состояния)

**Response:**
```json
{
  "status": "success",
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "title": "...",
        "operation_type": {
          "id": 1,
          "name": "Выкладка"
        },
        "zone": {
          "id": 1,
          "name": "Торговый зал",
          "priority": 1
        },
        "time_start": "08:00:00",
        "time_end": "09:00:00",
        "planned_minutes": 60,
        ...
      }
    ]
  }
}
```

**Обработка:**
- iOS: `TasksService.getMyTasks(assignmentId:state:)` → `[Task]`
- Android: `TasksService.getMyTasks(assignmentId, state)` → `List<Task>`

### Межсервисное взаимодействие
`GET /tasks/my` автоматически получает текущую смену работника через internal API `/internal/current-shift` сервиса Shifts.

---

## 7. Display Extensions (форматирование данных)

### iOS: Task+Display.swift

```swift
extension Task {
    // Badge категории
    func categoryBadgeText() -> String?        // operationType.name
    func categoryBadgeColor() -> BadgeColor    // маппинг по operationType.id

    // Зона
    func zoneDisplayName() -> String           // zone.name ?? "N/A"

    // Время
    func formattedTimeRange() -> String        // "8:00-9:00 (1 час)" или "120 мин"
}
```

### Android: TaskExtensions.kt

```kotlin
// Badge категории
fun Task.categoryBadgeText(): String?          // operationType?.name
fun Task.categoryBadgeScheme(): BadgeColor     // маппинг по operationType.id

// Зона
fun Task.zoneDisplayName(): String             // zone?.name ?: "N/A"

// Время
fun Task.formattedTimeRange(): String          // "8:00-9:00 (1 час)" или "120 мин"
```

---

## 8. UX принципы

**Простота:**
- Карточка задачи показывает только критичную информацию: тип операции, зону, время
- Детали задачи (описание, состояние, отчёты) — на детальном экране

**Консистентность:**
- Цвета badge унифицированы между типами операций
- Fallback для отсутствующих данных ("N/A" для зоны)
- Pull-to-refresh доступен во всех состояниях экрана

**Ориентация на задачу:**
- Фокус на текущую смену — показываются только задачи активной смены
- Empty state при отсутствии смены подсказывает открыть её

---

## 9. TODO и будущие улучшения

- [ ] Фильтрация задач по состоянию (NEW, IN_PROGRESS, PAUSED, COMPLETED)
- [ ] Группировка задач по зонам или типам операций
- [ ] Индикатор активной задачи (если task.state == IN_PROGRESS)
- [ ] Навигация на экран регламентов из Empty State
- [ ] Функционал "Сообщить директору" из Empty State
- [ ] Показывать сообщение об ошибке в Error state (сейчас пустой экран)
- [ ] Кнопка "К задаче" на карточке (быстрые действия)
- [ ] Поиск по задачам
- [ ] Свайп-действия на карточках (начать, завершить, пауза)

---

## 10. TasksListViewModel — логика и состояние

### Зависимости
- `TasksService` — API запросы задач
- `UserManager` — доступ к currentUser и currentShift
- `ToastManager` — показ сообщений об ошибках

**Важно:** ViewModel НЕ зависит от ShiftsService напрямую — проверка и обновление смены делегированы UserManager.

### Основные поля

**Состояние UI:**
- `tasks: [Task]` (iOS) / `_allTasks: MutableStateFlow<List<Task>>` (Android) — список задач
- `isLoading: Bool` (iOS) / `_uiState: TasksListUiState` (Android) — индикатор загрузки
- `isRefreshing: StateFlow<Boolean>` (Android) — состояние pull-to-refresh
- `filterState: TaskState?` — фильтр по состоянию задачи

**Derived state:**
- `hasOpenShift: StateFlow<Boolean>` — вычисляется из `userManager.currentShift.map { shift?.status.isActive() == true }`
- `activeTask: StateFlow<Task?>` — первая задача в состоянии IN_PROGRESS

### Методы

**`loadTasks()`** — основная загрузка задач:
1. Проверяет наличие currentUser, при необходимости вызывает `userManager.loadCurrentRole()`
2. Проверяет наличие currentShift, при необходимости вызывает `userManager.checkShiftStatus()`
3. Проверяет что смена активна (`currentShift.status.isActive()`)
4. Получает `assignmentId` из `currentShift.assignmentId`
5. Вызывает `tasksService.getMyTasks(assignmentId, filterState)`
6. При любой ошибке от API:
   - Вызывает `userManager.checkShiftStatus()` для синхронизации
   - Если смена обновилась, повторяет запрос
   - Если смены нет, показывает Empty State

**`refresh()`** — обновление списка:
- Вызывает `loadTasks()`
- Добавляет задержку 200мс после завершения для корректной работы pull-to-refresh анимации

**`setFilterState(state: TaskState?)`** — изменение фильтра:
- Обновляет `filterState`
- Вызывает `loadTasks()` для перезагрузки с новым фильтром

### Логика обработки ошибок

**При ошибке от API (непустой `code` в статусе):**
1. Автоматически вызывается `userManager.checkShiftStatus()`
2. Если `currentShift` обновилась и стала активной:
   - Повторяется запрос `getMyTasks()` с обновленным assignmentId
3. Если смены все еще нет или она не активна:
   - Показывается Empty State "Откройте смену"
   - Старые данные не очищаются (для корректной работы pull-to-refresh)

**При сетевых ошибках:**
- Показывается toast с сообщением об ошибке
- Старые данные остаются на экране (не очищаются)

### Особенности реализации

**hasOpenShift как derived state:**
- iOS: `userManager.$currentShift.map { $0?.status.isActive == true }.assign(to: &$hasOpenShift)`
- Android: `userManager.currentShift.map { it?.status?.isActive() == true }.stateIn(...)`

**Pull-to-refresh задержка:**
- Добавлена задержка 200мс после завершения refresh для корректной работы анимации
- Без задержки анимация "зависает" при мгновенном завершении запроса

---

**Связанные документы:**
- Модель задач → `.memory_bank/domain/task_model.md`
- State machine → `.memory_bank/domain/task_states.md`
- API задач → `.memory_bank/backend/api_tasks.md`
- UserManager → `.memory_bank/mobile/managers/user_manager.md`
- UI паттерны → `.memory_bank/mobile/ui/ui_patterns.md`
- Дизайн-система → `.memory_bank/mobile/ui/design_system_components.md`
