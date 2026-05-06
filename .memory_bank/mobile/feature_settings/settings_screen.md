# Экран "Профиль" (Settings Tab)

## Назначение

Экран профиля пользователя и настроек приложения. Основная функция - показ информации о пользователе и выход из аккаунта.

**Статус:** Реализован

## Что показывается

### 1. Профиль пользователя

**Секция профиля** (вверху):
- Аватар пользователя (40x40, круглый)
  - Если фото есть → загружается с сервера
  - Если фото нет → серый круг с иконкой человека (placeholder)
- ФИО пользователя (14px Bold)
- Должность (badge violet, если назначена)
- Граница снизу (1px, cardBorderSecondary)

### 2. Действия

**Кнопка "Уведомления"** (первая в списке):
- Белая карточка с обводкой (borderSecondary)
- Текст "Уведомления" (14px Medium) + иконка chevron-right (16x16)
- Скругленные углы (WFMRadius.l)
- При нажатии → fullscreen экран списка уведомлений
- Подробнее: `.memory_bank/mobile/feature_notifications/notifications_list.md`

**Кнопка "Назначения"** (показывается только если у пользователя > 1 assignment):
- Белая карточка с обводкой (cardBorderSecondary)
- Текст "Назначения" (14px Medium) + иконка chevron-right (24x24)
- Скругленные углы (12px)
- При нажатии:
  - Если текущая смена открыта (status = OPENED) → тост "Сначала закройте текущую смену."
  - Если смена не открыта → открывается fullscreen экран выбора назначений

**Fullscreen экран выбора назначений:**
- Заголовок: "Выберите должность" + кнопка назад (ic_back, 44x44)
- Список всех назначений пользователя (белые карточки с обводкой)
- Каждая ячейка показывает:
  - Badge с должностью (position.name, детерминированный цвет на основе position.id)
  - Иконка pin (12x12, фиолетовая) + адрес магазина (store.address, 12px Medium, textSecondary)
  - Checkbox для выбора (только один может быть выбран одновременно)
- При входе на экран:
  - Выбирается назначение из `TokenStorage.getSelectedAssignmentId()`
  - Остальные в невыбранном состоянии
- При выборе назначения:
  - Чекбокс переключается на выбранное назначение
  - Сохраняется в преференсах
  - Обновляются данные пользователя и смены
  - Экран закрывается
  - Обновляется UI (должность в профиле, роль в навигации)

**Кнопка "Войти как"** (показывается только если `flags.dev = true` в JWT):
- Белая карточка с обводкой (borderSurfaceSecondary)
- Текст "Войти как" (14px Medium) + иконка developer / person-swap (24x24)
- Скругленные углы (12px)
- Если impersonation активен — под кнопкой небольшой текст с номером телефона (textSecondary)
- При нажатии → диалог ввода номера телефона (numberPad клавиатура)
  - Кнопка "Очистить" — сбрасывает impersonation
  - Кнопка "Готово" — сохраняет номер
- Подробнее: `.memory_bank/domain/auth/impersonation.md`

**Кнопка "Поделиться приложением":**
- Белая карточка с обводкой (cardBorderSecondary)
- Текст "Поделиться приложением" (14px Medium) + иконка QR-кода (24x24)
- Скругленные углы (12px)
- При нажатии → открывается BottomSheet с QR-кодом (ссылка `https://wfm.beyondviolet.com/download`)
- QR-код генерируется:
  - iOS: через CoreImage (встроенное API)
  - Android: через ZXing библиотеку
- Подробнее: `.memory_bank/mobile/ui/bottomsheet.md` → ShareAppBottomSheet

**Кнопка "Удалить учётную запись":**
- Белая карточка с обводкой (borderSecondary)
- Текст "Удалить учётную запись" (14px Medium) цвет `textError` (красный), без иконки
- Скругленные углы (12px)
- При нажатии → fullscreen экран подтверждения удаления

**Fullscreen экран удаления учётной записи (`DeleteAccountView` / `DeleteAccountScreen`):**
- Заголовок "Удалить учётную запись" + кнопка назад (ic_back, 44x44), разделитель `barsBorder`
- Текст предупреждения: "Это действие нельзя отменить. Все ваши данные будут безвозвратно удалены." (`textSecondary`)
- Случайный 4-значный код (1000–9999), генерируется при открытии экрана
- `WFMTextField` / `WfmTextField` с цифровой клавиатурой; граница становится красной если код введён неверно, API-ошибки показываются caption-текстом под полем
- Кнопки: `WFMSecondaryButton "Отменить"` + `WFMPrimaryButton "Удалить"` (disabled + `isLoading` пока идёт запрос)
- При успехе: logout + возврат на экран авторизации

**Кнопка "Выйти":**
- Белая карточка с обводкой (cardBorderSecondary)
- Текст "Выйти" (14px Medium) + иконка signout (16x16)
- Скругленные углы (12px)
- При нажатии → диалог подтверждения

**Диалог подтверждения выхода:**
- Заголовок: "Выход" / "Выйти из аккаунта?"
- Текст: "Вы уверены, что хотите выйти?"
- Кнопки:
  - "Отмена" (закрывает диалог)
  - "Выйти" (красная, destructive - выполняет logout)

### 3. Версия приложения

Внизу экрана (в скролле): "Версия приложения 0.0.1" (14px Medium, textSecondary)

## Как это работает

### Источник данных

**UserManager** - те же данные, что и на экране Главная:
- Профиль загружается при открытии приложения
- Обновляется через Pull-to-Refresh
- `currentUser` - полные данные пользователя со списком assignments
- `currentAssignment` - текущий выбранный assignment
- `currentShift` - текущая смена для проверки возможности переключения

### Переключение назначений

Для пользователей с несколькими назначениями (работа в разных магазинах):

1. Пользователь нажимает "Назначения"
2. Проверяется статус текущей смены:
   - Если смена открыта → показывается тост с ошибкой
   - Если смена не открыта → открывается экран выбора
3. Пользователь выбирает назначение из списка
4. Вызывается `UserManager.switchAssignment(assignmentId)`:
   - Сохраняет ID в `TokenStorage.saveSelectedAssignmentId()`
   - Перезагружает данные пользователя через `loadCurrentRole()`
   - Обновляет `currentAssignment` StateFlow/@Published
5. Экран закрывается, UI обновляется автоматически

**Важно:** При переключении назначения может измениться роль (worker → manager или наоборот), что приведет к перенаправлению на соответствующий экран через навигацию.

### Logout процесс

1. Пользователь нажимает "Выйти"
2. Показывается диалог подтверждения
3. При подтверждении:
   - Трекинг аналитики: `logoutTapped`, `resetUser()`
   - Очистка режима "Войти как": `ImpersonationStorage.phone = nil` / `setPhone(null)`
   - Вызывается `UserManager.clear()` - очистка токенов, данных и selectedAssignmentId
   - Очистка токенов: `TokenStorage.clearTokens()`
   - AppRouter переводит на экран авторизации (PhoneInputView/Screen)
4. При отмене - диалог закрывается, пользователь остается на экране

**Важно:** Очистка ImpersonationStorage обязательна для безопасности - сброс режима impersonation при выходе из аккаунта.

### Pull-to-Refresh

Обновление данных профиля:
- Пользователь тянет экран вниз
- Загружаются свежие данные с сервера
- Обновляется аватар, ФИО, должность

### Скролл

Весь контент скроллится (включая версию приложения). Версия находится внизу контента, но остается в области скролла. Используется техника с `GeometryReader` (iOS) и `BoxWithConstraints` (Android) для правильной работы.

## Навигация

Экран одноуровневый, без глубокой навигации. После logout происходит переход на экран авторизации.

## Файлы

**iOS:**
- View: `WFMApp/Features/Settings/SettingsView.swift`
- ViewModel: `WFMApp/Features/Settings/SettingsViewModel.swift`
- Экран выбора назначений: `WFMApp/Features/Settings/AssignmentsListView.swift`
- Экран удаления аккаунта: `WFMApp/Features/Settings/DeleteAccountView.swift`

**Android:**
- Screen: `app/src/main/java/com/wfm/features/settings/SettingsScreen.kt`
- ViewModel: `app/src/main/java/com/wfm/features/settings/SettingsViewModel.kt`
- Экран выбора назначений: `app/src/main/java/com/wfm/features/settings/AssignmentsListScreen.kt`
- Экран удаления аккаунта: `app/src/main/java/com/wfm/features/settings/DeleteAccountScreen.kt`

## Дизайн

**Figma (Settings Screen):** https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=3220-4734

**Figma (AssignmentsListScreen):** https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=3421-8025

Экран использует стандартные компоненты из дизайн-системы:
- Badge (violet) для должности
- Иконка signout из Figma (16x16)
- WFMColors для всех цветов (surfaceBase, surfaceRaised, cardBorderSecondary и т.д.)
- WFMTypography для всех текстов
- WFMRadius.l (12px) для скругления кнопки

## Особенности реализации

### iOS

- `ScrollView` + `GeometryReader` для правильной работы Pull-to-Refresh
- `@State private var showLogoutDialog` для управления диалогом выхода
- `@State private var showAssignmentsList` для управления fullscreen экраном назначений
- `.alert()` модификаторы для двух типов диалогов (logout и error)
- `.fullScreenCover()` для отображения списка назначений
- `.refreshable` для Pull-to-Refresh
- Использует `currentAssignment` для отображения должности в ProfileSection
- **AssignmentsListView:**
  - `@State private var selectedId` для управления выбором назначения (single-selection)
  - Extension `Assignment.badgeColor()` — детерминированный выбор цвета badge на основе `position.id % colors.count`
  - `WFMBadge` для отображения должности (вместо текста)
  - `WFMCheckbox` для выбора (работает как radio button)
  - `WFMIcons.pinFilledIcon` с `.renderingMode(.original)` для сохранения цвета

### Android

- `PullToRefreshBox` для Pull-to-Refresh
- `BoxWithConstraints` + `heightIn(min = screenHeight)` для правильного скролла
- `Arrangement.SpaceBetween` для размещения версии внизу
- `ModalBottomSheet` для подтверждения выхода
- Fullscreen `AssignmentsListScreen` для выбора назначений
- State hoisting: `showAssignmentsList` поднят в `MainTabScreen` для скрытия tab bar
- Использует `currentAssignment` для отображения должности в ProfileSection
- `rememberCoroutineScope()` для вызова suspend функции `switchAssignment()`
- **AssignmentsListScreen:**
  - `var selectedId by remember { mutableStateOf(...) }` для управления выбором (single-selection)
  - Extension `Assignment.badgeColor()` — детерминированный выбор цвета badge на основе `position.id % colors.size`
  - `WfmBadge` для отображения должности (вместо текста)
  - `WfmCheckbox` для выбора (работает как radio button)
  - `DisposableEffect` для временной смены цвета navigation bar на `surfaceBase` (восстанавливается при уходе)
  - `BackHandler` для обработки системной кнопки "Назад" (вызывает `onDismiss()` вместо закрытия приложения)
  - `tint = Color.Unspecified` для pin icon (сохраняет оригинальный цвет из SVG)
- **DeleteAccountScreen:**
  - Рендерится поверх Scaffold в голом `Box` (без `paddingValues`) → обязательно `.statusBarsPadding()` на корневом Column, иначе контент уходит под статусбар
  - `DisposableEffect` для временной смены цвета navigation bar на `surfaceBase`
  - `BackHandler` для обработки системной кнопки "Назад"
  - `rememberDebouncedClick` на кнопке назад
  - `WfmPrimaryButton(isLoading = isLoading)` — лоадер внутри кнопки, layout кнопок не прыгает
  - `WfmTextField(isError = ..., errorMessage = ...)` — `isError` для ошибки валидации кода, `errorMessage` для API-ошибки

## Будущие улучшения

1. **Редактирование профиля:**
   - Изменение аватара
   - Редактирование имени
   - Настройки уведомлений

2. **Настройки приложения:**
   - Тема (Light/Dark)
   - Язык интерфейса
   - Уведомления

3. **Дополнительная информация:**
   - О приложении
   - Политика конфиденциальности
   - Служба поддержки

## Связанные документы

- **Структура приложения:** `.memory_bank/mobile/app_structure.md`
- **UserManager:** `.memory_bank/mobile/user_manager.md`
- **UI компоненты:** `.memory_bank/mobile/design_system_components.md`
- **UI паттерны:** `.memory_bank/mobile/ui_patterns.md`
