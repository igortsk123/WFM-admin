# Auth Validation — Правила валидации авторизации и регистрации

Единые правила валидации данных авторизации и регистрации для всех платформ.

**Связанные документы:**
- `.memory_bank/backend/external/api_bv.md` — API спецификация и коды ошибок

---

## 1. Номер телефона

**Формат:** `+7XXXXXXXXXX` (+ и 10 цифр)
**Regex:** `^\+7\d{10}$`

**Автоформатирование:**
- `8...` → `+7...`
  `7...` → `+7...`
- Пустой ввод → добавить `+7`

---

## 2. Код подтверждения (OTP)

**Формат:** 4 цифры
**Regex:** `^\d{4}$`

---

## 3. Данные регистрации

| Поле | Тип | Формат | Обязательно |
|------|-----|--------|-------------|
| `first_name` | string | любой текст, не пустой | да |
| `last_name` | string | любой текст, не пустой | да |
| `birth_date` | string | `DD.MM.YYYY` | да |
| `gender` | string | `male` или `female` | да |
| `city_id` | integer | всегда `1` (временно) | да |
| `device_name` | string | `{Manufacturer} {Model} SDK:{ApiLevel}` (Android) | да |

**Примеры device_name:**
- Android: `Samsung Galaxy S24 SDK:34`
- iOS: `iPhone 15 Pro iOS:17.2`

---

## 4. Канал доставки кода (channel)

### Выбор пользователя (notification_type)

Пользователь выбирает предпочтительный способ через таб бар на экране ввода номера:
- **"Telegram"** → отправляется `notification_type=telegram_code`
- **"Телефон"** → отправляется `notification_type=phone_code`

### Решение сервера (channel)

Сервер выбирает фактический канал доставки на основе `notification_type` и доступности.

| Значение | Как приходит код |
|----------|------------------|
| `telegram` | Сообщение в Telegram (от бота) |
| `sms` | SMS с 4-значным кодом |
| `call` | Входящий звонок, код = последние 4 цифры номера |

**Связь notification_type → channel:**
- `notification_type=telegram_code` → всегда `channel=telegram`
- `notification_type=phone_code` → `channel=sms` или `channel=call` (решает сервер)

**Дополнительные поля для telegram:**
- `bot_username` — имя бота (используется для формирования deep link)
- `bot_start_payload` — payload для deep link (опционально)

**Формирование deep link:**
- Базовый: `https://t.me/{bot_username}`
- С payload: `https://t.me/{bot_username}?start={bot_start_payload}`

Подробнее: `.memory_bank/backend/external/api_bv.md` (раздел 6).

---

## 5. Таймер истечения кода (expires_at)

**Формат:** Unix timestamp (float)
**Пример:** `1764880516.90`

**Расчет оставшегося времени:**
```
remaining_seconds = expires_at - current_time
```

**Отображение:**
- Формат: `MM:SS`
- Если `remaining_seconds > 0` → показать таймер, кнопка "Отправить повторно" неактивна
- Если `remaining_seconds <= 0` → скрыть таймер, кнопка "Отправить повторно" активна

**Обновление:** Каждую секунду уменьшать таймер.

**Повторная отправка:** Сервер возвращает новый `expires_at`, канал может измениться.

---

## 6. Таймауты HTTP запросов

| Запрос | Timeout |
|--------|---------|
| Отправка кода | 10 секунд |
| Подтверждение кода | 10 секунд |
| Регистрация | 15 секунд |

---

## 7. Обработка ответов сервера

**Формат большинства ответов (BVResponse):**
```json
{
  "status": {
    "code": "",      // пустая строка = успех
    "message": ""
  },
  "data": { ... }
}
```

**Определение успеха:**
- `status.code == ""` → успех, обрабатывать `data`
- `status.code != ""` → ошибка, обработать код или показать `status.message`

**Исключение — endpoint регистрации** (`POST /api/account/register` на `shopping.beyondviolet.com`):
- **Успех (HTTP 200):** данные возвращаются напрямую, без обёртки BVResponse:
  ```json
  { "id": 123, "device_secret": "...", "oauth": { "access_token": "...", ... } }
  ```
- **Ошибка (HTTP 403):** возвращает JSON со `status`:
  ```json
  { "code": 7, "error": "...", "status": { "code": "7", "message": "..." } }
  ```
  Обрабатывать через `status.code` / `status.message`.

**429 Too Many Requests:** nginx возвращает HTML без JSON. Перехватывать по HTTP статусу до попытки декодировать JSON. Показывать: "Слишком много попыток. Попробуйте позже".

**Коды ошибок:** См. `.memory_bank/backend/external/api_bv.md` (раздел 9).

---

## 8. Стратегия валидации

**Клиент:** Валидирует формат перед отправкой
**Сервер:** Валидирует бизнес-логику (существование номера, корректность кода, капча)
