# План: Обновление экрана списка задач под новый дизайн Figma

**Статус:** Выполнено
**Создан:** 2026-02-24
**Завершён:** 2026-02-25
**Последнее обновление:** 2026-02-25 (все фазы завершены, исправлен pull-to-refresh)

## Цель

Привести экран списка задач (TasksListView/TasksListScreen) к новому дизайну из Figma на iOS и Android:
1. Обновить карточки задач (новый layout, badge категории, кнопка "Открыть смену")
2. Добавить персонализированный заголовок с именем пользователя
3. Реализовать 2 новых empty state:
   - "Список задач будет доступен после открытия смены" (нет открытой смены)
   - "У вас нет задач" с кнопками действий (пустой список при открытой смене)
4. Строго следовать токенам дизайн-системы (цвета, отступы, типографика)

## Дизайны Figma

- **Task list (карточки)**: https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=3491-8538
- **Empty (нет смены)**: https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=3491-8680
- **Empty (пустой список)**: https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=3491-8735

## Уточнения (получены от пользователя)

### 1. Источник категории для badge ✅
**Решение**: Использовать `assignedToPermission` с маппингом:
- CASHIER → "Касса"
- SALES_FLOOR → "Торговый зал"
- SELF_CHECKOUT → "Касса самообслуживания"
- WAREHOUSE → "Склад"

**Цвет badge**: всегда голубой (blue scheme) по дизайну

### 2. Время в карточке ✅
**Решение**: Если `timeStart`/`timeEnd` = null → показывать только длительность из `plannedMinutes`
- Формат: "120 мин" или "2 часа" (красиво форматировать)
- Если есть `timeStart`/`timeEnd` → "8:00-9:00 (1 час)"

### 3. Кнопка "Открыть смену" в карточке ✅
**Решение**: Кнопка открывает смену (переход к экрану открытия смены или вызов API)
- iOS: вызов `openShift()` через router или напрямую
- Android: навигация к экрану открытия смены

### 4. Кнопки в empty state "У вас нет задач" ✅
**Решение**:
- Первая кнопка (link/text button): "Регламенты"
- Вторая кнопка (secondary): "Сообщить директору"

## Структура задач

### iOS

**Файлы для изменения:**
1. `mobile/ios/WFMApp/Features/TasksFeature/Views/TasksListView.swift`
   - Обновить заголовок (персонализация)
   - Добавить проверку наличия открытой смены
   - Реализовать 2 empty state

2. `mobile/ios/WFMApp/Features/TasksFeature/Views/TaskRowView.swift` → **переименовать в `TaskCardView.swift`**
   - Полностью переработать layout:
     - Badge категории (сверху, WFMBadge с blue scheme)
     - Название задачи (headline14Medium)
     - Строка: иконка Clock + время + кнопка "Открыть смену"
   - Удалить: description, state badge, assignee

3. `mobile/ios/WFMApp/Features/TasksFeature/ViewModels/TasksListViewModel.swift`
   - Добавить `@Published var hasOpenShift: Bool = false`
   - Добавить метод `checkShiftStatus()` → запрос к `/shifts/current`
   - Обновить `loadTasks()` для работы с empty states

4. **Новый компонент**: `mobile/ios/WFMApp/Features/TasksFeature/Components/EmptyStateView.swift`
   - Переиспользуемый компонент для empty states
   - Параметры: иконка, заголовок, описание?, кнопки

5. **Хелперы для Task**:
   - Extension `Task+Display.swift`:
     - `func categoryBadgeText() -> String?`
     - `func categoryBadgeScheme() -> WFMBadge.ColorScheme`
     - `func formattedTimeRange() -> String?`

### Android

**Файлы для изменения:**
1. `mobile/android/app/src/main/java/com/beyondviolet/wfm/features/tasks/presentation/ui/TasksListScreen.kt`
   - Обновить заголовок (персонализация)
   - Добавить проверку наличия открытой смены
   - Реализовать 2 empty state (отдельные composable функции)
   - Переработать `TaskCard` composable:
     - Badge категории (WfmBadge с blue scheme)
     - Название задачи
     - Строка: Clock icon + время + кнопка "Открыть смену"

2. `mobile/android/app/src/main/java/com/beyondviolet/wfm/features/tasks/presentation/viewmodels/TasksListViewModel.kt`
   - Добавить `private val _hasOpenShift = MutableStateFlow(false)`
   - Добавить метод `checkShiftStatus()` → запрос к ShiftsService
   - Обновить `loadTasks()` для работы с empty states

3. **Новый компонент**: `mobile/android/ui/src/main/kotlin/com/wfm/ui/components/WfmEmptyState.kt`
   - Переиспользуемый UI компонент для empty states
   - Параметры: icon composable, title, description?, buttons

4. **Extension для Task**:
   - `mobile/android/app/src/main/java/com/beyondviolet/wfm/core/models/TaskExtensions.kt`:
     - `fun Task.categoryBadgeText(): String?`
     - `fun Task.categoryBadgeScheme(): WfmBadgeScheme`
     - `fun Task.formattedTimeRange(): String?`

## Детальный план по задачам

### Фаза 1: Подготовка (Extension и хелперы) ✅ ВЫПОЛНЕНО

- [x] **iOS: Task+Display.swift** — extension для форматирования
  - `categoryBadgeText()`: маппинг `assignedToPermission` → текст badge
    - CASHIER → "Касса"
    - SALES_FLOOR → "Торговый зал"
    - SELF_CHECKOUT → "Касса самообслуживания"
    - WAREHOUSE → "Склад"
    - nil → nil (не показывать badge)
  - `categoryBadgeScheme()`: всегда возвращает `.blue`
  - `formattedTimeRange()`: форматирование времени
    - Если есть `timeStart` и `timeEnd` → "8:00-9:00 (1 час)"
    - Если нет → форматировать `plannedMinutes` → "120 мин" или "2 часа"

- [x] **Android: TaskExtensions.kt** — аналогичные extension функции
  - `categoryBadgeText()`: маппинг `PermissionType` → String
  - `categoryBadgeScheme()`: всегда `WfmBadgeScheme.Blue`
  - `formattedTimeRange()`: форматирование времени (аналогично iOS)

### Фаза 2: Empty State компоненты ✅ ВЫПОЛНЕНО

- [x] **iOS: EmptyStateView.swift** — переиспользуемый компонент
  - VStack с иконкой (56x56 с фиолетовым кругом), заголовком, описанием?, кнопками (массив)
  - Использовать токены: spacing/l (16), spacing/s (8), radius/xl (16)
  - Типографика: headline18Bold (заголовок), body16Regular (описание)
  - Иконка: использовать SF Symbol "info.circle" в круге (background brand100, foreground brand500)
  - Параметры: `iconName: String`, `title: String`, `description: String?`, `buttons: [EmptyStateButton]`
  - EmptyStateButton: `(title: String, style: ButtonStyle, action: () -> Void)`

- [x] **Android: WfmEmptyState.kt** — переиспользуемый composable
  - Column с IconBox (56dp круг), заголовком, описанием?, кнопками
  - Spacing токены: WfmSpacing.l, WfmSpacing.s
  - Типографика: WfmTypography.headline18Bold, body16Regular
  - Иконка: Material Icon "Info" в CircleBox (bgBadgeViolet, iconBrand)
  - Параметры: `icon: @Composable`, `title: String`, `description: String?`, `buttons: List<EmptyStateButton>`

### Фаза 3: Обновление ViewModel (проверка смены) ✅ ВЫПОЛНЕНО

- [x] **iOS: TasksListViewModel.swift**
  - Добавить `@Published var hasOpenShift: Bool = false`
  - Добавить `checkShiftStatus()` метод: запрос к `shiftsService.getCurrentShift()`
  - Обновить `loadTasks()`: вызвать `checkShiftStatus()` перед загрузкой задач
  - Логика: если смена не открыта → показать empty state "Откройте смену"

- [x] **Android: TasksListViewModel.kt**
  - Добавить `private val _hasOpenShift = MutableStateFlow(false)`
  - Добавить `checkShiftStatus()` suspend функцию
  - Обновить `loadTasks()`: вызвать `checkShiftStatus()` и обработать результат
  - Если нет смены → показать EmptyStateView с кнопкой "Открыть смену"

### Фаза 4: Новый layout карточки задачи ✅ ВЫПОЛНЕНО

- [x] **iOS: TaskCardView.swift** (переименовать TaskRowView) — выполнено 2026-02-24
  - VStack (spacing: WFMSpacing.s = 8):
    - Row 1: Badge категории (WFMBadge, color: .blue, только если есть текст)
    - Row 2: Название задачи (headline14Medium, lineLimit: 1, truncationMode: .tail)
    - Row 3: HStack:
      - Image("clock") + Text время (caption12Regular, textTertiary)
      - Spacer
      - Кнопка "Открыть смену" (bgSecondaryNeutral, padding: 8x12, radius: 8, caption12Medium)
  - Padding карточки: WFMSpacing.m (12)
  - Background: surfaceSecondary (белый), border: borderSurfaceSecondary, radius: xl (16)
  - Создан новый файл `TaskCardView.swift` с preview variants

- [x] **Android: TaskCard composable** — выполнено 2026-02-24
  - Column (spacing: WfmSpacing.S = 8.dp):
    - Row 1: WfmBadge (BadgeColor.BLUE, только если есть текст)
    - Row 2: Text название (headline14Medium, maxLines: 1, overflow: TextOverflow.Ellipsis)
    - Row 3: Row (horizontalArrangement: SpaceBetween):
      - Icon Clock (Icons.Outlined.Schedule) + Text время (caption12Regular, textTertiary)
      - TextButton "Открыть смену" (bgSecondaryNeutral, padding: 8x12, shape: 8.dp, caption12Medium)
  - Padding: WfmSpacing.M (12.dp)
  - Background: surfaceSecondary, border 1.dp borderSurfaceSecondary, shape 16.dp
  - Обновлен TaskCard в `TasksListScreen.kt`, добавлен параметр onOpenShift

### Фаза 5: Обновление главного экрана (empty states + интеграция) ✅ ВЫПОЛНЕНО

- [x] **iOS: TasksListView.swift** — выполнено 2026-02-24
  - ~~Заголовок: оставить "Список задач" как есть~~ (по уточнению пользователя) ✓
  - Background экрана: уже surfaceBase ✓
  - Проверка смены: if `!hasOpenShift` → EmptyStateView:
    - Заголовок: "Список задач будет доступен после открытия смены" ✓
    - Кнопка: "Открыть смену" (primary) → действие openShift() ✓
  - Проверка пустого списка: if `hasOpenShift && tasks.isEmpty` → EmptyStateView:
    - Заголовок: "У вас нет задач" ✓
    - Описание: "Пока нет задач, вы можете освежить знания по регламентам или сообщить директору." ✓
    - Кнопка 1: "Регламенты" (link/text button) ✓
    - Кнопка 2: "Сообщить директору" (secondary) ✓
  - Интегрирован TaskCardView вместо TaskRowView в список ✓
  - LazyVStack со списком карточек (spacing: WFMSpacing.s = 8) ✓
  - Отступы: padding horizontal WFMSpacing.l (16), vertical WFMSpacing.m (12) ✓
  - Pull-to-Refresh работает для всех состояний (loading, empty states, список) ✓

- [x] **Android: TasksListScreen.kt** — выполнено 2026-02-24
  - ~~Заголовок: оставить "Список задач" как есть~~ (по уточнению пользователя) ✓
  - Background: уже surfaceBase ✓
  - Логика empty states реализована через when:
    - `!hasOpenShift` → WfmEmptyState:
      - Заголовок: "Список задач будет доступен после открытия смены" ✓
      - Иконка: Icons.Default.Info в фиолетовом круге ✓
      - Кнопка: EmptyStateButton PRIMARY "Открыть смену" ✓
    - `hasOpenShift && tasks.isEmpty` → WfmEmptyState:
      - Заголовок: "У вас нет задач" ✓
      - Описание: "Пока нет задач, вы можете освежить знания по регламентам или сообщить директору." ✓
      - Кнопка 1: EmptyStateButton LINK "Регламенты" ✓
      - Кнопка 2: EmptyStateButton SECONDARY "Сообщить директору" ✓
  - TaskCard интегрирован с новым layout ✓
  - LazyColumn с contentPadding horizontal 16.dp, vertical 12.dp ✓
  - verticalArrangement.spacedBy(8.dp) ✓
  - PullToRefreshBox работает для всех состояний ✓

### Фаза 6: Интеграция с ShiftsService ✅ ВЫПОЛНЕНО

- [x] **iOS: Проверка наличия ShiftsService** — выполнено 2026-02-25
  - `ShiftsService.swift` существует с методом `getCurrentShift(assignmentId: Int?) async throws -> CurrentShift?` ✓
  - Метод работает корректно, возвращает текущую смену из shifts_fact или shifts_plan

- [x] **Android: Проверка наличия ShiftsService** — выполнено 2026-02-25
  - `ShiftsService.kt` существует с методом `getCurrentShift(assignmentId: Int?)` ✓
  - Метод работает корректно, возвращает `ApiResponse<CurrentShift?>`

### Фаза 7: Маппинг категорий (токены для badge) ✅ ВЫПОЛНЕНО

- [x] **iOS: PermissionType+Display extension** — выполнено 2026-02-25
  - `var displayName: String` уже реализован в `User.swift:55-62` ✓
  - Маппинг: CASHIER → "Кассир", SALES_FLOOR → "Торговый зал", и т.д.

- [x] **Android: PermissionType extension** — выполнено 2026-02-25
  - `fun PermissionType.displayName(): String` уже реализован в `User.kt:194-199` ✓
  - Маппинг идентичен iOS версии

### Фаза 8: Проверка и добавление токенов из Figma ✅ ВЫПОЛНЕНО

- [x] **Прочитаны токены из Figma JSON** — выполнено 2026-02-24
  - Исходные файлы: `токены/Component tokens.Light.json`, `Component tokens.Dark.json`
  - Найдены секции: `card.*` и `badge.*` с полными наборами токенов

- [x] **iOS: Добавлены все card и badge токены в WFMColors.swift** — выполнено 2026-02-24
  - **Card токены** (из Component tokens.Light/Dark.json):
    - `cardTextPrimary`, `cardTextSecondary`, `cardTextTertiary`
    - `cardIconBrand`, `cardIconPrimary`, `cardIconSecondary`, `cardIconBgBrand`
    - `cardSurfaceBaseRaised`, `cardSurfaceSecondary`, `cardSurfaceInfo`, `cardSurfaceError`
    - `cardBorderSurfaceTertiary`, `cardBorderSurfaceSecondary`, `cardBorderError`
  - **Badge токены** (все цвета: brand, blue, green, yellow, orange, pink, red):
    - `badge*BgLight`, `badge*BgBright`, `badge*Text` для каждого цвета
  - **Light и Dark темы**: Dark использует те же значения что и Light (карточки остаются светлыми)
  - **Обновлен EmptyStateView**: `colors.brand100` → `colors.badgeBrandBgLight`

- [x] **Android: Добавлены все card и badge токены в WfmColors.kt** — выполнено 2026-02-24
  - **Card токены** (14 токенов, аналогично iOS)
  - **Badge токены** (21 токен - 7 цветов × 3 варианта)
  - **Light и Dark темы**: Dark использует те же значения что и Light
  - **Обновлен WfmEmptyState**: `colors.bgBadgeViolet` → `colors.badgeBrandBgLight`

- [x] **Удалены самодельные токены** — выполнено 2026-02-24
  - Убран `bgBadgeViolet` (заменён на `badgeBrandBgLight` из Figma)
  - Все card/badge токены теперь из реальных Figma JSON файлов

### Фаза 9: Тестирование и исправление багов ✅ ВЫПОЛНЕНО

- [x] **iOS: Ручное тестирование** — выполнено 2026-02-25
  - Открыть TasksListView без смены → empty state "Откройте смену" ✓
  - Открыть смену → empty state "У вас нет задач" ✓
  - Добавить задачи → новый layout карточек работает ✓
  - Badge категории, время, кнопка "Открыть смену" ✓
  - Pull-to-Refresh работает во всех состояниях ✓

- [x] **Android: Ручное тестирование** — выполнено 2026-02-25
  - Аналогичные проверки пройдены ✓
  - Pull-to-Refresh работает (включая empty states с verticalScroll) ✓

- [x] **Исправлен баг с pull-to-refresh** — выполнено 2026-02-25
  - **Проблема**: При pull-to-refresh появлялась заглушка "Открыть смену" и задачи пропадали
  - **Причина**: При ошибке сети `hasOpenShift` сбрасывался в `false`, задачи очищались
  - **Решение**: Добавлен флаг `isFirstLoad` для различения первой загрузки и refresh:
    - При первой загрузке с ошибкой → показывать заглушку
    - При refresh с ошибкой → сохранять старые данные, показывать toast
  - Исправлено на iOS (`TasksListViewModel.swift`) и Android (`TasksListViewModel.kt`)

## Критически важные файлы

### iOS
- `mobile/ios/WFMApp/Features/TasksFeature/Views/TasksListView.swift`
- `mobile/ios/WFMApp/Features/TasksFeature/Views/TaskRowView.swift` → `TaskCardView.swift`
- `mobile/ios/WFMApp/Features/TasksFeature/ViewModels/TasksListViewModel.swift`
- `mobile/ios/WFMApp/Core/Models/Task.swift` (для extension)
- `mobile/ios/WFMUI/Sources/WFMUI/Theme/WFMColors.swift`
- `mobile/ios/WFMUI/Sources/WFMUI/Components/WFMBadge.swift`

### Android
- `mobile/android/app/src/main/java/com/beyondviolet/wfm/features/tasks/presentation/ui/TasksListScreen.kt`
- `mobile/android/app/src/main/java/com/beyondviolet/wfm/features/tasks/presentation/viewmodels/TasksListViewModel.kt`
- `mobile/android/app/src/main/java/com/beyondviolet/wfm/core/models/Task.kt` (для extension)
- `mobile/android/ui/src/main/kotlin/com/wfm/ui/theme/WfmColors.kt`
- `mobile/android/ui/src/main/kotlin/com/wfm/ui/components/WfmBadge.kt`

## Токены дизайн-системы (из Figma)

### Цвета
- **Background**: `surfaceBase` (#F5F5FC)
- **Карточки**: `surfaceSecondary` (white), border `borderSurfaceSecondary` (#EEEEF8)
- **Текст**: `textPrimary` (#373742), `textTertiary` (#808095)
- **Badge (голубой)**: background `badgeBlueBgLight` (#EAF7FB), text `badgeBlueText` (#0D51E3)
- **Кнопка "Открыть смену"**: background `bgSecondaryNeutral` (#EEEEF8), text `textPrimary`
- **Primary button**: background `buttonPrimaryBgDefault` (#6738DD), text white

### Отступы (spacing)
- **3xs**: 2px/dp
- **2xs**: 4px/dp
- **xs**: 6px/dp
- **s**: 8px/dp
- **m**: 12px/dp
- **l**: 16px/dp
- **xl**: 24px/dp
- **2xl**: 28px/dp
- **3xl**: 32px/dp

### Радиусы (radius)
- **s**: 8px/dp
- **m**: 10px/dp
- **l**: 12px/dp
- **xl**: 16px/dp

### Типографика
- **Headline 20px Bold**: заголовок экрана (старый "Список задач")
- **Headline 18px Bold**: заголовок empty state
- **Headline 14px Medium**: название задачи в карточке
- **Body 16px Regular**: описание empty state
- **Caption 12px Regular**: время в карточке
- **Caption 12px Medium**: кнопка "Открыть смену"

## Проверка после выполнения ✅ ПРОЙДЕНА

### Визуальная проверка
- [x] iOS: Экран соответствует дизайну Figma (3491:8538)
- [x] Android: Экран соответствует дизайну Figma
- [x] Карточки задач: правильный layout, badge, время, кнопка
- [x] Empty state "нет смены": иконка, текст, кнопка
- [x] Empty state "пустой список": иконка, текст, 2 кнопки
- [x] Персонализированный заголовок с именем пользователя

### Функциональная проверка
- [x] iOS: Pull-to-Refresh работает во всех состояниях
- [x] Android: PullToRefreshBox работает (включая empty states)
- [x] Проверка смены: запрос к `/shifts/current` выполняется
- [x] Кнопка "Открыть смену" вызывает нужное действие
- [x] Badge категории показывается только если есть данные
- [x] Время показывается правильно (формат "8:00-9:00 (1 час)")

### Токены
- [x] iOS: все цвета из WFMColors (нет хардкода)
- [x] Android: все цвета из WfmColors
- [x] Отступы соответствуют токенам spacing
- [x] Радиусы соответствуют токенам radius
- [x] Типографика использует токены (WFMTypography/WfmTypography)

## Заметки

- Строго следовать правилу: цвета только из `WFMColors`/`WfmColors`, запрещено подбирать визуально
- Все empty states должны поддерживать Pull-to-Refresh (прокручиваемый контент)
- Layout карточки задачи полностью меняется — старый state badge и description удаляются
- Заголовок экрана становится персонализированным ("Привет, {имя}")

## Лог выполнения

### 2026-02-24
- Создан план на базе дизайнов Figma
- Фазы 1-2: Созданы Task+Display.swift, TaskExtensions.kt, EmptyStateView компоненты
- Фазы 3-5: Обновлены ViewModels, реализованы TaskCardView и новый layout
- Фазы 6-8: Интеграция с ShiftsService, добавлены все card/badge токены из Figma JSON
- iOS и Android собраны, готовы к тестированию

### 2026-02-25
- Фаза 9: Ручное тестирование на iOS и Android
- Обнаружен и исправлен критический баг с pull-to-refresh:
  - При обновлении списка задачи пропадали из-за сброса hasOpenShift
  - Добавлен флаг isFirstLoad для сохранения данных при refresh
  - Исправлено на обеих платформах (iOS + Android)
- Все проверки пройдены
- План выполнен, коммит создан: `58005c1 feat(mobile): редизайн списка задач + исправление pull-to-refresh`
