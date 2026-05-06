# План: Deep Link для автоматической вставки кода из Telegram

**Статус:** Выполнено
**Дата выполнения:** 2026-01-21

---

## Цель
При нажатии кнопки в Telegram с URL `wfm://auth/code_reciver/{code}/` приложение должно перехватить ссылку и автоматически вставить код в поле ввода.

## Изменения

### 1. Android

#### 1.1 Исправить AndroidManifest.xml (критическая ошибка)
**Файл:** `mobile/android/app/src/main/AndroidManifest.xml`

- Удалить `<data>` тег, который находится вне `<intent-filter>`
- Добавить корректный `<intent-filter>` для deep link внутри `<activity>`
- Добавить `android:launchMode="singleTask"` для корректной работы warm start

```xml
<activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTask"
    android:theme="@style/Theme.WFMApp">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>

    <!-- Deep link для авторизации через Telegram -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:scheme="@string/app_auth_scheme"
            android:host="auth"
            android:pathPrefix="/code_reciver" />
    </intent-filter>
</activity>
```

#### 1.2 Создать DeepLinkHandler
**Файл (новый):** `mobile/android/app/src/main/java/com/wfm/deeplink/DeepLinkHandler.kt`

Утилита для парсинга URL и извлечения 4-значного кода.

#### 1.3 Создать DeepLinkEvent
**Файл (новый):** `mobile/android/feature-auth/src/main/kotlin/com/wfm/feature/auth/deeplink/DeepLinkEvent.kt`

SharedFlow для передачи кода между MainActivity и CodeInputScreen.

#### 1.4 Обновить MainActivity.kt
**Файл:** `mobile/android/app/src/main/java/com/wfm/MainActivity.kt`

- Добавить обработку Intent в `onCreate()` для cold start
- Добавить `onNewIntent()` для warm start
- Извлекать код и эмитить через DeepLinkEvent

#### 1.5 Обновить CodeInputScreen.kt
**Файл:** `mobile/android/feature-auth/src/main/kotlin/com/wfm/feature/auth/presentation/ui/CodeInputScreen.kt`

Добавить `LaunchedEffect` для подписки на `DeepLinkEvent.authCodeReceived` и автоматической отправки кода.

---

### 2. iOS

#### 2.1 Создать Info.plist с URL Scheme
**Файл (новый):** `mobile/ios/WFMApp/Info.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLName</key>
            <string>com.wfm.app</string>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>wfm</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

#### 2.2 Обновить project.pbxproj
**Файл:** `mobile/ios/WFMApp.xcodeproj/project.pbxproj`

Указать путь к Info.plist в build settings.

#### 2.3 Создать DeepLinkHandler
**Файл (новый):** `mobile/ios/WFMAuth/Sources/WFMAuth/Utilities/DeepLinkHandler.swift`

Утилита для парсинга URL и извлечения кода.

#### 2.4 Создать DeepLinkManager
**Файл (новый):** `mobile/ios/WFMAuth/Sources/WFMAuth/Utilities/DeepLinkManager.swift`

ObservableObject для хранения и передачи кода через @EnvironmentObject.

#### 2.5 Добавить метод в AuthViewModel
**Файл:** `mobile/ios/WFMAuth/Sources/WFMAuth/ViewModels/AuthViewModel.swift`

Добавить `setCodeFromDeepLink(_ code: String)` для внешней установки кода.

#### 2.6 Обновить WFMApp.swift
**Файл:** `mobile/ios/WFMApp/WFMApp.swift`

Добавить `.onOpenURL { url in deepLinkManager.handleURL(url) }` модификатор.

#### 2.7 Обновить CodeInputView.swift
**Файл:** `mobile/ios/WFMAuth/Sources/WFMAuth/Views/CodeInputView.swift`

Добавить подписку на `deepLinkManager.receivedAuthCode` через `.onChange(of:)`.

---

## Порядок реализации

### Android:
1. DeepLinkHandler.kt (новый)
2. DeepLinkEvent.kt (новый)
3. AndroidManifest.xml — исправление intent-filter
4. MainActivity.kt — обработка Intent
5. CodeInputScreen.kt — подписка на deep link события

### iOS:
1. Info.plist (новый)
2. project.pbxproj — путь к Info.plist
3. DeepLinkHandler.swift (новый)
4. DeepLinkManager.swift (новый)
5. AuthViewModel.swift — метод setCodeFromDeepLink
6. WFMApp.swift — onOpenURL обработчик
7. CodeInputView.swift — подписка на deep link события

---

## Тестирование

**Android:**
```bash
adb shell am start -W -a android.intent.action.VIEW -d "wfm://auth/code_reciver/1234/" com.wfm
```

**iOS:**
```bash
xcrun simctl openurl booted "wfm://auth/code_reciver/1234/"
```

---

## Критические файлы

| Платформа | Файл | Изменение |
|-----------|------|-----------|
| Android | `AndroidManifest.xml` | Исправить intent-filter (критическая ошибка) |
| Android | `MainActivity.kt` | Обработка Intent |
| iOS | `WFMApp.swift` | onOpenURL обработчик |
| iOS | `Info.plist` | URL Scheme wfm |
