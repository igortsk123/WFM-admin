# План: Корректный SSO merge для не-LAMA пользователей

**Статус:** Выполнено
**Создан:** 2026-04-08
**Последнее обновление:** 2026-04-08

## Цель

Исправить два связанных поведения для пользователей партнёров без LAMA-интеграции:

1. При первом входе — сохранять `user_id` preloaded-пользователя (добавить ему `sso_id`), не создавать новый
2. В `GET /me` — не делать запросы к LAMA для пользователей без LAMA-назначений

**Признак LAMA-пользователя**: есть хотя бы одно назначение в магазин с `store.partner_id == settings.LAMA_PARTNER_ID`

---

## Проблема 1: первый вход не-LAMA пользователя

**Текущее поведение:**
1. `get_or_create_user_by_sso(sso_id)` создаёт нового SSO-пользователя `id=NEW`
2. `merge_preloaded_by_phone(NEW, phone)` находит preloaded-пользователя (phone=X, sso_id=NULL)
3. Assignments переносятся с preloaded → NEW, preloaded удаляется
4. Задачи с `assignee_id=preloaded.id` становятся с висячими ссылками

**Желаемое поведение для не-LAMA:**
1. `get_or_create_user_by_sso` — без изменений
2. `merge_preloaded_by_phone` определяет: есть ли у preloaded-пользователя хотя бы одно назначение в LAMA-магазин
3. Если **нет LAMA-назначений** (не-LAMA): устанавливает `preloaded.sso_id = sso_id`, `preloaded.phone = phone`, удаляет NEW-пользователя, возвращает `preloaded.id`
4. Если **есть LAMA-назначения**: текущее поведение (transfer + delete preloaded), возвращает `current_user_id`
5. `/me` handler использует возвращённый `user_id` для всех последующих операций в запросе

---

## Проблема 2: лишние запросы к LAMA

**Текущее поведение:** `sync_employee` запрашивает LAMA по телефону на каждый `/me` при протухшем кэше. Для не-LAMA пользователей кэш никогда не создаётся → запрос на каждый вызов.

**Желаемое:** перед вызовом `sync_employee` в `/me` проверить, есть ли у пользователя LAMA-назначения. Если нет — пропустить sync полностью.

---

## Затронутые файлы

- `backend/svc_users/app/repositories/user_repository.py`
  - `merge_preloaded_by_phone`: изменить логику + сигнатуру → возвращать `Optional[int]` (effective user_id)
- `backend/svc_users/app/api/users.py`
  - `GET /me`: использовать возвращённый user_id; добавить проверку LAMA-назначений перед `sync_employee`

---

## Задачи

- [x] 1. Добавить `has_lama_assignments(user_id) -> bool` в `UserRepository` — выполнено 2026-04-08
- [x] 2. Изменить `merge_preloaded_by_phone` → `Optional[int]` с двумя ветками — выполнено 2026-04-08
- [x] 3. В `GET /me`: использовать `effective_user_id` — выполнено 2026-04-08
- [x] 4. В `GET /me`: guard `has_lama_assignments` перед `sync_employee` — выполнено 2026-04-08
- [x] 5. Обновить `svc_users.md` — выполнено 2026-04-08

---

## Граничные случаи

- Пользователь без назначений вообще → `has_lama_assignments` = False → LAMA не вызывается (логично, у него нет магазина)
- Пользователь с назначениями в оба типа партнёров → `has_lama_assignments` = True → LAMA вызывается (корректно)
- `current_user.sso_id` нужен для записи в preloaded при не-LAMA merge → получить из `db.query(User).filter(User.id == current_user_id).first().sso_id`

---

## Лог выполнения

### 2026-04-08
- Создан план
