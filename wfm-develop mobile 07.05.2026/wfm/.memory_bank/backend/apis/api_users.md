# API Users — Endpoints управления пользователями

## Базовый URL

`/users`

## Аутентификация

Все endpoints требуют JWT токен в заголовке:

```
Authorization: Bearer <token>
```

Токен выдается SSO сервисом Beyond Violet и содержит:
- `u` — UUID пользователя
- `exp` — время истечения токена

## Служебные endpoints

См. `.memory_bank/backend/patterns/service_endpoints.md`

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/` | Информация о сервисе |
| GET | `/health` | Health check |

## Endpoints

### GET /users/me

Получить полную информацию о текущем пользователе.

Склеивает данные из локальной БД (роль, тип, должность, магазин, привилегии) с данными из SSO API (ФИО, email, телефон, фото).

**Авторизация**: Требуется

**Query параметры**: Нет

**Тело запроса**: Нет

**Ответ**: 200 OK

```json
{
  "id": 42,
  "sso_id": "550e8400-e29b-41d4-a716-446655440000",
  "external_id": 12345,
  "employee_type": {
    "id": 1,
    "code": "permanent",
    "name": "Штатный сотрудник",
    "description": "Постоянный сотрудник в штате компании"
  },
  "permissions": [
    {
      "id": "750e8400-e29b-41d4-a716-446655440000",
      "permission": "SALES_FLOOR",
      "granted_at": "2026-01-20T10:00:00",
      "granted_by": 7
    }
  ],
  "assignments": [
    {
      "id": 1,
      "external_id": 12345,
      "position": {"id": 2, "code": "prodav_prod", "name": "Продавец продовольственных товаров", "role": {"id": 1, "code": "worker", "name": "Работник"}},
      "rank": null,
      "store": {
        "id": 5,
        "name": "Магазин №1",
        "address": "ул. Ленина, 42",
        "external_code": "SHOP001",
        "created_at": "2025-06-01T12:00:00"
      }
    }
  ],
  "first_name": "Иван",
  "last_name": "Иванов",
  "middle_name": "Иванович",
  "email": "ivanov@example.com",
  "phone": "+79001234567",
  "photo_url": "https://example.com/photos/user.jpg",
  "gender": "male",
  "birth_date": "1990-05-15"
}
```

**Особенности**:
- Если пользователя нет в локальной БД — автоматически создается запись
- SSO данные кэшируются на 24 часа
- При недоступности SSO возвращается устаревший кэш (если есть)
- Если SSO недоступен и кэша нет — возвращается HTTP 503
- **Приоритет ФИО:** LAMA cache → `users.first_name/last_name/middle_name` → SSO cache; локальные поля используются для партнёрских пользователей, у которых SSO не содержит ФИО

**Ошибки**:
- 401 Unauthorized — токен отсутствует или невалиден
- 503 Service Unavailable — SSO недоступен и кэша нет

---

### DELETE /users/me

Удалить учётную запись текущего пользователя.

Передаёт запрос в `DELETE https://shopping.beyondviolet.com/api/account/` с Bearer токеном пользователя. Локальные данные в WFM не удаляются — они загружаются из LAMA и устаревают сами.

**Авторизация**: Требуется

**Тело запроса**: Нет

**Ответ**: 200 OK

```json
{ "status": { "code": "" }, "data": null }
```

**Ошибки**:
- 401 Unauthorized — токен отсутствует или невалиден
- 400 Bad Request — SSO сервис не смог удалить аккаунт
- 408 Request Timeout — SSO сервис не ответил (10 сек таймаут)

**Конфигурация**:
- `ACCOUNT_DELETE_URL` — URL SSO endpoint (по умолчанию `https://shopping.beyondviolet.com/api/account/`)
- `ACCOUNT_DELETE_TIMEOUT` — таймаут запроса в секундах (по умолчанию 10)

---

### GET /users/{user_id}

Получить данные пользователя по ID (только MANAGER).

**Авторизация**: Требуется (роль MANAGER)

**Path параметры**:
- `user_id` (int) — внутренний integer ID пользователя

**Query параметры**: Нет

**Тело запроса**: Нет

**Ответ**: 200 OK

```json
{
  "id": 42,
  "sso_id": "550e8400-e29b-41d4-a716-446655440000",
  "external_id": 12345,
  "employee_type": { ... },
  "permissions": [ ... ],
  "assignments": [ ... ],
  "updated_at": "2026-01-25T14:30:00"
}
```

**Бизнес-правила**:
- Управляющий может просматривать только пользователей своего магазина
- Возвращаются только локальные данные (без SSO)

**Ошибки**:
- 401 Unauthorized — токен отсутствует или невалиден
- 403 Forbidden — пользователь не MANAGER или из другого магазина
- 404 Not Found — пользователь не найден

---

### PATCH /users/{user_id}

Обновить данные пользователя (только MANAGER).

**Авторизация**: Требуется (роль MANAGER)

**Path параметры**:
- `user_id` (int) — внутренний integer ID пользователя

**Тело запроса**:

```json
{
  "external_id": "LAMA_54321",
  "role_id": 2,
  "type_id": 1,
  "position_id": 3,
  "grade": 4,
  "store_id": "650e8400-e29b-41d4-a716-446655440000",
  "first_name": "Иван",
  "last_name": "Иванов",
  "middle_name": "Иванович"
}
```

Все поля опциональны. Обновляются только переданные поля.
`first_name`, `last_name`, `middle_name` — задаются вручную для партнёрских пользователей (используются как промежуточный приоритет между LAMA и SSO).

**Ответ**: 200 OK

```json
{
  "id": 42,
  "sso_id": "550e8400-e29b-41d4-a716-446655440000",
  "external_id": 54321,
  "employee_type": { ... },
  "permissions": [ ... ],
  "assignments": [ ... ],
  "updated_at": "2026-01-30T15:00:00"
}
```

**Бизнес-правила**:
- Управляющий может обновлять только пользователей своего магазина
- Поле `updated_by` автоматически устанавливается в ID текущего пользователя
- Поле `updated_at` автоматически обновляется

**Ошибки**:
- 401 Unauthorized — токен отсутствует или невалиден
- 403 Forbidden — пользователь не MANAGER или из другого магазина
- 404 Not Found — пользователь не найден

---

### PATCH /users/{user_id}/permissions

Обновить список привилегий пользователя (только MANAGER).

Управляющий отправляет полный список привилегий, которые должны быть у пользователя. Система автоматически:
- Добавляет новые привилегии (которых не было)
- Отзывает (soft delete) привилегии, которых нет в новом списке

**Авторизация**: Требуется (роль MANAGER)

**Path параметры**:
- `user_id` (int) — внутренний integer ID пользователя

**Тело запроса**:

```json
{
  "permissions": ["SALES_FLOOR", "CASHIER"]
}
```

**Ответ**: 200 OK

```json
{
  "id": 42,
  "sso_id": "550e8400-e29b-41d4-a716-446655440000",
  "external_id": 12345,
  "employee_type": { ... },
  "assignments": [ ... ],
  "permissions": [
    {
      "id": "750e8400-e29b-41d4-a716-446655440000",
      "permission": "SALES_FLOOR",
      "granted_at": "2026-01-20T10:00:00",
      "granted_by": 7
    },
    {
      "id": "760e8400-e29b-41d4-a716-446655440000",
      "permission": "CASHIER",
      "granted_at": "2026-01-30T15:30:00",
      "granted_by": 7
    }
  ],
  "updated_at": "2026-01-30T15:30:00"
}
```

**Типы привилегий**:
- `CASHIER` — работа на кассе
- `SALES_FLOOR` — работа в торговом зале
- `SELF_CHECKOUT` — касса самообслуживания
- `WAREHOUSE` — работа на складе

**Workflow**:
1. `GET /users/{user_id}` → получить текущие привилегии
2. Внести изменения (добавить/удалить привилегии в UI)
3. `PATCH /users/{user_id}/permissions` → отправить обновлённый список

**Бизнес-правила**:
- Управляющий может обновлять привилегии только пользователей своего магазина
- Отозванные привилегии помечаются `revoked_at`, но не удаляются (soft delete)
- Поле `granted_by` устанавливается в ID текущего пользователя

**Ошибки**:
- 400 Bad Request — пользователь не найден или ошибка валидации
- 401 Unauthorized — токен отсутствует или невалиден
- 403 Forbidden — пользователь не MANAGER или из другого магазина
- 404 Not Found — пользователь не найден

---

## Модели данных

### UserMeResponse

Полная информация о пользователе (локальные данные + SSO).

```typescript
interface UserMeResponse {
  // Локальные данные
  id: number;                          // internal integer PK
  sso_id: string;                      // UUID из SSO/JWT
  external_id: number | null;          // Внешний ID из LAMA
  employee_type: EmployeeTypeResponse | null;
  permissions: PermissionResponse[];
  assignments: AssignmentResponse[];

  // ФИО (приоритет: LAMA cache → users.first_name → SSO cache)
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;

  // SSO данные
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  gender: string | null;
  birth_date: string | null;           // YYYY-MM-DD
}
```

### UserResponse

Локальные данные пользователя (без SSO).

```typescript
interface UserResponse {
  id: number;                          // internal integer PK
  sso_id: string;                      // UUID из SSO/JWT
  external_id: number | null;
  employee_type: EmployeeTypeResponse | null;
  permissions: PermissionResponse[];
  assignments: AssignmentResponse[];
  updated_at: string;                  // ISO 8601
}
```

### PermissionResponse

```typescript
interface PermissionResponse {
  id: string;                          // UUID (PK самой записи — остался UUID)
  permission: "CASHIER" | "SALES_FLOOR" | "SELF_CHECKOUT" | "WAREHOUSE";
  granted_at: string;                  // ISO 8601
  granted_by: number;                  // internal integer ID менеджера
}
```

### RoleResponse, EmployeeTypeResponse, PositionResponse

```typescript
interface RoleResponse {
  id: number;
  code: string;
  name: string;
  description: string | null;
}
```

## Коды ошибок

- **400 Bad Request** — ошибка валидации или бизнес-логики
- **401 Unauthorized** — токен отсутствует или невалиден
- **403 Forbidden** — недостаточно прав для выполнения операции
- **404 Not Found** — ресурс не найден
- **503 Service Unavailable** — внешний сервис (SSO) недоступен

## Примеры использования

### Получение информации о текущем пользователе

```bash
curl -X GET http://localhost:8001/users/me \
  -H "Authorization: Bearer <token>"
```

### Обновление привилегий пользователя

```bash
curl -X PATCH http://localhost:8001/users/{user_id}/permissions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": ["SALES_FLOOR", "CASHIER"]
  }'
```

---

## Endpoints: Магазины

### GET /stores
Получить список всех магазинов.

### POST /stores
Создать магазин.

**Request Body:**
```json
{ "name": "Магазин на Ленина", "address": "ул. Ленина, 42", "external_code": "SHOP001" }
```

### GET /stores/{id}
Получить магазин по ID.

### PATCH /stores/{id}
Обновить магазин.

---

## Internal Endpoints (межсервисные)

Без JWT, доступны только из Docker-сети.

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/internal/id-by-sso?sso_id=<uuid>` | Получить internal integer ID по SSO UUID (для svc_tasks, svc_shifts) → `{"id": 42, "sso_id": "..."}` |
| GET | `/internal/assignment-external-id?assignment_id=X` | Получить external_id по assignment_id (для svc_shifts LAMA sync) |
| GET | `/internal/assignment-store?assignment_id=X` | Получить данные магазина по assignment_id (для svc_shifts) |
| GET | `/internal/store-assignments?store_id=X` | Получить все назначения магазина с данными пользователей (для svc_tasks) → `{"assignments": [{assignment_id, user_id, first_name, last_name, middle_name, position}]}` |
| GET | `/internal/store-by-id?store_id=X` | Получить магазин по ID |
| GET | `/internal/store-by-code?code=X` | Получить или создать магазин по external_code (для LAMA sync) |
| GET | `/internal/id-by-phone?phone=<str>` | Получить internal integer ID по номеру телефона (для impersonation в svc_tasks) → `{"id": 42}` или 404 |

---

## Итог

**Служебные endpoints (Base URL: /users/):**
- `GET /` — информация о сервисе
- `GET /health` — health check

**Основные endpoints (Base URL: /users/):**
- `GET /me` — получить данные текущего пользователя (с SSO)
- `DELETE /me` — удалить учётную запись (через SSO)
- `GET /{user_id}` — получить данные пользователя (MANAGER)
- `PATCH /{user_id}` — обновить данные пользователя (MANAGER)
- `PATCH /{user_id}/permissions` — обновить привилегии (MANAGER)
- `GET/POST /stores` — CRUD магазинов
- `GET/PATCH /stores/{id}` — CRUD магазина по ID

**Internal endpoints (без JWT):**
- `GET /internal/id-by-sso?sso_id=<uuid>` — internal integer ID по SSO UUID (svc_tasks, svc_shifts)
- `GET /internal/assignment-external-id?assignment_id=X` — external_id для LAMA sync (svc_shifts)
- `GET /internal/assignment-store?assignment_id=X` — данные магазина по assignment_id (svc_shifts, svc_tasks)
- `GET /internal/store-assignments?store_id=X` — все назначения магазина с данными пользователей (svc_tasks)
- `GET /internal/store-by-id?store_id=X` — магазин по ID
- `GET /internal/store-by-code?code=X` — магазин по external_code (LAMA sync)
- `GET /internal/id-by-phone?phone=<str>` — internal integer ID по номеру телефона (impersonation, svc_tasks)

**Ключевые правила:**
- Управляющий видит только пользователей своего магазина
- SSO данные кэшируются на 24 часа
- Привилегии отзываются через soft delete
- Магазины связаны с назначениями (`Assignment.store_id → Store.id`)
