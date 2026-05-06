# План: BottomSheet компонент для iOS и Android

**Статус:** Выполнено
**Создан:** 2026-02-13
**Последнее обновление:** 2026-02-13 (Этап 5 — финал)

## Цель

Реализовать переиспользуемый BottomSheet компонент на обеих платформах (iOS + Android) для показа разного контента (подтверждения, выбор опций и т.д.).

**Пример использования:** Диалог "Вы хотите выйти из профиля?" с кнопками "Отменить" и "Выйти".

---

## Анализ дизайна из Figma

### Структура BottomSheet:
1. **Overlay** — затемнение фона (`bgOverlayModal` с opacity 0.6)
2. **Sheet container** — белый контейнер с rounded corners сверху (16px)
3. **Индикатор** — серая полоска сверху (handle для drag)
4. **Контент** — гибкий, может содержать:
   - Заголовок (20px Bold)
   - Описание (опционально)
   - Кнопки (Primary + Secondary)
   - Любой кастомный контент

### Дизайн токены:
- Фон: `surfaceRaised` (белый)
- Радиус: `xl` (16px) только сверху
- Индикатор: `neutral400`, размер 48x5px
- Overlay: `bgOverlayModal` (черный с альфа 0.6)
- Padding: `xl` (16px) по краям

---

## Технический подход

### iOS (SwiftUI)

**Встроенные возможности:**
- `.sheet(isPresented:)` — модальный лист
- `.presentationDetents([.height(XXX)])` — задать высоту листа (iOS 16+)
- `.presentationDragIndicator(.visible)` — индикатор сверху
- **Клик на overlay** — автоматически закрывает (можно отключить через `.interactiveDismissDisabled(true)`)
- **Скролл внутри** — просто используем `ScrollView` внутри контента
- **Разные размеры** — `.presentationDetents([.height(200), .medium, .large, .fraction(0.5)])`

**Решение:**
✅ Использовать встроенный `.sheet()` с `presentationDetents`

**Плюсы:**
- Нативный вид и поведение
- Автоматический drag-to-dismiss + tap-to-dismiss
- Работает с accessibility
- Минимум кода
- Скролл работает автоматически

**Минусы:**
- Требует iOS 16+ (✅ у нас minSDK = iOS 16)

### Android (Jetpack Compose)

**Встроенные возможности:**
- Material 3: `ModalBottomSheet` — готовый компонент
- `rememberModalBottomSheetState()` — управление состоянием
- **Клик на scrim (overlay)** — автоматически закрывает
- **Swipe-to-dismiss** — автоматический жест вниз
- **Скролл внутри** — используем `Column(modifier = Modifier.verticalScroll())`
- **Разные размеры** — автоматически по контенту или через `modifier.heightIn(max = ...)`

**Решение:**
✅ Использовать встроенный `ModalBottomSheet` из Material 3

**Плюсы:**
- Material Design guidelines
- Автоматический swipe-to-dismiss + tap-outside-to-dismiss
- Работает с accessibility
- Минимум кода
- Скролл работает автоматически

**Минусы:**
- Нужен Material 3 (✅ уже подключен)

---

## Примеры поведения

### ✅ Клик снаружи закрывает БШ

**iOS:**
```swift
.sheet(isPresented: $showSheet) {
    // Контент
}
// По дефолту клик на затемненную область закрывает
// Отключить: .interactiveDismissDisabled(true)
```

**Android:**
```kotlin
ModalBottomSheet(
    onDismissRequest = { showSheet = false } // Вызовется при клике на scrim
) {
    // Контент
}
```

### ✅ Скролл внутри если контент длинный

**iOS:**
```swift
.sheet(isPresented: $showSheet) {
    ScrollView {
        VStack(spacing: 16) {
            ForEach(1...20, id: \.self) { item in
                Text("Item \(item)")
            }
        }
        .padding()
    }
    .presentationDetents([.medium, .large]) // Можно растягивать
}
```

**Android:**
```kotlin
ModalBottomSheet(
    onDismissRequest = { showSheet = false }
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        repeat(20) { item ->
            Text("Item $item")
            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}
```

### ✅ Разные размеры БШ

**iOS:**
```swift
// Фиксированная высота
.presentationDetents([.height(200)])

// Средний и большой размер
.presentationDetents([.medium, .large])

// Кастомная доля экрана
.presentationDetents([.fraction(0.3), .fraction(0.7)])

// Пользователь может растягивать между размерами свайпом
```

**Android:**
```kotlin
// Автоматически по контенту
ModalBottomSheet(...) {
    Column { /* контент */ }
}

// Ограничить максимальную высоту
ModalBottomSheet(...) {
    Column(
        modifier = Modifier.heightIn(max = 400.dp)
    ) { /* контент */ }
}
```

### ✅ Одинаковое поведение на обеих платформах

| Поведение | iOS | Android |
|-----------|-----|---------|
| Клик на overlay закрывает | ✅ Да | ✅ Да |
| Свайп вниз закрывает | ✅ Да | ✅ Да |
| Скролл контента | ✅ ScrollView | ✅ verticalScroll |
| Индикатор сверху | ✅ `.presentationDragIndicator(.visible)` | ✅ Автоматически |
| Анимация появления | ✅ Автоматическая | ✅ Автоматическая |
| Затемнение фона | ✅ Автоматическое | ✅ `scrimColor` |
| Разные размеры | ✅ `.presentationDetents()` | ✅ По контенту |

---

## План реализации

### Этап 1: iOS — базовый компонент (WFMBottomSheet) ✅

**Задачи:**
- [x] Создать `WFMBottomSheet.swift` в `WFMUI/Sources/WFMUI/Components/`
- [x] Обёртка над `.sheet()` с параметрами:
  - `isPresented: Binding<Bool>` — управление показом
  - `detents: Set<PresentationDetent>` — высота листа (.height(XXX) или .medium/.large)
  - `content: @ViewBuilder () -> Content` — контент листа
- [x] Стилизация под дизайн:
  - `.presentationDragIndicator(.visible)` — индикатор сверху
  - `.presentationCornerRadius(16)` — скругление углов
  - `.presentationBackground(colors.surfaceRaised)` — белый фон
- [x] Preview с тремя примерами:
  - Простой BottomSheet (фиксированная высота 200px)
  - BottomSheet со скроллом (длинный список, .medium/.large)
  - BottomSheet с кнопками (подтверждение действия)

**Файл:** `WFMUI/Sources/WFMUI/Components/WFMBottomSheet.swift`

```swift
// Сигнатура компонента
struct WFMBottomSheet<Content: View>: ViewModifier {
    @Binding var isPresented: Bool
    let detents: Set<PresentationDetent>
    let content: () -> Content

    init(
        isPresented: Binding<Bool>,
        detents: Set<PresentationDetent> = [.height(200)],
        @ViewBuilder content: @escaping () -> Content
    )
}

// Пример 1: Простой контент с фиксированной высотой
@State private var showSheet = false

Button("Показать") { showSheet = true }
    .wfmBottomSheet(isPresented: $showSheet, detents: [.height(200)]) {
        VStack(spacing: 16) {
            Text("Заголовок")
                .font(WFMTypography.headline20Bold)
            Button("Закрыть") { showSheet = false }
        }
        .padding()
    }

// Пример 2: Длинный контент со скроллом
@State private var showLongSheet = false

Button("Показать длинный список") { showLongSheet = true }
    .wfmBottomSheet(isPresented: $showLongSheet, detents: [.medium, .large]) {
        ScrollView {
            VStack(spacing: 8) {
                ForEach(1...30, id: \.self) { item in
                    Text("Item \(item)")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(colors.surfaceSecondary)
                        .cornerRadius(8)
                }
            }
            .padding()
        }
    }

// Пример 3: Кастомная высота (30% экрана)
@State private var showCustomSheet = false

Button("Показать маленький") { showCustomSheet = true }
    .wfmBottomSheet(isPresented: $showCustomSheet, detents: [.fraction(0.3)]) {
        VStack {
            Text("Быстрое действие")
            Button("OK") { showCustomSheet = false }
        }
        .padding()
    }
```

---

### Этап 2: Android — базовый компонент (WfmBottomSheet) ✅

**Задачи:**
- [x] Создать `WfmBottomSheet.kt` в `ui/src/main/kotlin/com/wfm/ui/components/`
- [x] Composable функция-обёртка над `ModalBottomSheet`:
  - `isVisible: Boolean` — управление показом
  - `onDismiss: () -> Unit` — callback при закрытии
  - `content: @Composable ColumnScope.() -> Unit` — контент листа
- [x] Стилизация под дизайн:
  - `containerColor = colors.surfaceRaised` — белый фон
  - `shape = RoundedCornerShape(topStart = WfmRadius.XL, topEnd = WfmRadius.XL)`
  - `scrimColor = colors.bgOverlayModal` — затемнение
- [x] 3 Preview с примерами (через SheetPreviewContainer): простой, со скроллом, с кнопками

**Файл:** `ui/src/main/kotlin/com/wfm/ui/components/WfmBottomSheet.kt`

```kotlin
// Сигнатура компонента
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WfmBottomSheet(
    isVisible: Boolean,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
)

// Пример 1: Простой контент
var showSheet by remember { mutableStateOf(false) }

Button(onClick = { showSheet = true }) {
    Text("Показать")
}

if (showSheet) {
    WfmBottomSheet(
        isVisible = showSheet,
        onDismiss = { showSheet = false }
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "Заголовок",
                style = WfmTypography.Headline20Bold
            )
            Button(onClick = { showSheet = false }) {
                Text("Закрыть")
            }
        }
    }
}

// Пример 2: Длинный контент со скроллом
var showLongSheet by remember { mutableStateOf(false) }

Button(onClick = { showLongSheet = true }) {
    Text("Показать длинный список")
}

if (showLongSheet) {
    WfmBottomSheet(
        isVisible = showLongSheet,
        onDismiss = { showLongSheet = false }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 600.dp)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            repeat(30) { item ->
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    color = colors.surfaceSecondary,
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = "Item ${item + 1}",
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }
        }
    }
}

// Пример 3: Фиксированная небольшая высота
var showSmallSheet by remember { mutableStateOf(false) }

Button(onClick = { showSmallSheet = true }) {
    Text("Показать маленький")
}

if (showSmallSheet) {
    WfmBottomSheet(
        isVisible = showSmallSheet,
        onDismiss = { showSmallSheet = false },
        modifier = Modifier.height(150.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text("Быстрое действие")
            Button(onClick = { showSmallSheet = false }) {
                Text("OK")
            }
        }
    }
}
```

---

### Этап 3: iOS — специфичный компонент для Logout ✅

**Задачи:**
- [x] Создать `LogoutBottomSheet.swift` в `WFMApp/Features/Settings/`
- [x] Использовать `wfmBottomSheet` внутри (через `LogoutBottomSheetModifier`)
- [x] Контент: заголовок + `WFMSecondaryButton` (neutral) + `WFMPrimaryButton`
- [x] View extension `.logoutBottomSheet(isPresented:onLogout:)`

**Интеграция в SettingsView:**
- [x] Переименовано `showLogoutDialog` → `showLogoutSheet`
- [x] Заменён `.alert` на `.logoutBottomSheet`

---

### Этап 4: Android — специфичный компонент для Logout ✅

**Задачи:**
- [x] Создать `LogoutBottomSheet.kt` в `app/src/main/java/com/wfm/features/settings/`
- [x] Использовать `WfmBottomSheet` внутри
- [x] Контент:
  - Заголовок: "Вы хотите выйти из профиля?" (Headline20Bold)
  - HorizontalRow с кнопками:
    - "Отменить" (secondary neutral стиль: bgButtonSecondaryDefault + textBrand)
    - "Выйти" (WfmPrimaryButton)
- [x] Параметры:
  - `isVisible: Boolean`
  - `onDismiss: () -> Unit`
  - `onConfirm: () -> Unit` — callback при подтверждении

**Интеграция в SettingsScreen:**
- [x] Переименовано `showLogoutDialog` → `showLogoutSheet`
- [x] Заменён `AlertDialog` на `LogoutBottomSheet`
- [x] Кнопка "Выйти" вызывает `showLogoutSheet = true`

---

### Этап 5: Документация ✅

**Задачи:**
- [x] Создать `.memory_bank/mobile/ui/bottomsheet.md`
- [x] Описать:
  - Базовый компонент (WFMBottomSheet / WfmBottomSheet)
  - Примеры использования
  - Параметры и кастомизация
  - Рекомендации по контенту
  - Доступность (accessibility)
- [x] Примеры специфичных компонентов (LogoutBottomSheet)

---

## Альтернативные подходы (не выбраны)

### ❌ Кастомный BottomSheet (SwiftUI)
- Самостоятельная реализация с Drag Gesture
- **Минусы:** Много кода, нужно реализовывать все state transitions, accessibility

### ❌ Сторонние библиотеки
- **iOS:** BottomSheet (GitHub)
- **Android:** Accompanist Bottom Sheet
- **Минусы:** Лишняя зависимость, когда есть встроенные решения

### ❌ Единый компонент для обеих платформ
- Kotlin Multiplatform + Compose Multiplatform
- **Минусы:** Проект не использует KMM (пока), сложнее поддержка

---

## FAQ

### ❓ Можно ли отключить закрытие по клику снаружи?

**iOS:**
```swift
.wfmBottomSheet(isPresented: $showSheet) {
    // Контент
}
.interactiveDismissDisabled(true) // Отключает dismiss
```

**Android:**
```kotlin
val sheetState = rememberModalBottomSheetState(
    skipPartiallyExpanded = false
)

ModalBottomSheet(
    sheetState = sheetState,
    onDismissRequest = { /* пусто — не закроется */ }
) {
    // Контент
}
```

### ❓ Можно ли запретить свайп вниз (drag-to-dismiss)?

**iOS:**
```swift
.interactiveDismissDisabled(true) // Запрещает и свайп, и клик
```

**Android:**
```kotlin
val sheetState = rememberModalBottomSheetState(
    skipPartiallyExpanded = false
)
LaunchedEffect(sheetState) {
    sheetState.hide() // Программно скрываем
}
// Для полного контроля используем `sheetState`
```

### ❓ Как программно закрыть БШ?

**iOS:**
```swift
@State private var showSheet = false

// Закрыть
showSheet = false
```

**Android:**
```kotlin
var showSheet by remember { mutableStateOf(false) }

// Закрыть
showSheet = false
```

### ❓ Можно ли показывать несколько БШ одновременно?

❌ **Не рекомендуется** — это плохой UX. Используйте навигацию между БШ или последовательный показ.

Если необходимо:
- iOS: можно вложить несколько `.sheet()`, но это усложняет код
- Android: можно показать несколько `ModalBottomSheet`, но накладываются друг на друга

### ❓ Как сделать БШ на весь экран?

**iOS:**
```swift
.wfmBottomSheet(isPresented: $showSheet, detents: [.large]) {
    // Контент
}
```

**Android:**
```kotlin
WfmBottomSheet(
    isVisible = showSheet,
    onDismiss = { showSheet = false },
    modifier = Modifier.fillMaxHeight(0.95f) // 95% экрана
) {
    // Контент
}
```

### ❓ Поддерживается ли Dark Mode?

✅ **Да**, автоматически через дизайн-систему:
- iOS: `@Environment(\.wfmColors)` автоматически переключается
- Android: `WfmTheme.colors` автоматически переключается

### ❓ Можно ли использовать клавиатуру внутри БШ?

✅ **Да**, TextField/TextInput работают нормально:
- iOS: клавиатура автоматически поднимает контент
- Android: используй `imePadding()` modifier для корректного отступа

```kotlin
// Android пример
WfmBottomSheet(...) {
    Column(
        modifier = Modifier
            .imePadding() // Отступ от клавиатуры
            .verticalScroll(rememberScrollState())
    ) {
        TextField(...)
    }
}
```

---

## Риски и ограничения

**Риски:**
1. **iOS 15 поддержка** — `.presentationDetents()` требует iOS 16+
   - ✅ Решение: minSDK уже iOS 16 в проекте
2. **Кастомный индикатор** — встроенный может отличаться от дизайна
   - ✅ Решение: проверим в preview, при необходимости кастомизируем

**Ограничения:**
1. На Android `ModalBottomSheet` всегда показывает scrim (затемнение) — нельзя убрать
2. На iOS минимальная высота `.medium` detent зависит от контента
3. Анимации — дефолтные от платформы, кастомизация сложная

---

## Checklist перед началом

- [x] Проанализирован дизайн из Figma
- [x] Выбран технический подход (встроенные компоненты)
- [ ] Проверить, есть ли уже BottomSheet в проекте (может уже реализован)
- [ ] Создать базовый компонент на iOS
- [ ] Создать базовый компонент на Android
- [ ] Интегрировать в SettingsView/SettingsScreen
- [ ] Протестировать на обеих платформах
- [ ] Документация

---

## Примеры будущего использования

### 1. Logout confirmation (текущий кейс)
```
Заголовок: "Вы хотите выйти из профиля?"
Кнопки: "Отменить" + "Выйти"
Высота: ~200px
```

### 2. Task actions — выбор действия с задачей
```
Заголовок: "Действия с задачей"
Опции:
  - [✓] Взять в работу
  - [⏸] Приостановить
  - [✗] Отклонить
  - [📋] Посмотреть детали
Высота: автоматически по контенту
Скролл: если опций много
```

### 3. Filters — фильтры списка задач
```
Заголовок: "Фильтры"
Контент:
  - Статус: [Новые] [Текущие] [Выполненные]
  - Тип задачи: [Плановые] [Дополнительные]
  - Сортировка: [По дате] [По приоритету]
Кнопки: "Сбросить" + "Применить"
Высота: .medium или .large с возможностью растянуть
Скролл: если фильтров много
```

### 4. Image picker — выбор источника фото
```
Заголовок: "Добавить фото"
Опции:
  - 📷 Сделать фото
  - 🖼 Выбрать из галереи
  - ❌ Отмена
Высота: ~180px
```

### 5. Date/Time picker — выбор даты и времени
```
Заголовок: "Выбрать дату"
Контент: DatePicker / TimePicker
Кнопки: "Отмена" + "Готово"
Высота: .medium
```

### 6. Permissions request — запрос разрешений
```
Заголовок: "Разрешение на доступ к камере"
Описание: "Для добавления фото к отчёту нужен доступ к камере"
Кнопки: "Не сейчас" + "Разрешить"
Высота: ~220px
```

### 7. Long scrollable content — длинный список
```
Заголовок: "Выбрать магазин"
Контент: Список из 50+ магазинов
ScrollView внутри
Высота: .large (почти на весь экран)
Поиск: TextField для фильтрации
```

---

## Оценка времени

- Этап 1 (iOS базовый): ~30 мин
- Этап 2 (Android базовый): ~30 мин
- Этап 3 (iOS Logout): ~20 мин
- Этап 4 (Android Logout): ~20 мин
- Этап 5 (Документация): ~15 мин
- **Итого:** ~2 часа

---

## Лог выполнения

### 2026-02-13
- ✅ Создан план реализации
- ✅ Анализ дизайна из Figma
- ✅ Выбор технического подхода
- ✅ **Этап 1 завершён** — iOS базовый компонент WFMBottomSheet
  - Создан `WFMUI/Sources/WFMUI/Components/WFMBottomSheet.swift`
  - ViewModifier обёртка над `.sheet()`
  - Стилизация: индикатор, скругление 16px, белый фон
  - 3 Preview с примерами: простой, со скроллом, с кнопками
  - Поддержка разных размеров через `detents: Set<PresentationDetent>`
- ✅ **Этап 2 завершён** — Android базовый компонент WfmBottomSheet
- ✅ **Этап 3 завершён** — iOS Logout BottomSheet
  - Создан `WFMApp/Features/Settings/LogoutBottomSheet.swift`
  - `LogoutBottomSheetModifier` + `.logoutBottomSheet()` extension
  - `SettingsView`: заменён `.alert` на `.logoutBottomSheet`
  - Создан `ui/src/main/kotlin/com/wfm/ui/components/WfmBottomSheet.kt`
  - Composable обёртка над `ModalBottomSheet` (Material 3)
  - Параметры: `isVisible`, `onDismiss`, `modifier`, `content: ColumnScope`
  - Стилизация: `surfaceRaised` фон, `bgOverlayModal` scrim, `WfmRadius.XL` скругление
  - 3 Preview через `SheetPreviewContainer`: простой, со скроллом, с кнопками
- ✅ **Этап 4 завершён** — Android Logout BottomSheet
- ✅ **Этап 5 завершён** — Документация
  - Создан `.memory_bank/mobile/ui/bottomsheet.md`
  - Покрыты: базовые компоненты обеих платформ, параметры, поведение, скролл, клавиатура, специфичные компоненты, рекомендации, accessibility
  - Создан `app/src/main/java/com/wfm/features/settings/LogoutBottomSheet.kt`
  - Composable `LogoutBottomSheet(isVisible, onDismiss, onConfirm)`
  - Контент: заголовок (Headline20Bold, центр) + Row с двумя кнопками
  - "Отменить" — secondary кнопка (bgButtonSecondaryDefault + textBrand)
  - "Выйти" — WfmPrimaryButton
  - 2 Preview: Light + Dark
  - `SettingsScreen`: переименован `showLogoutDialog` → `showLogoutSheet`, заменён `AlertDialog` на `LogoutBottomSheet`
