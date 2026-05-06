# План: GET /list/filters/v2 и GET /list/v2

**Статус:** Выполнено
**Создан:** 2026-04-08
**Последнее обновление:** 2026-04-08

## Цель

Добавить новые версии двух эндпоинтов с изменённой логикой. Старые версии остаются без изменений — только добавляется комментарий о максимальной поддерживаемой версии приложения.

---

## Изменение 1: GET /list/filters → /list/filters/v2

**Что меняется:**
- Новый порядок групп фильтра: `work_type_ids` → `assignee_ids` → `zone_ids`
- Добавлена новая группа `assignee_ids` с title «Сотрудники»
- Строки сотрудников в формате «Фамилия И.О.» (пример: «Карпычев П.А.»)
- Логика получения сотрудников — та же, что в `/list/users` (плановые смены на сегодня)
- `FilterItem.id` для сотрудников — `user_id` (int)

**Формат инициалов:**
```
last_name + " " + first_name[0] + "." + (middle_name[0] + "." if middle_name else "")
```
Пример: last_name="Карпычев", first_name="Пётр", middle_name="Андреевич" → «Карпычев П.А.»

---

## Изменение 2: GET /list → /list/v2

**Что меняется:**
- `zone_ids` + `work_type_ids` теперь работают как пересечение (AND)
- Задача попадает в результат только если её `zone_id` входит в `zone_ids` **и** `work_type_id` входит в `work_type_ids`
- Изменяется только SQL-условие в `TaskRepository` (добавить новый метод или параметр)

---

## Затронутые файлы

- `backend/svc_tasks/app/api/tasks.py` — новые handlers + deprecation-комментарии на старых
- `backend/svc_tasks/app/repositories/task_repository.py` — параметр пересечения для `get_all`
- `backend/svc_tasks/app/domain/schemas.py` — новые схемы ответов если потребуется (скорее всего нет, используем те же)
- `.memory_bank/backend/api_compatibility.md` — файл версионирования уже создан
- `.memory_bank/backend/services/svc_tasks.md` — обновить описание эндпоинтов

---

## Задачи

- [x] 1. Добавить deprecation-комментарий на `GET /list/filters` — выполнено 2026-04-08
- [x] 2. Добавить handler `GET /list/filters/v2` — выполнено 2026-04-08
- [x] 3. Добавить deprecation-комментарий на `GET /list` — выполнено 2026-04-08
- [x] 4. Добавить параметр `intersection: bool = False` в `TaskRepository.get_all()` — выполнено 2026-04-08
- [x] 5. Добавить handler `GET /list/v2` — выполнено 2026-04-08
- [x] 6. `.memory_bank/backend/api_compatibility.md` создан — версии уточнить при релизе
- [x] 7. Обновить `.memory_bank/backend/services/svc_tasks.md` — выполнено 2026-04-08

---

## Лог выполнения

### 2026-04-08
- Создан план
- Создан файл `.memory_bank/backend/api_compatibility.md`
