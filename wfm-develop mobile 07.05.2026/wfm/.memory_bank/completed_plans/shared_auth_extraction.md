# План: Вынос JWT-аутентификации в shared модуль

**Статус:** Выполнено
**Создан:** 2026-02-05
**Последнее обновление:** 2026-02-05

---

## Цель

Вынести дублирующийся код JWT-валидации из `svc_users` и `svc_tasks` в `shared/`, разместить `bv_public_key.pem` в `shared/` — оба сервиса получают ключ автоматически через существующий механизм `COPY shared/ /app/shared/`.

## Задачи

### Фаза 1: Создание shared/auth.py

- [x] 1.1 Создать `backend/shared/auth.py` — 2026-02-05
- [x] 1.2 Обновить `backend/shared/__init__.py` — 2026-02-05

### Фаза 2: Файлы ключа

- [x] 2.1 Создать `backend/shared/bv_public_key.pem.example` — 2026-02-05
- [x] 2.2 Создать `backend/shared/.gitignore` — 2026-02-05

### Фаза 3: Обновление сервисов

- [x] 3.1 `svc_tasks/app/api/tasks.py`: импорт из shared — 2026-02-05
- [x] 3.2 `svc_users/app/api/users.py`: импорт из shared — 2026-02-05
- [x] 3.3 `svc_tasks/app/core/config.py`: убраны JWT-настройки — 2026-02-05
- [x] 3.4 `svc_users/app/core/config.py`: убраны JWT-настройки, SSO оставлены — 2026-02-05
- [x] 3.5 Удалён `svc_tasks/app/core/auth.py` — 2026-02-05
- [x] 3.6 Удалён `svc_users/app/core/auth.py` — 2026-02-05

### Фаза 4: Docker

- [x] 4.1 `docker-compose.yml`: добавлен `./shared:/app/shared` в volumes обоих сервисов — 2026-02-05

### Фаза 5: Проверка документации Memory Bank

- [x] 5.1 Обновлён `.memory_bank/backend/shared.md` — 2026-02-05
- [x] 5.2 Обновлён `.memory_bank/backend/svc_users.md` — 2026-02-05
- [x] 5.3 Обновлён `.memory_bank/backend/svc_tasks.md` — 2026-02-05

### Фаза 6: Проверка

- [x] 6.1 Скопирован реальный `bv_public_key.pem` в `backend/shared/` — 2026-02-05
- [x] 6.2 `docker-compose build && docker-compose up` — сервисы стартуют — 2026-02-05
- [x] 6.3 Запрос с JWT возвращает `token_expired` (ключ работает) — 2026-02-05
- [x] 6.4 Запрос без токена возвращает `UNAUTHORIZED` — 2026-02-05

---

## Лог выполнения

### 2026-02-05
- Создан план
- Реализованы фазы 1–5
- Скопирован реальный ключ, проверен деплой
- План выполнен
