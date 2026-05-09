# Правила экспорта ассетов из Figma

Руководство по экспорту иконок и изображений из Figma в проект WFM.

---

## Форматы по типу ассета

| Тип ассета | Формат | Причина |
|---|---|---|
| Иконки (24×24, 16×16 и т.д.) | **SVG** | Масштабируются без потери качества, малый вес |
| Логотипы (малые, встроенные в интерфейс) | **SVG** | Аналогично иконкам |
| Иллюстрации (большие картинки) | **PNG** | Сложная графика, прозрачный фон |
| Фотографии | **PNG** | Необходимая детализация |
| Фоновые изображения | **PNG** | Большие размеры, прозрачность |

### Простое правило

- **Иконки → SVG**
- **Большие картинки → PNG**

---

## iOS

### Иконки (SVG)

SVG-иконки добавляются в Asset Catalog как отдельные imageset:

```
WFMUI/Sources/WFMUI/Resources/Assets.xcassets/
└── {icon-name}.imageset/
    ├── Contents.json
    └── {icon-name}.svg
```

`Contents.json` для SVG:
```json
{
  "assets": [],
  "images": [
    {
      "filename": "{icon-name}.svg",
      "idiom": "universal"
    }
  ],
  "info": {
    "author": "xcode",
    "version": 1
  }
}
```

Использование в коде:
```swift
Image("{icon-name}")
    .resizable()
    .frame(width: 24, height: 24)
    .foregroundColor(colors.iconPrimary)
```

> Xcode 15+ поддерживает SVG в Asset Catalog нативно. При использовании старших версий — конвертируй в PDF через Sketch или Inkscape.

### Большие изображения (PNG)

Добавляются в Asset Catalog с поддержкой 1x/2x/3x:

```
Assets.xcassets/
└── {image-name}.imageset/
    ├── Contents.json
    ├── {image-name}@1x.png
    ├── {image-name}@2x.png
    └── {image-name}@3x.png
```

Экспорт из Figma: выбрай элемент → Export → добавь 1x, 2x, 3x.

---

## Android

### Иконки (SVG → VectorDrawable)

Android не поддерживает SVG напрямую в ресурсах. Workflow:

1. Экспортируй из Figma в **SVG**
2. Конвертируй в VectorDrawable через [Android Studio Vector Asset Studio](https://developer.android.com/studio/tools/vector-asset-studio) или [svg2compose](https://github.com/nickhudkins/svg2compose)
3. Результат — XML файл в `res/drawable/`

```
app/src/main/res/drawable/
└── ic_{icon-name}.xml
```

Пример VectorDrawable (`ic_arrow_left.xml`):
```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24.0"
    android:viewportHeight="24.0">
    <path
        android:fillColor="@android:color/black"
        android:pathData="..." />
</vector>
```

Использование в Compose:
```kotlin
Icon(
    imageVector = ImageVector.Builder(...).build(), // или painterResource
    contentDescription = "Назад",
    tint = WfmColors.IconDefault
)

// Через painterResource для drawable XML
Icon(
    painter = painterResource(R.drawable.ic_arrow_left),
    contentDescription = "Назад",
    tint = WfmColors.IconDefault
)
```

### Большие изображения (PNG)

Добавляются в папки с поддержкой плотности экрана:

```
app/src/main/res/
├── drawable-mdpi/     # 1x
│   └── {image-name}.png
├── drawable-hdpi/     # 1.5x
│   └── {image-name}.png
├── drawable-xhdpi/    # 2x
│   └── {image-name}.png
├── drawable-xxhdpi/   # 3x
│   └── {image-name}.png
└── drawable-xxxhdpi/  # 4x
    └── {image-name}.png
```

Экспорт из Figma: выбрай элемент → Export → выбери Android (автоматически создаст папки по плотностям).

---

## Именование

| Тип | Платформа | Шаблон | Пример |
|---|---|---|---|
| Иконка | iOS | `{icon-name}.svg` | `arrow-left.svg` |
| Иконка | Android | `ic_{icon_name}.xml` | `ic_arrow_left.xml` |
| Изображение | iOS | `{image-name}.png` | `onboarding-step1.png` |
| Изображение | Android | `{image_name}.png` | `onboarding_step1.png` |

- Имена файлов — **kebab-case** на iOS, **snake_case** на Android
- Иконки на Android обязательно с префиксом `ic_`
- Без пробелов и специальных символов в именах

---

## Checklist при экспорте из Figma

- [ ] Определен тип ассета (иконка / большая картинка)
- [ ] Выбран правильный формат (SVG / PNG)
- [ ] Имя файла соответствует шаблону для платформы
- [ ] Для PNG экспортированы все нужные размеры (1x/2x/3x для iOS, плотности для Android)
- [ ] Для иконок Android выполнена конвертация SVG → VectorDrawable
- [ ] Ассет добавлен в Asset Catalog (iOS) или res/ (Android)
