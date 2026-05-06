# Дизайн-система WFM

UI-библиотека для iOS и Android. Все токены и компоненты берутся из неё — не хардкодим значения в экранах.

- **iOS:** SPM модуль `WFMUI` → `WFMUI/Sources/WFMUI/`
- **Android:** Gradle модуль `ui` → `ui/src/main/kotlin/com/wfm/ui/`

---

## Подключение

### iOS — Xcode setup

1. File → Add Package Dependencies
2. Add Local → выбрать папку `WFMUI`
3. Добавить `WFMUI` в target приложения

Оберни корневую View в `.wfmTheme()` — обязательно для работы Light/Dark темы.

### Android — Gradle

Добавить зависимость на модуль `ui` в `build.gradle.kts`.

---

## Структура модулей

**iOS:** `WFMUI/Sources/WFMUI/`
- `Theme/` — WFMColors.swift, WFMTypography.swift, WFMSpacing.swift
- `Components/` — WFMButton.swift, WFMBottomSheet.swift, WFMTextField.swift, WFMLoader.swift

**Android:** `ui/src/main/kotlin/com/wfm/ui/`
- `theme/` — WfmColors.kt, WfmTypography.kt, WfmSpacing.kt
- `components/` — WfmButton.kt, WfmBottomSheet.kt, WfmTextField.kt, WfmLoader.kt

---

## Цвета

**Принцип:** двухуровневая система.

- **Primitive** — базовые hex-значения (brand, neutral, red, green, blue и др.). Не используются напрямую в экранах.
- **Semantic** — токены с ролью: `textPrimary`, `surfaceBase`, `borderError`, `iconBrand` и т.д. Меняются в зависимости от темы. Только их и используем в UI.

**Импорт:**
- iOS: `import WFMUI`
- Android: `import com.beyondviolet.wfm.ui.theme.WfmTheme`

**Использование:**
- iOS: `@Environment(\.wfmColors) var colors` → `colors.textPrimary` или `WFMColors.textPrimary`
- Android: `val colors = WfmTheme.colors` → `colors.textPrimary`

**❌ НЕ импортируй:** `wfmColors` (не существует на Android)

**Файлы:** `WFMColors.swift` / `WfmColors.kt`

### Структура семантических цветов

Семантические цвета организованы в **15 логических групп** для избежания ограничения JVM (255 параметров конструктора):

- `badge` — цвета badge компонентов (6 цветовых схем)
- `bars` — цвета элементов навигации (бордеры, иконки, текст)
- `bg` — фоновые цвета (brand, secondary, error, warning, positive)
- `border` — цвета границ (base, brand, error, positive, warning)
- `button` — цвета кнопок (primary, secondary, tertiary, link, icon)
- `card` — цвета карточек (поверхности, иконки, текст, бордеры)
- `icon` — цвета иконок (primary, brand, inverse, error, positive, warning)
- `indicators` — цвета индикаторов прогресса и статуса
- `input` — цвета полей ввода (фон, бордеры, текст, placeholder, caption)
- `segmentedControl` — цвета сегментированного контрола
- `selection` — цвета элементов выбора (чекбоксы, переключатели)
- `surface` — цвета поверхностей (base, primary, raised, overlay)
- `tabbar` — цвета таббара (фон, бордер, активный/неактивный таб)
- `text` — цвета текста (primary, secondary, tertiary, brand, error)
- `toast` — цвета всплывающих уведомлений

**Доступ к цветам:**
- Вложенный: `colors.text.primary`, `colors.badge.blueBgBright`, `colors.button.primaryBgDefault`
- Плоский (через extension properties для обратной совместимости): `colors.textPrimary`, `colors.badgeBlueBgBright`, `colors.buttonPrimaryBgDefault`

**Генерация из Figma:**
Файлы генерируются автоматически скриптом `mobile/figma_color_generator/scripts/generate_semantic_colors.py` из JSON-выгрузок токенов Figma. Подробнее: [`color_generation.md`](./color_generation.md)

### ❌ Запрет на визуальный подбор цветов из Figma

**Единственный источник цветов — `WFMColors.swift` / `WfmColors.kt`.** Эти файлы содержат токены, загруженные из JSON-выгрузки Figma, и являются источником правды.

При переносе дизайна из Figma запрещено:

- Определять цвет «на глаз» по скриншоту или превью в Figma
- Использовать hex-значения, скопированные из Figma Inspect
- «Исправлять» токен, если визуально кажется, что цвет под ним другой

**Правило:** если на элементе в Figma указан токен — использовать именно его из `WFMColors` / `WfmColors` без изменений. Несоответствие визуала и токена — проблема дизайна, не кода.

Если токен в Figma не указан явно — выбрать семантически подходящий токен из `WFMColors` / `WfmColors`. Хардкодить литеральные цвета (`Color(hex: "#5B3EE8")`, `.foregroundColor(.purple)` и т.п.) **запрещено.**

**При любой неопределённости** (токен не найден в `WFMColors`, токен есть в Figma но отсутствует в коде, визуал сильно расходится с токеном) — **не угадывать и не принимать решение самостоятельно.** Сообщить пользователю о проблеме и уточнить, как поступить.

### ❌ Правило альфа-канала

Нельзя использовать `.opacity()` или альфа для изменения цвета — результат зависит от фона и непредсказуем. Альфа допустима только для теней и оверлеев (`surfaceOverlayModal`).

---

## Типографика

Шрифт Inter. Токены по схеме `Headline{size}{weight}`, `Body{size}{weight}`, `Caption{size}{weight}`.

**Импорт:**
- iOS: `import WFMUI`
- Android: `import com.beyondviolet.wfm.ui.theme.WfmTypography`

**Использование:**
- iOS: `WFMTypography.body14Regular` (используется напрямую после импорта)
- Android: `WfmTypography.Body14Regular`

**❌ НЕ импортируй:** `wfmTypography`, `LocalWfmTypography` (не существуют на Android)
**❌ НЕ используй на iOS:** `@Environment(\.wfmTypography)` (не нужен, используй WFMTypography напрямую)

Все стили — в `WFMTypography.swift` / `WfmTypography.kt`. Используем токены, не создаём собственные TextStyle.

**Основные стили:**
- `Headline24Bold`, `Headline20Bold`, `Headline18Bold`, `Headline16Bold` — крупные заголовки
- `Headline16Medium` — link кнопки, средние заголовки
- `Headline14Bold` — лейблы форм, подзаголовки (добавлен недавно)
- `Headline14Medium`, `Headline12Medium` — средние подзаголовки
- `Body14Regular`, `Body14Medium`, `Body12Medium` — основной текст
- `Body12Regular` — малый текст (12px Regular; iOS: `.wfmBody12Regular()`)
- `Caption12Regular` — мелкий вспомогательный текст

**iOS модификаторы:**
- `.wfmHeadline14Bold()` — для применения стиля `Headline14Bold`
- Другие модификаторы см. в `WFMTypography.swift`

---

## Отступы и радиусы

Токены отступов (`WFMSpacing` / `WfmSpacing`) и радиусов (`WFMRadius` / `WfmRadius`) из Figma. Стандартный горизонтальный отступ от краёв экрана — `xl` (16dp).

**Импорт:**
- iOS: `import WFMUI`
- Android: `import com.beyondviolet.wfm.ui.theme.WfmSpacing`, `import com.beyondviolet.wfm.ui.theme.WfmRadius`

**Использование:**
- iOS: `WFMSpacing.l`, `WFMRadius.l`
- Android: `WfmSpacing.L`, `WfmRadius.L`

**Файлы:** `WFMSpacing.swift` / `WfmSpacing.kt`, `WFMRadius.swift` / `WfmRadius.kt` (в том же модуле)

---

## Компоненты

### WFMTextField / WfmTextField
Базовое текстовое поле. Поддерживает label, placeholder, caption, error state, disabled, опциональный крестик очистки.

**Параметры:**
- `value` — значение поля (TextFieldValue/String)
- `onValueChange` — callback при изменении
- `placeholder` — текст плейсхолдера
- `label` (опционально) — заголовок поля
- `caption` (опционально) — подсказка снизу
- `errorMessage` (опционально) — сообщение об ошибке
- `isError` — флаг ошибки (красная рамка)
- `enabled` — активно ли поле
- `backgroundColor` (опционально) — переопределяет цвет фона поля (по умолчанию `colors.inputBg`); поддерживается на обеих платформах
- `showClearButton` (опционально, `false` по умолчанию) — показывать крестик для очистки текста; крестик скрывается opacity-анимацией когда поле пустое (layout не прыгает)
- `focusRequester` (опционально) — объект для управления фокусом (FocusRequester на Android, нет параметра на iOS)
  - Позволяет программно устанавливать фокус через `focusRequester.requestFocus()` (Android)

**Отступы:**
- Gap между label и полем ввода: `WFMSpacing.xxs` / `WfmSpacing.XXS` (4pt/dp)
- Внутренние padding поля: `WFMSpacing.m` / `WfmSpacing.M` (12pt/dp) со всех сторон; trailing увеличивается до `WFMSpacing.l` если `showClearButton = true`

### WFMPhoneTextField / WfmPhoneTextField
Поле для ввода телефона. Автоформат `+7 (XXX) XXX XX-XX`, только цифры, **крестик для очистки**.

**Различия платформ:**
| Аспект | Android | iOS |
|--------|---------|-----|
| Тип значения | `TextFieldValue` | `String` |
| Формат хранения | `+7XXXXXXXXXX` (сырой) | `+7 (XXX) XXX XX-XX` (форматированный) |
| Проверка валидности | `phone.text.length == 12` | `phone.count >= 18` |

### WFMPrimaryButton / WfmPrimaryButton
Основная кнопка (акцентный фиолетовый). Состояния: default, disabled, loading.
- **Лоадер (loading state):** `CircularProgressIndicator`, размер `20×20dp` (Android), `strokeWidth = 2dp`
- **Параметры:**
  - `text` — текст кнопки
  - `isEnabled` — активна ли кнопка (default: `true`)
  - `isLoading` — показывать ли лоадер вместо текста (default: `false`)
  - `fillHeight` (iOS only) — заполнять ли высоту контейнера (default: `true`)
  - `action` — callback при нажатии

### WFMSecondaryButton / WfmSecondaryButton
Вторичная кнопка. Поддерживает neutral стиль (серый фон), опциональную иконку, состояние загрузки.
- **Параметры:**
  - `text` — текст кнопки
  - `onClick` — callback при нажатии
  - `icon` (опционально) — иконка слева от текста (drawable resource ID для Android, asset name для iOS)
  - `enabled` — активна ли кнопка (default: `true`)
  - `isLoading` — показывать ли индикатор загрузки вместо текста (default: `false`)
  - `isNeutral` — использовать нейтральный стиль (default: `false`)
  - `size` — размер кнопки: `.big` (48dp/48pt) или `.medium` (44dp/44pt, default)
- **Лоадер (loading state):** `CircularProgressIndicator`, размер `20×20dp`, `strokeWidth = 2dp`, цвет совпадает с цветом текста
- **Layout иконки:**
  - Иконка слева от текста
  - Spacing между иконкой и текстом: 4dp/4pt
  - Размер иконки: 24dp/24pt
  - Цвет иконки совпадает с цветом текста

### WFMSocialButton / WfmSocialButton
Кнопка с иконкой для соцсетей (Telegram и др.). Нейтральный фон.

### WFMLinkButton / WfmLinkButton
Link кнопка для действий с низким приоритетом. Представляет собой текст без фона в цветах brand.

- **Дизайн:** [Figma](https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=900-12300)
- **Параметры:**
  - `text` — текст кнопки
  - `onClick` / `action` — callback при нажатии
  - `size` — размер кнопки (default: `.big`)
  - `enabled` / `isEnabled` — активна ли кнопка (default: `true`)
- **Размеры:**
  - `BIG` — 16px font, padding 16/12 (horizontal/vertical)
  - `MEDIUM` — 14px font, padding 16/12
  - `SMALL` — 12px font, padding 12/8
  - `XSMALL` — 12px font, padding 8/4
- **Типографика:**
  - BIG: `Headline16Medium`
  - MEDIUM: `Headline14Medium`
  - SMALL/XSMALL: `Headline12Medium`
- **Цвета:**
  - Default: `buttonLinkTextDefault` (brand цвет)
  - Disabled: `buttonLinkTextDisabled` (серый)

**Используется:** менее важные действия, отмена, вторичная навигация.

### WFMTextButton / WfmTextButton
Текстовая кнопка без фона. Для вторичных действий.

### WFMSegmentedControl / WfmSegmentedControl
Переключатель между несколькими опциями с плавной sliding анимацией выбранного сегмента.

**Параметры:**
- `options` — массив строк с названиями сегментов
- `selectedIndex` — индекс выбранного сегмента (binding/state)
- `onSelectionChange` (Android only) — callback при изменении выбора
- `height` (опционально) — фиксированная высота компонента (CGFloat для iOS, Dp для Android)
  - Если не указан — высота определяется padding'ом контента
  - Если указан — сегменты заполняют всю высоту

**Анимация:**
- Фон выбранного сегмента плавно перемещается между опциями (не мигает)
- iOS: использует `matchedGeometryEffect` с `@Namespace`
- Android: использует `onSizeChanged` для определения размеров контейнера, затем рассчитывает ширину сегмента и анимирует offset через `animateDpAsState`
- Длительность анимации: 200ms на обеих платформах

**Реализация (Android):**
- Контейнер Box с `.onSizeChanged` получает свои размеры в px
- Рассчитывается `segmentWidth = containerSize.width / options.size`
- Индикатор (Box) использует `.size(width, height)` и анимированный `.offset(x = offsetX)`
- Внутренний Box с `matchParentSize()` + padding создаёт отступы для фона
- Row с текстами определяет высоту контейнера (когда height не указан)

### WFMBadge / WfmBadge
Компактная метка для статусов, должностей, категорий.

- **6 цветовых схем:** `VIOLET`, `BLUE`, `YELLOW`, `PINK`, `ORANGE`, `GREEN`
- **Опциональная иконка:** `DOT` (точка слева), `THUNDER` (молния для бонусов), `NONE` (без иконки)
- **Параметры:**
  - `text` — текст метки
  - `color` — цвет из `BadgeColor` enum
  - `icon` — тип иконки (default: `NONE`)

**Автоматический выбор цвета для категорий задач:**
Для badge категорий используется **детерминированный** выбор цвета на основе `workType.id`:
- iOS: `task.categoryBadgeColor()` — extension в `Task+Display.swift`
- Android: `task.categoryBadgeScheme()` — extension в `TaskExtensions.kt`

Логика: `workType.id % 6` → индекс в массиве из 6 цветов. Это гарантирует, что каждый тип работ всегда получает один и тот же цвет.

**Используется:** категории задач, должности, бонусы, статусы.

### WFMChip / WfmChip
Компактная кнопка для выбора опций в фильтрах.

- **3 состояния:**
  - `DEFAULT` — не выбран (бордер `iconImgEmptyState`, фон прозрачный, текст `buttonTertiaryTextDefault`)
  - `ACTIVE` — выбран (фон фиолетовый, текст белый)
  - `DISABLED` — неактивен (бордер светлый, текст светлый)
- **Параметры:**
  - `text` — текст чипа
  - `state` — состояние из `WfmChipState` enum
  - `onClick` — callback при клике (опционально)
- **Размеры:**
  - Высота: 32dp/pt
  - Padding: horizontal M (12dp/pt), vertical XS (4dp/pt)
  - Радиус: M (8dp/pt)
- **Типографика:**
  - DEFAULT: `Body14Regular` / `body14Regular`
  - ACTIVE: `Headline14Medium` / `headline14Medium`

**Используется:** фильтры задач (выбор зон, типов работ).

### WFMFilterTag / WfmFilterTag
Тег для отображения выбранных фильтров с количеством и кнопкой удаления.

- **Параметры:**
  - `text` — название группы фильтра
  - `count` — количество выбранных элементов (опционально)
  - `onRemove` — callback при нажатии на крестик
- **Layout:**
  - Horizontal Row/HStack: text + count индикатор + кнопка удаления
  - Фон: `badgeBrandBgLight`
  - Радиус: M (8dp/pt)
  - Padding: horizontal M (12dp/pt), vertical XS (4dp/pt)
- **Count индикатор:**
  - Квадрат 20×20, фон `indicatorsBgFilled`, текст `indicatorsIcon`
  - Типографика: `Headline10Medium` / `headline10Medium`
- **Кнопка удаления:**
  - Иконка: `ic-close`, 20×20
  - Цвет: `badgeBrandTextBright`

**Используется:** отображение применённых фильтров на экране TaskFiltersScreen.

### WFMBottomSheet / WfmBottomSheet
Модальный лист снизу экрана. Используется для подтверждений, выбора опций, фильтров.

**Отличия iOS реализации:**
- Использует стороннюю библиотеку [BottomSheet 3.1.1](https://github.com/lucaszischka/BottomSheet) для реализации поведения Material 3
- Автоматическая адаптация высоты под контент (если контент < экрана → показывает на высоте контента, если > экрана → fullscreen + скролл)
- Глобальный `BottomSheetManager` для управления BottomSheet из любого места приложения (iOS only)
- ZStack архитектура: BottomSheet на уровне TabView с `.zIndex(100)` для перекрытия TabBar

**Android реализация:**
- Нативный `ModalBottomSheet` из Material 3
- Управление через `remember { mutableStateOf(false) }` на уровне экрана
- **Поддержка Toast**: опциональный параметр `toastManager: ToastManager?` для показа тостов поверх BottomSheet
  - Toast накладывается через ZStack/Box с `Alignment.BottomCenter`
  - Padding: horizontal 16dp, bottom 16dp от края листа

Подробнее: [`ui/bottomsheet.md`](./bottomsheet.md)

### WFMLoader / WfmLoader
Индикатор загрузки (три пульсирующие точки). Используется в Loading state экранов.

### WFMToast / WfmToast
Всплывающее уведомление внизу экрана. Автоскрытие через 3 секунды.

- **2 типа:** `text` (только текст) / `textWithButton` (текст + кнопка-ссылка)
- **2 состояния:** `default` (тёмный фон `surfaceSnackbar`) / `error` (красный `bgToastError`)
- Управление через `ToastManager` (iOS: `ObservableObject`, Android: `StateFlow`)
- iOS: `.wfmToast(manager:)` на корневом View в `WFMApp.swift`
- Android: `WfmToastHost` в `MainActivity` поверх `AppNavigation`

Подробнее: [`ui/toast.md`](./toast.md)

### WFMProgressBar / WfmProgressBar
Индикатор прогресса выполнения задач.

- **2 типа:** `solid` (сплошной) / `dashed` (сегментированный)
- **2 состояния:** `normal` (обычная фиолетовая полоска) / `paused` (заштрихованная полоска диагональными линиями)
- **Параметры:**
  - `progress` (от 0.0 до 1.0) — прогресс выполнения
  - `type` (solid/dashed) — тип индикатора
  - `state` (normal/paused) — состояние прогресса
  - `segmentCount` (по умолчанию 5) — количество сегментов для dashed типа
  - `showText` — показывать ли текст под прогресс-баром
  - `text` — текст под прогресс-баром
- **Цвета:**
  - `progressBgEmpty` (фон, neutral200 #EEEEF8)
  - `progressBgFilled` (заполнение, brand500 #6738DD)
  - `progressBgPaused` (заштрихованная полоска при паузе, neutral500 #9898AE)
  - `progressText` (текст, neutral800 #5E5E6D)
- Высота бара: 4dp, радиус скругления: 10dp

### WFMCheckbox / WfmCheckbox
Чекбокс для множественного выбора.

- **3 состояния:** passive (не выбран, белый с серым бордером), checked (выбран, фиолетовый с белой галочкой), disabled (неактивен, серый фон)
- **Форма:** круглый (CircleShape), 24×24dp/pt
- **Параметры:**
  - `isChecked` — выбран ли чекбокс
  - `isDisabled` — неактивен ли чекбокс (default: `false`)
  - `error` — показывать ли состояние ошибки (default: `false`)
- **Цвета:**
  - Passive: фон `surfaceSecondary` (neutral0, белый) + бордер 1dp `borderSecondary`
  - Checked: фон `bgButtonPrimary` (brand500) + иконка галочки 12×12 `textInverse`
  - Disabled: фон `bgButtonSecondaryDisabled`, без галочки и бордера
  - Error: бордер `borderError` красного цвета
- **Иконка галочки:** системная `checkmark` (iOS) / `Icons.Default.Check` (Android), размер 12×12

**Используется:** в фильтрах сотрудников, списках выбора.

### WFMRadioButton / WfmRadioButton
Радиокнопка для единичного выбора из группы опций.

- **3 состояния:** passive (не выбран), selected (выбран), disabled (неактивен)
- **Форма:** круглый (Circle), 24×24dp/pt
- **Параметры:**
  - `isSelected` — выбрана ли радиокнопка
  - `isDisabled` — неактивна ли радиокнопка (default: `false`)
- **Цвета:**
  - Passive: фон `surfaceSecondary` + бордер 1dp `selectionBorderDefault`
  - Selected: фон `selectionBgChecked` (brand500) + внутренний круг 10×10 `surfaceSecondary` (белый)
  - Disabled: фон `selectionBgDisabled`, без бордера и внутреннего круга
- **Layout:** внешний круг 24×24, внутренний круг 10×10 (только в selected состоянии)

**Используется:** в группах единичного выбора (radio groups).

### WFMToggle / WfmToggle
Переключатель (Toggle Switch) для включения/выключения опций.

- **3 состояния:** off (выключен), on (включен), disabled (неактивен)
- **Форма:** капсула (Capsule), 51×31dp/pt, кнопка (thumb) — круг 27×27
- **Параметры:**
  - `isOn` — включен ли переключатель
  - `isDisabled` — неактивен ли переключатель (default: `false`)
- **Цвета:**
  - Off: трек `selectionBgDefault` + бордер 1dp `selectionBorderDefault`, thumb `surfaceSecondary`
  - On: трек `selectionBgChecked` (brand500), без бордера, thumb `surfaceSecondary`
  - Disabled: трек `selectionBgDisabled`, без бордера, thumb `selectionThumbDisabled`
- **Анимация:** кнопка (thumb) смещается по оси X на ±10pt при переключении (offset: on = +10, off = -10)

**Используется:** в настройках, переключении состояний.

### WFMSelectionCard / WfmSelectionCard
Карточка для списков выбора (сотрудники, фильтры, категории).

- **2 типа:**
  - `SELECT` — с чекбоксом для множественного выбора
  - `OPEN` — со стрелкой вправо для перехода на следующий экран
- **Параметры:**
  - `title` — текст карточки (обрезается ellipsis при переполнении)
  - `type` — тип карточки (default: `SELECT`)
  - `isChecked` — выбрана ли карточка (только для `SELECT`)
  - `showBorder` — показывать ли бордер и скругление (default: `true`)
  - `contentPadding` (Android) / `horizontalPadding` + `verticalPadding` (iOS) — внутренний padding карточки (default: M по всем сторонам); меняется в контекстах где нужен другой отступ (например, компактные списки — `horizontal M, vertical S`)
  - `onTap` — callback при нажатии (опционально)
- **Layout:**
  - Горизонтальный HStack/Row: title (растягивается) + spacing S + trailing элемент (чекбокс или стрелка)
  - Padding: настраивается через `contentPadding`/`horizontalPadding`+`verticalPadding`, default M (12dp/pt) по всем сторонам
  - Фон: `cardSurfaceSecondary`
  - Бордер: `cardBorderSurfaceSecondary`, радиус `XL` (16dp/pt) — только если `showBorder = true`
- **Trailing элемент:**
  - SELECT: `WFMCheckbox` / `WfmCheckbox`
  - OPEN: иконка chevron-right (системная или кастомная), 24×24, цвет `cardIconSecondary`
- **Типографика:** title — `Headline14Medium`, цвет `cardTextPrimary`
- **Использование в группах:** для группы карточек без отдельных бордеров используй `showBorder = false` и оберни в контейнер с общим бордером и divider'ами между карточками

**Используется:** списки сотрудников для фильтрации, выбор категорий, каталоги.

---

### WFMTabBar / WfmTabBar

Таб-бар с нижним индикатором активной вкладки (bottom-line style). Переключает разделы внутри экрана.

- **Параметры:**
  - `options` / `options: List<String>` — список заголовков вкладок
  - `selectedIndex` (iOS: `@Binding<Int>`) / `selectedIndex: Int` + `onSelectionChange` (Android) — текущий и callback выбора
- **Высота:** 46pt/dp
- **Анимация:** плавный slide индикатора между вкладками (200ms easeInOut / tween 200ms)
- **Индикатор:** фоновая линия (`borderSecondary`, 2pt высота) + активный индикатор (`borderBrand`, 2pt высота), скользит через matchedGeometryEffect (iOS) / offset анимацию (Android)
- **Типографика:** 15sp/pt SemiBold, letter-spacing 0.06; активная вкладка `textPrimary`, неактивная `textTertiary`
- **Нет ripple-эффекта** на Android (indication = null)

**Файлы:**
- iOS: `WFMUI/Sources/WFMUI/Components/WFMTabBar.swift`
- Android: `ui/src/main/kotlin/com/beyondviolet/wfm/ui/components/WfmTabBar.kt`

**Используется:** TaskDetailView/TaskDetailsScreen (вкладки Подзадачи / Подсказки).

---

## Добавление новых компонентов

**Перед созданием спроси:** нужен компонент в модуле как переиспользуемый, или только для одного экрана?

**Добавляем в модуль если:**
- Будет использоваться на нескольких экранах
- Это стандартный элемент дизайн-системы (из Figma)

**Оставляем локально если:**
- Специфичен только для одного экрана
- Содержит бизнес-логику конкретной фичи

**Именование:** `WFM{ComponentName}.swift` / `Wfm{ComponentName}.kt`

---

## Иконки

### Базовые правила

- iOS: SVG → Asset Catalog, `kebab-case`
- Android: SVG → VectorDrawable, `snake_case` с префиксом `ic_`

Подробнее: [`guides/figma_assets.md`](../../guides/figma_assets.md)

### WFMIcons (iOS) — централизованное управление иконками

Все иконки из Assets Catalog доступны через enum `WFMIcons` для централизованного управления и рефакторинга.

**Файл:** `WFMUI/Sources/WFMUI/Icons/WFMIcons.swift`

**Использование:**
```swift
import WFMUI

WFMIcons.arrowLeft      // иконка "назад"
WFMIcons.closeIcon      // иконка закрытия
WFMIcons.chevronRight   // шеврон вправо
WFMIcons.chevronUp      // шеврон вверх
WFMIcons.chevronDown    // шеврон вниз
WFMIcons.checkIcon      // галочка
WFMIcons.appLogo        // логотип
WFMIcons.pinFilledIcon  // pin filled
```

**Преимущества:**
- Централизованный доступ ко всем иконкам
- Автодополнение в Xcode
- Рефакторинг при переименовании ассета
- Единый bundle resolution для SPM модулей

**Android:** На Android иконки доступны напрямую через `R.drawable.ic_*` или `painterResource(UiR.drawable.ic_*)` при использовании из других модулей.
