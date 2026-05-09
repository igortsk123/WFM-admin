#!/usr/bin/env python3
"""
Генератор семантических цветовых токенов для WFM

Структура:
1. Primitives (Brand500, Neutral900) - одинаковы для Light/Dark
2. Semantic data class/struct (textPrimary, cardIconBrand, etc.)
3. Light/Dark objects с маппингом semantic → primitives

Входные файлы:
    - Primitives.json
    - Alias.json
    - Components color.Light.json
    - Components color.Dark.json

Выходные файлы:
    - WFMColors_generated.swift
    - WfmColors_generated.kt
"""

import json
import re
from pathlib import Path
from typing import Dict, Any, Optional, Set, Tuple

class ColorToken:
    """Токен цвета"""
    def __init__(self, path: str, hex_value: str, alpha: float = 1.0,
                 target: Optional[str] = None):
        self.path = path
        self.hex = hex_value
        self.alpha = alpha
        self.target = target  # targetVariableName для алиасов

def parse_json_tokens(file_path: Path) -> Dict[str, ColorToken]:
    """Парсинг JSON файла с токенами"""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    tokens = {}

    def extract(obj: Dict, prefix: str = ''):
        """Рекурсивно извлекаем токены"""
        for key, value in obj.items():
            if key.startswith('$'):
                continue

            current_path = f"{prefix}/{key}" if prefix else key

            if isinstance(value, dict):
                if '$type' in value and value['$type'] == 'color':
                    # Это токен
                    hex_val = value.get('$value', {}).get('hex', '#000000')
                    alpha = value.get('$value', {}).get('alpha', 1.0)

                    # Проверяем алиас
                    alias_data = value.get('$extensions', {}).get('com.figma.aliasData', {})
                    target = alias_data.get('targetVariableName')

                    tokens[current_path] = ColorToken(current_path, hex_val, alpha, target)
                else:
                    # Продолжаем рекурсию
                    extract(value, current_path)

    extract(data)
    return tokens

def resolve_target(path: str, aliases: Dict[str, ColorToken],
                   primitives: Dict[str, ColorToken], depth: int = 0) -> Optional[str]:
    """
    Резолвим цепочку алиасов до примитива
    Возвращает путь примитива (например, 'color/neutral/900')
    """
    if depth > 10:  # Защита от циклов
        return None

    # Если это уже примитив
    if path in primitives:
        return path

    # Если это алиас
    if path in aliases:
        token = aliases[path]
        if token.target:
            return resolve_target(token.target, aliases, primitives, depth + 1)
        else:
            # Прямое значение без алиаса
            return None

    return None

def primitive_to_var_name(primitive_path: str, capitalize: bool = False) -> str:
    """
    Конвертация color/neutral/900 → Neutral900 (Kotlin) или neutral900 (Swift)
    """
    # Убираем префикс color/
    path = re.sub(r'^color/', '', primitive_path)

    # Разбиваем на части
    parts = path.split('/')
    if len(parts) < 2:
        return path

    category = parts[0]  # neutral, brand, red, etc.
    value = parts[1]     # 900, 500, etc.

    if capitalize:
        # Kotlin: Neutral900
        return f"{category.capitalize()}{value.capitalize()}"
    else:
        # Swift: neutral900
        return f"{category.lower()}{value}"

def semantic_path_to_field_name(path: str) -> str:
    """
    Конвертация пути в имя поля
    Примеры:
        card/text/primary → cardTextPrimary
        button/primary/bg/default → buttonPrimaryBgDefault
        text/primary → textPrimary
        segmented control/bg → segmentedControlBg
        overlay-modal → surfaceOverlayModal (специальный случай)
    """
    # Специальный случай для overlay-modal
    if path == 'overlay-modal':
        return 'surfaceOverlayModal'

    # Разбиваем по /
    parts = path.split('/')

    # Убираем пустые части
    parts = [p for p in parts if p]

    if not parts:
        return ''

    # Обрабатываем каждую часть
    processed_parts = []
    for i, part in enumerate(parts):
        # Заменяем пробелы и дефисы на разделители
        part = part.replace(' ', '-')

        if i == 0:
            # Первая часть - конвертируем в camelCase с маленькой буквы
            subparts = part.split('-')
            result = subparts[0].lower()
            for subpart in subparts[1:]:
                result += subpart.capitalize()
            processed_parts.append(result)
        else:
            # Остальные части - конвертируем в PascalCase
            subparts = part.split('-')
            for subpart in subparts:
                processed_parts.append(subpart.capitalize())

    return ''.join(processed_parts)

def extract_group_name(path: str) -> str:
    """
    Извлекает название группы из пути
    Примеры:
        card/text/primary → card
        button/primary/bg/default → button
        text/primary → text
        segmented control/bg → segmentedControl
        overlay-modal → surface (специальный случай)
    """
    # Специальный случай для overlay-modal
    if path == 'overlay-modal':
        return 'surface'

    # Заменяем пробелы на дефисы
    path = path.replace(' ', '-')

    # Берём первый сегмент
    parts = path.split('/')
    if not parts:
        return ''

    group = parts[0].lower()

    # Конвертируем в camelCase (для групп типа "segmented-control")
    subparts = group.split('-')
    if len(subparts) > 1:
        result = subparts[0]
        for subpart in subparts[1:]:
            result += subpart.capitalize()
        return result

    return group

def group_semantic_fields(semantic_dict: Dict[str, str],
                         field_to_path: Dict[str, str]) -> Dict[str, Dict[str, str]]:
    """
    Группирует семантические поля по категориям, используя исходные пути из JSON
    Вход:
        semantic_dict: {cardTextPrimary: WfmColors.Neutral900, ...}
        field_to_path: {cardTextPrimary: 'card/text/primary', ...}
    Выход: {
        card: {textPrimary: WfmColors.Neutral900, ...},
        button: {primaryBgDefault: WfmColors.Brand500, ...},
        ...
    }

    Автоматически определяет группы из исходных путей (первый сегмент до '/')
    """
    groups = {}

    for field_name, value in semantic_dict.items():
        if field_name not in field_to_path:
            print(f"⚠️  Нет исходного пути для поля: {field_name}")
            continue

        # Извлекаем группу из исходного пути
        original_path = field_to_path[field_name]
        group = extract_group_name(original_path)

        if not group:
            print(f"⚠️  Не удалось определить группу для пути: {original_path}")
            continue

        # Убираем префикс группы из field_name и делаем первую букву lowercase
        # cardTextPrimary → card → textPrimary
        # buttonPrimaryBgDefault → button → primaryBgDefault

        if field_name.startswith(group):
            field_without_group = field_name[len(group):]
            if field_without_group:
                field_without_group = field_without_group[0].lower() + field_without_group[1:]
        else:
            # Если field_name не начинается с группы (не должно случаться)
            field_without_group = field_name

        if group not in groups:
            groups[group] = {}

        groups[group][field_without_group] = value

    return groups

def group_name_to_class_name(group: str, capitalize: bool = True) -> str:
    """
    Конвертирует название группы в название класса
    badge → BadgeColors / badgeColors
    segmentedControl → SegmentedControlColors / segmentedControlColors
    """
    if capitalize:
        class_name = group[0].upper() + group[1:] + 'Colors'
    else:
        class_name = group + 'Colors'
    return class_name

def generate_swift(primitives: Dict[str, ColorToken],
                  light_semantic: Dict[str, str],
                  dark_semantic: Dict[str, str],
                  field_alphas: Dict[str, float],
                  field_to_path: Dict[str, str],
                  output_path: Path):
    """Генерация Swift файла с группировкой цветов"""

    lines = []
    lines.append("import SwiftUI")
    lines.append("")
    lines.append("// MARK: - Primitive Colors")
    lines.append("")
    lines.append("/// Примитивные цвета дизайн-системы WFM")
    lines.append("/// Токены из Figma (одинаковы для Light/Dark)")
    lines.append("public enum WFMPrimitiveColors {")

    # Группируем примитивы
    grouped = {}
    for path, token in sorted(primitives.items()):
        match = re.match(r'color/([^/]+)/', path)
        if match:
            category = match.group(1)
            if category not in grouped:
                grouped[category] = []
            grouped[category].append((path, token))

    # Генерируем примитивы
    for category in ['brand', 'neutral', 'red', 'green', 'blue', 'yellow', 'pink', 'orange']:
        if category in grouped:
            lines.append(f"    // MARK: - {category.title()} ({'фиолетовый' if category == 'brand' else 'серый' if category == 'neutral' else category.title()})")
            lines.append("")
            for path, token in grouped[category]:
                var_name = primitive_to_var_name(path, capitalize=False)
                hex_int = int(token.hex.lstrip('#'), 16)
                lines.append(f"    public static let {var_name} = Color(hex: 0x{hex_int:06X})")
            lines.append("")

    # Добавляем градиенты
    lines.append("    // MARK: - Gradient (для будущего использования)")
    lines.append("")
    lines.append("    public static let gradientBrandStart = Color(hex: 0x612EE5)")
    lines.append("    public static let gradientBrandEnd = Color(hex: 0x9D2CF4)")
    lines.append("    public static let gradientHighlightStart = Color(hex: 0xFE6600)")
    lines.append("    public static let gradientHighlightEnd = Color(hex: 0xC32B23)")
    lines.append("}")
    lines.append("")

    # Группируем семантические поля
    light_groups = group_semantic_fields(light_semantic, field_to_path)
    dark_groups = group_semantic_fields(dark_semantic, field_to_path)

    # Генерируем struct для каждой группы
    lines.append("// MARK: - Semantic Color Groups")
    lines.append("")

    for group in sorted(light_groups.keys()):
        class_name = group_name_to_class_name(group, capitalize=True)
        fields = sorted(light_groups[group].keys())

        lines.append(f"public struct {class_name} {{")

        for field in fields:
            lines.append(f"    public let {field}: Color")

        lines.append("}")
        lines.append("")

    # Генерируем главный struct для семантических цветов
    lines.append("// MARK: - Semantic Colors")
    lines.append("")
    lines.append("/// Семантические цвета для темы WFM")
    lines.append("/// Значения меняются в зависимости от Light/Dark режима")
    lines.append("public struct WFMSemanticColors {")

    group_names = sorted(light_groups.keys())
    for group in group_names:
        class_name = group_name_to_class_name(group, capitalize=True)
        lines.append(f"    public let {group}: {class_name}")

    lines.append("}")
    lines.append("")

    # Генерируем extension properties для обратной совместимости
    lines.append("// MARK: - Extension Properties (обратная совместимость)")
    lines.append("")
    lines.append("public extension WFMSemanticColors {")

    for group in sorted(light_groups.keys()):
        lines.append(f"    // {group.capitalize()}")
        fields = sorted(light_groups[group].keys())

        for field in fields:
            # cardTextPrimary → card.textPrimary
            full_field_name = group + field[0].upper() + field[1:] if field else group
            lines.append(f"    var {full_field_name}: Color {{ {group}.{field} }}")

        lines.append("")

    lines.append("}")
    lines.append("")

    # Light объект
    lines.append("// MARK: - Light Theme")
    lines.append("")
    lines.append("/// Light тема (из Light.tokens.json)")
    lines.append("public let lightWFMColors = WFMSemanticColors(")

    def convert_primitive_swift(primitive: str, field: str) -> str:
        """Конвертирует примитив из Kotlin формата в Swift формат"""
        if primitive.startswith('WfmColors.'):
            # Извлекаем название примитива и конвертируем в camelCase
            prim_name = primitive.replace('WfmColors.', '')
            # Первую букву делаем маленькой
            prim_name = prim_name[0].lower() + prim_name[1:] if prim_name else ''
            return f"WFMPrimitiveColors.{prim_name}"
        elif primitive.startswith('Color(0x') and field in field_alphas:
            # Есть alpha - извлекаем hex и форматируем с alpha параметром
            hex_match = primitive[primitive.index('0x')+4:primitive.index(')')]
            alpha_val = field_alphas[field]
            return f"Color(hex: 0x{hex_match}, alpha: {alpha_val})"
        return primitive

    for i, group in enumerate(group_names):
        class_name = group_name_to_class_name(group, capitalize=True)
        fields = sorted(light_groups[group].keys())
        comma = "," if i < len(group_names) - 1 else ""

        lines.append(f"    {group}: {class_name}(")

        for j, field in enumerate(fields):
            # Восстанавливаем полное имя поля для поиска alpha
            full_field_name = group + field[0].upper() + field[1:] if field else group
            primitive = light_groups[group][field]
            primitive = convert_primitive_swift(primitive, full_field_name)
            field_comma = "," if j < len(fields) - 1 else ""
            lines.append(f"        {field}: {primitive}{field_comma}")

        lines.append(f"    ){comma}")

    lines.append(")")
    lines.append("")

    # Dark объект
    lines.append("// MARK: - Dark Theme")
    lines.append("")
    lines.append("/// Dark тема (из Dark.tokens.json)")
    lines.append("public let darkWFMColors = WFMSemanticColors(")

    for i, group in enumerate(group_names):
        class_name = group_name_to_class_name(group, capitalize=True)
        fields = sorted(dark_groups[group].keys())
        comma = "," if i < len(group_names) - 1 else ""

        lines.append(f"    {group}: {class_name}(")

        for j, field in enumerate(fields):
            # Восстанавливаем полное имя поля для поиска alpha
            full_field_name = group + field[0].upper() + field[1:] if field else group
            primitive = dark_groups[group][field]
            primitive = convert_primitive_swift(primitive, full_field_name)
            field_comma = "," if j < len(fields) - 1 else ""
            lines.append(f"        {field}: {primitive}{field_comma}")

        lines.append(f"    ){comma}")

    lines.append(")")
    lines.append("")

    # Environment и Extensions
    lines.append("// MARK: - Environment Key")
    lines.append("")
    lines.append("private struct WFMColorsKey: EnvironmentKey {")
    lines.append("    static let defaultValue: WFMSemanticColors = lightWFMColors")
    lines.append("}")
    lines.append("")
    lines.append("public extension EnvironmentValues {")
    lines.append("    var wfmColors: WFMSemanticColors {")
    lines.append("        get { self[WFMColorsKey.self] }")
    lines.append("        set { self[WFMColorsKey.self] = newValue }")
    lines.append("    }")
    lines.append("}")
    lines.append("")

    # Color Extension
    lines.append("// MARK: - Color Extension")
    lines.append("")
    lines.append("public extension Color {")
    lines.append("    /// Создание Color из hex значения")
    lines.append("    init(hex: UInt, alpha: Double = 1.0) {")
    lines.append("        self.init(")
    lines.append("            .sRGB,")
    lines.append("            red: Double((hex >> 16) & 0xFF) / 255.0,")
    lines.append("            green: Double((hex >> 8) & 0xFF) / 255.0,")
    lines.append("            blue: Double(hex & 0xFF) / 255.0,")
    lines.append("            opacity: alpha")
    lines.append("        )")
    lines.append("    }")
    lines.append("}")
    lines.append("")

    # View Modifier
    lines.append("// MARK: - View Modifier")
    lines.append("")
    lines.append("public struct WFMThemeModifier: ViewModifier {")
    lines.append("    @Environment(\\.colorScheme) private var colorScheme")
    lines.append("")
    lines.append("    public func body(content: Content) -> some View {")
    lines.append("        content")
    lines.append("            .environment(\\.wfmColors, colorScheme == .dark ? darkWFMColors : lightWFMColors)")
    lines.append("    }")
    lines.append("}")
    lines.append("")
    lines.append("public extension View {")
    lines.append("    /// Применяет тему WFM к view")
    lines.append("    func wfmTheme() -> some View {")
    lines.append("        modifier(WFMThemeModifier())")
    lines.append("    }")
    lines.append("}")
    lines.append("")

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print(f"✅ Создан файл: {output_path}")
    print(f"   Групп цветов: {len(group_names)}")
    print(f"   Всего полей: {sum(len(fields) for fields in light_groups.values())}")

def generate_kotlin(primitives: Dict[str, ColorToken],
                   light_semantic: Dict[str, str],
                   dark_semantic: Dict[str, str],
                   field_to_path: Dict[str, str],
                   output_path: Path):
    """Генерация Kotlin файла с группировкой цветов"""

    lines = []
    lines.append("package com.beyondviolet.wfm.ui.theme")
    lines.append("")
    lines.append("import androidx.compose.runtime.Immutable")
    lines.append("import androidx.compose.runtime.staticCompositionLocalOf")
    lines.append("import androidx.compose.ui.graphics.Color")
    lines.append("")
    lines.append("/**")
    lines.append(" * Цвета дизайн-системы WFM")
    lines.append(" * Токены из Figma (Light.tokens.json / Dark.tokens.json)")
    lines.append(" */")
    lines.append("object WfmColors {")
    lines.append("")
    lines.append("    // ═══════════════════════════════════════════════════════════════════")
    lines.append("    // PRIMITIVE COLORS (одинаковы для Light/Dark)")
    lines.append("    // ═══════════════════════════════════════════════════════════════════")
    lines.append("")

    # Группируем примитивы
    grouped = {}
    for path, token in sorted(primitives.items()):
        match = re.match(r'color/([^/]+)/', path)
        if match:
            category = match.group(1)
            if category not in grouped:
                grouped[category] = []
            grouped[category].append((path, token))

    category_comments = {
        'brand': '// Brand (фиолетовый)',
        'neutral': '// Neutral (серый)',
        'red': '// Red',
        'green': '// Green',
        'blue': '// Blue',
        'yellow': '// Yellow',
        'pink': '// Pink',
        'orange': '// Orange',
    }

    # Генерируем примитивы
    for category in ['brand', 'neutral', 'red', 'green', 'blue', 'yellow', 'pink', 'orange']:
        if category in grouped:
            lines.append(f"    {category_comments.get(category, f'// {category.title()}')}")
            for path, token in grouped[category]:
                var_name = primitive_to_var_name(path, capitalize=True)
                hex_int = int(token.hex.lstrip('#'), 16)
                lines.append(f"    val {var_name} = Color(0xFF{hex_int:06X})")
            lines.append("")

    # Добавляем градиенты (хардкод, как в примере)
    lines.append("    // Gradient (для будущего использования)")
    lines.append("    val GradientBrandStart = Color(0xFF612EE5)")
    lines.append("    val GradientBrandEnd = Color(0xFF9D2CF4)")
    lines.append("    val GradientHighlightStart = Color(0xFFFE6600)")
    lines.append("    val GradientHighlightEnd = Color(0xFFC32B23)")
    lines.append("}")
    lines.append("")

    # Группируем семантические поля
    light_groups = group_semantic_fields(light_semantic, field_to_path)
    dark_groups = group_semantic_fields(dark_semantic, field_to_path)

    # Генерируем data class для каждой группы
    lines.append("// ═══════════════════════════════════════════════════════════════════")
    lines.append("// SEMANTIC COLOR GROUPS")
    lines.append("// ═══════════════════════════════════════════════════════════════════")
    lines.append("")

    for group in sorted(light_groups.keys()):
        class_name = group_name_to_class_name(group, capitalize=True)
        fields = sorted(light_groups[group].keys())

        lines.append("@Immutable")
        lines.append(f"data class {class_name}(")

        for i, field in enumerate(fields):
            comma = "," if i < len(fields) - 1 else ""
            lines.append(f"    val {field}: Color{comma}")

        lines.append(")")
        lines.append("")

    # Генерируем главный data class для семантических цветов
    lines.append("/**")
    lines.append(" * Семантические цвета для темы WFM")
    lines.append(" * Значения меняются в зависимости от Light/Dark режима")
    lines.append(" */")
    lines.append("@Immutable")
    lines.append("data class WfmSemanticColors(")

    group_names = sorted(light_groups.keys())
    for i, group in enumerate(group_names):
        class_name = group_name_to_class_name(group, capitalize=True)
        comma = "," if i < len(group_names) - 1 else ""
        lines.append(f"    val {group}: {class_name}{comma}")

    lines.append(")")
    lines.append("")

    # Генерируем extension properties для обратной совместимости
    lines.append("// ═══════════════════════════════════════════════════════════════════")
    lines.append("// EXTENSION PROPERTIES (обратная совместимость)")
    lines.append("// ═══════════════════════════════════════════════════════════════════")
    lines.append("")

    for group in sorted(light_groups.keys()):
        lines.append(f"// {group.capitalize()}")
        fields = sorted(light_groups[group].keys())

        for field in fields:
            # cardTextPrimary → card.textPrimary
            full_field_name = group + field[0].upper() + field[1:] if field else group
            lines.append(f"val WfmSemanticColors.{full_field_name} get() = {group}.{field}")

        lines.append("")

    # Light объект
    lines.append("/**")
    lines.append(" * Light тема (из Light.tokens.json)")
    lines.append(" */")
    lines.append("fun getLightSemantic() = WfmSemanticColors(")

    for i, group in enumerate(group_names):
        class_name = group_name_to_class_name(group, capitalize=True)
        fields = sorted(light_groups[group].keys())
        comma = "," if i < len(group_names) - 1 else ""

        lines.append(f"    {group} = {class_name}(")

        for j, field in enumerate(fields):
            primitive = light_groups[group][field]
            field_comma = "," if j < len(fields) - 1 else ""
            lines.append(f"        {field} = {primitive}{field_comma}")

        lines.append(f"    ){comma}")

    lines.append(")")
    lines.append("")

    # Dark объект
    lines.append("/**")
    lines.append(" * Dark тема (из Dark.tokens.json)")
    lines.append(" */")
    lines.append("fun getDarkSemantic() = WfmSemanticColors(")

    for i, group in enumerate(group_names):
        class_name = group_name_to_class_name(group, capitalize=True)
        fields = sorted(dark_groups[group].keys())
        comma = "," if i < len(group_names) - 1 else ""

        lines.append(f"    {group} = {class_name}(")

        for j, field in enumerate(fields):
            primitive = dark_groups[group][field]
            field_comma = "," if j < len(fields) - 1 else ""
            lines.append(f"        {field} = {primitive}{field_comma}")

        lines.append(f"    ){comma}")

    lines.append(")")
    lines.append("")

    # CompositionLocal
    lines.append("/**")
    lines.append(" * CompositionLocal для доступа к семантическим цветам в Compose")
    lines.append(" */")
    lines.append("val LocalWfmColors = staticCompositionLocalOf { getLightSemantic() }")
    lines.append("")

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print(f"✅ Создан файл: {output_path}")
    print(f"   Групп цветов: {len(group_names)}")
    print(f"   Всего полей: {sum(len(fields) for fields in light_groups.values())}")

def main():
    """Главная функция"""
    colors_dir = Path(__file__).parent.parent  # mobile/figma_color_generator/
    base_dir = colors_dir.parent.parent        # wfm/

    primitives_file = colors_dir / "Primitives.json"
    alias_file = colors_dir / "Alias.json"
    light_file = colors_dir / "Components color.Light.json"
    dark_file = colors_dir / "Components color.Dark.json"

    # Проверка
    for file_path in [primitives_file, alias_file, light_file, dark_file]:
        if not file_path.exists():
            print(f"❌ Файл не найден: {file_path}")
            return

    print("📖 Парсинг JSON файлов...")

    # Парсим
    primitives = parse_json_tokens(primitives_file)
    aliases = parse_json_tokens(alias_file)
    light_components = parse_json_tokens(light_file)
    dark_components = parse_json_tokens(dark_file)

    print(f"   Primitives: {len(primitives)}")
    print(f"   Aliases: {len(aliases)}")
    print(f"   Light components: {len(light_components)}")
    print(f"   Dark components: {len(dark_components)}")
    print()

    print("🔗 Резолвим маппинги...")

    # Создаём семантические маппинги
    light_semantic = {}  # {fieldName: WfmColors.Neutral900 или Color(...)}
    dark_semantic = {}
    field_alphas = {}  # {fieldName: alpha_value} для полей с прозрачностью
    field_to_path = {}  # {fieldName: original_path} для определения группы

    # Обрабатываем Light
    for path, token in light_components.items():
        field_name = semantic_path_to_field_name(path)
        field_to_path[field_name] = path

        # Резолвим до примитива
        primitive_path = None
        if token.target:
            primitive_path = resolve_target(token.target, aliases, primitives)

        if primitive_path:
            var_name = primitive_to_var_name(primitive_path, capitalize=True)
            light_semantic[field_name] = f"WfmColors.{var_name}"
        else:
            # Fallback - используем hex напрямую
            hex_int = int(token.hex.lstrip('#'), 16)
            if token.alpha < 1.0:
                # Сохраняем alpha отдельно для Swift
                field_alphas[field_name] = token.alpha
                # Для Kotlin используем ARGB формат
                light_semantic[field_name] = f"Color(0x{int(token.alpha * 255):02X}{hex_int:06X})"
            else:
                light_semantic[field_name] = f"Color(0xFF{hex_int:06X})"

    # Обрабатываем Dark
    for path, token in dark_components.items():
        field_name = semantic_path_to_field_name(path)

        primitive_path = None
        if token.target:
            primitive_path = resolve_target(token.target, aliases, primitives)

        if primitive_path:
            var_name = primitive_to_var_name(primitive_path, capitalize=True)
            dark_semantic[field_name] = f"WfmColors.{var_name}"
        else:
            hex_int = int(token.hex.lstrip('#'), 16)
            if token.alpha < 1.0:
                # Alpha уже сохранён из light, не дублируем
                if field_name not in field_alphas:
                    field_alphas[field_name] = token.alpha
                dark_semantic[field_name] = f"Color(0x{int(token.alpha * 255):02X}{hex_int:06X})"
            else:
                dark_semantic[field_name] = f"Color(0xFF{hex_int:06X})"

    # Добавляем алиасы напрямую
    for path, token in aliases.items():
        field_name = semantic_path_to_field_name(path)

        if field_name not in light_semantic:  # Не дублируем
            field_to_path[field_name] = path  # Сохраняем путь для алиасов

            primitive_path = resolve_target(path, aliases, primitives)
            if primitive_path:
                var_name = primitive_to_var_name(primitive_path, capitalize=True)
                light_semantic[field_name] = f"WfmColors.{var_name}"
                dark_semantic[field_name] = f"WfmColors.{var_name}"  # Алиасы одинаковые
            else:
                # Если алиас не резолвится в примитив, используем прямое значение
                hex_int = int(token.hex.lstrip('#'), 16)
                if token.alpha < 1.0:
                    field_alphas[field_name] = token.alpha
                    color_value = f"Color(0x{int(token.alpha * 255):02X}{hex_int:06X})"
                else:
                    color_value = f"Color(0xFF{hex_int:06X})"
                light_semantic[field_name] = color_value
                dark_semantic[field_name] = color_value

    print(f"   Light semantic: {len(light_semantic)} полей")
    print(f"   Dark semantic: {len(dark_semantic)} полей")
    print()

    # Генерируем Swift
    swift_output = base_dir / "mobile" / "ios" / "WFMUI" / "Sources" / "WFMUI" / "Theme" / "WFMColors_generated.swift"
    swift_output.parent.mkdir(parents=True, exist_ok=True)
    print("🔨 Генерация WFMColors_generated.swift...")
    generate_swift(primitives, light_semantic, dark_semantic, field_alphas, field_to_path, swift_output)
    print()

    # Генерируем Kotlin
    kotlin_output = base_dir / "mobile" / "android" / "ui" / "src" / "main" / "kotlin" / "com" / "beyondviolet" / "wfm" / "ui" / "theme" / "WfmColors_generated.kt"
    kotlin_output.parent.mkdir(parents=True, exist_ok=True)
    print("🔨 Генерация WfmColors_generated.kt...")
    generate_kotlin(primitives, light_semantic, dark_semantic, field_to_path, kotlin_output)
    print()

    print("✨ Готово!")
    print(f"\n📝 Сгенерированные файлы:")
    print(f"   - {swift_output}")
    print(f"   - {kotlin_output}")

if __name__ == '__main__':
    main()
