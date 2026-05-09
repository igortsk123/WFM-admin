# Вынос фичи в отдельный модуль (Android)

## Когда выносить?

✅ Фича логически самодостаточна (авторизация, онбординг, профиль)
✅ Нужна изоляция зависимостей
✅ Хотите переиспользовать в других проектах

❌ Всего 1-2 экрана
❌ Фича сильно связана с основным приложением

## Процесс выноса

### 1. Создаём структуру модуля

```bash
mkdir feature-modulename
mkdir -p feature-modulename/src/main/kotlin/com/wfm/feature/modulename
```

Структура:
```
feature-modulename/
├── build.gradle.kts
└── src/main/
    ├── AndroidManifest.xml
    └── kotlin/com/wfm/feature/modulename/
        ├── di/ModuleNameModule.kt          # Koin DI
        ├── data/                            # API, Storage
        ├── presentation/
        │   ├── viewmodels/
        │   ├── ui/                          # Composable экраны
        │   └── navigation/ModuleNavGraph.kt # Navigation graph
        └── util/
```

### 2. Настраиваем build.gradle.kts

- `namespace = "com.wfm.feature.modulename"`
- Плагины: `android.library`, `kotlin.android`, `kotlin.compose`, `kotlin.serialization`
- Зависимости: Compose, Koin, Ktor (если нужно API), DataStore (если нужно хранилище)

### 3. Создаём AndroidManifest.xml

Пустой манифест в `src/main/AndroidManifest.xml`

### 4. Регистрируем модуль

**settings.gradle.kts:**
```kotlin
include(":app")
include(":feature-modulename")
```

**Корневой build.gradle.kts:**
```kotlin
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.android.library) apply false  // ← Обязательно!
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
}
```

### 5. Создаём Koin DI модуль

**di/ModuleNameModule.kt:**
- Создаём `val moduleNameModule = module { ... }`
- Регистрируем все зависимости: Storage, Service, ViewModel

### 6. Создаём Navigation Graph

**presentation/navigation/ModuleNavGraph.kt:**
- Функция `fun NavGraphBuilder.moduleNameNavGraph(...)`
- `object ModuleRoute` с константами маршрутов
- Callback `onModuleCompleted` для выхода из флоу

### 7. Интегрируем в основное приложение

**app/build.gradle.kts:**
```kotlin
dependencies {
    implementation(project(":feature-modulename"))
}
```

**WFMApplication.kt:**
```kotlin
startKoin {
    modules(
        moduleNameModule,  // ⚠️ ПЕРВЫМ, если предоставляет общие зависимости!
        appModule
    )
}
```

**AppNavigation.kt:**
```kotlin
moduleNameNavGraph(
    navController = navController,
    onModuleCompleted = { /* навигация после завершения */ }
)
```

## Критические моменты

### ⚠️ Порядок загрузки Koin модулей

Если модуль предоставляет общие зависимости (TokenStorage, ApiClient), загружайте его **ПЕРВЫМ**:

```kotlin
modules(
    authModule,  // Предоставляет TokenStorage
    appModule    // Использует TokenStorage
)
```

### ⚠️ Дублирование классов

При выносе модуля удалите дубликаты из app:
```bash
git rm app/src/main/java/com/wfm/core/storage/TokenStorage.kt
```

Обновите импорты в app модуле:
```kotlin
import com.wfm.feature.auth.data.local.TokenStorage
```

### ⚠️ Package declarations

При копировании файлов проверьте, что package правильный:
```kotlin
// ✅ Правильно
package com.wfm.feature.auth.presentation.ui

// ❌ Неправильно
package com.wfm.feature.auth.presentation.viewmodels.ui
```

### ⚠️ Public inline функции

Если есть inline функции с reified типами, используйте `@PublishedApi internal`:
```kotlin
companion object {
    @PublishedApi
    internal const val TAG = "ApiClient"
}
```

## Проверка

```bash
# Собрать только модуль
./gradlew :feature-modulename:build

# Собрать всё приложение
./gradlew build
```

## Пример: feature-auth

- **DI:** TokenStorage, AuthApiClient, AuthService, AuthViewModel
- **Navigation:** PhoneInput → CodeInput → Registration
- **Exports:** `authNavGraph(onAuthenticationCompleted = {})`
- **Используется в app:** Для входа/регистрации пользователей

Модуль загружается первым в WFMApplication, предоставляет TokenStorage для ApiClient.
