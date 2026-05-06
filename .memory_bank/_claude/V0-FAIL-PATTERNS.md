# Recurring V0 failure patterns

V0 повторяет одни и те же ошибки. Применять при review каждого V0 PR.

⚠️ typecheck-gate в CI блокирует деплой при таких ошибках — прод не падает, но я фикшу в отдельном PR.

## 1. Re-declares types locally

V0 дублирует `LegalEntity`, `Goal`, `BonusTask`, `UnassignedTask`, `EmployeeUtilization`. Помогает в промпте: «DO NOT redeclare X — use from @/lib/types/Y».

## 2. Несуществующий `success` в ApiListResponse / ApiResponse

Наша convention:
- `ApiListResponse<T>` = `{ data, total, page, page_size }`
- `ApiResponse<T>` = `{ data }`
- `ApiMutationResponse` = `{ success, error?, id? }` ← только мутации

V0 пишет `return { success: true, data: T, meta: {...} }` для list. Fix через find/replace в diff.

## 3. Импорт icon забыт

V0 использует `Info`/`Camera` но не импортит из lucide-react. TS2304: «Cannot find name X». Quick fix.

## 4. `unknown` в JSX без Boolean wrap

`notification.data?.field && (...)` падает с TS2322 когда field is unknown. Wrap `Boolean()`.

## 5. Recharts Formatter тип

`formatter={(v, name) => [...]}` ломается. Cast через `as never`.

## 6. shadcn Checkbox

Не поддерживает `readOnly` / `aria-readonly`. Заменять на `tabIndex={-1}` + `pointer-events-none` + пустой `onCheckedChange`.

## 7. Zod v4 breaking

`invalid_type_error` устарело, теперь `message`.

## 8. z.coerce.number() ломает RHF type-infer

В формах. `z.number().int()` + `valueAsNumber` на input.

## 9. Trailing JSON в messages/*.json

V0 добавляет namespace ПОСЛЕ закрывающей `}` корневого объекта. JSON parse падает. Лечить `json.JSONDecoder().raw_decode()` + переинжект.

## 10. Corrupted UTF-8 (��) в RU strings

V0 иногда генерит русский с replacement chars. Чинить вручную.

## 11. Patch-чаты re-generate from stub

V0 в `XXa-` чатах часто полностью переписывает файл от стабовой версии. Если на main свежее — нужен manual port вместо merge.

## 12. Invalid page exports

V0 добавляет `export const X = ...` в `app/[locale]/page.tsx`. Next.js валидирует строго. Удалять кроме `default`/`metadata`/`generateStaticParams`.

## 13. Конкурентные create/add конфликты

Два чата параллельно создают `components/shared/X-status-badge.tsx`. Conflict add/add — брать одну версию через `git checkout --ours`.

## 14. shared/index.ts конфликты

Каждый чат добавляет свой Badge export. Слить в правильном порядке.

## Превентивные меры

- В V0 промпте: «Foundation already prepared in main — DO NOT recreate, only consume:»
- Список конкретных типов/API/i18n которые V0 НЕ должен переделывать
- После merge V0 PR → обязательный review через diff (часто ошибки видны сразу)
- typecheck-gate в CI ловит всё что не type-clean

## Foundation pattern (split Claude+V0)

С чата 22 проект на split:
- **Claude:** foundation-PR (types + mocks + API + i18n + page-wrapper + nav-link)
- **V0:** focused-промпт «build ONLY components/features/X.tsx»

Не запускать V0 чат пока foundation не смерджен.
