# MY-PLAN-2: Global renames + cleanup

**Размер:** средний.
**Зависимости:** опционально после MY-PLAN-1 (не блокирует).
**Затрагивает:** ~20 компонентов + i18n.

## Задачи

### 2.1. Переименования (RU strings)

Все правки в `messages/ru.json` + `messages/en.json` + соответствующие компоненты.

| Было | Стало | Где |
|---|---|---|
| Привилегии | Зоны | Employee Form, Permissions matrix label, везде |
| Грейд | Разряд | Employee Form |
| Директор | Управляющий | Stores list таблица колонка "Директор магазина" |
| Запланировано / Назначено | Прогноз / Назначено | Schedule day-view |
| Конкретный исполнитель / по привилегии | Конкретный исполнитель / по зоне | Task Form RadioGroup |
| Архив задач | Задачи | Sidebar menu label + page title (это пункт `/tasks` без архивной логики) |

Permission type сама остаётся `Permission` в типах — не переименовываем enum значения, только labels в UI.

### 2.2. Удалить лишний функционал

| Что | Где | Действие |
|---|---|---|
| SMS канал в Invite опциях | Employee Create Wizard (step "Приглашение") | Удалить radio option "SMS" |
| Колонка "Агент" | Employees таблица | Удалить столбец из ColumnDef |
| Колонка "Оферта" | Employees таблица | Удалить столбец |
| Type "Дополнительная" | Task Form, RadioGroup тип задачи | Оставить только "Плановая" + "Бонусная" |
| Кнопка "Импорт ЛАМА" | Stores list toolbar | Удалить |
| Кнопка "Импорт ЛАМА" | Employees list toolbar | Удалить |
| "Принудительная синхронизация" | Stores Detail | Удалить кнопку (backend сам синхронизирует) |
| "Индикаторы компетенции" | Employee Form | Удалить секцию (user не понимает что это, согласие удалить от 2026-05-06) |

### 2.3. Хлебные крошки в `/tasks/[id]`
**Файл:** `components/features/tasks/task-detail.tsx`

Сейчас: `Главная / Задачи / task-017`

Должно: `Главная / Задачи / Проверка холодильников 5-8` (фактическое название задачи)

Просто заменить `taskId` на `task.title` в breadcrumbs prop.

### 2.4. "Архив задач" в меню → "Задачи"
**Файл:** `components/shared/admin-sidebar.tsx` + `app/[locale]/(admin)/navigation/page.tsx`

Найти labelKey `tasks_archive` → переименовать на `tasks` если уже не занят. Либо обновить i18n значение `nav.tasks_archive` с "Архив задач" на "Задачи".

Решено user 2026-05-06 — это просто `/tasks`, не отдельная архивная страница.

### 2.5. Phone country codes в Employee Form
**Файл:** `components/features/employees/employee-create-wizard.tsx` (Step 1)

Текущий phone field — только +7 формат. Добавить country picker:
- +7 (Россия) — default
- +7 (Казахстан)
- +375 (Беларусь)
- +380 (Украина)
- +992 (Таджикистан)
- +996 (Кыргызстан)
- +998 (Узбекистан)

Реализация: shadcn Combobox + флаг (можно эмодзи) + код. Маска phone подстраивается под country.

Или проще — `react-phone-number-input` package (если уже подключен). Если нет — добавить простой Combobox с кодами и input.

## Verification

- `tsc --noEmit` zero errors
- Все экраны рендерятся без `t()` ошибок (отсутствующих ключей)
- Поиск/replace по проекту: не осталось "Привилегии", "Грейд", "Дополнительная" в UI

## Approach

Делать в порядке:
1. i18n правки сначала (messages/*.json)
2. Компоненты которые юзают новые ключи
3. Удаление ненужных колонок/опций
4. Country codes — последним (новый компонент)
