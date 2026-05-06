# Auth Screens — UX и UI экранов авторизации

Описание пользовательского опыта и интерфейсов экранов авторизации в мобильном приложении.

**Связанные документы:**
- `.memory_bank/domain/auth/auth_flow.md` — сценарии и логика переходов
- `.memory_bank/domain/auth/auth_validation.md` — правила валидации
- `.memory_bank/backend/external/api_bv.md` — API и коды ошибок
- `.memory_bank/patterns/security_hcaptcha.md` — интеграция капчи

---

## 1. Экран: Ввод номера телефона (PhoneInputScreen / PhoneInputView)

### Цель
Получить номер телефона и выбрать способ получения кода.

### Дизайн из Figma
**Node ID:** `2734-5778`

### Компоненты

**Заголовок:**
- Основной: "Добро пожаловать"
- Подзаголовок: "Введите номер телефона и мы отправим код, смс или перезвоним"

**Segmented Control выбора способа доставки:**
- Три сегмента: "Telegram" | "MAX" | "Звонок"
- **Автоопределение по умолчанию:**
  - iOS: `TelegramUtils.isTelegramInstalled()` или `MaxUtils.isMaxInstalled()`
  - Android: `TelegramUtils.isTelegramInstalled(context)` или `MaxUtils.isMaxInstalled(context)`
  - Если Telegram установлен → по умолчанию выбран "Telegram"
  - Если MAX установлен → по умолчанию выбран "MAX"
  - Если ничего не установлено → по умолчанию выбран "Звонок"
- Переключение между сегментами меняет `notification_type`:
  - "Telegram" → отправляется `notification_type=telegram_code`
  - "MAX" → отправляется `notification_type=max_code`
  - "Звонок" → отправляется `notification_type=phone_code`

**Поле ввода телефона (WFMPhoneTextField / WfmPhoneTextField):**
- Placeholder: `+7 (999) 999 99-99`
- Автоформатирование в формат `+7 (XXX) XXX XX-XX`
- **Крестик для очистки:** Появляется справа когда есть текст в поле
- При нажатии на крестик поле очищается
- Валидация: полный номер = 18 символов (см. `.memory_bank/domain/auth/auth_validation.md`)

**Кнопка:** "Далее"
- Неактивна при невалидном номере
- Активна при валидном номере (18 символов)

### Поведение

**При переключении таба:**
- Меняется подсказка под табом
- Сохраняется выбор пользователя (отправляется соответствующий `notification_type`)

**При возврате на экран (кнопка "Изменить номер"):**
- Таб возвращается к последнему выбору пользователя
- Номер телефона сохраняется в поле ввода

**Успех (пользователь существует):**
- Если `channel=telegram`:
  - **Автоматическое открытие:** `TelegramUtils.openIfNeeded(botUsername, botStartPayload)`
  - Открывает Telegram ТОЛЬКО если есть непустой `bot_start_payload` (пользователь НЕ авторизован в боте)
  - Если `bot_start_payload` пустой → НЕ открывать Telegram (пользователь УЖЕ авторизован, код придет через пуш)
  - Deep link формат: `https://t.me/{bot_username}?start={bot_start_payload}`
  - После открытия (если было) показать CodeInputScreen
- Если `channel=max`:
  - **Автоматическое открытие:** `MaxUtils.openIfNeeded(botUsername, botStartPayload)`
  - Открывает MAX ТОЛЬКО если есть непустой `bot_start_payload`
  - Deep link формат: `https://max.ru/{bot_username}?start={bot_start_payload}`
  - Логика аналогична Telegram
- Если `channel=sms` или `channel=call`:
  - Просто переход на CodeInputScreen
- Информация о канале доставки передается в следующий экран

**Пользователь не найден:** Теневая регистрация — автоматически отправляется запрос с `signup=1` и пустым шаблоном данных, переход на CodeInputScreen

**Требуется капча:** Показать hCaptcha widget

**Ошибка сети:** "Проверьте подключение к интернету"

---

## 2. Экран: Ввод кода подтверждения (CodeInputScreen / CodeInputView)

### Цель
Подтвердить номер телефона путем ввода 4-значного кода.

### Дизайн из Figma
**Node ID:** `2966-31843`

### Компоненты

**Top Bar:**
- Кнопка "Назад" (стрелка влево) - возврат на PhoneInputScreen

**Заголовок (зависит от канала):**
- `telegram`: "Введите код из Telegram"
- `max`: "Введите код из MAX"
- `sms`: "Введите код из SMS"
- `call`: "Мы сейчас вам перезвоним"

**Описание (с жирным номером телефона):**
- `telegram`: "Введите код из телеграм бота отправленный на номер **+7 (XXX) XXX XX-XX**"
- `max`: "Введите код из MAX бота отправленный на номер **+7 (XXX) XXX XX-XX**"
- `sms`: "Введите код из СМС отправленный на номер **+7 (XXX) XXX XX-XX**"
- `call`: "Введите последние 4 цифры номера с которого мы вам позвоним на номер **+7 (XXX) XXX XX-XX**"

**Поле ввода кода (WFMTextField / WfmTextField):**
- Placeholder: `XXXX`
- Ввод только цифр, максимум 4
- TextAlign: Center
- **Отступы:** 68px от краев экрана (16px container + 52px дополнительный padding)
- **НЕТ крестика** - поле для кода без кнопки очистки
- **Автоотправка:**
  - SMS/Telegram: автоматическая отправка при вводе 4-й цифры
  - Звонок: НЕТ автоотправки, нужно нажать кнопку "Подтвердить"

**Кнопки перехода в мессенджер:**
- **"В Telegram"** (показывается когда `channel=telegram`):
  - Отступы: 68px от краев экрана (как у поля ввода)
  - При нажатии использует `TelegramUtils.createTelegramDeepLink(botUsername, botStartPayload)`
  - Deep link формат: `https://t.me/{bot_username}?start={bot_start_payload}`
  - iOS: Универсальная ссылка откроет приложение если установлено, иначе веб
  - Android: `Intent.setPackage()` с пакетом из `TelegramUtils.getInstalledTelegramPackage(context)`
- **"В MAX"** (показывается когда `channel=max`):
  - Отступы: 68px от краев экрана (как у поля ввода)
  - При нажатии использует `MaxUtils.createMaxDeepLink(botUsername, botStartPayload)`
  - Deep link формат: `https://max.ru/{bot_username}?start={bot_start_payload}`

**Кнопка "Отправить код повторно" (для SMS/Звонок):**
- Текст с таймером: "Отправить код повторно через {X} сек" (неактивна)
- Текст после таймера: "Отправить код повторно" (активна)
- Для звонка: "Перезвонить повторно через {X} сек" / "Перезвонить повторно"

**Кнопка "Подтвердить":**
- Активна когда введено 4 цифры
- При нажатии отправляет код на проверку
- Отступы: 16px от краев экрана

### Поведение

**Код верный:** Сохранить токены, переход на главный экран

**Код неверный:**
- Показать inline ошибку под полем ввода — текст берётся из `status.message` сервера (не захардкожен)
- Поле подсвечивается красной рамкой (`isError = true`)
- Повторить ввод

**Требуется капча:** Показать hCaptcha widget

**Повторная отправка:**
- Новый запрос кода с тем же `notification_type`
- **НЕ открывать новый экран** - остаемся на CodeInputScreen
- Обновляется `uiState` с новым `CodeSentResponse`:
  - Может смениться канал (например, SMS → звонок)
  - Обновляется таймер (`expiresAt`)
  - Обновляется заголовок и описание в зависимости от нового канала
- Если `channel=telegram`:
  - Автоматически вызывается `TelegramUtils.openIfNeeded(botUsername, botStartPayload)`
  - Открывает только если есть `bot_start_payload` (пользователь НЕ авторизован в боте)
- Если `channel=max`:
  - Автоматически вызывается `MaxUtils.openIfNeeded(botUsername, botStartPayload)`
  - Открывает только если есть `bot_start_payload`

**Навигация:**
- Кнопка "Назад" (стрелка) → возврат на PhoneInputScreen
- На PhoneInputScreen можно изменить номер или переключить способ доставки

**Ошибка сети:** "Проверьте подключение к интернету"

---

## 3. Архитектура и универсальные нейминги

### Принцип универсальности

Код поддерживает **два мессенджера** (Telegram и MAX). Одни и те же данные (`bot_username`, `bot_start_payload`) приходят с сервера независимо от выбранного мессенджера.

**Ключевое правило:** Используются **универсальные названия** везде, где данные применяются для обоих мессенджеров.

### Android: Shared переменные в ViewModel

**Паттерн:**
- `messengerBotUsername` и `messengerBotStartPayload` — универсальные переменные в AuthViewModel
- Две функции `getTelegramDeepLink()` и `getMaxDeepLink()` используют одни и те же переменные
- `NavigationEvent.CodeSent` содержит `shouldOpenMessenger` и `messengerDeepLink` (не telegram-specific)
- Экраны принимают универсальный callback `onOpenMessenger: (String) -> Unit`

**Универсальная функция открытия:**
```kotlin
// AuthNavGraph.kt — определяет мессенджер по URL и устанавливает package
when { deepLink.contains("t.me") -> ...Telegram
       deepLink.contains("max.ru") -> ...MAX }
```

**Файлы:**
- `AuthViewModel.kt` — универсальные переменные
- `AuthNavGraph.kt` — функция `openMessengerDeepLink()`
- `AuthUiState.kt` — `NavigationEvent.CodeSent` с универсальными полями

### iOS: Данные из Response

**Паттерн:**
- Нет shared переменных — данные берутся из `CodeSentResponse`
- `CodeSentResponse` содержит универсальные поля `botUsername` и `botStartPayload`
- Отдельные функции `openTelegramBot()` и `openMaxBot()` в CodeInputView
- Обе функции используют одни и те же поля из response

**Автоматическое открытие мессенджера:**
```swift
// AuthViewModel.swift — вызов Utils после получения response
if response.channel == .telegram { TelegramUtils.openIfNeeded(...) }
else if response.channel == .max { MaxUtils.openIfNeeded(...) }
```

**Файлы:**
- `AuthModels.swift` — структура `CodeSentResponse`
- `AuthViewModel.swift` — автоматическое открытие
- `CodeInputView.swift` — функции `openTelegramBot()` и `openMaxBot()`

### Почему это важно

- **Единая модель данных:** Сервер отдаёт одинаковые поля для всех мессенджеров
- **Платформенные различия:** Android использует shared state, iOS — response
- **Переиспользование:** Одни данные формируют разные deep links
- **Расширяемость:** Новый мессенджер = новый Utils + добавить в switch/when

---

## 4. Экран: Поддержка (SupportScreen / SupportView)

### Цель
Помочь пользователю разобраться с проблемами авторизации и связаться со службой поддержки.

### Дизайн из Figma
**Node ID:** `4711-22621`

### Переход на экран
- Кнопка "Поддержка" в правом верхнем углу `PhoneInputScreen / PhoneInputView`
- **iOS:** `AuthRoute.support`, NavigationStack push через `onSupportClick` callback
- **Android:** `AuthRoute.SUPPORT` в `authNavGraph`

### Компоненты

**FAQ-аккордеон "Проблемы с авторизацией":**
- 3 пункта: "Вход по номеру телефона", "Вход через MAX", "Вход через Telegram"
- Каждый пункт раскрывается и показывает иллюстрацию (PNG)
- Одновременно раскрыт максимум 1 пункт
- Иллюстрации: `phone_resolve`, `max_resolve`, `tg_resolve`

**Секция контактов:**
- 4 кнопки в 2 ряда: MAX, Telegram, Позвонить, Почта
- Тап → открывает соответствующее приложение
- Лонг-пресс → копирует контактную информацию в буфер обмена + тост "Скопировано в буфер обмена"
- Контакты: MAX (`id7017422412_1_bot`), Telegram (`Test_hv_bot`), телефон (`+78003505628`), почта (`support@beyondviolet.com`)

### Утилиты
- `MessengerUtils.openUrl()` — для открытия MAX и Telegram
- `PhoneUtils.call()` — для звонка
- `EmailUtils.compose()` — для почты

### Навигация
- Кнопка "Назад" → `dismiss()` / `popBackStack()`
- **Дебаунс:** Android использует inline дебаунс 500ms (не `ClickDebouncer`, т.к. это простой экран без сложной навигации)

---

## 5. Утилиты для работы с мессенджерами

### TelegramUtils (iOS) / TelegramUtils.kt (Android)

Централизованные функции для работы с Telegram.

**Функции:**

1. **`isTelegramInstalled()`** - Проверяет установлен ли Telegram
   - iOS: `UIApplication.shared.canOpenURL(URL(string: "tg://")!)`
   - Android: Проверяет наличие пакетов `org.telegram.messenger`, `org.telegram.messenger.web`, `org.thunderdog.challegram`

2. **`createTelegramDeepLink(botUsername, botStartPayload)`** - Создает deep link
   - Формат: `https://t.me/{bot_username}?start={bot_start_payload}` (если есть payload)
   - Формат: `https://t.me/{bot_username}` (если нет payload)

3. **`openIfNeeded(botUsername, botStartPayload)`** - Открывает Telegram бота если нужно
   - Открывает ТОЛЬКО если `botStartPayload` НЕ пустой (пользователь НЕ авторизован в боте)
   - Если `botStartPayload` пустой → НЕ открывает (пользователь УЖЕ авторизован, код придет через пуш)
   - Используется в AuthViewModel для автоматического открытия после получения кода
   - Выводит в консоль: `✅ [TelegramUtils] Открываем Telegram по адресу: {url}`

4. **Android только: `getInstalledTelegramPackage(context)`** - Возвращает package name первого установленного Telegram клиента

### MaxUtils (iOS) / MaxUtils.kt (Android)

Централизованные функции для работы с MAX мессенджером.

**Функции:**

1. **`isMaxInstalled()`** - Проверяет установлен ли MAX
   - iOS: `UIApplication.shared.canOpenURL(URL(string: "max://")!)`
   - Android: Проверяет наличие пакета `ru.oneme.app`

2. **`createMaxDeepLink(botUsername, botStartPayload)`** - Создает deep link
   - Формат: `https://max.ru/{bot_username}?start={bot_start_payload}` (если есть payload)
   - Формат: `https://max.ru/{bot_username}` (если нет payload)

3. **`openIfNeeded(botUsername, botStartPayload)`** - Открывает MAX бота если нужно
   - Открывает ТОЛЬКО если `botStartPayload` НЕ пустой
   - Если `botStartPayload` пустой → НЕ открывает
   - Используется в AuthViewModel для автоматического открытия после получения кода
   - Выводит в консоль: `✅ [MaxUtils] Открываем MAX по адресу: {url}`

4. **Android только: `getInstalledMaxPackage(context)`** - Возвращает package name MAX мессенджера (`ru.oneme.app`) если установлен

### Использование

**iOS (автоматическое открытие):**
```swift
// AuthViewModel.swift — после получения CodeSentResponse
if response.channel == .telegram {
    TelegramUtils.openIfNeeded(botUsername: ..., botStartPayload: ...)
}
```

**iOS (кнопка мессенджера):**
```swift
// CodeInputView.swift
let deepLink = TelegramUtils.createTelegramDeepLink(...)
UIApplication.shared.open(URL(string: deepLink)!)
```

**Android (универсальная функция):**
```kotlin
// AuthNavGraph.kt — определяет мессенджер по URL
when { deepLink.contains("t.me") -> setPackage(TelegramUtils...)
       deepLink.contains("max.ru") -> setPackage(MaxUtils...) }
```

**Файлы:**
- iOS: `AuthViewModel.swift`, `CodeInputView.swift`
- Android: `AuthNavGraph.kt`

### MessengerUtils (iOS) / MessengerUtils.kt (Android)

Открывает мессенджер по https-ссылке. Если нативное приложение установлено — открывает напрямую, иначе fallback на браузер.

- iOS: конвертирует `https://t.me/...` → `tg://resolve?domain=...`, `https://max.ru/...` → fallback на https (у MAX нет рабочего `resolve?domain`)
- Android: устанавливает `Intent.setPackage()` через `TelegramUtils.getInstalledTelegramPackage()` или `MaxUtils.getInstalledMaxPackage()`

### PhoneUtils (iOS) / PhoneUtils.kt (Android)

Открывает стандартный экран звонка с заполненным номером.
- iOS: `tel:` URL через `UIApplication.shared.open()`, предварительно фильтрует строку (только цифры и `+`)
- Android: `Intent.ACTION_DIAL` с `tel:` URI

### EmailUtils (iOS) / EmailUtils.kt (Android)

Открывает почтовый клиент с заполненным адресатом.
- iOS: `mailto:` URL через `UIApplication.shared.open()`
- Android: `Intent.ACTION_SENDTO` с `mailto:` URI

---

## 6. Компонент: hCaptcha Widget

### Когда показывается
При получении ошибки `AUTH_CAPTCHA_REQUIRED` на любом экране.

### Реализация
- **Android:** HCaptchaWebView в диалоге
- **iOS:** WKWebView в sheet
- **Site Key:** `18e5142d-9054-487b-af5d-ce24cf8a09f9`

Подробнее: `.memory_bank/patterns/security_hcaptcha.md`

### Поведение

**Успех:** Повторить предыдущий запрос с токеном капчи

**Ошибка загрузки:** "Не удалось загрузить капчу. Проверьте подключение к интернету"

---

## 7. Обработка ошибок

### Известные ошибки

**AUTH_CAPTCHA_REQUIRED:** Показать капчу

**AUTH_USER_NOT_EXISTS:** Теневая регистрация — автоматический запрос кода с `signup=1` и пустым шаблоном данных

**`invalid_grant` / `7` (неверный код):** Inline ошибка под полем кода — текст из `status.message`. Работает при авторизации (`invalid_grant`) и при регистрации (`7`). Тост не показывается.

**`validation` (ошибка номера телефона):** Inline ошибка под полем телефона — текст из `status.message`. Тост не показывается.

**`429` (rate limit):** Тост "Слишком много попыток. Попробуйте позже". Сервер возвращает HTML без JSON — перехватывать по HTTP статусу до попытки парсинга JSON.

Полный список: `.memory_bank/backend/external/api_bv.md` (раздел 9)

### Неизвестные ошибки

Показать `status.message` из ответа сервера тостом.

### Сетевые ошибки

"Проверьте подключение к интернету"

### UI паттерны

- **Тост (WFMToast / WfmToast):** системные ошибки, сетевые ошибки, rate limit
- **Inline ошибка под полем:** ошибки конкретных полей (`validation` → поле телефона, `invalid_grant`/`7` → поле кода)

### iOS: подключение тостов

`ToastManager` требует модификатор `.wfmToast(manager:)` на корневом view флоу. Без этого модификатора `toastManager.show()` не отображает тосты. Экземпляр `ToastManager` должен быть один и передаваться и в `AuthViewModel`, и в модификатор view.

---

## 8. Индикаторы загрузки

**Во время API запросов:**
- Показать индикатор загрузки на кнопке
- Заблокировать кнопку на время запроса
- Таймаут: 10-15 секунд

---

## 9. Итог

Экраны авторизации построены с фокусом на:
- Простоту и минимализм
- Прозрачность процесса
- Понятные сообщения об ошибках

**Связанные документы:**
- Сценарии → `.memory_bank/domain/auth/auth_flow.md`
- Валидация → `.memory_bank/domain/auth/auth_validation.md`
- API → `.memory_bank/backend/external/api_bv.md`
- Капча → `.memory_bank/patterns/security_hcaptcha.md`
