# Android Stack

## Обзор

Платформа: Android (минимальная версия SDK 26, целевая — SDK 35)

## Технологический стек

### Язык
- **Kotlin 2.1.0**

### UI Framework
- **Jetpack Compose**
  - Compose BOM 2024.12.01
  - Material3 (Material Design 3)
  - Navigation Compose 2.8.5

### Архитектура
- **MVVM** (Model-View-ViewModel)
- **Clean Architecture** (для крупных фич: data/domain/presentation слои)
- Модульная структура: `app`, `feature-auth`, `ui`

### Dependency Injection
- **Koin 4.0.0** — лёгкий DI контейнер для Android
  - koin-android
  - koin-androidx-compose

### Сеть
- **Ktor Client 3.0.2** — HTTP клиент
  - ktor-client-core
  - ktor-client-okhttp (OkHttp engine)
  - ktor-client-content-negotiation
  - ktor-serialization-kotlinx-json
  - ktor-client-logging
- **OkHttp 4.12.0** — HTTP engine для Ktor

### Сериализация
- **Kotlinx Serialization JSON 1.7.3**
- **Kotlinx DateTime 0.6.1** — работа с датами

### Хранилище данных
- **DataStore Preferences 1.1.1** — хранение настроек и токенов (замена SharedPreferences)

### Изображения
- **Coil 2.7.0** (`coil-compose`) — загрузка и кеширование изображений

### AndroidX Core
- **Core KTX 1.15.0**
- **Lifecycle Runtime KTX 2.8.7**
- **Lifecycle ViewModel Compose 2.8.7**
- **Activity Compose 1.9.3**
- **Multidex 2.0.1**

### Дополнительные библиотеки
- **hCaptcha SDK 4.4.0** — CAPTCHA для авторизации
- **Chucker 4.0.0** — HTTP инспектор для отладки (debug-only)
- **ExifInterface 1.3.7** — чтение EXIF данных и коррекция ориентации фото
- **ZXing Core 3.5.3** — генерация QR-кодов (используется в ShareAppBottomSheet)

### Аналитика и мониторинг
- **Firebase BOM 34.10.0** — аналитика и push-уведомления
  - firebase-analytics
  - firebase-messaging

### Build Tools
- **Android Gradle Plugin (AGP) 8.7.3**

## Структура проекта

```
mobile/android/
├── app/                          # Основное приложение
│   └── src/main/java/com/wfm/
│       ├── core/                 # Общие компоненты
│       │   ├── di/               # DI модули (Koin)
│       │   ├── network/          # API клиенты
│       │   ├── models/           # Модели данных
│       │   ├── managers/         # Менеджеры (UserManager и т.д.)
│       │   └── utils/            # Утилиты
│       ├── features/             # Экраны и фичи
│       │   ├── tasks/            # Задачи (Clean Architecture)
│       │   │   ├── data/
│       │   │   ├── domain/
│       │   │   └── presentation/
│       │   ├── home/             # Домашний экран
│       │   ├── settings/         # Настройки
│       │   └── ...
│       ├── navigation/           # Навигация
│       └── ui/                   # UI компоненты, темы
├── feature-auth/                 # Модуль авторизации
└── ui/                           # Модуль UI компонентов (дизайн-система)
```

## Принципы работы

1. **Модульность**: Крупные фичи (авторизация) вынесены в отдельные Gradle модули
2. **Clean Architecture**: Сложные фичи (tasks) разделены на data/domain/presentation
3. **Single Source of Truth**: Memory Bank → Android код
4. **UI компоненты из дизайн-системы**: Используем токены из `ui` модуля
5. **Ktor + Kotlinx Serialization**: Все API запросы типизированы
6. **DataStore**: Хранение токенов и настроек (вместо SharedPreferences)
7. **Koin DI**: Все зависимости инжектятся через Koin модули
