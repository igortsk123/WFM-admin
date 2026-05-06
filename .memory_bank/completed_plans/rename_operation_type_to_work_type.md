# План: Переименование operation_type → work_type

**Статус:** Выполнено
**Создан:** 2026-03-06
**Последнее обновление:** 2026-03-06

---

## Цель

Переименовать концепцию `operation_type` в `work_type` во всём проекте:
- База данных: таблица `operation_types` → `work_types`, столбец `operation_type_id` → `work_type_id`
- Backend API: поля, схемы, эндпоинты
- iOS: модели, расширения, UI
- Android: модели, расширения, UI
- Документация: Memory Bank, CLAUDE.md

## Затронутые файлы

### Документация
- `.memory_bank/domain/task_model.md`
- `.memory_bank/backend/apis/api_tasks.md`
- `.memory_bank/backend/services/svc_tasks.md`
- `.memory_bank/mobile/feature_tasks/feature_tasks_screens.md`
- `CLAUDE.md`

### Backend
- `backend/svc_tasks/app/domain/models.py`
- `backend/svc_tasks/app/domain/schemas.py`
- `backend/svc_tasks/app/api/references.py`
- `backend/svc_tasks/app/repositories/task_repository.py`
- `backend/svc_tasks/app/services/lama_service.py`
- `backend/svc_tasks/alembic/versions/` — новая миграция

### iOS
- `mobile/ios/WFMApp/Core/Models/TaskModel.swift`
- `mobile/ios/WFMApp/Core/Models/Task+Display.swift`
- `mobile/ios/WFMApp/Features/TasksFeature/Views/TaskCardView.swift`
- `mobile/ios/WFMApp/Features/TasksFeature/Views/TaskDetailView.swift` (если есть)

### Android
- `mobile/android/app/src/main/java/com/beyondviolet/wfm/core/models/Task.kt`
- `mobile/android/app/src/main/java/com/beyondviolet/wfm/core/models/TaskExtensions.kt`
- `mobile/android/app/src/main/java/com/beyondviolet/wfm/features/tasks/presentation/ui/components/TaskCardView.kt`
- `mobile/android/app/src/main/java/com/beyondviolet/wfm/features/tasks/presentation/ui/TaskDetailsScreen.kt`

---

## Задачи

### 1. Документация

- [x]`task_model.md` — переименовать `operation_type` → `work_type`, `operation_type_id` → `work_type_id`, `OperationType` → `WorkType`
- [x]`api_tasks.md` — переименовать таблицу `operation_types` → `work_types`, поля, эндпоинт `/references/operation-types` → `/references/work-types`
- [x]`svc_tasks.md` — обновить упоминания
- [x]`feature_tasks_screens.md` — обновить упоминания
- [x]`CLAUDE.md` — обновить упоминания в разделе API Endpoints и доменной модели

### 2. Backend — новая миграция

- [x]Создать миграцию `013_rename_operation_type_to_work_type.py`:
  - Переименовать таблицу `operation_types` → `work_types`
  - Переименовать столбец `tasks.operation_type_id` → `tasks.work_type_id`
  - Переименовать столбец `operations.operation_type_id` → `operations.work_type_id`
  - Обновить FK constraints и индексы

### 3. Backend — код

- [x]`models.py`:
  - Класс `OperationType` → `WorkType`
  - `__tablename__ = "operation_types"` → `"work_types"`
  - Отношение в Task: `operation_type = relationship(...)` → `work_type = relationship(...)`
  - Поле в Task: `operation_type_id` → `work_type_id`
  - Поле в Operation: `operation_type_id` → `work_type_id`

- [x]`schemas.py`:
  - `OperationTypeResponse` → `WorkTypeResponse`
  - `OperationTypeListData` → `WorkTypeListData`
  - В TaskCreate/TaskUpdate: `operation_type_id` → `work_type_id`
  - В TaskResponse: `operation_type_id` → `work_type_id`, `operation_type` → `work_type`

- [x]`references.py`:
  - Эндпоинт `GET /references/operation-types` → `GET /references/work-types`
  - Обновить импорты и логику запроса

- [x]`task_repository.py`:
  - `operation_type_id` → `work_type_id` при создании задачи

- [x]`lama_service.py`:
  - Обновить все упоминания `operation_type` → `work_type`

### 4. iOS

- [x]`TaskModel.swift`:
  - Структура `OperationType` → `WorkType`
  - Свойство `operationTypeId` → `workTypeId`
  - Свойство `operationType` → `workType`
  - CodingKeys: `"operation_type_id"` → `"work_type_id"`, `"operation_type"` → `"work_type"`
  - Параметры инициализатора

- [x]`Task+Display.swift`:
  - Использование `operationType` → `workType`, `operationTypeId` → `workTypeId`

- [x]`TaskCardView.swift`:
  - Preview данные: `operationTypeId` → `workTypeId`, `OperationType(...)` → `WorkType(...)`

- [x]Прочие файлы с упоминаниями (TaskDetailView и др.)

### 5. Android

- [x]`Task.kt`:
  - Data class `OperationType` → `WorkType`
  - `@SerialName("operation_type_id") val operationTypeId` → `@SerialName("work_type_id") val workTypeId`
  - `@SerialName("operation_type") val operationType` → `@SerialName("work_type") val workType`

- [x]`TaskExtensions.kt`:
  - Использование `operationType` → `workType`, `operationTypeId` → `workTypeId`

- [x]`TaskCardView.kt`:
  - Preview данные: `operationTypeId` → `workTypeId`, `OperationType(...)` → `WorkType(...)`

- [x]`TaskDetailsScreen.kt`:
  - Обновить упоминания

---

## Порядок выполнения

1. Документация (Memory Bank) — сначала, чтобы зафиксировать контракт
2. Backend миграция — изменить схему БД
3. Backend код — синхронизировать с новой схемой
4. iOS — обновить модели и UI
5. Android — обновить модели и UI

---

## Лог выполнения

### 2026-03-06

- Создан план на основе полного анализа кодовой базы (83+ упоминания в 21 файле)
- Реализовано: миграция 013, backend (models, schemas, references, repository, lama_service), iOS (TaskModel, Task+Display, TaskCardView), Android (Task, TaskExtensions, TaskCardView, TaskDetailsScreen), документация (task_model.md, api_tasks.md, MEMORY.md)
