# api_bv.md
**Legacy Auth API — авторизация, регистрация, доставка одноразового кода (OTP)**  
_Сервер авторизации Beyond Violet. Не изменяется WFM. Используется только как внешний OAuth2-провайдер._

## 0. Назначение документа

Этот документ описывает **внешний процесс авторизации и регистрации пользователей**, реализованный на сервере Beyond Violet.  

WFM **не генерирует** токены, **не проверяет** коды, **не доставляет** их пользователю.  
WFM только:

- вызывает наследуемые API,
- получает токены,
- проверяет JWT при каждом запросе.

## 1. Общие принципы авторизации

- Используется **OAuth2 bearer token** (JWT RS256).  
- Сервер Beyond Violet отвечает за:
  - выдачу одноразового кода (OTP),
  - регистрацию нового пользователя,
  - авторизацию существующего,
  - refresh токена,
  - выдачу `access_token` / `refresh_token`.
- Канал доставки кода (`channel`) выбирает **сервер**, а не клиент.
- Клиент отправляет только предпочтение (`notification_type`).

---

## 2. `POST https://api.beyondviolet.com/oauth/authorize/` — запрос на получение OTP

### 2.1 Поля запроса

`Content-Type: application/x-www-form-urlencoded`

| Поле | Значение |
|------|----------|
| phone | номер телефона |
| notification_type | `"phone_code"` или `"telegram_code"` |
| captcha | *опционально*, добавляется при повторе после ошибки captcha |
| forRegister | *опционально*, передаётся если сервер сообщил `AUTH_USER_NOT_EXISTS` |

### 2.2 Правила

- `notification_type` — **предпочтение** клиента.  
- `channel` — **решение сервера** (`call` / `sms` / `telegram`).  
- Если `notification_type = telegram_code` → ответ **всегда** `channel = telegram`.  
- Если `notification_type = phone_code` → ответ может быть `sms` или `call`.

---

### 2.3 Примеры ответов

#### ✓ Успех (telegram)

```json
{
  "status": {"code": ""},
  "data": {
    "channel": "telegram",
    "bot_username": "wellchoice_bot",
    "bot_start_payload": "Mi37E71r8E8OaCaN1PE79V4iks4",
    "expires_at": 1764880516.90
  }
}
```

#### ✓ Успех (call / sms)

```json
{
  "status": {"code": ""},
  "data": {
    "channel": "call",
    "expires_at": 1764905846.25
  }
}
```

#### ✗ Требуется капча

```json
{
  "status": {
    "code": "AUTH_CAPTCHA_REQUIRED",
    "message": "Для продолжения требуется ввод captcha"
  }
}
```

#### ✗ Пользователь не найден

```json
{
  "status": {
    "code": "AUTH_USER_NOT_EXISTS"
  }
}
```

---

## 3. `POST https://api.beyondviolet.com/oauth/authorize/` — регистрационный OTP

Отправляется повторно, если сервер вернул `AUTH_USER_NOT_EXISTS`.

### **Запрос**

```
phone=...
notification_type=...
captcha=...? 
signup=1
```

### **Ответ**

```json
{
  "data": {
    "channel": "telegram",
    "bot_username": "...",
    "bot_start_payload": "...",
    "expires_at": 1764883713.19
  }
}
```

---

## 4. Авторизация существующего пользователя  
### `POST https://api.beyondviolet.com/oauth/token/`

Используется для подтверждения одноразового кода (OTP).

### **Запрос**

```http
POST /oauth/token/
Content-Type: application/x-www-form-urlencoded
```

Поля:

```
grant_type=phone_code
app_id=...
app_secret=...
phone=...
code=...
```

### **Ответ**

```json
{
  "data": {
    "access_token": "...",
    "token_type": "Bearer",
    "refresh_token": "...",
    "expires_in": 86400
  }
}
```

---

## 5. Регистрация нового пользователя  
### `POST https://shopping.beyondviolet.com/api/account/register/`

Используется после успешного OTP-запроса с `forRegister=1`.

### **Запрос**

```
POST https://shopping.beyondviolet.com/api/account/register
Content-Type: application/x-www-form-urlencoded
```

Поля:

- `app_id`
- `phone`
- `code`
- `first_name`
- `last_name`
- `gender`
- `city_id` — временно всегда = **1**
- `birth_date`
- `device_name`

### **Ответ**

```json
{
  "id": 734057,
  "device_secret": "...",
  "oauth": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 86400
  }
}
```

---

## 6. Доставка одноразового кода

### Telegram
- код приходит от `wellchoice_bot`;
- пользователь вводит его вручную (возможен будущий deep-link с авто-вставкой кода).

### SMS
- обычное SMS с кодом.

### Call
- код = **последние 4 цифры номера входящего вызова**.

---

## 7. Refresh токена  
### `POST https://api.beyondviolet.com/oauth/token/`

```
grant_type=refresh_token
refresh_token=...
app_id=...
```

### **Ответ**

```json
{
  "data": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 900
  }
}
```

Если сервер вернёт ошибку → требуется полная переавторизация.

---

## 8. Logout

```
DELETE /api/auth/
```

Ответ всегда:

```
401 Unauthorized
```

Клиент обязан удалить токены локально.

---

## 9. Ошибки сервера авторизации

| Код | Значение |
|------|---------|
| AUTH_CAPTCHA_REQUIRED | требуется ввод captcha |
| AUTH_USER_NOT_EXISTS | пользователь не найден |
| 7 | неверный код подтверждения |
| token_expired | токен просрочен |
| invalid_token | подпись или структура токена неверна |

---

## 10. Обязательные заголовки в запросах

```
X-Device-Id
X-App-Version
X-App-Domain
X-Store-Id
X-Requested-With
```

Геоданные могут также отправляться приложением:

```
x-geo-ts
x-geo-acc
x-lat
x-lng
```

---

## 11. Правило формирования `device_name` (Android)

```
{Manufacturer} {Model} SDK:{ApiLevel}
```

Примеры:

```
Samsung Galaxy S24 SDK:34
Google Pixel 8 SDK:34
```
