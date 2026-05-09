# План: Tab Bar Navigation

**Статус:** Выполнено
**Создан:** 2026-01-26
**Последнее обновление:** 2026-01-26

## Цель

Добавить нижнюю навигацию (Tab Bar) с 3 табами в iOS и Android приложения:
1. Главная — заглушка "Раздел в разработке"
2. Задачи — текущий функционал (TasksList)
3. Настройки — заглушка "Раздел в разработке"

Стартовый таб — Задачи (индекс 1).

---

## iOS

### Задачи

- [x] Создать `DevelopmentStubView` — переиспользуемая заглушка (2026-01-26)
  - Файл: `WFMApp/Features/Stubs/DevelopmentStubView.swift`

- [x] Создать `HomeStubView` — экран "Главная" (2026-01-26)
  - Файл: `WFMApp/Features/Home/HomeStubView.swift`

- [x] Создать `SettingsStubView` — экран "Настройки" (2026-01-26)
  - Файл: `WFMApp/Features/Settings/SettingsStubView.swift`

- [x] Добавить enum `MainTab` для type-safe работы с табами (2026-01-26)
  - Файл: `WFMApp/Core/Navigation/MainTab.swift`

- [x] Создать `MainTabView` — контейнер с TabView (2026-01-26)
  - Файл: `WFMApp/Features/MainFlow/MainTabView.swift`

- [x] Обновить `MainFlowView` — использует `MainTabView` (2026-01-26)

---

## Android

### Задачи

- [x] Создать `DevelopmentStubScreen` — переиспользуемая заглушка (2026-01-26)
  - Файл: `features/stubs/DevelopmentStubScreen.kt`

- [x] Создать `HomeStubScreen` — экран "Главная" (2026-01-26)
  - Файл: `features/home/HomeStubScreen.kt`

- [x] Создать `SettingsStubScreen` — экран "Настройки" (2026-01-26)
  - Файл: `features/settings/SettingsStubScreen.kt`

- [x] Создать sealed class `MainTab` для описания табов (2026-01-26)
  - Файл: `navigation/MainTab.kt`

- [x] Создать `MainTabScreen` — контейнер с Scaffold + NavigationBar (2026-01-26)
  - Файл: `features/main/MainTabScreen.kt`

- [x] Обновить `AppNavigation.kt` (2026-01-26)
  - Добавлен маршрут `Screen.MainTabs`
  - Переходы на `TasksList` заменены на `MainTabs`
  - Навигация TasksList → TaskDetails работает через callback

---

## Общие заметки

- Каждый таб должен сохранять своё состояние при переключении
- На iOS использовать `@State var selectedTab` для сохранения выбранного таба
- На Android использовать `rememberSaveable` для сохранения состояния
- Логика logout остаётся без изменений (вызов из любого таба очищает сессию)

---

## Лог выполнения

### 2026-01-26
- Создан план
- Проанализирована текущая архитектура iOS и Android
- **Android: Выполнено**
  - Создан `DevelopmentStubScreen` (общая заглушка)
  - Создан `HomeStubScreen` и `SettingsStubScreen`
  - Создан `MainTab` sealed class
  - Создан `MainTabScreen` с NavigationBar
  - Обновлён `AppNavigation.kt`
- **iOS: Выполнено**
  - Создан `DevelopmentStubView` (общая заглушка)
  - Создан `HomeStubView` и `SettingsStubView`
  - Создан `MainTab` enum
  - Создан `MainTabView` с TabView
  - Обновлён `MainFlowView`
