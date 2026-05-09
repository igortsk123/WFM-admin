import SwiftUI

/// Переключатель (Toggle Switch) для включения/выключения опций
/// Используется для настроек и переключения состояний
public struct WFMToggle: View {
    private let isOn: Bool
    private let isDisabled: Bool

    @Environment(\.wfmColors) private var colors

    /// Инициализатор переключателя
    /// - Parameters:
    ///   - isOn: Включен ли переключатель
    ///   - isDisabled: Неактивен ли переключатель
    public init(
        isOn: Bool,
        isDisabled: Bool = false
    ) {
        self.isOn = isOn
        self.isDisabled = isDisabled
    }

    public var body: some View {
        ZStack {
            // Фон (трек)
            Capsule()
                .fill(trackColor)
                .overlay(
                    Capsule()
                        .stroke(borderColor, lineWidth: borderWidth)
                )
                .frame(width: 51, height: 31)

            // Кнопка (thumb)
            Circle()
                .fill(thumbColor)
                .frame(width: 27, height: 27)
                .offset(x: isOn ? 10 : -10)
        }
        .frame(width: 51, height: 31)
    }

    private var trackColor: Color {
        if isOn {
            return colors.selectionBgChecked
        } else {
            return colors.selectionBgDefault
        }
    }

    private var borderColor: Color {
        if isOn {
            return Color.clear
        } else {
            return colors.selectionBorderDefault
        }
    }

    private var borderWidth: CGFloat {
        isOn ? 0 : 1
    }

    private var thumbColor: Color {
        if isDisabled {
            return colors.selectionBgDisabled
        } else {
            return colors.selectionBgThumb
        }
    }
}

#if DEBUG
struct WFMToggle_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 20) {
            HStack(spacing: 16) {
                VStack {
                    WFMToggle(isOn: false)
                    Text("Off")
                        .font(.caption)
                }

                VStack {
                    WFMToggle(isOn: true)
                    Text("On")
                        .font(.caption)
                }

                VStack {
                    WFMToggle(isOn: false, isDisabled: true)
                    Text("Disabled Off")
                        .font(.caption)
                }

                VStack {
                    WFMToggle(isOn: true, isDisabled: true)
                    Text("Disabled On")
                        .font(.caption)
                }
            }
        }
        .padding()
        .wfmTheme()
    }
}
#endif
