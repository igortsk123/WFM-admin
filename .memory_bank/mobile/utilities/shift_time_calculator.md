# ShiftTimeCalculator — Утилита для расчета времени смен

Вспомогательный класс для расчета времени смен и форматирования сообщений.

**Назначение:** Централизовать логику расчета времени смен, избежать дублирования кода между экранами.

**Статус:** Реализован (iOS, Android)

---

## Функции

### 1. Определение опоздания на смену

```swift
// iOS
ShiftTimeCalculator.isShiftLate(_ shift: CurrentShift, currentTime: Date = Date()) -> Bool
```

```kotlin
// Android
ShiftTimeCalculator.isShiftLate(shift: CurrentShift, now: Long = System.currentTimeMillis()): Boolean
```

**Логика:**
- Сравнивает текущее время с временем начала смены
- Возвращает `true` если текущее время >= времени начала

**Использование:** Определение состояния карточки смены (NEW vs DELAY)

---

### 2. Получение времени начала смены

```swift
// iOS
ShiftTimeCalculator.shiftStartDate(_ shift: CurrentShift?) -> Date?
```

```kotlin
// Android
ShiftTimeCalculator.shiftStartMillis(shift: CurrentShift): Long?
```

**Логика:**
- Парсит `shift.shiftDate` и `shift.startTime`
- Возвращает дату начала смены или `nil`/`null` при ошибке

**Формат входных данных:**
- `shiftDate`: "2025-03-23"
- `startTime`: "08:00:00"

---

### 3. Получение времени конца смены

```swift
// iOS
ShiftTimeCalculator.shiftEndDate(_ shift: CurrentShift?) -> Date?
```

```kotlin
// Android
ShiftTimeCalculator.shiftEndMillis(shift: CurrentShift): Long?
```

**Логика:**
- Парсит `shift.endTime`
- Для даты использует `shift.shiftDate`, если `null` — берет дату из `shift.openedAt`
- Возвращает дату конца смены или `nil`/`null` при ошибке

---

### 4. Форматирование времени до начала смены

```swift
// iOS
ShiftTimeCalculator.formatMinutesUntil(_ minutes: Int) -> String
```

```kotlin
// Android
ShiftTimeCalculator.formatMinutesUntil(minutes: Int): String
```

**Примеры:**
- `0 мин` → "Начинается сейчас"
- `30 мин` → "Начнется через 30 мин"
- `90 мин` → "Начнется через 1 ч 30 мин"
- `120 мин` → "Начнется через 2 ч"

---

### 5. Форматирование времени опоздания

```swift
// iOS
ShiftTimeCalculator.formatMinutesLate(_ minutes: Int) -> String
```

```kotlin
// Android
ShiftTimeCalculator.formatMinutesLate(minutes: Int): String
```

**Примеры:**
- `0 мин` → "Вы опаздываете"
- `15 мин` → "Вы опаздываете на 15 мин"
- `75 мин` → "Вы опаздываете на 1 ч 15 мин"
- `120 мин` → "Вы опаздываете на 2 ч"

---

### 6. Форматирование времени до конца смены

```swift
// iOS
ShiftTimeCalculator.formatMinutesLeft(_ minutes: Int) -> String
```

```kotlin
// Android
ShiftTimeCalculator.formatMinutesLeft(minutes: Int): String
```

**Примеры:**
- `0 мин` → "Смена заканчивается"
- `45 мин` → "До конца смены 45 мин"
- `120 мин` → "До конца смены 2 ч"
- `150 мин` → "До конца смены 2 ч 30 мин"

---

## Использование

### iOS

```swift
import Foundation

// Проверка опоздания
let isLate = ShiftTimeCalculator.isShiftLate(shift, currentTime: Date())

// Расчет времени
let startDate = ShiftTimeCalculator.shiftStartDate(shift)
let endDate = ShiftTimeCalculator.shiftEndDate(shift)

// Форматирование сообщений
let minutesUntil = Int((startDate.timeIntervalSince(Date())) / 60)
let message = ShiftTimeCalculator.formatMinutesUntil(minutesUntil)
```

### Android

```kotlin
import com.beyondviolet.wfm.core.models.ShiftTimeCalculator

// Проверка опоздания
val isLate = ShiftTimeCalculator.isShiftLate(shift)

// Расчет времени
val startMillis = ShiftTimeCalculator.shiftStartMillis(shift)
val endMillis = ShiftTimeCalculator.shiftEndMillis(shift)

// Форматирование сообщений
val minutesUntil = ((startMillis - System.currentTimeMillis()) / 60000).toInt()
val message = ShiftTimeCalculator.formatMinutesUntil(minutesUntil)
```

---

## Файлы

**iOS:**
- `Core/Models/ShiftTimeCalculator.swift`

**Android:**
- `core/models/ShiftTimeCalculator.kt`

---

## Связанные документы

- **Модель смены:** `.memory_bank/domain/shift_model.md`
- **Home Screen:** `.memory_bank/mobile/feature_home/home_screen.md`
- **Manager Home Screen:** `.memory_bank/mobile/feature_managerhome/manager_home_screen.md`
