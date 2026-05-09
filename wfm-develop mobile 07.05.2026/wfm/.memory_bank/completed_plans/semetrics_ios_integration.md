# План: Интеграция Semetrics SDK в iOS

**Статус:** Выполнено
**Создан:** 2026-03-30
**Выполнен:** 2026-03-30

## Цель

Параллельно с Firebase Analytics слать аналитические события в Semetrics — новую аналитическую платформу. WFM — первый клиент Semetrics.

## Контекст

- **Semetrics SDK (iOS):** https://github.com/trombocit/semetrics-ios — SPM-пакет, `SemetricsClient`, API: `configure(apiKey:endpoint:)` + `track(eventName:userId:properties:)`
- **API ключ:** `sm_live_0925497d1bf44a9c8dd6b84288772648`
- **Текущая аналитика WFM:** протокол `AnalyticsService`, реализован через `FirebaseAnalyticsService`, подключён через `DependencyContainer.analyticsService`
- **Паттерн:** добавить `CompositeAnalyticsService` (fan-out к Firebase + Semetrics), не трогая остальной код

## Задачи

- [x] **1. Добавить Semetrics SDK как SPM-зависимость**
  - Xcode → Add Package Dependencies → `https://github.com/trombocit/semetrics-ios`
  - Dependency Rule: Up to Next Major Version (или Branch: main если тэгов нет)
  - Target: WFMApp
  - Продукт: `Semetrics`

- [x] **2. Добавить semetrics-конфигурацию в `AppConfiguration`**
  - Новые поля: `semetricsApiKey: String`, `semetricsEndpoint: String`
  - DEV: тот же apiKey (пока только одна среда)
  - PROD: тот же apiKey
  - Файл: `WFMApp/Core/DI/AppConfiguration.swift`

- [x] **3. Инициализация SemetricsClient в AppDelegate**
  - В `application(_:didFinishLaunchingWithOptions:)`, рядом с `FirebaseApp.configure()`
  - Вызов: `SemetricsClient.configure(apiKey: config.semetricsApiKey, endpoint: config.semetricsEndpoint)`
  - Файл: `WFMApp/WFMApp.swift`

- [x] **4. Создать `SemetricsAnalyticsService`**
  - Реализует протокол `AnalyticsService`
  - Хранит текущий `userId: String?` (устанавливается через `setUser`, сбрасывается через `resetUser`) — нужно потому что Semetrics передаёт userId per-event, а не глобально
  - Маппинг `AnalyticsEvent → semetricsRepresentation` через private extension (те же snake_case имена событий + те же properties, что у Firebase)
  - Вызывает `SemetricsClient.shared.track(eventName:userId:properties:)`
  - Файл: `WFMApp/Core/Analytics/SemetricsAnalyticsService.swift`

- [x] **5. Создать `CompositeAnalyticsService`**
  - Принимает `[AnalyticsService]` в init
  - Все три метода (`track`, `setUser`, `resetUser`) делегирует всем сервисам по порядку
  - Файл: `WFMApp/Core/Analytics/CompositeAnalyticsService.swift`

- [x] **6. Подключить в `DependencyContainer`**
  - Заменить `FirebaseAnalyticsService()` на `CompositeAnalyticsService(services: [FirebaseAnalyticsService(), SemetricsAnalyticsService()])`
  - Файл: `WFMApp/Core/DI/DependencyContainer.swift`

## Детали реализации

### SemetricsAnalyticsService

```swift
final class SemetricsAnalyticsService: AnalyticsService {
    private var currentUserId: String?

    func track(_ event: AnalyticsEvent) {
        let (name, props) = event.semetricsRepresentation
        SemetricsClient.shared.track(eventName: name, userId: currentUserId, properties: props)
    }

    func setUser(userId: Int, role: String) {
        currentUserId = String(userId)
    }

    func resetUser() {
        currentUserId = nil
    }
}
```

### CompositeAnalyticsService

```swift
final class CompositeAnalyticsService: AnalyticsService {
    private let services: [AnalyticsService]

    init(services: [AnalyticsService]) {
        self.services = services
    }

    func track(_ event: AnalyticsEvent) {
        services.forEach { $0.track(event) }
    }

    func setUser(userId: Int, role: String) {
        services.forEach { $0.setUser(userId: userId, role: role) }
    }

    func resetUser() {
        services.forEach { $0.resetUser() }
    }
}
```

### semetricsRepresentation маппинг

Добавляется как `private extension AnalyticsEvent` в `SemetricsAnalyticsService.swift`. Событийные имена идентичны `firebaseRepresentation` (snake_case), properties — те же. Это сознательное дублирование — каждый сервис независим и может расходиться в будущем.

### AppConfiguration

```swift
let semetricsApiKey: String
let semetricsEndpoint: String

static let default: AppConfiguration = {
    // ...
    return AppConfiguration(
        apiBaseURL: ...,
        environment: ...,
        semetricsApiKey: "sm_live_0925497d1bf44a9c8dd6b84288772648",
        semetricsEndpoint: "https://semetrics.ru/events"
    )
}()
```

## Вопросы перед стартом

- [x] Получить API ключ от команды Semetrics — `sm_live_0925497d1bf44a9c8dd6b84288772648`
- [x] Уточнить endpoint — дефолтный `https://semetrics.ru/events` ✓

## Лог выполнения

### 2026-03-30
- Создан план на основе анализа SDK и кодовой базы WFM iOS
- Источник SDK изменён с локального пути на GitHub: https://github.com/trombocit/semetrics-ios
- Получен API ключ: sm_live_0925497d1bf44a9c8dd6b84288772648
- Реализованы все задачи кроме SPM (добавляется вручную в Xcode)
- Исправлен баг в SDK: `static var shared = { fatalError() }()` заменён на computed property с `_shared: SemetricsClient?`
- Инициализация `SemetricsClient.configure()` перенесена из AppDelegate в `DependencyContainer.init()` для гарантии порядка
- Интеграция протестирована, работает
