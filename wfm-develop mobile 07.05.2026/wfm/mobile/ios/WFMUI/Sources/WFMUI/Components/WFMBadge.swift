import SwiftUI

// MARK: - Badge Color

/// Цвета бейджа
public enum BadgeColor {
    case violet
    case blue
    case yellow
    case pink
    case orange
    case green

    func backgroundColor(_ colors: WFMSemanticColors) -> Color {
        switch self {
        case .violet: return colors.badgeBrandBgLight
        case .blue: return colors.badgeBlueBgLight
        case .yellow: return colors.badgeYellowBgLight
        case .pink: return colors.badgePinkBgLight
        case .orange: return colors.badgeOrangeBgLight
        case .green: return colors.badgeGreenBgLight
        }
    }

    func textColor(_ colors: WFMSemanticColors) -> Color {
        switch self {
        case .violet: return colors.badgeBrandTextBright
        case .blue: return colors.badgeBlueTextBright
        case .yellow: return colors.badgeYellowTextBright
        case .pink: return colors.badgePinkTextBright
        case .orange: return colors.badgeOrangeTextBright
        case .green: return colors.badgeGreenTextBright
        }
    }
}

// MARK: - Badge Icon

/// Тип иконки в бейдже
public enum BadgeIcon {
    case none       // Без иконки
    case dot        // Точка слева
    case thunder    // Иконка молнии слева (для бонусов)
}

// MARK: - Badge Component

/// Компонент Badge дизайн-системы WFM
///
/// Используется для отображения статусов, категорий, бонусов и других меток.
///
/// - Parameters:
///   - text: Текст бейджа
///   - color: Цвет бейджа (определяет фон и цвет текста)
///   - icon: Тип иконки (none, dot, thunder)
public struct WFMBadge: View {
    let text: String
    let color: BadgeColor
    let icon: BadgeIcon

    @Environment(\.wfmColors) private var colors

    public init(text: String, color: BadgeColor, icon: BadgeIcon = .none) {
        self.text = text
        self.color = color
        self.icon = icon
    }

    public var body: some View {
        HStack(spacing: icon == .none ? 0 : WFMSpacing.xxxs) {
            // Иконка (если есть)
            switch icon {
            case .dot:
                Circle()
                    .fill(color.textColor(colors))
                    .frame(width: 4, height: 4)

            case .thunder:
                // TODO: Добавить иконку молнии (нужно экспортировать из Figma)
                // Временно используем заглушку
                Circle()
                    .fill(color.textColor(colors))
                    .frame(width: 16, height: 16)

            case .none:
                EmptyView()
            }

            // Текст
            Text(text)
                .font(WFMTypography.headline12Medium)
                .tracking(WFMTypography.LetterSpacing.headline12Medium)
                .foregroundColor(color.textColor(colors))
        }
        .padding(.horizontal, WFMSpacing.xs)
        .padding(.vertical, WFMSpacing.xxxs)
        .background(color.backgroundColor(colors))
        .cornerRadius(WFMRadius.s)
    }
}

// MARK: - Previews

#Preview("Badge - Violet (Выкладка)") {
    WFMBadge(text: "Выкладка", color: .violet)
        .padding()
        .wfmTheme()
}

#Preview("Badge - Blue (Работа на кассе)") {
    WFMBadge(text: "Работа на кассе", color: .blue)
        .padding()
        .wfmTheme()
}

#Preview("Badge - Yellow (Смена ценников)") {
    WFMBadge(text: "Смена ценников", color: .yellow)
        .padding()
        .wfmTheme()
}

#Preview("Badge - Pink (Другие работы)") {
    WFMBadge(text: "Другие работы", color: .pink)
        .padding()
        .wfmTheme()
}

#Preview("Badge - Orange (Другие работы)") {
    WFMBadge(text: "Другие работы", color: .orange)
        .padding()
        .wfmTheme()
}

#Preview("Badge - Green (Другие работы)") {
    WFMBadge(text: "Другие работы", color: .green)
        .padding()
        .wfmTheme()
}

#Preview("Badge - Orange + Thunder (Бонус)") {
    WFMBadge(text: "Бонус 300 ₽", color: .orange, icon: .thunder)
        .padding()
        .wfmTheme()
}

#Preview("Badge - Blue + Dot (Создано)") {
    WFMBadge(text: "Создано", color: .blue, icon: .dot)
        .padding()
        .wfmTheme()
}

#Preview("All Badges") {
    VStack(spacing: 12) {
        WFMBadge(text: "Выкладка", color: .violet)
        WFMBadge(text: "Работа на кассе", color: .blue)
        WFMBadge(text: "Смена ценников", color: .yellow)
        WFMBadge(text: "Другие работы", color: .pink)
        WFMBadge(text: "Другие работы", color: .orange)
        WFMBadge(text: "Другие работы", color: .green)
        WFMBadge(text: "Бонус 300 ₽", color: .orange, icon: .thunder)
        WFMBadge(text: "Создано", color: .blue, icon: .dot)
    }
    .padding()
    .wfmTheme()
}
