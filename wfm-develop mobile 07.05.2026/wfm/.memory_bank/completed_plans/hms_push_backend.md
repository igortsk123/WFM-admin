# План: HMS Push Kit — поддержка на Backend

**Статус:** Выполнено
**Создан:** 2026-04-01
**Последнее обновление:** 2026-04-01

## Цель

Добавить поддержку Huawei Push Kit в `svc_notifications`:
- Регистрация HMS-токенов через существующий endpoint
- Отправка push-уведомлений через HMS Push Kit API
- Обратная совместимость со старыми клиентами (ANDROID → AND)

---

## Задачи

### 1. База данных и миграции

- [x] **Миграция 002**: добавить `token_type VARCHAR(10) DEFAULT 'fcm'` в `device_tokens`
- [x] **Миграция 002**: добавить индекс `idx_device_tokens_type ON device_tokens(token_type)`
- [x] **Миграция 002**: переименовать все существующие `platform = 'ANDROID'` → `'AND'`
- [x] **Миграция 002**: обновить все существующие `platform = 'IOS'` → `'IOS'` (без изменений, просто для ясности)

Файл: `alembic/versions/002_add_token_type_rename_platforms.py`

### 2. SQLAlchemy модель (`app/domain/models.py`)

- [x] Добавить поле `token_type: String(10)` с `default='fcm'` в модель `DeviceToken`
- [x] Изменить max-length поля `platform` c `String(10)` на `String(10)` (уже OK, `AND`/`HUA`/`IOS` <= 10 символов)
- [x] Изменить max-length поля `token` c `String(500)` на `String(500)` (HMS токены до 256 — OK)

### 3. Pydantic схемы (`app/domain/schemas.py`)

- [x] Переименовать `DevicePlatform.ANDROID` → `DevicePlatform.AND`; добавить `DevicePlatform.HUA = "HUA"`
- [x] Добавить новый enum `TokenType` с значениями `FCM = "fcm"` и `HMS = "hms"`
- [x] Обновить `DeviceTokenRegister`: добавить `token_type: Optional[TokenType] = TokenType.FCM`
- [x] Обновить `DeviceTokenResponse`: добавить `token_type: str`

### 4. Репозиторий (`app/repositories/notification_repository.py`)

- [x] Обновить метод `DeviceTokenRepository.register()`:
  - Принимать `token_type: str = "fcm"`
  - При регистрации сохранять `token_type` в БД
  - При обновлении существующего токена также обновлять `token_type`

### 5. API endpoint (`app/api/notifications.py`)

- [x] Обновить `POST /devices/tokens`:
  - Добавить логику: если `body.platform == "ANDROID"` (старый клиент) → сохранять в БД как `"AND"`, `token_type = "fcm"`
  - Передавать `body.token_type` в репозиторий
  - Логировать `token_type` в info-сообщение

### 6. HMS Push клиент (`app/services/hms_client.py`)

- [x] Создать файл `app/services/hms_client.py`
- [x] Реализовать получение OAuth access token от `https://oauth-login.cloud.huawei.com/oauth2/v3/token`
- [x] Реализовать кэширование access token (expires_in из ответа, с запасом ~60 сек)
- [x] Реализовать `send_push(token, title, body, data)` → POST на `https://push-api.cloud.huawei.com/v1/{app_id}/messages:send`
- [x] Обработка ошибок:
  - `80000000` / `80100003` — токен невалиден → деактивировать в БД
  - `80200003` — access_token истёк → обновить и повторить один раз
- [x] Функция инициализации `init_hms(app_id, client_secret)` — аналогично `init_fcm`

### 7. Конфигурация (`app/core/config.py` + `.env.example`)

- [x] Добавить в `Settings`:
  - `HMS_APP_ID: str = ""`
  - `HMS_CLIENT_SECRET: str = ""`
  - `HMS_OAUTH_URL: str = "https://oauth-login.cloud.huawei.com/oauth2/v3/token"`
  - `HMS_PUSH_URL: str = "https://push-api.cloud.huawei.com/v1"`
  - `@property hms_enabled: bool` = bool(HMS_APP_ID and HMS_CLIENT_SECRET)
- [x] Добавить в `.env.example` блок HMS переменных

### 8. Инициализация приложения (`app/main.py`)

- [x] Добавить вызов `init_hms(settings.HMS_APP_ID, settings.HMS_CLIENT_SECRET)` в `lifespan`

### 9. Delivery Engine (`app/services/delivery_engine.py`)

- [x] Обновить функцию `_deliver_push()`:
  - Группировать токены по `token_type`: `fcm_tokens` и `hms_tokens`
  - Отправлять FCM токены через `fcm_client.send_push()`
  - Отправлять HMS токены через `hms_client.send_push()`
  - Деактивировать невалидные токены (по результату ответа)
  - Суммировать результаты для логирования

### 10. Документация Memory Bank и очистка

- [x] Обновить `.memory_bank/backend/api_notifications.md`:
  - Обновить описание `POST /devices/tokens` (новые поля platform, token_type)
  - Указать backward compat: `ANDROID` принимается, сохраняется как `AND`
- [x] Обновить `.memory_bank/backend/hms_push_support.md`:
  - Пометить выполненные пункты в разделе "Миграция"
- [x] Проверить `.memory_bank/mobile/architecture/multi_platform_builds.md` на актуальность
- [x] Удалить `.memory_bank/backend/hms_push_support.md` — временный документ от mobile команды, вся информация перенесена в реализацию и документацию

---

## Зависимости между задачами

```
1 (миграция БД)
  ↓
2 (модель) → 3 (схемы) → 4 (репозиторий) → 5 (API)
                                                ↓
7 (конфиг) → 6 (HMS клиент) → 8 (main.py) → 9 (delivery engine)
                                                ↓
                                           10 (документация)
```

---

## Обратная совместимость

| Старый клиент (ANDROID) | Новый AND клиент | Новый HUA клиент |
|------------------------|-----------------|-----------------|
| `platform: "ANDROID"`  | `platform: "AND"` | `platform: "HUA"` |
| `token_type` не шлёт   | `token_type: "fcm"` | `token_type: "hms"` |
| Сохраняется как `AND` + `fcm` | `AND` + `fcm` | `HUA` + `hms` |

---

## Лог выполнения

### 2026-04-01
- Создан план на основе анализа codebase и файла `hms_push_support.md`
- Выполнены все задачи плана:
  - Миграция `002_add_token_type_rename_platforms.py`
  - Обновлены `models.py`, `schemas.py`, `config.py`, `.env.example`
  - Обновлены `notification_repository.py`, `api/notifications.py`
  - Создан `app/services/hms_client.py`
  - Обновлены `main.py`, `delivery_engine.py`
  - Обновлена документация `api_notifications.md`
  - Удалён временный файл `hms_push_support.md`
