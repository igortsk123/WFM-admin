# Инструкция: Вынос флоу в отдельный фреймворк (iOS)

Эта инструкция описывает процесс выделения функционального флоу (например, авторизация, онбординг, профиль) в отдельный Swift Package Manager модуль.

## Когда выносить в отдельный модуль?

✅ **Выносите, если:**
- Флоу логически самодостаточен (авторизация, онбординг, настройки)
- Хотите переиспользовать в других приложениях
- Нужна изоляция зависимостей
- Команда работает над модулем независимо
- Хотите улучшить время компиляции

❌ **Не выносите, если:**
- Флоу сильно связан с основным приложением
- Всего 1-2 экрана
- Часто меняется бизнес-логика совместно с основным приложением

## Структура модуля

```
WFMModuleName/                    # Корень модуля
├── Package.swift                 # SPM манифест
└── Sources/
    └── WFMModuleName/
        ├── DI/
        │   └── ModuleNameDependencyContainer.swift   # DI контейнер модуля
        ├── Models/
        │   └── ModuleModels.swift                   # Доменные модели
        ├── Services/
        │   └── ModuleService.swift                  # API/бизнес-логика
        ├── Storage/
        │   └── ModuleStorage.swift                  # Локальное хранилище
        ├── ViewModels/
        │   └── ModuleViewModel.swift                # ViewModels
        ├── Views/
        │   ├── ModuleFlowView.swift                 # Root view + навигация
        │   ├── Screen1View.swift
        │   └── Screen2View.swift
        └── Navigation/
            └── ModuleRoute.swift                    # Enum для навигации
```

## Пошаговый процесс

### 1. Создание модуля

```bash
cd mobile/ios
mkdir WFMModuleName
cd WFMModuleName
swift package init --type library --name WFMModuleName
```

### 2. Настройка Package.swift

```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "WFMModuleName",
    platforms: [.iOS(.v17)],  // Минимальная версия iOS
    products: [
        .library(
            name: "WFMModuleName",
            targets: ["WFMModuleName"]
        ),
    ],
    dependencies: [
        // Добавьте внешние зависимости если нужны
        // .package(url: "https://github.com/...", from: "1.0.0")
    ],
    targets: [
        .target(
            name: "WFMModuleName",
            dependencies: []
        ),
        .testTarget(
            name: "WFMModuleNameTests",
            dependencies: ["WFMModuleName"]
        ),
    ]
)
```

### 3. Создание DI контейнера модуля

**`DI/ModuleNameDependencyContainer.swift`:**

```swift
import Foundation

/// DI контейнер для модуля [ModuleName]
///
/// Инкапсулирует все зависимости модуля
@MainActor
public class ModuleNameDependencyContainer {
    // MARK: - Services

    public let moduleService: ModuleService
    public let moduleStorage: ModuleStorage

    // MARK: - Initialization

    /// Создать контейнер с дефолтными зависимостями
    public init() {
        self.moduleStorage = ModuleStorage()
        self.moduleService = ModuleService()
    }

    /// Создать контейнер с кастомными зависимостями (для тестов)
    public init(moduleService: ModuleService, moduleStorage: ModuleStorage) {
        self.moduleService = moduleService
        self.moduleStorage = moduleStorage
    }

    // MARK: - Factory Methods

    /// Создать ViewModel для модуля
    public func makeModuleViewModel() -> ModuleViewModel {
        return ModuleViewModel(
            service: moduleService,
            storage: moduleStorage
        )
    }
}
```

### 4. Создание FlowView (точка входа)

**`Views/ModuleFlowView.swift`:**

```swift
import SwiftUI

/// Root view модуля [ModuleName]
///
/// Управляет навигацией внутри модуля
public struct ModuleFlowView: View {
    @StateObject private var viewModel: ModuleViewModel
    @State private var navigationPath = NavigationPath()

    /// Callback при завершении флоу
    public var onFlowCompleted: () -> Void

    /// Инициализация с DI контейнером (рекомендуется)
    public init(
        container: ModuleNameDependencyContainer,
        onFlowCompleted: @escaping () -> Void
    ) {
        _viewModel = StateObject(wrappedValue: container.makeModuleViewModel())
        self.onFlowCompleted = onFlowCompleted
    }

    public var body: some View {
        NavigationStack(path: $navigationPath) {
            // Root экран модуля
            Screen1View(viewModel: viewModel)
                .navigationDestination(for: ModuleRoute.self) { route in
                    destinationView(for: route)
                }
        }
        .onChange(of: viewModel.state) { oldState, newState in
            handleStateChange(newState: newState)
        }
    }

    @ViewBuilder
    private func destinationView(for route: ModuleRoute) -> some View {
        switch route {
        case .screen2:
            Screen2View(viewModel: viewModel)
        }
    }

    private func handleStateChange(newState: ModuleState) {
        switch newState {
        case .completed:
            onFlowCompleted()
        default:
            break
        }
    }
}
```

### 5. Интеграция в основное приложение

#### 5.1 Добавление зависимости в основной проект

**Xcode:**
1. File → Add Package Dependencies
2. "Add Local..." → выберите папку `WFMModuleName`
3. Add to Target: WFMApp

#### 5.2 Обновление DependencyContainer приложения

```swift
import WFMModuleName

@MainActor
class DependencyContainer: ObservableObject {
    // ... существующие зависимости

    // Модуль [ModuleName]
    let moduleContainer: ModuleNameDependencyContainer

    private init() {
        // Инициализируем контейнер модуля
        self.moduleContainer = ModuleNameDependencyContainer()

        // ... остальные зависимости
    }
}
```

#### 5.3 Использование в UI

```swift
import SwiftUI
import WFMModuleName

struct SomeView: View {
    @EnvironmentObject private var container: DependencyContainer

    var body: some View {
        ModuleFlowView(
            container: container.moduleContainer,
            onFlowCompleted: {
                // Действие после завершения флоу
                print("Module flow completed")
            }
        )
    }
}
```

## Checklist

Перед финализацией модуля убедитесь:

- [ ] **Публичные API:** Все классы/структуры, которые нужны снаружи, помечены `public`
- [ ] **Инициализаторы:** Все публичные типы имеют публичные инициализаторы
- [ ] **DI контейнер:** Создан и инкапсулирует все зависимости
- [ ] **FlowView:** Имеет два конструктора (с контейнером и без - для совместимости)
- [ ] **Навигация:** Полностью инкапсулирована внутри модуля
- [ ] **Callback:** `onFlowCompleted` или аналогичный вызывается при завершении
- [ ] **Зависимости:** Минимальны, нет лишних импортов
- [ ] **Билд:** Проект собирается без ошибок
- [ ] **Preview:** Все экраны имеют SwiftUI Preview

## Пример: WFMAuth модуль

Хороший пример выделенного модуля - `WFMAuth`:

```
WFMAuth/
├── Package.swift
└── Sources/
    └── WFMAuth/
        ├── DI/
        │   └── AuthDependencyContainer.swift       # ✅ DI контейнер
        ├── Models/
        │   └── AuthModels.swift                   # ✅ Модели (Gender, TokenResponse, etc)
        ├── Services/
        │   └── AuthService.swift                  # ✅ API сервис (Beyond Violet OAuth2)
        ├── Storage/
        │   └── TokenStorage.swift                 # ✅ Keychain хранилище
        ├── ViewModels/
        │   └── AuthViewModel.swift                # ✅ Бизнес-логика
        ├── Views/
        │   ├── AuthFlowView.swift                 # ✅ Root view + навигация
        │   ├── PhoneInputView.swift
        │   ├── CodeInputView.swift
        │   ├── RegistrationView.swift
        │   └── HCaptchaView.swift
        └── Navigation/
            └── AuthRoute.swift                    # ✅ Enum для навигации
```

**Использование в приложении:**

```swift
// Инициализация в DependencyContainer
let authContainer = AuthDependencyContainer()

// Использование в UI (всего одна строка!)
AuthFlowView(
    container: container.authContainer,
    onAuthenticationCompleted: { router.login() }
)
```

## Советы

1. **Начните с DI контейнера** - это упростит тестирование и интеграцию
2. **Минимизируйте зависимости** - модуль должен быть максимально независимым
3. **Документируйте публичные API** - добавьте комментарии к публичным классам
4. **Используйте callback-и** - для коммуникации с основным приложением
5. **Тестируйте изолированно** - модуль должен компилироваться отдельно от приложения

## Альтернативы

Если модуль слишком мал или сильно связан с приложением:
- Используйте просто группу файлов (folder reference)
- Создайте namespace через enum вместо отдельного модуля
- Выделите только Service слой, UI оставьте в приложении
