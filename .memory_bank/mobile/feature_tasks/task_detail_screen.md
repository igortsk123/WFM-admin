# Экран деталей задачи (TaskDetail)

## Назначение

Экран показывает полную информацию о конкретной задаче и позволяет работнику управлять её состоянием: начать, приостановить, продолжить или завершить задачу.

Это ключевой экран для выполнения работы — здесь работник проводит большую часть времени, контролируя прогресс текущей задачи и переключаясь между состояниями.

**Путь навигации:**
- Открывается по тапу на карточку задачи в списке (TasksList)
- Возврат назад: кнопка "назад" в NavigationBar

---

## Структура экрана

### 1. NavigationBar

**iOS:** NavigationBar с кнопкой "назад" (`WFMIcons.arrowLeft`) и заголовком — название задачи.

**Android:** TopAppBar с кнопкой "назад" (иконка `ic_back`) и заголовком — название задачи.

### 2. Task Info Section (белый фон, `surfaceSecondary`)

**Содержимое:**

- **Зона + Категория** (если есть):
  - "Зона: {название зоны}" (Body14Medium, textTertiary + textPrimary)
  - "Категория: {название категории}" (Body14Medium, textTertiary + textPrimary)
  - Gap между строками: 4px

- **Период и прогресс** (для всех состояний кроме COMPLETED):
  - Label "Период" (Body14Medium, textTertiary)
  - Иконка часов (`ic-time`, 12×12) + текст времени:
    - NEW: "{planned_minutes} минут"
    - IN_PROGRESS / PAUSED: "Осталось {remaining_minutes} минут"
  - **WFMProgressBar / WfmProgressBar** (показывает прогресс выполнения):
    - `type = solid` (сплошная полоска)
    - `state = normal` (обычная фиолетовая) или `state = paused` (заштрихованная) — для PAUSED
    - `showText = false`

- **Для COMPLETED:**
  - Прогресс-бар не отображается
  - Если `reviewState == onReview`: показывается "Задача отправлена на проверку" (Body14Medium, textPrimary)
  - Иначе: показывается "Задача завершена" (Body14Medium, textSecondary)

**Поведение прогресса:**
- Прогресс рассчитывается на основе `historyBrief.duration` (секунды) и `plannedMinutes`
- Для **IN_PROGRESS**: каждую секунду пересчитывается с учётом времени с последнего обновления (`timeStateUpdated`)
- **Таймер**: в состоянии IN_PROGRESS запускается таймер (обновление каждую секунду), который автоматически обновляет прогресс и оставшееся время в UI

### 3. WFMTabBar / WfmTabBar (фон `surfaceSecondary`)

Переключатель между двумя разделами:
- Вкладка 0: **Подзадачи**
- Вкладка 1: **Подсказки**

Компонент `WFMTabBar` (iOS) / `WfmTabBar` (Android). Описание: `ui/design_system_components.md`.

### 4. Content Area (прокручиваемая, фон `surfaceBase`)

#### Info Cards (вне табов, поверх контента)

Показываются независимо от активного таба, если есть соответствующие данные.

**Info Card** (синяя, `cardSurfaceInfo`):
- Показывается **только если** у задачи есть `comment`
- Иконка `ic-info-fill` (24×24) + текст (Body14Regular)
- Padding: 12px horizontal, 16px vertical; radius `xl` (16px)

**Review Comment Card** (красная, `cardSurfaceError`):
- Показывается **только если** у задачи есть `reviewComment`
- Иконка `ic-info-error` (24×24) + текст (Body14Regular)
- Padding: 12px horizontal, 16px vertical; radius `xl` (16px)

#### Таб 0: Подзадачи

Список операций задачи. Поведение зависит от `task.workType?.allowNewOperations`:

**Обычный режим (`allowNewOperations == false` или `nil`):**
- Показывается весь список `task.operations` с чекбоксами (тап = toggle)
- Если `operations` пустой — текст "Операции не указаны" (`textTertiary`)
- Компонент: `WFMSelectionCard(type: .select)` / `WfmSelectionCard(type = SELECT)`

**Режим новых операций (`allowNewOperations == true`):**
- Показываются только выбранные операции (id в `selectedOperationIds`) — checked-карточки, тап = убрать
- Показываются `newOperations` (пользовательские строки) — checked-карточки, тап = удалить
- В конце — кнопка "Добавить подзадачу" (`AddOperationButton`)

**AddOperationButton** (локальный компонент экрана):
- Текст: "Добавить подзадачу" (`Headline14Medium`, `textBrand`) + иконка `ic-plus` (24×24, `iconBrand`) справа
- Фон: `surfaceSecondary`, radius 16px
- Border: 1px dashed, цвет `WFMPrimitiveColors.brand200` / `WfmColors.Brand200` (#b398f9)
- Padding: `M` (12px) со всех сторон
- Тап → открывает `SelectOperationsBottomSheet` (выбор из существующих + кнопка "Создать новую" → `CreateOperationBottomSheet`)

**Persistence (UserDefaults / SharedPreferences):**
- Выбранные id хранятся под ключом `wfm_op_sel_{taskId}`
- Новые операции (строки) хранятся под ключом `wfm_op_new_{taskId}`
- Prefs-файл Android: `"wfm_operations"`
- При входе на экран: сначала читаем prefers; если пусто — используем `task.completedOperationIds` с сервера, **фильтруя только те id, которые присутствуют в `task.operations`** (защита от устаревших/удалённых операций)
- Флаг `isSelectionInitialized` предотвращает перезапись при повторных загрузках
- При успешном complete — ключи очищаются

**Важно: `operations` возвращается из start/pause/resume:**
- Backend эндпоинты `POST /{id}/start`, `/pause`, `/resume` вызывают `_populate_task_operations` и возвращают полный список операций вместе с задачей (так же как `GET /{id}`)

**Кэш обновляется после каждой смены статуса:**
- `TasksService` методы `startTask`, `pauseTask`, `resumeTask`, `completeTask`, `completeTaskWithPhoto` вызывают `apiClient.updateCache("/tasks/{id}", task)` после успешного ответа
- При повторном входе на экран кэш сразу отдаёт актуальное состояние задачи без мигания старых данных
- Подробнее: `.memory_bank/mobile/architecture/caching.md` → раздел "Ручная запись в кэш"

#### Таб 1: Подсказки

**Заголовок:** иконка `ic-ai-help` (16×16) + "Советы от ИИ" (`Headline14Bold`, `textPrimary`)

**Состояния:**
- Загрузка (`isLoadingHints`): ProgressView / CircularProgressIndicator
- Загружено: список `HintCard` — Body14Regular, `textPrimary`, фон `surfaceSecondary`, border `cardBorderSecondary`, radius `xl`

**Загрузка подсказок:**
- `GET /tasks/hints?work_type_id=X&zone_id=Y` (stale-while-revalidate)
- Параметры из `task.workType?.id` и `task.zone?.id`
- Загружается **параллельно** с задачей при входе на экран и pull-to-refresh

### 5. Actions Section (fixed at bottom, белый фон `surfaceSecondary`)

Кнопки действий зависят от состояния задачи:

| Состояние | Кнопки |
|-----------|--------|
| **NEW** | "Начать" (WFMPrimaryButton / WfmPrimaryButton, на всю ширину) |
| **IN_PROGRESS** | "На паузу" (WFMSecondaryButton с иконкой `ic-pause`) + "Завершить" (WFMPrimaryButton) — в ряд, 50/50 ширины |
| **PAUSED** | "Продолжить" (WFMSecondaryButton с иконкой `ic-play`) + "Завершить" (WFMPrimaryButton) — в ряд, 50/50 ширины |
| **COMPLETED** (onReview) | Нет кнопок |
| **COMPLETED** (rejected → вернулся в PAUSED) | Кнопки PAUSED отображаются |

**Размер кнопок:** iOS — `.medium` (44pt), Android — `Medium` (44dp) для вторичных кнопок, 48dp для первичной.

---

## Управление состояниями задачи

### Доступные переходы

Согласно state machine из `.memory_bank/domain/task_states.md`:

- **NEW → IN_PROGRESS**: Начать задачу
- **IN_PROGRESS → PAUSED**: Приостановить задачу
- **PAUSED → IN_PROGRESS**: Возобновить задачу
- **IN_PROGRESS → COMPLETED**: Завершить задачу
- **PAUSED → COMPLETED**: Завершить задачу

### Подтверждение завершения

При нажатии "Завершить" показывается **Bottom Sheet с подтверждением**:

**Содержимое:**
- Заголовок: "Завершить задачу?" (Headline20Bold, textPrimary, center)
- Две кнопки в ряд (50/50):
  - "Отменить" (WFMSecondaryButton / WfmSecondaryButton, `.big` / `Big`)
  - "Завершить" (WFMPrimaryButton / WfmPrimaryButton)

**Поведение:**
- `showOverlay = true` (модальное действие)
- При нажатии "Завершить" → отправляется `POST /tasks/{id}/complete` (multipart/form-data)
  - Передаются `operation_ids` (JSON-строка `"[1,2,3]"`) и `new_operations` (JSON-строка `"[\"Название\"]"`) из текущего выбора
  - После успешного complete → ключи операций в UserDefaults/SharedPreferences очищаются
- Если успешно → задача переходит в COMPLETED, экран закрывается (возврат к списку)

---

## Обработка ошибок

### CONFLICT — "У сотрудника уже есть активная задача"

**Когда возникает:**
- Работник пытается начать (NEW → IN_PROGRESS) или продолжить (PAUSED → IN_PROGRESS) задачу
- На сервере у работника уже есть активная задача в состоянии IN_PROGRESS

**Ответ сервера:**
```json
{
  "status": {
    "code": "CONFLICT",
    "message": "У сотрудника уже есть активная задача: <uuid>"
  }
}
```

**Поведение:**
- Вместо toast с ошибкой показывается **Bottom Sheet** (`ActiveTaskConflictBottomSheet`)
- Дизайн: https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=3519-17575

**Содержимое Bottom Sheet:**
- Заголовок: "Вы не можете выполнять две задачи одновременно" (Headline20Bold, textPrimary, center)
- Описание: "Чтобы начать следующую задачу завершите или приостановите текущую" (Body16Regular, textPrimary, center)
- Кнопка:
  - Если сервер вернул UUID активной задачи: "Перейти к активной задаче" (переход к TaskDetail активной задачи)
  - Если UUID не удалось извлечь: "Понятно" (просто закрыть bottom sheet)

**Поведение:**
- `showOverlay = true`
- Извлекается UUID активной задачи из сообщения через `activeTaskId`:
  - **iOS:** `error.activeTaskId`
  - **Android:** `response.activeTaskId`
- При нажатии "Перейти к активной задаче" → навигация к `TaskDetail(activeTaskId)`
- Создаётся правильный back stack: `TasksList → TaskDetail(A) → TaskDetail(B)` — кнопка "назад" возвращает к первой задаче

**Логика проверки:**
- **Android:** `if (response.code == "CONFLICT")` → извлечь `activeTaskId`, показать bottom sheet с callback навигации
- **iOS:** `if (error.isError(.conflict))` → извлечь `activeTaskId`, показать bottom sheet с router для навигации

### Другие ошибки

Все остальные ошибки (сеть, 500, валидация и т.д.) показываются через **Toast** (WfmToast / WFMToast) с типом `error`.

---

## Особенности UX

### Pull-to-Refresh

**Доступно на всех платформах** — обновление данных задачи свайпом вниз.

**Поведение:**
- Параллельно: `GET /tasks/{id}` + `GET /tasks/hints?work_type_id=X&zone_id=Y`
- Обновляются все поля задачи (state, historyBrief, comment, reviewComment, operations, completedOperationIds и т.д.)
- После получения свежих данных с сервера инициализация `selectedOperationIds` из `completedOperationIds` — только если UserDefaults/SharedPreferences пустые и `isSelectionInitialized = false`
- **iOS:** индикатор загрузки показывается SwiftUI автоматически (через `.refreshable`)
- **Android:** индикатор загрузки показывается через `PullToRefreshBox`

**Важно:** Pull-to-Refresh НЕ меняет `isLoading` флаг в ViewModel — это отдельный поток обновления.

### Автообновление прогресса

**Только для IN_PROGRESS:**
- Каждую секунду пересчитывается прогресс и оставшееся время
- Используется `historyBrief.duration` + время с последнего `timeStateUpdated`

**Реализация:**
- **iOS:** `Timer.scheduledTimer` с интервалом 1.0 секунда, обновляет `@Published timerTick`
- **Android:** `LaunchedEffect(task.state)` с `kotlinx.coroutines.delay(1000)`, обновляет `timerTick` state

**Остановка таймера:**
- Автоматически при переходе из IN_PROGRESS в другое состояние (PAUSED, COMPLETED)
- При выходе из экрана (deinit / onDispose)

### Loading State

**Первая загрузка задачи:**
- При открытии экрана показывается `CircularProgressIndicator` / `ProgressView` по центру экрана
- Задача и подсказки загружаются **параллельно** (`async let` iOS / coroutines Android)
- `isLoadingHints` — отдельный флаг; пока `true` — в табе "Подсказки" показывается ProgressView

**Processing State:**
- При выполнении действий (start, pause, resume, complete) показывается overlay с loader
- Контент под оверлеем остаётся видимым (не мигает)

**Восстановление после ошибки:**
- Если действие провалилось, экран восстанавливает предыдущее состояние из кеша (`cachedTask`)
- Пользователь видит задачу в том же состоянии, что и до попытки действия

---

## Бизнес-правила

### Ограничение: одна активная задача на работника

**Правило:** Работник может иметь только одну задачу в состоянии IN_PROGRESS одновременно.

**Проверка:**
- Сервер блокирует переходы NEW → IN_PROGRESS и PAUSED → IN_PROGRESS, если у работника уже есть активная задача
- Клиент показывает bottom sheet с объяснением (см. раздел "CONFLICT")

### Операции при завершении задачи

При нажатии "Завершить":
- Если `operations` не пустой — `operation_ids` из `selectedOperationIds` передаётся в `POST /{id}/complete`
- Если `allowNewOperations == true` — `new_operations` из `newOperations` тоже передаётся
- Сервер записывает выполненные операции и создаёт PENDING-операции для новых
- После успешного complete — сохранённые prefers для этой задачи очищаются

**Валидация при `allowNewOperations == true`:**
- Если ни одна операция не выбрана (ни из списка, ни пользовательских) → кнопка "Завершить" **не открывает подтверждение**, а открывает `SelectOperationsBottomSheet`
- Пользователь выбирает хотя бы одну операцию → возвращается на экран → повторный клик "Завершить" → стандартное подтверждение
- Реализовано на уровне View (не ViewModel): проверка `allowNewOperations && selectedOperationIds.isEmpty && newOperations.isEmpty`

**Флаг `allow_new_operations`** (в `work_types`) управляется управляющим через API; клиент только читает.

### Типы задач и отчёты

**PLANNED (плановая):**
- Создаётся по расписанию, назначается работнику или по привилегии
- Отчёт (`report_text`, `report_images`) опционален при завершении

**ADDITIONAL (дополнительная):**
- Создаётся вручную управляющим
- Отчёт **обязателен** — работник должен добавить текст или фото при завершении

**Важно:** На экране TaskDetail **не реализован** ввод отчётов — это MVP версия. В будущем при завершении ADDITIONAL задачи будет запрашиваться текст/фото.

### Проверка и подтверждение задач

После завершения (COMPLETED) задачи:
- Управляющий проверяет результаты (на другом экране, не в TaskDetail)
- Управляющий может **подтвердить** (`POST /{id}/approve`) или **отклонить** (`POST /{id}/reject`) задачу
- При отклонении задача возвращается в **PAUSED** с указанием `reviewComment`
- Работник видит красную карточку с комментарием управляющего и может исправить работу, затем завершить заново

**На экране TaskDetail:**
- Работник видит Review Comment Card (красная), если задача была отклонена
- Может продолжить задачу (PAUSED → IN_PROGRESS) и завершить заново

---

## Навигация и жизненный цикл

**Вход на экран:**
- Из списка задач (TasksList) по тапу на карточку
- Передаётся `taskId` (UUID)
- При открытии экрана автоматически загружается задача (`GET /tasks/{id}`)

**Выход с экрана:**
- Кнопка "назад" → возврат к списку задач
- После успешного завершения задачи (COMPLETED) → автоматический возврат к списку

**TaskEventBroadcaster (iOS) / TaskEventBus (Android):**
- При любом изменении состояния задачи на экране отправляется событие `taskUpdated`
- Это позволяет списку задач (TasksList) автоматически обновить карточку без дополнительных запросов

---

## Файлы реализации

### iOS
- **Screen:** `mobile/ios/WFMApp/Features/TasksFeature/Views/TaskDetailView.swift`
- **ViewModel:** `mobile/ios/WFMApp/Features/TasksFeature/ViewModels/TaskDetailViewModel.swift`
- **Bottom Sheet (Conflict):** `mobile/ios/WFMApp/Features/TasksFeature/Views/ActiveTaskConflictBottomSheet.swift`
- **Bottom Sheet (Select Operations):** `mobile/ios/WFMApp/Features/TasksFeature/Views/SelectOperationsBottomSheet.swift`
- **Bottom Sheet (Create Operation):** `mobile/ios/WFMApp/Features/TasksFeature/Views/CreateOperationBottomSheet.swift`

### Android
- **Screen:** `mobile/android/app/src/main/java/com/beyondviolet/wfm/features/tasks/presentation/ui/TaskDetailsScreen.kt`
- **ViewModel:** `mobile/android/app/src/main/java/com/beyondviolet/wfm/features/tasks/presentation/viewmodels/TaskDetailsViewModel.kt`
- **Bottom Sheet (Conflict):** `mobile/android/app/src/main/java/com/beyondviolet/wfm/features/tasks/presentation/ui/ActiveTaskConflictBottomSheet.kt`
- **Bottom Sheet (Select Operations):** `mobile/android/app/src/main/java/com/beyondviolet/wfm/features/tasks/presentation/ui/SelectOperationsBottomSheet.kt`
- **Bottom Sheet (Create Operation):** `mobile/android/app/src/main/java/com/beyondviolet/wfm/features/tasks/presentation/ui/CreateOperationBottomSheet.kt`

---

## Связанные документы

- Модель задач: `.memory_bank/domain/task_model.md`
- State machine: `.memory_bank/domain/task_states.md`
- API задач: `.memory_bank/backend/api_tasks.md`
- UI паттерны: `.memory_bank/mobile/ui/ui_patterns.md`
- Дизайн-система: `.memory_bank/mobile/ui/design_system_components.md`
