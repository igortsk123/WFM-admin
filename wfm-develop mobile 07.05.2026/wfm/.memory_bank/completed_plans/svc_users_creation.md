# План: Создание сервиса svc_users

**Статус:** Завершено
**Создан:** 2026-01-30
**Завершено:** 2026-01-30

## Цель

Выделить функционал управления пользователями в отдельный микросервис `svc_users` с собственной базой данных `wfm_users`, перенести функционал ролей и привилегий из `svc_tasks`, расширить модель пользователя новыми полями, создать справочники и реализовать endpoint `/users/me` с интеграцией SSO.

## Контекст

### Что переносим из svc_tasks:
- Таблица `user_roles` → станет частью расширенной таблицы `users`
- Таблица `worker_permissions` → переименовывается в `permissions` (разрешения для всех пользователей)
- API endpoints для управления ролями и привилегиями
- Repository для работы с ролями

### Новые поля модели User:
- `id` (UUID) — основной ID из SSO/JWT (поле `u` в токене)
- `external_id` — внешний ID из системы Лама (формат пока не известен)
- `role_id` — ссылка на справочник ролей (worker/manager)
- `type_id` — ссылка на справочник типов сотрудников (штатный/временный)
- `position_id` — ссылка на справочник должностей
- `grade` — разряд (nullable integer)
- `store_id` — ссылка на справочник магазинов
- `updated_at`, `updated_by` — аудит

### Справочники:
1. `roles` — роли пользователей (worker, manager)
2. `employee_types` — типы сотрудников (штатный, временный)
3. `positions` — должности (ЗамДирПоТорговле, ПродавПрод, ПродУнивер, ДирСуперм, КасКасСамобсл)
4. `stores` — магазины

### Endpoint /users/me:
1. Извлекает user_id из JWT (поле `u`)
2. Получает данные из локальной таблицы `users`
3. Запрашивает данные из SSO API:
   - `https://api.beyondviolet.com/sys/v1/users/{uuid}/`
   - `https://api.beyondviolet.com/sys/v1/users/self/`
4. Склеивает данные (локальные + SSO) и возвращает клиенту

## Задачи

### Этап 1: Инфраструктура и базовая структура

- [x] 1.1. Создать структуру директорий для `svc_users` — выполнено 2026-01-30
  ```
  backend/svc_users/
  ├── app/
  │   ├── __init__.py
  │   ├── main.py
  │   ├── api/
  │   │   ├── __init__.py
  │   │   ├── users.py
  │   │   └── health.py
  │   ├── core/
  │   │   ├── __init__.py
  │   │   ├── config.py
  │   │   ├── database.py
  │   │   └── auth.py
  │   ├── domain/
  │   │   ├── __init__.py
  │   │   ├── models.py
  │   │   └── schemas.py
  │   ├── repositories/
  │   │   ├── __init__.py
  │   │   └── user_repository.py
  │   └── services/
  │       ├── __init__.py
  │       └── sso_service.py
  ├── alembic/
  │   ├── versions/
  │   └── env.py
  ├── alembic.ini
  ├── Dockerfile
  ├── requirements.txt
  ├── .env.example
  └── README.md
  ```

- [x] 1.2. Скопировать и адаптировать базовые файлы из svc_tasks — выполнено 2026-01-30
  - `Dockerfile`
  - `requirements.txt` (+ добавить `httpx` для SSO интеграции)
  - `.env.example`
  - `alembic.ini`
  - `app/core/config.py` (изменить DATABASE_URL на wfm_users)
  - `app/core/database.py`
  - `app/core/auth.py` (скопировать из svc_tasks для JWT валидации)

- [x] 1.3. Добавить сервис в docker-compose.yml — выполнено 2026-01-30
  ```yaml
  db_users:
    image: postgres:16
    container_name: wfm_users_db
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-wfm_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-wfm_password}
      POSTGRES_DB: wfm_users
    ports:
      - "5433:5432"
    volumes:
      - postgres_users_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U wfm_user -d wfm_users"]
      interval: 5s
      timeout: 5s
      retries: 5

  app_users:
    build: ./svc_users
    container_name: wfm_users_app
    ports:
      - "8001:8000"
    environment:
      DATABASE_URL: postgresql://wfm_user:wfm_password@db_users:5432/wfm_users
      DEBUG: "True"
      LOG_LEVEL: INFO
      SSO_BASE_URL: https://api.beyondviolet.com/sys/v1
    depends_on:
      db_users:
        condition: service_healthy
    volumes:
      - ./svc_users/app:/app/app
      - ./svc_users/alembic:/app/alembic
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
  ```

### Этап 2: Модели данных и миграции

- [x] 2.1. Создать модели справочников в `app/domain/models.py`
  - `Role` (id, code, name, description)
  - `EmployeeType` (id, code, name, description)
  - `Position` (id, code, name, description)
  - `Store` (id, name, address, ...) — базовая модель

- [x] 2.2. Создать модель `User` в `app/domain/models.py`
  ```python
  class User(Base):
      __tablename__ = "users"

      id = Column(UUID, primary_key=True)  # из JWT
      external_id = Column(String(255), nullable=True)  # Лама ID
      role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
      type_id = Column(Integer, ForeignKey("employee_types.id"), nullable=True)
      position_id = Column(Integer, ForeignKey("positions.id"), nullable=True)
      grade = Column(Integer, nullable=True)
      store_id = Column(UUID, ForeignKey("stores.id"), nullable=True)
      updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
      updated_by = Column(UUID, nullable=True)

      # Relationships
      role = relationship("Role")
      employee_type = relationship("EmployeeType")
      position = relationship("Position")
      store = relationship("Store")
      permissions = relationship("Permission", back_populates="user")
  ```

- [x] 2.3. Создать модель `Permission` в `app/domain/models.py`
  ```python
  class Permission(Base):
      __tablename__ = "permissions"

      id = Column(UUID, primary_key=True, default=uuid.uuid4)
      user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
      permission = Column(String(50), nullable=False)
      granted_at = Column(DateTime, default=datetime.utcnow)
      granted_by = Column(UUID, nullable=False)
      revoked_at = Column(DateTime, nullable=True)

      # Relationship
      user = relationship("User", back_populates="permissions")
  ```

- [x] 2.4. Создать Alembic миграцию для создания справочников
  - Таблицы: `roles`, `employee_types`, `positions`, `stores`
  - Заполнить справочники начальными данными:
    - roles: worker, manager
    - employee_types: штатный, временный
    - positions: ЗамДирПоТорговле, ПродавПрод, ПродУнивер, ДирСуперм, КасКасСамобсл
    - stores: базовые данные (если есть)

- [x] 2.5. Создать модель `UserSSOCache` для кэширования данных из SSO
  ```python
  class UserSSOCache(Base):
      __tablename__ = "user_sso_cache"

      user_id = Column(UUID, primary_key=True)
      first_name = Column(String(255), nullable=True)
      last_name = Column(String(255), nullable=True)
      middle_name = Column(String(255), nullable=True)
      email = Column(String(255), nullable=True)
      phone = Column(String(50), nullable=True)
      photo_url = Column(Text, nullable=True)
      gender = Column(String(10), nullable=True)
      birth_date = Column(Date, nullable=True)
      cached_at = Column(DateTime, default=datetime.utcnow, nullable=False)
      # Кэш действителен 24 часа
  ```

- [x] 2.6. Создать Alembic миграцию для таблиц `users` и `permissions`

- [x] 2.7. Создать Alembic миграцию для таблицы `user_sso_cache`

### Этап 3: Pydantic схемы

- [x] 3.1. Создать схемы для справочников в `app/domain/schemas.py`
  - `RoleResponse`, `EmployeeTypeResponse`, `PositionResponse`, `StoreResponse`

- [x] 3.2. Создать схемы для User в `app/domain/schemas.py`
  - `UserCreate`, `UserUpdate`, `UserResponse`
  - `PermissionResponse`, `PermissionsUpdate`

- [x] 3.3. Создать схему для `/users/me` endpoint
  ```python
  class UserMeResponse(BaseModel):
      # Локальные данные
      id: UUID
      external_id: Optional[str]
      role: Optional[RoleResponse]
      employee_type: Optional[EmployeeTypeResponse]
      position: Optional[PositionResponse]
      grade: Optional[int]
      store: Optional[StoreResponse]
      permissions: List[PermissionResponse]

      # Данные из SSO
      first_name: str
      last_name: str
      middle_name: Optional[str]
      email: Optional[str]
      phone: Optional[str]
      photo_url: Optional[str]
      gender: Optional[str]
      birth_date: Optional[date]
  ```

### Этап 4: SSO интеграция

- [x] 4.1. Создать `SSOService` в `app/services/sso_service.py`
  - Метод `get_user_info(user_id: UUID, token: str, db: Session)` — запрос к SSO API с авторизацией через токен
  - Обработка ошибок и таймаутов
  - **Кэширование**: проверка кэша (если данные свежее 24 часов — вернуть из кэша)
  - Если кэш устарел или отсутствует — запрос к SSO и обновление кэша
  - **Отказоустойчивость**: если SSO недоступен, а кэш устарел — логировать и вернуть устаревший кэш
  - Если SSO недоступен и кэша нет — вернуть HTTP 503

- [x] 4.2. Добавить настройки для SSO в `app/core/config.py`
  ```python
  SSO_BASE_URL: str = "https://api.beyondviolet.com/sys/v1"
  SSO_TIMEOUT: int = 5  # секунды
  SSO_CACHE_TTL: int = 86400  # время жизни кэша в секундах (24 часа)
  ```

- [x] 4.3. Реализовать логику кэширования в `SSOService`
  ```python
  async def get_user_info(self, user_id: UUID, token: str, db: Session):
      # 1. Проверить кэш
      cache = db.query(UserSSOCache).filter(
          UserSSOCache.user_id == user_id
      ).first()

      cache_is_fresh = False
      if cache:
          # Проверить, не устарел ли кэш (24 часа)
          cache_age = datetime.utcnow() - cache.cached_at
          cache_is_fresh = cache_age.total_seconds() < settings.SSO_CACHE_TTL

          if cache_is_fresh:
              logger.debug(f"Returning fresh SSO cache for user {user_id}")
              return cache  # Вернуть свежий кэш

      # 2. Если кэш отсутствует или устарел — попытка запроса к SSO
      try:
          headers = {"Authorization": f"Bearer {token}"}
          async with httpx.AsyncClient() as client:
              response = await client.get(
                  f"{settings.SSO_BASE_URL}/users/{user_id}/",
                  headers=headers,
                  timeout=settings.SSO_TIMEOUT
              )
              response.raise_for_status()

          # 3. Обновить кэш свежими данными из SSO
          sso_data = response.json()
          if cache:
              # Обновить существующую запись
              for key, value in sso_data.items():
                  if hasattr(cache, key):
                      setattr(cache, key, value)
              cache.cached_at = datetime.utcnow()
              logger.info(f"Updated SSO cache for user {user_id}")
          else:
              # Создать новую запись
              cache = UserSSOCache(
                  user_id=user_id,
                  cached_at=datetime.utcnow(),
                  **sso_data
              )
              db.add(cache)
              logger.info(f"Created SSO cache for user {user_id}")

          db.commit()
          db.refresh(cache)
          return cache

      except (httpx.TimeoutException, httpx.HTTPError, Exception) as e:
          # SSO недоступен
          if cache:
              # Если есть устаревший кэш — вернуть его
              logger.warning(
                  f"SSO unavailable for user {user_id}, returning stale cache. "
                  f"Error: {str(e)}, Cache age: {cache_age.total_seconds()}s"
              )
              return cache
          else:
              # Если кэша нет вообще — вернуть ошибку
              logger.error(
                  f"SSO unavailable for user {user_id} and no cache exists. "
                  f"Error: {str(e)}"
              )
              raise HTTPException(
                  status_code=503,
                  detail="SSO service unavailable and no cached data"
              )
  ```

### Этап 5: Repository и бизнес-логика

- [x] 5.1. Создать `UserRepository` в `app/repositories/user_repository.py`
  - `get_user(user_id: UUID)`
  - `create_user(...)`
  - `update_user(...)`
  - `get_user_with_permissions(user_id: UUID)`
  - `get_store_users(store_id: UUID)`

- [x] 5.2. Создать методы для работы с привилегиями в `UserRepository`
  - `get_active_permissions(user_id: UUID)`
  - `grant_permission(...)`
  - `revoke_permission(...)`
  - `update_permissions(...)` — аналог из RoleRepository

- [x] 5.3. Создать вспомогательные методы
  - `is_manager(user_id: UUID)`
  - `is_worker(user_id: UUID)`
  - `get_user_store_id(user_id: UUID)`

### Этап 6: API Endpoints

- [x] 6.1. Создать endpoint `GET /users/me` в `app/api/users.py`
  ```python
  @router.get("/me", response_model=UserMeResponse)
  async def get_current_user_info(
      request: Request,
      db: Session = Depends(get_db),
      current_user: CurrentUser = Depends(get_current_user),
      sso_service: SSOService = Depends(get_sso_service)
  ):
      # 1. Получить user_id из JWT
      user_id = UUID(current_user.user_id)

      # 2. Получить токен из заголовка Authorization
      token = request.headers.get("Authorization", "").replace("Bearer ", "")

      # 3. Получить локальные данные
      repo = UserRepository(db)
      user = repo.get_user_with_permissions(user_id)

      # 4. Получить данные из SSO (с кэшированием)
      sso_data = await sso_service.get_user_info(user_id, token, db)

      # 5. Склеить и вернуть
      return UserMeResponse(
          # Локальные данные
          id=user.id,
          external_id=user.external_id,
          role=user.role,
          employee_type=user.employee_type,
          position=user.position,
          grade=user.grade,
          store=user.store,
          permissions=[p for p in user.permissions if p.revoked_at is None],
          # SSO данные
          first_name=sso_data.first_name,
          last_name=sso_data.last_name,
          middle_name=sso_data.middle_name,
          email=sso_data.email,
          phone=sso_data.phone,
          photo_url=sso_data.photo_url,
          gender=sso_data.gender,
          birth_date=sso_data.birth_date
      )
  ```

- [x] 6.2. Создать CRUD endpoints для пользователей
  - `GET /users/` — список пользователей магазина (только MANAGER)
  - `GET /users/{user_id}` — данные пользователя (только MANAGER)
  - `POST /users/` — создать пользователя (только MANAGER)
  - `PATCH /users/{user_id}` — обновить данные (только MANAGER)

- [x] 6.3. Создать endpoints для привилегий
  - `GET /users/{user_id}/permissions` — получить привилегии
  - `PATCH /users/{user_id}/permissions` — обновить привилегии (только MANAGER)

- [x] 6.4. Создать endpoints для справочников (опционально)
  - `GET /roles/` — список ролей
  - `GET /employee-types/` — список типов сотрудников
  - `GET /positions/` — список должностей
  - `GET /stores/` — список магазинов

- [x] 6.5. Создать health check endpoint в `app/api/health.py`
  ```python
  @router.get("/health")
  def health_check():
      return {"status": "healthy", "service": "svc_users"}
  ```

### Этап 7: Настройка main.py и роутинг

- [x] 7.1. Создать `app/main.py` с базовой конфигурацией
  - Настроить FastAPI app с `root_path="/users"`
  - Добавить CORS middleware
  - Подключить роутеры

- [x] 7.2. Подключить все роутеры
  ```python
  app.include_router(users.router)
  app.include_router(health.router)
  ```

### Этап 8: Удаление старого кода из svc_tasks

- [x] 8.1. Удалить модели из `svc_tasks/app/domain/models.py`
  - `UserRole`
  - `WorkerPermission`

- [x] 8.2. Удалить API endpoints из `svc_tasks/app/api/users.py`
  - Все endpoints для ролей и привилегий

- [x] 8.3. Удалить `svc_tasks/app/repositories/role_repository.py`

- [x] 8.4. Удалить схемы ролей из `svc_tasks/app/domain/schemas.py`
  - `RoleType`, `PermissionType`, `UserRoleResponse`, etc.

- [x] 8.5. Удалить Alembic миграцию `001_add_user_roles_and_permissions.py`
  - Или создать новую миграцию для удаления таблиц

- [x] 8.6. Удалить документацию `svc_tasks/README_ROLES.md`

- [x] 8.7. Обновить `svc_tasks/app/main.py`
  - Убрать импорт `users` router

### Этап 9: Документация

- [x] 9.1. Создать `backend/svc_users/README.md`
  - Описание сервиса
  - Структура БД
  - API endpoints
  - Инструкции по запуску

- [x] 9.2. Создать документацию в Memory Bank
  - `.memory_bank/backend/svc_users.md` — описание сервиса
  - `.memory_bank/backend/api_users.md` — API контракты
  - `.memory_bank/domain/user_model.md` — доменная модель пользователя

## Технические детали

### Порты сервисов:
- `svc_tasks`: 8000 (app), 5432 (db)
- `svc_users`: 8001 (app), 5433 (db)

### Base URLs:
- `svc_tasks`: `/tasks`
- `svc_users`: `/users`

### Зависимости (requirements.txt):
```
fastapi==0.115.0
uvicorn[standard]==0.32.0
sqlalchemy==2.0.35
psycopg2-binary==2.9.10
alembic==1.14.0
pydantic==2.9.2
pydantic-settings==2.6.1
python-dotenv==1.0.1
PyJWT==2.10.1
cryptography==44.0.0
httpx==0.28.1  # для SSO интеграции

# Dev dependencies
pytest==8.3.4
pytest-asyncio==0.24.0
black==24.10.0
ruff==0.8.4
```

### Environment variables (.env):
```
DATABASE_URL=postgresql://wfm_user:wfm_password@db_users:5432/wfm_users
DEBUG=True
LOG_LEVEL=INFO
SSO_BASE_URL=https://api.beyondviolet.com/sys/v1
SSO_TIMEOUT=5
SSO_CACHE_TTL=86400
BV_PUBLIC_KEY_PATH=/app/bv_public_key.pem
```

## Стратегия отказоустойчивости

**При недоступности SSO API**:

1. **Кэш свежий (< 24 часов)** → вернуть кэш (SSO не вызывается)
2. **Кэш устарел (>= 24 часов), SSO доступен** → обновить кэш, вернуть свежие данные
3. **Кэш устарел, SSO недоступен** → залогировать warning, вернуть устаревший кэш
4. **Кэша нет, SSO недоступен** → вернуть HTTP 503 (Service Unavailable)

Логирование:
- `INFO` — успешное обновление кэша
- `WARNING` — возврат устаревшего кэша из-за недоступности SSO
- `ERROR` — SSO недоступен и кэша нет

## Риски и вопросы

1. **Формат external_id** — пока не известен, используем String(255)
2. **Справочник stores** — нужны данные для заполнения
3. **Миграция данных** — нужен план rollback в случае проблем
4. **Формат SSO ответа** — нужно проверить структуру JSON ответа от SSO API
5. **Мониторинг устаревшего кэша** — настроить алерты на частые warning о недоступности SSO

## Лог выполнения

### 2026-01-30 — План создан и выполнен (9 этапов из 9)

**Создание плана**:
- Проанализирована текущая структура svc_tasks
- Определена структура нового сервиса
- Уточнения:
  - SSO авторизация через Bearer token (не API ключ)
  - Кэширование SSO данных на 24 часа
  - Добавлена таблица `user_sso_cache` для хранения данных из SSO
  - Отказоустойчивость: при недоступности SSO и устаревшем кэше — логировать и отдавать устаревший кэш

**Выполнено**:
- ✅ Этап 1: Инфраструктура и базовая структура
- ✅ Этап 2: Модели данных и миграции (справочники, users, permissions, sso_cache)
- ✅ Этап 3: Pydantic схемы
- ✅ Этап 4: SSO интеграция с кэшированием и отказоустойчивостью
- ✅ Этап 5: Repository и бизнес-логика
- ✅ Этап 6: API Endpoints (GET /users/me, GET/PATCH users, permissions, health)
- ✅ Этап 7: Настройка main.py и роутинг
- ✅ Этап 8: Удаление старого кода из svc_tasks (модели, endpoints, миграция)
- ✅ Этап 9: Документация Memory Bank (3 документа)

**Результат**:
- Полностью функциональный микросервис svc_users (29 новых файлов)
- Чистый код в svc_tasks (удалён весь функционал ролей и привилегий)
- Полная документация в Memory Bank
- 2 коммита: создание сервиса + очистка старого кода
