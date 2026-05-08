# Backend dev — быстрый старт

> Привет! Этот файл для тебя — backend-разработчика мобильного WFM-проекта.
> Здесь то что нужно знать чтобы быстро подключиться к admin'у.

## Что почитать

В таком порядке:

1. **`MIGRATION-NOTES.md`** (этот же корень) — что admin использует поверх твоего backend, по сущностям. Главный документ.
2. **`lib/api/README.md`** — полный inventory всех endpoints: что у нас уже совпадает с твоим backend, что admin-only.
3. **`lib/api/_backend-types.ts`** — TypeScript-зеркала твоих Pydantic schemas. Сравни с актуальным `svc_*/app/domain/schemas.py` — если разошлось, дай знать или напиши issue.

## Куда смотреть в коде admin'а

| Что хочешь увидеть | Где |
|---|---|
| Как admin вызывает твой `/users/me` | `lib/api/users.ts` функция `getCurrentUserMe()` |
| Wrappers для всех твоих endpoints | `lib/api/<service>.ts` функции с суффиксом `*OnBackend()` / `*FromBackend()` |
| JWT auth client | `lib/api/_auth-token.ts` + `lib/api/_client.ts` |
| Конфиг URL | `lib/api/_config.ts` |
| Поля admin-only | в `lib/types/index.ts` помечены JSDoc `@admin-extension` |

## Dev-инструмент: `/dev/api-token`

Когда запустишь admin локально (`pnpm run dev`), открой в браузере:

```
http://localhost:3000/dev/api-token
```

Что там можно:
- Вставить JWT токен от Beyond Violet SSO → сохранится в localStorage
- Увидеть текущие env-настройки (`API_BASE_URL`, `USE_REAL_API`)
- Нажать «Тест GET /users/me» → admin сходит в твой backend и покажет ответ

Эта страница в боковом меню не показывается (не для конечных пользователей) — заходи прямо по URL.

## Как включить real backend

Создай `.env.local` в корне:

```
NEXT_PUBLIC_API_BASE_URL=https://dev.wfm.beyondviolet.com
NEXT_PUBLIC_USE_REAL_API=true
```

После перезапуска `pnpm run dev` — admin начнёт ходить в твой dev-сервер вместо моков. Если что-то не так с токеном/CORS/ответом — увидишь в `BackendApiError` в консоли браузера.

## Как добавить новый endpoint

Если ты дотянул новый endpoint у себя на backend и хочешь чтобы admin начал его использовать:

1. Добавь TS-зеркало схемы в `lib/api/_backend-types.ts` (`Backend*` интерфейс)
2. Добавь raw wrapper `*OnBackend()` в соответствующий файл `lib/api/<service>.ts` с JSDoc `@endpoint METHOD /path`
3. Обнови `MIGRATION-NOTES.md` — переведи поле/endpoint из «admin-only» в «backend-mirrored»
4. Обнови `lib/api/README.md` если это новый модуль

## Что НЕ надо делать

- Не ужимать admin model под backend — он богаче, и это спецификация на доработку, не баг
- Не удалять admin-only функции у нас — пометить как admin-only и оставить
- Не делать lossy dispatch (admin → backend с потерей admin-полей)

## Контакты

Если что-то непонятно или нужна правка в admin под твою архитектуру — пингуй владельца репозитория.
