# Форматирование времени и даты

**Дата создания:** 2026-03-30

## Обзор

Вся логика форматирования времени и дат централизована. Перед написанием любого форматирования — проверь, что нужный метод уже не существует.

**Файлы:**
- **iOS:** `mobile/ios/WFMApp/Core/Utilities/DateFormatters.swift` — два enum: `DateFormatters` (даты) и `TimeFormatters` (время, длительности)
- **Android:** `mobile/android/app/src/main/java/com/beyondviolet/wfm/core/models/TaskExtensions.kt` — top-level функции + extension functions для `Task`

---

## Справочник существующих методов

### iOS — `DateFormatters`

| Метод | Назначение | Пример |
|-------|-----------|--------|
| `DateFormatters.formatShiftDate(_ dateString:)` | Дата смены из строки | "15 марта" |
| `DateFormatters.formatCurrentDate()` | Текущая дата | "вторник, 15 марта" |

### iOS — `TimeFormatters`

| Метод | Назначение | Пример |
|-------|-----------|--------|
| `TimeFormatters.formatShiftTime(start:end:)` | Диапазон времени смены из строк | "09:00–18:00" |
| `TimeFormatters.formatTime(_ timeString: String)` | Время из строки "HH:MM:SS" | "14:30" |
| `TimeFormatters.formatTime(_ date: Date)` | Время из Date | "14:30" |
| `TimeFormatters.parseTimeToMinutes(_ timeString:)` | Строку "HH:MM:SS" в минуты от начала дня | 870 |
| `TimeFormatters.formatDuration(_ minutes: Int)` | Минуты в читаемый вид | "45 мин", "2 ч 30 мин" |
| `TimeFormatters.formatShiftDuration(start:end:)` | Длительность смены из строк | "8 ч" |
| `TimeFormatters.formatDurationFromSeconds(_ seconds: Int)` | Секунды в читаемый вид (ceil) | "45 мин" |
| `TimeFormatters.formatDuration(from:to:)` | Длительность между двумя Date (ceil) | "45 мин" |

### Android — `TaskExtensions.kt`

| Функция | Назначение | Пример |
|---------|-----------|--------|
| `formatTime(timeString: String)` | Время из строки "HH:MM:SS" | "14:30" |
| `formatTime(instant: Instant?)` | Время из kotlinx Instant | "14:30" |
| `parseTimeToMinutes(timeString:)` | Строку "HH:MM:SS" в минуты | 870 |
| `formatShiftTime(start:end:)` | Диапазон времени смены из строк | "09:00–18:00" |
| `formatShiftDuration(shift:)` | Длительность смены | "8 ч" |
| `formatDuration(minutes: Int)` | Минуты в читаемый вид | "45 мин", "2 ч 30 мин" |
| `formatDurationFromSeconds(seconds: Int?)` | Секунды в читаемый вид (ceil) | "45 мин" |
| `formatCurrentDate()` | Текущая дата | "вторник, 15 марта" |

**Extension functions для Task:**

| Метод | Назначение |
|-------|-----------|
| `task.formattedTimeRange()` | Диапазон времени задачи из `timeStart`/`timeEnd` |
| `task.durationOnly()` | Только длительность задачи |

---

## Как добавить новый форматтер

**Шаг 1. Убедись, что метод действительно нужен.**
Проверь таблицы выше — возможно, подходящий форматтер уже есть.

**Шаг 2. Определи, куда добавить.**

| Ситуация | iOS | Android |
|----------|-----|---------|
| Форматирование даты (не времени) | `DateFormatters` enum | `TaskExtensions.kt` (секция Date) |
| Форматирование времени или длительности | `TimeFormatters` enum | `TaskExtensions.kt` (секция Time/Duration) |
| Форматирование поля конкретной модели Task | `Task+Display.swift` | extension fun в `TaskExtensions.kt` |

**Шаг 3. Следуй существующему паттерну.**

- iOS: `static func` внутри соответствующего `enum`, в разделе `// MARK:`
- Android: top-level `fun` в соответствующей секции `// MARK:`, либо extension на нужной модели
- Округление секунд до минут — всегда `ceil()` (не floor, не round)
- Возвращай `"0 мин"` или `"--:--"` для нулевых/nil значений — не force unwrap

**Шаг 4. Обнови эту таблицу** в данном документе.

---

## Правила

❌ **Не создавай локальные форматтеры** в экранах, компонентах и ViewModel — только в централизованных файлах.

❌ **Не дублируй** — если аналогичный форматтер уже есть, используй его, даже если сигнатура немного отличается.

✅ **Округление секунд** — всегда `ceil()`: 61 секунда → 2 мин, а не 1 мин.

---

## Связанные файлы

- `.memory_bank/mobile/ui/design_system_components.md` — типографика для отображения
- `.memory_bank/mobile/architecture/app_structure.md` — структура Core утилит
- `.memory_bank/domain/task_model.md` — модель Task и её поля
