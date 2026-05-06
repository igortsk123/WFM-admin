# Валидация JWT токенов в сервисах WFM

## Обзор

WFM принимает JWT токены от внешнего сервера авторизации Beyond Violet. Все сервисы WFM **не выпускают** токены самостоятельно, а только **проверяют** валидность полученных токенов при каждом HTTP-запросе.

**Основные принципы:**
- Тип токена: Bearer JWT с подписью RS256 (RSA SHA-256)
- Авторизация делегирована внешнему сервису Beyond Violet
- Сервисы WFM только проверяют подпись и актуальность токена
- Refresh токенов выполняет клиент через Beyond Violet API

---

## Источник публичного ключа

### Формат ключа

Публичный RSA-ключ предоставляется в формате PEM (Privacy Enhanced Mail):

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----
```

### Передача ключа в сервис

**Вариант 1: Переменная окружения (многострочное значение)**

```env
BV_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----"
```

**Вариант 2: Путь к файлу**

```env
BV_PUBLIC_KEY_PATH=/etc/secrets/bv_public_key.pem
```

### Ротация ключей

При ротации публичного ключа на стороне Beyond Violet:

1. Обновить переменную окружения или файл с ключом
2. Перезапустить сервис для применения нового ключа
3. В продакшене рекомендуется использовать систему управления секретами (Kubernetes Secrets, AWS Secrets Manager, etc.)

---

## Алгоритм валидации токена

### Шаг 1: Извлечение Bearer токена

Токен передаётся в HTTP-заголовке:

```
Authorization: Bearer <access_token>
```

Извлекаем значение после префикса `Bearer `.

**Ошибка**: Если заголовок отсутствует или не содержит префикс Bearer → **401 Unauthorized** с кодом `token_missing`.

---

### Шаг 2: Разбор JWT без верификации (опционально)

Для предварительной проверки можно разобрать токен без верификации подписи:

```python
import jwt

# Разбор без проверки подписи (только для чтения заголовка и payload)
unverified_payload = jwt.decode(token, options={"verify_signature": False})
```

Это позволяет быстро проверить базовую структуру токена перед дорогостоящей проверкой подписи.

---

### Шаг 3: Проверка подписи по публичному ключу

Проверяем подпись токена с использованием публичного RSA-ключа:

```python
import jwt

try:
    payload = jwt.decode(
        token,
        public_key,  # RSA публичный ключ в формате PEM
        algorithms=["RS256"],
        options={
            "verify_signature": True,
            "verify_exp": True,
            "require_exp": True,
        },
        leeway=60  # допустимое рассинхронизация часов (clock skew)
    )
except jwt.ExpiredSignatureError:
    # Токен истёк
    raise TokenExpiredError()
except jwt.InvalidTokenError:
    # Невалидная подпись или структура
    raise InvalidTokenError()
```

---

### Шаг 4: Проверка обязательных клеймов

После успешной верификации подписи проверяем наличие обязательных полей:

**⚠️ Важно:** Beyond Violet использует **нестандартный формат** JWT токенов.

| Клейм | Тип | Описание | Обязательное |
|-------|-----|----------|--------------|
| `u` | string | User ID (UUID) | ✅ |
| `exp` | int | Expiration time (Unix timestamp) | ✅ |
| `app_id` | int | Application ID | ✅ |
| `device_id` | string | Device identifier | ✅ |
| `role` | string | User role (courier, admin, etc.) | ❌ |
| `scope` | string | Access scope | ❌ |
| `flags` | object | Additional flags | ❌ |

**Пример payload от Beyond Violet:**

```json
{
  "u": "409809c4-382d-45bc-adbd-78f9be3cafd4",
  "exp": 1766645129,
  "app_id": 5,
  "device_id": "AND12d258221e83cea1com.beyondviolet.rost.worker",
  "role": "courier",
  "scope": "",
  "flags": {}
}
```

**Проверка:**

```python
# Beyond Violet использует 'u' вместо стандартного 'sub'
if not payload.get("u"):
    raise InvalidTokenError("Отсутствует обязательное поле 'u' (user_id)")
```

---

### Шаг 5: Учёт clock skew

**Clock skew** — допустимое рассинхронизация времени между сервером авторизации и сервисом WFM.

Рекомендуемое значение: **30–60 секунд**.

Это позволяет избежать ложных отказов из-за небольших расхождений системных часов.

```python
jwt.decode(
    token,
    public_key,
    algorithms=["RS256"],
    leeway=60  # 60 секунд допустимого расхождения
)
```

---

## Обработка ошибок

### Коды ошибок

| Код | HTTP Status | Описание |
|-----|-------------|----------|
| `token_missing` | 401 | Отсутствует заголовок Authorization или токен |
| `token_invalid` | 401 | Невалидная подпись, структура или клеймы |
| `token_expired` | 401 | Токен истёк (exp < current_time) |

### Пример HTTP-ответа 401

```json
{
  "detail": {
    "code": "token_expired",
    "message": "Токен истёк, требуется обновление"
  }
}
```

**Заголовки:**

```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer
Content-Type: application/json
```

---

## Требования к защите эндпоинтов

### Защищённые эндпоинты

Все **бизнес-эндпоинты** сервисов WFM требуют валидный JWT токен:

- `/tasks` - все CRUD операции с задачами
- `/tasks/{id}` - получение/обновление задачи
- `/tasks/{id}/start`, `/pause`, `/resume`, `/complete` - управление состояниями

### Публичные эндпоинты

Следующие эндпоинты **не требуют** аутентификации:

- `/` - информация о сервисе
- `/health` - health check для мониторинга
- `/docs` - Swagger UI документация (опционально в dev)
- `/redoc` - ReDoc документация (опционально в dev)

---

## Пример конфигурации для FastAPI

### Структура файлов

```
app/
├── core/
│   ├── config.py       # Конфигурация
│   └── auth.py         # Модуль аутентификации
└── api/
    └── tasks.py        # API эндпоинты с защитой
```

### config.py

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # JWT Authentication
    BV_PUBLIC_KEY: str = ""
    BV_PUBLIC_KEY_PATH: Optional[str] = None
    JWT_CLOCK_SKEW: int = 60

    class Config:
        env_file = ".env"
```

### auth.py

```python
import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer

security = HTTPBearer(auto_error=False)

def get_current_user(credentials = Security(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail={
            "code": "token_missing",
            "message": "Требуется токен авторизации"
        })

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.BV_PUBLIC_KEY,
            algorithms=["RS256"],
            leeway=settings.JWT_CLOCK_SKEW
        )
        # Beyond Violet использует 'u' вместо 'sub'
        user_id = payload.get("u")
        if not user_id:
            raise jwt.InvalidTokenError("Missing 'u' field")
        return CurrentUser(user_id=user_id)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail={
            "code": "token_expired",
            "message": "Токен истёк"
        })
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail={
            "code": "token_invalid",
            "message": "Невалидный токен"
        })
```

### tasks.py

```python
from fastapi import APIRouter, Depends
from app.core.auth import get_current_user, CurrentUser

router = APIRouter()

@router.get("/tasks")
def get_tasks(current_user: CurrentUser = Depends(get_current_user)):
    # Защищённый эндпоинт
    return {"user_id": current_user.user_id}
```

---

## Пример конфигурации для других платформ

### Node.js (Express)

```javascript
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 'token_missing',
      message: 'Требуется токен авторизации'
    });
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, process.env.BV_PUBLIC_KEY, {
      algorithms: ['RS256'],
      clockTolerance: 60
    });
    req.user = { sub: payload.sub };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 'token_expired' });
    }
    return res.status(401).json({ code: 'token_invalid' });
  }
};
```

### Go (Gin)

```go
import (
    "github.com/golang-jwt/jwt/v5"
    "github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
            c.JSON(401, gin.H{"code": "token_missing"})
            c.Abort()
            return
        }

        tokenString := strings.TrimPrefix(authHeader, "Bearer ")

        token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
            return publicKey, nil
        })

        if err != nil || !token.Valid {
            c.JSON(401, gin.H{"code": "token_invalid"})
            c.Abort()
            return
        }

        c.Next()
    }
}
```

---

## Refresh токенов

### Правило

**Сервисы WFM НЕ обновляют токены.**

При истечении `access_token` (код ошибки `token_expired`):

1. Клиент получает 401 с кодом `token_expired`
2. Клиент **самостоятельно** обращается к Beyond Violet API для обновления токена:
   ```
   POST https://api.beyondviolet.com/oauth/token/
   grant_type=refresh_token
   refresh_token=<refresh_token>
   ```
3. Клиент получает новый `access_token` и `refresh_token`
4. Клиент повторяет исходный запрос с новым токеном

### Почему сервер не делает refresh?

- **Безопасность**: Сервер не хранит refresh токены пользователей
- **Разделение ответственности**: Авторизация полностью делегирована Beyond Violet
- **Простота**: Меньше логики на стороне сервиса

---

## Логирование и мониторинг

### Что логировать

**✅ Логировать:**
- Факт отказа в доступе (warning level)
- Тип ошибки (token_missing, token_expired, token_invalid)
- User ID (`sub`) при успешной аутентификации (info level)

**❌ НЕ логировать:**
- Сам токен (это секретные данные)
- Публичный ключ
- Детали JWT payload (кроме user_id)

### Пример логирования

```python
import logging

logger = logging.getLogger(__name__)

# ✅ Правильно
logger.warning(f"JWT валидация провалена: {error_code}")
logger.info(f"Аутентификация успешна для пользователя {user_id}")

# ❌ Неправильно
logger.warning(f"Невалидный токен: {token}")  # Утечка секрета!
```

### Метрики для мониторинга

- Количество отказов по типам ошибок (token_missing, token_expired, token_invalid)
- Успешные аутентификации
- Latency валидации токена

---

## Безопасность

### Важные правила

1. **Никогда не логировать токены** - это конфиденциальные данные
2. **Хранить публичный ключ в секретах** - не коммитить в git
3. **Использовать HTTPS** - токены передаются только по защищённому соединению
4. **Не доверять payload без верификации** - всегда проверять подпись
5. **Ограничить clock skew** - не более 60 секунд

### Что НЕ делать

- ❌ Принимать токены без проверки подписи
- ❌ Игнорировать истечение токена (exp)
- ❌ Хранить токены в логах
- ❌ Использовать HTTP вместо HTTPS
- ❌ Делать refresh токенов на стороне сервера

---

## Ссылки

- **Beyond Violet API**: `.memory_bank/backend/apis/external/api_bv.md`
- **Спецификация JWT**: [RFC 7519](https://tools.ietf.org/html/rfc7519)
- **Спецификация RS256**: [RFC 7518](https://tools.ietf.org/html/rfc7518)
