# Миграции базы данных (Alembic)

## Quick Reference

```bash
# Применить все миграции (внутри контейнера)
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec svc_tasks alembic upgrade head
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec svc_users alembic upgrade head
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec svc_shifts alembic upgrade head

# Посмотреть текущую версию
docker compose ... exec svc_tasks alembic current

# Откатить последнюю миграцию
docker compose ... exec svc_tasks alembic downgrade -1
```

---

## Принципы

1. **Alembic — единственный способ изменять схему БД**. Запрещено использовать `Base.metadata.create_all()` или ручные SQL-скрипты.
2. **Каждый сервис имеет свою БД и свою цепочку миграций**:
   - `svc_tasks` → БД `wfm_tasks`
   - `svc_users` → БД `wfm_users`
   - `svc_shifts` → БД `wfm_shifts`
3. **Миграции хранятся в репозитории** и применяются перед/после деплоя.
4. **Миграции должны быть обратимыми** — всегда писать `downgrade()`.

---

## Структура файлов

```
backend/
├── svc_tasks/
│   ├── alembic.ini
│   └── alembic/
│       ├── env.py
│       ├── script.py.mako
│       └── versions/
│           ├── 000_create_tasks_table.py
│           ├── 001_add_user_roles_and_permissions.py
│           ├── 002_remove_user_roles_and_permissions.py
│           └── 003_add_lama_fields.py
├── svc_users/
│   ├── alembic.ini
│   └── alembic/
│       └── versions/
│           ├── 001_create_reference_tables.py
│           ├── 002_create_users_and_permissions.py
│           ├── 003_remove_stores_table.py
│           └── 004_add_ranks_assignments_tables.py
└── svc_shifts/
    ├── alembic.ini
    └── alembic/
        └── versions/
            └── 001_create_stores_and_shifts_tables.py
```

---

## Workflow: добавление/изменение таблицы

### 1. Изменить модель

Отредактировать файл `app/domain/models.py` в нужном сервисе.

### 2. Создать миграцию

```bash
# Из директории сервиса (локально или в контейнере)
cd backend/svc_tasks
alembic revision --autogenerate -m "Описание изменений"
```

Или создать файл вручную в `alembic/versions/`.

### 3. Проверить сгенерированную миграцию

**Обязательно проверить файл!** Автогенерация может:
- Пропустить изменения (переименование колонок воспринимается как удаление + создание)
- Добавить лишнее (изменения в `server_default` и т.д.)

### 4. Именование файлов миграций

Формат: `{номер}_{описание}.py`

```
000_create_tasks_table.py
001_add_user_roles_and_permissions.py
002_remove_user_roles_and_permissions.py
003_add_lama_fields.py
```

- Номер — трёхзначный, возрастающий (`000`, `001`, `002`, ...)
- Описание — краткое, на английском, через `_`

### 5. Цепочка миграций

Каждая миграция ссылается на предыдущую через `down_revision`:

```python
revision: str = '003'
down_revision: Union[str, None] = '002'  # ← предыдущая миграция
```

Первая миграция в цепочке: `down_revision = None`.

### 6. Применить миграцию

```bash
# DEV сервер
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec svc_tasks alembic upgrade head

# PROD сервер
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec svc_tasks alembic upgrade head
```

### 7. Закоммитить

Файл миграции коммитится вместе с изменениями в `models.py`.

---

## Workflow: сброс БД на dev

Когда нужно пересоздать базы с нуля (dev-окружение):

```bash
cd /srv/wfm/backend

# Остановить всё и удалить volumes (данные PostgreSQL)
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v

# Поднять заново (init-скрипт создаст пустые БД)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Подождать ~10 сек пока PostgreSQL инициализируется

# Применить все миграции
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec svc_tasks alembic upgrade head
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec svc_users alembic upgrade head
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec svc_shifts alembic upgrade head
```

**ВНИМАНИЕ**: На PROD так делать нельзя — там данные не восстановимы.

---

## Правила написания миграций

### Всегда писать downgrade()

```python
def upgrade() -> None:
    op.add_column('tasks', sa.Column('priority', sa.Integer(), nullable=True))

def downgrade() -> None:
    op.drop_column('tasks', 'priority')
```

### Новые колонки — nullable или с server_default

Если в таблице уже есть данные, новая колонка должна быть `nullable=True` или иметь `server_default`:

```python
# ✅ Правильно
op.add_column('tasks', sa.Column('source', sa.String(50), nullable=True))
op.add_column('tasks', sa.Column('source', sa.String(50), server_default='WFM', nullable=False))

# ❌ Неправильно — упадёт если в таблице есть данные
op.add_column('tasks', sa.Column('source', sa.String(50), nullable=False))
```

### Не удалять данные без необходимости

При изменении типа колонки — сначала создать новую, мигрировать данные, потом удалить старую:

```python
def upgrade() -> None:
    # 1. Добавить новую колонку
    op.add_column('users', sa.Column('external_id_new', sa.Integer(), nullable=True))
    # 2. Мигрировать данные
    op.execute("UPDATE users SET external_id_new = CAST(external_id AS INTEGER) WHERE external_id IS NOT NULL")
    # 3. Удалить старую
    op.drop_column('users', 'external_id')
    # 4. Переименовать
    op.alter_column('users', 'external_id_new', new_column_name='external_id')
```

### env.py — правильные импорты

`env.py` должен импортировать модели **своего** сервиса:

```python
# svc_tasks/alembic/env.py
from app.domain.models import Task  # ✅

# svc_users/alembic/env.py
from app.domain import models  # ✅ импорт модуля целиком

# ❌ Неправильно — импорт модели из чужого сервиса
from app.domain.models import Task  # в svc_users нет Task!
```

---

## Инициализация БД (docker-compose)

При первом запуске PostgreSQL выполняется скрипт `backend/db/init/01-create-dbs.sh`, который создаёт:

| База данных | Пользователь | Сервис |
|------------|-------------|--------|
| `wfm_tasks` | `wfm_tasks_user` | svc_tasks |
| `wfm_users` | `wfm_users_user` | svc_users |
| `wfm_shifts` | `wfm_shifts_user` | svc_shifts |

Этот скрипт выполняется **только при первом создании volume**. При `down -v` volume удаляется, и при следующем `up` скрипт выполнится заново.

---

## Частые ошибки

| Ошибка | Причина | Решение |
|--------|---------|---------|
| `relation "X" does not exist` | Нет миграции для создания таблицы | Создать начальную миграцию |
| `ImportError: cannot import name 'X'` | Неправильный импорт в `env.py` | Импортировать модели своего сервиса |
| `Can't locate revision` | Нарушена цепочка `down_revision` | Проверить ссылки между миграциями |
| `Target database is not up to date` | Есть непримёнённые миграции | `alembic upgrade head` |
| `Table already exists` | Таблица создана через `create_all()` | Сбросить БД (`down -v`) и прогнать миграции |
