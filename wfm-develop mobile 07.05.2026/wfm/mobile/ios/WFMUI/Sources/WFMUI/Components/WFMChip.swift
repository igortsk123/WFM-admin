import SwiftUI

/// Состояния чипа
public enum WFMChipState {
    case `default`  // Не выбран (бордер фиолетовый, фон белый, текст фиолетовый)
    case active     // Выбран (фон фиолетовый, текст белый)
    case disabled   // Неактивен (бордер светлый, текст светлый)
}

/// Чип для фильтрации (компактная кнопка выбора опций)
public struct WFMChip: View {
    @Environment(\.wfmColors) private var colors

    private let text: String
    private let state: WFMChipState
    private let onTap: (() -> Void)?

    public init(
        text: String,
        state: WFMChipState = .default,
        onTap: (() -> Void)? = nil
    ) {
        self.text = text
        self.state = state
        self.onTap = onTap
    }

    public var body: some View {
        Button {
            onTap?()
        } label: {
            Text(text)
                .font(textFont)
                .foregroundColor(textColor)
                .padding(.horizontal, WFMSpacing.m)
                .padding(.vertical, WFMSpacing.xs)
                .frame(height: 32)
        }
        .background(backgroundColor)
        .overlay(
            RoundedRectangle(cornerRadius: WFMRadius.m)
                .stroke(borderColor, lineWidth: borderWidth)
        )
        .clipShape(RoundedRectangle(cornerRadius: WFMRadius.m))
        .disabled(state == .disabled || onTap == nil)
    }

    // MARK: - Styling

    private var textFont: Font {
        switch state {
        case .active:
            return WFMTypography.headline14Medium
        case .default, .disabled:
            return WFMTypography.body14Regular
        }
    }

    private var textColor: Color {
        switch state {
        case .default:
            return colors.buttonTertiaryTextDefault
        case .active:
            return colors.buttonPrimaryTextDefault
        case .disabled:
            return colors.buttonPrimaryTextDisabled
        }
    }

    private var backgroundColor: Color {
        switch state {
        case .default, .disabled:
            return .clear
        case .active:
            return colors.badgeBrandBgBright
        }
    }

    private var borderColor: Color {
        switch state {
        case .default:
            return colors.iconImgEmptyState
        case .active:
            return .clear
        case .disabled:
            return colors.buttonSecondaryTextDisabled
        }
    }

    private var borderWidth: CGFloat {
        state == .active ? 0 : 1
    }
}
