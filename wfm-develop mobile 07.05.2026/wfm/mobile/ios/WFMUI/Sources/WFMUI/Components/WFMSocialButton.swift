import SwiftUI

/// Кнопка авторизации через социальную сеть
///
/// Компонент отображает кнопку с иконкой соцсети и текстом.
/// Поддерживает три состояния: enabled, disabled, error.
///
/// Пример:
/// ```swift
/// WFMSocialButton(
///     icon: Image("vk_icon"),
///     text: "Вконтакте",
///     isEnabled: true,
///     errorMessage: nil
/// ) {
///     // action
/// }
/// ```
public struct WFMSocialButton: View {
    let icon: Image
    let text: String
    let action: () -> Void
    let isEnabled: Bool
    let errorMessage: String?

    @Environment(\.wfmColors) private var colors

    public init(
        icon: Image,
        text: String,
        isEnabled: Bool = true,
        errorMessage: String? = nil,
        action: @escaping () -> Void
    ) {
        self.icon = icon
        self.text = text
        self.isEnabled = isEnabled
        self.errorMessage = errorMessage
        self.action = action
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            // Кнопка
            Button(action: {
                if isEnabled {
                    action()
                }
            }) {
                HStack(spacing: WFMSpacing.s) {
                    // Иконка соцсети (24x24pt)
                    icon
                        .resizable()
                        .frame(width: 24, height: 24)

                    // Текст
                    Text(text)
                        .font(WFMTypography.headline16Bold)
                        .tracking(WFMTypography.LetterSpacing.headline16Bold)
                        .foregroundColor(textColor)
                }
                .frame(maxWidth: .infinity)
                .padding(.horizontal, WFMSpacing.l)
                .padding(.vertical, WFMSpacing.l)
                .background(backgroundColor)
                .cornerRadius(WFMRadius.l)
            }
            .disabled(!isEnabled)

            // Сообщение об ошибке
            if let errorMessage = errorMessage {
                Text(errorMessage)
                    .font(.system(size: 13))
                    .foregroundColor(colors.textError)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private var backgroundColor: Color {
        // В любом состоянии фон одинаковый (#EEEEF8)
        colors.buttonTertiaryBgDefault
    }

    private var textColor: Color {
        if isEnabled {
            return colors.textPrimary
        } else {
            return colors.buttonTertiaryTextDisabled
        }
    }
}

// MARK: - Preview

#Preview("WFMSocialButton - Default") {
    VStack(spacing: 16) {
        WFMSocialButton(
            icon: WFMIcons.person,
            text: "Вконтакте",
            isEnabled: true,
            errorMessage: nil
        ) {
            print("VK clicked")
        }

        WFMSocialButton(
            icon: WFMIcons.person,
            text: "Вконтакте",
            isEnabled: false,
            errorMessage: nil
        ) {
            print("VK clicked")
        }

        WFMSocialButton(
            icon: WFMIcons.person,
            text: "Вконтакте",
            isEnabled: true,
            errorMessage: "Не удалось авторизоваться через Вконтакте. Попробуйте другой способ авторизации."
        ) {
            print("VK clicked")
        }
    }
    .padding()
    .wfmTheme()
}

#Preview("WFMSocialButton - Dark Mode") {
    VStack(spacing: 16) {
        WFMSocialButton(
            icon: WFMIcons.person,
            text: "Вконтакте",
            isEnabled: true,
            errorMessage: nil
        ) {
            print("VK clicked")
        }

        WFMSocialButton(
            icon: WFMIcons.person,
            text: "Вконтакте",
            isEnabled: true,
            errorMessage: "Не удалось авторизоваться через Вконтакте. Попробуйте другой способ авторизации."
        ) {
            print("VK clicked")
        }
    }
    .padding()
    .preferredColorScheme(.dark)
    .wfmTheme()
}
