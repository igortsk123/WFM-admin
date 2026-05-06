# ShiftInfoBlock Component

## Назначение

Информационный блок, отображающий данные о текущей смене на экране списка задач. Показывает:
- Дату смены в русском формате ("12 февраля 2025")
- Время смены с длительностью ("8:00-20:00 (12 часов)")
- Прогресс выполнения задач с segmented progress bar
- Статистику: "Выполнено X из Y основных задач"

**Расположение:** Между заголовком экрана и списком задач

## Дизайн

**Figma:** nodes 3494-9245 и 3494-9579

**Design Tokens:**
- Background: `surfaceSecondary` (белый)
- Label text: `cardTextTertiary` (#808095)
- Value text: `cardTextPrimary` (#373742)
- Padding: `WFMSpacing.l` / `WfmSpacing.L` (16pt/dp)
- Vertical spacing между секциями: `WFMSpacing.xs` / `WfmSpacing.XS` (8pt/dp)
- Vertical spacing внутри секций: `WFMSpacing.xxs` / `WfmSpacing.XXS` (4pt/dp)
- Icon size: 12×12pt/dp

**Layout:**
- Horizontal spacing между "Дата" и "Время": 0 (weight distribution)
- Date section: flexible width (maxWidth: .infinity / weight: 1f)
- Time section: flexible width (maxWidth: .infinity / weight: 1f)

## Логика отображения

**Условия показа:**
- Блок отображается только если `shift.status.isActive == true`
- Если смены нет или она не открыта → блок скрыт

**Подсчёт задач:**
- **Общее количество:** `tasks.count` (ВСЕ задачи, filter по taskType закомментирован)
- **Завершённые задачи:** `tasks.filter { state == .completed && reviewState == .accepted }`
- **Важно:** Хотя считаются все задачи, текст показывает "основных задач"

**Прогресс:**
- Progress value: `completedTasksCount / totalTasksCount` (0.0 - 1.0)
- Progress bar type: `.dashed` / `DASHED`
- Segment count: `totalTasksCount` (количество сегментов = количеству всех задач)
- Show text: `true`

## Форматирование данных

### Дата смены

**Формат входных данных:** `"YYYY-MM-DD"` (ISO 8601), например `"2025-02-12"`

**Формат вывода:** `"d MMMM yyyy"` с русской локалью, например `"12 февраля 2025"`

**iOS:**
```swift
// DateFormatters.swift
enum DateFormatters {
    static func formatShiftDate(_ dateString: String) -> String {
        let inputFormatter = DateFormatter()
        inputFormatter.dateFormat = "yyyy-MM-dd"
        inputFormatter.locale = Locale(identifier: "ru_RU")

        guard let date = inputFormatter.date(from: dateString) else {
            return dateString
        }

        let outputFormatter = DateFormatter()
        outputFormatter.dateFormat = "d MMMM yyyy"
        outputFormatter.locale = Locale(identifier: "ru_RU")

        return outputFormatter.string(from: date)
    }
}
```

**Android:**
```kotlin
// DateFormatters.kt
object DateFormatters {
    fun formatShiftDate(dateString: String): String {
        if (dateString.isEmpty()) return ""

        return try {
            val inputFormatter = SimpleDateFormat("yyyy-MM-dd", Locale("ru", "RU"))
            val date = inputFormatter.parse(dateString) ?: return dateString

            val outputFormatter = SimpleDateFormat("d MMMM yyyy", Locale("ru", "RU"))
            outputFormatter.format(date)
        } catch (e: Exception) {
            dateString
        }
    }
}
```

### Время смены с длительностью

**Формат входных данных:** `"HH:MM:SS"`, например `"08:00:00"`, `"20:00:00"`

**Формат вывода:** `"H:MM-H:MM (X часов)"`, например `"8:00-20:00 (12 часов)"`

**Правила склонения "час":**
- 1, 21, 31, ... → "час"
- 2-4, 22-24, 32-34, ... → "часа"
- 5-20, 25-30, ... → "часов"
- Исключение: 11-14 всегда "часов"

**iOS:**
```swift
// TimeFormatters.swift
enum TimeFormatters {
    static func formatShiftTime(start: String, end: String) -> String {
        let startFormatted = formatTime(start)  // "08:00:00" → "8:00"
        let endFormatted = formatTime(end)      // "20:00:00" → "20:00"

        guard let startHour = extractHour(from: start),
              let endHour = extractHour(from: end) else {
            return "\(startFormatted)-\(endFormatted)"
        }

        let duration = endHour - startHour
        let hoursWord = pluralizeHours(duration)

        return "\(startFormatted)-\(endFormatted) (\(duration) \(hoursWord))"
    }

    private static func pluralizeHours(_ hours: Int) -> String {
        let lastDigit = hours % 10
        let lastTwoDigits = hours % 100

        if lastTwoDigits >= 11 && lastTwoDigits <= 14 {
            return "часов"
        }

        switch lastDigit {
        case 1: return "час"
        case 2, 3, 4: return "часа"
        default: return "часов"
        }
    }
}
```

**Android:**
```kotlin
// TimeFormatters.kt
object TimeFormatters {
    fun formatShiftTime(start: String, end: String): String {
        if (start.isEmpty() || end.isEmpty()) return ""

        val startFormatted = formatTime(start)  // "08:00:00" → "8:00"
        val endFormatted = formatTime(end)      // "20:00:00" → "20:00"

        val startHour = extractHour(start)
        val endHour = extractHour(end)

        if (startHour == null || endHour == null) {
            return "$startFormatted-$endFormatted"
        }

        val duration = endHour - startHour
        val hoursWord = pluralizeHours(duration)

        return "$startFormatted-$endFormatted ($duration $hoursWord)"
    }

    private fun pluralizeHours(hours: Int): String {
        val lastDigit = hours % 10
        val lastTwoDigits = hours % 100

        if (lastTwoDigits in 11..14) {
            return "часов"
        }

        return when (lastDigit) {
            1 -> "час"
            2, 3, 4 -> "часа"
            else -> "часов"
        }
    }
}
```

## Иконки

**Требуемые ассеты:**
- `ic-calendar` (iOS) / `ic_calendar` (Android) — иконка календаря, 12×12
- `ic-time` (iOS) / `ic_time` (Android) — иконка часов, 12×12

**iOS:**
- Формат: SVG, добавлен в Asset Catalog
- Template rendering: `.template` (для применения tint color)
- Расположение: `WFMApp/Assets.xcassets/ic-calendar.imageset/`

**Android:**
- Формат: VectorDrawable (XML)
- Расположение: `app/src/main/res/drawable/ic_calendar.xml`

**Использование:**

iOS:
```swift
Image("ic-calendar")
    .resizable()
    .renderingMode(.template)
    .frame(width: 12, height: 12)
    .foregroundStyle(colors.cardTextPrimary)
```

Android:
```kotlin
Icon(
    painter = painterResource(id = R.drawable.ic_calendar),
    contentDescription = null,
    modifier = Modifier.size(12.dp),
    tint = colors.cardTextPrimary
)
```

## Граничные случаи

### 1. Смена отсутствует (nil/null)
**Поведение:** Блок не отображается

**iOS:**
```swift
if let currentShift = userManager.currentShift,
   currentShift.status.isActive {
    ShiftInfoBlock(...)
}
```

**Android:**
```kotlin
currentShift?.let { shift ->
    if (shift.status?.isActive() == true) {
        ShiftInfoBlock(...)
    }
}
```

### 2. Смена не открыта (status != OPENED)
**Поведение:** Блок не отображается (проверка `status.isActive`)

### 3. Пустой список задач
**Поведение:**
- Progress: 0.0 (пустой прогресс-бар)
- Text: "Выполнено 0 из 0 основных задач"
- Segment count: 0

### 4. Все задачи выполнены
**Поведение:**
- Progress: 1.0 (полный прогресс-бар)
- Text: "Выполнено N из N основных задач"

### 5. Отсутствуют поля shiftDate, startTime, endTime
**Поведение:** Пустые строки вместо дат/времени

**Реализация:**

iOS:
```swift
private var formattedDate: String {
    guard let shiftDateString = shift.shiftDate else { return "" }
    return DateFormatters.formatShiftDate(shiftDateString)
}
```

Android:
```kotlin
DateFormatters.formatShiftDate(shift.shiftDate ?: "")
// Внутри форматтера: if (dateString.isEmpty()) return ""
```

## Реактивность

**iOS:**
- ShiftInfoBlock получает `shift` и `tasks` как параметры
- Автоматическое обновление через `@EnvironmentObject userManager`
- При изменении `userManager.currentShift` или `viewModel.tasks` → SwiftUI перерендерит компонент

**Android:**
- ShiftInfoBlock — stateless composable
- `currentShift` получается через `viewModel.userManager.currentShift.collectAsState()`
- `tasks` получаются из `(uiState as? TasksListUiState.Success)?.tasks`
- При изменении StateFlow → Compose автоматически перекомпозирует

## Интеграция в экран списка задач

**iOS** (`TasksListView.swift`):
```swift
struct TasksListView: View {
    @EnvironmentObject private var userManager: UserManager  // Добавлено
    @StateObject private var viewModel: TasksListViewModel

    var body: some View {
        VStack(spacing: 0) {
            customHeader

            // ShiftInfoBlock между заголовком и списком
            if let currentShift = userManager.currentShift,
               currentShift.status.isActive {
                ShiftInfoBlock(shift: currentShift, tasks: viewModel.tasks)
                    .background(colors.surfaceSecondary)
            }

            tasksList
        }
    }
}
```

**Важно:** В `MainTabView.swift` нужно добавить `.environmentObject(container.userManager)` для TasksListView:
```swift
NavigationStack(path: $router.mainPath) {
    TasksListView(viewModel: tasksListViewModel)
        .environmentObject(container.userManager)  // Добавлено
}
```

**Android** (`TasksListScreen.kt`):
```kotlin
@Composable
fun TasksListScreen(
    onTaskClick: (String) -> Unit,
    onOpenShift: () -> Unit,
    viewModel: TasksListViewModel
) {
    Column {
        // Header
        Column(
            modifier = Modifier
                .background(colors.surfaceRaised)
                .statusBarsPadding()
        ) {
            Text("Список задач", ...)
            HorizontalDivider(...)

            // ShiftInfoBlock между заголовком и контентом
            val currentShift by viewModel.userManager.currentShift.collectAsState()
            currentShift?.let { shift ->
                if (shift.status?.isActive() == true) {
                    val tasks = (uiState as? TasksListUiState.Success)?.tasks ?: emptyList()
                    ShiftInfoBlock(
                        shift = shift,
                        tasks = tasks,
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(colors.surfaceSecondary)
                    )
                }
            }
        }

        // Pull-to-refresh content
        PullToRefreshBox { ... }
    }
}
```

**Важно:** В `TasksListViewModel.kt` нужно сделать `userManager` публичным:
```kotlin
class TasksListViewModel(
    private val tasksService: TasksService,
    val userManager: UserManager,  // Изменено с private на val
    private val toastManager: ToastManager
) : ViewModel()
```

## Файлы реализации

### iOS
- `WFMApp/Features/TasksFeature/Views/ShiftInfoBlock.swift` — компонент
- `WFMApp/Core/Utilities/DateFormatters.swift` — форматирование даты и времени
- `WFMApp/Features/TasksFeature/Views/TasksListView.swift` — интеграция
- `WFMApp/Features/MainFlow/MainTabView.swift` — добавлен environmentObject
- `WFMApp/Assets.xcassets/ic-calendar.imageset/` — иконка календаря
- `WFMApp/Assets.xcassets/ic-time.imageset/` — иконка часов

### Android
- `app/.../features/tasks/presentation/ui/components/ShiftInfoBlock.kt` — компонент
- `app/.../core/utils/DateFormatters.kt` — форматирование даты
- `app/.../core/utils/TimeFormatters.kt` — форматирование времени
- `app/.../features/tasks/presentation/ui/TasksListScreen.kt` — интеграция
- `app/.../features/tasks/presentation/viewmodels/TasksListViewModel.kt` — публичный userManager
- `app/src/main/res/drawable/ic_calendar.xml` — иконка календаря
- `app/src/main/res/drawable/ic_time.xml` — иконка часов

## Зависимости

**iOS:**
- WFMUI module (WFMProgressBar, WFMSpacing, WFMTypography, WFMColors)
- UserManager (для доступа к currentShift)
- TasksListViewModel (для доступа к tasks)

**Android:**
- ui module (WfmProgressBar, WfmSpacing, WfmTypography, WfmColors, WfmTheme)
- UserManager (для доступа к currentShift через StateFlow)
- TasksListViewModel (для доступа к userManager и tasks через UiState)

## Preview компоненты

**iOS:**
Два Preview компонента в `ShiftInfoBlock.swift`:
1. "Shift Info Block - С задачами" — 5 задач, 2 выполнено
2. "Shift Info Block - Пустой список" — 0 задач

**Android:**
Два Preview composable в `ShiftInfoBlock.kt`:
1. `ShiftInfoBlockPreview()` — 5 задач, 2 выполнено
2. `ShiftInfoBlockEmptyPreview()` — 0 задач

## Производительность

**Фильтрация задач:**
- iOS: Computed properties кэшируются SwiftUI, пересчёт только при изменении `tasks`
- Android: Compose автоматически пересчитывает только при изменении `tasks` parameter

**Частота обновления:**
- Только при загрузке/обновлении задач (Pull-to-Refresh, loadTasks)
- Не при каждом кадре

**Оптимальность:**
- Для списков до 100 задач: фильтрация < 1ms
- Форматтеры дат/времени: < 1ms на вызов
