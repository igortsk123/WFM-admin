# Token Storage — Хранение и обновление токенов (Android)

Документ описывает механизм хранения и автоматического обновления JWT токенов в Android приложении WFM.

---

## 1. Обзор

Приложение использует OAuth2 Bearer токены (JWT RS256) для авторизации запросов к API.

**Типы токенов:**
- **Access Token** — используется для авторизации API запросов, время жизни ~24 часа
- **Refresh Token** — используется для обновления access token, время жизни ~30 дней

**Технология хранения:** DataStore (Jetpack)

---

## 2. Структура хранилища

### TokenStorage класс

Расположение: `com.wfm.core.storage.TokenStorage`

### Хранимые данные

| Ключ | Тип | Описание |
|------|-----|----------|
| `access_token` | String | JWT токен доступа |
| `refresh_token` | String | Токен для обновления |
| `expires_in` | Long | Время жизни access token в секундах |
| `token_timestamp` | Long | Unix timestamp создания токена |
| `selected_assignment_id` | Int | ID выбранного assignment для пользователей с несколькими назначениями |

### Расположение файла
- **Android**: `/data/data/com.wfm/files/datastore/auth_tokens.preferences_pb`
- **DataStore**: `preferencesDataStore(name = "auth_tokens")`

---

## 3. API TokenStorage

### `saveTokens(accessToken, refreshToken, expiresIn)`
Сохраняет токены после успешной авторизации или регистрации.

**Параметры:**
- `accessToken: String` — JWT токен
- `refreshToken: String` — токен обновления
- `expiresIn: Long` — время жизни в секундах

**Дополнительно:**
- Автоматически сохраняет текущий timestamp для расчета истечения

**Когда вызывается:**
- После успешного `verifyCode()`
- После успешного `register()`
- После успешного обновления токена

### `getAccessToken(): String?`
Возвращает сохраненный access token или `null`.

**Использование:**
- При добавлении заголовка `Authorization: Bearer {token}` в API запросах

### `getRefreshToken(): String?`
Возвращает сохраненный refresh token или `null`.

**Использование:**
- При автоматическом обновлении токена

### `isTokenExpired(): Boolean`
Проверяет, истек ли access token.

**Логика:**
```kotlin
val now = System.currentTimeMillis() / 1000
val elapsedTime = now - token_timestamp
return elapsedTime > (expires_in - 300)  // 5 минут запас
```

**Важно:** Токен считается истекшим **за 5 минут до фактического истечения** для предотвращения race condition.

### `hasTokens(): Boolean`
Проверяет наличие сохраненных токенов.

**Использование:**
- При старте приложения для определения стартового экрана (Auth или TasksList)

### `clearTokens()`
Удаляет все сохраненные токены.

**Когда вызывается:**
- При logout
- При неудачном обновлении токена (требуется повторная авторизация)

### `saveSelectedAssignmentId(assignmentId: Int)`
Сохраняет ID выбранного assignment для пользователей с несколькими назначениями.

**Использование:**
- При первом выборе assignment в UserManager (если не был сохранен)
- При переключении assignment через UI (экран "Назначения")

### `getSelectedAssignmentId(): Int?`
Возвращает сохраненный ID выбранного assignment или `null`.

**Использование:**
- При загрузке данных пользователя для определения текущего assignment
- Для отображения правильной роли и магазина

### `clearSelectedAssignmentId()`
Удаляет сохраненный ID выбранного assignment.

**Когда вызывается:**
- При logout (вызывается внутри `UserManager.clear()`)

---

## 4. Автоматическое обновление токенов

### Где происходит
Обновление реализовано в `ApiClient` через метод `ensureValidToken()`.

### Когда происходит
Перед **каждым** API запросом, требующим авторизации (`requiresAuth = true`).

### Алгоритм

```
1. Проверить isTokenExpired()
   ↓
2. Если НЕ истек → продолжить запрос
   ↓
3. Если истек → проверить наличие refresh_token
   ↓
4. Если есть → вызвать refreshTokenInternal()
   ↓
5. Если обновление успешно:
   - Сохранить новые токены
   - Продолжить запрос
   ↓
6. Если обновление НЕ успешно:
   - Очистить токены
   - Выбросить UnauthorizedException
   - Пользователь перенаправляется на экран авторизации
```

### Защита от race condition

**Проблема:** Несколько параллельных API запросов могут одновременно обнаружить истекший токен и попытаться его обновить.

**Решение:** Mutex

```kotlin
private val tokenRefreshMutex = Mutex()

suspend fun ensureValidToken() {
    tokenRefreshMutex.withLock {
        if (tokenStorage.isTokenExpired()) {
            // обновление токена
        }
    }
}
```

**Результат:** Только один coroutine обновляет токен, остальные ждут завершения.

---

## 5. API обновления токена

### Endpoint
```
POST https://api.beyondviolet.com/oauth/token/
Content-Type: application/x-www-form-urlencoded
```

### Параметры
```
grant_type=refresh_token
app_id=5
refresh_token={refresh_token}
```

### Ответ при успехе
```json
{
  "status": {"code": ""},
  "data": {
    "access_token": "...",
    "token_type": "Bearer",
    "refresh_token": "...",
    "expires_in": 86400
  }
}
```

### Ошибки

| Код ошибки | Причина | Действие |
|------------|---------|----------|
| `401` / `invalid_token` | Refresh token невалиден | Очистить токены, повторная авторизация |
| `token_expired` | Refresh token истек | Очистить токены, повторная авторизация |
| Сетевая ошибка | Нет интернета | НЕ очищать токены, показать ошибку |

---

## 6. Безопасность

### DataStore vs SharedPreferences
- **DataStore** — асинхронный, type-safe, использует протобуф
- **SharedPreferences** — синхронный, требует ручной типизации, менее безопасен

### Что НЕ используется (по сравнению с production)
- ❌ EncryptedSharedPreferences — для MVP не критично
- ❌ Android Keystore — для хранения ключей шифрования
- ❌ Biometric authentication — для доступа к токенам

### Рекомендации для production
1. Использовать `EncryptedSharedPreferences` или `androidx.security.crypto`
2. Добавить проверку root detection
3. Добавить certificate pinning для API запросов
4. Логировать все изменения токенов для аудита

---

## 7. Проверка авторизации при старте

### Логика в AppNavigation

```kotlin
val startDestination = if (tokenStorage.hasTokens()) {
    Screen.TasksList.route
} else {
    Screen.Auth.route
}
```

### Сценарии

**Сценарий 1: Токены есть и валидны**
- Показать TasksList
- При первом API запросе токен будет автоматически проверен и обновлен при необходимости

**Сценарий 2: Токены есть, но истекли**
- Показать TasksList
- При первом API запросе произойдет автоматическое обновление
- Если обновление не удалось → редирект на Auth

**Сценарий 3: Токенов нет**
- Показать Auth
- После успешной авторизации → переход на TasksList

---

## 8. Logout

### Процесс
1. Вызов `tokenStorage.clearTokens()`
2. Навигация на `Screen.Auth.route` с очисткой backstack
3. Сервер НЕ уведомляется (stateless JWT)

### Опциональный API logout
```
DELETE https://api.beyondviolet.com/api/auth/
Authorization: Bearer {access_token}
```

**Ответ:** Всегда `401 Unauthorized`

**Назначение:** Логирование на сервере (для аудита)

---

## 9. Диаграмма жизненного цикла токена

```
Авторизация / Регистрация
         ↓
    saveTokens()
         ↓
TokenStorage (DataStore)
         ↓
API запрос (requiresAuth=true)
         ↓
ensureValidToken()
         ↓
   isTokenExpired()?
    /           \
  НЕТ           ДА
   ↓             ↓
Продолжить   refreshTokenInternal()
запрос        /              \
           Успех            Ошибка
             ↓                ↓
        saveTokens()    clearTokens()
             ↓                ↓
        Продолжить     UnauthorizedException
        запрос              ↓
                      Экран Auth
```

---

## 10. Примеры кода

### Сохранение токенов после авторизации
```kotlin
when (val response = authService.verifyCode(phone, code)) {
    is ApiResponse.Success -> {
        tokenStorage.saveTokens(
            response.data.access_token,
            response.data.refresh_token,
            response.data.expires_in
        )
        _uiState.value = AuthUiState.Authenticated
    }
}
```

### Автоматическое обновление перед API запросом
```kotlin
suspend fun <T> get(path: String, requiresAuth: Boolean = true): ApiResponse<T> {
    if (requiresAuth) {
        ensureValidToken()  // ← Автоматическое обновление
    }

    val response = httpClient.get("$baseUrl$path") {
        addAuthHeader(this)  // ← Добавляем Bearer token
    }
    return handleServerResponse(response)
}
```

### Logout
```kotlin
onLogout = {
    scope.launch {
        tokenStorage.clearTokens()
        navController.navigate(Screen.Auth.route) {
            popUpTo(0) { inclusive = true }
        }
    }
}
```

---

## 11. Отличия iOS реализации

| Аспект | Android | iOS |
|--------|---------|-----|
| Хранилище токенов | DataStore | Keychain (зашифрованный) |
| Хранилище selectedAssignmentId | DataStore | UserDefaults |
| Обновление | ApiClient.ensureValidToken() | Interceptor / URLSession delegate |
| Безопасность | DataStore (незашифрованный в MVP) | Keychain (зашифрованный по умолчанию) |
| Асинхронность | Kotlin Coroutines | Swift Concurrency (async/await) |

**Примечание:** selectedAssignmentId хранится в UserDefaults на iOS (не требует шифрования, т.к. это не чувствительные данные), в то время как токены хранятся в Keychain.

---

## 12. Итог

**Ключевые моменты:**
- Токены хранятся в DataStore (Android) / Keychain (iOS)
- selectedAssignmentId хранится в DataStore (Android) / UserDefaults (iOS)
- Автоматическое обновление за 5 минут до истечения
- Mutex для предотвращения race condition
- Очистка токенов и selectedAssignmentId при logout
- Проверка наличия токенов при старте приложения

**Преимущества подхода:**
- ✅ Прозрачное обновление токенов (пользователь не замечает)
- ✅ Защита от параллельных обновлений
- ✅ Автоматический logout при невалидном refresh token
- ✅ Persistence между запусками приложения

**Для production:**
- Добавить EncryptedSharedPreferences
- Добавить certificate pinning
- Добавить root detection
- Логировать все операции с токенами
