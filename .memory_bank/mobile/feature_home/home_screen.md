# Экран "Главная" (Home Tab)

## Назначение

Главный экран приложения. Показывает информацию о текущем пользователе и карточку смены с возможностью открыть/закрыть смену.

**Статус:** Реализован

## Что показывается

### 1. Шапка профиля (фиксированная)

Закреплена вверху, не прокручивается вместе с контентом:
- Аватар пользователя (40×40, круглый)
  - Если фото есть → загружается с сервера через Kingfisher / Coil
  - Если фото нет → серый круг с иконкой человека
- Приветствие "Привет, {имя}" (Headline16Bold)
- Текущая дата (Body14Regular, textSecondary)
- Граница снизу (1px, cardBorderSecondary)

### 2. Карточка смены (ShiftCardView / ShiftCard)

Основной контент экрана. Отображает текущую смену в одном из **6 состояний**.

#### Общая структура карточки (для состояний NEW, DELAY, IN_PROGRESS, DONE)

**Верхняя часть (серый фон):**
- Бейдж должности (Body12Medium, textBrand + bgButtonSecondaryDefault фон)
- Время смены: всегда `startTime - endTime` из плана (Headline24Bold), например `08:00 - 20:00`
- Статус (Body12Medium) — см. таблицу ниже

**Нижняя строка (адрес + длительность):**
- Иконка `ic-pin-filled` / `ic_pin_filled` (12×12) + адрес магазина
- Иконка `ic-duration` / `ic_duration` (12×12) + длительность смены
- Адрес и длительность расположены рядом (8dp между ними), адрес сжимается если не хватает места
- Длительность всегда считается как `endTime - startTime` (не через openedAt/closedAt)

**Секция "Ваш план дня" (белый фон, вне серой секции):**
- Заголовок: "Ваш план дня" (Body14Bold, textPrimary)
- Список задач (максимум 6 первых задач)
- Каждая задача: название, длительность (например, "45 мин"), цветной индикатор слева
- Skeleton loading (6 карточек) пока задачи загружаются
- Если задач нет и загрузка завершена — секция не отображается
- Используются форматтеры из `TaskExtensions.kt` / `Task+Display.swift` для отображения длительности

**Цветные индикаторы задач:**
Цвет определяется по `workTypeId` (задаётся на бэкенде при создании задачи):
- 0 → VIOLET (Brand500)
- 1 → BLUE (Blue500)
- 2 → YELLOW (Yellow600)
- 3 → PINK (Pink400)
- 4 → ORANGE (Orange500)
- 5 → GREEN (Green600)

**Файлы реализации:**
- iOS: `Features/Home/Components/ShiftCardView.swift` — метод `taskColor(for:)`
- Android: `features/home/components/ShiftCard.kt` — extension `BadgeColor.toAccentColor()`

#### Состояния и их statusText

| Состояние | Условие | statusText | Цвет |
|-----------|---------|------------|------|
| **NEW** | shift.status = new, время не пришло | "Начнется через X ч Y мин" / "Начинается сейчас" | textSecondary |
| **DELAY** | shift.status = new, время прошло | "Вы опаздываете на X ч Y мин" | textError (красный) |
| **IN_PROGRESS** | shift.status = opened | "До конца смены X ч Y мин" / "Смена заканчивается" | textSecondary |
| **DONE** | shift.status = closed | "Смена закрыта" | textSecondary |

Тикер обновляет `statusText` каждую минуту (Timer / `_now` StateFlow).

#### Кнопки действия

| Состояние | Кнопка |
|-----------|--------|
| NEW, DELAY, DONE | "Открыть смену" (WFMPrimaryButton, с лоадером) |
| IN_PROGRESS | "Закрыть смену" (WFMSecondaryButton) → показывает CloseShiftBottomSheet |

#### Состояние NO_DATA — Данные не загрузились
- Иконка `futured` / `ic_featured` (56×56, собственные цвета PNG/SVG)
- Заголовок: "Данные не загрузились" (Headline18Bold / Headline20Bold)
- Подпись: "Попробуйте обновить страницу" (Body16Regular)
- Кнопка **"Обновить"** (WFMSecondaryButton)

#### Состояние EMPTY — Нет задач
- Иконка `futered-info` / `ic_featured_info` (56×56, собственные цвета PNG/SVG)
- Заголовок: "У вас нет задач" (Headline18Bold / Headline20Bold)
- Подпись: "Ожидайте назначения задач или обратитесь к директору" (Body16Regular)
- Кнопка **"Сообщить директору"** (WFMSecondaryButton)

### 3. CloseShiftBottomSheet — Подтверждение закрытия смены

Показывается при нажатии кнопки "Закрыть смену" (состояние IN_PROGRESS).

**Обычное закрытие (первое нажатие):**
- Title: **"Закрыть смену?"**
- Message: отсутствует
- Кнопки: **"Отменить"** (secondary) + **"Закрыть"** (primary)
- `showOverlay = true` — с затемнением фона

**Обработка незавершённых задач:**

При подтверждении отправляется запрос `POST /shifts/close` (без `force`). Если API возвращает ошибку с кодом `TASKS_PAUSED` или `TASKS_IN_PROGRESS` — **BottomSheet не закрывается**, а обновляется с новым текстом:

| Ошибка | Title | Message |
|--------|-------|---------|
| `TASKS_PAUSED` | "Закрыть смену?" | "У вас есть незавершённые задачи" |
| `TASKS_IN_PROGRESS` | "Приостановить задачу и закрыть смену?" | отсутствует |

При повторном подтверждении отправляется `POST /shifts/close` с параметром `force: true`. Это принудительно приостанавливает задачи в работе и закрывает смену.

**Поведение BottomSheet:**
- При клике на **"Закрыть"** → BottomSheet **остаётся открытым**, показывается loading (`isShiftLoading`)
- При успехе → BottomSheet закрывается автоматически, показывается тост "Смена закрыта"
- При ошибке `TASKS_PAUSED` / `TASKS_IN_PROGRESS` → BottomSheet **обновляется** с новым title/message
- При других ошибках → BottomSheet закрывается, показывается тост с ошибкой
- При закрытии свайпом/кликом вне зоны → очищаются title и message

## Как это работает

### ViewModel

**HomeViewModel** — универсальный ViewModel для работника и управляющего:
- Инициализируется с параметром `role: HomeUserRole` (`.worker` или `.manager`)
- Для работника: показывает карточку смены с задачами
- Для управляющего: показывает карточку смены + секцию "Задачи на проверку"
- Используется локальное копирование данных из UserManager для предотвращения отмены запросов

**Загрузка данных:**
1. При открытии экрана (`loadData()` / `onAppear()`):
   - Загружает профиль пользователя и текущую смену через `UserManager.refresh()`
   - Если смена существует → загружает первые 6 задач через `loadPlanTasks(assignmentId:)`
2. При Pull-to-Refresh:
   - Обновляет профиль, смену и задачи
3. Использует Task/Job cancellation для предотвращения конкурирующих запросов

**Подробнее:** см. раздел "Унификация ViewModel" ниже

### Источник данных

**UserManager** — загружает и кэширует профиль пользователя и текущую смену:
- `GET /users/me` — профиль (имя, фото, должность)
- `GET /shifts/current` — текущая смена
- При первом открытии: загрузка с сервера
- При Pull-to-Refresh: обновление обоих запросов

**TasksService** — загружает задачи для карточки смены:
- `GET /tasks/my?assignment_id=X` — задачи работника (первые 6 для "Ваш план дня")
- Использует HTTP кэширование (stale-while-revalidate)
- При первом открытии: показывает кэш → обновляет свежими данными
- При Pull-to-Refresh: обновляет задачи вместе с профилем и сменой
- Показывает skeleton loading (6 карточек) пока задачи загружаются

### API-ответ GET /shifts/current

Смена всегда возвращает `start_time` и `end_time` независимо от статуса (NEW/OPENED/CLOSED).
Для OPENED/CLOSED смен `shift_date` может быть `null` — в этом случае дата берётся из `opened_at`.

### Определение состояния карточки

`HomeViewModel` вычисляет `shiftCardState` на основе `currentShift` и `planTasks`:

| Условие | Состояние |
|---------|-----------|
| `currentShift == nil` | `noData` |
| UiState == Error | `noData` |
| `shift.status == (new OR opened)` + задачи загружены + `planTasks.isEmpty` | `empty` |
| `shift.status == .opened` | `inProgress` |
| `shift.status == .closed` | `done` |
| `shift.status == .new` + текущее время < startTime | `new` |
| `shift.status == .new` + текущее время ≥ startTime | `delay` |

**Важно:** Состояние `empty` определяется **после загрузки задач** (`isPlanTasksLoading = false`). Пока задачи загружаются — показывается соответствующее состояние смены (NEW/IN_PROGRESS/DELAY) со скелетонами.

### Открытие/закрытие смены

`HomeViewModel.openShift(force: Bool = false)`:
- Если смена NEW/CLOSED → `UserManager.openShift(planId:)` → `POST /shifts/open` → тост "Смена открыта"
- Если смена OPENED → `UserManager.closeShift(planId:, force:)` → `POST /shifts/close` → обработка ответа:
  - **Успех** → `shiftClosedSuccessfully = true` → BottomSheet закрывается, тост "Смена закрыта"
  - **Ошибка `TASKS_PAUSED`** → `closeShiftTitle` + `closeShiftMessage` устанавливаются → BottomSheet обновляется
  - **Ошибка `TASKS_IN_PROGRESS`** → `closeShiftTitle` устанавливается → BottomSheet обновляется с другим текстом
  - **Другие ошибки** → `shiftClosedSuccessfully = true` → BottomSheet закрывается, тост с ошибкой
- Флаг `isShiftLoading` показывает лоадер в кнопке и BottomSheet

**Управление состоянием:**
- `closeShiftTitle` (String?) — title для BottomSheet при наличии незавершённых задач
- `closeShiftMessage` (String?) — дополнительный текст для TASKS_PAUSED
- `shiftClosedSuccessfully` (Bool) — флаг успешного закрытия смены, триггерит закрытие BottomSheet
- При закрытии BottomSheet свайпом/dismiss → вызывается `clearCloseShiftMessage()`, очищает title и message

### Pull-to-Refresh

- iOS: `.refreshable { await viewModel.refreshData() }`
- Android: `PullToRefreshBox(isRefreshing = isRefreshing, onRefresh = { viewModel.refreshData() })`

**Механизм:**
- Вызывает `refreshData()` → обновляет профиль, смену и задачи
- Использует Task/Job cancellation для отмены предыдущих запросов
- `isRefreshing` флаг управляет индикатором загрузки

При ошибке во время PR → показывается тост (данные не сбрасываются).

**Подробнее:** `.memory_bank/mobile/architecture/request_cancellation.md`

## Состояния экрана (UiState)

| Состояние | Отображение |
|-----------|-------------|
| Loading | Лоадер по центру (только при первом открытии) |
| Success | Карточка смены |
| Error | Сообщение об ошибке (при первом открытии без данных) |

## Навигация

Экран одноуровневый. При переключении таба и возврате — состояние сохраняется (кэш в UserManager).

## Унификация ViewModel

**С марта 2025** `HomeViewModel` используется как для работника, так и для управляющего (ранее был отдельный `ManagerHomeViewModel`).

### Ключевые изменения

**1. Role Parameter:**
- ViewModel инициализируется с параметром `role: HomeUserRole`
- Enum значения: `.worker` (iOS) / `WORKER` (Android) или `.manager` / `MANAGER`
- DI: `DependencyContainer.makeHomeViewModel(role:)` / `koinViewModel { parametersOf(role) }`

**2. Локальное копирование данных:**
- `localCurrentShift` — локальная копия смены из UserManager
- `localCurrentUser` — локальная копия пользователя
- `localCurrentAssignment` — локальная копия назначения
- Подписка через `.assign(to:)` вместо форвардинга `objectWillChange`
- **Причина:** предотвращение отмены `.task` при изменении данных во время refresh

**3. Переиспользуемые компоненты:**
- `ProfileHeaderView` (iOS) / `ProfileHeader` (Android) — компонент шапки профиля
- `ShiftTimeCalculator` — утилита для расчета времени смен (см. `.memory_bank/mobile/utilities/shift_time_calculator.md`)

**4. Предотвращение отмены запросов:**
- Task/Job cancellation для конкурирующих запросов:
  - iOS: `private var loadPlanTasksTask: _Concurrency.Task<Void, Never>?`
  - Android: `private var loadPlanTasksJob: Job?`
  - Отмена предыдущих запросов перед новыми: `task?.cancel()` / `job?.cancel()`
- `isRefreshing` флаг для предотвращения дублирующих запросов при Pull-to-Refresh
- Локальное копирование данных через `.assign(to:)` предотвращает отмену `.task` при изменении `objectWillChange`

### Преимущества унификации

- Единый источник логики для работы со сменами
- Устранение дублирования ~220 строк кода на платформу
- Упрощение поддержки и тестирования

## Файлы

**iOS:**
- `Features/Home/HomeView.swift` — экран работника
- `Features/Home/HomeViewModel.swift` — универсальная логика (worker + manager)
- `Features/Home/Components/ShiftCardView.swift` — карточка смены
- `Features/Home/Components/ProfileHeaderView.swift` — шапка профиля
- `Features/Home/CloseShiftBottomSheet.swift` — шит подтверждения закрытия
- `Core/Models/ShiftTimeCalculator.swift` — утилита расчета времени

**Android:**
- `features/home/HomeScreen.kt` — экран работника
- `features/home/HomeViewModel.kt` — универсальная логика (worker + manager)
- `features/home/components/ShiftCard.kt` — карточка смены
- `features/home/components/ProfileHeader.kt` — шапка профиля
- `features/home/CloseShiftBottomSheet.kt` — шит подтверждения закрытия
- `core/models/ShiftTimeCalculator.kt` — утилита расчета времени

## Иконки карточки смены

| Иконка iOS | Иконка Android | Место использования | Размер |
|------------|----------------|---------------------|--------|
| `ic-pin-filled` | `ic_pin_filled` | Адрес магазина | 12×12 |
| `ic-duration` | `ic_duration` | Длительность смены | 12×12 |
| `futured` (PNG) | `ic_featured` | EmptyState — "Данные не загрузились" | 56×56 |
| `futered-info` (PNG) | `ic_featured_info` | EmptyState — "У вас нет задач" | 56×56 |

Иконки pin и duration отображаются с оригинальными цветами (`renderingMode(.original)` / `Color.Unspecified`).
EmptyState-иконки самодостаточны (56×56 со встроенным фоном-кружком), внешний Circle не используется.

## Связанные документы

- **Структура приложения:** `.memory_bank/mobile/architecture/app_structure.md`
- **UserManager:** `.memory_bank/mobile/managers/user_manager.md`
- **UI компоненты:** `.memory_bank/mobile/ui/design_system_components.md`
- **BottomSheet:** `.memory_bank/mobile/ui/bottomsheet.md`
- **Модель смены:** `.memory_bank/domain/shift_model.md`
- **Форматирование времени/даты:** `.memory_bank/mobile/utilities/time_date_formatting.md`
- **Request Cancellation:** `.memory_bank/mobile/architecture/request_cancellation.md`
