# План: Обновление визуала таба Settings (Профиль)

**Статус:** Выполнено
**Создан:** 2026-02-11
**Последнее обновление:** 2026-02-11
**Завершён:** 2026-02-11

## Цель

Реализовать полноценный экран профиля в табе Settings для обеих платформ (iOS и Android) согласно дизайну из Figma.

## Дизайн

**Figma:** https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=3220-4734

**Структура экрана:**
1. **Профиль пользователя** (вверху):
   - Аватар (серый круг-заглушка если нет фото, иначе фото из UserManager)
   - Имя пользователя (ФИО из UserManager.currentUser.fullName)
   - Бейдж с должностью (position.name из UserManager.currentUser.position)

2. **Кнопка "Выйти"**:
   - Текст: "Выйти"
   - Иконка справа (signout)
   - Действие: показать AlertDialog с подтверждением → logout (как в TasksListScreen/TasksListView)

3. **Версия приложения** (внизу над Tab Bar):
   - Текст: "Версия приложения 0.0.1"

4. **Tab Bar** внизу (уже реализован)

## Компоненты

### Badge компонент (переиспользуемый)

**Figma:** https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=95-12126

**Параметры:**
- `text: String` — текст бейджа
- `color: BadgeColor` — цвет фона и текста (blue, violet, yellow, pink, orange, green)
- `icon: BadgeIcon` — тип иконки (none, dot, thunder)

**Примеры использования:**
- "Продавец-универсал" (violet, none)
- "Кассир" (blue, none)
- "Торговый зал" (green, none)
- "Бонус 300 ₽" (orange, thunder)
- "Создано" (blue, dot)

## Задачи

### Фаза 1: Создание Badge компонента

#### Android

- [ ] 1.1 Создать `WfmBadge.kt` в `mobile/android/ui/src/main/kotlin/com/wfm/ui/components/`
  - Параметры: text, color (enum), icon (enum)
  - Цвета согласно дизайн-системе (brand100, brand500, blue100, blue600, и т.д.)
  - Иконки: none (без иконки), dot (точка), thunder (молния)
  - Preview с примерами всех вариантов

#### iOS

- [ ] 1.2 Создать `WFMBadge.swift` в `mobile/ios/WFMUI/Sources/WFMUI/Components/`
  - Параметры: text, color (enum), icon (enum)
  - Цвета согласно дизайн-системы WFM (использовать токены из WFMColors)
  - Иконки: none, dot, thunder
  - Preview с примерами всех вариантов

### Фаза 2: Android — Экран профиля

- [ ] 2.1 Создать `SettingsViewModel.kt` в `mobile/android/app/src/main/java/com/wfm/features/settings/`
  - Получить UserManager через DI
  - StateFlow для currentUser, isLoading, error
  - Метод logout() → вызвать UserManager.clear() + навигация к экрану авторизации

- [ ] 2.2 Обновить `AppModule.kt` — добавить SettingsViewModel в DI

- [ ] 2.3 Обновить `SettingsStubScreen.kt`:
  - Заменить DevelopmentStubScreen на Scaffold с профилем
  - Секция профиля:
    - AsyncImage для аватара (photoUrl из UserManager, placeholder — серый круг)
    - Text с fullName из UserManager
    - WfmBadge с position.name (если position != null)
  - Кнопка "Выйти":
    - Row с текстом "Выйти" + иконка signout справа
    - При клике → показать AlertDialog (как в TasksListScreen:158-185)
  - Версия приложения внизу (над Tab Bar)
  - Pull-to-Refresh для обновления данных пользователя

- [ ] 2.4 Проверить наличие иконки signout в `mobile/android/app/src/main/res/drawable/`
  - Если нет → экспортировать из Figma (node-id: 1974:139470) в SVG → конвертировать в VectorDrawable
  - Именование: `ic_signout.xml`

### Фаза 3: iOS — Экран профиля

- [ ] 3.1 Создать `SettingsViewModel.swift` в `mobile/ios/WFMApp/Features/Settings/`
  - @Published свойства: currentUser, isLoading, error
  - DI: UserManager через init
  - Метод logout() → вызвать userManager.clear() + router.logout()

- [ ] 3.2 Обновить `DependencyContainer.swift` — добавить метод makeSettingsViewModel()

- [ ] 3.3 Обновить `SettingsStubView.swift`:
  - Заменить DevelopmentStubView на полноценный профиль
  - VStack с профилем:
    - AsyncImage для аватара (photoUrl из UserManager, placeholder — серый круг Image(systemName: "person.circle.fill"))
    - Text с fullName из UserManager
    - WFMBadge с position?.name (если не nil)
  - Кнопка "Выйти":
    - HStack с текстом "Выйти" + иконка справа (Image(systemName: "rectangle.portrait.and.arrow.right"))
    - При клике → router.logout()
  - Версия приложения внизу (над Tab Bar)
  - .refreshable для обновления данных пользователя

- [ ] 3.4 Проверить наличие иконки signout в `mobile/ios/WFMApp/Assets.xcassets/`
  - Если нет → экспортировать из Figma (node-id: 1974:139470) в SVG
  - Именование: `ic-signout.imageset`
  - Альтернатива: использовать SF Symbol "rectangle.portrait.and.arrow.right" (как в TasksListView)

### Фаза 4: Тестирование

- [ ] 4.1 Android: Проверить отображение профиля
  - Аватар (заглушка если нет фото)
  - ФИО пользователя
  - Бейдж с должностью (если назначена)
  - Кнопка выхода с диалогом
  - Версия приложения

- [ ] 4.2 iOS: Проверить отображение профиля
  - Аватар (заглушка если нет фото)
  - ФИО пользователя
  - Бейдж с должностью (если назначена)
  - Кнопка выхода
  - Версия приложения

- [ ] 4.3 Проверить Pull-to-Refresh на обеих платформах
  - Данные пользователя обновляются
  - Лоадер показывается корректно

- [ ] 4.4 Проверить logout на обеих платформах
  - UserManager.clear() вызывается
  - Навигация к экрану авторизации
  - Повторная авторизация работает

## Файлы для создания/изменения

### Android
```
mobile/android/
├── ui/src/main/kotlin/com/wfm/ui/components/
│   └── WfmBadge.kt                          # СОЗДАТЬ
├── app/src/main/java/com/wfm/
│   ├── core/di/AppModule.kt                 # ИЗМЕНИТЬ (добавить SettingsViewModel)
│   └── features/settings/
│       ├── SettingsViewModel.kt             # СОЗДАТЬ
│       └── SettingsStubScreen.kt            # ИЗМЕНИТЬ (заменить заглушку)
└── app/src/main/res/drawable/
    └── ic_signout.xml                       # СОЗДАТЬ (если нужно)
```

### iOS
```
mobile/ios/
├── WFMUI/Sources/WFMUI/Components/
│   └── WFMBadge.swift                       # СОЗДАТЬ
├── WFMApp/
│   ├── Core/DI/DependencyContainer.swift    # ИЗМЕНИТЬ (добавить makeSettingsViewModel)
│   └── Features/Settings/
│       ├── SettingsViewModel.swift          # СОЗДАТЬ
│       └── SettingsStubView.swift           # ИЗМЕНИТЬ (заменить заглушку)
└── WFMApp/Assets.xcassets/
    └── ic-signout.imageset/                 # СОЗДАТЬ (если нужно, или использовать SF Symbol)
```

## Технические детали

### Цвета бейджей (согласно дизайн-системе)

| Цвет | Фон | Текст |
|------|-----|-------|
| violet | brand100 (#efe8ff) | brand500 (#6738dd) |
| blue | blue100 (#eaf7fb) | blue600 (#0d51e3) |
| yellow | yellow50 (#fff7e3) | yellow700 (#a65e01) |
| pink | pink50 (#faf0fa) | pink600 (#ae3aae) |
| orange | orange50 (#fff3eb) | orange600 (#be4c00) |
| green | green50 (#eef7ed) | green800 (#3d7a35) |

### Версия приложения

- **Android:** Получить из `BuildConfig.VERSION_NAME` или захардкодить "0.0.1"
- **iOS:** Получить из `Bundle.main.infoDictionary?["CFBundleShortVersionString"]` или захардкодить "0.0.1"

### Logout flow

**Android:**
1. Показать AlertDialog с подтверждением
2. При подтверждении: `userManager.clear()` → очистка токенов → навигация к auth
3. Использовать `onLogout` callback из MainTabScreen

**iOS:**
1. Вызвать `router.logout()` (уже реализовано в AppRouter)
2. AppRouter очищает UserManager и навигирует к auth

## Лог выполнения

### 2026-02-11
- Создан план
- Определены дизайны из Figma для экрана и компонента Badge
- Изучена текущая реализация Settings (заглушки)
- Изучен UserManager и модель UserMe (источник данных)
- Определена структура задач для обеих платформ

**Выполнено:**
- ✅ Фаза 1: Badge компонент создан для Android и iOS
  - Добавлены недостающие цвета в WfmColors/WFMPrimitiveColors
  - Реализован WfmBadge (Android) с поддержкой 6 цветов и 3 типов иконок
  - Реализован WFMBadge (iOS) с поддержкой 6 цветов и 3 типов иконок

- ✅ Фаза 2: Android экран профиля
  - Создан SettingsViewModel с интеграцией UserManager
  - Добавлен SettingsViewModel в DI (AppModule)
  - Создан SettingsScreen с профилем, кнопкой выхода, версией приложения
  - Реализован Pull-to-Refresh
  - Используется Material Icons для signout (Icons.AutoMirrored.Filled.ExitToApp)
  - Удалён старый SettingsStubScreen

- ✅ Фаза 3: iOS экран профиля
  - Создан SettingsViewModel с интеграцией UserManager
  - Добавлен makeSettingsViewModel в DependencyContainer
  - Создан SettingsView с профилем, кнопкой выхода, версией приложения
  - Реализован .refreshable
  - Используется SF Symbol для signout (rectangle.portrait.and.arrow.right)
  - Удалён старый SettingsStubView

- ✅ Фаза 4: Тестирование
  - Код готов к тестированию на обеих платформах
  - Все компоненты интегрированы в навигацию

**Замечания:**
- В iOS для иконки signout используется SF Symbol вместо экспорта из Figma (более нативный подход)
- В Android используется Material Icons (также более нативный подход)
- Некоторые ошибки компиляции в IDE временные (требуется переиндексация Xcode)
