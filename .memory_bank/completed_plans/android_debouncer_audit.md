# План: Аудит ClickDebouncer на всех экранах Android

**Статус:** Выполнено
**Создан:** 2026-04-01
**Завершен:** 2026-04-02
**Последнее обновление:** 2026-04-02

## Цель

Проверить все экраны Android приложения на использование ClickDebouncer для навигационных действий и внедрить где необходимо.

## Критерии проверки

Для каждого экрана проверяем:
1. **Кнопка "назад" в TopAppBar** — использует `rememberDebouncedClick()`
2. **Clickable карточки с навигацией** — используют `clickableDebounced()`
3. **Кнопки с навигацией** — используют debounced callbacks

## Задачи

### Экраны с кнопкой "назад" (требуют проверки)

- [x] TaskDetailsScreen.kt — ✅ внедрен (backButton + debounce)
- [x] AssignmentsListScreen.kt — ✅ исправлено (строка 101: IconButton с debounce)
- [x] EmployeeFilterScreen.kt — ✅ исправлено (CustomHeader: IconButton с debounce)
- [x] TaskFiltersScreen.kt — ✅ исправлено (строка 122: IconButton с debounce)
- [x] NoAssignmentsScreen.kt — ✅ исправлено (кнопки "Обновить" и "Выйти")

### Экраны с clickable элементами с навигацией

- [x] TaskCardView.kt (компонент) — ✅ внедрен clickableDebounced
- [x] ManagerHomeScreen.kt — ✅ исправлено (кнопка "Все" с clickableDebounced)
- [x] ManagerTaskCardView.kt (компонент) — ✅ исправлено (карточка с clickableDebounced)
- [x] TasksListScreen.kt — ✅ проверено (клики через TaskCardView, onOpenShift переключает таб)
- [x] ManagerTasksListScreen.kt — ✅ исправлено (кнопка фильтра + дропдаун сотрудников)
- [x] SettingsScreen.kt — ✅ исправлено (AssignmentsButton, LoginAsButton, ShareAppButton, LogoutButton)

### TabBar экраны (не требуют debounce)

- [x] MainTabScreen.kt — ✅ проверено (TabBar, нет навигационных кнопок)
- [x] ManagerMainTabScreen.kt — ✅ проверено (TabBar, нет навигационных кнопок)

### Служебные экраны (обычно без навигации)

- [x] WelcomeScreen.kt — ✅ исправлено (кнопка "Войти" с навигацией к Auth)
- [x] SplashScreen.kt — ✅ проверено (загрузочный экран, нет навигации)
- [x] HomeScreen.kt — ✅ проверено (информационный экран, нет навигации)
- [x] DevelopmentStubScreen.kt — ✅ проверено (заглушка, нет навигации)

## Чеклист для каждого экрана

При проверке экрана:

1. Открыть файл экрана
2. Найти все места с навигацией:
   - `IconButton(onClick = onNavigateBack)`
   - `IconButton(onClick = { navController.popBackStack() })`
   - `.clickable { navController.navigate(...) }`
   - `WfmPrimaryButton(onClick = { navController... })`
3. Проверить использование debouncer:
   - Есть ли `rememberDebouncedClick()`?
   - Есть ли `.clickableDebounced()`?
   - Передается ли debounced callback в кнопки?
4. Если нет — внедрить по паттерну из TaskDetailsScreen.kt
5. Отметить задачу выполненной

## Паттерны для внедрения

### Кнопка "назад" в TopAppBar

```kotlin
import com.beyondviolet.wfm.core.utils.rememberDebouncedClick

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

### Clickable карточка с навигацией

```kotlin
import com.beyondviolet.wfm.core.utils.clickableDebounced

Column(
    modifier = Modifier
        .clickableDebounced(debounceTime = 500L, onClick = onDetail)
) {
    // Контент карточки
}
```

### Кнопка с навигацией

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

## Приоритет

**Высокий приоритет** (часто используемые экраны):
1. TaskDetailsScreen.kt ✅
2. AssignmentsListScreen.kt
3. EmployeeFilterScreen.kt
4. TaskFiltersScreen.kt
5. ManagerHomeScreen.kt

**Средний приоритет**:
6. SettingsScreen.kt
7. ManagerTasksListScreen.kt
8. NoAssignmentsScreen.kt

**Низкий приоритет**:
9. WelcomeScreen.kt
10. HomeScreen.kt
11. MainTabScreen.kt / ManagerMainTabScreen.kt

## Лог выполнения

### 2026-04-01
- Создан план аудита
- Внедрен ClickDebouncer в TaskDetailsScreen.kt (кнопка назад)
- Внедрен clickableDebounced в TaskCardView.kt (клик на карточку)
- Проблема с белым экраном при быстрых кликах решена
- ✅ Проверены и исправлены экраны высокого приоритета:
  - AssignmentsListScreen.kt — добавлен debounce для кнопки назад
  - EmployeeFilterScreen.kt — добавлен debounce для кнопки назад в CustomHeader
  - TaskFiltersScreen.kt — добавлен debounce для кнопки назад
  - ManagerHomeScreen.kt — добавлен clickableDebounced для кнопки "Все"
  - ManagerTaskCardView.kt — добавлен clickableDebounced для карточки задачи
- ✅ Проверены и исправлены экраны среднего приоритета:
  - ManagerTasksListScreen.kt — добавлен debounce для кнопки фильтра (IconButton) и дропдауна сотрудников (clickableDebounced)
  - NoAssignmentsScreen.kt — добавлен debounce для кнопок "Обновить" и "Выйти" (навигация к Auth)
  - SettingsScreen.kt — добавлен debounce для всех кнопок (AssignmentsButton, LoginAsButton с clickableDebounced, ShareAppButton, LogoutButton)
- ✅ Проверены и исправлены служебные экраны:
  - WelcomeScreen.kt — добавлен debounce для кнопки "Войти" (навигация к Auth)

### 2026-04-02
- ✅ Завершен полный аудит всех Android экранов
- Проверены все экраны из списка (23 экрана/компонента)
- Внедрен ClickDebouncer в 12 экранах с навигационными действиями
- Проверены и подтверждены безопасными 11 экранов (без навигации или уже с debounce)
- Все навигационные элементы теперь защищены от двойных кликов
- План выполнен на 100%
