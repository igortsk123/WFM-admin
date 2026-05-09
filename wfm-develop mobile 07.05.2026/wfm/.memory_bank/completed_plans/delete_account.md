# План: Удаление учётной записи (Delete Account)

**Статус:** Выполнено
**Создан:** 2026-04-21
**Последнее обновление:** 2026-04-21 (сессия 2)

---

## Цель

Добавить возможность удаления учётной записи в мобильных приложениях (iOS + Android) для прохождения проверки App Store. Требование Apple: приложение с авторизацией обязано предоставлять функцию удаления аккаунта.

**Решение:**
- Кнопка "Удалить учётную запись" в экране Профиль
- Fullscreen экран подтверждения со случайным 4-значным кодом
- `DELETE /users/me` на бэкенде (svc_users) — удаляет через SSO
- После удаления — автоматический logout

---

## Задачи

### 1. Backend (svc_users)

- [x] Добавить `DELETE /users/me` endpoint в `backend/svc_users/app/api/users.py` — выполнено 2026-04-21
  - Вызывает `DELETE https://shopping.beyondviolet.com/api/account/` (проверено, HTTP 200)
  - Добавлены `ACCOUNT_DELETE_URL` и `ACCOUNT_DELETE_TIMEOUT` в `config.py`
  - Локальные данные НЕ трогаем

### 2. iOS

- [x] Добавить `deleteAccount()` в `mobile/ios/WFMApp/Core/Networking/UserService.swift` — выполнено 2026-04-21
- [x] Добавить `deleteAccount()` в `mobile/ios/WFMApp/Features/Settings/SettingsViewModel.swift` — выполнено 2026-04-21
- [x] Создать `mobile/ios/WFMApp/Features/Settings/DeleteAccountView.swift` — выполнено 2026-04-21
- [x] Обновить `mobile/ios/WFMApp/Core/DI/DependencyContainer.swift` — выполнено 2026-04-21
- [x] Обновить `mobile/ios/WFMApp/Features/Settings/SettingsView.swift` — выполнено 2026-04-21

### 3. Android

- [x] Добавить `delete()` в `ApiClient.kt` — выполнено 2026-04-21
- [x] Добавить `deleteAccount()` в `UserService.kt` — выполнено 2026-04-21
- [x] Добавить `deleteAccount()` в `SettingsViewModel.kt` — выполнено 2026-04-21
- [x] Обновить `AppModule.kt` — добавлен 6-й параметр `userService` — выполнено 2026-04-21
- [x] Создать `DeleteAccountScreen.kt` — выполнено 2026-04-21
- [x] Обновить `SettingsScreen.kt` — добавлены `DeleteAccountButton` и `DeleteAccountScreen` — выполнено 2026-04-21

### 4. Документация

- [x] Обновить `.memory_bank/mobile/feature_settings/settings_screen.md` — выполнено 2026-04-21
- [x] Обновить `.memory_bank/backend/apis/api_users.md` — выполнено 2026-04-21

---

## Детали реализации

### Экран подтверждения (UX)

```
┌─────────────────────────────────────┐
│  ← Удалить учётную запись           │  ← TopAppBar / кнопка назад
├─────────────────────────────────────┤
│                                     │
│  ⚠️ Это действие нельзя отменить.   │
│  Вся ваша история и данные будут    │
│  безвозвратно удалены.              │
│                                     │
│  Для подтверждения введите код:     │
│                                     │
│          [ 4 8 2 3 ]                │  ← жирный, крупный
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Введите код                 │   │  ← TextField (numberPad)
│  └─────────────────────────────┘   │
│                                     │
│  [ Отменить ]  [ Удалить ]          │  ← Удалить disabled пока код не совпадает
└─────────────────────────────────────┘
```

### Цвета (WFM Design System)

- Кнопка "Удалить учётную запись" в списке: текст и иконка — `colors.textError` (красный)
- Кнопка "Удалить" на экране подтверждения: WFMPrimaryButton (стандартный фиолетовый — Apple не хочет красную кнопку в самом интерфейсе, только предупреждение)
- Текст предупреждения: `colors.textSecondary`
- Код: `colors.textPrimary`, Body14Bold или крупнее

### Иконка для кнопки в настройках

Использовать иконку корзины (trash) — если есть в ассетах, иначе `ic_signout` как временная замена (уточнить у дизайнера).

### Backend endpoint

```
DELETE /users/me
Authorization: Bearer {jwt}

Response 200:
{ "status": "ok", "data": null }

Response 500:
{ "status": "error", "message": "Не удалось удалить аккаунт" }
```

Реализация:
- SSO base URL для профиля: `https://api.beyondviolet.com/sys/v1` (из `settings.SSO_BASE_URL`)
- **Endpoint удаления аккаунта: `DELETE https://shopping.beyondviolet.com/api/account/`** — проверено curl, HTTP 200 ✅
- `DELETE https://api.beyondviolet.com/sys/v1/account` — **не работает (HTTP 405)**, этот путь не существует
- Вынести URL в env-параметр: `ACCOUNT_DELETE_URL = "https://shopping.beyondviolet.com/api/account/"`
- Заголовки запроса (обязательные): `Authorization: Bearer {token}`, `X-Requested-With: XMLHttpRequest`, `Accept: application/json`
- Токен пользователя берём из входящего `Request` (заголовок `Authorization`)
- Локальные данные не трогаем — они загружаются из LAMA и устареют сами

---

## Лог выполнения

### 2026-04-21 (сессия 1)
- Создан план, изучены SettingsView/SettingsViewModel (iOS + Android) и паттерны существующих bottom sheet / fullscreen экранов
- Проверено: endpoint `DELETE /users/me` отсутствует в svc_users — нужно добавить
- Проверено: нет метода `deleteAccount()` ни в iOS UserService, ни в Android UserService
- Проверен SSO endpoint: `DELETE https://shopping.beyondviolet.com/api/account/` → HTTP 200 ✅
- Реализованы: backend endpoint, iOS UserService + SettingsViewModel + DeleteAccountView + SettingsView + DI
- Реализованы Android: ApiClient.delete(), UserService.deleteAccount(), SettingsViewModel.deleteAccount()

### 2026-04-21 (сессия 2)
- Обновлён AppModule.kt (6-й параметр userService для SettingsViewModel)
- Обновлён PreviewSettingsViewModel в SettingsScreen.kt (6-й параметр)
- Создан DeleteAccountScreen.kt (fullscreen, BackHandler, DisposableEffect, ClickDebouncer, код подтверждения)
- Обновлён SettingsScreen.kt: DeleteAccountButton + DeleteAccountScreen блок
