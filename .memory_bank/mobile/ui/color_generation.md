# Генерация цветов из Figma

Цветовые токены генерируются автоматически из JSON-выгрузок Figma с помощью Python скрипта.

**Скрипт:** `mobile/figma_color_generator/scripts/generate_semantic_colors.py`

---

## Workflow экспорта токенов

1. **Экспорт из Figma** — дизайнер экспортирует токены в JSON формате:
   - `Primitives.json` — базовые цвета (brand500, neutral900 и др.)
   - `Alias.json` — алиасы токенов
   - `Components color.Light.json` — семантические токены для светлой темы
   - `Components color.Dark.json` — семантические токены для тёмной темы

2. **Размещение в репозитории** — JSON файлы сохраняются в `mobile/figma_color_generator/`

3. **Запуск скрипта:**
   ```bash
   cd mobile/figma_color_generator/scripts
   python3 generate_semantic_colors.py
   ```

4. **Генерация файлов:**
   - iOS: `mobile/ios/WFMUI/Sources/WFMUI/Theme/WFMColors_generated.swift`
   - Android: `mobile/android/ui/src/main/kotlin/com/beyondviolet/wfm/ui/theme/WfmColors_generated.kt`

---

## Структура генерируемых файлов

### Примитивные цвета

```swift
// iOS
public enum WFMPrimitiveColors {
    public static let brand500 = Color(hex: 0x6738DD)
    public static let neutral900 = Color(hex: 0x373742)
    // ...
}
```

```kotlin
// Android
object WfmColors {
    val Brand500 = Color(0xFF6738DD)
    val Neutral900 = Color(0xFF373742)
    // ...
}
```

### Группы семантических цветов

Скрипт автоматически определяет группы из путей в JSON (первый сегмент до `/`):
- `text/primary` → группа `text`
- `badge/blue/bg/bright` → группа `badge`
- `button/primary/bg/default` → группа `button`

Для каждой группы создаётся отдельный struct/data class:

```swift
// iOS
public struct TextColors {
    public let primary: Color
    public let secondary: Color
    public let tertiary: Color
    // ...
}

public struct BadgeColors {
    public let blueBgBright: Color
    public let blueBgLight: Color
    // ...
}
```

```kotlin
// Android
@Immutable
data class TextColors(
    val primary: Color,
    val secondary: Color,
    val tertiary: Color
)

@Immutable
data class BadgeColors(
    val blueBgBright: Color,
    val blueBgLight: Color
)
```

### Главная структура

Главный struct/data class содержит **только 15 параметров** (вместо 165):

```swift
// iOS
public struct WFMSemanticColors {
    public let badge: BadgeColors
    public let bars: BarsColors
    public let bg: BgColors
    public let border: BorderColors
    public let button: ButtonColors
    public let card: CardColors
    public let icon: IconColors
    public let indicators: IndicatorsColors
    public let input: InputColors
    public let segmentedControl: SegmentedControlColors
    public let selection: SelectionColors
    public let surface: SurfaceColors
    public let tabbar: TabbarColors
    public let text: TextColors
    public let toast: ToastColors
}
```

```kotlin
// Android
@Immutable
data class WfmSemanticColors(
    val badge: BadgeColors,
    val bars: BarsColors,
    val bg: BgColors,
    val border: BorderColors,
    val button: ButtonColors,
    val card: CardColors,
    val icon: IconColors,
    val indicators: IndicatorsColors,
    val input: InputColors,
    val segmentedControl: SegmentedControlColors,
    val selection: SelectionColors,
    val surface: SurfaceColors,
    val tabbar: TabbarColors,
    val text: TextColors,
    val toast: ToastColors
)
```

### Extension properties (обратная совместимость)

Для обратной совместимости генерируются extension properties:

```swift
// iOS
public extension WFMSemanticColors {
    var textPrimary: Color { text.primary }
    var badgeBlueBgBright: Color { badge.blueBgBright }
    var buttonPrimaryBgDefault: Color { button.primaryBgDefault }
}
```

```kotlin
// Android
val WfmSemanticColors.textPrimary get() = text.primary
val WfmSemanticColors.badgeBlueBgBright get() = badge.blueBgBright
val WfmSemanticColors.buttonPrimaryBgDefault get() = button.primaryBgDefault
```

Это позволяет использовать как вложенный (`colors.text.primary`), так и плоский (`colors.textPrimary`) доступ.

### Light/Dark инициализация

Генерируются функции/let для создания экземпляров Light и Dark темы:

```swift
// iOS
public let lightWFMColors = WFMSemanticColors(
    badge: BadgeColors(
        blueBgBright: WFMPrimitiveColors.blue500,
        // ...
    ),
    text: TextColors(
        primary: WFMPrimitiveColors.neutral900,
        // ...
    ),
    // ...
)
```

```kotlin
// Android
fun getLightSemantic() = WfmSemanticColors(
    badge = BadgeColors(
        blueBgBright = WfmColors.Blue500,
        // ...
    ),
    text = TextColors(
        primary = WfmColors.Neutral900,
        // ...
    )
)
```

---

## Логика скрипта

### 1. Парсинг JSON файлов

```python
def parse_json_tokens(file_path: Path) -> Dict[str, ColorToken]:
    """Парсинг JSON файла с токенами"""
    # Извлекает токены из JSON
    # Возвращает словарь: {путь_токена: ColorToken}
```

### 2. Резолвинг алиасов

```python
def resolve_target(path: str, aliases: Dict, primitives: Dict) -> Optional[str]:
    """Резолвим цепочку алиасов до примитива"""
    # text/primary → alias → neutral/900 → примитив
```

### 3. Автоматическое определение групп

```python
def extract_group_name(path: str) -> str:
    """Извлекает название группы из пути"""
    # card/text/primary → card
    # button/primary/bg/default → button
    # segmented control/bg → segmentedControl (пробел → camelCase)
```

Скрипт **универсален** — новые группы определяются автоматически из JSON путей. Не требует захардкоженного списка групп.

### 4. Конвертация имён

```python
def semantic_path_to_field_name(path: str) -> str:
    """Конвертация пути в имя поля"""
    # card/text/primary → cardTextPrimary
    # button/primary/bg/default → buttonPrimaryBgDefault
    # segmented control/bg → segmentedControlBg
```

Правила:
- Пробелы в путях конвертируются в camelCase
- Первая часть пути (группа) с маленькой буквы
- Остальные части с заглавной

### 5. Группировка полей

```python
def group_semantic_fields(semantic_dict, field_to_path) -> Dict[str, Dict[str, str]]:
    """Группирует семантические поля по категориям"""
    # Использует исходные пути из JSON для определения группы
    # Возвращает: {группа: {поле_без_группы: значение}}
```

### 6. Генерация кода

```python
def generate_swift(primitives, light_semantic, dark_semantic, field_alphas, field_to_path, output_path):
    """Генерация Swift файла с группировкой цветов"""

def generate_kotlin(primitives, light_semantic, dark_semantic, field_to_path, output_path):
    """Генерация Kotlin файла с группировкой цветов"""
```

---

## Пример вывода скрипта

```
📖 Парсинг JSON файлов...
   Primitives: 84
   Aliases: 49
   Light components: 119
   Dark components: 119

🔗 Резолвим маппинги...
   Light semantic: 165 полей
   Dark semantic: 165 полей

🔨 Генерация WFMColors_generated.swift...
✅ Создан файл: /Users/.../WFMColors_generated.swift
   Групп цветов: 15
   Всего полей: 165

🔨 Генерация WfmColors_generated.kt...
✅ Создан файл: /Users/.../WfmColors_generated.kt
   Групп цветов: 15
   Всего полей: 165

✨ Готово!
```

---

## Особенности реализации

### Обработка составных названий

- `segmented control` (с пробелом в JSON) → `segmentedControl` (camelCase)
- `overlay-modal` (с дефисом) → `surfaceOverlayModal` (специальный случай)

### Поддержка alpha-канала

Для токенов с прозрачностью (например `surfaceOverlayModal`):
- Android: используется ARGB формат `Color(0xB2000000)`
- iOS: используется параметр alpha `Color(hex: 0x000000, alpha: 0.7)`

### JVM ограничение

**Проблема:** JVM ограничивает количество параметров конструктора до 255.

**Решение:** Разбиение 165 полей на 15 групп (каждая группа < 30 полей).

**До:**
```kotlin
data class WfmSemanticColors(
    val textPrimary: Color,
    val textSecondary: Color,
    // ... 165 параметров
) // ❌ ExceptionInInitializerError при >255 параметрах
```

**После:**
```kotlin
data class WfmSemanticColors(
    val text: TextColors,
    val badge: BadgeColors,
    // ... 15 параметров
) // ✅ Работает
```

---

## Правила обновления токенов

1. **Экспортировать JSON** из Figma в папку `mobile/figma_color_generator/`
2. **Запустить скрипт** `cd mobile/figma_color_generator/scripts && python3 generate_semantic_colors.py`
3. **Проверить сгенерированные файлы** — убедиться что нет ошибок
4. **Закоммитить изменения** в оба файла (Swift и Kotlin)

**ВАЖНО:**
- Не редактировать `*_generated.swift` / `*_generated.kt` вручную — они перезаписываются скриптом
- Ручные изменения делать в основных файлах `WFMColors.swift` / `WfmColors.kt` (если нужно)
- При добавлении новых групп в Figma скрипт автоматически их определит

---

## Связанные файлы

- **Скрипт:** `mobile/figma_color_generator/scripts/generate_semantic_colors.py`
- **JSON входные данные:** `mobile/figma_color_generator/*.json`
- **Выходные файлы:**
  - iOS: `mobile/ios/WFMUI/Sources/WFMUI/Theme/WFMColors_generated.swift`
  - Android: `mobile/android/ui/src/main/kotlin/com/beyondviolet/wfm/ui/theme/WfmColors_generated.kt`
- **Основная документация:** [`design_system_components.md`](./design_system_components.md)
