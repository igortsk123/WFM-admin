# ADR: Login as (impersonation) через JWT-флаг и хидер X-Auth-By

**Дата:** 2026-03-16
**Режим:** FULL
**Owner:** Pavel Karpychev
**Review trigger:** появление пользователей support / customer success вне команды разработки, которым нужен impersonation; первый инцидент несанкционированного использования; запрос аудитора на полный лог impersonation-сессий.

## Контекст

Воспроизвести баг конкретного пользователя на dev/prod без его пароля раньше было невозможно: SSO Beyond Violet выдаёт токен только владельцу телефона. Команде разработки нужен механизм «войти как», но он не должен открывать дыру для всех держателей валидного JWT. Beyond Violet уже расширил JWT полем `flags` (словарь булевых) — это даёт точку, откуда можно безопасно различать обычного пользователя и разработчика, не выкатывая отдельный auth-flow.

## Решение

JWT с `flags.dev = true` разрешает клиенту присылать заголовок `X-Auth-By: <phone>`, и backend (`shared/auth.py` + `dependencies.py` в svc_users/svc_tasks) подменяет `current_user_id` на пользователя, найденного по этому телефону, — потому что флаг в JWT валидируется централизованно при каждом запросе и не даёт обычным клиентам обойти контроль.

## Альтернативы

- **Отдельный admin endpoint `POST /impersonate` с генерацией нового JWT под целевого пользователя:** отвергнуто — даёт полноценный долгоживущий токен, который сложно отозвать; обычный JWT remains, но с признаком impersonation теряется (логи не отличают «настоящего» пользователя от impersonated).
- **Sudo-роль в БД (флаг `is_dev` в таблице users):** отвергнуто — рассинхронизация с Beyond Violet, кому управлять флагом неясно; JWT-флаг авторитетен и приходит из единого источника.
- **VPN/IP allowlist + любой пользователь:** отвергнуто — недостаточно гранулярно (любой разработчик в офисной сети может стать любым пользователем), не работает remote.
- **Хидер с подписанным impersonation-токеном (HMAC от секрета):** отвергнуто — лишний секрет на клиенте, такая же гарантия достигается JWT-флагом без нового механизма.

## Экономическое/архитектурное обоснование

- Нулевая инфраструктурная стоимость: один доп. флаг в JWT (Beyond Violet уже умеет), один заголовок, одна ветка в `dependencies.py` каждого сервиса.
- Симметричная реализация на iOS и Android (`ImpersonationStorage` + хидер в `APIClient`/`ApiClient`) — переиспользует существующий слой APIClient'а.
- UI кнопки «Войти как» в Settings показывается только при `flags.dev == true` (декодинг JWT на клиенте) — обычный пользователь не видит самой возможности.
- Подмена `current_user_id` происходит до любого application-кода — все эндпоинты автоматически работают «как будто запросил target user», без правок в каждом handler'е.
- `GET /internal/id-by-phone` инкапсулирует поиск целевого пользователя — внешний API не появился, флоу не утекает за пределы Docker-сети.

## Принятые риски

- **Безопасность зависит от честности Beyond Violet.** Любой пользователь, которому ошибочно проставлен `flags.dev = true`, получает полный impersonation на всю систему. Контроль выдачи флага — на стороне SSO, у нас нет своего управления.
- **Аудит-лог impersonation-сессий не реализован.** Сейчас невозможно по логам однозначно сказать «этот запрос был сделан под impersonation» — `current_user_id` уже подменён, оригинальный sso_id не сохраняется в логах операций. Признано приемлемым для dev-only фазы.
- **Хидер `X-Auth-By` принимается на каждом запросе, без TTL.** Сессия impersonation длится, пока разработчик сам не очистит её в Settings — забытая impersonation-сессия = долгоживущий доступ.
- **Impersonation работает только в svc_users и svc_tasks.** В svc_notifications и svc_monitoring логика не продублирована — там запросы пойдут от имени реального dev-пользователя. Для текущих сценариев приемлемо.
- **Поиск по телефону без подтверждения.** Если в БД два пользователя с одинаковым телефоном (граничный случай при merge/migration), impersonation схлопнется на первого — отлаживается на чужом аккаунте.

## Future hook

- `is_dev: bool` в `CurrentUser` — добавление feature-flag'ов в JWT (`flags.qa`, `flags.beta`) идёт по тому же паттерну.
- `X-Auth-By` принимает телефон — при необходимости расширить до `X-Auth-By-Email` или `X-Auth-By-UserId` достаточно добавить ещё одну ветку в dependency.
- Добавить аудит impersonation — естественное место `dependencies.py`: при подмене user_id логировать `(real_sso_id, target_user_id, endpoint)` в отдельную таблицу. Намеренно не сделано сейчас, чтобы не размывать MVP.
- Текущая реализация — в каждом сервисе своя ветка дубликатом; при появлении третьего сервиса логично вынести в `shared/auth.py` хелпер `resolve_user_with_impersonation`.

## Связанные документы

- План: `.memory_bank/completed_plans/impersonation_login_as.md`
- Доменная дока: `.memory_bank/domain/auth/impersonation.md`
- API: `.memory_bank/backend/apis/api_users.md` (`GET /internal/id-by-phone`)
- Mobile: `.memory_bank/mobile/feature_settings/settings_screen.md`, `.memory_bank/mobile/architecture/networking.md`
- Реализация: `backend/shared/auth.py`, `backend/svc_users/app/api/dependencies.py`, `backend/svc_tasks/app/api/dependencies.py`, `backend/svc_users/app/api/internal.py`
- iOS: `mobile/ios/WFMApp/Core/Managers/ImpersonationStorage.swift`, `mobile/ios/WFMApp/Core/Networking/APIClient.swift`
- Android: `mobile/android/app/src/main/java/.../core/managers/ImpersonationStorage.kt`, `mobile/android/app/src/main/java/.../core/network/ApiClient.kt`
