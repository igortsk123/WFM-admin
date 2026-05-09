import SwiftUI

/// Чекбокс для множественного выбора
/// Используется в фильтрах и списках выбора
public struct WFMCheckbox: View {
    private let isChecked: Bool
    private let isDisabled: Bool

    @Environment(\.wfmColors) private var colors

    /// Инициализатор чекбокса
    /// - Parameters:
    ///   - isChecked: Выбран ли чекбокс
    ///   - isDisabled: Неактивен ли чекбокс
    public init(
        isChecked: Bool,
        isDisabled: Bool = false
    ) {
        self.isChecked = isChecked
        self.isDisabled = isDisabled
    }

    public var body: some View {
        ZStack {
            // Фон чекбокса (квадрат со скругленными углами)
            RoundedRectangle(cornerRadius: WFMRadius.xs)
                .fill(backgroundColor)
                .frame(width: 24, height: 24)

            // Бордер для passive состояния
            if !isChecked && !isDisabled {
                RoundedRectangle(cornerRadius: WFMRadius.xs)
                    .stroke(colors.selectionBorderDefault, lineWidth: 1)
                    .frame(width: 24, height: 24)
            }

            // Галочка для checked состояния
            if isChecked && !isDisabled {
                WFMIcons.checkIcon
                    .resizable()
                    .renderingMode(.template)
                    .foregroundColor(colors.selectionIconChecked)
                    .frame(width: 12, height: 12)
            }
        }
        .frame(width: 24, height: 24)
    }

    private var backgroundColor: Color {
        if isDisabled {
            return colors.selectionBgDisabled // серый
        } else if isChecked {
            return colors.selectionBgChecked // синий brand500
        } else {
            return colors.selectionBgDefault // для passive состояния
        }
    }
}

#if DEBUG
struct WFMCheckbox_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 20) {
            HStack(spacing: 16) {
                VStack {
                    WFMCheckbox(isChecked: false)
                    Text("Passive")
                        .font(.caption)
                }

                VStack {
                    WFMCheckbox(isChecked: true)
                    Text("Checked")
                        .font(.caption)
                }

                VStack {
                    WFMCheckbox(isChecked: false, isDisabled: true)
                    Text("Disabled")
                        .font(.caption)
                }
            }
        }
        .padding()
        .wfmTheme()
    }
}
#endif
