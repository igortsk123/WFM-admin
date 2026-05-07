# Backend Sync Rule — обязательно при ЛЮБОМ изменении модели

## Контекст

Admin = клиент существующего FastAPI backend (`wfm-develop mobile/wfm/backend/`).
В `lib/api/*` живут **raw backend wrappers** (`*OnBackend`, `*FromBackend`),
зеркалящие endpoint'ы. В `lib/api/_backend-types.ts` живут TS-зеркала
Pydantic schemas.

Backend постепенно дотягивается до admin модели через `MIGRATION-NOTES.md`
в корне репо.

## Правило

**Каждое изменение в admin model → обязательное обновление трёх артефактов:**

1. **`lib/api/_backend-types.ts`** — если изменён shape запроса/ответа (поле,
   тип, optional/required, новый enum) — обновить соответствующий `Backend*` тип.

2. **`lib/api/<feature>.ts`** — если добавлен/удалён endpoint в admin —
   добавить/удалить raw wrapper (`*OnBackend()`, `*FromBackend()`).

3. **`MIGRATION-NOTES.md`** — добавить запись в раздел «Что admin использует
   поверх backend» (для нового поля) или «Запрос на endpoints» (для нового CRUD).

**Без этих обновлений PR не принимается** — backend разработчик опирается на
эти три файла как на единственный источник правды о том что admin ожидает.

## Когда применяется

- Добавление/удаление поля в `lib/types/index.ts` (Task, User, Store, ...)
- Создание новой `lib/api/<feature>.ts` функции
- Изменение signature существующей функции (params, return type)
- Добавление нового экрана который использует данные не покрытые backend
- Создание новой mock-сущности (Goal, FreelanceService и т.д.)
- Изменение enum значения (TaskState, NotificationCategory, ...)

## Когда НЕ применяется (можно пропустить)

- Чисто UI-изменения (стили, компоновка, иконки)
- Локализация (messages/ru|en.json)
- Изменения комментариев/документации без change в shape
- Внутренние helpers в `lib/utils/` без изменения API

## Чек-лист перед коммитом feature-изменения

```
[ ] lib/types/index.ts — изменён ли shape? Если да:
[ ]   lib/api/_backend-types.ts обновлён (Backend* тип)
[ ]   lib/api/<feature>.ts — есть ли *OnBackend/*FromBackend wrapper?
[ ]      если да — обновить signature
[ ]      если нет — добавить raw wrapper или пометить как admin-only в MIGRATION-NOTES
[ ] MIGRATION-NOTES.md — добавлена/обновлена запись?
[ ] (Не lossy dispatch — admin model = source of truth, см. там же)
```

## Зачем

Backend-разработчик не должен догонять frontend. Он должен открыть
`MIGRATION-NOTES.md` + `_backend-types.ts` и видеть актуальную карту
«что admin ожидает поверх моего backend». Если admin поправил, а wrapper
не синхронизировал — backend дотянет неактуальные поля, интеграция
начнёт ломаться при swap.

См. также: `MIGRATION-NOTES.md` в корне.
