# Firebase Crashlytics

Сервис для автоматического сбора и анализа крешей и нефатальных ошибок в production.

## Зачем нужен

- **Мониторинг стабильности** — отслеживание крешей в production, статистика по версиям и устройствам
- **Анализ ошибок** — stack traces с символизацией, breadcrumbs (логи перед крешем)
- **Контекст** — custom keys, user ID, version, flavor для фильтрации в Firebase Console
- **Nonfatal exceptions** — логирование catch-блоков для анализа частых ошибок без креша

## Архитектура

**Паттерн:** Protocol/Interface + flavor-specific реализации.

- Android: Build flavors (GMS vs HMS) определяют доступность Firebase
- iOS: Firebase доступен всегда (SPM), но может не работать без корректного GoogleService-Info.plist

### Android

**Структура файлов:**
```
app/src/
├── main/kotlin/.../crashlytics/
│   └── CrashlyticsService.kt              # Интерфейс
├── gms/kotlin/.../crashlytics/
│   ├── FirebaseCrashlyticsService.kt      # Firebase реализация
│   └── CrashlyticsServiceFactory.kt       # Factory для GMS
└── hms/kotlin/.../crashlytics/
    ├── AppMetricaCrashlyticsService.kt    # AppMetrica реализация
    └── CrashlyticsServiceFactory.kt       # Factory для HMS
```

**Gradle configuration:**
- GMS: плагин `com.google.firebase.crashlytics`, зависимость `firebase-crashlytics` (только `gmsImplementation`)
- HMS: зависимость `appmetrica-analytics` (только `hmsImplementation`) — AppMetrica включает crash reporting
- Factory принимает `Context` для инициализации AppMetrica: `CrashlyticsServiceFactory.create(context)`
- Factory автоматически выбирает реализацию в compile time (Gradle source sets)

**Регистрация в Koin DI:**
```kotlin
single<CrashlyticsService> { CrashlyticsServiceFactory.create() }
```

**Файлы:**
- `mobile/android/gradle/libs.versions.toml` — версия плагина
- `mobile/android/app/build.gradle.kts` — применение плагина и зависимости
- `mobile/android/app/src/main/java/.../core/di/AppModule.kt` — DI регистрация

### iOS

**Структура:**
```
WFMApp/Core/Crashlytics/
└── CrashlyticsService.swift              # Singleton, обертка Firebase Crashlytics
```

**Конфигурация:**
- SPM: `firebase-ios-sdk` (FirebaseCrashlytics)
- Регистрация: `DependencyContainer.crashlyticsService`
- Run Script Phase: **временно отключен** из-за проблемы с GoogleService-Info.plist corruption

**Файлы:**
- `mobile/ios/WFMApp/Core/Crashlytics/CrashlyticsService.swift` — реализация
- `mobile/ios/WFMApp/Core/DI/DependencyContainer.swift` — DI регистрация

**⚠️ Известная проблема (iOS):**
Run Script Phase для dSYM uploading отключен. GoogleService-Info.plist повреждается при копировании в bundle (468 bytes вместо 870 bytes). Креши будут логироваться, но stack traces могут быть не символизированы.

## Использование в коде

### Android

```kotlin
class SomeViewModel(
    private val crashlytics: CrashlyticsService
) : ViewModel() {

    fun doSomething() {
        try {
            riskyOperation()
        } catch (e: Exception) {
            crashlytics.recordException(e)  // Nonfatal error
        }
    }
}
```

### iOS

```swift
class SomeViewModel {
    private let crashlytics = DependencyContainer.shared.crashlyticsService

    func doSomething() {
        do {
            try riskyOperation()
        } catch {
            crashlytics.record(error: error)  // Nonfatal error
        }
    }
}
```

## API методы

| Метод | Описание |
|-------|----------|
| `recordException(exception)` / `record(error:)` | Залогировать нефатальную ошибку |
| `log(message)` / `log(_:)` | Добавить breadcrumb (отображается в crash logs) |
| `setUserId(userId)` / `setUserId(_:)` | Установить user ID для фильтрации в консоли |
| `setCustomKey(key, value)` / `setCustomValue(_:forKey:)` | Установить custom key (flavor, assignment_id, etc.) |

## Тестирование

**Android:**
```kotlin
// CrashlyticsTestHelper.kt
CrashlyticsTestHelper.runAllTests(crashlytics)
```

Проверить в Firebase Console → Crashlytics через 5-10 минут.

**iOS:**
```swift
// Тестовый nonfatal
crashlytics.record(error: NSError(domain: "test", code: 1))

// Тестовый fatal (осторожно!)
fatalError("Test crash")
```

После креша перезапустить приложение — crash report отправится при следующем запуске.

## Рекомендации

**Что логировать:**
- ✅ Network errors (HTTP 500, timeout)
- ✅ Parsing errors (неожиданный JSON)
- ✅ Unexpected state (if-else fallback cases)
- ❌ Expected errors (validation, HTTP 4xx)

**Custom keys:**
- `user_id` — для фильтрации по пользователям
- `assignment_id` — для фильтрации по назначениям (магазин)
- `flavor` (Android) — GMS/HMS
- `version` — VERSION_NAME (Android) / CFBundleShortVersionString (iOS)

**Breadcrumbs:**
- Навигация между экранами
- API requests (URL, method)
- Критичные user actions (start task, complete task)

## Связанные файлы

**Android:**
- `mobile/android/app/src/main/java/.../core/crashlytics/CrashlyticsService.kt`
- `mobile/android/app/src/gms/kotlin/.../core/crashlytics/FirebaseCrashlyticsService.kt`
- `mobile/android/app/src/hms/kotlin/.../core/crashlytics/AppMetricaCrashlyticsService.kt`
- `mobile/android/app/src/main/java/.../core/crashlytics/CrashlyticsTestHelper.kt`

**iOS:**
- `mobile/ios/WFMApp/Core/Crashlytics/CrashlyticsService.swift`

**Конфигурация:**
- Android: `mobile/android/gradle/libs.versions.toml`, `mobile/android/app/build.gradle.kts`
- iOS: `mobile/ios/WFMApp.xcodeproj/project.pbxproj` (Run Script Phase отключен)
