import SwiftUI

/// Link кнопка дизайн-системы WFM
///
/// Низкий приоритет, для менее важных действий.
/// Представляет собой текст без фона в цветах brand.
///
/// Дизайн: https://www.figma.com/design/J9crsNS4wIszpILzWvnY2T/Smart-employee?node-id=900-12300
public struct WFMLinkButton: View {
    let text: String
    let action: () -> Void
    let size: WFMLinkButtonSize
    let isEnabled: Bool

    @Environment(\.wfmColors) private var colors

    public init(
        text: String,
        size: WFMLinkButtonSize = .big,
        isEnabled: Bool = true,
        action: @escaping () -> Void
    ) {
        self.text = text
        self.size = size
        self.isEnabled = isEnabled
        self.action = action
    }

    public var body: some View {
        Button(action: {
            if isEnabled {
                action()
            }
        }) {
            buttonContent
        }
        .disabled(!isEnabled)
    }

    @ViewBuilder
    private var buttonContent: some View {
        Text(text)
            .font(font)
            .tracking(letterSpacing)
            .foregroundColor(textColor)
            .multilineTextAlignment(.center)
            .padding(.horizontal, horizontalPadding)
            .padding(.vertical, verticalPadding)
            .fixedSize(horizontal: false, vertical: true)
    }

    private var font: Font {
        switch size {
        case .big:
            return WFMTypography.headline16Medium
        case .medium:
            return WFMTypography.headline14Medium
        case .small:
            return WFMTypography.headline12Medium
        case .xsmall:
            return WFMTypography.headline12Medium
        }
    }

    private var letterSpacing: CGFloat {
        switch size {
        case .big:
            return WFMTypography.LetterSpacing.headline16Medium
        case .medium:
            return WFMTypography.LetterSpacing.headline14Medium
        case .small:
            return WFMTypography.LetterSpacing.headline12Medium
        case .xsmall:
            return WFMTypography.LetterSpacing.headline12Medium
        }
    }

    private var horizontalPadding: CGFloat {
        switch size {
        case .big, .medium:
            return WFMSpacing.l  // 16
        case .small:
            return WFMSpacing.m  // 12
        case .xsmall:
            return WFMSpacing.s  // 8
        }
    }

    private var verticalPadding: CGFloat {
        switch size {
        case .big, .medium:
            return WFMSpacing.m  // 12
        case .small:
            return WFMSpacing.s  // 8
        case .xsmall:
            return WFMSpacing.xxs  // 4
        }
    }

    private var textColor: Color {
        isEnabled ? colors.buttonLinkTextDefault : colors.buttonLinkTextDisabled
    }
}

/// Размер Link кнопки
public enum WFMLinkButtonSize {
    case big      // 16px font, 16/12 padding
    case medium   // 14px font, 16/12 padding
    case small    // 12px font, 12/8 padding
    case xsmall   // 12px font, 8/4 padding
}

// MARK: - Preview

#Preview("Link Button - All Sizes") {
    VStack(spacing: 16) {
        WFMLinkButton(text: "Отмена", size: .big) {
            print("Big button tapped")
        }

        WFMLinkButton(text: "Отмена", size: .medium) {
            print("Medium button tapped")
        }

        WFMLinkButton(text: "Отмена", size: .small) {
            print("Small button tapped")
        }

        WFMLinkButton(text: "Отмена", size: .xsmall) {
            print("XSmall button tapped")
        }

        WFMLinkButton(text: "Отмена (Disabled)", isEnabled: false) {
            print("Disabled button tapped")
        }
    }
    .padding()
    .wfmTheme()
}
