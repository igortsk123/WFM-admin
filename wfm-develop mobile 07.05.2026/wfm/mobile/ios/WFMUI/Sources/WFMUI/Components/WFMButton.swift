import SwiftUI

/// Основная кнопка дизайн-системы WFM
public struct WFMPrimaryButton: View {
    let text: String
    let action: () -> Void
    let isEnabled: Bool
    let isLoading: Bool
    let fillHeight: Bool

    @Environment(\.wfmColors) private var colors

    public init(
        text: String,
        isEnabled: Bool = true,
        isLoading: Bool = false,
        fillHeight: Bool = true,
        action: @escaping () -> Void
    ) {
        self.text = text
        self.isEnabled = isEnabled
        self.isLoading = isLoading
        self.fillHeight = fillHeight
        self.action = action
    }

    public var body: some View {
        Button(action: {
            if isEnabled && !isLoading {
                action()
            }
        }) {
            buttonContent
        }
        .disabled(!isEnabled || isLoading)
    }

    @ViewBuilder
    private var buttonContent: some View {
        let content = ZStack {
            if isLoading {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: textColor))
                    .scaleEffect(0.8)
            } else {
                Text(text)
                    .font(WFMTypography.headline16Bold)
                    .tracking(WFMTypography.LetterSpacing.headline16Bold)
                    .foregroundColor(textColor)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: fillHeight ? .infinity : nil)
        .padding(.horizontal, WFMSpacing.l)
        .padding(.vertical, WFMSpacing.m)
        .background(backgroundColor)
        .cornerRadius(WFMRadius.l)

        if fillHeight {
            content
        } else {
            content.fixedSize(horizontal: false, vertical: true)
        }
    }

    private var backgroundColor: Color {
        isEnabled ? colors.buttonPrimaryBgDefault : colors.buttonPrimaryBgDisabled
    }

    private var textColor: Color {
        isEnabled ? colors.buttonPrimaryTextDefault : colors.buttonPrimaryTextDisabled
    }
}

/// Размер кнопки
public enum WFMButtonSize {
    case big    // 48pt height, 16px font
    case medium // 44pt height, 14px font
}

/// Вторичная кнопка дизайн-системы WFM
public struct WFMSecondaryButton: View {
    let text: String
    let icon: String?
    let action: () -> Void
    let isEnabled: Bool
    let isLoading: Bool
    let isNeutral: Bool
    let size: WFMButtonSize
    let fillHeight: Bool

    @Environment(\.wfmColors) private var colors

    public init(
        text: String,
        icon: String? = nil,
        isEnabled: Bool = true,
        isLoading: Bool = false,
        isNeutral: Bool = false,
        size: WFMButtonSize = .big,
        fillHeight: Bool = true,
        action: @escaping () -> Void
    ) {
        self.text = text
        self.icon = icon
        self.isEnabled = isEnabled
        self.isLoading = isLoading
        self.isNeutral = isNeutral
        self.size = size
        self.fillHeight = fillHeight
        self.action = action
    }

    public var body: some View {
        Button(action: {
            if isEnabled && !isLoading {
                action()
            }
        }) {
            buttonContent
        }
        .disabled(!isEnabled || isLoading)
    }

    @ViewBuilder
    private var buttonContent: some View {
        let content = ZStack {
            if isLoading {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: textColor))
                    .scaleEffect(0.8)
            } else {
                HStack(spacing: 4) {
                    if let icon = icon {
                        Image(icon)
                            .resizable()
                            .scaledToFit()
                            .frame(width: 24, height: 24)
                            .foregroundColor(textColor)
                    }

                    Text(text)
                        .font(textFont)
                        .tracking(textTracking)
                        .foregroundColor(textColor)
                        .multilineTextAlignment(.center)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: fillHeight ? .infinity : nil)
        .padding(.horizontal, WFMSpacing.l)
        .padding(.vertical, WFMSpacing.m)
        .background(backgroundColor)
        .cornerRadius(WFMRadius.l)

        if fillHeight {
            content
        } else {
            content.fixedSize(horizontal: false, vertical: true)
        }
    }

    private var textFont: Font {
        switch size {
        case .big: return WFMTypography.headline16Bold
        case .medium: return WFMTypography.body14Bold
        }
    }

    private var textTracking: CGFloat {
        switch size {
        case .big: return WFMTypography.LetterSpacing.headline16Bold
        case .medium: return WFMTypography.LetterSpacing.body14Bold
        }
    }

    private var backgroundColor: Color {
        if isNeutral {
            return isEnabled ? colors.buttonTertiaryBgDefault : colors.buttonTertiaryBgDisabled
        } else {
            return isEnabled ? colors.buttonSecondaryBgDefault : colors.buttonSecondaryBgDisabled
        }
    }

    private var textColor: Color {
        if isNeutral {
            return isEnabled ? colors.buttonTertiaryTextDefault : colors.buttonTertiaryTextDisabled
        } else {
            return isEnabled ? colors.buttonSecondaryTextDefault : colors.buttonSecondaryTextDisabled
        }
    }
}

/// Текстовая кнопка (ссылка) дизайн-системы WFM
public struct WFMTextButton: View {
    let text: String
    let isEnabled: Bool
    let action: () -> Void

    @Environment(\.wfmColors) private var colors

    public init(text: String, isEnabled: Bool = true, action: @escaping () -> Void) {
        self.text = text
        self.isEnabled = isEnabled
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Text(text)
                .font(WFMTypography.headline14Medium)
                .foregroundColor(isEnabled ? colors.buttonLinkTextDefault : colors.buttonLinkTextDisabled)
                .padding(.vertical, WFMSpacing.m)
        }
        .disabled(!isEnabled)
    }
}

// MARK: - Previews

#Preview("Primary Button - Enabled") {
    VStack(spacing: 16) {
        WFMPrimaryButton(text: "Далее") {}
        WFMPrimaryButton(text: "Далее", isEnabled: false) {}
        WFMPrimaryButton(text: "Загрузка...", isLoading: true) {}
    }
    .padding()
    .wfmTheme()
}

#Preview("Secondary Button") {
    VStack(spacing: 16) {
        WFMSecondaryButton(text: "Отмена") {}
        WFMSecondaryButton(text: "Отмена", isNeutral: true) {}
    }
    .padding()
    .wfmTheme()
}

#Preview("Text Button") {
    WFMTextButton(text: "Поддержка") {}
        .padding()
        .wfmTheme()
}
