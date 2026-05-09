# ADR: Путь не-LAMA пользователей — shadow-регистрация и SSO merge

**Дата:** 2026-04-08
**Режим:** FULL
**Owner:** Pavel Karpychev
**Review trigger:** появление третьего источника preloaded-пользователей (помимо LAMA daily sync и ручного добавления партнёром); изменение контракта Beyond Violet SSO (например, переход с `sso_id` на другой ключ); требование отделить аккаунты вместо merge.

## Контекст

Путь «как пользователь попадает в систему и связывается со своим SSO» эволюционировал двумя итерациями.

**Итерация 1 (2026-02-19, shadow-регистрация).** Изначально при ошибке `AUTH_USER_NOT_EXISTS` UI вёл на `RegistrationScreen`, где пользователь заполнял имя/фамилию/дату рождения/пол. Это было лишнее трение для розничной аудитории, а данные всё равно подтягивались из LAMA позднее. Регистрационный экран убран; клиент автоматически делает `POST /oauth/authorize/?signup=1` с пустым шаблоном (`first_name=""`, `last_name=""`, `gender=male`, `birth_date="1970-01-01"`). Пользователь создаётся «теневой» — без реальных персональных данных, которые позже придут из LAMA или будут проставлены вручную.

**Итерация 2 (2026-04-08, SSO merge).** С появлением партнёров без LAMA и preloaded-пользователей (заведённых через daily sync или партнёром заранее) обнаружилась дыра: при первом входе SSO `get_or_create_user_by_sso(sso_id)` создавал нового пользователя с `id=NEW`, а `merge_preloaded_by_phone(NEW, phone)` переносил assignments на NEW и удалял preloaded — задачи с `assignee_id=preloaded.id` оставались с битыми ссылками. Дополнительно: `/me` для не-LAMA пользователей дёргал LAMA по телефону на каждый вызов, потому что `UserLamaCache` для них никогда не создавался.

## Решение

Не-LAMA пользователи **прирастают** к preloaded-аккаунту (preloaded получает `sso_id`, NEW удаляется), а LAMA-пользователи продолжают мигрировать assignments на NEW — поведение определяется наличием хотя бы одного assignment в магазин с `partner_id == LAMA_PARTNER_ID`; шаг shadow-регистрации остаётся как способ создать SSO-аккаунт без UI-ввода.

## Альтернативы

- **Оставить экран регистрации:** отвергнуто в итерации 1 — данные из LAMA всё равно перетирали введённое, регистрация была фиктивным шагом.
- **Запрашивать персональные данные сразу при первом входе SSO:** отвергнуто — Beyond Violet SSO уже владеет частью этих данных, дублирование.
- **Всегда транслировать assignments на NEW (как для LAMA):** отвергнуто — для не-LAMA preloaded-пользователь и есть «правильный» аккаунт (его создал партнёр, у него уже могут быть задачи с правильным `assignee_id`); merge на NEW рвёт ссылки.
- **Всегда сохранять preloaded и удалять NEW:** отвергнуто — для LAMA это сломало бы daily sync, который ждёт стабильных `external_id` на NEW-пользователе после первой синхронизации (и опирается на `UserLamaCache` именно для NEW).
- **Идентифицировать не-LAMA по отсутствию `external_id` на пользователе:** отвергнуто — `external_id` приходит позже при sync, в момент merge его может не быть даже у LAMA-пользователя; assignment-based признак (`store.partner_id`) надёжнее.

## Экономическое/архитектурное обоснование

- Shadow-регистрация снимает шаг из onboarding-воронки (один экран и одну ошибку валидации), что критично для аудитории с низким терпением (кассиры, мерчендайзеры).
- `has_lama_assignments(user_id)` — единственная новая функция в `UserRepository`, переиспользуется и в `merge_preloaded_by_phone`, и в `/me` (guard перед `sync_employee`). Нулевое дублирование.
- Возврат `effective_user_id` из `merge_preloaded_by_phone` (вместо void) — единственный способ для `/me` handler'а понять, под каким id продолжать запрос; иначе пришлось бы перечитывать пользователя по `sso_id` ещё раз.
- Guard `has_lama_assignments` снимает 100% лишних вызовов LAMA для партнёрских пользователей — раньше было N вызовов в день на пользователя (по числу `/me`).

## Принятые риски

- **Признак «LAMA или нет» вычисляется через assignments.** Пользователь без назначений вообще классифицируется как не-LAMA, и LAMA не вызывается. Если такого пользователя позже захотят подключить к LAMA — нужен явный re-sync, sync через `/me` не запустится.
- **Shadow-регистрация шлёт пустые `first_name`/`last_name`.** Beyond Violet SSO принимает их сейчас, но при ужесточении валидации ломается весь onboarding. План явно зафиксировал этот риск.
- **Двухветочный `merge_preloaded_by_phone`.** Поведение отличается от типа партнёра — диагностика инцидентов сложнее (нужно понимать, по какой ветке прошёл merge); компенсируется логированием.
- **Гонка LAMA daily sync ↔ первый SSO login не-LAMA-пользователя.** Если daily sync ошибочно создаст preloaded в LAMA-магазине для телефона партнёрского пользователя, merge пойдёт по LAMA-ветке и сломает партнёрские задачи. Защита — изоляция партнёров через `partner_id` (см. связанный ADR).
- **birth_date «1970-01-01» как шаблон** попадает в SSO и потенциально в аналитику — нужно явно фильтровать в KPI/сегментах.

## Future hook

- `merge_preloaded_by_phone` возвращает `Optional[int]` — третья ветка (например, «есть конфликт, требуется ручное разрешение») добавляется без изменения сигнатуры.
- `has_lama_assignments` легко обобщается до `has_assignments_in_partner(user_id, partner_id)` — потребуется при появлении третьего партнёра с собственной логикой merge.
- Шаблон пустой регистрации вынесен в одну точку (AuthViewModel) на каждой платформе — замена на «реальный сбор данных через onboarding wizard» — точечное изменение, не флоу-redesign.

## Связанные документы

- Планы: `.memory_bank/completed_plans/shadow_registration.md`, `.memory_bank/completed_plans/non_lama_user_sso_merge.md`
- Доменные доки: `.memory_bank/domain/auth/auth_flow.md`, `.memory_bank/mobile/feature_auth/feature_auth_screens.md`
- Сервис: `.memory_bank/backend/services/svc_users.md`
- Реализация: `backend/svc_users/app/repositories/user_repository.py` (`merge_preloaded_by_phone`, `has_lama_assignments`), `backend/svc_users/app/api/users.py` (GET /me)
- iOS: `mobile/ios/WFMAuth/Sources/WFMAuth/ViewModels/AuthViewModel.swift`
- Android: `mobile/android/feature-auth/src/main/kotlin/.../presentation/viewmodels/AuthViewModel.kt`
- Связанный ADR: `.memory_bank/completed_plans/decisions/2026-04-07_partner_lama_isolation.md`
