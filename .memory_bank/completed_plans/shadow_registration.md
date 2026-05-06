# План: Теневая регистрация (убрать экран регистрации)

**Статус:** Выполнено
**Создан:** 2026-02-19
**Последнее обновление:** 2026-02-19

## Цель

Убрать экран регистрации из UI. Вместо перехода на `RegistrationScreen` при ошибке `AUTH_USER_NOT_EXISTS` — автоматически выполнять регистрационный запрос и отправлять пустой шаблон данных.

## Контекст

### Текущий flow (ДО)

```
1. Ввод телефона → POST /oauth/authorize/ (без signup)
2. Сервер: AUTH_USER_NOT_EXISTS
3. ← Навигация на RegistrationScreen
4. Пользователь вводит: имя, фамилию, дату рождения, пол
5. POST /oauth/authorize/ + signup=1 → код отправлен
6. Ввод кода
7. POST /api/account/register/ с реальными данными пользователя
```

### Желаемый flow (ПОСЛЕ)

```
1. Ввод телефона → POST /oauth/authorize/ (без signup)
2. Сервер: AUTH_USER_NOT_EXISTS
3. ← АВТОМАТИЧЕСКИ: POST /oauth/authorize/ + signup=1 (без показа UI)
4. Код отправлен → переход на CodeInputScreen (как для существующего пользователя)
5. Ввод кода
6. POST /api/account/register/ с ПУСТЫМ ШАБЛОНОМ данных
```

### Шаблон пустых данных для регистрации

```
first_name: ""
last_name: ""
gender: 1     (дефолт)
birth_date: "1970-01-01"
city_id: 1
```

> ⚠️ Риск: сервер может отвергнуть пустые строки в first_name/last_name.
> Нужно проверить на реальном окружении.

### Файлы затронутых компонентов

**Android:**
- `mobile/android/feature-auth/src/.../presentation/ui/RegistrationScreen.kt` — удалить
- `mobile/android/feature-auth/src/.../presentation/viewmodels/AuthViewModel.kt` — изменить логику
- `mobile/android/feature-auth/src/.../presentation/viewmodels/AuthUiState.kt` — убрать состояния регистрации
- Навигационный граф feature-auth — убрать destination регистрации

**iOS:**
- `mobile/ios/WFMAuth/Sources/WFMAuth/Views/RegistrationView.swift` — удалить
- `mobile/ios/WFMAuth/Sources/WFMAuth/ViewModels/AuthViewModel.swift` — изменить логику
- Навигация в основном приложении/WFMAuth — убрать кейс requiresRegistration

---

## Задачи

### Android

- [x] **A1. AuthViewModel — изменить обработку AUTH_USER_NOT_EXISTS** — выполнено 2026-02-19
  - Убрано: `_uiState.value = AuthUiState.RequiresRegistration` + `NavigationEvent.RequiresRegistration`
  - Добавлено: сохранение пустого `RegistrationData` + авто-вызов `requestCode(forSignup = true)`

- [x] **A2. AuthViewModel — пустой шаблон данных** — выполнено 2026-02-19
  - Инлайн-шаблон: `firstName=""`, `lastName=""`, `gender="male"`, `birthDate="1970-01-01"`
  - Удалены `prepareRegistration()` и `convertDateFormat()` — больше не нужны

- [x] **A3. Убрать RequiresRegistration из AuthUiState** — выполнено 2026-02-19
  - Удалён `AuthUiState.RequiresRegistration`
  - Удалён `NavigationEvent.RequiresRegistration`
  - `CaptchaAction.REQUEST_CODE_SIGNUP` — **оставлен** (нужен для повтора после капчи в signup флоу)

- [x] **A4. Убрать навигацию на RegistrationScreen** — выполнено 2026-02-19
  - Убран `onNeedRegistration` из `PhoneInputScreen`
  - Убран `AuthRoute.REGISTRATION` и `composable(AuthRoute.REGISTRATION)` из `AuthNavGraph`

- [x] **A5. Удалить RegistrationScreen.kt** — выполнено 2026-02-19

### iOS

- [x] **I1. AuthViewModel — изменить обработку userNotExists** — выполнено 2026-02-19
  - В `requestCode()` перехватываем `AuthError.userNotExists` до `handleAuthError`
  - Устанавливаем `pendingRegistrationData` + вызываем `requestRegistrationCode()` (await в async-контексте)
  - Удалены `saveRegistrationDataAndRequestCode()` и `moveToRegistration()` — только для RegistrationView

- [x] **I2. AuthViewModel — пустой шаблон данных** — выполнено 2026-02-19
  - `pendingRegistrationData = (firstName: "", lastName: "", gender: .male, birthDate: "1970-01-01")`
  - `registerWithCode()` уже использует `pendingRegistrationData` — изменений не потребовалось

- [x] **I3. Убрать requiresRegistration из AuthUiState** — выполнено 2026-02-19
  - Удалён `case requiresRegistration(phone:notificationType:)` из `AuthUiState`
  - Убран `case .userNotExists:` из `handleAuthError()`

- [x] **I4. Убрать навигацию на RegistrationView** — выполнено 2026-02-19
  - Убран `case .requiresRegistration:` из `AuthFlowView.handleStateChange()`
  - Убран `case .registration:` из `AuthFlowView.destinationView()`
  - Удалён `case registration` из `AuthRoute`

- [x] **I5. Удалить RegistrationView.swift** — выполнено 2026-02-19

### Документация

- [x] **D1. Обновить Memory Bank** — выполнено 2026-02-19
  - `feature_auth_screens.md` — убран раздел RegistrationScreen, обновлены описания ошибок
  - `auth_flow.md` — диаграмма состояний обновлена (Registration → ShadowReg), сценарий "Новый пользователь"

---

## Лог выполнения

### 2026-02-19
- Создан план по результатам анализа кодовой базы (iOS + Android) и Memory Bank документации
- Выполнены все задачи Android (A1–A5)
- Выполнены все задачи iOS (I1–I5)
- Обновлена документация Memory Bank (D1)
