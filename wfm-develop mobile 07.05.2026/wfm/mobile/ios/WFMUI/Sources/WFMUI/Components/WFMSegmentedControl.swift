import SwiftUI

/// Segmented Control дизайн-системы WFM
public struct WFMSegmentedControl: View {
    let options: [String]
    @Binding var selectedIndex: Int
    let height: CGFloat?

    @Environment(\.wfmColors) private var colors
    @Namespace private var animation

    public init(
        options: [String],
        selectedIndex: Binding<Int>,
        height: CGFloat? = nil
    ) {
        self.options = options
        self._selectedIndex = selectedIndex
        self.height = height
    }

    public var body: some View {
        HStack(spacing: 0) {
            ForEach(options.indices, id: \.self) { index in
                SegmentButton(
                    title: options[index],
                    isSelected: selectedIndex == index,
                    colors: colors,
                    shouldFillHeight: height != nil,
                    namespace: animation
                ) {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        selectedIndex = index
                    }
                }
            }
        }
        .frame(height: height)
        .padding(.horizontal, WFMSpacing.xxxs)
        .background(colors.segmentedControlBg)
        .cornerRadius(WFMRadius.m)
        .overlay(
            RoundedRectangle(cornerRadius: WFMRadius.m)
                .stroke(colors.segmentedControlBorder, lineWidth: 1)
        )
    }
}

/// Кнопка сегмента
private struct SegmentButton: View {
    let title: String
    let isSelected: Bool
    let colors: WFMSemanticColors
    let shouldFillHeight: Bool
    let namespace: Namespace.ID
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(WFMTypography.body14Regular)
                .foregroundColor(isSelected ? colors.segmentedControlTextActive : colors.segmentedControlTextDefault)
                .frame(maxWidth: .infinity, maxHeight: shouldFillHeight ? .infinity : nil)
                .padding(.horizontal, WFMSpacing.m)
                .padding(.vertical, isSelected ? WFMSpacing.xxs : WFMSpacing.xs)
                .background {
                    if isSelected {
                        RoundedRectangle(cornerRadius: WFMRadius.s)
                            .fill(colors.segmentedControlBgControlActive)
                            .matchedGeometryEffect(id: "selectedBackground", in: namespace)
                    }
                }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Previews

#Preview("WFMSegmentedControl") {
    VStack(spacing: 24) {
        WFMSegmentedControl(
            options: ["Telegram", "SMS", "Звонок"],
            selectedIndex: .constant(0)
        )

        WFMSegmentedControl(
            options: ["Telegram", "SMS", "Звонок"],
            selectedIndex: .constant(1)
        )

        WFMSegmentedControl(
            options: ["Да", "Нет"],
            selectedIndex: .constant(0),
            height: 40
        )
    }
    .padding()
    .wfmTheme()
}
