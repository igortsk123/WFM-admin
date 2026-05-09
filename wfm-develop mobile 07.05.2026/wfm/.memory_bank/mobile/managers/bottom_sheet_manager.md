# BottomSheetManager (iOS Only)

**Файл:** `WFMApp/Core/Managers/BottomSheetManager.swift`

**Назначение:** Глобальный менеджер для управления BottomSheet в iOS приложении. Позволяет показывать BottomSheet из любого места приложения без необходимости передавать @Binding через все уровни иерархии View.

---

## Архитектура

BottomSheetManager — @MainActor ObservableObject с тремя @Published свойствами:
- `isPresented: Bool` — показан ли BottomSheet
- `showOverlay: Bool` — затемнять ли фон
- `content: AnyView?` — контент BottomSheet

Единственный экземпляр хранится в `DependencyContainer.shared.bottomSheetManager`.

---

## Интеграция

### 1. Регистрация в DependencyContainer

```swift
class DependencyContainer: ObservableObject {
    let bottomSheetManager: BottomSheetManager

    private init() {
        self.bottomSheetManager = BottomSheetManager()
        // ...
    }
}
```

### 2. Применение на уровне TabView

BottomSheet применяется на уровне `MainTabView` / `ManagerTabView` через модификатор `.wfmBottomSheet()`:

```swift
struct MainTabView: View {
    @ObservedObject private var bottomSheetManager: BottomSheetManager

    init() {
        _bottomSheetManager = ObservedObject(wrappedValue: DependencyContainer.shared.bottomSheetManager)
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            // Content tabs
            // ...

            // TabBar
            if !shouldHideTabBar {
                CustomTabBar(selectedTab: $selectedTab)
                    .zIndex(1)
            }
        }
        .wfmBottomSheet(
            isPresented: $bottomSheetManager.isPresented,
            showOverlay: bottomSheetManager.showOverlay
        ) {
            if let content = bottomSheetManager.content {
                content
            }
        }
    }
}
```

**Важно:** BottomSheet применяется на уровне TabView (выше ZStack), чтобы он перекрывал TabBar. BottomSheet имеет `.zIndex(100)`.

---

## Использование

### Паттерн для BottomSheet компонентов

Все BottomSheet компоненты следуют единому паттерну:

```swift
struct MyBottomSheet {
    /// Показать BottomSheet
    @MainActor
    static func show(
        bottomSheetManager: BottomSheetManager,
        onAction: @escaping () -> Void
    ) {
        bottomSheetManager.show(showOverlay: true) {
            MyBottomSheetContent(
                onAction: {
                    bottomSheetManager.dismiss()
                    onAction()
                }
            )
        }
    }
}

private struct MyBottomSheetContent: View {
    let onAction: () -> Void

    var body: some View {
        // UI контент
    }
}
```

### Вызов из View

```swift
struct MyView: View {
    @EnvironmentObject private var container: DependencyContainer

    var body: some View {
        Button("Показать") {
            MyBottomSheet.show(
                bottomSheetManager: container.bottomSheetManager,
                onAction: { /* действие */ }
            )
        }
    }
}
```

### Вызов из ViewModel

Если BottomSheet нужно показать из ViewModel (например, при CONFLICT ошибке):

```swift
class MyViewModel: ObservableObject {
    private let bottomSheetManager: BottomSheetManager

    init(bottomSheetManager: BottomSheetManager) {
        self.bottomSheetManager = bottomSheetManager
    }

    func handleError(_ error: APIError) {
        if error.isError(.conflict) {
            ActiveTaskConflictBottomSheet.show(
                bottomSheetManager: bottomSheetManager,
                onConfirm: {}
            )
        }
    }
}
```

---

## Методы BottomSheetManager

### show(showOverlay:content:)

Показывает BottomSheet с заданным контентом.

```swift
func show<Content: View>(
    showOverlay: Bool = true,
    @ViewBuilder content: () -> Content
)
```

**Параметры:**
- `showOverlay` — затемнять ли фон (default: true)
- `content` — View-builder контента

### dismiss()

Закрывает BottomSheet. Автоматически очищает `content` через 300ms (время анимации закрытия).

```swift
func dismiss()
```

---

## Существующие BottomSheet компоненты

Все компоненты используют паттерн со static функцией `show()`:

### CloseShiftBottomSheet
`WFMApp/Features/Home/CloseShiftBottomSheet.swift`

### LogoutBottomSheet
`WFMApp/Features/Settings/LogoutBottomSheet.swift`

### TaskReviewSheet
`WFMApp/Features/ManagerHomeFlow/Components/TaskReviewSheet.swift`

### ActiveTaskConflictBottomSheet
`WFMApp/Features/TasksFeature/Views/ActiveTaskConflictBottomSheet.swift`

### CompleteConfirmationBottomSheet
`WFMApp/Features/TasksFeature/Views/CompleteConfirmationBottomSheet.swift`

---

## Особенности реализации

### ZStack + zIndex

BottomSheet появляется ВЫШЕ TabBar благодаря правильной иерархии:

```
ZStack(alignment: .bottom) {
    Content (.padding(.bottom, 80))  // контент с отступом для TabBar
    TabBar (.zIndex(1))              // TabBar на уровне 1
}
.wfmBottomSheet(...) { }             // BottomSheet с .zIndex(100) внутри модификатора
```

### Автоматическая очистка контента

После `dismiss()` контент очищается через Task.sleep(300ms) чтобы не было видно исчезновения контента во время анимации закрытия.

### @MainActor изоляция

Весь класс помечен `@MainActor`, так как работает с UI и может вызываться из разных потоков (например, из async функций в ViewModel).

---

## Android аналог

**На Android нет глобального менеджера.** BottomSheet компоненты реализуются как обычные Composable функции с параметрами `isVisible` и `onDismiss`.

Управление состоянием через `remember { mutableStateOf(false) }` на уровне экрана.
