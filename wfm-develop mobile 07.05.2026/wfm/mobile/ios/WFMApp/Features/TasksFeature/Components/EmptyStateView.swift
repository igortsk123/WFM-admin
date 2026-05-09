import SwiftUI
import WFMUI

// MARK: - EmptyStateButton

/// Модель кнопки для EmptyStateView
struct EmptyStateButton: Identifiable {
    let id = UUID()
    let title: String
    let style: ButtonStyle
    let action: () -> Void

    enum ButtonStyle {
        case primary    // WFMPrimaryButton
        case secondary  // WFMSecondaryButton
        case link       // WFMTextButton
    }
}

// MARK: - EmptyStateView

/// Переиспользуемый компонент для отображения пустых состояний
/// Используется для "нет открытой смены" и "нет задач"
struct EmptyStateView: View {
    @Environment(\.wfmColors) private var colors

    let title: String
    let description: String?
    let buttons: [EmptyStateButton]

    var body: some View {
        VStack(spacing: WFMSpacing.l) {
            // Иконка + текст
            VStack(spacing: WFMSpacing.s) {
                // Иконка с фоном
                Image("futered-info")
                    .resizable()
                    .renderingMode(.original)
                    .frame(width: 56, height: 56)

                // Заголовок
                Text(title)
                    .font(WFMTypography.headline20Bold)
                    .foregroundColor(colors.textPrimary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)

                // Описание (опционально)
                if let description = description {
                    Text(description)
                        .font(WFMTypography.body16Regular)
                        .foregroundColor(colors.cardTextSecondary)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                }
            }

            // Кнопки
            if !buttons.isEmpty {
                VStack(spacing: WFMSpacing.xxs) {
                    ForEach(buttons) { button in
                        buttonView(for: button)
                    }
                }
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 52)
            }
        }
        .padding(.horizontal, WFMSpacing.l)
        .frame(maxHeight: .infinity)
    }

    // MARK: - Private Methods

    @ViewBuilder
    private func buttonView(for button: EmptyStateButton) -> some View {
        switch button.style {
        case .primary:
            WFMPrimaryButton(
                text: button.title,
                action: button.action
            )

        case .secondary:
            WFMSecondaryButton(
                text: button.title,
                action: button.action
            )

        case .link:
            WFMTextButton(
                text: button.title,
                action: button.action
            )
        }
    }
}

// MARK: - Preview

#Preview("Нет смены") {
    EmptyStateView(
        title: "Список задач будет доступен после открытия смены",
        description: nil,
        buttons: [
            EmptyStateButton(
                title: "Открыть смену",
                style: .primary,
                action: {}
            )
        ]
    )
    .wfmTheme()
}

#Preview("Нет задач") {
    EmptyStateView(
        title: "У вас нет задач",
        description: "Пока нет задач, вы можете освежить знания по регламентам или сообщить директору.",
        buttons: [
            EmptyStateButton(
                title: "Регламенты",
                style: .link,
                action: {}
            ),
            EmptyStateButton(
                title: "Сообщить директору",
                style: .secondary,
                action: {}
            )
        ]
    )
    .wfmTheme()
}
