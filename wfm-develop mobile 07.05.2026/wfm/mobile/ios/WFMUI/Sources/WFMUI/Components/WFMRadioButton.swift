import SwiftUI

/// Радиокнопка для единичного выбора
/// Используется в группах выбора (radio groups)
public struct WFMRadioButton: View {
    private let isSelected: Bool
    private let isDisabled: Bool

    @Environment(\.wfmColors) private var colors

    /// Инициализатор радиокнопки
    /// - Parameters:
    ///   - isSelected: Выбрана ли радиокнопка
    ///   - isDisabled: Неактивна ли радиокнопка
    public init(
        isSelected: Bool,
        isDisabled: Bool = false
    ) {
        self.isSelected = isSelected
        self.isDisabled = isDisabled
    }

    public var body: some View {
        ZStack {
            // Внешний круг (фон)
            Circle()
                .fill(outerCircleColor)
                .frame(width: 24, height: 24)

            // Бордер для не выбранного состояния
            if !isSelected {
                Circle()
                    .stroke(borderColor, lineWidth: 1)
                    .frame(width: 24, height: 24)
            }

            // Внутренний круг для selected состояния
            if isSelected {
                Circle()
                    .fill(innerCircleColor)
                    .frame(width: 10, height: 10)
            }
        }
        .frame(width: 24, height: 24)
    }

    private var outerCircleColor: Color {
        if isDisabled {
            return colors.selectionBgDisabled
        } else if isSelected {
            return colors.selectionBgChecked
        } else {
            return colors.selectionBgDefault
        }
    }

    private var borderColor: Color {
        colors.selectionBorderDefault
    }

    private var innerCircleColor: Color {
        if isDisabled {
            return colors.selectionBgDisabled
        } else {
            return colors.selectionIconChecked
        }
    }
}

#if DEBUG
struct WFMRadioButton_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 20) {
            HStack(spacing: 16) {
                VStack {
                    WFMRadioButton(isSelected: false)
                    Text("Not Selected")
                        .font(.caption)
                }

                VStack {
                    WFMRadioButton(isSelected: true)
                    Text("Selected")
                        .font(.caption)
                }

                VStack {
                    WFMRadioButton(isSelected: false, isDisabled: true)
                    Text("Disabled")
                        .font(.caption)
                }

                VStack {
                    WFMRadioButton(isSelected: true, isDisabled: true)
                    Text("Selected Disabled")
                        .font(.caption)
                }
            }
        }
        .padding()
        .wfmTheme()
    }
}
#endif
