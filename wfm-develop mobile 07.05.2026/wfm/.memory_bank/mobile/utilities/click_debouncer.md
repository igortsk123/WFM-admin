# Click Debouncer (Android)

**Путь:** `mobile/android/app/src/main/java/com/beyondviolet/wfm/core/utils/ClickDebouncer.kt`

## Назначение

Утилита для предотвращения множественных кликов на навигационных кнопках и интерактивных элементах. Решает проблему "двойного клика", когда пользователь быстро нажимает на кнопку несколько раз, что приводит к множественным вызовам навигации и закрытию всего navigation stack.

## API

### `rememberDebouncedClick()`

Composable функция для создания debounced callback.

**Параметры:**
- `debounceTime: Long = 500L` — время в миллисекундах, в течение которого игнорируются повторные клики
- `onClick: () -> Unit` — callback, который будет вызван только один раз

**Возвращает:** `Pair<Boolean, () -> Unit>`
- `first` — флаг enabled (true если клик можно обработать, false если debounce активен)
- `second` — debounced callback

**Пример:**
```kotlin
@Composable
fun MyScreen(onNavigateBack: () -> Unit) {
    val (backButtonEnabled, debouncedNavigateBack) = rememberDebouncedClick(
        debounceTime = 500L,
        onClick = onNavigateBack
    )

    IconButton(
        onClick = debouncedNavigateBack,
        enabled = backButtonEnabled
    ) {
        Icon(...)
    }
}
```

### `Modifier.clickableDebounced()`

Modifier для применения debounce к любому clickable элементу.

**Параметры:**
- `debounceTime: Long = 500L` — время debounce
- `onClick: () -> Unit` — callback

**Пример:**
```kotlin
Box(
    modifier = Modifier
        .clickableDebounced(debounceTime = 500L) {
            navController.navigate(...)
        }
)
```

## Обязательные места применения

❗ **КРИТИЧНО:** Все навигационные действия на Android ОБЯЗАТЕЛЬНО должны использовать ClickDebouncer.

### 1. Кнопки "Назад" в TopAppBar

Все кнопки навигации назад в TopAppBar должны использовать `rememberDebouncedClick()`.

**Пример (TaskDetailsScreen.kt):**
```kotlin
val (backButtonEnabled, debouncedNavigateBack) = rememberDebouncedClick(
    debounceTime = 500L,
    onClick = onNavigateBack
)

TopAppBar(
    navigationIcon = {
        IconButton(
            onClick = debouncedNavigateBack,
            enabled = backButtonEnabled
        ) {
            Icon(...)
        }
    }
)
```

**Применяется в:**
- `TaskDetailsScreen.kt` — кнопка назад в header
- Все экраны с кастомным TopAppBar

### 2. Клики на карточках с навигацией

Все clickable карточки, которые открывают новый экран, должны использовать `clickableDebounced()`.

**Пример (TaskCardView.kt):**
```kotlin
Column(
    modifier = Modifier
        .clickableDebounced(onClick = onDetail)
) {
    // Контент карточки
}
```

**Применяется в:**
- `TaskCardView.kt` — клик на карточку задачи открывает TaskDetailsScreen
- Все карточки списков с навигацией

### 3. Кнопки с навигацией

Все кнопки (WfmPrimaryButton, WfmSecondaryButton, WfmLinkButton), которые вызывают навигацию.

**Пример:**
```kotlin
val (buttonEnabled, debouncedNavigate) = rememberDebouncedClick {
    navController.navigate(...)
}

WfmPrimaryButton(
    text = "Далее",
    isEnabled = buttonEnabled,
    onClick = debouncedNavigate
)
```

**Применяется в:**
- Кнопки подтверждения с переходом на новый экран
- Кнопки "Перейти к..." в BottomSheet

## Когда НЕ нужен debounce

- Обычные UI действия без навигации (открытие bottom sheet, показ toast)
- Toggle кнопки (переключатели, чекбоксы)
- Клики по элементам внутри одного экрана без навигации

## Технические детали

### Время debounce

**Рекомендуемое значение:** `500ms` (стандарт для Android навигации)

**Меньше 300ms** — может не защитить от быстрых двойных кликов
**Больше 700ms** — заметная задержка для пользователя

### Реализация

- Использует `rememberCoroutineScope()` для управления корутинами
- Автоматически очищается при dispose composable
- Не блокирует UI thread
- Совместим с любыми навигационными библиотеками

### Обработка состояния

После клика:
1. `isEnabled` устанавливается в `false`
2. Вызывается `onClick()`
3. Запускается корутина с `delay(debounceTime)`
4. После задержки `isEnabled` восстанавливается в `true`

Повторные клики во время `isEnabled = false` игнорируются.

## Примеры проблем без debounce

### Проблема 1: Множественный pop()

**Без debounce:**
```kotlin
IconButton(onClick = { navController.popBackStack() }) {
    Icon(...)
}
```

**Что происходит при быстром двойном клике:**
1. Первый клик: `popBackStack()` → закрывает TaskDetailsScreen
2. Второй клик: `popBackStack()` → закрывает MainTabScreen
3. Результат: белый экран (пустая Activity)

**С debounce:**
```kotlin
val (enabled, debounced) = rememberDebouncedClick { navController.popBackStack() }
IconButton(onClick = debounced, enabled = enabled) { Icon(...) }
```

Второй клик игнорируется — навигация происходит только один раз.

### Проблема 2: Дублирование экранов

**Без debounce:**
```kotlin
TaskCardView(
    modifier = Modifier.clickable {
        navController.navigate("task_details/$taskId")
    }
)
```

**Что происходит при быстром двойном клике:**
1. Первый клик: открывает TaskDetailsScreen для задачи A
2. Второй клик: открывает еще один TaskDetailsScreen для задачи A
3. Результат: два одинаковых экрана в back stack

**С debounce:**
```kotlin
TaskCardView(
    modifier = Modifier.clickableDebounced {
        navController.navigate("task_details/$taskId")
    }
)
```

Второй клик игнорируется — открывается только один экран.

## Связанные файлы

- `TaskDetailsScreen.kt` — использует `rememberDebouncedClick()` для кнопки назад
- `TaskCardView.kt` — использует `clickableDebounced()` для клика на карточку
- `MainTabScreen.kt` — все навигационные действия через debounce
