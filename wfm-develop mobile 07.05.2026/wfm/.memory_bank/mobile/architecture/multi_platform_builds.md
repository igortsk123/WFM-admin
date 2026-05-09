# Multi-Platform Builds (GMS / HMS)

**Платформа:** Android
**Версия документа:** 1.1
**Дата:** 2026-03-31

## Обзор

Android приложение WFM поддерживает два варианта сборки:
- **GMS** (Google Mobile Services) — для публикации в Google Play
- **HMS** (Huawei Mobile Services) — для публикации в Huawei AppGallery

**Зачем:** Устройства Huawei без Google Play Services (новые модели после 2019 года) не могут использовать Firebase. Для них требуется альтернативная реализация на HMS Push Kit и HMS Analytics.

## Архитектурный подход

### Product Flavors

Используется механизм **Product Flavors** из Gradle:
- Два флейвора: `gms` и `hms`
- Общий код в `app/src/main/`
- Flavor-specific код в `app/src/gms/` и `app/src/hms/`

### Структура исходников

```
app/src/
├── main/               # Общий код
│   ├── kotlin/
│   │   └── core/
│   │       ├── push/PushService.kt          # Интерфейс
│   │       └── analytics/AnalyticsService.kt # Интерфейс
│   └── AndroidManifest.xml
│
├── gms/                # Firebase реализация
│   ├── kotlin/
│   │   ├── notifications/FirebasePushService.kt
│   │   └── di/PushModule.kt
│   ├── AndroidManifest.xml
│   └── google-services.json
│
└── hms/                # HMS реализация
    ├── kotlin/
    │   ├── notifications/HmsPushService.kt
    │   └── di/PushModule.kt
    ├── AndroidManifest.xml
    └── agconnect-services.json
```

## Компоненты требующие абстракции

### Push-уведомления

**Интерфейс:** `PushService` (`app/src/main/.../core/push/PushService.kt`)

**Реализации:**
- `FirebasePushService` (GMS) — в `app/src/gms/`
- `HmsPushService` (HMS) — в `app/src/hms/`

### Аналитика

**Интерфейс:** `AnalyticsService` (уже существует)

**Реализации:**
- GMS: `FirebaseAnalyticsService` + `SemetricsAnalyticsService` (в `app/src/gms/`)
- HMS: `AppMetricaAnalyticsService` + `SemetricsAnalyticsService` (в `app/src/hms/`)

**Примечание:** HUAWEI Analytics (`HiAnalytics`) недоступен для новых аккаунтов с 30.06.2024. Для HMS используется Yandex AppMetrica (`io.appmetrica.analytics:analytics`). AppMetrica также обеспечивает crash reporting для HMS (вместо AGConnect Crash).

### Dependency Injection

Каждый флейвор имеет свой `di/PushModule.kt`, который предоставляет flavor-specific реализацию `PushService`. При старте приложения Koin загружает правильный модуль в зависимости от флейвора.

## Gradle конфигурация

### Flavor Dimensions

Определение флейворов в `app/build.gradle.kts`.

**Реализация:** См. `mobile/android/app/build.gradle.kts` секция `productFlavors`

### Flavor-Specific Dependencies

Зависимости добавляются с префиксом флейвора:
- `gmsImplementation(...)` — только для GMS
- `hmsImplementation(...)` — только для HMS

**Важно:** Используйте version catalog (`libs.versions.toml`) для единообразия версий.

**Реализация:** См. `mobile/android/gradle/libs.versions.toml` и `app/build.gradle.kts` секция `dependencies`

### Применение плагинов

**КРИТИЧНО:** Не используйте deprecated `applicationVariants.all {}` — это вызывает ошибки в новых версиях AGP.

**Правильный подход:**
1. Добавить AGP и HMS plugin в buildscript корневого `build.gradle.kts`
2. Использовать `pluginManager.withPlugin()` в `app/build.gradle.kts`
3. Копировать конфигурационные файлы из flavor-папок в корень модуля для IDE
4. Добавить `tools:replace="android:allowBackup"` в AndroidManifest для HMS

**Реализация:** См. `mobile/android/build.gradle.kts` и `app/build.gradle.kts`

**Документация:** См. `.memory_bank/mobile/architecture/multi_platform_builds.md` (полная версия в git истории)

## Команды сборки

```bash
# GMS (Google Play)
./gradlew assembleGmsDebug
./gradlew assembleGmsRelease

# HMS (AppGallery)
./gradlew assembleHmsDebug
./gradlew assembleHmsRelease
```

## Backend интеграция

Backend (`svc_notifications`) поддерживает оба типа токенов:
- FCM токены (GMS) — отправка через Firebase Admin SDK
- HMS токены (HMS) — отправка через HMS Push Kit Server API

**Endpoint:** `POST /notifications/devices/tokens`

Новое поле `token_type`: `"fcm"` или `"hms"` — определяет куда отправлять push.

## Важные моменты

### 1. Разделение зависимостей

Каждый флейвор содержит только один набор зависимостей (либо GMS, либо HMS). Не смешивайте их в одном APK.

**Зачем:** Уменьшение размера APK, избежание конфликтов версий.

### 2. Dependency Injection вместо Runtime проверок

Не делаем runtime проверку "GMS или HMS доступен?". Вместо этого используем DI с flavor-specific реализациями — правильная реализация выбирается на этапе сборки.

**Зачем:** Упрощение кода, отсутствие лишних проверок в runtime.

### 3. HMS требует SHA-256 fingerprint для debug

В отличие от Firebase, HMS Push Kit требует добавления SHA-256 fingerprint **даже для debug сборок** в AppGallery Connect Console.

**Команда для получения:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Добавьте SHA-256 в AppGallery Connect Console: **Project Settings → General information → App information → Add fingerprint**

### 4. WFMApplication: guard для дочерних процессов

Некоторые SDK (AppMetrica, LeakCanary и др.) запускают дочерние процессы. Android создаёт новый экземпляр `WFMApplication` в каждом процессе, что вызывает падение при попытке инициализировать Koin, Semetrics и другие компоненты вне основного процесса.

**Решение:** `WFMApplication.onCreate()` содержит проверку `isMainProcess()` — если процесс не основной, метод сразу возвращает управление.

```kotlin
override fun onCreate() {
    super.onCreate()
    if (!isMainProcess()) return
    // ... полная инициализация
}
```

**Признак проблемы:** краш вида `WorkManager is not initialized properly` или `Koin not started` в процессе с суффиксом (`:AppMetrica`, `:leakcanary` и т.п.).

### 5. Настройка HMS конфигурации

Файл `agconnect-services.json` должен содержать поле `"region"` (обязательно) и секцию `service` с URL для HMS Analytics и других сервисов. Регион можно указать: `"SG"` (Asia-Pacific), `"DE"` (Europe), `"RU"` (Russia), или `"CN"` (China).

## Тестирование

### Локальное тестирование

- **GMS флейвор:** любое Android устройство с Google Play Services
- **HMS флейвор:** устройство Huawei без GMS или эмулятор с HMS Core

### Проверка push-уведомлений

1. Установить флейвор
2. Авторизоваться
3. Проверить регистрацию токена через Chucker: `POST /notifications/devices/tokens`
4. Отправить тестовый push через backend или консоль
5. Проверить получение и deep link

## Ссылки

- [Android Product Flavors](https://developer.android.com/build/build-variants)
- [HMS Push Kit](https://developer.huawei.com/consumer/en/hms/huawei-pushkit/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- Backend HMS интеграция: `.memory_bank/backend/hms_push_support.md`
