# Toast компонент (WFMToast / WfmToast)

Всплывающее уведомление в нижней части экрана. Отображается 3 секунды, затем скрывается автоматически. Новый тост заменяет текущий.

**Figma:** https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=2494-52756

---

## Типы и состояния

### Тип тоста (содержимое)

| Тип | Описание |
|-----|----------|
| `text` | Только текст |
| `textWithButton` | Текст + кнопка-ссылка |

### Состояние тоста (цвет фона)

| Состояние | Токен | Цвет |
|-----------|-------|------|
| `default` | `surfaceSnackbar` | #373742 (тёмный) |
| `error` | `bgToastError` | #E4303D (красный) |

---

## Токены дизайн-системы

| Свойство | Токен | Значение |
|----------|-------|----------|
| Фон default | `surfaceSnackbar` | #373742 |
| Фон error | `bgToastError` | #E4303D |
| Текст | `textInverse` | #FFFFFF |
| Padding horizontal | `spacing.xl` / `16.dp` | 16pt |
| Padding vertical | `spacing.l` / `12.dp` | 12pt |
| Радиус | `radius.m` / `10.dp` | 10pt |
| Шрифт текста | `body15Regular` | Inter Regular 15px |
| Шрифт кнопки | `headline12Medium` | Inter Medium 12px |

---

## iOS (WFMUI)

### Компоненты

**`WFMToastType`** — тип тоста:
```swift
enum WFMToastType {
    case text
    case textWithButton(buttonTitle: String, action: () -> Void)
}
```

**`WFMToastState`** — состояние тоста:
```swift
enum WFMToastState {
    case `default`
    case error
}
```

**`WFMToastData`** — данные тоста:
```swift
struct WFMToastData: Identifiable {
    let message: String
    let type: WFMToastType       // по умолчанию .text
    let state: WFMToastState     // по умолчанию .default
}
```

**`ToastManager`** — управление показом:
```swift
@MainActor final class ToastManager: ObservableObject {
    func show(message: String, type: WFMToastType = .text, state: WFMToastState = .default)
    func hide()
}
```

### Интеграция

`ToastManager` зарегистрирован в `DependencyContainer`:
```swift
let toastManager: ToastManager  // в DependencyContainer
```

Модификатор `.wfmToast()` применён в `WFMApp.swift` на корневом View:
```swift
ContentView()
    .wfmTheme()
    .wfmToast(manager: container.toastManager)
```

### Использование в ViewModel / View

```swift
// Внедрение
@EnvironmentObject private var container: DependencyContainer

// Показать простой тост
container.toastManager.show(message: "Смена открыта")

// Тост с ошибкой
container.toastManager.show(message: "Нет сети", state: .error)

// Тост с кнопкой
container.toastManager.show(
    message: "Задача назначена",
    type: .textWithButton(buttonTitle: "Перейти") {
        // navigate()
    }
)
```

---

## Android (ui модуль)

### Компоненты

**`WfmToastType`** — тип тоста:
```kotlin
sealed class WfmToastType {
    object Text : WfmToastType()
    data class TextWithButton(val buttonTitle: String, val action: () -> Unit) : WfmToastType()
}
```

**`WfmToastState`** — состояние тоста:
```kotlin
enum class WfmToastState { DEFAULT, ERROR }
```

**`WfmToastData`** — данные тоста:
```kotlin
data class WfmToastData(
    val message: String,
    val type: WfmToastType = WfmToastType.Text,
    val state: WfmToastState = WfmToastState.DEFAULT
)
```

**`ToastManager`** — управление показом:
```kotlin
class ToastManager {
    val current: StateFlow<WfmToastData?>
    val isVisible: StateFlow<Boolean>
    fun show(message: String, type: WfmToastType = ..., state: WfmToastState = ...)
    fun hide()
}
```

### Интеграция

`ToastManager` зарегистрирован в Koin (`AppModule.kt`):
```kotlin
single { ToastManager() }
```

`WfmToastHost` добавлен в `MainActivity.kt`:
```kotlin
WFMAppTheme {
    val toastManager: ToastManager = koinInject()
    Box(modifier = Modifier.fillMaxSize()) {
        AppNavigation(onSplashFinished = ::setupSystemBars)
        WfmToastHost(
            toastManager = toastManager,
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}
```

### Использование в ViewModel

```kotlin
class HomeViewModel(
    private val userManager: UserManager,
    private val toastManager: ToastManager
) : ViewModel() {

    fun openShift() {
        viewModelScope.launch {
            // ... логика ...
            toastManager.show("Смена открыта")
        }
    }

    fun handleError(message: String) {
        toastManager.show(message, state = WfmToastState.ERROR)
    }
}
```

> Не забудь добавить `ToastManager` в `viewModel { HomeViewModel(get(), get()) }` в Koin.

---

## Поведение

- Один тост одновременно — новый заменяет текущий
- Автоскрытие через **3 секунды**
- Анимация: появление снизу + fade, скрытие в обратном направлении
- Позиционирование: нижняя часть экрана, `padding(bottom = 16dp)`
