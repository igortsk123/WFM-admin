# WFM iOS App

iOS приложение для системы управления рабочей силой (Workforce Management), построенное на основе спецификаций Memory Bank.

## Требования

- iOS 17.0+
- Xcode 16.0+
- Swift 5.10+

## Архитектура

Проект следует рекомендациям из `.memory_bank/mobile/ios_stack.md`:

- **UI Framework**: SwiftUI
- **Architecture**: MVVM
- **Dependency Injection**: Легковесный контейнер
- **Networking**: URLSession с async/await
- **Concurrency**: Swift Concurrency (async/await, actors)

## Структура проекта

```
WFMApp/
├── Core/
│   ├── Models/          # Доменные модели из Memory Bank
│   │   ├── AuthModels.swift
│   │   ├── TaskModel.swift
│   │   └── TaskState.swift
│   ├── Networking/      # API клиент и сервисы
│   │   ├── APIClient.swift
│   │   ├── AuthService.swift
│   │   └── TasksService.swift
│   ├── Storage/         # Локальное хранение
│   │   └── TokenStorage.swift
│   └── DI/              # Dependency Injection
│       ├── AppConfiguration.swift
│       └── DependencyContainer.swift
├── Features/
│   ├── AuthFeature/     # Фича авторизации
│   │   ├── ViewModels/
│   │   │   └── AuthViewModel.swift
│   │   └── Views/
│   │       ├── AuthFlowView.swift
│   │       ├── PhoneInputView.swift
│   │       ├── RegistrationView.swift
│   │       ├── CodeInputView.swift
│   │       └── HCaptchaView.swift
│   └── TasksFeature/    # Фича управления задачами
│       ├── ViewModels/
│       │   ├── TasksListViewModel.swift
│       │   ├── TaskDetailViewModel.swift
│       │   └── CreateTaskViewModel.swift
│       └── Views/
│           ├── TasksListView.swift
│           ├── TaskDetailView.swift
│           ├── CreateTaskView.swift
│           └── TaskRowView.swift
├── WFMApp.swift         # Точка входа
└── ContentView.swift    # Корневой view с условной навигацией
```

## Фича: AuthFeature

### Функциональность

Полный flow авторизации и регистрации через Beyond Violet OAuth2 API:

- **Авторизация существующих пользователей** по номеру телефона
- **Регистрация новых пользователей** с валидацией данных
- **Выбор канала доставки кода** (Telegram / SMS / Звонок)
- **Защита от ботов** через hCaptcha
- **Безопасное хранение токенов** в iOS Keychain
- **Автообновление токенов** при истечении

### Экраны

1. **PhoneInputView** - Ввод номера телефона
   - Выбор канала доставки (Telegram/Телефон)
   - Автоопределение установленного Telegram
   - Автоформатирование номера (+7XXXXXXXXXX)
   - Валидация формата

2. **RegistrationView** - Регистрация нового пользователя
   - Поля: имя, фамилия, дата рождения, пол
   - DatePicker для выбора даты
   - Валидация обязательных полей

3. **CodeInputView** - Ввод кода подтверждения
   - 4-значный код с автоотправкой
   - Таймер обратного отсчета
   - Информация о канале доставки
   - Повторная отправка кода
   - Изменение номера

4. **HCaptchaView** - Защита от ботов
   - WKWebView интеграция
   - Автообработка токена капчи

### Auth Flow

Согласно `.memory_bank/domain/auth/auth_flow.md`:

**Существующий пользователь:**
```
PhoneInput → CodeInput → Authenticated
```

**Новый пользователь:**
```
PhoneInput → Registration → CodeInput → Authenticated
```

**С капчей:**
```
Любой запрос → HCaptcha → Повтор запроса → Продолжение
```

### Безопасность

- **TokenStorage** - хранение JWT в iOS Keychain
  - kSecAttrAccessibleWhenUnlockedThisDeviceOnly
  - Автоматическая проверка истечения токена
  - Очистка при logout

- **APIClient** - автообновление токенов
  - Actor-based для thread-safety
  - **Защита от race condition** при параллельных запросах
  - Автоматический refresh при истечении access_token
  - Только один refresh запрос в любой момент времени
  - Параллельные запросы ждут завершения текущего refresh
  - Очистка токенов при ошибке обновления
  - **Защита URLSession от отмены SwiftUI**: использует unstructured Task для изоляции HTTP запросов

**Как работает синхронизация:**
```swift
// Запрос 1 обнаружил что токен истёк
ensureValidToken() -> проверяет isRefreshing (false) -> начинает refresh

// Запрос 2 тоже обнаружил истечение
ensureValidToken() -> проверяет isRefreshing (true) -> ждёт 100ms -> проверяет снова...

// Запрос 1 завершил refresh, установил isRefreshing = false
// Запрос 2 видит isRefreshing = false -> использует новый токен
```

Аналогично Android реализации с `Mutex` из kotlinx.coroutines

**Как работает защита от отмены URLSession:**
```swift
// SwiftUI может отменить Task (например, при pull-to-refresh)
// Без защиты: URLSession.data(for:) отменяется вместе с Task
// С защитой: URLSession изолирован в отдельном unstructured Task

let (data, response) = try await _Concurrency.Task {
    try await session.data(for: request)
}.value
// Unstructured Task не отменяется автоматически при отмене родительского Task
```

Это решает проблему когда pull-to-refresh отменял HTTP запрос до получения ответа.

### Модели

Согласно `.memory_bank/backend/external/api_bv.md`:

```swift
struct TokenResponse {
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int
    let tokenType: String
}

struct CodeSentResponse {
    let channel: DeliveryChannel  // telegram, sms, call
    let botUsername: String?
    let botStartPayload: String?
    let expiresAt: Double
}
```

## Фича: TasksFeature

### Функциональность

- **Список задач**: Просмотр всех задач с фильтрацией по состоянию
- **Детали задачи**: Просмотр деталей и выполнение переходов состояний
- **Создание задачи**: Форма создания новой задачи
- **Управление состояниями**: Переходы по workflow из Memory Bank

### Экраны

1. **TasksListView** - Главный экран со списком задач
   - Фильтрация по состоянию (NEW, IN_PROGRESS, PAUSED, COMPLETED)
   - Pull-to-refresh
   - Отображение активной задачи отдельно
   - Переход к деталям задачи

2. **TaskDetailView** - Экран деталей задачи
   - Информация о задаче
   - Доступные действия в зависимости от состояния
   - Переходы между состояниями

3. **CreateTaskView** - Экран создания задачи
   - Форма с валидацией
   - Поля: title, description, planned_minutes, assignee_id

### Доменная модель

Модель `Task` полностью соответствует спецификации из `.memory_bank/domain/task_model.md`:

```swift
struct Task {
    let id: UUID
    var title: String
    var description: String
    var plannedMinutes: Int
    let creatorId: String
    var assigneeId: String?
    var state: TaskState
    let createdAt: Date
    var updatedAt: Date
}
```

### Состояния задачи

`TaskState` реализует state machine из `.memory_bank/domain/task_states.md`:

- **NEW** → **IN_PROGRESS** (start)
- **IN_PROGRESS** → **PAUSED** (pause)
- **PAUSED** → **IN_PROGRESS** (resume)
- **IN_PROGRESS** → **COMPLETED** (complete)

### API интеграция

`TasksService` реализует все endpoints из `.memory_bank/backend/api_tasks.md`:

- `GET /tasks` - Список задач с фильтрами
- `POST /tasks` - Создание задачи
- `GET /tasks/{id}` - Получение задачи
- `PATCH /tasks/{id}` - Обновление задачи
- `POST /tasks/{id}/start` - Начать задачу
- `POST /tasks/{id}/pause` - Приостановить задачу
- `POST /tasks/{id}/resume` - Возобновить задачу
- `POST /tasks/{id}/complete` - Завершить задачу

### UI экранов Tasks Feature

#### TasksListView - Список задач с табами

Согласно `.memory_bank/mobile/feature_tasks/screens/tasks_list.yaml`:

**Layout:** Segmented Control сверху экрана с тремя вкладками

**Табы (Segmented Picker):**
1. **Новые** (state=NEW)
   - Показывает только задачи в состоянии NEW

2. **Текущие** (state=IN_PROGRESS|PAUSED)
   - Выделяет активную задачу (IN_PROGRESS) в отдельной секции
   - Показывает приостановленные задачи (PAUSED)

3. **Выполненные** (state=COMPLETED)
   - Показывает завершённые задачи

**UI элементы:**
- Segmented Control сверху (узкие табы)
- Pull-to-refresh для обновления списка
- FAB (Floating Action Button) в правом нижнем углу для создания задачи
- Кнопка logout в toolbar (справа)

**Особенности:**
- Компактный segmented контрол сверху экрана
- Автоматическая загрузка задач при открытии (`.task`)
- Empty state для каждого таба с уникальным сообщением

#### TaskDetailView - Детали задачи

**Секции:**
1. **State Card** - Карточка с текущим состоянием
   - Название состояния
   - Дата создания
   - Цветной фон по состоянию

2. **Details Section** - Детали задачи
   - Название и описание
   - Плановое время (минуты)
   - Исполнитель и создатель

3. **Actions Section** - Доступные действия
   - Динамический список кнопок в зависимости от состояния
   - Кнопки с иконками и цветами

**UI элементы:**
- Pull-to-refresh для обновления данных
- Автозагрузка данных при открытии через `.task`
- Автоматическое закрытие после завершения задачи

#### CreateTaskView - Создание задачи

**Layout:** Form с большой кнопкой внизу

**Секции:**
1. **Информация о задаче**
   - Название (обязательно)
   - Описание (multiline, обязательно)

2. **Оценка времени**
   - Stepper: 15-480 минут, шаг 15
   - Отображение: "{value} мин"

3. **Назначение**
   - ID исполнителя (необязательно)
   - Footer с подсказкой

**Кнопка создания:**
- Расположена внизу экрана
- Полная ширина, синяя, со скруглёнными углами
- Иконка: `plus.circle.fill`
- Loading indicator внутри кнопки при отправке
- Disabled состояние (серая) если форма невалидна

## Конфигурация

API endpoint настраивается в `AppConfiguration`:

```swift
// Debug
baseURL = "http://localhost:8000"

// Release
baseURL = "https://api.wfm.com"
```

## Логирование API запросов

Все сетевые запросы автоматически логируются через нативный `os.Logger`.

### APIClient (WFM Tasks API)

**Автоматически добавляет во все запросы:**
- Common headers (X-Device-Id, X-App-Version, X-App-Domain, X-Store-Id, X-Requested-With)
- Authorization header с автоматическим refresh токена
- Content-Type: application/json

**Логирует детальную информацию:**

**Запросы (📤):**
- HTTP метод и URL
- Заголовки (Authorization маскируется как "Bearer ***", X-Device-Id частично)
- Request body (только в DEBUG, форматированный JSON)

**Ответы (📥):**
- HTTP статус код и URL
- Размер данных в байтах
- Response body (только в DEBUG, форматированный JSON)

**Ошибки (❌):**
- Ошибки декодирования
- HTTP ошибки (400, 401, 404, 409, 500+)

**Token Refresh (🔄):**
- `🔄 Starting token refresh...` - начало обновления токена
- `⏳ Waiting for ongoing token refresh...` - параллельный запрос ждёт
- `✅ Token refreshed successfully` - токен успешно обновлён
- `❌ Failed to refresh token` - ошибка обновления (токены очищены)

### AuthService (Beyond Violet OAuth2 API)

Логирует **минимальную информацию** (работает напрямую с URLSession, не через APIClient):

**Запросы:**
- `📤 POST https://api.beyondviolet.com/oauth/authorize/`

**Ответы:**
- `📥 200 https://api.beyondviolet.com/oauth/authorize/`

**Ошибки:**
- `❌ Beyond Violet error: AUTH_CAPTCHA_REQUIRED - Для продолжения требуется ввод captcha`

**Почему минимальное?**
- AuthService не использует APIClient (циклическая зависимость)
- Работает напрямую с URLSession
- Использует form-urlencoded вместо JSON
- Для детальной отладки можно использовать Charles Proxy

### Просмотр логов

**В Xcode Console:**
```
📤 GET https://dev.wfm.beyondviolet.com/tasks
Headers: [
  "Authorization": "Bearer ***",
  "Content-Type": "application/json",
  "X-App-Domain": "com.beyondviolet.rost.worker",
  "X-App-Version": "1.12.1",
  "X-Device-Id": "IOS12345678...",
  "X-Requested-With": "XMLHttpRequest",
  "X-Store-Id": "1"
]

📥 200 https://dev.wfm.beyondviolet.com/tasks (1234 bytes)
Response: [
  {
    "id": "uuid-here",
    "title": "Выкладка товара",
    "state": "NEW",
    ...
  }
]
```

**В Console.app:**
1. Откройте Console.app (Cmd+Space → "Console")
2. Выберите симулятор или устройство
3. Фильтры:
   - `subsystem:com.wfm category:APIClient` - WFM Tasks API
   - `subsystem:com.wfm category:AuthService` - Beyond Violet OAuth2 API
   - `subsystem:com.wfm` - Все логи приложения

### Уровни логирования

- **`.info`** - Успешные запросы/ответы (200-299)
- **`.debug`** - Headers, Body (только в DEBUG)
- **`.warning`** - 401 Unauthorized
- **`.error`** - Ошибки HTTP, декодирования

### Безопасность

**В DEBUG:**
- Логируются request/response body
- Authorization header маскируется

**В RELEASE:**
- Body НЕ логируется (защита от утечки токенов/персональных данных)
- Только HTTP метод, URL, статус код

### Отключение логирования body

Если нужно отключить логирование body даже в DEBUG:

```swift
let apiClient = APIClient(
    baseURL: baseURL,
    shouldLogBody: false  // Отключить логирование body
)
```

## Запуск проекта

1. Откройте `WFMApp.xcodeproj` в Xcode 16
2. Выберите симулятор или устройство
3. Нажмите Cmd+R для запуска

## Правила бизнес-логики

- ✅ Сотрудник может иметь только 1 активную задачу одновременно
- ✅ Валидация переходов состояний на клиенте
- ✅ Обработка HTTP 409 Conflict при недопустимых переходах
- ✅ Минимальная сложность (MVP без бонусных задач, KPI, рейтингов)

## Зависимости

Проект не использует внешние зависимости, только стандартные фреймворки Apple:

- SwiftUI
- Foundation
- Combine (через @Published)

## Важные замечания

### Добавление файлов в Xcode

⚠️ **Новые файлы AuthFeature необходимо добавить в Xcode проект!**

1. Откройте проект в Xcode
2. File → Add Files to "WFMApp"
3. Выберите директории:
   - `Core/Models/AuthModels.swift`
   - `Core/Storage/TokenStorage.swift`
   - `Core/Networking/AuthService.swift`
   - `Features/AuthFeature/` (всю директорию)

### Тестирование

Для тестирования авторизации нужен:
- Рабочий номер телефона для получения SMS/Звонка
- Или установленный Telegram для получения кода в боте

### API Endpoints

- **Beyond Violet API**: `https://api.beyondviolet.com`
- **WFM Tasks API**: `https://dev.wfm.beyondviolet.com`

## Будущие улучшения

Согласно `.memory_bank/mobile/ios_stack.md`:

- Поддержка KMM (2025)
- Интеграция DivKit для SDUI
- Apollo GraphQL клиент
- SwiftData для локального хранения
- Unit тесты для AuthViewModel
- UI тесты для auth flow
- Локализация (English support)
- Accessibility
- Dark mode адаптация
