# iOS Stack

## Обзор

Платформа: iOS (минимальная версия 17.0)

## Технологический стек

### Язык
- **Swift 5.0+** (рекомендуется Swift 5.10+)

### UI Framework
- **SwiftUI** — декларативный UI фреймворк от Apple

### Архитектура
- **MVVM** (Model-View-ViewModel)
- Модульная структура: локальные Swift Package Manager пакеты (`WFMAuth`, `WFMUI`)

### Dependency Injection
- **Лёгкий DI контейнер** (`DependencyContainer`) — ручная регистрация зависимостей
- В будущем: рассмотреть Factory или Needle

### Сеть
- **URLSession** — нативный HTTP клиент
- `APIClient` — обёртка над URLSession
- В будущем: Apollo GraphQL (при переходе на GraphQL)

### Хранилище данных
- **UserDefaults** — хранение токенов и настроек (через `TokenStorage`)
- В будущем: **SwiftData** для локальной БД

### Изображения
- **Kingfisher 8.6.2** — загрузка и кеширование изображений (AsyncImage с кешированием)

### Дополнительные библиотеки
- **HCaptcha 2.10.0** — CAPTCHA для авторизации
- **HCaptcha_RxSwift** — RxSwift интеграция для hCaptcha
- **RxSwift 6.9.1** — зависимость hCaptcha SDK
- **BottomSheet 3.1.1** — реализация BottomSheet с поведением Material 3 (автоадаптация высоты под контент)

### Аналитика и мониторинг
- **Firebase iOS SDK 12.11.0** — аналитика, crashlytics, push-уведомления
  - FirebaseAnalytics
  - FirebaseCrashlytics
  - FirebaseMessaging

### Локальные модули (Swift Package Manager)
- **WFMAuth** — модуль авторизации (PhoneInput, CodeInput, Registration)
- **WFMUI** — дизайн-система (цвета, типографика, компоненты)

## Структура проекта

```
mobile/ios/
├── WFMApp/                       # Основное приложение
│   ├── Core/
│   │   ├── DI/                   # Dependency Injection
│   │   │   └── DependencyContainer.swift
│   │   ├── Networking/           # API клиенты
│   │   │   ├── APIClient.swift
│   │   │   ├── TasksService.swift
│   │   │   ├── UserService.swift
│   │   │   └── ShiftsService.swift
│   │   ├── Models/               # Модели данных
│   │   │   ├── TaskModel.swift
│   │   │   ├── TaskState.swift
│   │   │   ├── User.swift
│   │   │   └── ShiftModels.swift
│   │   ├── Managers/             # Менеджеры
│   │   │   ├── UserManager.swift
│   │   │   └── BottomSheetManager.swift
│   │   ├── Navigation/           # Навигация
│   │   │   ├── AppRouter.swift
│   │   │   ├── Route.swift
│   │   │   └── MainTab.swift
│   │   └── Events/               # Event Bus
│   │       └── TaskEvents.swift
│   ├── Features/                 # Экраны и фичи
│   │   ├── Home/                 # Домашний экран
│   │   ├── Settings/             # Настройки
│   │   ├── TasksFeature/         # Задачи (ViewModels + Views)
│   │   ├── Welcome/              # Приветствие
│   │   ├── Splash/               # Сплэш экран
│   │   └── MainFlow/             # MainTabView + MainFlowView
│   ├── Assets.xcassets           # Ассеты (иконки, изображения)
│   ├── WFMApp.swift              # @main точка входа
│   └── ContentView.swift
├── WFMAuth/                      # Модуль авторизации (SPM)
│   ├── Package.swift
│   └── Sources/WFMAuth/
│       ├── Models/
│       ├── Networking/
│       ├── Screens/              # PhoneInputView, CodeInputView, etc.
│       └── ViewModels/
└── WFMUI/                        # Модуль UI компонентов (SPM)
    ├── Package.swift
    └── Sources/WFMUI/
        ├── DesignSystem/         # Токены
        │   ├── WFMColors.swift
        │   ├── WFMTypography.swift
        │   └── WFMSpacing.swift
        └── Components/           # Кастомные компоненты
            ├── WFMButton.swift
            ├── WFMTextField.swift
            └── WFMBottomSheet.swift
```

## Принципы работы

1. **Модульность**: Крупные фичи (WFMAuth) вынесены в Swift Package Manager пакеты
2. **MVVM + SwiftUI**: ViewModels обрабатывают бизнес-логику, Views рендерят UI
3. **Single Source of Truth**: Memory Bank → iOS код
4. **UI компоненты из дизайн-системы**: Используем токены из `WFMUI` модуля
5. **URLSession + Codable**: Все API запросы типизированы
6. **UserDefaults**: Хранение токенов и настроек (через менеджеры)
7. **Лёгкий DI**: Зависимости регистрируются в `DependencyContainer`

## В будущем

- **SwiftData** — локальная БД (замена Core Data)
- **Apollo GraphQL** — при переходе на GraphQL API
- **KMM интеграция** — общая бизнес-логика с Android (2025)
- **DivKit** — Server-Driven UI для динамических экранов
