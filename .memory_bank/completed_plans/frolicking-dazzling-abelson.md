# План: Добавление блока информации о смене на экран списка задач

**Статус:** Выполнено
**Создан:** 2026-03-04
**Завершён:** 2026-03-04

## Цель

Добавить информационный блок с данными о текущей смене на экран списка задач для iOS и Android. Блок должен отображать:
- Дату смены с иконкой календаря (формат: "12 февраля 2025")
- Время смены с иконкой часов (формат: "8:00-20:00 (12 часов)")
- Прогресс-бар с количеством выполненных задач
- Текст: "Выполнено X из Y основных задач"

**Источник дизайна:** Figma nodes 3494-9245 и 3494-9579

## Задачи

- [x] 1. iOS: Создать компонент ShiftInfoBlock
- [x] 2. iOS: Добавить форматтеры даты и времени
- [x] 3. iOS: Интегрировать ShiftInfoBlock в TasksListView
- [x] 4. Android: Создать компонент ShiftInfoBlock
- [x] 5. Android: Добавить форматтеры даты и времени
- [x] 6. Android: Интегрировать ShiftInfoBlock в TasksListScreen
- [x] 7. Тестирование на обеих платформах

## Детальный план реализации

### Часть 1: iOS Implementation

#### 1.1. Создание компонента ShiftInfoBlock

**Файл:** `/Users/nikitaleontev/Desktop/wfm/mobile/ios/WFMApp/Features/TasksFeature/Views/ShiftInfoBlock.swift`

**Структура компонента:**

```swift
import SwiftUI
import WFMUI

/// Блок информации о текущей смене
/// Показывает дату, время и прогресс выполнения задач
struct ShiftInfoBlock: View {
    // MARK: - Properties
    let shift: CurrentShift
    let tasks: [Task]
    
    @Environment(\.wfmColors) private var colors
    
    // MARK: - Computed Properties
    
    /// Общее количество плановых задач
    private var totalTasksCount: Int {
        tasks.filter { $0.taskType == .planned }.count
    }
    
    /// Количество завершённых и принятых плановых задач
    private var completedTasksCount: Int {
        tasks.filter { task in
            task.taskType == .planned &&
            task.state == .completed &&
            task.reviewState == .accepted
        }.count
    }
    
    /// Прогресс выполнения (0.0 - 1.0)
    private var progress: Float {
        guard totalTasksCount > 0 else { return 0.0 }
        return Float(completedTasksCount) / Float(totalTasksCount)
    }
    
    /// Форматированная дата смены
    private var formattedDate: String {
        guard let shiftDateString = shift.shiftDate else { return "" }
        return DateFormatters.formatShiftDate(shiftDateString)
    }
    
    /// Форматированное время смены с длительностью
    private var formattedTime: String {
        guard let startTime = shift.startTime,
              let endTime = shift.endTime else { return "" }
        return TimeFormatters.formatShiftTime(start: startTime, end: endTime)
    }
    
    // MARK: - Body
    
    var body: some View {
        VStack(spacing: WFMSpacing.xs) {
            // Секция с датой и временем
            HStack(spacing: 17) {
                // Дата
                VStack(alignment: .leading, spacing: WFMSpacing.xxs) {
                    Text("Дата")
                        .wfmBody12Regular()
                        .foregroundStyle(colors.cardTextTertiary)
                    
                    HStack(spacing: 2) {
                        Image("ic-calendar")
                            .resizable()
                            .renderingMode(.template)
                            .frame(width: 12, height: 12)
                            .foregroundStyle(colors.cardTextPrimary)
                        
                        Text(formattedDate)
                            .wfmBody14Regular()
                            .foregroundStyle(colors.cardTextPrimary)
                    }
                }
                .frame(width: 151, alignment: .leading)
                
                // Время
                VStack(alignment: .leading, spacing: WFMSpacing.xxs) {
                    Text("Время")
                        .wfmBody12Regular()
                        .foregroundStyle(colors.cardTextTertiary)
                    
                    HStack(spacing: 2) {
                        Image("ic-time")
                            .resizable()
                            .renderingMode(.template)
                            .frame(width: 12, height: 12)
                            .foregroundStyle(colors.cardTextPrimary)
                        
                        Text(formattedTime)
                            .wfmBody14Regular()
                            .foregroundStyle(colors.cardTextPrimary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            
            // Прогресс-бар
            WFMProgressBar(
                progress: Double(progress),
                type: .dashed,
                state: .normal,
                segmentCount: totalTasksCount,
                showText: true,
                text: "Выполнено \(completedTasksCount) из \(totalTasksCount) основных задач"
            )
        }
        .padding(WFMSpacing.l)
    }
}
```

**Design Tokens из Figma:**
- Background: `colors.surfaceSecondary` (белый)
- Text labels: `colors.cardTextTertiary` (#808095)
- Text values: `colors.cardTextPrimary` (#373742)
- Padding: `WFMSpacing.l` (16pt)
- Gap между датой и временем: 17pt (фиксированное значение из Figma)
- Vertical spacing: `WFMSpacing.xxs` (4pt между label и value)
- Icon size: 12×12pt

#### 1.2. Создание форматтеров даты и времени

**Файл:** `/Users/nikitaleontev/Desktop/wfm/mobile/ios/WFMApp/Core/Utilities/DateFormatters.swift`

```swift
import Foundation

/// Форматтеры для работы с датами и временем смен
enum DateFormatters {
    /// Форматирует дату смены из ISO формата в русский формат
    /// - Parameter dateString: Дата в формате "YYYY-MM-DD" (например, "2025-02-12")
    /// - Returns: Дата в формате "12 февраля 2025"
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

/// Форматтеры для работы со временем смен
enum TimeFormatters {
    /// Форматирует время смены из формата HH:MM:SS в формат "H:MM-H:MM (X часов)"
    /// - Parameters:
    ///   - start: Время начала в формате "HH:MM:SS" (например, "08:00:00")
    ///   - end: Время окончания в формате "HH:MM:SS" (например, "20:00:00")
    /// - Returns: Строка формата "8:00-20:00 (12 часов)"
    static func formatShiftTime(start: String, end: String) -> String {
        let startFormatted = formatTime(start)
        let endFormatted = formatTime(end)
        
        // Вычисляем длительность
        guard let startHour = extractHour(from: start),
              let endHour = extractHour(from: end) else {
            return "\(startFormatted)-\(endFormatted)"
        }
        
        let duration = endHour - startHour
        let hoursWord = pluralizeHours(duration)
        
        return "\(startFormatted)-\(endFormatted) (\(duration) \(hoursWord))"
    }
    
    /// Форматирует время из "HH:MM:SS" в "H:MM" (убирает ведущий ноль)
    private static func formatTime(_ timeString: String) -> String {
        let components = timeString.split(separator: ":")
        guard components.count >= 2,
              let hour = Int(components[0]),
              let minute = Int(components[1]) else {
            return timeString
        }
        
        return String(format: "%d:%02d", hour, minute)
    }
    
    /// Извлекает час из строки времени "HH:MM:SS"
    private static func extractHour(from timeString: String) -> Int? {
        let components = timeString.split(separator: ":")
        guard !components.isEmpty,
              let hour = Int(components[0]) else {
            return nil
        }
        return hour
    }
    
    /// Возвращает правильную форму слова "час"
    private static func pluralizeHours(_ hours: Int) -> String {
        let lastDigit = hours % 10
        let lastTwoDigits = hours % 100
        
        if lastTwoDigits >= 11 && lastTwoDigits <= 14 {
            return "часов"
        }
        
        switch lastDigit {
        case 1:
            return "час"
        case 2, 3, 4:
            return "часа"
        default:
            return "часов"
        }
    }
}
```

#### 1.3. Интеграция в TasksListView

**Файл:** `/Users/nikitaleontev/Desktop/wfm/mobile/ios/WFMApp/Features/TasksFeature/Views/TasksListView.swift`

**Изменения:**

1. Добавить `@EnvironmentObject var userManager: UserManager` в начало структуры
2. Обновить VStack в `body` для добавления ShiftInfoBlock после `customHeader`:

```swift
var body: some View {
    VStack(spacing: 0) {
        // Кастомный заголовок
        customHeader
        
        // Блок информации о смене (если смена открыта)
        if let currentShift = userManager.currentShift,
           currentShift.status.isActive {
            ShiftInfoBlock(shift: currentShift, tasks: viewModel.tasks)
                .background(colors.surfaceSecondary)
        }
        
        // Список задач
        tasksList
    }
    .navigationBarHidden(true)
    .task {
        await viewModel.loadTasks()
    }
    .background(colors.surfaceBase)
}
```

**Обоснование размещения:**
- Блок размещается между заголовком и списком задач
- Фон `surfaceSecondary` (белый) совпадает с заголовком
- Отображается только при наличии открытой смены
- Автоматически обновляется при изменении списка задач

### Часть 2: Android Implementation

#### 2.1. Создание компонента ShiftInfoBlock

**Файл:** `/Users/nikitaleontev/Desktop/wfm/mobile/android/app/src/main/java/com/beyondviolet/wfm/features/tasks/presentation/ui/components/ShiftInfoBlock.kt`

```kotlin
package com.beyondviolet.wfm.features.tasks.presentation.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.beyondviolet.wfm.R
import com.beyondviolet.wfm.core.models.CurrentShift
import com.beyondviolet.wfm.core.models.Task
import com.beyondviolet.wfm.core.models.TaskReviewState
import com.beyondviolet.wfm.core.models.TaskState
import com.beyondviolet.wfm.core.models.TaskType
import com.beyondviolet.wfm.core.utils.DateFormatters
import com.beyondviolet.wfm.core.utils.TimeFormatters
import com.beyondviolet.wfm.ui.components.WfmProgressBar
import com.beyondviolet.wfm.ui.components.WfmProgressType
import com.beyondviolet.wfm.ui.components.WfmProgressState
import com.beyondviolet.wfm.ui.theme.WfmSpacing
import com.beyondviolet.wfm.ui.theme.WfmTheme
import com.beyondviolet.wfm.ui.theme.WfmTypography

/**
 * Блок информации о текущей смене
 * Показывает дату, время и прогресс выполнения задач
 *
 * @param shift Текущая смена
 * @param tasks Список всех задач
 * @param modifier Modifier для кастомизации компонента
 */
@Composable
fun ShiftInfoBlock(
    shift: CurrentShift,
    tasks: List<Task>,
    modifier: Modifier = Modifier
) {
    val colors = WfmTheme.colors
    
    // Вычисляем общее количество плановых задач
    val totalTasksCount = tasks.count { it.taskType == TaskType.PLANNED }
    
    // Вычисляем количество завершённых и принятых плановых задач
    val completedTasksCount = tasks.count { task ->
        task.taskType == TaskType.PLANNED &&
        task.state == TaskState.COMPLETED &&
        task.reviewState == TaskReviewState.ACCEPTED
    }
    
    // Вычисляем прогресс (0.0 - 1.0)
    val progress = if (totalTasksCount > 0) {
        completedTasksCount.toFloat() / totalTasksCount.toFloat()
    } else {
        0f
    }
    
    Column(
        modifier = modifier.padding(WfmSpacing.L),
        verticalArrangement = Arrangement.spacedBy(WfmSpacing.XS)
    ) {
        // Секция с датой и временем
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(17.dp)
        ) {
            // Дата
            Column(
                modifier = Modifier.width(151.dp),
                verticalArrangement = Arrangement.spacedBy(WfmSpacing.XXS)
            ) {
                Text(
                    text = "Дата",
                    style = WfmTypography.Body12Regular,
                    color = colors.cardTextTertiary
                )
                
                Row(
                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_calendar),
                        contentDescription = null,
                        modifier = Modifier.size(12.dp),
                        tint = colors.cardTextPrimary
                    )
                    
                    Text(
                        text = DateFormatters.formatShiftDate(shift.shiftDate ?: ""),
                        style = WfmTypography.Body14Regular,
                        color = colors.cardTextPrimary
                    )
                }
            }
            
            // Время
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(WfmSpacing.XXS)
            ) {
                Text(
                    text = "Время",
                    style = WfmTypography.Body12Regular,
                    color = colors.cardTextTertiary
                )
                
                Row(
                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_time),
                        contentDescription = null,
                        modifier = Modifier.size(12.dp),
                        tint = colors.cardTextPrimary
                    )
                    
                    Text(
                        text = TimeFormatters.formatShiftTime(
                            start = shift.startTime ?: "",
                            end = shift.endTime ?: ""
                        ),
                        style = WfmTypography.Body14Regular,
                        color = colors.cardTextPrimary
                    )
                }
            }
        }
        
        // Прогресс-бар
        WfmProgressBar(
            progress = progress,
            type = WfmProgressType.DASHED,
            state = WfmProgressState.NORMAL,
            segmentCount = totalTasksCount,
            showText = true,
            text = "Выполнено $completedTasksCount из $totalTasksCount основных задач"
        )
    }
}
```

**Design Tokens из Figma:**
- Background: `colors.surfaceSecondary` (белый)
- Text labels: `colors.cardTextTertiary` (#808095)
- Text values: `colors.cardTextPrimary` (#373742)
- Padding: `WfmSpacing.L` (16dp)
- Gap между датой и временем: 17dp (фиксированное значение из Figma)
- Vertical spacing: `WfmSpacing.XXS` (4dp между label и value)
- Icon size: 12×12dp

#### 2.2. Создание форматтеров даты и времени

**Файл:** `/Users/nikitaleontev/Desktop/wfm/mobile/android/app/src/main/java/com/beyondviolet/wfm/core/utils/DateFormatters.kt`

```kotlin
package com.beyondviolet.wfm.core.utils

import java.text.SimpleDateFormat
import java.util.Locale

/**
 * Форматтеры для работы с датами смен
 */
object DateFormatters {
    /**
     * Форматирует дату смены из ISO формата в русский формат
     * @param dateString Дата в формате "YYYY-MM-DD" (например, "2025-02-12")
     * @return Дата в формате "12 февраля 2025"
     */
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

**Файл:** `/Users/nikitaleontev/Desktop/wfm/mobile/android/app/src/main/java/com/beyondviolet/wfm/core/utils/TimeFormatters.kt`

```kotlin
package com.beyondviolet.wfm.core.utils

/**
 * Форматтеры для работы со временем смен
 */
object TimeFormatters {
    /**
     * Форматирует время смены из формата HH:MM:SS в формат "H:MM-H:MM (X часов)"
     * @param start Время начала в формате "HH:MM:SS" (например, "08:00:00")
     * @param end Время окончания в формате "HH:MM:SS" (например, "20:00:00")
     * @return Строка формата "8:00-20:00 (12 часов)"
     */
    fun formatShiftTime(start: String, end: String): String {
        if (start.isEmpty() || end.isEmpty()) return ""
        
        val startFormatted = formatTime(start)
        val endFormatted = formatTime(end)
        
        // Вычисляем длительность
        val startHour = extractHour(start)
        val endHour = extractHour(end)
        
        if (startHour == null || endHour == null) {
            return "$startFormatted-$endFormatted"
        }
        
        val duration = endHour - startHour
        val hoursWord = pluralizeHours(duration)
        
        return "$startFormatted-$endFormatted ($duration $hoursWord)"
    }
    
    /**
     * Форматирует время из "HH:MM:SS" в "H:MM" (убирает ведущий ноль)
     */
    private fun formatTime(timeString: String): String {
        val components = timeString.split(":")
        if (components.size < 2) return timeString
        
        val hour = components[0].toIntOrNull() ?: return timeString
        val minute = components[1].toIntOrNull() ?: return timeString
        
        return String.format("%d:%02d", hour, minute)
    }
    
    /**
     * Извлекает час из строки времени "HH:MM:SS"
     */
    private fun extractHour(timeString: String): Int? {
        val components = timeString.split(":")
        if (components.isEmpty()) return null
        return components[0].toIntOrNull()
    }
    
    /**
     * Возвращает правильную форму слова "час"
     */
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

#### 2.3. Интеграция в TasksListScreen

**Файл:** `/Users/nikitaleontev/Desktop/wfm/mobile/android/app/src/main/java/com/beyondviolet/wfm/features/tasks/presentation/ui/TasksListScreen.kt`

**Изменения:**

Обновить Column в основной функции для добавления ShiftInfoBlock после Header:

```kotlin
Column(
    modifier = Modifier
        .fillMaxSize()
        .background(colors.surfaceBase)
) {
    // Заголовок с приветствием
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.surfaceRaised)
            .statusBarsPadding()
    ) {
        Text(
            text = "Список задач",
            style = WfmTypography.Headline20Bold,
            color = colors.textPrimary,
            modifier = Modifier.padding(16.dp)
        )
        HorizontalDivider(
            thickness = 1.dp,
            color = colors.borderSurfaceSecondary
        )
        
        // Блок информации о смене (если смена открыта)
        val currentShift = (uiState as? TasksListUiState.Success)?.let { 
            viewModel.userManager.currentShift.collectAsState().value 
        }
        
        if (currentShift != null && currentShift.status.isActive()) {
            ShiftInfoBlock(
                shift = currentShift,
                tasks = (uiState as? TasksListUiState.Success)?.tasks ?: emptyList(),
                modifier = Modifier
                    .fillMaxWidth()
                    .background(colors.surfaceSecondary)
            )
        }
    }

    // Контент с Pull-to-Refresh
    PullToRefreshBox(
        ...
    ) {
        // Остальной код без изменений
    }
}
```

**Обоснование размещения:**
- Блок размещается внутри Column с заголовком
- Фон `surfaceSecondary` (белый) совпадает с заголовком
- Отображается только при наличии открытой смены
- Автоматически обновляется при изменении состояния

### Часть 3: Обработка граничных случаев (Edge Cases)

#### 3.1. Смена отсутствует (nil/null)
**Поведение:** Блок не отображается  
**Реализация:** Условный рендеринг через `if let` (iOS) / `if (currentShift != null)` (Android)

#### 3.2. Смена не открыта (status != OPENED)
**Поведение:** Блок не отображается  
**Реализация:** Проверка `currentShift.status.isActive` / `currentShift.status.isActive()`

#### 3.3. Пустой список задач
**Поведение:**  
- Прогресс: 0.0 (пустой прогресс-бар)
- Текст: "Выполнено 0 из 0 основных задач"
- SegmentCount: 0 → WFMProgressBar покажет пустую полоску

**Реализация:**
```swift
// iOS
private var totalTasksCount: Int {
    tasks.filter { $0.taskType == .planned }.count
}
// Если пустой список → totalTasksCount = 0
```

```kotlin
// Android
val totalTasksCount = tasks.count { it.taskType == TaskType.PLANNED }
// Если пустой список → totalTasksCount = 0
```

#### 3.4. Все задачи выполнены
**Поведение:**  
- Прогресс: 1.0 (полный прогресс-бар)
- Текст: "Выполнено 5 из 5 основных задач"

**Реализация:**
```swift
// iOS
private var progress: Float {
    guard totalTasksCount > 0 else { return 0.0 }
    return Float(completedTasksCount) / Float(totalTasksCount)
}
// completedTasksCount == totalTasksCount → progress = 1.0
```

#### 3.5. Ни одна задача не выполнена
**Поведение:**  
- Прогресс: 0.0 (пустой прогресс-бар)
- Текст: "Выполнено 0 из 5 основных задач"

#### 3.6. Отсутствуют поля shiftDate, startTime, endTime
**Поведение:** Пустые строки вместо дат/времени

**Реализация:**
```swift
// iOS
private var formattedDate: String {
    guard let shiftDateString = shift.shiftDate else { return "" }
    return DateFormatters.formatShiftDate(shiftDateString)
}
```

```kotlin
// Android
DateFormatters.formatShiftDate(shift.shiftDate ?: "")
// Внутри форматтера: if (dateString.isEmpty()) return ""
```

### Часть 4: Производительность и оптимизация

#### 4.1. Фильтрация задач

**Проблема:** Фильтрация задач выполняется при каждом рендере компонента

**Решение iOS:**
- Использовать computed properties (автоматически кэшируются SwiftUI)
- Фильтрация происходит только при изменении массива `tasks`

**Решение Android:**
- Вычисления выполняются внутри `@Composable` функции
- Compose автоматически пересчитывает только при изменении `tasks`

**Оптимальность:** Для списков до 100 задач фильтрация мгновенная (< 1ms)

#### 4.2. Обновление прогресс-бара

**Когда обновляется:**
- iOS: При изменении `viewModel.tasks` (через `@Published`)
- Android: При изменении `uiState.tasks` (через `StateFlow`)

**Частота:** Только при загрузке/обновлении задач, не при каждом кадре

### Часть 5: Иконки

#### 5.1. iOS Assets

**Требуемые иконки:**
- `ic-calendar.svg` → Asset Catalog: `ic-calendar`
- `ic-time.svg` → Asset Catalog: `ic-time`

**Настройки Asset Catalog:**
```json
{
  "images" : [
    {
      "filename" : "ic-calendar.svg",
      "idiom" : "universal"
    }
  ],
  "properties" : {
    "preserves-vector-representation" : true,
    "template-rendering-intent" : "template"
  }
}
```

**Использование:**
```swift
Image("ic-calendar")
    .resizable()
    .renderingMode(.template)
    .frame(width: 12, height: 12)
    .foregroundStyle(colors.cardTextPrimary)
```

#### 5.2. Android Drawables

**Требуемые иконки:**
- `ic-calendar.svg` → конвертировать в `ic_calendar.xml` (VectorDrawable)
- `ic-time.svg` → конвертировать в `ic_time.xml` (VectorDrawable)

**Расположение:** `app/src/main/res/drawable/`

**Использование:**
```kotlin
Icon(
    painter = painterResource(id = R.drawable.ic_calendar),
    contentDescription = null,
    modifier = Modifier.size(12.dp),
    tint = colors.cardTextPrimary
)
```

### Часть 6: Тестовые сценарии

#### Сценарий 1: Отображение корректной информации
1. Открыть смену с датой "2025-02-12", время "08:00:00-20:00:00"
2. Создать 5 плановых задач
3. Завершить и принять 2 задачи
4. Проверить:
   - Дата: "12 февраля 2025"
   - Время: "8:00-20:00 (12 часов)"
   - Прогресс: 2/5 сегментов заполнено
   - Текст: "Выполнено 2 из 5 основных задач"

#### Сценарий 2: Пустой список задач
1. Открыть смену
2. Убедиться, что нет задач
3. Проверить:
   - Блок отображается
   - Прогресс: пустой
   - Текст: "Выполнено 0 из 0 основных задач"

#### Сценарий 3: Смена не открыта
1. Закрыть смену или использовать плановую смену (status = NEW)
2. Проверить: блок НЕ отображается

#### Сценарий 4: Только ADDITIONAL задачи
1. Создать 3 дополнительные задачи
2. Проверить:
   - Прогресс: пустой
   - Текст: "Выполнено 0 из 0 основных задач"

#### Сценарий 5: Смешанные задачи
1. Создать 3 плановые + 2 дополнительные задачи
2. Завершить все задачи (5)
3. Проверить: считаются только плановые (3)
   - Текст: "Выполнено 3 из 3 основных задач"

#### Сценарий 6: Задачи на проверке
1. Создать 5 плановых задач
2. Завершить 3 задачи (reviewState = ON_REVIEW)
3. Принять 2 задачи (reviewState = ACCEPTED)
4. Проверить:
   - Считаются только ACCEPTED
   - Текст: "Выполнено 2 из 5 основных задач"

## Критические файлы для реализации

### iOS
- `/Users/nikitaleontev/Desktop/wfm/mobile/ios/WFMApp/Features/TasksFeature/Views/ShiftInfoBlock.swift` — Новый компонент блока смены
- `/Users/nikitaleontev/Desktop/wfm/mobile/ios/WFMApp/Core/Utilities/DateFormatters.swift` — Форматирование даты (русский формат)
- `/Users/nikitaleontev/Desktop/wfm/mobile/ios/WFMApp/Core/Utilities/TimeFormatters.swift` — Форматирование времени с длительностью
- `/Users/nikitaleontev/Desktop/wfm/mobile/ios/WFMApp/Features/TasksFeature/Views/TasksListView.swift` — Интеграция ShiftInfoBlock между заголовком и списком
- `/Users/nikitaleontev/Desktop/wfm/mobile/ios/WFMApp/Assets.xcassets/ic-calendar.imageset/` — Иконка календаря
- `/Users/nikitaleontev/Desktop/wfm/mobile/ios/WFMApp/Assets.xcassets/ic-time.imageset/` — Иконка часов

### Android
- `/Users/nikitaleontev/Desktop/wfm/mobile/android/app/src/main/java/com/beyondviolet/wfm/features/tasks/presentation/ui/components/ShiftInfoBlock.kt` — Новый компонент блока смены
- `/Users/nikitaleontev/Desktop/wfm/mobile/android/app/src/main/java/com/beyondviolet/wfm/core/utils/DateFormatters.kt` — Форматирование даты (русский формат)
- `/Users/nikitaleontev/Desktop/wfm/mobile/android/app/src/main/java/com/beyondviolet/wfm/core/utils/TimeFormatters.kt` — Форматирование времени с длительностью
- `/Users/nikitaleontev/Desktop/wfm/mobile/android/app/src/main/java/com/beyondviolet/wfm/features/tasks/presentation/ui/TasksListScreen.kt` — Интеграция ShiftInfoBlock между заголовком и списком
- `/Users/nikitaleontev/Desktop/wfm/mobile/android/app/src/main/res/drawable/ic_calendar.xml` — Иконка календаря
- `/Users/nikitaleontev/Desktop/wfm/mobile/android/app/src/main/res/drawable/ic_time.xml` — Иконка часов

### Существующие компоненты (используются без изменений)
- `/Users/nikitaleontev/Desktop/wfm/mobile/ios/WFMUI/Sources/WFMUI/Components/WFMProgressBar.swift` — Компонент прогресс-бара (поддерживает dashed тип)
- `/Users/nikitaleontev/Desktop/wfm/mobile/android/ui/src/main/kotlin/com/beyondviolet/wfm/ui/components/WfmProgressBar.kt` — Компонент прогресс-бара (поддерживает DASHED тип)

## Ключевые решения

1. **Использование существующего WFMProgressBar/WfmProgressBar:** Не создаём новый прогресс-бар, используем компонент из дизайн-системы с типом `.dashed`/`DASHED` и `segmentCount = totalTasksCount`

2. **Критерий завершённой задачи:**
   - iOS: `task.state == .completed && task.reviewState == .accepted`
   - Android: `task.state == TaskState.COMPLETED && task.reviewState == TaskReviewState.ACCEPTED`

3. **Только плановые задачи:** Фильтруем по `taskType == .planned`/`TaskType.PLANNED`, дополнительные задачи не учитываются

4. **Русская локализация:** 
   - Дата: "12 февраля 2025" (через `Locale("ru", "RU")`)
   - Склонение часов: "1 час", "2 часа", "5 часов"

5. **Условное отображение:** Блок отображается только при наличии открытой смены (`status.isActive`)

6. **Размещение:** Между заголовком и списком задач, внутри Column с заголовком для визуальной связности

7. **Reactivity:**
   - iOS: Автоматическое обновление через `@EnvironmentObject userManager` и `viewModel.tasks`
   - Android: Автоматическое обновление через `StateFlow` и `collectAsState()`

## Архитектурные паттерны

### iOS
- **MVVM:** ShiftInfoBlock — View, данные из UserManager (Model) и TasksListViewModel
- **Computed Properties:** Вычисления прогресса кэшируются SwiftUI
- **Environment Objects:** Доступ к UserManager через `@EnvironmentObject`

### Android
- **MVVM + Clean Architecture:** ShiftInfoBlock — UI компонент, данные из UserManager и TasksListViewModel
- **State Hoisting:** ShiftInfoBlock получает данные через параметры, не имеет собственного состояния
- **Composition:** Собираем блок из примитивов (Column, Row, Icon, Text, WfmProgressBar)

## Лог выполнения

### 2026-03-04 (Планирование)
- Создан план реализации
- Исследована структура кодовой базы
- Изучены Figma дизайны (nodes 3494-9245 и 3494-9579)
- Определены ключевые компоненты и зависимости
- Спроектирована архитектура решения для обеих платформ

### 2026-03-04 (Реализация)
- ✅ Проверены иконки ic-calendar и ic-time (присутствуют на обеих платформах)
- ✅ iOS: Создана папка Core/Utilities и файл DateFormatters.swift с форматтерами даты и времени
- ✅ iOS: Создан компонент ShiftInfoBlock.swift в Features/TasksFeature/Views
- ✅ iOS: Интегрирован ShiftInfoBlock в TasksListView с условным рендерингом (если смена открыта)
- ✅ iOS: Добавлен @EnvironmentObject userManager в TasksListView и обновлен Preview
- ✅ Android: Созданы файлы DateFormatters.kt и TimeFormatters.kt в core/utils
- ✅ Android: Создан компонент ShiftInfoBlock.kt в features/tasks/presentation/ui/components
- ✅ Android: Сделан userManager публичным в TasksListViewModel для доступа к currentShift
- ✅ Android: Интегрирован ShiftInfoBlock в TasksListScreen с условным рендерингом
- ✅ iOS/Android: Закомментирован фильтр taskType == .planned по запросу пользователя (теперь считаются все задачи, текст "основных задач" оставлен без изменений)
- ✅ iOS: Добавлены Preview компоненты для визуальной проверки (с задачами и пустой список)
- ✅ Android: Добавлены Preview компоненты для визуальной проверки (с задачами и пустой список)
- ✅ iOS: Исправлены Preview - обновлены типы параметров CurrentShift (id: Int, userId: String, storeId: Int, planId: Int?, assignmentId: Int?)
- ✅ Android: Исправлены Preview - обновлены типы параметров CurrentShift (id: Int, userId: String, storeId: Int, planId: Int?, assignmentId: Int?)
- ✅ Android: BUILD SUCCESSFUL - все ошибки компиляции исправлены

**Реализация завершена на обеих платформах. Android собирается без ошибок.**
