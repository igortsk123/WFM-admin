import SwiftUI

/// Таб-бар с нижним индикатором активной вкладки (bottom-line style)
///
/// Используется там, где нужно переключение между несколькими разделами.
/// Активная вкладка выделяется фиолетовой полосой снизу с плавной анимацией.
public struct WFMTabBar: View {
    let options: [String]
    @Binding var selectedIndex: Int

    @Environment(\.wfmColors) private var colors
    @Namespace private var animation

    public init(options: [String], selectedIndex: Binding<Int>) {
        self.options = options
        self._selectedIndex = selectedIndex
    }

    public var body: some View {
        HStack(spacing: 0) {
            ForEach(options.indices, id: \.self) { index in
                tabItem(index: index)
            }
        }
        .frame(height: 46)
    }

    private func tabItem(index: Int) -> some View {
        let isActive = selectedIndex == index
        return Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                selectedIndex = index
            }
        } label: {
            VStack(spacing: 0) {
                Spacer(minLength: 0)

                Text(options[index])
                    .font(.system(size: 15, weight: .semibold))
                    .tracking(0.06)
                    .foregroundColor(isActive ? colors.textPrimary : colors.textTertiary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(.bottom, 12)

                // Фоновая линия (всегда видна)
                ZStack {
                    Rectangle()
                        .fill(colors.borderSecondary)

                    // Активный индикатор скользит между вкладками
                    if isActive {
                        Rectangle()
                            .fill(colors.borderBrand)
                            .matchedGeometryEffect(id: "activeIndicator", in: animation)
                    }
                }
                .frame(height: 2)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Preview

#Preview("WFMTabBar") {
    VStack(spacing: 32) {
        WFMTabBar(
            options: ["Подзадачи", "Подсказки"],
            selectedIndex: .constant(0)
        )

        WFMTabBar(
            options: ["Подзадачи", "Подсказки"],
            selectedIndex: .constant(1)
        )

        WFMTabBar(
            options: ["Ваши смены", "Свободные смены"],
            selectedIndex: .constant(0)
        )
    }
    .wfmTheme()
}
