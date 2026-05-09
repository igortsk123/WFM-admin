# План: Перенос svc_shifts в svc_tasks

**Статус:** Выполнено
**Создан:** 2026-03-11
**Завершён:** 2026-03-12
**Последнее обновление:** 2026-03-12

## Цель

Устранить архитектурную избыточность: задачи и смены — один операционный домен.
После слияния GET /my перестаёт делать HTTP вызов в svc_shifts, а все 3 вызова
в `_get_store_today_context` сокращаются до 2 (shifts → локальный DB запрос).

## Архитектурное решение

### Nginx routing после слияния

Оба сервиса переходят на порт 8000 (svc_tasks), но с разным поведением nginx:

```
/tasks/list       → nginx strips /tasks/  → localhost:8000/list         (tasks router, без префикса)
/shifts/current   → nginx keeps /shifts/  → localhost:8000/shifts/current (shifts router, prefix=/shifts)
```

**tasks.conf** — без изменений (proxy_pass http://localhost:8000/)
**shifts.conf** — только смена порта: proxy_pass http://localhost:8000/shifts/

FastAPI app: shifts router добавляется с `prefix="/shifts"`.

### Известное ограничение

Swagger документация shifts переезжает с /shifts/docs в /tasks/docs.
Routes в swagger будут отображаться как /tasks/shifts/open (неверно),
реальный URL останется /shifts/open. Это косметическая проблема — не мешает работе API.
Исправляется позже удалением root_path из main.py (отдельная задача).

### CI/CD: svc_shifts уже отсутствует в pipeline

В `.gitverse/workflows/` нет билда svc_shifts — только svc_tasks и svc_users.
Образ svc_shifts не обновляется автоматически. Изменения в CI/CD не нужны.

### Данные для миграции

shifts_plan и shifts_fact — эфемерные данные (смены на сегодня/вчера).
На DEV: просто создать пустые таблицы миграцией.
На PROD: см. Фазу 9.

---

## Задачи

### Фаза 0: Подготовка

- [ ] Сделать дамп wfm_shifts БД на DEV перед началом работ:
  `docker exec backend-postgres-1 pg_dump -U root wfm_shifts > /tmp/shifts_backup.sql`
  *(ручное действие на сервере)*

### Фаза 1: БД — новая миграция в svc_tasks

- [x] Создать `backend/svc_tasks/alembic/versions/016_add_shift_tables.py` — выполнено 2026-03-11

### Фаза 2: Код — добавить модели и схемы в svc_tasks

- [x] Добавить `ShiftPlan`, `ShiftFact` в `svc_tasks/app/domain/models.py` — выполнено 2026-03-11
- [x] Добавить схемы смен в `svc_tasks/app/domain/schemas.py` — выполнено 2026-03-11

### Фаза 3: Код — репозиторий и сервисы

- [x] Создать `svc_tasks/app/repositories/shift_repository.py` — выполнено 2026-03-11
- [x] Создать `svc_tasks/app/services/shift_lama_service.py` — выполнено 2026-03-11
- [x] Добавить `get_assignment_external_id` в `svc_tasks/app/services/users_client.py` — выполнено 2026-03-11

### Фаза 4: Код — перенести API эндпоинты смен

- [x] Создать `svc_tasks/app/api/shifts.py` — выполнено 2026-03-11
- [x] Обновить `svc_tasks/app/main.py` — выполнено 2026-03-11

### Фаза 5: Рефакторинг зависимостей в tasks.py

- [x] Переписать `_get_store_today_context` (убрать HTTP вызов к svc_shifts) — выполнено 2026-03-11
- [x] Переписать `GET /my` (прямой ShiftRepository) — выполнено 2026-03-11
- [x] Переписать `GET /{task_id}` (LAMA sync через ShiftRepository) — выполнено 2026-03-11
- [x] Убрать `shifts_client` из GET /list, /list/filters, /list/users — выполнено 2026-03-11
- [x] Исправить баг: двойной вызов get_today_shift_plans в GET /list/users — выполнено 2026-03-11
- [x] Удалить `svc_tasks/app/services/shifts_client.py` — выполнено 2026-03-11
- [x] Убрать `SHIFTS_SERVICE_URL`, `SHIFTS_SERVICE_TIMEOUT` из `svc_tasks/app/core/config.py` — выполнено 2026-03-11

### Фаза 6: Очистка svc_users

- [x] Удалить мёртвый код `SHIFTS_SERVICE_URL`, `SHIFTS_SERVICE_TIMEOUT` из `svc_users/app/core/config.py` — выполнено 2026-03-11

### Фаза 7: Инфраструктура — Docker Compose

- [x] Обновить `backend/docker-compose.yml` — удалён блок svc_shifts, WFM_SHIFTS_DB_PASSWORD, SHIFTS_SERVICE_URL/TIMEOUT — выполнено 2026-03-12
- [x] Обновить `backend/docker-compose.dev.yml` — удалён блок svc_shifts — выполнено 2026-03-12
- [x] Обновить `backend/docker-compose.prod.yml` — удалён блок svc_shifts — выполнено 2026-03-12
- [x] Обновить `backend/docker-compose.override.yml` — удалён блок svc_shifts — выполнено 2026-03-12
- [x] Обновить `backend/db/init/01-create-dbs.sh` — удалена wfm_shifts БД — выполнено 2026-03-12

### Фаза 8: Инфраструктура — Nginx

- [x] Обновить `backend/nginx/services/shifts.conf`: proxy_pass http://localhost:8000/shifts/ — выполнено 2026-03-12

- [ ] На сервере применить новый nginx конфиг:
  ```bash
  sudo nginx -t && sudo nginx -s reload
  ```
  *(ручное действие при деплое)*

### Фаза 9: Деплой и миграция данных

**DEV:**
- [ ] Остановить svc_shifts: `docker compose stop svc_shifts` *(ручное)*
- [ ] Задеплоить новый svc_tasks *(через push в develop — автоматически)*
- [ ] Обновить nginx: `sudo nginx -t && sudo nginx -s reload` *(ручное)*
- [ ] Проверить: `curl https://dev.wfm.beyondviolet.com/shifts/current?assignment_id=X`
- [ ] Проверить: `curl https://dev.wfm.beyondviolet.com/tasks/my?assignment_id=X`
- [ ] Убедиться что `/shifts/internal/` возвращает 404 (nginx блокировка)

**PROD (если нужна миграция данных):**
- [ ] Оценить объём данных в wfm_shifts: открытые смены сегодня?
  ```sql
  SELECT count(*) FROM shifts_fact WHERE closed_at IS NULL;
  ```
  Если есть открытые смены — дождаться конца рабочего дня или договориться о окне.
- [ ] Экспорт/импорт данных (см. детали в исходном плане)

### Фаза 10: Документация Memory Bank

- [x] Обновить `.memory_bank/backend/services/svc_tasks.md` — выполнено 2026-03-12
- [x] Заменить `.memory_bank/backend/services/svc_shifts.md` на deprecation notice — выполнено 2026-03-12
- [x] Обновить `.memory_bank/backend/apis/api_shifts.md` — выполнено 2026-03-12
- [x] Обновить `.memory_bank/backend/patterns/inter_service_communication.md` — выполнено 2026-03-12
- [x] Обновить `.memory_bank/backend/guides/nginx.md` — выполнено 2026-03-12
- [x] Обновить `CLAUDE.md` — выполнено 2026-03-12
- [x] Переместить план в completed_plans/ — выполнено 2026-03-12

---

## Риски и ограничения

| Риск | Митигация |
|------|-----------|
| nginx нужно обновить вручную на сервере | Nginx конфиг в репозитории — сделать PR + инструкция деплоя |
| Окно недоступности /shifts/ при деплое | Деплой в нерабочее время или быстрая смена nginx → svc_tasks |
| Потеря данных открытых смен на PROD | Дождаться конца рабочего дня, экспортировать данные (Фаза 9 PROD) |
| root_path в Swagger некорректно отображает /shifts/ routes | Известное ограничение, документируется. Исправляется отдельно |
| svc_shifts остаётся в wfm_shifts БД | Нормально — данные не удаляются, просто перестаём использовать |

---

## Лог выполнения

### 2026-03-11
- Создан план на основе анализа кодовой базы
- Выявлен баг: двойной вызов get_today_shift_plans в GET /list/users (включён в Фазу 5)
- Выявлено: svc_shifts уже отсутствует в CI/CD pipeline — изменения в workflows не нужны
- Фазы 1–6 выполнены: миграция, модели, схемы, репозиторий, сервисы, API эндпоинты, рефакторинг tasks.py, очистка конфигов

### 2026-03-12
- Фазы 7–8 выполнены: все docker-compose файлы, db/init скрипт, nginx shifts.conf
- Фаза 10 выполнена: документация Memory Bank, CLAUDE.md
- Ожидают ручного деплоя на сервере: Фаза 9 (остановить svc_shifts, применить nginx конфиг)
