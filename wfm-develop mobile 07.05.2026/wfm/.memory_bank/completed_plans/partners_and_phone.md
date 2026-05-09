# План: partners + users.phone + merge по телефону

**Статус:** Выполнено
**Создан:** 2026-03-12
**Последнее обновление:** 2026-03-12

## Цель

Система сейчас жёстко ориентирована на одного клиента — ЛАМА (retail). Появились запросы
от малого бизнеса (кафе, мелкий ритейл) без ЛАМА. Нужно добавить минимальное понятие
партнёра как пространства имён, а также возможность добавлять сотрудников вручную
(вставкой в БД) и мёрджить их с реальным пользователем при первом логине по номеру телефона.

Пользователей пока добавляем руками (без API-endpoint). Смёрджить = найти
`User(phone=X, sso_id=NULL)` и перенести его assignments к залогинившемуся пользователю.

## Scope (только svc_users)

svc_tasks изменений не требует — он работает через assignment_id, store_id уже прозрачен.

## Файлы

- `backend/svc_users/app/domain/models.py`
- `backend/svc_users/alembic/versions/010_add_partners_and_phone.py` ← новый
- `backend/svc_users/app/repositories/user_repository.py`
- `backend/svc_users/app/api/users.py`

## Задачи

- [x] 1. `domain/models.py` — добавить модель Partner, Store.partner_id, User.phone — 2026-03-12
- [x] 2. `alembic/versions/010_add_partners_and_phone.py` — миграция — 2026-03-12
- [x] 3. `user_repository.py` — get_user_by_phone + merge_preloaded_by_phone — 2026-03-12
- [x] 4. `api/users.py` — phone save + phone merge в GET /me — 2026-03-12

## Ключевые решения

**Partner (минимальный):** id, name, created_at. LAMA остаётся глобальным — партнёры просто
пространство имён. Скопинг LAMA per-partner — отдельная задача.

**users.phone:** nullable, unique. Обновляется при каждом логине из SSO cache.
Используется как ключ для ручного мёрджа.

**Phone merge в GET /me (после SSO, перед LAMA):**
```python
# Сохранить phone
if sso_cache.phone and user.phone != sso_cache.phone:
    user.phone = sso_cache.phone; db.commit()
# Merge
merged = repo.merge_preloaded_by_phone(user_id, sso_cache.phone)
if merged: db.commit(); user = repo.get_user_with_permissions(user_id)
```

**Ручное добавление сотрудника (SQL):**
```sql
INSERT INTO partners (name) VALUES ('Дыхание вока') RETURNING id;
INSERT INTO stores (name, partner_id) VALUES ('Дыхание вока — Центр', 2) RETURNING id;
INSERT INTO users (phone, updated_at) VALUES ('+79991234567', NOW()) RETURNING id;
INSERT INTO assignments (user_id, store_id) VALUES (101, 5);
```

## Лог выполнения

### 2026-03-12
- Создан план
