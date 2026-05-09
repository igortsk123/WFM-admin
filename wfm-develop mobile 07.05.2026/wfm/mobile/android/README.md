# WFM Android App

Android приложение для системы управления рабочей силой (Workforce Management), построенное на основе спецификаций Memory Bank.

## Требования

- Android 7.0+ (API 24)
- Android Studio Ladybug (2024.3.1) или новее
- JDK 17
- Kotlin 2.1.0

## Архитектура

Проект следует рекомендациям из `.memory_bank/mobile/android_stack.md`:

- **UI Framework**: Jetpack Compose
- **Architecture**: MVVM + Clean Architecture
- **Dependency Injection**: Koin 4.0.0
- **Networking**: Ktor 3.0.2 с корутинами
- **Serialization**: Kotlinx Serialization
- **Concurrency**: Kotlin Coroutines + Flow

## Структура проекта

```
app/src/main/java/com/wfm/
├── core/
│   ├── models/              # Доменные модели из Memory Bank
│   │   ├── Task.kt
│   │   └── TaskState.kt
│   ├── network/             # API клиент и сервисы
│   │   ├── ApiClient.kt
│   │   └── TasksService.kt
│   ├── serialization/       # Кастомные сериализаторы
│   │   └── InstantSerializer.kt
│   └── di/                  # Dependency Injection
│       └── AppModule.kt
├── features/
│   └── tasks/               # Фича управления задачами
│       └── presentation/
│           ├── viewmodels/
│           │   └── TasksListViewModel.kt
│           └── ui/
│               └── TasksListScreen.kt
├── ui/theme/                # Material 3 тема
│   └── Theme.kt
├── WFMApplication.kt        # Точка входа
└── MainActivity.kt          # Корневая Activity
```

## Фича: TasksFeature

### Функциональность

- **Список задач**: Просмотр всех задач с фильтрацией по состоянию
- **Создание задачи**: Диалог создания новой задачи
- **Управление состояниями**: Переходы по workflow из Memory Bank
- **Pull-to-refresh**: Обновление списка задач

### Экраны и компоненты

1. **TasksListScreen** - Главный экран со списком задач
   - Фильтрация по состоянию (NEW, IN_PROGRESS, PAUSED, COMPLETED)
   - FloatingActionButton для создания задач
   - Обработка состояний Loading/Success/Error
   - Карточки задач с информацией и действиями

2. **CreateTaskDialog** - Диалог создания задачи
   - Форма с валидацией
   - Поля: title, description, planned_minutes
   - Автоматическое обновление списка после создания

3. **TaskCard** - Карточка задачи
   - Отображение: название, описание, время, состояние
   - Цветовая индикация состояния
   - Динамические кнопки действий в зависимости от состояния
   - Валидация разрешенных переходов

### Доменная модель

Модель `Task` полностью соответствует спецификации из `.memory_bank/domain/task_model.md`:

```kotlin
@Serializable
data class Task(
    val id: String,
    val title: String,
    val description: String,
    val plannedMinutes: Int,
    val creatorId: String,
    val assigneeId: String?,
    val state: TaskState,
    val createdAt: Instant,
    val updatedAt: Instant
)
```

### Состояния задачи

`TaskState` реализует state machine из `.memory_bank/domain/task_states.md`:

- **NEW** → **IN_PROGRESS** (start)
- **IN_PROGRESS** → **PAUSED** (pause)
- **PAUSED** → **IN_PROGRESS** (resume)
- **IN_PROGRESS** → **COMPLETED** (complete)

Каждое состояние содержит:
- Отображаемое имя (на русском)
- Цвет для UI
- Список разрешенных переходов
- Метод валидации `canTransitionTo()`

### API интеграция

`TasksService` реализует все endpoints из `.memory_bank/backend/api_tasks.md`:

- `GET /tasks` - Список задач с фильтрами
- `POST /tasks` - Создание задачи
- `GET /tasks/{id}` - Получение задачи
- `PATCH /tasks/{id}` - Обновление задачи
- `POST /tasks/{id}/start` - Начать задачу
- `POST /tasks/{id}/pause` - Остановить задачу
- `POST /tasks/{id}/resume` - Возобновить задачу
- `POST /tasks/{id}/complete` - Завершить задачу

## Конфигурация

API endpoint настраивается в `ApiClient`:

```kotlin
// Debug (Android emulator)
baseUrl = "http://10.0.2.2:8000"

// Release
baseUrl = "https://api.wfm.com"
```

## Запуск проекта

1. Откройте проект в Android Studio
2. Убедитесь, что бэкенд запущен (см. `backend/svc_tasks/README.md`)
3. Запустите на эмуляторе или устройстве

```bash
# Из командной строки
./gradlew assembleDebug
./gradlew installDebug

# Или напрямую запустить
./gradlew build
```

## Правила бизнес-логики

- ✅ Сотрудник может иметь только 1 активную задачу одновременно
- ✅ Валидация переходов состояний на клиенте
- ✅ Обработка HTTP 409 Conflict при недопустимых переходах
- ✅ Минимальная сложность (MVP без бонусных задач, KPI, рейтингов)

## Зависимости

Проект использует современный Android стек:

### Core
- Kotlin 2.1.0
- Kotlin Coroutines
- Kotlinx Serialization 1.7.3
- Kotlinx DateTime 0.6.1

### UI
- Jetpack Compose BOM 2024.12.01
- Material 3
- Compose Navigation 2.8.5

### Networking
- Ktor Client 3.0.2 (Core, CIO, Content Negotiation, Logging)

### DI
- Koin 4.0.0 (Android, Compose)

### Android
- AndroidX Core KTX 1.15.0
- Lifecycle Runtime KTX 2.8.7
- Activity Compose 1.9.3

## Технические решения

### Кастомная сериализация дат

Backend возвращает даты без timezone (`2025-12-04T03:28:10.555559`), поэтому используется `InstantSerializer`:

```kotlin
object InstantSerializer : KSerializer<Instant> {
    override fun deserialize(decoder: Decoder): Instant {
        val dateString = decoder.decodeString()
        val isoString = if (dateString.endsWith("Z") || dateString.contains("+")) {
            dateString
        } else {
            "${dateString}Z"
        }
        return Instant.parse(isoString)
    }
}
```

### Реактивная архитектура

ViewModels используют StateFlow для реактивного обновления UI:

```kotlin
sealed class TasksListUiState {
    data object Loading : TasksListUiState()
    data class Success(val tasks: List<Task>) : TasksListUiState()
    data class Error(val message: String) : TasksListUiState()
}

val uiState: StateFlow<TasksListUiState>
```

### Dependency Injection

Все зависимости управляются через Koin:

```kotlin
val appModule = module {
    single { ApiClient() }
    single { TasksService(get()) }
    viewModel { TasksListViewModel(get()) }
}
```

## Соответствие Memory Bank

Приложение полностью соответствует спецификациям Memory Bank:

- ✅ Доменная модель Task из `.memory_bank/domain/task_model.md`
- ✅ State Machine из `.memory_bank/domain/task_states.md`
- ✅ API контракты из `.memory_bank/backend/api_tasks.md`
- ✅ Android stack из `.memory_bank/mobile/android_stack.md`

## Реализованная функциональность

- ✅ Список задач с фильтрацией по состоянию
- ✅ Создание новых задач через диалог
- ✅ Управление состояниями задач (start, pause, resume, complete)
- ✅ Валидация переходов состояний
- ✅ Цветовая индикация состояний
- ✅ Обработка ошибок сети
- ✅ Кастомная сериализация дат

## Будущие улучшения

Согласно `.memory_bank/mobile/android_stack.md`:

- Интеграция KMM (Kotlin Multiplatform Mobile)
- DivKit для SDUI-слоя
- Room для локального хранения
- DataStore для настроек
- Offline режим с синхронизацией
- Детальный экран задачи
- Редактирование задач
- Unit и UI тесты

## Тестирование

```bash
# Unit тесты
./gradlew test

# Instrumented тесты
./gradlew connectedAndroidTest

# Lint проверка
./gradlew lint
```
