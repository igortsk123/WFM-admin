# BottomSheet

- **iOS:** `WFMUI/Sources/WFMUI/Components/WFMBottomSheet.swift` (обёртка над библиотекой BottomSheet 3.1.1)
- **Android:** `ui/src/main/kotlin/com/wfm/ui/components/WfmBottomSheet.kt`

**iOS использует стороннюю библиотеку [BottomSheet](https://github.com/lucaszischka/BottomSheet) v3.1.1** для реализации поведения Material 3:
- Автоматическая адаптация высоты под контент (если контент < экрана → показывает на высоте контента, если контент > экрана → fullscreen + внутренний скролл)
- Drag indicator, swipe to dismiss, tap to dismiss
- Blur эффект для overlay

---

## Использование

### iOS

**Базовое использование через модификатор** (применяется на уровне TabView для глобального управления):

```swift
.wfmBottomSheet(isPresented: $bottomSheetManager.isPresented, showOverlay: bottomSheetManager.showOverlay) {
    if let content = bottomSheetManager.content {
        content
    }
}
```

**Показ BottomSheet через глобальный BottomSheetManager** (рекомендуемый паттерн):

```swift
@EnvironmentObject private var container: DependencyContainer

Button("Показать") {
    MyBottomSheet.show(
        bottomSheetManager: container.bottomSheetManager,
        onAction: { /* действие */ }
    )
}
```

**BottomSheetManager** (iOS only) — глобальный @MainActor ObservableObject для управления BottomSheet:
- Находится в `WFMApp/Core/Managers/BottomSheetManager.swift`
- Регистрируется в `DependencyContainer.shared.bottomSheetManager`
- Методы: `show(showOverlay:content:)`, `dismiss()`
- Автоматически применяется `.dynamic` позиционирование (высота подстраивается под контент)

**Особенности реализации:**
- Используется библиотека BottomSheet с `.switchablePositions([.dynamic, .hidden])`
- Включены drag indicator, swipe/tap to dismiss
- `.zIndex(100)` — BottomSheet выше TabBar (zIndex 1)
- Overlay — solid scrim (`surfaceOverlayModal`), реализован через `.overlay { Color }` на контенте ДО `.bottomSheet()` модификатора; `allowsHitTesting(false)` позволяет tap-to-dismiss работать сквозь overlay

**Race condition BS1 → BS2 (dismiss → show):**
Если из BS1 вызвать `show()` для BS2, `dismiss()` BS1 запускает cleanup-задачу с задержкой 300ms. Без отмены эта задача обнуляет `content` уже после того как BS2 был установлен. Решение: `show()` отменяет pending cleanup-задачу через `cleanupTask?.cancel()`; в cleanup используется `do { try await sleep() } catch { return }` (не `try?`), чтобы `CancellationError` прерывал выполнение.

### Android

```kotlin
WfmBottomSheet(
    isVisible = show,
    onDismiss = { show = false }
) {
    // контент (ColumnScope)
}

// С затемнением фона (для модальных действий):
WfmBottomSheet(
    isVisible = show,
    onDismiss = { show = false },
    showOverlay = true
) {
    // контент
}
```

Запрет закрытия: передать пустой `onDismiss = {}`.

---

## Затемнение фона (showOverlay)

Параметр `showOverlay: Bool/Boolean` управляет затемнением фона за шитом.

| Значение | Поведение |
|----------|-----------|
| `false` (по умолчанию) | Без затемнения — фон остаётся видимым |
| `true` | Затемнение через `bgOverlayModal` |

**Правило:** Для информационных и вспомогательных шитов — без затемнения (дефолт). Для модальных действий, требующих явного подтверждения (выход, закрытие смены) — `showOverlay = true`.

**Реализация:**
- **Android:** `scrimColor = if (showOverlay) colors.surfaceOverlayModal else Color.Transparent`
- **iOS:** solid overlay через `.overlay { surfaceOverlayModal }` с `allowsHitTesting(false)`; при `showOverlay = false` используется `SheetScrimSuppressor` (UIViewRepresentable) для отключения системного scrim

---

## Скролл / клавиатура

**iOS:** `ScrollView` **встроен в `WFMBottomSheet`** — контент автоматически становится прокручиваемым. Максимальная высота: 88% экрана (`scrollBounceBehavior(.basedOnSize)`). Не оборачивать контент в дополнительный `ScrollView`.

**Android:**
```kotlin
Column(
    modifier = Modifier
        .heightIn(max = 500.dp)
        .verticalScroll(rememberScrollState())
        .imePadding()  // если есть TextField
        .padding(WfmSpacing.XL)
)
```

---

## Drag Handle (Android)

Кастомный индикатор drag сверху листа (заменяет Material3 дефолтный):
- Размер: `48×5dp`, скругление `50%`
- Цвет: `WfmColors.Neutral400`
- Отступы: `padding(top = WfmSpacing.S, bottom = WfmSpacing.S)` (8dp сверху и снизу)

Реализован в `WfmBottomSheet` через параметр `dragHandle = { ... }` в `ModalBottomSheet`.

---

## Правила контента

- Горизонтальный padding: `WfmSpacing.L` (16dp) — `start` и `end`
- Нижний padding **не добавлять** — `ModalBottomSheet` автоматически добавляет `windowInsets` (navigation bar)
- Одна кнопка: `fillMaxWidth`
- Две кнопки рядом: `Row` + `weight(1f)` + `spacedBy(WfmSpacing.S)`, порядок: вторичная → основная
- Не вкладывать БШ в БШ

---

## Специфичные компоненты

### CloseShiftBottomSheet

Подтверждение закрытия смены с обработкой незавершённых задач.

**Особенности:**
- **Реактивный content** — обновляется при изменении title и message в ViewModel
- **Остаётся открытым** при ошибках `TASKS_PAUSED` / `TASKS_IN_PROGRESS` до успешного выполнения или отмены
- **Закрывается автоматически** при успехе через флаг в ViewModel
- Разные тексты для разных ошибок

**iOS:** `WFMApp/Features/Home/CloseShiftBottomSheet.swift`
**Android:** `app/src/main/java/com/wfm/features/home/CloseShiftBottomSheet.kt`

Оба используют `showOverlay = true`.

**Связанные документы:**
- `.memory_bank/mobile/feature_home/home_screen.md` — полное описание логики и флоу
- `.memory_bank/backend/apis/api_shifts.md` → `POST /close` с параметром `force`

### LogoutBottomSheet

Подтверждение выхода из профиля.

**iOS:** `WFMApp/Features/Settings/LogoutBottomSheet.swift`
```swift
LogoutBottomSheet.show(
    bottomSheetManager: container.bottomSheetManager,
    onLogout: { await router.logout() }
)
```

**Android:** `app/src/main/java/com/wfm/features/settings/LogoutBottomSheet.kt`
```kotlin
LogoutBottomSheet(
    isVisible = showLogoutSheet,
    onDismiss = { showLogoutSheet = false },
    onConfirm = { viewModel.logout(); onLogout() }
)
```

Оба используют `showOverlay = true`.

### TaskReviewSheet

BottomSheet для проверки и подтверждения/отклонения задачи менеджером (только для роли MANAGER).

**Файлы:**
- **iOS:** `WFMApp/Features/ManagerHomeFlow/Components/TaskReviewSheet.swift`
- **Android:** `app/src/main/java/com/beyondviolet/wfm/features/manager/presentation/ui/TaskReviewSheet.kt`

**Структура контента (сверху вниз):**
1. **Header** — badge типа работы + название задачи (`Headline18Bold`) + имя исполнителя
2. **TimetablesCard** — карточка с таблицей план/факт:
   - Строка «План»: метка | диапазон времени | плановая длительность
   - Строка «Факт»: метка | диапазон времени | фактическая длительность + chevron (если несколько интервалов)
   - Раскрывающийся список интервалов работы (если > 1, по нажатию на строку «Факт»)
   - Строка «Отклонение» (`badgeRedBgLight` + `cardTextError`) — только если факт > план
3. **Фото** — миниатюра с возможностью открыть полноэкранно (опционально)
4. **Поле комментария** — для причины отклонения (высота 116pt/dp, фон `surfacePrimary`)
5. **Кнопки** — «На доработку» (secondary) + «Принять» (primary)

**Полноэкранный просмотр фото:**
- **iOS:** `fullScreenCover` с черным фоном, кнопка закрытия `WFMIcons.closeIcon`
- **Android:** `Dialog` с `usePlatformDefaultWidth = false`, черный фон, иконка `ic_close`
- Клик по миниатюре → открывает фото на весь экран
- Клик по фону или кнопке закрытия → закрывает просмотр

**Вспомогательные утилиты:**
- iOS: `TimeFormatters.formatTime(_:)`, `formatDurationFromSeconds(_:)`, `formatDuration(from:to:)` — используются напрямую в компоненте (не через ViewModel)
- Android: `formatTime()`, `formatDuration()`, `formatDurationFromSeconds()` из `TaskExtensions.kt`
- Отклонение считается в минутах: `(duration_seconds / 60) - plannedMinutes`; отображается только если > 0

### ActiveTaskConflictBottomSheet

Информационный BottomSheet при попытке начать задачу когда уже есть активная (CONFLICT ошибка).

**iOS:** `WFMApp/Features/TasksFeature/Views/ActiveTaskConflictBottomSheet.swift`
```swift
ActiveTaskConflictBottomSheet.show(
    bottomSheetManager: container.bottomSheetManager,
    onConfirm: { /* действие после подтверждения */ }
)
```

**Android:** `app/src/main/java/com/beyondviolet/wfm/features/tasks/presentation/ui/ActiveTaskConflictBottomSheet.kt`
```kotlin
ActiveTaskConflictBottomSheet(
    isVisible = showConflict,
    onDismiss = { showConflict = false },
    onConfirm = { showConflict = false }
)
```

### CompleteConfirmationBottomSheet / CompleteConfirmationSheet

Подтверждение завершения задачи с опциональным добавлением фотографии.

**Файлы:**
- **iOS:** `WFMApp/Features/TasksFeature/Views/CompleteConfirmationBottomSheet.swift`
- **Android:** `app/src/main/java/com/beyondviolet/wfm/features/tasks/presentation/ui/CompleteConfirmationSheet.kt`

**Особенности:**
- Поддержка обязательного фото (`requiresPhoto` из задачи)
- Выбор источника фото: камера или галерея (через вложенный WfmBottomSheet на Android)
- Синхронная отправка: BottomSheet остаётся открытым во время загрузки, закрывается только при успехе
- Сжатие изображения перед отправкой (см. `.memory_bank/mobile/utilities/image_compression.md`)
- Android: используется `viewModelScope` (не `rememberCoroutineScope`) для корректной работы с navigation
- iOS: системный action sheet для выбора источника, PHPickerViewController для галереи, UIImagePickerController для камеры

### ShareAppBottomSheet

BottomSheet с QR-кодом для скачивания приложения. Используется в экране Настроек.

**Файлы:**
- **iOS:** `WFMApp/Features/Settings/ShareAppBottomSheet.swift`
- **Android:** `app/src/main/java/com/beyondviolet/wfm/features/settings/ShareAppBottomSheet.kt`

**Особенности:**
- Генерация QR-кода с ссылкой `https://wfm.beyondviolet.com/download`
- iOS: использует CoreImage (встроенное API) для генерации QR-кода
- Android: использует ZXing библиотеку (версия 3.5.3)
- QR-код отображается на белом фоне размером 200×200
- Использует `showOverlay = false` (без затемнения фона)

**iOS:**
```swift
ShareAppBottomSheet.show(
    bottomSheetManager: container.bottomSheetManager,
    url: "https://wfm.beyondviolet.com/download" // опционально
)
```

**Android:**
```kotlin
ShareAppBottomSheet(
    isVisible = showShareAppSheet,
    onDismiss = { showShareAppSheet = false },
    url = "https://wfm.beyondviolet.com/download" // опционально
)
```

### SelectOperationsBottomSheet

Выбор подзадач из списка (для режима `allowNewOperations = true` в экране деталей задачи).

**Файлы:**
- **iOS:** `WFMApp/Features/TasksFeature/Views/SelectOperationsBottomSheet.swift`
- **Android:** `app/src/main/java/com/beyondviolet/wfm/features/tasks/presentation/ui/SelectOperationsBottomSheet.kt`

**Структура:**
- Заголовок "Выберите подзадачу" + кнопка "Создать новую" (textBrand)
- Поле поиска с анимированной кнопкой "Отмена" (появляется при фокусе)
- Список `WFMSelectionCard(type: .select)` с чекбоксами (мультиселект), `showBorder = false`, компактный padding (`horizontal M, vertical S`)
- Операции с `reviewState == PENDING` сгруппированы под коллапсируемой строкой "Не подтверждённые" с шевроном — аккордеон-паттерн (AnimatedVisibility / withAnimation)
- Операции с `reviewState == ACCEPTED` или без статуса — показываются обычным списком выше секции PENDING
- Пустое состояние при поиске без результатов (inputCaption)
- Кнопка "Готово" — disabled если ничего не выбрано; при выборе показывает счётчик "Готово (N)"; поднимается над клавиатурой через отслеживание `keyboardHeight`
- `showOverlay = true`

**Поведение:**
- Локальное временное состояние (`tempSelected`) — применяется только по нажатию "Готово"
- "Создать новую" → закрывает этот БШ, открывает `CreateOperationBottomSheet` (с задержкой 300ms для корректной BS1→BS2 анимации)

### CreateOperationBottomSheet

Создание новой подзадачи вручную.

**Файлы:**
- **iOS:** `WFMApp/Features/TasksFeature/Views/CreateOperationBottomSheet.swift`
- **Android:** `app/src/main/java/com/beyondviolet/wfm/features/tasks/presentation/ui/CreateOperationBottomSheet.kt`

**Структура:**
- Заголовок "Новая подзадача"
- `WFMTextField` / `WfmTextField` с `backgroundColor = colors.surfacePrimary`, `showClearButton = true`
- Кнопка "Создать подзадачу" — disabled если поле пустое
- `showOverlay = true`

### TaskFiltersBottomSheet

BottomSheet фильтрации задач для управляющего (тип работ, сотрудники, зоны). Открывается с экрана "Контроль задач".

**Figma Node ID:** `4590-9847`

**Файлы:**
- **iOS:** `WFMApp/Features/ManagerTasksFlow/TaskFiltersBottomSheet.swift`
- **Android:** `app/src/main/java/com/beyondviolet/wfm/features/managertasks/TaskFiltersBottomSheet.kt`

**Использует `showOverlay = true`.**

**iOS:**
```swift
TaskFiltersBottomSheet.show(
    bottomSheetManager: container.bottomSheetManager,
    filterGroups: viewModel.filterGroups,
    taskFilterIndices: viewModel.taskFilterIndices,
    onApply: { groups in viewModel.applyFilters(groups) }
)
```

**Особенности:**
- Аккордеон (exclusive — только одна секция раскрыта одновременно); при раскрытии пересчитывается disabled-состояние чипов
- Cross-filter: на основе `taskFilterIndices: [[Int]]` из `getTaskListFiltersV2` отключает недоступные элементы в других группах
- Показывает "Показать X задач" с русской плюрализацией (вычисляется локально из `taskFilterIndices`)
- Чипы (≤10 элементов) / чекбоксы (>10 элементов) в зависимости от размера группы
- `recomputeFilterEnabledState(filterGroups:taskFilterIndices:)` — internal pure function, доступна из ViewModel

**Связанные документы:**
- `.memory_bank/mobile/feature_managertasks/manager_tasks_screens.md`
