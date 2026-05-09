# Генерация цветов из Figma

Скрипт автоматически генерирует файлы `WFMColors_generated.swift` и `WfmColors_generated.kt` из JSON токенов, экспортированных из Figma.

## Workflow использования

1. **Экспорт из Figma** — дизайнер экспортирует токены в JSON формате в папку `mobile/figma_color_generator/`
2. **Запуск скрипта:**
   ```bash
   cd mobile/figma_color_generator/scripts
   python3 generate_semantic_colors.py
   ```
3. **Проверка результатов:**
   - iOS: `mobile/ios/WFMUI/Sources/WFMUI/Theme/WFMColors_generated.swift`
   - Android: `mobile/android/ui/src/main/kotlin/com/beyondviolet/wfm/ui/theme/WfmColors_generated.kt`

## Требования

- Python 3.6+
- Стандартная библиотека Python (json, re, pathlib)

Подробная документация: `.memory_bank/mobile/ui/color_generation.md`
