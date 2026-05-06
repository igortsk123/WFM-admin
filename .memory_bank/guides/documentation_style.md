# Стиль написания документации Memory Bank

Правила и принципы написания документации для `.memory_bank/` (mobile, backend, domain).

---

## Основные принципы

**Цель документации:** Быстро донести суть концепции, архитектурного решения или паттерна без лишних деталей.

**Аудитория:**
- Разработчики, которым нужно быстро понять концепцию
- AI-агенты (Claude Code), которые используют документацию как источник правды
- Новые члены команды, изучающие проект

**Ключевое правило:** Документация должна объяснять **что и почему**, а не **как именно реализовано**.

**Применимость:**
- **Mobile/Domain:** строгие правила — минимум кода, максимум концепций
- **Backend/API:** мягче — примеры запросов/ответов допустимы и полезны (см. раздел "Особенности для Backend")

---

## ✅ DO: Что включать

### 1. Концептуальное описание

Объясняйте суть решения словами, используя специальные термины:

**Хорошо:**
```
**Паттерн:** LaunchedEffect(uiState) + callback навигации

**Ключевые правила:**
- Навигация не вызывается напрямую из ViewModel (anti-pattern)
- Composable функция слушает uiState через LaunchedEffect
- При изменении состояния вызывается callback
```

**Плохо:**
```kotlin
// Вот как это делается:
@Composable
fun PhoneInputScreen(
    viewModel: AuthViewModel,
    onCodeSent: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState) {
        when (uiState) {
            is AuthUiState.CodeSent -> onCodeSent()
            // ...
        }
    }
    // ...
}
```

### 2. Ссылки на файлы реализации

Указывайте пути к файлам, где находится реализация:

**Хорошо:**
```
**Файлы:**
- iOS: `WFMApp/Features/MainFlow/ManagerTabView.swift`
- Android: `features/main/ManagerMainTabScreen.kt`
```

### 3. Ссылки на связанные документы

Указывайте другие документы для контекста:

**Хорошо:**
```
**Связанные документы:**
- `.memory_bank/domain/user_roles.md` — роли и привилегии
- `.memory_bank/mobile/feature_managertasks/manager_tasks_screens.md`
```

### 4. Таблицы сравнений (минимальные)

Используйте таблицы **только для ключевых отличий**. Таблица не должна быть большой.

**Хорошо (3-5 строк максимум):**
```
| Аспект | iOS | Android |
|--------|-----|---------|
| Роутер | AppRouter | NavController |
| Маршруты | Route enum | Screen sealed class |
| Реактивность | .onChange(of:) | LaunchedEffect(key) |
```

**Плохо (слишком много строк):**
```
| Аспект | iOS | Android |
|--------|-----|---------|
| Библиотека | SwiftUI NavigationStack | Jetpack Navigation Compose |
| Роутер | AppRouter (ObservableObject) | NavController |
| Маршруты | Route enum (Hashable) | Screen sealed class |
| Стек навигации | NavigationPath | NavBackStackEntry |
| Shared ViewModel | @StateObject в parent view | ViewModelStoreOwner |
| Реактивность | .onChange(of: uiState) | LaunchedEffect(uiState) |
| Защита от дублирования | Флаг navigationHandled | Ключ LaunchedEffect |
| Вложенные графы | Вложенные NavigationStack | navigation { } блок |
| Type-safety | Enum с associated values | Sealed class с параметрами |
| Очистка стека | path = NavigationPath() | popUpTo(route) { inclusive = true } |
```

**Правило:** Если таблица больше 5 строк — разбейте на несколько маленьких или опишите текстом.

### 5. Краткие списки

Используйте bullet points для перечислений:

**Хорошо:**
```
**Преимущества:**
- Единый источник правды для навигации
- Автоматическая обработка Back button
- Type-safe маршруты
```

### 6. Минимальные структурные диаграммы

Если нужно показать иерархию — используйте простой текст:

**Хорошо:**
```
**Основная структура маршрутов:**
- Auth flow: PhoneInput → CodeInput → Registration
- Main flow (работник): Home, Tasks, Settings, TaskDetail
- Manager flow (управляющий): ManagerHome, ManagerTasks
```

**Плохо (избегайте ASCII-графику):**
```
┌─────────────────────────────────────────┐
│         AppNavigation (root)            │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │   Auth (nested navigation)        │  │
│  │  PhoneInput ──┬──> CodeInput      │  │
│  │               └──> Registration   │  │
└─────────────────────────────────────────┘
```

---

## ❌ DON'T: Что НЕ включать

### 1. Длинные примеры кода

**Проблема:** Код быстро устаревает, занимает много места, дублирует реальную реализацию.

**Вместо этого:** Укажите путь к файлу и опишите словами концепцию.

**Плохо:**
```swift
@MainActor
final class AppRouter: ObservableObject {
    @Published var authPath = NavigationPath()
    @Published var mainPath = NavigationPath()
    @Published var isAuthenticated = false
    @Published var isCheckingAuth = true

    private let tokenStorage: TokenStorage

    init(tokenStorage: TokenStorage) {
        self.tokenStorage = tokenStorage
    }

    func navigateToCodeInput() {
        authPath.append(Route.codeInput)
    }
    // ... ещё 20 строк кода
}
```

**Хорошо:**
```
**AppRouter** — централизованное управление навигацией

**Публичные свойства:**
- @Published var authPath: NavigationPath — стек для Auth flow
- @Published var mainPath: NavigationPath — стек для Main flow
- @Published var isAuthenticated: Bool — состояние авторизации

**Файл:** `Core/Navigation/AppRouter.swift`
```

### 2. ASCII-зарисовки экранов

**Проблема:** Занимают много места, сложны в поддержке, не дают точной информации.

**Вместо этого:** Ссылка на Figma node ID или краткое описание структуры.

**Плохо:**
```
┌─────────────────────────┐
│  ┌─────┐  Привет, Иван │
│  │ IMG │  Четверг, 6...│
│  └─────┘                │
├─────────────────────────┤
│ Задачи на проверку  Все│
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ Выкладка товара     │ │
│ │ Иван Иванов         │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

**Хорошо:**
```
**Структура экрана:**
1. Шапка с профилем (ProfileHeader — фиксированная)
2. Прокручиваемый контент:
   - Секция "Задачи на проверку" (если есть задачи)

**Дизайн из Figma:** Node ID `3580-11835`
```

### 3. Полные определения структур данных

**Проблема:** Дублирование кода, сложность синхронизации с реальной реализацией.

**Вместо этого:** Краткий список полей с описанием назначения.

**Плохо:**
```swift
struct TaskFilterItem: Identifiable, Equatable {
    let id: String
    let title: String
    var isSelected: Bool
    var isEnabled: Bool = true

    init(id: String, title: String, isSelected: Bool = false) {
        self.id = id
        self.title = title
        self.isSelected = isSelected
    }
}
```

**Хорошо:**
```
**Модель элемента фильтра:**
- iOS: `struct TaskFilterItem: Identifiable, Equatable`
- Android: `data class TaskFilterItem`
- Поля: `id: String`, `title: String`, `isSelected: Bool/Boolean`, `isEnabled: Bool/Boolean`
```

### 4. Пошаговые инструкции "как написать код"

**Проблема:** Документация превращается в tutorial, быстро устаревает.

**Вместо этого:** Описание концепции и ссылки на файлы.

**Плохо:**
```
Шаг 1: Создайте файл AppRouter.swift
Шаг 2: Импортируйте SwiftUI
Шаг 3: Создайте класс с @MainActor
Шаг 4: Добавьте @Published переменные
Шаг 5: Реализуйте метод navigateToCodeInput()
```

**Хорошо:**
```
**AppRouter** управляет навигацией через централизованные методы.
Каждый flow (auth, main) имеет свой NavigationPath.

**Файл:** `Core/Navigation/AppRouter.swift`
```

### 5. Раздел "Чеклист перед коммитом"

**Проблема:** Это процесс разработки, не архитектурная документация.

**Вместо этого:** Вынести чеклисты в отдельные гайды (если нужны) или в CI/CD документацию.

### 6. Раздел "Примеры использования" с десятками строк кода

**Проблема:** Быстро устаревает, дублирует реальные файлы.

**Вместо этого:** Один-два концептуальных примера (максимум 3-5 строк) или ссылка на тесты.

**Хорошо (минимальный пример):**
```
**Навигация:**
- Определение: `case taskDetail(taskId: String)`
- Вызов: `router.navigateToTaskDetail(taskId: task.id.uuidString)`
```

---

## Структура документа

### Рекомендуемая структура

```markdown
# Название — краткое описание

Одно-два предложения о том, что описывает документ.

**Связанные документы:** (если есть)
- `.memory_bank/...`

---

## Обзор / Цель / Назначение

Зачем это нужно, какую проблему решает.

---

## Концепция / Паттерн / Архитектура

Описание подхода, принципов, терминов.

**Файлы:**
- iOS: путь к файлу
- Android: путь к файлу

---

## Ключевые особенности / Правила

Важные моменты, которые нужно знать.

---

## Платформенные отличия (если есть)

| Аспект | iOS | Android |
|--------|-----|---------|
| ...    | ... | ...     |

---

## Связанные документы

- `.memory_bank/...`
- `.memory_bank/...`
```

### Что опускаем

- Секцию "Примеры кода" (если только не 1-2 концептуальных примера по 3-5 строк)
- Секцию "Файлы реализации" (указываем файлы в начале каждой секции)
- Секцию "Чеклист перед коммитом"
- Секцию "Детальная структура компонента" с полными определениями классов
- ASCII-диаграммы (кроме простейших текстовых списков)

---

## Когда можно использовать примеры кода

### Допустимо: Минимальные концептуальные примеры

Если нужно показать **синтаксис специфичного API** или **паттерн**, который сложно объяснить словами:

**Хорошо (3-5 строк):**
```
**Вызов:**
- iOS: `.navigationDestination(isPresented: $showFilter) { ... }`
- Android: `LaunchedEffect(showFilter) { if (showFilter) navigate() }`
```

### Недопустимо: Полные реализации

Не копируйте весь класс, компонент или экран в документацию.

---

## Особенности для Backend / API документации

**Для Backend и API контрактов правила мягче** — примеры запросов/ответов часто полезны и нужны.

### Допустимо для API документации

**✅ Примеры запросов и ответов:**
```
**POST /tasks/{id}/complete**

Request (multipart/form-data):
- report_text: string (optional)
- report_image: file (optional, required if task.requires_photo = true)

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "state": "COMPLETED",
    "review_state": "ON_REVIEW"
  }
}
```

**✅ Форматы данных и структуры JSON:**
```
**Task model:**
{
  "id": "uuid",
  "title": "string",
  "state": "NEW | IN_PROGRESS | PAUSED | COMPLETED",
  "assignee_id": "integer | null",
  "planned_minutes": "integer"
}
```

**✅ Примеры ошибок:**
```
Response 409 Conflict (недопустимый переход):
{
  "success": false,
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Cannot transition from COMPLETED to IN_PROGRESS"
  }
}
```

### Что НЕ включать даже для Backend

**❌ Полные реализации функций:**
- Не копируйте весь код endpoint handler из FastAPI
- Не дублируйте полностью Pydantic модели
- Вместо этого: укажите путь к файлу + описание логики

**❌ SQL запросы и миграции:**
- Не вставляйте полные SQL запросы (если только это не критичный пример)
- Ссылайтесь на файлы миграций

**Правило для Backend:** Примеры API запросов/ответов — да, полный код реализации — нет.

---

## Примеры хорошей документации

Посмотрите на эти файлы как reference:

**Mobile:**
- `.memory_bank/mobile/architecture/navigation.md` — описание навигации без кода
- `.memory_bank/mobile/ui/design_system_components.md` — компоненты без реализации

**Backend:**
- `.memory_bank/backend/api_tasks.md` — API endpoints с примерами запросов/ответов
- `.memory_bank/backend/api_users.md` — API контракты

**Domain:**
- `.memory_bank/domain/user_roles.md` — доменная логика без кода
- `.memory_bank/domain/task_states.md` — state machine и правила переходов

---

## Как проверить качество документа

**Задайте себе вопросы:**
1. Можно ли понять концепцию без чтения кода?
2. Указаны ли ссылки на файлы реализации?
3. Есть ли ссылки на связанные документы?
4. Нет ли дублирования реального кода?
5. Документ короче 300 строк? (если длиннее — скорее всего слишком много примеров)

**Правило для Mobile/Domain:** Если в документе больше кода, чем текста — что-то не так.

**Правило для Backend:** Примеры API запросов/ответов допустимы, но без полного кода реализации.

---

## Язык и стиль

**Язык:** Русский (см. `.memory_bank/guides/lang.md`)

**Стиль:**
- Короткие предложения
- Bullet points вместо больших абзацев
- Технические термины на английском (NavigationPath, ViewModel, ObservableObject)
- Избегайте лишних вводных слов ("как вы можете видеть", "давайте рассмотрим")

---

## Итог

**Документация Memory Bank — это справочник концепций, не tutorial.**

### Общие правила (Mobile, Domain)

✅ Концепции, термины, паттерны
✅ Ссылки на файлы и связанные документы
✅ Таблицы сравнений (до 5 строк)
✅ Краткие списки

❌ Длинные примеры кода (больше 5 строк)
❌ ASCII-зарисовки экранов
❌ Полные реализации классов
❌ Пошаговые инструкции

### Особенности для Backend

✅ Примеры API запросов/ответов
✅ Форматы JSON и структуры данных
✅ Примеры ошибок

❌ Полный код endpoint handlers
❌ Полные Pydantic модели (только описание полей)
❌ SQL запросы (ссылка на миграции вместо этого)
