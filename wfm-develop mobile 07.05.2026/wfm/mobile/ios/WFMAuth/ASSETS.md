# Assets в WFMAuth модуле

## Структура

```
WFMAuth/
└── Sources/WFMAuth/
    └── Resources/
        ├── Assets.xcassets/
        │   ├── Contents.json
        │   └── ic_telegram.imageset/
        │       ├── Contents.json
        │       └── Left Icon.svg  ← Твоя иконка здесь
        └── WFMAuthAssets.swift
```

## Добавление новых иконок

### 1. Через Xcode (рекомендуется)

1. Открой `WFMAuth.xcworkspace` или весь проект
2. В навигаторе найди `WFMAuth/Sources/WFMAuth/Resources/Assets.xcassets`
3. Перетащи SVG/PNG файл в Assets.xcassets
4. Xcode автоматически создаст ImageSet

### 2. Вручную (через Finder)

1. Открой папку:
   ```
   /mobile/ios/WFMAuth/Sources/WFMAuth/Resources/Assets.xcassets/ic_telegram.imageset/
   ```
2. Замени файл `Left Icon.svg` на свою иконку
3. Или добавь новую папку для другой иконки

### 3. Использование в коде

```swift
import WFMAuth

// В любом View
WFMAuthAssets.icTelegram
```

## Текущие ассеты

- `icTelegram` - Иконка Telegram (24x24pt)

## Добавление новой иконки в код

Если добавил новую иконку в Assets.xcassets, добавь её в `WFMAuthAssets.swift`:

```swift
public enum WFMAuthAssets {
    public static var icTelegram: Image {
        Image("ic_telegram", bundle: Bundle.module)
    }

    // Новая иконка
    public static var icVk: Image {
        Image("ic_vk", bundle: Bundle.module)
    }
}
```

## Требования к иконкам

- **Формат:** SVG (рекомендуется) или PNG @1x, @2x, @3x
- **Размер:** 24x24pt для кнопок соцсетей
- **Цвет:** Многоцветные SVG сохраняют оригинальные цвета
- **Naming:** snake_case (ic_telegram, ic_vk, ic_google)

## Экспорт из Figma

См. `.memory_bank/guides/figma_assets.md` для инструкций по экспорту SVG из Figma.
