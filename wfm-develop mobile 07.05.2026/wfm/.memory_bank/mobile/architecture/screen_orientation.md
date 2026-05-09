# Screen Orientation (Ориентация экрана)

## Назначение

Конфигурация поддерживаемых ориентаций экрана приложения. WFM поддерживает **только портретную ориентацию** (portrait) — ландшафтный режим (landscape) отключен.

## Бизнес-требование

Приложение WFM предназначено для использования в магазинах работниками и управляющими в процессе работы. Портретная ориентация:
- Естественна для использования одной рукой
- Соответствует формату большинства задач (списки, карточки, формы)
- Предотвращает случайные повороты при сканировании товаров или использовании приложения на ходу

## Конфигурация

### iOS

Настраивается через **Xcode Project Settings**.

**Расположение:**
1. Открыть проект `WFMApp.xcodeproj` в Xcode
2. Выбрать таргет `WFMApp` в Project Navigator
3. Вкладка "General" → секция "Deployment Info"
4. Раздел "Device Orientation"

**Текущая конфигурация:**
- ✅ Portrait (включено)
- ❌ Landscape Left (отключено)
- ❌ Landscape Right (отключено)
- ❌ Upside Down (отключено)

Изменения сохраняются в `Info.plist` проекта (управляется через Xcode UI).

### Android

Настраивается через атрибут `android:screenOrientation` в `AndroidManifest.xml`.

**Файл:** `mobile/android/app/src/main/AndroidManifest.xml`

**Конфигурация:**

```xml
<activity
    android:name=".MainActivity"
    android:screenOrientation="portrait"
    ...
/>
```

**Значения атрибута:**
- `portrait` — только портретная ориентация (текущая настройка)
- `landscape` — только ландшафтная ориентация
- `sensor` — автоматическая ротация на основе датчиков (по умолчанию Android)
- `unspecified` — система решает (default если атрибут не указан)

**Важно:** атрибут устанавливается на уровне Activity (`MainActivity`), поэтому применяется ко всем экранам приложения.

## Тестирование

### iOS Simulator

1. Запустить приложение в Simulator
2. Меню: **Device → Rotate Left/Right** (или `Cmd + Left/Right Arrow`)
3. Экран **не должен** поворачиваться — остается в портретном режиме

### Android Emulator

1. Запустить приложение в Emulator
2. Нажать кнопку поворота в панели инструментов Emulator (или `Ctrl + Left/Right Arrow`)
3. Экран **не должен** поворачиваться — остается в портретном режиме

### Физические устройства

1. Убедиться что Auto-Rotate включен в системных настройках устройства
2. Повернуть устройство в ландшафтный режим
3. Экран приложения **не должен** поворачиваться

## Будущие изменения

Если в будущем потребуется поддержка ландшафтной ориентации для определенных экранов (например, просмотр фотографий задач):

**iOS:** использовать `supportedInterfaceOrientations` в SwiftUI View или переопределить в UIViewController:
```swift
override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
    return .landscape
}
```

**Android:** использовать отдельную Activity с собственным `screenOrientation` или программно менять через:
```kotlin
activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
```

## Связанные документы

- **App Structure:** `.memory_bank/mobile/architecture/app_structure.md`
- **iOS Stack:** `.memory_bank/mobile/architecture/ios_stack.md`
- **Android Stack:** `.memory_bank/mobile/architecture/android_stack.md`
