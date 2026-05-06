# План: Функция «Войти как» (Impersonation)

**Статус:** Выполнено
**Создан:** 2026-03-16
**Последнее обновление:** 2026-03-16

## Цель

Внедрить функцию входа под другим пользователем для ограниченного круга разработчиков. Разработчик с признаком `flags.dev = true` в JWT может в настройках ввести номер телефона — и все последующие запросы будут выполняться от имени этого пользователя.

## Концепция

- JWT от Beyond Violet содержит поле `flags` (словарь булевых значений)
- Если `flags.dev = true` — показывается кнопка «Войти как» в профиле
- После ввода номера телефона он отправляется в хидере `X-Auth-By` в каждом запросе
- Backend проверяет наличие `flags.dev = true` у текущего JWT и, если есть, ищет пользователя по телефону вместо sso_id
- Без `flags.dev` в JWT — хидер игнорируется (безопасность)

## Задачи

### Документация (Memory Bank)
- [x] Создать `.memory_bank/domain/auth/impersonation.md` — концепция и правила безопасности — выполнено 2026-03-16
- [x] Обновить `.memory_bank/backend/apis/api_users.md` — добавлен `GET /internal/id-by-phone` — выполнено 2026-03-16
- [x] Обновить `.memory_bank/mobile/feature_settings/settings_screen.md` — секция «Войти как» — выполнено 2026-03-16
- [x] Обновить `.memory_bank/mobile/architecture/networking.md` — хидер X-Auth-By — выполнено 2026-03-16

### Backend: shared
- [x] `backend/shared/auth.py` — добавлен парсинг `flags.dev`, поле `is_dev: bool` в `CurrentUser`, возврат из `validate_token_and_get_sso_id` — выполнено 2026-03-16

### Backend: svc_users
- [x] `backend/svc_users/app/repositories/user_repository.py` — метод `get_user_by_phone` уже существовал
- [x] `backend/svc_users/app/api/internal.py` — добавлен endpoint `GET /internal/id-by-phone` — выполнено 2026-03-16
- [x] `backend/svc_users/app/api/dependencies.py` — impersonation через X-Auth-By + is_dev — выполнено 2026-03-16

### Backend: svc_tasks
- [x] `backend/svc_tasks/app/services/users_client.py` — добавлен метод `get_int_user_id_by_phone` — выполнено 2026-03-16
- [x] `backend/svc_tasks/app/api/dependencies.py` — impersonation через X-Auth-By + is_dev — выполнено 2026-03-16

### iOS
- [x] `mobile/ios/WFMApp/Core/Managers/ImpersonationStorage.swift` — создан (UserDefaults + JWT decode) — выполнено 2026-03-16
- [x] `mobile/ios/WFMApp/Core/Networking/APIClient.swift` — X-Auth-By хидер, новый параметр init — выполнено 2026-03-16
- [x] `mobile/ios/WFMApp/Core/DI/DependencyContainer.swift` — добавлен impersonationStorage — выполнено 2026-03-16
- [x] `mobile/ios/WFMApp/Features/Settings/SettingsViewModel.swift` — isDevUser, impersonationPhone, setImpersonationPhone — выполнено 2026-03-16
- [x] `mobile/ios/WFMApp/Features/Settings/SettingsView.swift` — кнопка «Войти как» + Alert диалог — выполнено 2026-03-16

### Android
- [x] `mobile/android/app/.../core/managers/ImpersonationStorage.kt` — создан (SharedPreferences + JWT decode) — выполнено 2026-03-16
- [x] `mobile/android/app/.../core/network/ApiClient.kt` — X-Auth-By хидер, новый параметр конструктора — выполнено 2026-03-16
- [x] `mobile/android/app/.../core/di/AppModule.kt` — добавлен singleton ImpersonationStorage, обновлены зависимости — выполнено 2026-03-16
- [x] `mobile/android/app/.../features/settings/SettingsViewModel.kt` — isDevUser, impersonationPhone, setImpersonationPhone — выполнено 2026-03-16
- [x] `mobile/android/app/.../features/settings/SettingsScreen.kt` — кнопка LoginAsButton + AlertDialog — выполнено 2026-03-16

## Лог выполнения

### 2026-03-16
- Выполнено: всё — документация, backend (shared + svc_users + svc_tasks), iOS (ImpersonationStorage + APIClient + DI + SettingsViewModel + SettingsView), Android (ImpersonationStorage + ApiClient + AppModule + SettingsViewModel + SettingsScreen)

## Технические детали

### JWT структура (payload пример)
```json
{
  "u": "uuid-of-user",
  "flags": { "dev": true },
  "exp": 1234567890
}
```

### Поток данных (Backend)

```
Client (flags.dev=true в JWT) + X-Auth-By: +79001234567
  ↓
svc_users/svc_tasks dependencies.py
  → validate_token_and_get_sso_id() → is_dev = True
  → if X-Auth-By header AND is_dev:
       UserRepository.get_user_by_phone(phone) → user_id
  → CurrentUser(user_id=<impersonated>)
```

### Ключевые файлы

| Компонент | Путь |
|-----------|------|
| JWT validation | `backend/shared/auth.py` |
| svc_users dependency | `backend/svc_users/app/api/dependencies.py` |
| svc_users internal API | `backend/svc_users/app/api/internal.py` |
| User Repository | `backend/svc_users/app/repositories/user_repository.py` |
| svc_tasks dependency | `backend/svc_tasks/app/api/dependencies.py` |
| Users Client (svc_tasks) | `backend/svc_tasks/app/services/users_client.py` |
| iOS APIClient | `mobile/ios/WFMApp/Core/Networking/APIClient.swift` |
| iOS SettingsView | `mobile/ios/WFMApp/Features/Settings/SettingsView.swift` |
| iOS SettingsViewModel | `mobile/ios/WFMApp/Features/Settings/SettingsViewModel.swift` |
| Android ApiClient | `mobile/android/app/src/main/java/.../core/network/ApiClient.kt` |
| Android SettingsScreen | `mobile/android/app/src/main/java/.../features/settings/SettingsScreen.kt` |
| Android SettingsViewModel | `mobile/android/app/src/main/java/.../features/settings/SettingsViewModel.kt` |
| Android TokenStorage | `mobile/android/feature-auth/src/main/kotlin/.../data/local/TokenStorage.kt` |
