import SwiftUI

// MARK: - Toast Types

/// Тип тоста (определяет содержимое)
public enum WFMToastType {
    /// Только текст
    case text
    /// Текст + кнопка-ссылка
    case textWithButton(buttonTitle: String, action: () -> Void)
}

/// Состояние тоста (определяет цвет фона)
public enum WFMToastState {
    /// Стандартный (тёмный фон)
    case `default`
    /// Ошибка (красный фон)
    case error
}

// MARK: - Toast Data

/// Данные для отображения тоста
public struct WFMToastData: Identifiable {
    public let id = UUID()
    public let message: String
    public let type: WFMToastType
    public let state: WFMToastState

    public init(message: String, type: WFMToastType = .text, state: WFMToastState = .default) {
        self.message = message
        self.type = type
        self.state = state
    }
}

// MARK: - WFMToast View

/// Компонент Toast (всплывающее уведомление)
///
/// Использование:
/// ```swift
/// WFMToast(data: WFMToastData(message: "Смена открыта"))
/// WFMToast(data: WFMToastData(message: "Ошибка", state: .error))
/// WFMToast(data: WFMToastData(
///     message: "Задача назначена",
///     type: .textWithButton(buttonTitle: "Перейти", action: { })
/// ))
/// ```
public struct WFMToast: View {
    @Environment(\.wfmColors) private var colors

    public let data: WFMToastData

    public init(data: WFMToastData) {
        self.data = data
    }

    private var backgroundColor: Color {
        switch data.state {
        case .default: return colors.toastBg
        case .error:   return colors.toastBgError
        }
    }

    public var body: some View {
        HStack(spacing: WFMSpacing.s) {
            Text(data.message)
                .wfmBody15Regular()
                .foregroundColor(colors.toastText)
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)

            if case .textWithButton(let title, let action) = data.type {
                Button(action: action) {
                    Text(title)
                        .font(WFMTypography.headline12Medium)
                        .foregroundColor(colors.toastText)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, WFMSpacing.l)
        .padding(.vertical, WFMSpacing.m)
        .background(backgroundColor)
        .cornerRadius(WFMRadius.m)
    }
}
