# План: Интеграция Semetrics SDK в Android

**Статус:** Выполнено
**Создан:** 2026-03-30
**Последнее обновление:** 2026-03-30

## Цель

Параллельно с Firebase Analytics слать аналитические события в Semetrics — аналогично iOS. Итог: `CompositeAnalyticsService` с fan-out к Firebase и Semetrics.

## Контекст

- **Semetrics Android SDK:** `com.github.trombocit.semetrics-android:semetrics:VERSION` (JitPack)
- **JitPack уже есть** в `settings.gradle.kts` — ничего дополнительно не добавлять
- **API ключ:** `sm_live_0925497d1bf44a9c8dd6b84288772648`
- **Endpoint:** `https://semetrics.ru/events`
- **SDK API:** `Semetrics.configure(context, apiKey, endpoint)` + `Semetrics.track(eventName, userId, properties)`
- **Текущая аналитика WFM:** `AnalyticsService` интерфейс, реализован через `FirebaseAnalyticsService`, подключён через Koin: `single<AnalyticsService> { FirebaseAnalyticsService() }`

## Отличия от iOS

| | iOS | Android |
|--|--|--|
| SDK объект | `SemetricsClient` (class) | `Semetrics` (object) |
| Подключение | SPM (GitHub) | JitPack |
| `configure()` до `track()` | Крашится (был баг в SDK) | Логирует ошибку, не крашится |
| Фоновая доставка | DispatchSourceTimer (5 сек) | WorkManager (каждые 15 мин) |
| Персистентность очереди | UserDefaults | Room (SQLite) |
| Место инициализации | `DependencyContainer.init()` | `WFMApplication.onCreate()` |

## Задачи

- [x] **1. Добавить зависимость в `app/build.gradle.kts`**
  - Добавить: `implementation("com.github.trombocit.semetrics-android:semetrics:main-SNAPSHOT")`
  - JitPack уже прописан в `settings.gradle.kts`, ничего не менять
  - Если появится тэг в репозитории — заменить `main-SNAPSHOT` на версию

- [x] **2. Инициализация Semetrics в `WFMApplication.kt`**
  - Вызвать `Semetrics.configure(context, apiKey, endpoint)` **до** `startKoin`
  - Это гарантирует, что SDK готов к моменту первого `track()` из ViewModel
  - Файл: `app/src/main/java/com/beyondviolet/wfm/WFMApplication.kt`

- [x] **3. Создать `SemetricsAnalyticsService.kt`**
  - Реализует `AnalyticsService`
  - Хранит `currentUserId: String?` — передаётся в каждый `track()` (per-event, как на iOS)
  - Маппинг событий через `when(event)` — те же snake_case имена и параметры, что у `FirebaseAnalyticsService`
  - Параметры передаются как `Map<String, Any>` (строковые значения, аналогично Firebase)
  - Файл: `app/src/main/java/com/beyondviolet/wfm/core/analytics/SemetricsAnalyticsService.kt`

- [x] **4. Создать `CompositeAnalyticsService.kt`**
  - Принимает `List<AnalyticsService>` в конструктор
  - Делегирует `track`, `setUser`, `resetUser` всем сервисам по порядку
  - Файл: `app/src/main/java/com/beyondviolet/wfm/core/analytics/CompositeAnalyticsService.kt`

- [x] **5. Обновить `AppModule.kt`**
  - Заменить `single<AnalyticsService> { FirebaseAnalyticsService() }` на:
    ```kotlin
    single<AnalyticsService> {
        CompositeAnalyticsService(listOf(
            FirebaseAnalyticsService(),
            SemetricsAnalyticsService()
        ))
    }
    ```
  - Файл: `app/src/main/java/com/beyondviolet/wfm/core/di/AppModule.kt`

## Детали реализации

### WFMApplication.kt (фрагмент)

```kotlin
override fun onCreate() {
    super.onCreate()

    Semetrics.configure(
        context = this,
        apiKey = "sm_live_0925497d1bf44a9c8dd6b84288772648",
        endpoint = "https://semetrics.ru/events"
    )

    startKoin { ... }
}
```

### SemetricsAnalyticsService (структура)

```kotlin
class SemetricsAnalyticsService : AnalyticsService {
    private var currentUserId: String? = null

    override fun track(event: AnalyticsEvent) {
        val (name, props) = event.toSemetrics()
        Semetrics.track(eventName = name, userId = currentUserId, properties = props)
    }

    override fun setUser(userId: Int, role: String) { currentUserId = userId.toString() }
    override fun resetUser() { currentUserId = null }

    private fun AnalyticsEvent.toSemetrics(): Pair<String, Map<String, Any>?> = when (this) { ... }
}
```

### CompositeAnalyticsService (структура)

```kotlin
class CompositeAnalyticsService(private val services: List<AnalyticsService>) : AnalyticsService {
    override fun track(event: AnalyticsEvent) = services.forEach { it.track(event) }
    override fun setUser(userId: Int, role: String) = services.forEach { it.setUser(userId, role) }
    override fun resetUser() = services.forEach { it.resetUser() }
}
```

## Зависимости SDK (транзитивные, не конфликтуют)

SDK добавляет: Room 2.6.1, WorkManager 2.9.1, OkHttp 4.12.0, kotlinx-serialization-json 1.6.3. Конфликтов с WFM нет: OkHttp уже используется, WorkManager нет в явных зависимостях (придёт транзитивно), Room не используется в основном модуле.

## Лог выполнения

### 2026-03-30
- Создан план и реализованы все задачи
- JitPack уже подключён в settings.gradle.kts
- SDK не крашится при отсутствии configure() — только логирует ошибку (в отличие от iOS)
- Semetrics.configure() вызывается до startKoin в WFMApplication.onCreate()
- Созданы SemetricsAnalyticsService.kt и CompositeAnalyticsService.kt
- AppModule обновлён на CompositeAnalyticsService
