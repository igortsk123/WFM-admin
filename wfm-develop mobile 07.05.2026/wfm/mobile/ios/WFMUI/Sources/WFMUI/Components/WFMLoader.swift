import SwiftUI

/// Лоадер с анимированными точками
///
/// Компонент отображает три точки с циклической сменой цветов.
/// Используется для индикации загрузки данных.
///
/// Анимация:
/// - 3 кружка меняют цвета циклически
/// - Создается эффект "волны" цветов
///
/// Пример:
/// ```swift
/// WFMLoader()
/// ```
public struct WFMLoader: View {
    @State private var colorIndex = 0

    // Цвета из дизайн-системы (Brand/500, Brand/200, Brand/100)
    private let colors = [
        WFMPrimitiveColors.brand500, // Brand500 - темный фиолетовый
        WFMPrimitiveColors.brand200, // Brand200 - средний фиолетовый
        WFMPrimitiveColors.brand100  // Brand100 - светлый фиолетовый
    ]

    public init() {}

    public var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(colors[colorIndex % 3])
                .frame(width: 10, height: 10)

            Circle()
                .fill(colors[(colorIndex + 1) % 3])
                .frame(width: 10, height: 10)

            Circle()
                .fill(colors[(colorIndex + 2) % 3])
                .frame(width: 10, height: 10)
        }
        .animation(.easeInOut(duration: 0.3), value: colorIndex)
        .onAppear {
            // Запускаем циклическую анимацию смены цветов
            Timer.scheduledTimer(withTimeInterval: 0.3, repeats: true) { _ in
                colorIndex = (colorIndex + 1) % 3
            }
        }
    }
}

// MARK: - Preview

#Preview("WFMLoader") {
    VStack(spacing: 32) {
        Text("Light Mode")
            .font(.headline)
        WFMLoader()

        Text("Dark Mode")
            .font(.headline)
        WFMLoader()
            .preferredColorScheme(.dark)
    }
    .padding()
}
